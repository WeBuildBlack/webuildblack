---
title: "Infrastructure as Code with Terraform"
estimatedMinutes: 45
---

# Infrastructure as Code with Terraform

Up to this point, you have been building your Gather infrastructure by hand. You ran `docker compose up`, manually configured nginx, and set environment variables by editing files. This works when you have one environment. But what happens when you need a staging environment that mirrors production? Or when a new team member joins and needs to set up everything from scratch?

Manual infrastructure setup is slow, error-prone, and undocumented. If your server dies and you need to recreate everything, can you? Do you remember every configuration change you made over the past six months?

Infrastructure as Code (IaC) solves this problem. You define your infrastructure in configuration files, version-control those files, and use a tool to create, update, and destroy resources automatically. The configuration files become the single source of truth for what your infrastructure looks like.

This lesson covers IaC principles, introduces Terraform (the most widely used IaC tool), and walks through HCL syntax, the plan/apply/destroy workflow, and state management. You will practice with the Docker provider so everything runs locally, no cloud account required.

---

## Why Infrastructure as Code

### The Manual Infrastructure Problem

Here is what happens without IaC:

1. You SSH into a server and install packages.
2. You edit config files by hand.
3. You forget to document one change.
4. Six months later, you need a second server. You try to replicate the first one from memory.
5. The second server behaves differently. You spend a day tracking down the discrepancy.
6. A teammate asks "what version of Redis are we running?" and you have to SSH in and check.

### IaC Principles

Infrastructure as Code follows four core principles:

**Declarative, not imperative.** You describe the desired end state ("I want three containers running this image"), not the steps to get there ("pull the image, create a network, start container 1, start container 2..."). The tool figures out the steps.

**Version-controlled.** Infrastructure definitions live in Git alongside your application code. You can see who changed what, when, and why. You can revert infrastructure changes the same way you revert code changes.

**Reproducible.** Running the same configuration produces the same infrastructure every time. No snowflake servers. No "it works on my machine" for infrastructure.

**Self-documenting.** The configuration files are the documentation. You do not need a separate wiki page describing your infrastructure. The code is the truth.

### IaC Tools Landscape

| Tool | Approach | Language | Managed By |
|------|----------|----------|------------|
| Terraform | Declarative, multi-cloud | HCL | HashiCorp |
| Pulumi | Declarative, multi-cloud | Python, TS, Go | Pulumi |
| AWS CloudFormation | Declarative, AWS only | YAML/JSON | AWS |
| Ansible | Imperative/procedural | YAML | Red Hat |
| Docker Compose | Declarative, containers only | YAML | Docker |

Docker Compose is actually IaC for containers. You have been using it throughout this course. Terraform extends the same idea to any infrastructure resource: servers, databases, DNS records, load balancers, monitoring dashboards, and yes, Docker containers.

---

## Terraform Fundamentals

### How Terraform Works

Terraform follows a three-step workflow:

```
1. Write    →    2. Plan    →    3. Apply
(HCL files)    (preview)      (execute)
```

1. **Write**: You define resources in `.tf` files using HashiCorp Configuration Language (HCL).
2. **Plan**: Terraform compares your configuration to the current state of the world and shows you what it will create, modify, or destroy.
3. **Apply**: Terraform executes the plan, making the actual changes.

This plan-before-apply workflow is one of Terraform's biggest strengths. You always see exactly what will happen before it happens.

### Installation

```bash
# macOS
brew install terraform

# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y gnupg software-properties-common
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | \
  sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
  https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt-get update && sudo apt-get install terraform

# Verify
terraform version
```

### Project Structure

A typical Terraform project looks like this:

```
terraform/
├── main.tf          # Primary resource definitions
├── variables.tf     # Input variable declarations
├── outputs.tf       # Output value declarations
├── providers.tf     # Provider configuration
├── terraform.tfvars # Variable values (do NOT commit secrets)
└── .gitignore       # Ignore .terraform/, *.tfstate, *.tfvars
```

---

## HCL Syntax

HCL (HashiCorp Configuration Language) is Terraform's domain-specific language. It is designed to be human-readable and machine-parseable.

### Providers

Providers are plugins that let Terraform interact with APIs. There are providers for AWS, GCP, Azure, Docker, Kubernetes, GitHub, Datadog, and hundreds of other services.

```hcl
# providers.tf
terraform {
  required_version = ">= 1.7"

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}
```

The `~> 3.0` version constraint means "any 3.x version but not 4.0 or higher." This protects you from breaking changes in provider updates.

### Resources

Resources are the core building block. Each resource represents one infrastructure object.

```hcl
# main.tf

# Pull the PostgreSQL image
resource "docker_image" "postgres" {
  name         = "postgres:16-alpine"
  keep_locally = true
}

# Create a Docker network
resource "docker_network" "gather" {
  name = "gather-network"
}

# Run a PostgreSQL container
resource "docker_container" "db" {
  name  = "gather-db"
  image = docker_image.postgres.image_id

  env = [
    "POSTGRES_DB=gather",
    "POSTGRES_USER=gather",
    "POSTGRES_PASSWORD=var.db_password",
  ]

  ports {
    internal = 5432
    external = 5432
  }

  networks_advanced {
    name = docker_network.gather.id
  }

  healthcheck {
    test     = ["CMD-SHELL", "pg_isready -U gather"]
    interval = "10s"
    timeout  = "5s"
    retries  = 3
  }
}
```

The syntax is `resource "type" "name"`. The type comes from the provider (`docker_container` means the Docker provider's container resource). The name is your local identifier, used to reference this resource elsewhere in your configuration.

### Variables

Variables make your configuration reusable and configurable:

```hcl
# variables.tf

variable "db_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true  # Hides value in plan output
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be 'staging' or 'production'."
  }
}

variable "django_replicas" {
  description = "Number of Django container replicas"
  type        = number
  default     = 2
}

variable "django_image_tag" {
  description = "Docker image tag for the Django app"
  type        = string
  default     = "latest"
}
```

Set variable values in `terraform.tfvars` (for local development) or via environment variables (for CI/CD):

```hcl
# terraform.tfvars (do NOT commit if it contains secrets)
db_password      = "local-dev-password"
environment      = "staging"
django_replicas  = 2
django_image_tag = "v1.2.3"
```

Or via environment variables:

```bash
export TF_VAR_db_password="from-env"
terraform plan
```

### Outputs

Outputs expose values after Terraform runs. They are useful for passing information between configurations or displaying important values:

```hcl
# outputs.tf

output "db_container_id" {
  description = "The Docker container ID of the PostgreSQL instance"
  value       = docker_container.db.id
}

output "app_url" {
  description = "URL to access the application"
  value       = "http://localhost:${docker_container.nginx.ports[0].external}"
}

output "network_id" {
  description = "The Docker network ID"
  value       = docker_network.gather.id
}
```

After `terraform apply`, outputs are displayed in the terminal. You can also query them with `terraform output`.

### References and Interpolation

Resources reference each other using the syntax `resource_type.resource_name.attribute`:

```hcl
resource "docker_container" "django" {
  name  = "gather-django-${var.environment}"
  image = docker_image.django.image_id  # Reference another resource

  env = [
    "DATABASE_URL=postgres://gather:${var.db_password}@${docker_container.db.name}:5432/gather",
    "ENVIRONMENT=${var.environment}",
  ]

  networks_advanced {
    name = docker_network.gather.id  # Reference the network
  }
}
```

Terraform automatically determines the dependency order from these references. It knows the database container must be created before the Django container because the Django container references the database container's name.

---

## The Plan/Apply/Destroy Workflow

### Initialize

Before using a Terraform configuration for the first time, you initialize it:

```bash
terraform init
```

This downloads the required providers and sets up the backend for state storage. You run `init` once, or again when you add new providers.

### Plan

The plan command shows you what Terraform will do without actually doing it:

```bash
terraform plan
```

```
Terraform will perform the following actions:

  # docker_network.gather will be created
  + resource "docker_network" "gather" {
      + id   = (known after apply)
      + name = "gather-network"
    }

  # docker_image.postgres will be created
  + resource "docker_image" "postgres" {
      + id          = (known after apply)
      + image_id    = (known after apply)
      + name        = "postgres:16-alpine"
      + keep_locally = true
    }

  # docker_container.db will be created
  + resource "docker_container" "db" {
      + name  = "gather-db"
      + image = (known after apply)
      ...
    }

Plan: 3 to add, 0 to change, 0 to destroy.
```

The `+` prefix means "will be created." You will also see `~` for "will be modified" and `-` for "will be destroyed." Always review the plan before applying.

### Apply

Apply executes the plan:

```bash
terraform apply
```

Terraform shows the plan again and asks for confirmation. Type `yes` to proceed. For automation (CI/CD), you can skip the prompt:

```bash
terraform plan -out=tfplan
terraform apply tfplan
```

This two-step approach ensures the apply uses the exact plan you reviewed.

### Destroy

Destroy removes all resources managed by the configuration:

```bash
terraform destroy
```

This is the inverse of `apply`. It shows you what it will destroy and asks for confirmation. Useful for tearing down staging environments when you are done testing.

### Making Changes

When you modify your configuration and run `plan` again, Terraform compares the new configuration to the current state and shows only the differences:

```bash
# Change django_replicas from 2 to 3, then:
terraform plan
```

```
  # docker_container.django[2] will be created
  + resource "docker_container" "django" {
      + name  = "gather-django-staging-3"
      ...
    }

Plan: 1 to add, 0 to change, 0 to destroy.
```

Terraform only creates the one new container. It does not touch the existing two.

---

## A Complete Example: Gather Staging with Docker Provider

Here is a full Terraform configuration that creates a staging environment for Gather using the Docker provider. Everything runs locally.

```hcl
# terraform/staging/main.tf

terraform {
  required_version = ">= 1.7"

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}

# ─── Variables ──────────────────────────────────────────────

variable "db_password" {
  type      = string
  sensitive = true
}

variable "django_image" {
  type    = string
  default = "gather-api:latest"
}

# ─── Network ───────────────────────────────────────────────

resource "docker_network" "staging" {
  name = "gather-staging"
}

# ─── Database ──────────────────────────────────────────────

resource "docker_image" "postgres" {
  name         = "postgres:16-alpine"
  keep_locally = true
}

resource "docker_volume" "db_data" {
  name = "gather-staging-db-data"
}

resource "docker_container" "db" {
  name  = "gather-staging-db"
  image = docker_image.postgres.image_id

  env = [
    "POSTGRES_DB=gather",
    "POSTGRES_USER=gather",
    "POSTGRES_PASSWORD=${var.db_password}",
  ]

  volumes {
    volume_name    = docker_volume.db_data.name
    container_path = "/var/lib/postgresql/data"
  }

  networks_advanced {
    name = docker_network.staging.id
  }

  healthcheck {
    test     = ["CMD-SHELL", "pg_isready -U gather"]
    interval = "10s"
    timeout  = "5s"
    retries  = 5
  }
}

# ─── Redis ─────────────────────────────────────────────────

resource "docker_image" "redis" {
  name         = "redis:7-alpine"
  keep_locally = true
}

resource "docker_container" "redis" {
  name  = "gather-staging-redis"
  image = docker_image.redis.image_id

  networks_advanced {
    name = docker_network.staging.id
  }

  healthcheck {
    test     = ["CMD", "redis-cli", "ping"]
    interval = "10s"
    timeout  = "3s"
    retries  = 3
  }
}

# ─── Django ────────────────────────────────────────────────

resource "docker_image" "django" {
  name         = var.django_image
  keep_locally = true
}

resource "docker_container" "django" {
  name  = "gather-staging-django"
  image = docker_image.django.image_id

  command = [
    "gunicorn", "gather.wsgi:application",
    "--bind", "0.0.0.0:8000",
    "--workers", "2",
  ]

  env = [
    "DATABASE_URL=postgres://gather:${var.db_password}@gather-staging-db:5432/gather",
    "REDIS_URL=redis://gather-staging-redis:6379/0",
    "DJANGO_SETTINGS_MODULE=gather.settings",
    "ENVIRONMENT=staging",
  ]

  networks_advanced {
    name = docker_network.staging.id
  }

  healthcheck {
    test     = ["CMD", "curl", "-f", "http://localhost:8000/health/"]
    interval = "15s"
    timeout  = "5s"
    retries  = 3
  }

  depends_on = [
    docker_container.db,
    docker_container.redis,
  ]
}

# ─── nginx ─────────────────────────────────────────────────

resource "docker_image" "nginx" {
  name         = "nginx:1.25-alpine"
  keep_locally = true
}

resource "docker_container" "nginx" {
  name  = "gather-staging-nginx"
  image = docker_image.nginx.image_id

  ports {
    internal = 80
    external = 8080
  }

  upload {
    content = <<-EOT
      upstream django {
        server gather-staging-django:8000;
      }
      server {
        listen 80;
        location / {
          proxy_pass http://django;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
        }
      }
    EOT
    file    = "/etc/nginx/conf.d/default.conf"
  }

  networks_advanced {
    name = docker_network.staging.id
  }

  depends_on = [
    docker_container.django,
  ]
}

# ─── Outputs ───────────────────────────────────────────────

output "staging_url" {
  value = "http://localhost:${docker_container.nginx.ports[0].external}"
}

output "db_container" {
  value = docker_container.db.name
}
```

Running this configuration:

```bash
cd terraform/staging

terraform init
terraform plan -var="db_password=staging-secret"
terraform apply -var="db_password=staging-secret"

# Access the staging app
curl http://localhost:8080/health/

# Tear down when done
terraform destroy -var="db_password=staging-secret"
```

Every time you run `apply`, you get the exact same staging environment. New team member? `terraform apply`. Need a fresh staging environment for a QA cycle? `terraform destroy` then `terraform apply`. It takes 30 seconds instead of 30 minutes.

---

## State Management

Terraform tracks the resources it manages in a **state file** (`terraform.tfstate`). This file maps your configuration to real-world resources. Without it, Terraform would not know which Docker containers it created and which ones were created manually.

### What State Contains

```json
{
  "version": 4,
  "resources": [
    {
      "type": "docker_container",
      "name": "db",
      "instances": [
        {
          "attributes": {
            "id": "abc123def456",
            "name": "gather-staging-db",
            "image": "sha256:...",
            "...": "..."
          }
        }
      ]
    }
  ]
}
```

### State Rules

1. **Never edit the state file by hand.** Use `terraform state` commands if you need to manipulate state.
2. **Never commit state files to Git.** They may contain sensitive values (passwords, API keys) and they cause merge conflicts.
3. **Use remote state for team environments.** For solo or local development, local state is fine. For team projects, store state in a remote backend (S3, Terraform Cloud, etc.).

### The .gitignore for Terraform

```gitignore
# .gitignore
.terraform/
*.tfstate
*.tfstate.backup
*.tfvars
crash.log
```

### Common State Commands

```bash
# List all resources in state
terraform state list

# Show details of a specific resource
terraform state show docker_container.db

# Remove a resource from state (without destroying it)
terraform state rm docker_container.db

# Import an existing resource into state
terraform import docker_container.db abc123def456
```

The `import` command is particularly useful when you have existing infrastructure that you want to start managing with Terraform. You create the resource block in your configuration, then import the real resource into state, and Terraform takes over management from that point.

---

## Terraform vs. Docker Compose

You might be wondering: if Docker Compose already defines my containers, why do I need Terraform?

For local development, Docker Compose is the right tool. It is simpler, faster, and purpose-built for multi-container applications.

Terraform becomes valuable when you need to manage infrastructure beyond containers:

| Concern | Docker Compose | Terraform |
|---------|---------------|-----------|
| Local dev containers | Yes | Overkill |
| Staging environment | Works | Better (reproducible, teardown) |
| Cloud resources (RDS, S3, etc.) | No | Yes |
| DNS records | No | Yes |
| Multiple environments | Manual duplication | Variables + workspaces |
| State tracking | No | Yes |
| Drift detection | No | Yes (`terraform plan`) |

In the module project, you will use Terraform with the Docker provider to create a staging environment. This gives you hands-on Terraform experience without needing a cloud account. The concepts (providers, resources, variables, state) transfer directly to cloud providers when you are ready.

---

## Key Takeaways

- Infrastructure as Code makes your infrastructure declarative, version-controlled, reproducible, and self-documenting.
- Terraform uses HCL to define resources and follows a plan/apply/destroy workflow. You always see what will change before it changes.
- Providers connect Terraform to APIs (Docker, AWS, GCP, etc.). Resources represent individual infrastructure objects.
- Variables make configurations reusable. Outputs expose values after apply. References create implicit dependencies.
- State tracks the mapping between your configuration and real-world resources. Never edit it by hand. Never commit it to Git.
- The Docker provider lets you practice Terraform locally before moving to cloud providers.

Next, you will learn about container orchestration concepts and when (and when not) to reach for Kubernetes.
