---
title: "S3-Compatible Object Storage"
estimatedMinutes: 40
---

# S3-Compatible Object Storage

Amazon S3 (Simple Storage Service) launched in 2006 and became the de facto standard for object storage. Its API is so widely adopted that dozens of competing services implement the same interface. When you learn S3, you are learning a universal protocol. This lesson covers S3 core concepts, the boto3 Python SDK, Django integration with django-storages, and setting up MinIO in Docker Compose so you can develop locally without an AWS account.

---

## S3 Core Concepts

### Buckets

A bucket is a top-level container for objects. Think of it as a root directory, but with a globally unique name across all of AWS.

```
gather-production-images    <-- bucket name (globally unique)
├── events/42/cover.jpg     <-- object
├── events/42/thumb-sm.jpg  <-- object
├── events/99/cover.jpg     <-- object
└── avatars/user-7.jpg      <-- object
```

Key rules for buckets:
- Names must be globally unique across all AWS accounts
- Names must be 3-63 characters, lowercase, no underscores
- You cannot nest buckets inside other buckets
- Each bucket has its own access policy, versioning settings, and lifecycle rules

### Keys

An object's key is its full path within the bucket. There are no actual directories in S3. The key `events/42/cover.jpg` is a flat string, not a file inside nested folders. The `/` characters are just part of the key name. The S3 console displays them as folders for convenience, but the underlying system treats every key as a flat entry.

```python
# These are all valid keys:
"events/42/cover.jpg"
"events/42/thumbnails/small.jpg"
"my-file.pdf"
"2026/03/14/backup.sql.gz"
```

### Regions

Every bucket lives in a specific AWS region (us-east-1, eu-west-1, ap-northeast-1). Data stays in that region unless you explicitly replicate it. Choose a region close to your servers to minimize latency for uploads and processing.

### Storage Classes

S3 offers different storage classes based on access patterns:

| Class | Use Case | Cost (per GB/month) |
|-------|----------|-------------------|
| Standard | Frequently accessed | $0.023 |
| Intelligent-Tiering | Unknown access patterns | $0.023 + monitoring fee |
| Standard-IA (Infrequent Access) | Accessed less than monthly | $0.0125 |
| Glacier Instant Retrieval | Archival with instant access | $0.004 |
| Glacier Deep Archive | Long-term archive, hours to retrieve | $0.00099 |

For Gather event images, Standard is the right choice. Images are accessed frequently when users view events. You might move very old event images (events from years ago) to Standard-IA with a lifecycle rule.

---

## The S3 API as a Standard

The beauty of the S3 API is that it has become an industry standard. These services all implement the same API:

| Service | Provider | Pricing (storage) | Notes |
|---------|----------|-------------------|-------|
| AWS S3 | Amazon | $0.023/GB/month | The original |
| MinIO | Self-hosted | Free (open source) | Perfect for local dev |
| DigitalOcean Spaces | DigitalOcean | $5/month for 250GB | CDN included |
| Backblaze B2 | Backblaze | $0.006/GB/month | Cheapest cloud option |
| Cloudflare R2 | Cloudflare | $0.015/GB/month | Zero egress fees |
| Google Cloud Storage | Google | $0.020/GB/month | S3-compatible XML API |

This means your code works with all of them. Write your upload logic once, change the endpoint URL and credentials, and you can switch providers without touching application code.

---

## boto3: The Python S3 SDK

`boto3` is Amazon's official Python SDK for AWS services. Since every S3-compatible service uses the same API, boto3 works with all of them.

### Installation

```bash
pip install boto3
```

### Basic Operations

```python
import boto3

# Create a client
s3 = boto3.client(
    "s3",
    endpoint_url="http://localhost:9000",  # MinIO local endpoint
    aws_access_key_id="minioadmin",
    aws_secret_access_key="minioadmin",
    region_name="us-east-1",
)

# Create a bucket
s3.create_bucket(Bucket="gather-images")

# Upload a file
s3.upload_file(
    Filename="/path/to/local/cover.jpg",  # local file path
    Bucket="gather-images",
    Key="events/42/cover.jpg",            # destination key
    ExtraArgs={
        "ContentType": "image/jpeg",
        "CacheControl": "public, max-age=31536000",  # CDN cache for 1 year
    },
)

# Upload from bytes (useful when processing in memory)
s3.put_object(
    Bucket="gather-images",
    Key="events/42/thumb-sm.jpg",
    Body=thumbnail_bytes,  # bytes object
    ContentType="image/jpeg",
)

# Download a file
s3.download_file(
    Bucket="gather-images",
    Key="events/42/cover.jpg",
    Filename="/tmp/downloaded-cover.jpg",
)

# Get object as bytes
response = s3.get_object(Bucket="gather-images", Key="events/42/cover.jpg")
image_bytes = response["Body"].read()

# List objects with a prefix
response = s3.list_objects_v2(
    Bucket="gather-images",
    Prefix="events/42/",  # all objects under this "directory"
)
for obj in response.get("Contents", []):
    print(f"{obj['Key']}  ({obj['Size']} bytes)")

# Delete an object
s3.delete_object(Bucket="gather-images", Key="events/42/cover.jpg")
```

### Error Handling

```python
from botocore.exceptions import ClientError

try:
    s3.head_object(Bucket="gather-images", Key="events/42/cover.jpg")
except ClientError as e:
    if e.response["Error"]["Code"] == "404":
        print("Object does not exist")
    else:
        raise
```

---

## MinIO: S3 for Local Development

MinIO is an open-source, S3-compatible object storage server. It runs in a single Docker container and implements the full S3 API. You never need an AWS account for local development.

### Adding MinIO to Docker Compose

Your Gather project already has a `docker-compose.yml` with PostgreSQL, Redis, Celery worker, and the Django app. Add MinIO alongside them:

```yaml
# docker-compose.yml (add to existing services)
services:
  # ... existing services (db, redis, web, celery_worker) ...

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"   # S3 API
      - "9001:9001"   # MinIO web console
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

  # Create the default bucket on startup
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

volumes:
  # ... existing volumes ...
  minio_data:
```

The `minio-init` service runs once on startup to create the `gather-images` bucket and set it to allow public downloads. This mimics the typical S3 setup where uploaded objects are publicly readable.

### MinIO Web Console

After running `docker compose up`, open `http://localhost:9001` in your browser. Log in with `minioadmin` / `minioadmin`. You can browse buckets, view objects, and manage settings. It is very useful for debugging upload issues.

---

## Django Settings for S3

### Install django-storages

```bash
pip install django-storages boto3
```

### Configuration

```python
# settings.py

import os

# Object storage configuration
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "minioadmin")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "minioadmin")
AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME", "gather-images")
AWS_S3_ENDPOINT_URL = os.environ.get("AWS_S3_ENDPOINT_URL", "http://localhost:9000")
AWS_S3_REGION_NAME = os.environ.get("AWS_S3_REGION_NAME", "us-east-1")

# Use path-style URLs (required for MinIO, optional for S3)
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = False  # public URLs without query string signatures

# Custom domain for serving files (CDN in production)
AWS_S3_CUSTOM_DOMAIN = os.environ.get("AWS_S3_CUSTOM_DOMAIN", None)

# Cache control for uploaded files
AWS_S3_OBJECT_PARAMETERS = {
    "CacheControl": "public, max-age=86400",
}

# Use S3 for Django's default file storage
DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
```

### Environment Variables

Add these to your `.env` file for local development:

```bash
# .env (local development with MinIO)
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_STORAGE_BUCKET_NAME=gather-images
AWS_S3_ENDPOINT_URL=http://minio:9000
AWS_S3_REGION_NAME=us-east-1
```

In production, you would change these to point at your actual S3 bucket:

```bash
# Production environment
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=secret...
AWS_STORAGE_BUCKET_NAME=gather-prod-images
AWS_S3_ENDPOINT_URL=https://s3.us-east-1.amazonaws.com
AWS_S3_REGION_NAME=us-east-1
AWS_S3_CUSTOM_DOMAIN=cdn.gather.example.com
```

---

## Applying to Gather: Event Cover Images

Now let's wire this into Gather. Events need cover images, and organizers need to upload them.

### The Model

```python
# events/models.py

from django.db import models


class Event(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    date = models.DateTimeField()
    location = models.CharField(max_length=300)
    organizer = models.ForeignKey(
        "users.User", on_delete=models.CASCADE, related_name="organized_events"
    )

    # Cover image reference (key in object storage)
    cover_image_key = models.CharField(max_length=500, blank=True, default="")
    cover_image_url = models.URLField(max_length=1000, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
```

### The Upload Endpoint

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
def upload_cover_image(request, event_id):
    """Upload a cover image for an event."""
    try:
        event = Event.objects.get(id=event_id, organizer=request.user)
    except Event.DoesNotExist:
        return Response(
            {"error": "Event not found or you are not the organizer"},
            status=status.HTTP_404_NOT_FOUND,
        )

    file = request.FILES.get("image")
    if not file:
        return Response(
            {"error": "No image file provided"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        return Response(
            {"error": f"File type {file.content_type} not allowed"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate file size (max 10 MB)
    max_size = 10 * 1024 * 1024
    if file.size > max_size:
        return Response(
            {"error": "File too large. Maximum size is 10 MB."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Generate a unique key
    ext = file.name.rsplit(".", 1)[-1].lower()
    unique_id = uuid.uuid4().hex[:12]
    key = f"events/{event_id}/cover-{unique_id}.{ext}"

    # Upload to S3
    s3 = get_s3_client()
    s3.put_object(
        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
        Key=key,
        Body=file.read(),
        ContentType=file.content_type,
        CacheControl="public, max-age=31536000",
    )

    # Build the public URL
    if settings.AWS_S3_CUSTOM_DOMAIN:
        url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{key}"
    else:
        url = f"{settings.AWS_S3_ENDPOINT_URL}/{settings.AWS_STORAGE_BUCKET_NAME}/{key}"

    # Delete old cover image if it exists
    if event.cover_image_key:
        try:
            s3.delete_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=event.cover_image_key,
            )
        except Exception:
            pass  # old image cleanup is best-effort

    # Update the event
    event.cover_image_key = key
    event.cover_image_url = url
    event.save(update_fields=["cover_image_key", "cover_image_url"])

    return Response({
        "key": key,
        "url": url,
    }, status=status.HTTP_200_OK)
```

### The URL Configuration

```python
# events/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # ... existing event routes ...
    path(
        "<int:event_id>/cover-image/",
        views.upload_cover_image,
        name="upload-cover-image",
    ),
]
```

### Testing the Upload

```bash
# Start the stack
docker compose up -d

# Upload an image using curl
curl -X POST http://localhost:8000/api/events/1/cover-image/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/photo.jpg"

# Response:
# {"key": "events/1/cover-a1b2c3d4e5f6.jpg", "url": "http://localhost:9000/gather-images/events/1/cover-a1b2c3d4e5f6.jpg"}
```

Open `http://localhost:9001` (MinIO console) and you will see the file in the `gather-images` bucket under the `events/1/` prefix.

---

## A Note on URL Patterns for Production

In production, you want your image URLs to go through a CDN. The typical setup:

```
Development:
  http://localhost:9000/gather-images/events/42/cover.jpg
  (direct to MinIO)

Production:
  https://cdn.gather.example.com/events/42/cover.jpg
  (CloudFront CDN → S3 origin)
```

The CDN caches files at edge locations worldwide. You configure it to use your S3 bucket as the "origin." When a file is not in the edge cache, the CDN fetches it from S3, caches it, and serves it. Subsequent requests hit the edge cache directly.

This is why we store both the `key` and the `url` on the event model. The key is permanent and portable (it works with any storage provider). The URL depends on your CDN configuration and might change if you switch CDN providers.

---

## Key Takeaways

- S3 organizes data into buckets (containers) and objects (files identified by keys)
- The S3 API is an industry standard implemented by MinIO, DigitalOcean Spaces, Backblaze B2, Cloudflare R2, and others
- boto3 is the Python SDK for S3. It works with any S3-compatible service by changing the `endpoint_url`
- django-storages integrates S3 with Django's file storage system
- MinIO runs in Docker Compose and provides a full S3-compatible API for local development
- Store the object key in your database, not just the URL. Keys are portable across storage providers.
- Use environment variables to switch between MinIO (development) and real S3 (production) without code changes
