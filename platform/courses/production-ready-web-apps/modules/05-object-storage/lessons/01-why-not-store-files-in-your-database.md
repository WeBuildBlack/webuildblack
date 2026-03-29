---
title: "Why Not Store Files in Your Database"
estimatedMinutes: 30
---

# Why Not Store Files in Your Database

Every developer hits this moment. You need users to upload images, PDFs, or videos, and your first thought is: "I already have a database. Why not just store the file there?" It seems clean. One system, one backup, one source of truth. PostgreSQL even has a `BYTEA` type for binary data. Django has a `BinaryField`. The temptation is real.

This lesson explains why that approach breaks down at scale, introduces the object storage model that production systems actually use, and shows you the cost math that makes the decision obvious.

---

## The BLOB Temptation

BLOB stands for Binary Large Object. Most relational databases support storing binary data directly in rows:

```sql
-- PostgreSQL
CREATE TABLE event_images (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    filename VARCHAR(255),
    content_type VARCHAR(100),
    data BYTEA  -- binary data stored right here
);
```

In Django, you could use a `BinaryField`:

```python
class EventImage(models.Model):
    event = models.ForeignKey("Event", on_delete=models.CASCADE)
    filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    data = models.BinaryField()  # the actual file bytes
```

And the upload view looks straightforward:

```python
def upload_image(request, event_id):
    file = request.FILES["image"]
    EventImage.objects.create(
        event_id=event_id,
        filename=file.name,
        content_type=file.content_type,
        data=file.read(),  # read entire file into memory, store in DB
    )
    return JsonResponse({"status": "uploaded"})
```

This works. For a prototype with 10 users uploading small profile pictures, you might never notice a problem. But Gather is not a prototype. Let's walk through what happens as your event platform grows.

---

## Why It Fails at Scale

### 1. Database Size Explodes

A single event cover image is typically 1-5 MB. Gather has 100K events. If half of them have cover images, that is 50,000 images averaging 2 MB each.

```
50,000 images x 2 MB = 100 GB of binary data in your database
```

Your actual relational data (events, users, RSVPs, comments) might total 2 GB. Now your database is 50x larger than it needs to be because of file storage. Every managed database provider (AWS RDS, Supabase, DigitalOcean) charges based on storage. You are paying database-tier prices for what is essentially a pile of JPEGs.

### 2. Backups Become Painful

Database backups with `pg_dump` now take dramatically longer:

```bash
# A 2 GB database backs up in seconds
pg_dump gather_db > backup.sql  # ~30 seconds

# A 102 GB database with BLOBs
pg_dump gather_db > backup.sql  # 45+ minutes, 102 GB file
```

Continuous archiving (WAL shipping) streams every change to the backup. Every image upload generates WAL records containing the full binary data. Your backup storage costs multiply.

### 3. Memory Pressure

When PostgreSQL reads a row containing a 3 MB BYTEA column, that data passes through shared buffers (the database's memory cache). Your carefully tuned buffer pool, which should be caching hot query results and index pages, is now full of image bytes that will probably never be read again.

```
# Before BLOBs: shared_buffers holds index pages and frequently queried rows
# After BLOBs: shared_buffers evicts useful data to make room for image bytes

# This query now causes cache misses for unrelated queries:
SELECT data FROM event_images WHERE event_id = 42;
```

Even with PostgreSQL's TOAST (The Oversized-Attribute Storage Technique), which stores large values in a separate table, reading those values still impacts memory and I/O.

### 4. No CDN Integration

When a user in Tokyo views a Gather event page, the cover image needs to travel from your database server in Virginia. The request path looks like this:

```
Browser (Tokyo)
  → Your Django server (Virginia)
    → PostgreSQL query (Virginia)
    → Read BYTEA column
    → Stream bytes back to Django
  → Django streams response to browser
  → 200ms+ latency for image alone
```

With a CDN (Content Delivery Network), that same image would be cached at an edge server in Tokyo after the first request. Every subsequent viewer in that region gets the image in 10-20ms. But CDNs work with URLs, not database queries. You cannot point a CDN at a SQL query.

### 5. Concurrency Bottleneck

Every image download is a database connection doing a large sequential read. Your connection pool has a limited number of slots (typically 20-100). If 50 users are simultaneously loading event pages with images, that is 50 connections tied up streaming binary data instead of running the fast queries that power your application.

```python
# Each image request holds a DB connection for the entire transfer
# A 3 MB image over a slow connection = seconds of connection time

# Meanwhile, these fast queries are waiting for a connection:
Event.objects.filter(city="Brooklyn")  # 2ms query, blocked
User.objects.get(id=request.user.id)   # 1ms query, blocked
```

---

## The Object Storage Model

Production systems solve this with a simple architectural split: **files go in object storage, the database holds references**.

```
┌─────────────────┐     ┌──────────────────────┐
│   PostgreSQL    │     │   Object Storage     │
│                 │     │   (S3 / MinIO)       │
│  events         │     │                      │
│  ┌───────────┐  │     │  /events/42/cover.jpg│
│  │ id: 42    │  │     │  /events/42/thumb.jpg│
│  │ title: ...│  │     │  /events/99/cover.jpg│
│  │ cover_key:│──┼────>│  ...                 │
│  │  "events/ │  │     │                      │
│  │   42/     │  │     │  Optimized for files: │
│  │   cover"  │  │     │  - Cheap per GB      │
│  └───────────┘  │     │  - CDN-ready         │
│                 │     │  - No connection pool │
└─────────────────┘     └──────────────────────┘
```

Your database column stores a **key** (essentially a path) instead of the file itself:

```python
class Event(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    # Instead of BinaryField, store a reference
    cover_image_key = models.CharField(max_length=500, blank=True)
    # Example value: "events/42/cover.jpg"
```

To display the image, you construct a URL:

```python
def get_cover_url(self):
    if not self.cover_image_key:
        return None
    return f"https://cdn.gather.example.com/{self.cover_image_key}"
```

The browser fetches the image directly from the CDN or object storage. Your Django server and database are not involved in serving the file at all.

---

## Cost Comparison

Let's make this concrete with real pricing (as of 2026, approximate):

### Storing 100 GB of images

| Approach | Monthly Cost | Notes |
|----------|-------------|-------|
| AWS RDS PostgreSQL (db.t3.medium) | ~$70/month + $11.50/100GB storage | Database instance + storage |
| Supabase Pro | $25/month + $0.125/GB over 8GB | $36.50 for 100GB of storage |
| AWS S3 Standard | $2.30/month for 100GB | Just storage, no compute |
| Backblaze B2 | $0.60/month for 100GB | Even cheaper |
| DigitalOcean Spaces | $5/month for 250GB | Flat rate with CDN included |

The storage cost difference is 10-30x. But that is only part of the story. Factor in:

- **Backup costs**: Your database backup is now 2 GB instead of 102 GB
- **Connection efficiency**: Database connections serve queries, not file downloads
- **Bandwidth**: CDN serves images from edge locations, reducing origin bandwidth
- **Performance**: Database cache holds useful data instead of image bytes

### The real math for Gather

```
Database approach:
  RDS db.t3.medium:     $70/month
  100 GB storage:       $11.50/month
  Backup storage:       $11.50/month (100 GB)
  Total:                $93/month

Object storage approach:
  RDS db.t3.small:      $35/month  (smaller instance, less memory needed)
  2 GB storage:         $0.23/month
  Backup storage:       $0.23/month (2 GB)
  S3 for images:        $2.30/month
  CloudFront CDN:       ~$8/month  (100 GB transfer)
  Total:                $45.76/month
```

Half the cost and dramatically better performance. The database stays small, backups are fast, and users get images from a nearby CDN edge node instead of your origin server.

---

## What the Database Should Store

Your database is excellent at what it was designed for: structured, relational data with transactional guarantees. For file handling, store metadata and references:

```python
class EventImage(models.Model):
    event = models.ForeignKey("Event", on_delete=models.CASCADE)

    # Reference to object storage
    storage_key = models.CharField(max_length=500)
    # e.g., "events/42/images/cover-original.jpg"

    # Metadata (useful for queries and display)
    filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    size_bytes = models.IntegerField()
    width = models.IntegerField(null=True)
    height = models.IntegerField(null=True)

    # Variant tracking (we'll build this in Lesson 04)
    is_variant = models.BooleanField(default=False)
    variant_type = models.CharField(
        max_length=20,
        blank=True,
        choices=[
            ("thumb_sm", "Small Thumbnail"),
            ("thumb_md", "Medium Thumbnail"),
            ("thumb_lg", "Large Thumbnail"),
            ("webp", "WebP Version"),
        ]
    )
    original = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE
    )

    uploaded_at = models.DateTimeField(auto_now_add=True)

    def get_url(self):
        return f"https://cdn.gather.example.com/{self.storage_key}"
```

This gives you the best of both worlds. You can query images by event, filter by type, sort by upload date, and join with other tables. The actual bytes live in cheap, CDN-ready object storage.

---

## When BLOBs Are Actually Fine

To be fair, there are narrow cases where storing small binary data in the database is acceptable:

- **Tiny files under 100 KB**: User avatars, favicons, small icons. The overhead is minimal.
- **Transactional consistency is critical**: If a file must be atomically committed with related data and rollback must delete the file too. (But most apps handle this with cleanup jobs instead.)
- **SQLite in embedded/mobile apps**: When there is no separate storage service available.
- **Encryption at rest with strict compliance**: When your compliance framework requires all data in one audited store. (But S3 also supports encryption at rest.)

For Gather, none of these apply. Event cover images are 1-5 MB, there is no strict transactional requirement for image storage, and you are running a server-side application with access to object storage. The decision is clear.

---

## What is Coming Next

In the next lesson, you will set up S3-compatible object storage using MinIO in Docker Compose for local development, configure Django to store files in S3 using django-storages, and wire it into Gather so event organizers can upload cover images. The pattern you learn will apply to any S3-compatible service: AWS S3, DigitalOcean Spaces, Backblaze B2, or Cloudflare R2.

---

## Key Takeaways

- Storing files as BLOBs in your database causes size explosion, slow backups, memory pressure, and blocks CDN usage
- The object storage model separates file storage from metadata storage. Files go in object storage, the database holds keys (references).
- Object storage is 10-30x cheaper per GB than database storage
- Your database stays small, fast, and focused on relational queries
- CDNs can serve files from edge locations, but only if those files are accessible via URL (not locked inside a database)
- Store file metadata (size, dimensions, content type) in the database for querying. Store the bytes in object storage.
