---
title: "Gather Image Pipeline"
estimatedMinutes: 75
---

# Gather Image Pipeline

In this project you will build the full image pipeline for Gather event cover images. When an organizer uploads a cover image, the file goes directly from their browser to MinIO (S3-compatible storage) via a presigned URL. After upload, a Celery task generates three thumbnail sizes in both JPEG and WebP formats. The event detail page then serves responsive images using `srcset` and the `<picture>` element.

By the end, you will have a working pipeline that handles: presigned URL generation, direct browser-to-S3 upload, background image processing, and responsive image delivery. Everything runs in Docker Compose.

---

## What You Are Building

| Step | Component | What It Does |
|------|-----------|-------------|
| 1 | Django endpoint | Generates a presigned PUT URL for direct upload |
| 2 | Next.js component | Uploads image directly to MinIO using presigned URL |
| 3 | Django endpoint | Confirms upload, triggers Celery task |
| 4 | Celery task | Generates 3 sizes x 2 formats = 6 image variants |
| 5 | Next.js component | Displays responsive images with `<picture>` and `srcset` |

---

## Prerequisites

Your Docker Compose stack from previous modules should already include:
- Django (web server)
- PostgreSQL (database)
- Redis (Celery broker)
- Celery worker

You will add MinIO to this stack in this project.

---

## Project Setup

### 1. Install Python Dependencies

Add these to your `requirements.txt`:

```
boto3==1.35.0
Pillow==10.4.0
django-storages==1.14.4
```

Then rebuild your Docker image:

```bash
docker compose build web
```

### 2. Add MinIO to Docker Compose

Add these services to your `docker-compose.yml`:

```yaml
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 3

  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 minioadmin minioadmin;
      mc mb local/gather-images --ignore-existing;
      mc anonymous set download local/gather-images;
      exit 0;
      "
```

Add to the `volumes` section:

```yaml
volumes:
  # ... existing volumes ...
  minio_data:
```

### 3. Environment Variables

Add these to your `.env` file:

```bash
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_STORAGE_BUCKET_NAME=gather-images
AWS_S3_ENDPOINT_URL=http://minio:9000
AWS_S3_REGION_NAME=us-east-1

# For browser-side presigned URLs (use localhost, not the Docker service name)
AWS_S3_PUBLIC_ENDPOINT_URL=http://localhost:9000
```

### 4. Django Settings

Add S3 configuration to your `settings.py`:

```python
# settings.py -- add to existing settings

import os

# Object Storage (S3 / MinIO)
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "minioadmin")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "minioadmin")
AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME", "gather-images")
AWS_S3_ENDPOINT_URL = os.environ.get("AWS_S3_ENDPOINT_URL", "http://localhost:9000")
AWS_S3_REGION_NAME = os.environ.get("AWS_S3_REGION_NAME", "us-east-1")
AWS_S3_PUBLIC_ENDPOINT_URL = os.environ.get(
    "AWS_S3_PUBLIC_ENDPOINT_URL", "http://localhost:9000"
)
AWS_S3_CUSTOM_DOMAIN = os.environ.get("AWS_S3_CUSTOM_DOMAIN", None)
```

### 5. Start the Stack

```bash
docker compose up -d
```

Verify MinIO is running by visiting `http://localhost:9001` (login: minioadmin / minioadmin). You should see the `gather-images` bucket.

---

## Part 1: Database Model

Create (or update) the `EventImage` model to track uploaded images and their variants.

```python
# events/models.py

from django.db import models


# TODO: Add a cover_image_key field (CharField, max_length=500, blank, default="")
#       to your existing Event model. This stores the S3 key of the original
#       cover image.

# TODO: Add a cover_image_url field (URLField, max_length=1000, blank, default="")
#       to your existing Event model. This stores the public URL.


class EventImage(models.Model):
    """Tracks uploaded images and generated variants for events."""

    event = models.ForeignKey(
        "Event", on_delete=models.CASCADE, related_name="images"
    )

    # S3 reference
    storage_key = models.CharField(max_length=500)
    filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    size_bytes = models.IntegerField(default=0)
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)

    # Variant tracking
    is_variant = models.BooleanField(default=False)
    variant_type = models.CharField(max_length=30, blank=True, default="")
    # TODO: Add a ForeignKey to "self" called "original" for linking variants
    #       to their original image. Use null=True, blank=True,
    #       on_delete=models.CASCADE, related_name="variants".

    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["width"]

    def __str__(self):
        label = self.variant_type if self.variant_type else "original"
        return f"EventImage({self.event_id}, {label})"

    def get_url(self):
        """Build the public URL for this image."""
        from django.conf import settings

        # TODO: If AWS_S3_CUSTOM_DOMAIN is set, return https://{domain}/{key}
        # TODO: Otherwise, return {AWS_S3_PUBLIC_ENDPOINT_URL}/{bucket}/{key}
        pass
```

Run the migration:

```bash
docker compose exec web python manage.py makemigrations events
docker compose exec web python manage.py migrate
```

---

## Part 2: S3 Client Utility

Create a utility module for S3 operations.

```python
# events/storage.py

import boto3
from django.conf import settings


def get_s3_client():
    """Create a boto3 S3 client configured from Django settings."""
    # TODO: Create and return a boto3 client using:
    #   - settings.AWS_S3_ENDPOINT_URL as endpoint_url
    #   - settings.AWS_ACCESS_KEY_ID
    #   - settings.AWS_SECRET_ACCESS_KEY
    #   - settings.AWS_S3_REGION_NAME
    pass


def generate_presigned_upload_url(key, content_type, expires_in=600):
    """Generate a presigned PUT URL for direct browser upload.

    Args:
        key: The S3 object key (e.g., "events/42/cover-abc123.jpg")
        content_type: MIME type (e.g., "image/jpeg")
        expires_in: URL lifetime in seconds (default 10 minutes)

    Returns:
        The presigned URL string
    """
    s3 = get_s3_client()
    # TODO: Use s3.generate_presigned_url() with:
    #   - ClientMethod="put_object"
    #   - Params containing Bucket, Key, and ContentType
    #   - ExpiresIn=expires_in
    #
    # IMPORTANT: The presigned URL will contain the internal Docker hostname
    # (minio:9000). Replace it with the public endpoint so browsers can reach it.
    # Use settings.AWS_S3_PUBLIC_ENDPOINT_URL for replacement.
    pass


def verify_object_exists(key):
    """Check if an object exists in S3. Returns head_object response or None."""
    s3 = get_s3_client()
    # TODO: Use s3.head_object() to check if the key exists.
    #       Return the response dict if it exists.
    #       Catch botocore.exceptions.ClientError and return None if 404.
    pass


def delete_object(key):
    """Delete an object from S3. Best-effort, does not raise on failure."""
    s3 = get_s3_client()
    # TODO: Use s3.delete_object() wrapped in try/except.
    #       Log errors but don't raise.
    pass


def upload_bytes(key, data, content_type):
    """Upload raw bytes to S3."""
    s3 = get_s3_client()
    # TODO: Use s3.put_object() with:
    #   - Bucket from settings
    #   - The provided Key, Body (data), ContentType
    #   - CacheControl="public, max-age=31536000"
    pass


def download_bytes(key):
    """Download an object from S3 and return its bytes."""
    s3 = get_s3_client()
    # TODO: Use s3.get_object() and read the Body.
    #       Return the bytes.
    pass


def build_public_url(key):
    """Build a public URL for an S3 object."""
    # TODO: If settings.AWS_S3_CUSTOM_DOMAIN is set, use it.
    #       Otherwise use settings.AWS_S3_PUBLIC_ENDPOINT_URL + bucket + key.
    pass
```

---

## Part 3: Image Processing Module

Build the image processing functions using Pillow.

```python
# events/image_processing.py

from io import BytesIO
from PIL import Image

from .storage import download_bytes, upload_bytes

# Variant configuration: (suffix, max_dimension, quality)
VARIANTS = [
    ("sm", 400, 75),
    ("md", 800, 85),
    ("lg", 1200, 85),
]


def build_variant_key(original_key, suffix, extension):
    """Build S3 key for a variant.

    Example:
      original_key: "events/42/cover-abc123.jpg"
      suffix: "sm", extension: "webp"
      result: "events/42/cover-abc123-sm.webp"
    """
    base = original_key.rsplit(".", 1)[0]
    return f"{base}-{suffix}.{extension}"


def generate_variant(img, max_dimension, quality, output_format="JPEG"):
    """Resize an image and return (bytes, width, height).

    Args:
        img: PIL Image object
        max_dimension: Maximum width or height in pixels
        quality: JPEG/WebP quality (1-100)
        output_format: "JPEG" or "WEBP"

    Returns:
        Tuple of (image_bytes, width, height)
    """
    # TODO: Create a copy of img (don't modify the original)
    # TODO: Use thumbnail((max_dimension, max_dimension)) to resize
    #       (only if image is larger than target)
    # TODO: Convert mode to RGB if needed (JPEG doesn't support RGBA)
    # TODO: Save to BytesIO with the specified format and quality, optimize=True
    # TODO: Return (bytes, width, height)
    pass


def process_image(original_key):
    """Download original, generate all variants, upload to S3.

    For each size in VARIANTS, generates both JPEG and WebP versions.
    That's 3 sizes x 2 formats = 6 variant files.

    Args:
        original_key: S3 key of the original uploaded image

    Returns:
        List of dicts, each with: key, variant_type, content_type,
        width, height, size_bytes
    """
    # TODO: Download the original image using download_bytes()
    # TODO: Open it with Pillow (Image.open(BytesIO(data)))
    # TODO: Loop through VARIANTS
    #       For each (suffix, max_dim, quality):
    #         1. Generate JPEG variant using generate_variant()
    #         2. Build the JPEG key using build_variant_key(original_key, suffix, "jpg")
    #         3. Upload JPEG variant using upload_bytes()
    #         4. Append metadata dict to results list
    #         5. Generate WebP variant using generate_variant() with output_format="WEBP"
    #         6. Build the WebP key using build_variant_key(original_key, suffix, "webp")
    #         7. Upload WebP variant using upload_bytes()
    #         8. Append metadata dict to results list
    # TODO: Return the results list
    pass
```

---

## Part 4: Django API Endpoints

Create the presigned URL and upload confirmation endpoints.

```python
# events/views.py (add these views)

import uuid
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Event, EventImage
from .storage import (
    generate_presigned_upload_url,
    verify_object_exists,
    delete_object,
    build_public_url,
)
from .tasks import generate_image_variants


ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def request_upload_url(request, event_id):
    """Generate a presigned URL for direct-to-S3 upload.

    Request body:
        { "filename": "photo.jpg", "contentType": "image/jpeg" }

    Response:
        { "uploadUrl": "...", "key": "events/42/cover-xxx.jpg", "expiresIn": 600 }
    """
    # TODO: Verify the user owns this event (organizer=request.user)
    #       Return 404 if not found

    # TODO: Extract filename and contentType from request.data
    #       Default contentType to "image/jpeg"

    # TODO: Validate contentType against ALLOWED_IMAGE_TYPES
    #       Return 400 if not allowed

    # TODO: Generate a unique S3 key:
    #       ext = extract extension from filename (default "jpg")
    #       unique_id = uuid.uuid4().hex[:12]
    #       key = f"events/{event_id}/cover-{unique_id}.{ext}"

    # TODO: Call generate_presigned_upload_url(key, content_type)

    # TODO: Return { "uploadUrl": presigned_url, "key": key, "expiresIn": 600 }
    pass


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def confirm_upload(request, event_id):
    """Confirm a direct upload completed and trigger variant generation.

    Request body:
        { "key": "events/42/cover-xxx.jpg" }

    Response:
        { "key": "...", "url": "...", "size": 1234, "processingVariants": true }
    """
    # TODO: Verify the user owns this event
    #       Return 404 if not found

    # TODO: Extract "key" from request.data
    #       Return 400 if missing

    # TODO: Verify the object exists in S3 using verify_object_exists(key)
    #       Return 400 if not found

    # TODO: If the event already has a cover_image_key, delete the old image
    #       and its variants from S3. Also delete EventImage records.

    # TODO: Build the public URL using build_public_url(key)

    # TODO: Update event.cover_image_key and event.cover_image_url
    #       Save with update_fields

    # TODO: Dispatch the Celery task:
    #       generate_image_variants.delay(event_id, key)

    # TODO: Return response with key, url, size (from head response),
    #       and processingVariants=True
    pass


@api_view(["GET"])
def event_cover_variants(request, event_id):
    """Return all image variants for an event's cover image.

    Response:
        {
          "original": { "url": "...", "width": 4000, "height": 3000 },
          "variants": [
            { "type": "thumb_sm", "contentType": "image/jpeg", "url": "...", ... },
            ...
          ]
        }
    """
    # TODO: Get the event (return 404 if not found)

    # TODO: Query EventImage for this event, ordered by width

    # TODO: Separate original from variants

    # TODO: Build response with original info and variant list
    #       Each variant should include: type, contentType, url, width, height
    pass
```

### URL Configuration

```python
# events/urls.py (add these patterns)

from django.urls import path
from . import views

urlpatterns = [
    # ... existing routes ...
    path(
        "<int:event_id>/upload-url/",
        views.request_upload_url,
        name="request-upload-url",
    ),
    path(
        "<int:event_id>/confirm-upload/",
        views.confirm_upload,
        name="confirm-upload",
    ),
    path(
        "<int:event_id>/cover-variants/",
        views.event_cover_variants,
        name="event-cover-variants",
    ),
]
```

---

## Part 5: Celery Task

Create the background task that processes images after upload.

```python
# events/tasks.py

import logging
from celery import shared_task
from django.db import transaction

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def generate_image_variants(self, event_id, original_key):
    """Generate thumbnail variants for an uploaded event cover image.

    Downloads the original from S3, generates 3 sizes x 2 formats = 6 variants,
    uploads them back to S3, and creates EventImage records in the database.
    """
    from .models import Event, EventImage
    from .image_processing import process_image

    # TODO: Get the Event by id. Log and return if not found.

    # TODO: Log that processing is starting (include event_id and key)

    # TODO: Call process_image(original_key) wrapped in try/except.
    #       On failure, log the error and call self.retry(exc=exc)

    # TODO: Inside a transaction.atomic() block:
    #   1. Delete existing EventImage variants for this event
    #      (is_variant=True)
    #   2. Create or update an EventImage record for the original:
    #      - storage_key=original_key
    #      - is_variant=False
    #      - content_type="image/jpeg"
    #      - filename from the key (split on "/" and take last segment)
    #   3. For each variant in the results list, create an EventImage:
    #      - event=event
    #      - original=original_record
    #      - storage_key=variant["key"]
    #      - content_type=variant["content_type"]
    #      - width, height, size_bytes from the variant dict
    #      - is_variant=True
    #      - variant_type=variant["variant_type"]
    #      - filename from the key

    # TODO: Log success with the count of variants created

    # TODO: Return {"event_id": event_id, "variants_created": len(variants)}
    pass
```

---

## Part 6: Next.js Frontend Components

### Upload Component

```tsx
// components/CoverImageUpload.tsx

"use client";

import { useState, useCallback } from "react";

interface CoverImageUploadProps {
  eventId: number;
  currentImageUrl?: string;
  onUploadComplete: (url: string) => void;
}

export function CoverImageUpload({
  eventId,
  currentImageUrl,
  onUploadComplete,
}: CoverImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentImageUrl || null
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // TODO: Validate file type (allow image/jpeg, image/png, image/webp)
      //       Set error and return if invalid

      // TODO: Validate file size (max 10 MB)
      //       Set error and return if too large

      setError(null);
      setUploading(true);
      setProgress(0);

      // Show immediate preview using URL.createObjectURL
      setPreviewUrl(URL.createObjectURL(file));

      try {
        // TODO: Step 1 -- POST to /api/events/{eventId}/upload-url/
        //       Send { filename: file.name, contentType: file.type }
        //       Extract uploadUrl and key from response

        // TODO: Step 2 -- Upload directly to S3 using the presigned URL
        //       Use the uploadToS3() helper function below
        //       Pass a progress callback to update the progress bar

        // TODO: Step 3 -- POST to /api/events/{eventId}/confirm-upload/
        //       Send { key }
        //       Extract url from response

        // TODO: Update previewUrl with the confirmed URL
        // TODO: Call onUploadComplete(url)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Upload failed"
        );
        setPreviewUrl(currentImageUrl || null);
      } finally {
        setUploading(false);
      }
    },
    [eventId, currentImageUrl, onUploadComplete]
  );

  return (
    <div className="space-y-4">
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Cover image preview"
          className="w-full h-48 object-cover rounded-lg"
        />
      )}

      <label className="block">
        <span className="sr-only">Choose cover image</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={uploading}
          className="block w-full text-sm file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0 file:font-semibold
            file:bg-amber-50 file:text-amber-700
            hover:file:bg-amber-100 disabled:opacity-50"
        />
      </label>

      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-amber-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}


function uploadToS3(
  presignedUrl: string,
  file: File,
  contentType: string,
  onProgress: (percent: number) => void
): Promise<void> {
  // TODO: Create a new XMLHttpRequest
  // TODO: Add an upload progress listener that calculates percent and calls onProgress
  // TODO: Add a load listener that resolves on 2xx, rejects otherwise
  // TODO: Add an error listener that rejects with "Network error"
  // TODO: Open a PUT request to the presignedUrl
  // TODO: Set the Content-Type header
  // TODO: Send the file

  // Use XMLHttpRequest (not fetch) because fetch does not support
  // upload progress events.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.send(file);
  });
}
```

### Responsive Image Component

```tsx
// components/EventCoverImage.tsx

interface ImageVariant {
  type: string;
  contentType: string;
  url: string;
  width: number;
  height: number;
}

interface EventCoverImageProps {
  fallbackUrl: string;
  variants: ImageVariant[];
  alt: string;
  className?: string;
}

export function EventCoverImage({
  fallbackUrl,
  variants,
  alt,
  className = "",
}: EventCoverImageProps) {
  // TODO: Filter variants into webpVariants and jpegVariants
  //       based on contentType

  // TODO: Build srcSet strings for each format:
  //       e.g., "url1 400w, url2 800w, url3 1200w"

  // TODO: If no variants exist yet, render a simple <img> with fallbackUrl

  // TODO: Render a <picture> element with:
  //   1. A <source> for WebP (type="image/webp", srcSet, sizes)
  //   2. A <source> for JPEG (type="image/jpeg", srcSet, sizes)
  //   3. A fallback <img> with loading="lazy"
  //
  //   sizes should be:
  //   "(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"

  return (
    <img
      src={fallbackUrl}
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
}
```

---

## Part 7: CORS Configuration for MinIO

Update your `minio-init` service to configure CORS so browser uploads work:

```yaml
# TODO: Update the minio-init entrypoint in docker-compose.yml to:
#   1. Create the bucket (already done)
#   2. Set anonymous download policy (already done)
#   3. Write a CORS JSON config that allows:
#      - AllowedOrigins: ["http://localhost:3000"]
#      - AllowedMethods: ["GET", "PUT", "POST"]
#      - AllowedHeaders: ["*"]
#      - ExposeHeaders: ["ETag"]
#      - MaxAgeSeconds: 3600
#   4. Apply the CORS config with: mc cors set local/gather-images /tmp/cors.json
```

---

## Testing Checklist

Work through these checks to verify your pipeline works end to end:

### 1. MinIO Setup

```bash
# Verify MinIO is running
curl http://localhost:9000/minio/health/live
# Should return 200

# Open MinIO console
open http://localhost:9001
# Login: minioadmin / minioadmin
# Verify gather-images bucket exists
```

### 2. Presigned URL Generation

```bash
# Request an upload URL (replace YOUR_TOKEN with a valid auth token)
curl -X POST http://localhost:8000/api/events/1/upload-url/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.jpg", "contentType": "image/jpeg"}'

# Should return:
# { "uploadUrl": "http://localhost:9000/...", "key": "events/1/cover-xxx.jpg", "expiresIn": 600 }
```

### 3. Direct Upload

```bash
# Use the uploadUrl from the previous step
curl -X PUT "PRESIGNED_URL_HERE" \
  -H "Content-Type: image/jpeg" \
  --data-binary @path/to/test-image.jpg

# Should return 200
```

### 4. Upload Confirmation

```bash
# Confirm the upload (use the key from step 2)
curl -X POST http://localhost:8000/api/events/1/confirm-upload/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "events/1/cover-xxx.jpg"}'

# Should return:
# { "key": "...", "url": "...", "size": ..., "processingVariants": true }
```

### 5. Celery Processing

```bash
# Watch Celery logs for variant generation
docker compose logs -f celery_worker

# You should see:
# Generating variants for event 1, key: events/1/cover-xxx.jpg
# Generated 6 variants for event 1
```

### 6. Variant Retrieval

```bash
# Check the variants were created
curl http://localhost:8000/api/events/1/cover-variants/

# Should return original + 6 variants (3 sizes x 2 formats)
```

### 7. MinIO Verification

Open `http://localhost:9001`, navigate to the `gather-images` bucket, and verify you see:
- The original image: `events/1/cover-xxx.jpg`
- 3 JPEG variants: `cover-xxx-sm.jpg`, `cover-xxx-md.jpg`, `cover-xxx-lg.jpg`
- 3 WebP variants: `cover-xxx-sm.webp`, `cover-xxx-md.webp`, `cover-xxx-lg.webp`

### 8. Frontend Upload (if running Next.js)

```bash
# Start the Next.js frontend
cd frontend && npm run dev

# Navigate to an event edit page
# Use the image upload component
# Verify: preview appears, progress bar fills, image displays after upload
```

---

## Stretch Goals

If you finish early, try these enhancements:

1. **Cleanup old variants**: When a new cover image is uploaded, delete all S3 objects from the previous cover (original + all variants). You started this in `confirm_upload`, but make sure it also deletes the variant files from S3 (not just the database records).

2. **Processing status endpoint**: Create a `GET /api/events/{id}/processing-status/` endpoint that returns whether variant generation is complete. The frontend could poll this and swap in responsive images once they are ready.

3. **Content-type validation with magic bytes**: Instead of trusting the `ContentType` header, read the first few bytes of the uploaded file and validate the actual format. Pillow's `Image.open()` will raise an error for non-image files, which gives you basic validation for free.

4. **Animated progress on the event card**: After upload completes but before variants are ready, show a subtle shimmer animation on the image. When the variants endpoint returns data, swap in the `<picture>` element with a fade transition.

---

## What You Have Built

By completing this project, you have a production-quality image pipeline:

- **Presigned URLs** keep file uploads off your Django server, saving memory and worker capacity
- **Direct browser-to-S3 uploads** with progress tracking via XMLHttpRequest
- **Background processing** with Celery generates optimized variants without blocking the user
- **Multiple image sizes** (400px, 800px, 1200px) reduce bandwidth by serving the right size for each context
- **WebP conversion** saves 25-35% bandwidth over JPEG for browsers that support it
- **Responsive delivery** with `<picture>` and `srcset` lets the browser pick the optimal variant automatically
- **Docker Compose** with MinIO gives you the full S3 experience locally without an AWS account

This same pattern scales from a side project to millions of images. The only change for production is swapping MinIO credentials for real S3/R2/Spaces credentials in your environment variables.
