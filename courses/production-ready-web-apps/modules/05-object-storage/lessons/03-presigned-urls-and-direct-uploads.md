---
title: "Presigned URLs and Direct Uploads"
estimatedMinutes: 35
---

# Presigned URLs and Direct Uploads

In the last lesson, you built an upload endpoint where the browser sends the file to Django, and Django forwards it to S3. This works, but it has a serious problem at scale. Every uploaded file passes through your server, consuming memory, CPU, and a Gunicorn worker for the entire duration of the transfer. If 50 users upload 5 MB images simultaneously, that is 250 MB of data flowing through your Django process.

Presigned URLs solve this by letting the browser upload directly to S3, bypassing your server entirely. Your server only generates a short-lived, signed URL that authorizes the upload. This lesson covers how presigned URLs work, the security model behind them, and how to implement the full flow in Django and Next.js.

---

## The Problem with Server-Proxied Uploads

Here is the flow from the previous lesson:

```
Browser                  Django Server              S3 / MinIO
   │                          │                         │
   │── POST /upload ─────────>│                         │
   │   (5 MB image body)      │                         │
   │                          │── put_object ──────────>│
   │                          │   (5 MB forwarded)      │
   │                          │<── 200 OK ──────────────│
   │<── 200 OK ──────────────│                         │
```

Problems with this approach:

1. **Memory**: Django loads the entire file into memory (or streams it to a temp file, which uses disk I/O)
2. **Worker time**: A Gunicorn worker is occupied for the full upload duration. On a slow connection, a 5 MB upload could take 10+ seconds. That worker cannot serve other requests during that time.
3. **Bandwidth**: The file travels from the user's browser to your server, then from your server to S3. Double the bandwidth cost, double the latency.
4. **Scaling**: To handle more concurrent uploads, you need more Gunicorn workers, which means more memory and CPU.

### The Direct Upload Flow

With presigned URLs, the file goes straight from the browser to S3:

```
Browser                  Django Server              S3 / MinIO
   │                          │                         │
   │── GET /presign ─────────>│                         │
   │   (request upload URL)   │                         │
   │                          │── generate_presigned ──>│
   │<── presigned URL ────────│                         │
   │                                                    │
   │── PUT (direct upload) ────────────────────────────>│
   │   (5 MB image body)                                │
   │<── 200 OK ────────────────────────────────────────│
   │                                                    │
   │── POST /confirm ────────>│                         │
   │   (key, metadata)        │── head_object ─────────>│
   │                          │<── object exists ───────│
   │<── 200 OK ──────────────│                         │
```

Your Django server does two lightweight operations: generating a presigned URL (fast, no file data) and confirming the upload completed (a HEAD request to S3). The heavy lifting of transferring the file happens directly between the browser and S3.

---

## How Presigned URLs Work

A presigned URL is a regular S3 URL with authentication baked into the query string. It contains:

- The bucket and key (where to store the file)
- An expiration timestamp
- A cryptographic signature proving the server authorized this specific operation

```
https://minio:9000/gather-images/events/42/cover-abc123.jpg
  ?X-Amz-Algorithm=AWS4-HMAC-SHA256
  &X-Amz-Credential=minioadmin/20260314/us-east-1/s3/aws4_request
  &X-Amz-Date=20260314T120000Z
  &X-Amz-Expires=600
  &X-Amz-SignedHeaders=host;content-type
  &X-Amz-Signature=a1b2c3d4e5f6...
```

Key security properties:

- **Time-limited**: The URL expires after the specified duration (typically 5-15 minutes). After expiration, S3 rejects the request.
- **Operation-specific**: A presigned PUT URL can only upload. It cannot be used to download, delete, or list objects.
- **Key-specific**: The URL authorizes upload to one exact key. The client cannot change the destination path.
- **Content-type locked** (optional): You can require a specific content type, preventing someone from uploading a .exe file using a URL meant for images.
- **Size-limited** (optional): You can set conditions on the maximum file size.

The signature is generated using the server's secret access key. S3 verifies the signature, checks the expiration, and allows or denies the request. The client never sees the secret key.

---

## Django: Generate Presigned URL Endpoint

```python
# events/views.py

import uuid
import boto3
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Event


def get_s3_client():
    """Create a boto3 S3 client from Django settings."""
    return boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_upload_url(request, event_id):
    """Generate a presigned URL for direct-to-S3 upload."""
    # Verify the user owns this event
    try:
        event = Event.objects.get(id=event_id, organizer=request.user)
    except Event.DoesNotExist:
        return Response(
            {"error": "Event not found or you are not the organizer"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Get file metadata from the request body
    content_type = request.data.get("contentType", "image/jpeg")
    filename = request.data.get("filename", "image.jpg")

    # Validate content type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if content_type not in allowed_types:
        return Response(
            {"error": f"Content type '{content_type}' is not allowed"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Generate a unique key
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    unique_id = uuid.uuid4().hex[:12]
    key = f"events/{event_id}/cover-{unique_id}.{ext}"

    # Generate the presigned URL
    s3 = get_s3_client()
    presigned_url = s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=600,  # URL valid for 10 minutes
    )

    return Response({
        "uploadUrl": presigned_url,
        "key": key,
        "expiresIn": 600,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def confirm_upload(request, event_id):
    """Confirm that a direct upload completed successfully."""
    try:
        event = Event.objects.get(id=event_id, organizer=request.user)
    except Event.DoesNotExist:
        return Response(
            {"error": "Event not found or you are not the organizer"},
            status=status.HTTP_404_NOT_FOUND,
        )

    key = request.data.get("key")
    if not key:
        return Response(
            {"error": "Missing 'key' in request body"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Verify the object actually exists in S3
    s3 = get_s3_client()
    try:
        head = s3.head_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=key,
        )
    except s3.exceptions.NoSuchKey:
        return Response(
            {"error": "Upload not found. The file may not have been uploaded yet."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        return Response(
            {"error": f"Could not verify upload: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Delete old cover image if it exists
    if event.cover_image_key:
        try:
            s3.delete_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=event.cover_image_key,
            )
        except Exception:
            pass  # best-effort cleanup

    # Build the public URL
    if settings.AWS_S3_CUSTOM_DOMAIN:
        url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{key}"
    else:
        bucket = settings.AWS_STORAGE_BUCKET_NAME
        url = f"{settings.AWS_S3_ENDPOINT_URL}/{bucket}/{key}"

    # Update the event record
    event.cover_image_key = key
    event.cover_image_url = url
    event.save(update_fields=["cover_image_key", "cover_image_url"])

    return Response({
        "key": key,
        "url": url,
        "size": head["ContentLength"],
    })
```

### URL Configuration

```python
# events/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # ... existing routes ...
    path(
        "<int:event_id>/upload-url/",
        views.generate_upload_url,
        name="generate-upload-url",
    ),
    path(
        "<int:event_id>/confirm-upload/",
        views.confirm_upload,
        name="confirm-upload",
    ),
]
```

---

## Next.js: Direct Upload Component

On the frontend, you need a component that: (1) requests a presigned URL from your API, (2) uploads the file directly to S3, and (3) confirms the upload.

```tsx
// components/ImageUpload.tsx

"use client";

import { useState, useCallback } from "react";

interface ImageUploadProps {
  eventId: number;
  currentImageUrl?: string;
  onUploadComplete: (url: string) => void;
}

export function ImageUpload({
  eventId,
  currentImageUrl,
  onUploadComplete,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentImageUrl || null
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Client-side validation
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setError("Please select a JPEG, PNG, or WebP image.");
        return;
      }

      const maxSize = 10 * 1024 * 1024; // 10 MB
      if (file.size > maxSize) {
        setError("Image must be under 10 MB.");
        return;
      }

      setError(null);
      setUploading(true);
      setProgress(0);

      // Show local preview immediately
      setPreviewUrl(URL.createObjectURL(file));

      try {
        // Step 1: Get presigned URL from your API
        const presignRes = await fetch(
          `/api/events/${eventId}/upload-url/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type,
            }),
          }
        );

        if (!presignRes.ok) {
          const data = await presignRes.json();
          throw new Error(data.error || "Failed to get upload URL");
        }

        const { uploadUrl, key } = await presignRes.json();

        // Step 2: Upload directly to S3 using XMLHttpRequest for progress
        await uploadToS3(uploadUrl, file, file.type, (pct) => {
          setProgress(pct);
        });

        // Step 3: Confirm the upload with your API
        const confirmRes = await fetch(
          `/api/events/${eventId}/confirm-upload/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key }),
          }
        );

        if (!confirmRes.ok) {
          const data = await confirmRes.json();
          throw new Error(data.error || "Failed to confirm upload");
        }

        const { url } = await confirmRes.json();
        setPreviewUrl(url);
        onUploadComplete(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
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
          alt="Event cover preview"
          className="w-full h-48 object-cover rounded-lg"
        />
      )}

      <label className="block">
        <span className="sr-only">Choose cover image</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-amber-50 file:text-amber-700
            hover:file:bg-amber-100
            disabled:opacity-50"
        />
      </label>

      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-amber-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}
    </div>
  );
}


/**
 * Upload a file directly to S3 using a presigned URL.
 * Uses XMLHttpRequest instead of fetch for upload progress tracking.
 */
function uploadToS3(
  presignedUrl: string,
  file: File,
  contentType: string,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
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

Notice the `uploadToS3` function uses `XMLHttpRequest` instead of `fetch`. This is intentional. As of 2026, the Fetch API still does not provide upload progress events. `XMLHttpRequest` exposes `xhr.upload.onprogress`, which lets you show a real progress bar.

---

## CORS Configuration

When the browser uploads directly to S3/MinIO, it makes a cross-origin request. The browser sends a preflight OPTIONS request, and S3 must respond with the correct CORS headers or the upload will fail.

### MinIO CORS (Docker Compose)

For MinIO, configure CORS through the `mc` command in your init container:

```yaml
# docker-compose.yml (update the minio-init service)
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
      cat > /tmp/cors.json << 'CORS'
      {
        \"CORSRules\": [
          {
            \"AllowedOrigins\": [\"http://localhost:3000\"],
            \"AllowedMethods\": [\"GET\", \"PUT\", \"POST\"],
            \"AllowedHeaders\": [\"*\"],
            \"ExposeHeaders\": [\"ETag\"],
            \"MaxAgeSeconds\": 3600
          }
        ]
      }
      CORS
      mc cors set local/gather-images /tmp/cors.json;
      exit 0;
      "
```

### AWS S3 CORS (Production)

For a real S3 bucket, configure CORS in the AWS console or via the CLI:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://gather.example.com"],
      "AllowedMethods": ["GET", "PUT"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

```bash
aws s3api put-bucket-cors \
  --bucket gather-prod-images \
  --cors-configuration file://cors.json
```

Important CORS notes:
- `AllowedOrigins` should list your exact frontend origin. Use `*` only for development.
- `AllowedMethods` must include `PUT` for direct uploads.
- `ExposeHeaders` must include `ETag` if you need to verify uploads.
- `MaxAgeSeconds` tells the browser how long to cache the preflight response. 3600 (1 hour) is a good default.

---

## Security Considerations

### What Presigned URLs Protect Against

- **Unauthorized uploads**: Without a valid presigned URL, S3 rejects the request. Users must authenticate with your API to get one.
- **Path traversal**: The key is baked into the signature. A user cannot modify the URL to upload to a different path.
- **Replay attacks**: The URL expires after the configured duration (10 minutes in our example).

### What You Still Need to Handle

- **File type validation on the server**: The `ContentType` in the presigned URL is a hint, not a guarantee. A malicious client could upload any file type. Your `confirm_upload` endpoint should verify the actual content type using `head_object`.
- **File size limits**: Presigned URLs support a `Content-Length-Range` condition through presigned POSTs (more complex than presigned PUTs). For simpler setups, check the size in `confirm_upload`.
- **Virus scanning**: For applications that accept arbitrary file uploads (not just images), consider running uploaded files through a scanner before making them publicly accessible.
- **Key guessing**: Use UUIDs or random strings in keys so users cannot guess other users' file paths.

### Validating After Upload

```python
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def confirm_upload(request, event_id):
    """Confirm upload with server-side validation."""
    key = request.data.get("key")

    s3 = get_s3_client()
    head = s3.head_object(
        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
        Key=key,
    )

    # Verify content type (server-side, not trusting the client)
    actual_type = head["ContentType"]
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if actual_type not in allowed_types:
        # Delete the invalid upload
        s3.delete_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=key,
        )
        return Response(
            {"error": f"Invalid file type: {actual_type}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Verify file size
    size = head["ContentLength"]
    max_size = 10 * 1024 * 1024  # 10 MB
    if size > max_size:
        s3.delete_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=key,
        )
        return Response(
            {"error": "File too large"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Proceed with saving the reference...
```

---

## Testing the Full Flow

```bash
# 1. Start the stack
docker compose up -d

# 2. Request a presigned URL
curl -X POST http://localhost:8000/api/events/1/upload-url/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename": "concert.jpg", "contentType": "image/jpeg"}'

# Response:
# {
#   "uploadUrl": "http://localhost:9000/gather-images/events/1/cover-abc123.jpg?X-Amz-...",
#   "key": "events/1/cover-abc123.jpg",
#   "expiresIn": 600
# }

# 3. Upload directly to MinIO using the presigned URL
curl -X PUT "http://localhost:9000/gather-images/events/1/cover-abc123.jpg?X-Amz-..." \
  -H "Content-Type: image/jpeg" \
  --data-binary @/path/to/concert.jpg

# 4. Confirm the upload
curl -X POST http://localhost:8000/api/events/1/confirm-upload/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "events/1/cover-abc123.jpg"}'

# Response:
# {"key": "events/1/cover-abc123.jpg", "url": "http://...", "size": 2458624}
```

---

## Key Takeaways

- Server-proxied uploads waste memory, bandwidth, and worker time. Every byte passes through your server twice (in from browser, out to S3).
- Presigned URLs let the browser upload directly to S3. Your server only generates the URL and confirms the result.
- Presigned URLs are time-limited, operation-specific, and key-specific. They cannot be reused, repurposed, or modified.
- Always validate uploads server-side after they complete. Check content type and file size in the `confirm_upload` step.
- CORS must be configured on the S3 bucket to allow cross-origin PUT requests from your frontend.
- Use `XMLHttpRequest` instead of `fetch` for uploads when you need progress tracking.
