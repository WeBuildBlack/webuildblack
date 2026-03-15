---
title: "Container Orchestration Concepts"
estimatedMinutes: 35
---

# Container Orchestration Concepts

You have been running Gather with Docker Compose throughout this course. It works well: you define your services in a YAML file, run `docker compose up`, and everything starts. For local development and small deployments, Docker Compose is excellent.

But Docker Compose has limits. It runs on a single host. If that host dies, your entire application goes down. It does not automatically restart failed containers (unless you configure restart policies). It does not distribute containers across multiple machines. It does not handle rolling updates natively.

Container orchestration tools solve these problems. They manage containers across multiple hosts, handle failures automatically, and provide features like rolling updates, service discovery, and load balancing out of the box.

This lesson covers the core concepts of container orchestration, gives you a high-level understanding of Kubernetes, explains why you probably do not need it yet, and introduces simpler alternatives that give you production-grade reliability without the complexity.

---

## What Container Orchestration Does

At its core, an orchestrator answers four questions:

1. **Where should this container run?** The orchestrator picks a host with enough CPU and memory.
2. **What happens when a container dies?** The orchestrator detects the failure and starts a replacement.
3. **How do I update without downtime?** The orchestrator rolls out new versions incrementally.
4. **How do containers find each other?** The orchestrator provides service discovery and internal DNS.

### Docker Compose vs. Orchestration

| Capability | Docker Compose | Orchestrator |
|-----------|---------------|--------------|
| Define services declaratively | Yes | Yes |
| Run on a single host | Yes | Yes |
| Run across multiple hosts | No | Yes |
| Auto-restart failed containers | With `restart: always` | Built-in |
| Rolling updates | No (stops all, starts all) | Built-in |
| Service discovery | Docker DNS (single host) | Cluster-wide DNS |
| Load balancing | No (need nginx) | Built-in |
| Auto-scaling | No | Built-in |
| Resource limits enforcement | Basic | Advanced |

---

## Kubernetes: The 10,000-Foot View

Kubernetes (K8s) is the industry-standard container orchestrator. Developed by Google and now maintained by the Cloud Native Computing Foundation, it runs a massive percentage of production containerized workloads worldwide.

### Core Concepts

Kubernetes organizes containers into several layers of abstraction:

```
Cluster
└── Nodes (physical or virtual machines)
    └── Pods (smallest deployable unit, one or more containers)
        └── Containers (your actual application)
```

**Pod**: One or more containers that share networking and storage. Usually, a pod runs a single container. Your Django app would be one pod. Your Celery worker would be another pod.

**Deployment**: Declares how many replicas of a pod should run and handles rolling updates. You say "I want 3 replicas of my Django pod," and the Deployment controller makes it so.

**Service**: Provides a stable network endpoint for a set of pods. Pods are ephemeral (they come and go), but a Service gives them a permanent address that other pods can use.

**Ingress**: Routes external HTTP traffic to Services. It is the Kubernetes equivalent of your nginx reverse proxy configuration.

### What a Kubernetes Manifest Looks Like

```yaml
# k8s/django-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gather-django
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gather
      component: django
  template:
    metadata:
      labels:
        app: gather
        component: django
    spec:
      containers:
        - name: django
          image: gather-api:v1.2.3
          ports:
            - containerPort: 8000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: gather-secrets
                  key: database-url
          readinessProbe:
            httpGet:
              path: /health/
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health/
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 10
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: gather-django
spec:
  selector:
    app: gather
    component: django
  ports:
    - port: 80
      targetPort: 8000
  type: ClusterIP
```

This manifest declares: "Run 3 replicas of the Django container. Each one needs at least 256Mi of memory and 250m of CPU. Expose them internally on port 80. Check their health every 5 seconds."

### What Kubernetes Gives You

- **Self-healing**: If a pod crashes, Kubernetes restarts it. If a node dies, Kubernetes moves the pods to a healthy node.
- **Rolling updates**: Update pods one at a time with automatic rollback if health checks fail.
- **Service discovery**: Every Service gets a DNS name. `gather-django.default.svc.cluster.local` always resolves to the healthy Django pods.
- **Horizontal auto-scaling**: Automatically add or remove replicas based on CPU, memory, or custom metrics.
- **Secret management**: Store secrets in the cluster and inject them as environment variables or files.
- **Resource quotas**: Prevent one service from consuming all the cluster's resources.

---

## Why You Probably Don't Need Kubernetes Yet

Kubernetes is powerful, but it comes with significant operational complexity. Here is what running Kubernetes actually involves:

### The Operational Cost

**Cluster management**: Even with managed Kubernetes (EKS, GKE, AKS), you manage node pools, upgrades, networking plugins, storage drivers, and RBAC policies.

**YAML everywhere**: A simple application requires Deployments, Services, ConfigMaps, Secrets, Ingress, PersistentVolumeClaims, NetworkPolicies, and more. A moderately complex application can easily have 20 to 30 YAML files.

**Debugging complexity**: When something goes wrong, you troubleshoot across multiple layers. Is the pod running? Is the container healthy? Is the Service selector correct? Is the Ingress configured properly? Is the DNS resolving? Is the network policy blocking traffic?

**Learning curve**: Kubernetes has a steep learning curve. It takes months to become proficient and years to become an expert. That time investment only pays off at a certain scale.

### The Scale Question

Ask yourself these questions:

- Do you have more than 5 to 10 services?
- Do you need to run on multiple machines for redundancy?
- Do you need auto-scaling that responds to traffic in seconds?
- Do you have a dedicated platform or DevOps team?

If you answered "no" to most of these, you probably do not need Kubernetes. For Gather at its current scale (Django API, Celery workers, PostgreSQL, Redis, nginx), simpler alternatives will serve you well.

### The Right Time for Kubernetes

Kubernetes makes sense when:

- You have many services (10+) that need to communicate.
- You need multi-region deployments.
- You have a team large enough to dedicate people to platform engineering.
- Your traffic patterns are spiky and you need rapid auto-scaling.
- You are already on a managed Kubernetes service and your team has experience.

The key insight: Kubernetes solves organizational problems as much as technical ones. It standardizes how teams deploy, monitor, and manage services. For a single team running a single application, that standardization is overhead, not value.

---

## Simpler Alternatives

Here are options that give you most of Kubernetes' benefits with a fraction of the complexity.

### Docker Swarm

Docker Swarm is Docker's built-in orchestrator. If you know Docker Compose, you already know 80% of Swarm.

```bash
# Initialize a Swarm cluster (single node for now)
docker swarm init

# Deploy your Compose file as a Swarm stack
docker stack deploy -c docker-compose.yml gather
```

Swarm adds to Docker Compose:

- Rolling updates (as you saw in Lesson 1).
- Multi-node clusters (add more machines with `docker swarm join`).
- Built-in load balancing across replicas.
- Service discovery across the cluster.
- Secret management with `docker secret`.

```yaml
# docker-compose.swarm.yml
services:
  django:
    image: gather-api:v1.2.3
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 30s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/"]
      interval: 10s
      timeout: 5s
      retries: 3
```

**When to use Swarm**: You are already using Docker Compose and you want orchestration without learning a new tool. You have 1 to 5 nodes. Your team is small.

**Limitation**: Docker has deprioritized Swarm development in favor of Kubernetes integration. The ecosystem is smaller and the future is uncertain.

### Railway

Railway is a platform-as-a-service (PaaS) that deploys directly from your Git repository or Dockerfile.

```bash
# Deploy from the current directory
railway up

# Or link to a GitHub repo for automatic deploys
railway link
```

Railway handles:

- Automatic builds from Dockerfile or buildpacks.
- SSL certificates.
- Custom domains.
- PostgreSQL and Redis as managed services.
- Environment variables through a web dashboard.
- Automatic restarts on failure.

**When to use Railway**: You want zero infrastructure management. You are a solo developer or small team. Your app fits within Railway's pricing model.

**Limitation**: Less control over networking, resource allocation, and runtime environment. Costs can grow quickly with traffic.

### Fly.io

Fly.io runs Docker containers on lightweight VMs (Firecracker) at edge locations worldwide.

```bash
# Create a Fly app from your Dockerfile
fly launch

# Deploy a new version
fly deploy

# Scale to 3 instances across regions
fly scale count 3
fly regions add ord iad lhr
```

Fly.io provides:

- Multi-region deployments with a single command.
- Built-in load balancing and TLS.
- Rolling and blue-green deploys.
- Persistent volumes for databases.
- Private networking between services.

```toml
# fly.toml
app = "gather-api"
primary_region = "ewr"

[build]
  dockerfile = "backend/Dockerfile"

[http_service]
  internal_port = 8000
  force_https = true

  [[http_service.checks]]
    interval = "15s"
    timeout = "5s"
    path = "/health/"
    method = "GET"
```

**When to use Fly.io**: You want multi-region without the complexity of Kubernetes. You want a PaaS that still gives you Docker-level control.

**Limitation**: Smaller ecosystem than AWS/GCP. Debugging can be harder than local Docker.

### AWS ECS (Elastic Container Service)

ECS is AWS's managed container orchestration service. It is simpler than Kubernetes but deeply integrated with the AWS ecosystem.

```json
{
  "family": "gather-django",
  "containerDefinitions": [
    {
      "name": "django",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/gather-api:v1.2.3",
      "portMappings": [{"containerPort": 8000}],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/health/ || exit 1"],
        "interval": 15,
        "timeout": 5,
        "retries": 3
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/gather",
          "awslogs-region": "us-east-1"
        }
      }
    }
  ]
}
```

**When to use ECS**: You are already on AWS. You want orchestration integrated with ALB, RDS, ElastiCache, CloudWatch, and other AWS services. Your team knows AWS but not Kubernetes.

**Limitation**: AWS vendor lock-in. ECS concepts do not transfer to other clouds.

---

## Health Checks and Readiness Probes

Regardless of which orchestration tool you use, health checks are the foundation of automatic recovery. Every orchestrator uses health checks to decide whether a container is working and whether it should receive traffic.

### Types of Health Checks

**Liveness probes** answer: "Is the process alive?" If a liveness probe fails, the orchestrator kills the container and starts a new one. Use this to detect deadlocks, infinite loops, and other states where the process is running but not functioning.

**Readiness probes** answer: "Can this container handle traffic?" If a readiness probe fails, the orchestrator stops sending traffic to the container but does not kill it. Use this for startup delays (waiting for database connections, warming caches) and temporary unavailability.

```python
# events/views.py

from django.db import connection
from django.core.cache import cache
from django.http import JsonResponse


def health_check(request):
    """Liveness probe: is the process running and responsive?"""
    return JsonResponse({"status": "ok"})


def readiness_check(request):
    """Readiness probe: can this instance handle requests?"""
    checks = {}

    # Check database connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {str(e)}"
        return JsonResponse(
            {"status": "not ready", "checks": checks}, status=503
        )

    # Check Redis connection
    try:
        cache.set("readiness_check", "1", timeout=5)
        cache.get("readiness_check")
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {str(e)}"
        return JsonResponse(
            {"status": "not ready", "checks": checks}, status=503
        )

    return JsonResponse({"status": "ready", "checks": checks})
```

```python
# gather/urls.py
urlpatterns = [
    path("health/", health_check, name="health"),
    path("ready/", readiness_check, name="readiness"),
    # ...
]
```

### Health Check Configuration

The timing parameters matter. Set them wrong and you get false positives (healthy containers marked as failed) or slow recovery (failed containers keep receiving traffic).

```yaml
# Docker Compose / Swarm health check
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health/"]
  interval: 10s      # How often to check
  timeout: 5s        # How long to wait for a response
  retries: 3         # How many failures before marking unhealthy
  start_period: 30s  # Grace period for container startup
```

**interval**: Too short and you waste resources on health checks. Too long and failed containers serve errors for longer. 10 to 15 seconds is a reasonable default.

**timeout**: Should be shorter than the interval. If your health check takes more than 5 seconds, something is already wrong.

**retries**: Prevents a single timeout from killing a container. Three retries means the container gets 30 seconds (3 intervals) to recover from a transient issue.

**start_period**: Critical for applications that take time to start. Django needs to connect to the database, run any startup code, and load application code. A 30-second start period prevents the orchestrator from killing containers that are still booting.

### Health Check Best Practices

1. **Keep health checks fast.** A health check that queries the database is fine. A health check that runs a full test suite is not.
2. **Separate liveness from readiness.** Liveness checks if the process is alive. Readiness checks if it can serve traffic. Different failure modes, different responses.
3. **Do not check external services in liveness probes.** If your health check fails because a third-party API is down, the orchestrator restarts your container. That does not fix the third-party API. Check external dependencies in readiness probes only.
4. **Log health check failures.** When a container is marked unhealthy, you want to know why. Log the failure reason in the health check endpoint.

---

## Choosing the Right Level of Orchestration

Here is a decision framework:

```
Solo developer, single server, < 1000 users
  → Docker Compose + restart policies + health checks

Small team, moderate traffic, need zero-downtime deploys
  → Docker Swarm or Fly.io or Railway

Growing team, AWS ecosystem, multiple services
  → AWS ECS

Large team, many services, multi-cloud or multi-region
  → Kubernetes
```

For Gather at this stage in the course, Docker Compose with blue-green deploys (Lesson 1) and health checks gives you zero-downtime deployments, automatic recovery, and a simple mental model. That is enough for a long time.

The concepts you have learned here (pods, replicas, health checks, readiness probes, rolling updates, service discovery) transfer to any orchestrator. When you outgrow Docker Compose, you will already understand what the more powerful tools are doing under the hood.

---

## Key Takeaways

- Container orchestration manages containers across hosts with automatic recovery, rolling updates, and service discovery.
- Kubernetes is the industry standard but carries significant operational complexity. Most small-to-medium applications do not need it.
- Simpler alternatives (Docker Swarm, Railway, Fly.io, AWS ECS) provide production-grade orchestration with less overhead.
- Health checks are the foundation of automatic recovery. Separate liveness (is it alive?) from readiness (can it serve traffic?).
- Health check timing (interval, timeout, retries, start period) directly affects how quickly your system detects and recovers from failures.
- Choose the simplest orchestration that meets your needs. You can always move up when you outgrow it.

Next, you will learn how to manage secrets at scale, because `.env` files do not survive production.
