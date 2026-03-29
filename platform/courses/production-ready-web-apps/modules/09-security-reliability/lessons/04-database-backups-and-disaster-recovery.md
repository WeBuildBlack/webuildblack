---
title: "Database Backups and Disaster Recovery"
estimatedMinutes: 35
---

# Database Backups and Disaster Recovery

It's 2 AM. Your managed database provider has an outage. Or someone runs a migration that drops a column with six months of RSVP data. Or ransomware encrypts your production server.

The question isn't whether this will happen. The question is whether you can recover, and how long it takes.

Database backups are the most boring, most critical piece of infrastructure you will ever build. Nobody celebrates a backup script. But the day you need to restore from one, it becomes the most important code you ever wrote.

## Backup Strategies

PostgreSQL offers two fundamentally different approaches to backups: logical and physical. Each has tradeoffs, and a solid backup strategy uses both.

### Logical Backups with pg_dump

`pg_dump` creates a logical backup: a file containing SQL statements (or a custom binary format) that can recreate the database from scratch. Think of it as a snapshot of your data as SQL.

```bash
# Basic SQL dump
pg_dump -h localhost -U gather -d gather > gather_backup.sql

# Custom format (compressed, supports parallel restore)
pg_dump -h localhost -U gather -d gather -Fc -f gather_backup.dump

# Custom format with compression level
pg_dump -h localhost -U gather -d gather -Fc -Z 9 -f gather_backup.dump

# Dump specific tables only
pg_dump -h localhost -U gather -d gather -t events_event -t events_rsvp -Fc -f events_backup.dump
```

**Advantages of pg_dump:**

- Works across PostgreSQL major versions (dump from 15, restore to 16)
- Output is portable and can be inspected as SQL
- Can dump specific tables or schemas
- Small databases dump quickly

**Disadvantages of pg_dump:**

- Slow for large databases (it reads every row)
- Restore requires replaying all the SQL, which can take hours for large datasets
- Does not capture WAL (Write-Ahead Log) data, so you can only restore to the exact moment of the dump

### Physical Backups with pg_basebackup

`pg_basebackup` creates a physical backup: a byte-for-byte copy of the PostgreSQL data directory. This is the same data the server reads from disk.

```bash
# Full physical backup
pg_basebackup -h localhost -U replication_user -D /backups/base_backup \
    --wal-method=stream --checkpoint=fast --progress

# With compression
pg_basebackup -h localhost -U replication_user -D /backups/base_backup \
    --wal-method=stream --checkpoint=fast --compress=gzip:9 --progress
```

**Advantages of pg_basebackup:**

- Fast for large databases (copies files, doesn't read rows)
- Enables point-in-time recovery when combined with WAL archiving
- Restore is fast (just copy files back)

**Disadvantages of pg_basebackup:**

- Only works with the same PostgreSQL major version
- Backups are larger (includes indexes, dead tuples, free space)
- Requires a replication user with appropriate permissions

### Which to Use

For Gather, use both:

| Strategy | Frequency | Retention | Purpose |
|----------|-----------|-----------|---------|
| pg_dump (custom format) | Every 6 hours | 7 days | Quick restores, cross-version compatibility |
| pg_basebackup + WAL | Daily | 30 days | Point-in-time recovery |

## Automating Backups

A backup that requires someone to remember to run it is not a backup. Automate everything.

### Backup Script

```bash
#!/bin/bash
# scripts/backup-database.sh

set -euo pipefail

# Configuration
BACKUP_DIR="/backups/gather"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/gather_${TIMESTAMP}.dump"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

log() {
    echo "[$(date -Iseconds)] $1" | tee -a "${LOG_FILE}"
}

log "Starting backup..."

# Create the dump
pg_dump \
    -h "${DB_HOST:-localhost}" \
    -U "${DB_USER:-gather}" \
    -d "${DB_NAME:-gather}" \
    -Fc \
    -Z 6 \
    -f "${BACKUP_FILE}" \
    2>> "${LOG_FILE}"

# Verify the backup is not empty
BACKUP_SIZE=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat --format=%s "${BACKUP_FILE}")
if [ "${BACKUP_SIZE}" -lt 1024 ]; then
    log "ERROR: Backup file is suspiciously small (${BACKUP_SIZE} bytes)"
    exit 1
fi

log "Backup created: ${BACKUP_FILE} (${BACKUP_SIZE} bytes)"

# Delete backups older than retention period
DELETED=$(find "${BACKUP_DIR}" -name "gather_*.dump" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
log "Deleted ${DELETED} backups older than ${RETENTION_DAYS} days"

log "Backup complete"
```

### Scheduling with Cron

```bash
# crontab -e

# Run backup every 6 hours
0 */6 * * * /app/scripts/backup-database.sh >> /var/log/gather-backup.log 2>&1

# Run full physical backup daily at 3 AM
0 3 * * * /app/scripts/physical-backup.sh >> /var/log/gather-physical-backup.log 2>&1
```

### Docker Compose Backup Service

For Gather's Docker setup, add a backup service:

```yaml
# docker-compose.yml

services:
  # ... existing services ...

  backup:
    image: postgres:16-alpine
    volumes:
      - ./scripts:/scripts
      - backup_data:/backups
    environment:
      - PGHOST=db
      - PGUSER=gather
      - PGPASSWORD=gather
      - PGDATABASE=gather
    entrypoint: /bin/sh
    command: >
      -c "while true; do
        echo \"[$(date)] Starting scheduled backup...\";
        pg_dump -Fc -Z 6 -f /backups/gather_$(date +%Y%m%d_%H%M%S).dump;
        echo \"[$(date)] Backup complete\";
        find /backups -name 'gather_*.dump' -mtime +7 -delete;
        sleep 21600;
      done"
    depends_on:
      - db

volumes:
  backup_data:
```

## Rotation and Retention

Not every backup has the same value. Recent backups are more likely to be needed, but you also want older backups in case a data corruption issue isn't discovered immediately.

### Grandfather-Father-Son (GFS) Rotation

A common retention scheme:

```
Daily backups:   Keep for 7 days
Weekly backups:  Keep for 4 weeks (every Sunday's daily backup)
Monthly backups: Keep for 12 months (first Sunday of each month)
```

```bash
#!/bin/bash
# scripts/rotate-backups.sh

BACKUP_DIR="/backups/gather"
DAY_OF_WEEK=$(date +%u)   # 1=Monday, 7=Sunday
DAY_OF_MONTH=$(date +%d)  # 01-31

# Daily: keep 7 days (handled by find -mtime +7)
find "${BACKUP_DIR}/daily" -name "*.dump" -mtime +7 -delete

# Weekly: copy Sunday's backup to weekly directory
if [ "${DAY_OF_WEEK}" -eq 7 ]; then
    LATEST=$(ls -t "${BACKUP_DIR}/daily/"*.dump | head -1)
    cp "${LATEST}" "${BACKUP_DIR}/weekly/"
    find "${BACKUP_DIR}/weekly" -name "*.dump" -mtime +28 -delete
fi

# Monthly: copy first-of-month backup to monthly directory
if [ "${DAY_OF_MONTH}" -eq "01" ]; then
    LATEST=$(ls -t "${BACKUP_DIR}/daily/"*.dump | head -1)
    cp "${LATEST}" "${BACKUP_DIR}/monthly/"
    find "${BACKUP_DIR}/monthly" -name "*.dump" -mtime +365 -delete
fi
```

### Offsite Storage

Backups on the same server as your database aren't real backups. If the server dies, the backups die with it.

```bash
# Upload to S3 (or any S3-compatible storage like MinIO, Backblaze B2)
aws s3 cp "${BACKUP_FILE}" "s3://gather-backups/daily/${BACKUP_FILE##*/}" \
    --storage-class STANDARD_IA

# Verify the upload
aws s3 ls "s3://gather-backups/daily/${BACKUP_FILE##*/}"
```

For Gather's budget, Backblaze B2 offers 10 GB free and $0.005/GB/month after that. A compressed Gather database backup is unlikely to exceed a few hundred megabytes.

## Testing Restores

A backup you've never tested is not a backup. It's a hope. Test your restores regularly.

### Restore from pg_dump

```bash
# Create a temporary database for testing
createdb -h localhost -U gather gather_restore_test

# Restore into it
pg_restore \
    -h localhost \
    -U gather \
    -d gather_restore_test \
    --no-owner \
    --no-privileges \
    gather_backup.dump

# Verify the data
psql -h localhost -U gather -d gather_restore_test \
    -c "SELECT COUNT(*) FROM events_event;"

psql -h localhost -U gather -d gather_restore_test \
    -c "SELECT COUNT(*) FROM events_rsvp;"

# Compare counts with production
echo "Production counts:"
psql -h localhost -U gather -d gather \
    -c "SELECT 'events', COUNT(*) FROM events_event UNION ALL SELECT 'rsvps', COUNT(*) FROM events_rsvp;"

# Clean up
dropdb -h localhost -U gather gather_restore_test
```

### Automated Restore Verification

Add a restore test to your backup script:

```bash
#!/bin/bash
# scripts/verify-backup.sh

set -euo pipefail

BACKUP_FILE="$1"
TEST_DB="gather_restore_test_$(date +%s)"

log() {
    echo "[$(date -Iseconds)] $1"
}

log "Creating test database: ${TEST_DB}"
createdb -h "${DB_HOST}" -U "${DB_USER}" "${TEST_DB}"

# Ensure cleanup on exit
cleanup() {
    log "Cleaning up test database: ${TEST_DB}"
    dropdb -h "${DB_HOST}" -U "${DB_USER}" "${TEST_DB}" 2>/dev/null || true
}
trap cleanup EXIT

log "Restoring backup to test database..."
pg_restore \
    -h "${DB_HOST}" \
    -U "${DB_USER}" \
    -d "${TEST_DB}" \
    --no-owner \
    --no-privileges \
    "${BACKUP_FILE}" 2>&1

log "Verifying table counts..."
TABLES=("events_event" "events_rsvp" "auth_user")
ALL_GOOD=true

for TABLE in "${TABLES[@]}"; do
    COUNT=$(psql -h "${DB_HOST}" -U "${DB_USER}" -d "${TEST_DB}" \
        -t -c "SELECT COUNT(*) FROM ${TABLE};" 2>/dev/null | tr -d ' ')

    if [ -z "${COUNT}" ] || [ "${COUNT}" -eq 0 ]; then
        log "WARNING: Table ${TABLE} has ${COUNT:-0} rows"
        ALL_GOOD=false
    else
        log "OK: ${TABLE} has ${COUNT} rows"
    fi
done

if [ "${ALL_GOOD}" = true ]; then
    log "PASS: Backup verification successful"
    exit 0
else
    log "FAIL: Backup verification found issues"
    exit 1
fi
```

Run this weekly in CI or as a scheduled job. If the restore test fails, alert immediately.

## Point-in-Time Recovery with WAL

`pg_dump` gives you snapshots at specific moments. But what if you need to restore to 2:47 PM, fifteen minutes after the last backup? That's where Write-Ahead Log (WAL) archiving comes in.

### How WAL Works

PostgreSQL writes every change to a WAL file before applying it to the actual data files. This is how it ensures durability (changes survive crashes). WAL archiving copies these files to a safe location as they're completed.

With a base backup (from `pg_basebackup`) plus all WAL files since that backup, you can replay changes up to any specific point in time.

### Enabling WAL Archiving

```
# postgresql.conf

wal_level = replica              # Required for archiving
archive_mode = on                # Enable WAL archiving
archive_command = 'cp %p /backups/wal/%f'  # Copy WAL files to backup location
archive_timeout = 300            # Force archiving every 5 minutes even if WAL isn't full
```

For production, replace the `cp` command with something that uploads to remote storage:

```
archive_command = 'aws s3 cp %p s3://gather-backups/wal/%f'
```

### Performing Point-in-Time Recovery

When disaster strikes and you need to restore to a specific moment:

```bash
# 1. Stop PostgreSQL
pg_ctl stop -D /var/lib/postgresql/data

# 2. Clear the data directory (or move it aside)
mv /var/lib/postgresql/data /var/lib/postgresql/data_old

# 3. Restore the base backup
cp -r /backups/base_backup /var/lib/postgresql/data

# 4. Create a recovery configuration
cat > /var/lib/postgresql/data/postgresql.auto.conf << EOF
restore_command = 'cp /backups/wal/%f %p'
recovery_target_time = '2026-03-15 14:47:00'
recovery_target_action = 'promote'
EOF

# 5. Create the recovery signal file
touch /var/lib/postgresql/data/recovery.signal

# 6. Start PostgreSQL (it replays WAL up to the target time)
pg_ctl start -D /var/lib/postgresql/data
```

PostgreSQL replays WAL files from the archive, applying every change made after the base backup, stopping at exactly 2:47 PM. Every RSVP, every event update, every user registration up to that moment is recovered.

## RTO and RPO

Two metrics define your disaster recovery requirements:

**Recovery Point Objective (RPO):** How much data can you afford to lose? If your RPO is 1 hour, you need backups at least every hour. If your RPO is zero, you need synchronous replication.

**Recovery Time Objective (RTO):** How long can the application be down? If your RTO is 4 hours, you have 4 hours to detect the problem, restore from backup, verify the data, and bring the application back online.

### Gather's DR Requirements

For a community event platform like Gather, here's a reasonable starting point:

| Metric | Target | Justification |
|--------|--------|---------------|
| RPO | 6 hours | Losing 6 hours of RSVPs is annoying but recoverable. Users can re-RSVP. |
| RTO | 4 hours | Users can tolerate a few hours of downtime for a non-critical app. |

These targets drive the backup strategy:

- **RPO of 6 hours** requires `pg_dump` every 6 hours at minimum. With WAL archiving (every 5 minutes), the actual RPO is closer to 5 minutes.
- **RTO of 4 hours** requires tested restore procedures. You need to know that a restore takes 30 minutes, not 6 hours.

### Measuring RTO

Your restore verification script should track how long the restore takes:

```bash
RESTORE_START=$(date +%s)

pg_restore -h "${DB_HOST}" -U "${DB_USER}" -d "${TEST_DB}" \
    --no-owner --no-privileges "${BACKUP_FILE}"

RESTORE_END=$(date +%s)
RESTORE_DURATION=$((RESTORE_END - RESTORE_START))

log "Restore completed in ${RESTORE_DURATION} seconds"

if [ "${RESTORE_DURATION}" -gt 14400 ]; then
    log "WARNING: Restore took longer than RTO target (4 hours)"
fi
```

Track this metric over time. As your database grows, restore times increase. If your restore time is approaching your RTO, you need to adjust your strategy (faster storage, parallel restore, smaller databases).

## Gather's Backup Checklist

Here's everything Gather needs for a solid backup and DR strategy:

1. **Automated pg_dump every 6 hours** with custom format and compression
2. **Daily pg_basebackup** with WAL archiving enabled
3. **7-day daily retention, 4-week weekly, 12-month monthly** rotation
4. **Offsite copies** uploaded to S3-compatible storage after each backup
5. **Weekly automated restore test** that verifies table counts and logs duration
6. **Documented restore procedure** that any team member can follow at 2 AM
7. **Monitoring alerts** when a backup fails or restore test fails
8. **Annual DR drill** where you actually restore from backup to a clean environment

The last point is the most important. A documented procedure that nobody has practiced is barely better than no procedure at all.

## What's Next

You now have a plan for when things go wrong passively (hardware failure, provider outage). But what about actively testing your system's resilience? In the next lesson, we'll cover chaos engineering: deliberately breaking things to find weaknesses before they find you.
