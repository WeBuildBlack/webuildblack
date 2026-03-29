---
title: "Secrets Management at Scale"
estimatedMinutes: 35
---

# Secrets Management at Scale

Throughout this course, you have stored secrets in `.env` files: database passwords, Redis URLs, API keys, Django's `SECRET_KEY`. For local development, this is fine. For production, it is a ticking time bomb.

Here is what goes wrong with `.env` files in production:

- Someone commits the `.env` file to Git by accident. Now your database password is in the commit history forever (even if you delete it in the next commit).
- You need to rotate a database password. You SSH into every server, edit the file, and restart the service. You miss one server. That server starts throwing 500 errors at 2 AM.
- A contractor leaves the team. They have a copy of every secret in their local `.env` file. You have no way to revoke access to individual secrets.
- You have staging and production environments. Each has different secrets. You deploy to production with staging secrets because someone copied the wrong file.

Secrets management tools solve these problems. They provide a centralized, access-controlled, auditable store for sensitive configuration. Your application fetches secrets at runtime instead of reading them from a file on disk.

This lesson covers why `.env` files fail in production, introduces three secrets management tools, shows how to rotate secrets without downtime, and demonstrates how to integrate secrets management with Django settings and Terraform.

---

## Why .env Files Don't Work in Production

### The Risks

**Accidental exposure.** `.env` files are plain text. One bad `.gitignore` rule, one careless `docker cp`, one debug log that prints `os.environ`, and your secrets are exposed. In 2023, multiple high-profile breaches were traced to secrets accidentally committed to public repositories.

**No access control.** Everyone who can read the file has access to every secret in it. You cannot give a developer access to the staging database password without also giving them the production Stripe key.

**No audit trail.** Who changed the database password last month? When? Why? With `.env` files, you have no way to answer these questions.

**No rotation mechanism.** Changing a secret means editing files on every server, restarting services, and hoping you did not miss one. This manual process is slow and error-prone, so teams avoid rotation. Secrets that never rotate are secrets waiting to be compromised.

**No versioning.** If you change a secret and the application breaks, you cannot easily roll back to the previous value.

### The Production Requirements

A production-grade secrets management system provides:

1. **Centralized storage**: One source of truth for all secrets.
2. **Access control**: Fine-grained permissions (who can read which secrets).
3. **Audit logging**: Every access and modification is recorded.
4. **Encryption at rest and in transit**: Secrets are never stored in plain text.
5. **Rotation support**: Change secrets without application downtime.
6. **Versioning**: Roll back to previous secret values if needed.
7. **API access**: Applications fetch secrets programmatically.

---

## Secrets Management Tools

### AWS Secrets Manager

AWS Secrets Manager is a fully managed service for storing and retrieving secrets. It integrates deeply with the AWS ecosystem (ECS, Lambda, RDS, etc.).

```python
# Fetching a secret from AWS Secrets Manager
import json
import boto3

def get_secret(secret_name: str, region: str = "us-east-1") -> dict:
    """Retrieve a secret from AWS Secrets Manager."""
    client = boto3.client("secretsmanager", region_name=region)
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response["SecretString"])

# Usage
db_secrets = get_secret("gather/production/database")
database_url = (
    f"postgres://{db_secrets['username']}:{db_secrets['password']}"
    f"@{db_secrets['host']}:5432/{db_secrets['dbname']}"
)
```

**Strengths**: Automatic rotation for RDS passwords, deep AWS integration, managed service (no infrastructure to maintain).

**Cost**: $0.40 per secret per month + $0.05 per 10,000 API calls. For a typical application with 10 to 20 secrets, this is about $8/month.

**Best for**: Teams already on AWS.

### HashiCorp Vault

Vault is an open-source secrets management tool from HashiCorp (the same company behind Terraform). You can self-host it or use HashiCorp Cloud Platform (HCP) Vault.

```python
# Fetching a secret from Vault
import hvac

client = hvac.Client(
    url="https://vault.example.com:8200",
    token="s.your-vault-token",
)

# Read a secret from the KV v2 engine
secret = client.secrets.kv.v2.read_secret_version(
    path="gather/database",
    mount_point="secret",
)

db_password = secret["data"]["data"]["password"]
```

**Strengths**: Open-source, multi-cloud, supports dynamic secrets (generates temporary credentials on demand), extensive auth methods (LDAP, GitHub, Kubernetes service accounts).

**Cost**: Free to self-host. HCP Vault starts at $0.03 per hour (~$22/month).

**Best for**: Multi-cloud environments, teams that want maximum control, organizations with strict compliance requirements.

### Doppler

Doppler is a modern secrets management platform designed for developer experience. It syncs secrets to your application, CI/CD pipelines, and cloud providers.

```bash
# Install the Doppler CLI
brew install dopplerhq/cli/doppler

# Login and configure
doppler login
doppler setup

# Run your application with secrets injected
doppler run -- python manage.py runserver

# Or fetch a specific secret
doppler secrets get DATABASE_URL --plain
```

With Doppler, you do not change your application code at all. Doppler injects secrets as environment variables when your application starts, just like a `.env` file but with centralized management, access control, and audit logging.

```bash
# Deploy with Doppler-injected secrets
doppler run --config production -- gunicorn gather.wsgi:application

# In Docker
docker run \
  -e DOPPLER_TOKEN="dp.st.production.xxxx" \
  gather-api:v1.2.3 \
  sh -c 'doppler run -- gunicorn gather.wsgi:application'
```

**Strengths**: Excellent developer experience, works with any language or framework, syncs to AWS, Vercel, Fly.io, and other platforms.

**Cost**: Free for up to 5 team members. Pro starts at $4/user/month.

**Best for**: Small to medium teams that want secrets management without infrastructure overhead.

### Comparison

| Feature | AWS Secrets Manager | Vault | Doppler |
|---------|-------------------|-------|---------|
| Hosting | Managed (AWS) | Self-hosted or managed | Managed |
| Multi-cloud | No | Yes | Yes |
| Dynamic secrets | RDS only | Yes (many backends) | No |
| Developer experience | AWS SDK | More complex | Excellent |
| CI/CD integration | AWS-native | Broad | Broad |
| Free tier | No | Self-hosted is free | 5 users free |
| Secret rotation | Built-in (RDS) | Built-in | Manual or webhook |

---

## Rotating Secrets Without Downtime

Secret rotation is the process of replacing a secret with a new value. The challenge is doing this without causing your application to crash during the transition.

### The Naive Approach (Causes Downtime)

```
1. Generate new database password
2. Update the password in PostgreSQL
3. Update the password in your application config
4. Restart the application
```

Between steps 2 and 4, your application has the old password and the database expects the new one. Every database query fails.

### The Zero-Downtime Approach

```
1. Generate new database password
2. Configure PostgreSQL to accept BOTH the old and new passwords
3. Update the secret in your secrets manager
4. Application instances gradually pick up the new secret
5. After all instances have the new secret, remove the old password from PostgreSQL
```

### Implementing Dual-Password Rotation for PostgreSQL

PostgreSQL does not natively support dual passwords, but you can achieve it with two database users:

```sql
-- Step 1: Create a second user with the same permissions
CREATE USER gather_rotate WITH PASSWORD 'new-secret-password';
GRANT ALL PRIVILEGES ON DATABASE gather TO gather_rotate;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gather_rotate;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gather_rotate;

-- Step 2: Update the application to use the new credentials
-- (Update the secret in your secrets manager)

-- Step 3: After all instances are using the new user, drop the old one
-- (Wait for all connections using the old user to close)
DROP USER gather_old;
```

### Application-Level Secret Refresh

For secrets that your application caches (like API keys), you need a mechanism to refresh without restarting:

```python
# gather/secrets.py
import time
import threading
from functools import lru_cache


class SecretCache:
    """Cache secrets with automatic refresh."""

    def __init__(self, fetch_fn, refresh_interval=300):
        self._fetch_fn = fetch_fn
        self._refresh_interval = refresh_interval
        self._cache = {}
        self._lock = threading.Lock()
        self._last_refresh = 0

    def get(self, key: str) -> str:
        """Get a secret, refreshing the cache if stale."""
        now = time.time()
        if now - self._last_refresh > self._refresh_interval:
            self._refresh()
        return self._cache.get(key)

    def _refresh(self):
        """Refresh all secrets from the source."""
        with self._lock:
            # Double-check after acquiring lock
            if time.time() - self._last_refresh <= self._refresh_interval:
                return
            try:
                self._cache = self._fetch_fn()
                self._last_refresh = time.time()
            except Exception as e:
                # Log the error but keep using cached values
                import logging
                logging.error(f"Failed to refresh secrets: {e}")


# Usage with Doppler
def fetch_from_doppler() -> dict:
    import subprocess
    import json

    result = subprocess.run(
        ["doppler", "secrets", "download", "--no-file", "--format", "json"],
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


secrets = SecretCache(fetch_from_doppler, refresh_interval=300)

# In settings.py
DATABASE_PASSWORD = secrets.get("DATABASE_PASSWORD")
```

The key principle: your application should gracefully handle secret changes. If a secret becomes invalid, the application logs an error and retries with a refreshed value rather than crashing immediately.

---

## Django Settings Pattern for Secrets

Here is a production Django settings pattern that supports multiple secrets sources:

```python
# gather/settings.py
import os
import json


def get_secret(key: str, default: str = None) -> str:
    """
    Retrieve a secret from the best available source.

    Priority:
    1. Environment variable (for local dev and CI)
    2. AWS Secrets Manager (if AWS_SECRETS_NAME is set)
    3. Doppler (if DOPPLER_TOKEN is set)
    4. Default value
    """
    # 1. Environment variable (always check first)
    value = os.environ.get(key)
    if value:
        return value

    # 2. AWS Secrets Manager
    aws_secret_name = os.environ.get("AWS_SECRETS_NAME")
    if aws_secret_name:
        return _get_aws_secret(aws_secret_name, key)

    # 3. Default
    if default is not None:
        return default

    raise ValueError(
        f"Secret '{key}' not found in environment variables or secrets manager. "
        f"Set the {key} environment variable or configure a secrets backend."
    )


def _get_aws_secret(secret_name: str, key: str) -> str:
    """Fetch a specific key from an AWS Secrets Manager secret."""
    import boto3

    # Cache the full secret to avoid repeated API calls
    if not hasattr(_get_aws_secret, "_cache"):
        client = boto3.client("secretsmanager")
        response = client.get_secret_value(SecretId=secret_name)
        _get_aws_secret._cache = json.loads(response["SecretString"])

    return _get_aws_secret._cache.get(key)


# ─── Usage in settings ─────────────────────────────────────

SECRET_KEY = get_secret("DJANGO_SECRET_KEY")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": get_secret("DB_HOST", "localhost"),
        "PORT": get_secret("DB_PORT", "5432"),
        "NAME": get_secret("DB_NAME", "gather"),
        "USER": get_secret("DB_USER", "gather"),
        "PASSWORD": get_secret("DB_PASSWORD"),
    }
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": get_secret("REDIS_URL", "redis://localhost:6379/0"),
    }
}

STRIPE_SECRET_KEY = get_secret("STRIPE_SECRET_KEY", "")
```

This pattern works everywhere:

- **Local development**: Secrets come from `.env` files (loaded by `django-environ` or `python-dotenv`).
- **CI/CD**: Secrets come from GitHub Actions secrets or pipeline variables.
- **Production with AWS**: Set `AWS_SECRETS_NAME=gather/production` and secrets come from Secrets Manager.
- **Production with Doppler**: Doppler injects secrets as environment variables. The code does not change.

---

## Terraform Integration

When you manage infrastructure with Terraform (Lesson 3), you also need to manage the secrets that infrastructure uses. Terraform can read from and write to secrets managers.

### Reading Secrets from AWS Secrets Manager in Terraform

```hcl
# Read the database password from Secrets Manager
data "aws_secretsmanager_secret_version" "db" {
  secret_id = "gather/production/database"
}

locals {
  db_secrets = jsondecode(data.aws_secretsmanager_secret_version.db.secret_string)
}

# Use the secret in a resource
resource "docker_container" "django" {
  name  = "gather-django"
  image = docker_image.django.image_id

  env = [
    "DATABASE_URL=postgres://${local.db_secrets["username"]}:${local.db_secrets["password"]}@db:5432/gather",
  ]
}
```

### Storing Secrets with Terraform

You can also create secrets as part of your infrastructure provisioning:

```hcl
# Generate a random password
resource "random_password" "db" {
  length  = 32
  special = true
}

# Store it in Secrets Manager
resource "aws_secretsmanager_secret" "db" {
  name = "gather/${var.environment}/database"
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = "gather"
    password = random_password.db.result
    host     = "db.example.com"
    port     = 5432
    dbname   = "gather"
  })
}
```

### Important: Secrets in Terraform State

There is a catch. Terraform stores secret values in its state file in plain text. If you use `random_password` or `aws_secretsmanager_secret_version`, the actual secret value is in `terraform.tfstate`.

This is why you must never commit state files to Git (Lesson 3). For team environments, use a remote backend with encryption:

```hcl
# Use S3 backend with encryption for state
terraform {
  backend "s3" {
    bucket         = "gather-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

---

## A Practical Migration Path

You do not need to adopt a full secrets management platform on day one. Here is a gradual migration path:

### Phase 1: Organized .env Files (Where You Are Now)

- Separate `.env` files per environment (`.env.development`, `.env.staging`, `.env.production`).
- `.env` files are in `.gitignore`.
- Secrets are documented in `.env.example` (without real values).

### Phase 2: CI/CD Secrets (Low Effort, High Impact)

- Move secrets out of `.env` files in CI/CD pipelines.
- Use GitHub Actions secrets, GitLab CI variables, or your CI platform's secrets store.
- Application still reads from environment variables, but the source is now managed.

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      DJANGO_SECRET_KEY: ${{ secrets.DJANGO_SECRET_KEY }}
      STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
```

### Phase 3: Doppler or Equivalent (Recommended)

- Centralize all secrets in Doppler (or your tool of choice).
- Inject secrets at runtime using the CLI or native integrations.
- Gain access control, audit logging, and environment management.
- Application code does not change (secrets are still environment variables).

### Phase 4: Dynamic Secrets (Advanced)

- Use Vault to generate temporary database credentials on demand.
- Credentials expire automatically, eliminating the need for manual rotation.
- This is typically only necessary for organizations with strict compliance requirements.

For Gather, Phase 3 (Doppler) gives you 90% of the benefits with minimal complexity. You can reach Phase 4 later if compliance or scale demands it.

---

## Key Takeaways

- `.env` files are acceptable for local development but dangerous in production. They lack access control, audit logging, rotation support, and encryption.
- Secrets management tools (AWS Secrets Manager, Vault, Doppler) provide centralized, access-controlled, auditable secret storage.
- Doppler offers the best developer experience for small to medium teams. AWS Secrets Manager integrates deeply with AWS. Vault provides maximum flexibility for multi-cloud environments.
- Rotate secrets by supporting both old and new values simultaneously. Never create a window where the application has an invalid secret.
- Use a Django settings pattern that reads from environment variables first, then falls back to a secrets manager. This works in every environment without code changes.
- Terraform can read from and write to secrets managers, but be aware that secret values end up in the state file. Always encrypt your state backend.

In the module project, you will put all of these lessons together: blue-green deploys, feature flags, Terraform staging, and proper configuration management.
