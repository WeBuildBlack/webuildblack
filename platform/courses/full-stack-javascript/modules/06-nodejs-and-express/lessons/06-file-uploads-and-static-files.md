---
title: "File Uploads and Static Files"
estimatedMinutes: 30
---

# File Uploads and Static Files

Most web APIs need to handle two related concerns: serving static assets like images and HTML files, and accepting files uploaded by users. Express makes both straightforward. This lesson covers `express.static` for serving files, multer for handling multipart form uploads, file validation, and how to organize uploaded files on disk.

---

## Serving Static Files with `express.static`

`express.static` is Express's built-in middleware for serving files from a directory. Any file in the directory becomes accessible at its path relative to the mount point.

```javascript
// src/app.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Serve everything in 'public/' at the root URL
app.use(express.static(path.join(__dirname, '..', 'public')));

// public/index.html     -> http://localhost:3000/
// public/styles.css     -> http://localhost:3000/styles.css
// public/logo.png       -> http://localhost:3000/logo.png
```

Mount at a prefix to keep static assets under a specific URL path:

```javascript
// Serve uploaded files under /uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// uploads/avatars/user-42.jpg -> http://localhost:3000/uploads/avatars/user-42.jpg
```

### Static File Options

```javascript
app.use('/static', express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',        // Browser cache duration in seconds (default: 0)
  index: 'index.html', // Index file for directory requests
  redirect: false,     // Do not redirect /path to /path/

  // Set custom response headers per file served
  setHeaders(res, filePath) {
    if (path.extname(filePath) === '.pdf') {
      res.set('Content-Disposition', 'attachment');
    }
  },
}));
```

For production deployments, serve static files via a CDN or a reverse proxy like nginx rather than Express directly. `express.static` is excellent for development and smaller apps.

---

## File Uploads with multer

File uploads use the `multipart/form-data` content type, which is different from JSON. `express.json()` does not handle it. You need multer.

Install it:

```bash
npm install multer
```

### Basic Setup

```javascript
// src/lib/upload.js
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure uploads directory exists at startup
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
await fs.mkdir(uploadsDir, { recursive: true });

// Configure disk storage
const storage = multer.diskStorage({
  // Where to save uploaded files
  destination(req, file, callback) {
    callback(null, uploadsDir);
  },

  // UUID prevents collisions and avoids exposing original filenames
  filename(req, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${ext}`);
  },
});

// File filter: only allow certain MIME types
function fileFilter(req, file, callback) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
  }
}

// Create the multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per file
    files: 5,                  // max 5 files per request
  },
});
```

### Uploading a Single File

```javascript
// src/routes/avatars.js
import { Router } from 'express';
import { upload } from '../lib/upload.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

// upload.single('avatar') processes one file from the 'avatar' form field
router.post('/'),
  upload.single('avatar'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // req.file contains file metadata:
    // { fieldname, originalname, mimetype, size, filename, path }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.status(201).json({
      message: 'Avatar uploaded',
      url: fileUrl,
      size: req.file.size,
    });
  })
);

export default router;
```

### Uploading Multiple Files

```javascript
// upload.array('photos', 5) -- up to 5 files from the 'photos' field
router.post('/gallery',
  upload.array('photos', 5),
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const urls = req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
    }));

    res.status(201).json({ uploaded: urls });
  })
);

// upload.fields([...]) handles multiple named fields
router.post('/profile',
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]),
  asyncHandler(async (req, res) => {
    // req.files is an object: { avatar: [file], banner: [file] }
    const avatar = req.files?.avatar?.[0];
    const banner = req.files?.banner?.[0];

    res.json({
      avatar: avatar ? `/uploads/${avatar.filename}` : null,
      banner: banner ? `/uploads/${banner.filename}` : null,
    });
  })
);
```

---

## File Type Validation

The `fileFilter` callback checks MIME types, but MIME types can be spoofed by a client. Combine MIME type checking with extension validation:

```javascript
const ALLOWED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};

function fileFilter(req, file, callback) {
  const allowedExtensions = ALLOWED_TYPES[file.mimetype];

  if (!allowedExtensions) {
    return callback(new Error(`File type ${file.mimetype} is not allowed`));
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return callback(
      new Error(`Extension ${ext} does not match MIME type ${file.mimetype}`)
    );
  }

  callback(null, true);
}
```

For production file handling, the `file-type` npm package reads the first bytes of a file to determine its actual type, independent of the extension or MIME header.

### Handling multer Errors in the Error Middleware

```javascript
import multer from 'multer';
import { AppError } from '../lib/AppError.js';

export function errorHandler(err, req, res, next) {
  // Handle multer-specific errors
  if (err instanceof multer.MulterError) {
    let message = 'File upload error';
    if (err.code === 'LIMIT_FILE_SIZE') message = 'File too large. Maximum is 5MB';
    else if (err.code === 'LIMIT_FILE_COUNT') message = 'Too many files. Maximum is 5';
    else if (err.code === 'LIMIT_UNEXPECTED_FILE') message = `Unexpected field: ${err.field}`;
    return res.status(400).json({ error: message });
  }

  // Handle fileFilter rejections
  if (err.message?.includes('not allowed')) {
    return res.status(400).json({ error: err.message });
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  res.status(statusCode).json({
    error: err instanceof AppError ? err.message : 'Internal server error',
  });
}
```

---

## Organizing Upload Directories

Storing all uploads in a single flat directory gets unwieldy fast. Organize files into subdirectories by category:

```javascript
const storage = multer.diskStorage({
  destination(req, file, callback) {
    // Group by field name: avatars/, banners/, attachments/
    const subdir = req.uploadSubdir || file.fieldname;
    const dir = path.join(uploadsDir, subdir);

    fs.mkdir(dir, { recursive: true })
      .then(() => callback(null, dir))
      .catch(callback);
  },

  filename(req, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${ext}`);
  },
});
```

```javascript
// Set req.uploadSubdir in route-specific middleware before multer runs
router.post('/avatar',
  (req, res, next) => { req.uploadSubdir = 'avatars'; next(); },
  upload.single('avatar'),
  asyncHandler(async (req, res) => {
    const url = `/uploads/avatars/${req.file.filename}`;
    res.json({ url });
  })
);
```

### Deleting Files

When a user replaces their avatar or deletes content with attachments, clean up the old file:

```javascript
import fs from 'fs/promises';

async function deleteUploadedFile(filename, subdir = '') {
  const filePath = path.join(uploadsDir, subdir, filename);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // File may already be gone -- log but do not rethrow
    if (error.code !== 'ENOENT') {
      console.error('Failed to delete file:', error.message);
    }
  }
}
```

---

## Using Memory Storage

For small files you need to process before saving (like resizing images), use multer's memory storage:

```javascript
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB max for in-memory
  fileFilter,
});

router.post('/thumbnail',
  memoryUpload.single('image'),
  asyncHandler(async (req, res) => {
    // req.file.buffer contains the file data as a Buffer
    const imageBuffer = req.file.buffer;

    // Process the buffer (resize, convert), then save to disk or object storage

    res.json({ size: imageBuffer.length });
  })
);
```

Memory storage is appropriate for processing pipelines. Do not use it as permanent storage for files of any significant size -- you will exhaust your server's RAM.

---

## Wiring It All Together

```javascript
// src/app.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import postsRouter from './routes/posts.js';
import commentsRouter from './routes/comments.js';
import avatarsRouter from './routes/avatars.js';
import { errorHandler } from './middleware/errorHandler.js';
import { attachRequestId } from './middleware/requestId.js';
import { requestLogger } from './middleware/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Middleware stack
app.use(attachRequestId);
app.use(requestLogger);
app.use(express.json());

// Serve uploaded files publicly
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API routes
app.use('/api/posts', postsRouter);
app.use('/api/posts/:postId/comments', commentsRouter);
app.use('/api/avatars', avatarsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
```

---

## Key Takeaways

- `express.static(dir)` serves all files in a directory. Mount at a prefix with `app.use('/prefix', express.static(...))` to keep URLs organized.
- File uploads require the `multipart/form-data` content type. Use `multer` to handle it -- `express.json()` does not process file uploads.
- Configure multer with `diskStorage` (saves to disk), `fileFilter` (validates MIME type and extension), and `limits` (caps file size and count).
- `upload.single('field')` processes one file, `upload.array('field', n)` processes multiple, and `upload.fields([...])` handles multiple named fields.
- Always validate both MIME type and file extension in your file filter. MIME types alone can be spoofed by clients.
- Handle `multer.MulterError` explicitly in your error middleware so clients get clear messages about size limits and unexpected fields.
- For files that are replaced or deleted, clean up with `fs.unlink()` and handle `ENOENT` since the file may already be gone.

---

## Try It Yourself

**Exercise 1: Serve Static Files**
Create a `public/` directory in your project. Add an `index.html` and a `styles.css`. Configure `express.static` to serve this directory. Visit `http://localhost:3000/` and `http://localhost:3000/styles.css` to confirm both are served correctly.

**Exercise 2: Single File Upload**
Add a `POST /api/upload` route that accepts one file in a field named `document`. Allow only PDF files (MIME type `application/pdf`). Limit size to 10MB. On success, return the filename and the URL where the file can be accessed. Test it using a tool like Postman or Insomnia.

**Exercise 3: Clean Up on Delete**
Build a simple image gallery: `POST /api/images` uploads an image, `GET /api/images` lists all images with their URLs, and `DELETE /api/images/:filename` deletes both the record and the file on disk. Handle the case where the file no longer exists on disk without throwing an error.