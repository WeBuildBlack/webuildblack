---
title: "Image Processing Pipelines"
estimatedMinutes: 35
---

# Image Processing Pipelines

A user uploads a single 4000x3000 JPEG that weighs 4 MB. Your event detail page displays it as a 400px-wide card thumbnail. The browser downloads all 4 MB, then shrinks it to fit a tiny container. This wastes bandwidth, slows page load, and hurts Core Web Vitals scores.

Production applications solve this by generating multiple image variants (thumbnails at different sizes, WebP conversions) immediately after upload. In this lesson you will build an image processing pipeline using Pillow and Celery. An upload triggers a background task that generates three thumbnail sizes plus WebP variants, stores them all in S3, and updates the database.

---

## Why You Need Multiple Image Sizes

Consider how Gather displays event images in different contexts:

| Context | Display Size | Ideal Image Width |
|---------|-------------|-------------------|
| Event card in search results | 400px wide | 400px (small) |
| Event detail page hero | 800px wide | 800px (medium) |
| Full-screen lightbox | 1200px wide | 1200px (large) |
| Open Graph / social share | 1200x630 | 1200px (large) |

Serving the original 4000px image in all contexts means:

- A search results page with 20 event cards downloads 80 MB of images
- Mobile users on cellular connections wait 10+ seconds for thumbnails
- Your S3 bandwidth costs are 3-10x higher than necessary

The solution: generate variants at upload time, serve the right size for each context.

---

## Pillow for Image Manipulation

Pillow is the standard Python library for image processing. It handles resizing, format conversion, cropping, and basic transformations.

### Installation

```bash
pip install Pillow
```

### Basic Operations

```python
from PIL import Image
from io import BytesIO

# Open an image from bytes
image_bytes = s3_response["Body"].read()
img = Image.open(BytesIO(image_bytes))

# Image properties
print(f"Size: {img.width}x{img.height}")
print(f"Format: {img.format}")  # JPEG, PNG, WEBP
print(f"Mode: {img.mode}")      # RGB, RGBA, L

# Resize while maintaining aspect ratio
# thumbnail() modifies the image in place
img.thumbnail((400, 400))  # max 400px on either dimension
print(f"After thumbnail: {img.width}x{img.height}")
# A 4000x3000 image becomes 400x300 (aspect ratio preserved)

# Save to bytes
output = BytesIO()
img.save(output, format="JPEG", quality=85, optimize=True)
output.seek(0)
resized_bytes = output.getvalue()

# Convert to WebP
webp_output = BytesIO()
img.save(webp_output, format="WEBP", quality=80)
webp_output.seek(0)
webp_bytes = webp_output.getvalue()
```

### JPEG Quality Settings

JPEG quality is a tradeoff between file size and visual fidelity:

```python
# Quality comparison for a typical 4000x3000 photo:
# quality=95  →  ~2.5 MB  (nearly lossless, unnecessary for web)
# quality=85  →  ~1.2 MB  (excellent quality, good default)
# quality=75  →  ~800 KB  (good quality, noticeable only when zoomed)
# quality=60  →  ~500 KB  (acceptable for thumbnails)
```

For Gather, use quality 85 for large/medium variants and 75 for small thumbnails. The difference is invisible at thumbnail sizes.

---

## WebP: Smaller Files, Same Quality

WebP is a modern image format developed by Google. It produces files 25-35% smaller than JPEG at equivalent visual quality. All modern browsers support it (Chrome, Firefox, Safari, Edge).

```python
from PIL import Image
from io import BytesIO

def convert_to_webp(image_bytes, quality=80):
    """Convert an image to WebP format."""
    img = Image.open(BytesIO(image_bytes))

    # WebP does not support CMYK, convert if necessary
    if img.mode == "CMYK":
        img = img.convert("RGB")

    # Handle RGBA (transparency) -- WebP supports it
    if img.mode == "RGBA":
        pass  # WebP handles transparency natively
    elif img.mode != "RGB":
        img = img.convert("RGB")

    output = BytesIO()
    img.save(output, format="WEBP", quality=quality)
    output.seek(0)
    return output.getvalue()
```

Size comparison for a typical event cover image:

```
Original:     4000x3000  JPEG  4.2 MB
Large (1200): 1200x900   JPEG  380 KB  |  WebP  260 KB  (32% smaller)
Medium (800): 800x600    JPEG  180 KB  |  WebP  125 KB  (31% smaller)
Small (400):  400x300    JPEG  65 KB   |  WebP  45 KB   (31% smaller)
```

The savings add up quickly. A search results page with 20 events serving WebP small thumbnails downloads 900 KB instead of 1.3 MB (JPEG) or 84 MB (original).

---

## The Processing Pipeline

Here is the complete image processing module. It downloads the original from S3, generates all variants, uploads them back, and returns the metadata.

```python
# events/image_processing.py

from io import BytesIO
from PIL import Image
import boto3
from django.conf import settings

# Variant definitions: (suffix, max_dimension, jpeg_quality)
VARIANTS = [
    ("sm", 400, 75),
    ("md", 800, 85),
    ("lg", 1200, 85),
]


def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )


def download_from_s3(key):
    """Download an object from S3 and return its bytes."""
    s3 = get_s3_client()
    response = s3.get_object(
        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
        Key=key,
    )
    return response["Body"].read()


def upload_to_s3(key, data, content_type):
    """Upload bytes to S3."""
    s3 = get_s3_client()
    s3.put_object(
        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
        Key=key,
        Body=data,
        ContentType=content_type,
        CacheControl="public, max-age=31536000",
    )


def generate_variant(img, max_dimension, quality, output_format="JPEG"):
    """Resize an image and return bytes in the specified format."""
    # Work on a copy so we don't modify the original
    variant = img.copy()

    # Only resize if the image is larger than the target
    if variant.width > max_dimension or variant.height > max_dimension:
        variant.thumbnail((max_dimension, max_dimension))

    # Ensure RGB mode for JPEG/WebP output
    if variant.mode not in ("RGB", "RGBA"):
        variant = variant.convert("RGB")
    if output_format == "JPEG" and variant.mode == "RGBA":
        variant = variant.convert("RGB")

    output = BytesIO()
    variant.save(output, format=output_format, quality=quality, optimize=True)
    output.seek(0)

    return output.getvalue(), variant.width, variant.height


def build_variant_key(original_key, suffix, extension):
    """Build the S3 key for a variant.

    Example:
      original: events/42/cover-abc123.jpg
      variant:  events/42/cover-abc123-sm.webp
    """
    base = original_key.rsplit(".", 1)[0]  # remove extension
    return f"{base}-{suffix}.{extension}"


def process_image(original_key):
    """Download an image, generate all variants, upload to S3.

    Returns a list of variant metadata dicts.
    """
    # Download the original
    original_bytes = download_from_s3(original_key)
    img = Image.open(BytesIO(original_bytes))

    results = []

    for suffix, max_dim, quality in VARIANTS:
        # Generate JPEG variant
        jpeg_bytes, w, h = generate_variant(img, max_dim, quality, "JPEG")
        jpeg_key = build_variant_key(original_key, suffix, "jpg")
        upload_to_s3(jpeg_key, jpeg_bytes, "image/jpeg")
        results.append({
            "key": jpeg_key,
            "variant_type": f"thumb_{suffix}",
            "content_type": "image/jpeg",
            "width": w,
            "height": h,
            "size_bytes": len(jpeg_bytes),
        })

        # Generate WebP variant
        webp_bytes, w, h = generate_variant(img, max_dim, quality, "WEBP")
        webp_key = build_variant_key(original_key, suffix, "webp")
        upload_to_s3(webp_key, webp_bytes, "image/webp")
        results.append({
            "key": webp_key,
            "variant_type": f"thumb_{suffix}_webp",
            "content_type": "image/webp",
            "width": w,
            "height": h,
            "size_bytes": len(webp_bytes),
        })

    return results
```

---

## Celery Task: Trigger on Upload

You already have Celery and Redis set up from Module 03. The image processing task fits naturally into this architecture. Uploads are user-facing and should be fast. Generating six image variants takes a few seconds, so offload it to a background worker.

```python
# events/tasks.py

from celery import shared_task
from django.db import transaction

from .models import Event, EventImage
from .image_processing import process_image

import logging

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def generate_image_variants(self, event_id, original_key):
    """Generate thumbnail variants for an uploaded event cover image.

    Called after a successful direct upload. Generates 3 sizes x 2 formats
    (JPEG + WebP) = 6 variant files.
    """
    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        logger.error(f"Event {event_id} not found, skipping variant generation")
        return

    logger.info(
        f"Generating variants for event {event_id}, key: {original_key}"
    )

    try:
        variants = process_image(original_key)
    except Exception as exc:
        logger.error(
            f"Image processing failed for event {event_id}: {exc}"
        )
        raise self.retry(exc=exc)

    # Save variant metadata to the database
    with transaction.atomic():
        # Remove old variants
        EventImage.objects.filter(
            event=event,
            is_variant=True,
        ).delete()

        # Get or create the original image record
        original, _ = EventImage.objects.update_or_create(
            event=event,
            storage_key=original_key,
            defaults={
                "is_variant": False,
                "content_type": "image/jpeg",
                "filename": original_key.split("/")[-1],
            },
        )

        # Create variant records
        for v in variants:
            EventImage.objects.create(
                event=event,
                original=original,
                storage_key=v["key"],
                content_type=v["content_type"],
                width=v["width"],
                height=v["height"],
                size_bytes=v["size_bytes"],
                is_variant=True,
                variant_type=v["variant_type"],
                filename=v["key"].split("/")[-1],
            )

    logger.info(
        f"Generated {len(variants)} variants for event {event_id}"
    )

    return {
        "event_id": event_id,
        "variants_created": len(variants),
    }
```

### Triggering the Task After Upload Confirmation

Update the `confirm_upload` view to dispatch the Celery task:

```python
# events/views.py (update confirm_upload)

from .tasks import generate_image_variants


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def confirm_upload(request, event_id):
    """Confirm upload and trigger variant generation."""
    try:
        event = Event.objects.get(id=event_id, organizer=request.user)
    except Event.DoesNotExist:
        return Response(
            {"error": "Event not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    key = request.data.get("key")
    if not key:
        return Response(
            {"error": "Missing 'key'"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Verify the object exists in S3
    s3 = get_s3_client()
    try:
        head = s3.head_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=key,
        )
    except Exception:
        return Response(
            {"error": "Upload not found in storage"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Update the event with the original image
    if settings.AWS_S3_CUSTOM_DOMAIN:
        url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{key}"
    else:
        bucket = settings.AWS_STORAGE_BUCKET_NAME
        url = f"{settings.AWS_S3_ENDPOINT_URL}/{bucket}/{key}"

    event.cover_image_key = key
    event.cover_image_url = url
    event.save(update_fields=["cover_image_key", "cover_image_url"])

    # Dispatch variant generation to Celery
    generate_image_variants.delay(event_id, key)

    return Response({
        "key": key,
        "url": url,
        "size": head["ContentLength"],
        "processingVariants": True,
    })
```

The response returns immediately with `"processingVariants": true`. The Celery worker picks up the task and generates variants in the background. The user sees their original image right away while thumbnails are being created.

---

## Serving Responsive Images with srcset

Once variants exist, you serve the right size for each device using the HTML `srcset` attribute and the `<picture>` element for format selection.

### Django Serializer for Image Variants

```python
# events/serializers.py

from rest_framework import serializers
from .models import Event, EventImage


class EventImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = EventImage
        fields = ["variant_type", "content_type", "width", "height", "url"]

    def get_url(self, obj):
        from django.conf import settings

        if settings.AWS_S3_CUSTOM_DOMAIN:
            return f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{obj.storage_key}"
        bucket = settings.AWS_STORAGE_BUCKET_NAME
        return f"{settings.AWS_S3_ENDPOINT_URL}/{bucket}/{obj.storage_key}"


class EventDetailSerializer(serializers.ModelSerializer):
    cover_variants = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id", "title", "description", "date", "location",
            "cover_image_url", "cover_variants",
        ]

    def get_cover_variants(self, obj):
        variants = EventImage.objects.filter(
            event=obj, is_variant=True
        ).order_by("width")
        return EventImageSerializer(variants, many=True).data
```

### Next.js Responsive Image Component

```tsx
// components/EventCoverImage.tsx

interface ImageVariant {
  variant_type: string;
  content_type: string;
  width: number;
  height: number;
  url: string;
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
  // Separate WebP and JPEG variants
  const webpVariants = variants.filter((v) =>
    v.content_type === "image/webp"
  );
  const jpegVariants = variants.filter((v) =>
    v.content_type === "image/jpeg"
  );

  // Build srcset strings
  const buildSrcSet = (variantList: ImageVariant[]) =>
    variantList
      .map((v) => `${v.url} ${v.width}w`)
      .join(", ");

  // If no variants have been generated yet, fall back to original
  if (variants.length === 0) {
    return (
      <img
        src={fallbackUrl}
        alt={alt}
        className={className}
        loading="lazy"
      />
    );
  }

  return (
    <picture>
      {/* WebP sources (browser picks this if supported) */}
      {webpVariants.length > 0 && (
        <source
          type="image/webp"
          srcSet={buildSrcSet(webpVariants)}
          sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
        />
      )}

      {/* JPEG fallback */}
      {jpegVariants.length > 0 && (
        <source
          type="image/jpeg"
          srcSet={buildSrcSet(jpegVariants)}
          sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
        />
      )}

      {/* Final fallback */}
      <img
        src={fallbackUrl}
        alt={alt}
        className={className}
        loading="lazy"
      />
    </picture>
  );
}
```

### How `sizes` and `srcset` Work Together

The `sizes` attribute tells the browser the image's display width at different viewport widths. The browser combines this with the `srcset` widths to pick the best file:

```html
<img
  srcSet="
    /events/42/cover-sm.jpg 400w,
    /events/42/cover-md.jpg 800w,
    /events/42/cover-lg.jpg 1200w
  "
  sizes="
    (max-width: 640px) 400px,
    (max-width: 1024px) 800px,
    1200px
  "
  src="/events/42/cover-md.jpg"
  alt="Jazz Festival"
/>
```

On a 375px-wide phone: the browser knows the image displays at 400px, so it picks the 400w variant (65 KB instead of 4 MB).

On a 1440px desktop: the browser picks the 1200w variant (380 KB).

On a Retina phone (375px, 2x pixel ratio): the browser may pick the 800w variant to serve sharp pixels at 2x density.

The browser handles all of this automatically. You just provide the options.

---

## Using the `<picture>` Element for Format Selection

The `<picture>` element lets you offer multiple formats and let the browser choose the best one:

```html
<picture>
  <!-- Browser checks sources top-to-bottom, uses first supported one -->
  <source
    type="image/webp"
    srcset="
      /events/42/cover-sm.webp 400w,
      /events/42/cover-md.webp 800w,
      /events/42/cover-lg.webp 1200w
    "
    sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
  />

  <source
    type="image/jpeg"
    srcset="
      /events/42/cover-sm.jpg 400w,
      /events/42/cover-md.jpg 800w,
      /events/42/cover-lg.jpg 1200w
    "
    sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
  />

  <!-- Fallback for browsers that don't support <picture> -->
  <img src="/events/42/cover-md.jpg" alt="Jazz Festival" loading="lazy" />
</picture>
```

Chrome, Firefox, Safari, and Edge all support WebP, so they will pick the WebP source and save 30%+ bandwidth. The JPEG source exists as a safety net.

---

## The Complete Pipeline in Action

Here is the full flow, end to end:

```
1. User selects image in Next.js frontend
2. Frontend calls POST /api/events/42/upload-url/
   → Django generates presigned URL, returns it
3. Frontend uploads directly to MinIO/S3 using presigned URL
   → File lands at: events/42/cover-abc123.jpg
4. Frontend calls POST /api/events/42/confirm-upload/
   → Django verifies file exists, updates Event record
   → Django dispatches generate_image_variants.delay(42, key)
   → Returns immediately with { processingVariants: true }
5. Celery worker picks up the task
   → Downloads events/42/cover-abc123.jpg from S3
   → Generates 6 variants:
     - events/42/cover-abc123-sm.jpg   (400px, JPEG)
     - events/42/cover-abc123-sm.webp  (400px, WebP)
     - events/42/cover-abc123-md.jpg   (800px, JPEG)
     - events/42/cover-abc123-md.webp  (800px, WebP)
     - events/42/cover-abc123-lg.jpg   (1200px, JPEG)
     - events/42/cover-abc123-lg.webp  (1200px, WebP)
   → Uploads all 6 to S3
   → Creates EventImage records in database
6. Next visit to event detail page:
   → API returns cover_variants with all 6 URLs
   → <picture> element serves the optimal variant
   → Mobile user downloads 45 KB WebP thumbnail
   → Desktop user downloads 260 KB WebP large
```

Total processing time for the Celery task is typically 2-5 seconds for a 4 MB original image. The user never waits for it because the upload confirmation returns immediately.

---

## Key Takeaways

- Serving original high-resolution images wastes bandwidth and hurts page load times. Generate multiple sizes at upload time.
- Pillow handles resizing and format conversion. Use `thumbnail()` for proportional resizing and `save(format="WEBP")` for WebP output.
- WebP produces files 25-35% smaller than JPEG at equivalent quality. Use the `<picture>` element to serve WebP with JPEG fallback.
- Celery is ideal for image processing because it is CPU-intensive work that should not block the upload response. Dispatch the task in `confirm_upload` and return immediately.
- The `srcset` attribute with `sizes` lets the browser choose the optimal image variant based on viewport width and pixel density.
- Store variant metadata (key, dimensions, content type) in the database so your API can return all available variants for each image.
