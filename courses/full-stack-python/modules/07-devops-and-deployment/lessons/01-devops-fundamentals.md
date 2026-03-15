---
title: "DevOps Fundamentals"
estimatedMinutes: 30
---

# DevOps Fundamentals

You've spent six modules building Gather from both sides. The Next.js frontend renders event pages, handles authentication, and manages client state. The Django backend exposes a REST API with models, serializers, permissions, and tests. Both services work on your machine. The question now is: how do you get them working on everyone else's machine, and eventually on a server that serves real users?

That question is the heart of DevOps.

---

## The Problem DevOps Solves

Picture this scenario. You've been developing Gather locally for weeks. Your teammate clones the repo, runs the setup steps, and immediately hits errors. They're on a different operating system. Their Python version is 3.10 instead of 3.12. They don't have PostgreSQL installed. Their Node version doesn't match yours. They spend half a day just getting the project to run.

Now imagine the deployment side. You finish a feature, push it to GitHub, and manually SSH into a server to pull the latest code. You restart the services by hand. You forget to run migrations. The site goes down for 20 minutes while you debug. A week later, someone else deploys a different feature and accidentally overwrites your environment variables.

These are not hypothetical problems. They are the daily reality of teams that haven't adopted DevOps practices. The "works on my machine" problem and the "deployment is scary" problem are two sides of the same coin, and DevOps is the discipline that addresses both.

---

## What DevOps Actually Means

DevOps is a combination of "Development" and "Operations." Historically, these were separate teams with conflicting goals. Developers wanted to ship features fast. Operations teams wanted to keep systems stable. Developers would throw code over the wall to Ops, who would deploy it and deal with the consequences. When things broke, each side blamed the other.

DevOps breaks down that wall. Instead of two separate teams with separate priorities, you get a shared responsibility model. The people who write the code are also responsible for how it runs in production. This does not mean every developer becomes a systems administrator. It means the team collectively owns the entire lifecycle of the software, from writing the first line of code to monitoring it in production.

The core DevOps loop looks like this:

```
Code → Build → Test → Deploy → Monitor → Feedback → Code
```

Each stage feeds into the next. You write code. You build it into a deployable artifact (a Docker image, a bundled application). You run automated tests to catch bugs before they reach users. You deploy to a server. You monitor the application for errors and performance issues. You collect feedback (error reports, user behavior, performance metrics) and feed it back into the next round of development.

The goal is to make this loop as fast and reliable as possible. A team practicing DevOps well can deploy multiple times per day with confidence, because every step is automated and validated.

---

## Environments: Dev, Staging, Production

One of the first DevOps concepts you need to internalize is environment management. Your code runs in different environments at different stages of its lifecycle.

**Development (local)** is your laptop. This is where you write code, run tests, and experiment. You might use SQLite instead of PostgreSQL, skip SSL, and use debug mode. The priority here is fast iteration.

**Staging** is a server that mirrors production as closely as possible. It uses the same database engine, the same environment variables (with different values), and the same deployment process. Staging exists so you can catch environment-specific bugs before they reach real users. If something works locally but breaks in staging, you've found a problem that would have broken production.

**Production** is the live environment that real users interact with. This is where reliability matters most. You never experiment in production. You never deploy untested code to production. Every change to production should go through the full DevOps loop.

For Gather, that means three distinct configurations:

| Concern | Development | Staging | Production |
|---|---|---|---|
| Database | SQLite or local Postgres | Hosted Postgres | Hosted Postgres |
| Debug mode | On | Off | Off |
| Domain | localhost | staging.gather.app | gather.app |
| SSL | No | Yes | Yes |
| Error detail | Full tracebacks | Sentry only | Sentry only |
| Data | Seed data | Copy of prod (anonymized) | Real user data |

You already did some of this in Module 06 when you used `python-decouple` to read settings from environment variables. That pattern (configuration from the environment, not from code) is a DevOps fundamental. It means the same codebase can run in any environment just by changing the variables.

---

## Infrastructure as Code

In the old days, setting up a server meant logging in, manually installing packages, editing configuration files, and hoping you remembered every step. If the server died, you had to do it all over again. If you needed a second server, you had to repeat the process and pray you didn't miss anything.

Infrastructure as Code (IaC) replaces that manual process with configuration files that describe your infrastructure. Instead of "SSH in and install nginx," you write a file that says "I need an nginx server with these settings." A tool reads that file and creates the infrastructure for you. If the server dies, you run the tool again and get an identical replacement.

You will see IaC at multiple levels in this module:

- **Dockerfiles** describe how to build a container image (what base OS, what packages to install, what commands to run)
- **docker-compose.yml** describes how multiple containers work together (what services exist, how they connect, what ports they expose)
- **GitHub Actions workflows** describe how to build, test, and deploy your code (what steps to run, in what order, on what triggers)

Each of these is a plain text file checked into version control. That means your infrastructure is versioned, reviewable, and reproducible. If someone asks "how do we deploy this?" the answer is in the repo, not in someone's head.

---

## The Gather Deployment Challenge

Here is what makes deploying Gather more complex than a single-service application. You have two separate services that need to work together.

The **Next.js frontend** runs on Node.js, serves React pages, and makes API calls to the Django backend. It needs Node 20, npm packages, and environment variables pointing to the backend URL.

The **Django backend** runs on Python, serves the REST API, and connects to a PostgreSQL database. It needs Python 3.12, pip packages, a running Postgres instance, and environment variables for the database URL and secret key.

The **PostgreSQL database** stores all the application data. It needs persistent storage so data survives restarts.

In development, you might run these three things in three separate terminal tabs. That works for one developer, but it does not scale. What happens when a new contributor joins? What happens when you need to deploy to a server? What happens when you need to run the full stack in CI to test the integration between frontend and backend?

Containers solve this problem. In the next lesson, you will package each service into a Docker container, and then use Docker Compose to run the entire stack with a single command. But first, it is worth understanding that containers are a tool, not a philosophy. The philosophy is DevOps. The tools (Docker, GitHub Actions, Vercel, Railway, Sentry) are how you implement it.

---

## DevOps Culture vs. Tools

It is tempting to think that adopting DevOps means installing Docker and setting up a CI pipeline. Those are important, but they are not the whole picture. DevOps is fundamentally a cultural shift.

**Automation over manual processes.** If you do something more than twice, automate it. Deployments, testing, environment setup, database migrations. Automation removes human error and frees up time for creative work.

**Shared ownership.** The person who writes a feature should care about how it performs in production. The person who monitors production should have input on how features are built. Everyone owns the outcome.

**Fast feedback loops.** If a test fails, you should know within minutes, not days. If production has an error, you should see it in seconds, not when a user complains. Short feedback loops mean faster fixes and higher quality.

**Blame-free postmortems.** When something breaks (and it will), the goal is to understand what happened and how to prevent it, not to find someone to blame. A culture of blame creates a culture of hiding problems. A culture of learning creates a culture of resilience.

**Small, frequent deployments.** Deploying a week's worth of changes is risky because there are many things that could go wrong. Deploying a single small change is low risk because if something breaks, you know exactly what caused it. DevOps teams aim for many small deployments rather than a few large ones.

These principles will guide everything you do in this module. When you write a Dockerfile, you are automating environment setup. When you create a CI pipeline, you are shortening the feedback loop. When you set up monitoring, you are taking ownership of production. When you configure preview deployments, you are enabling small, frequent releases.

---

## Key Takeaways

1. DevOps bridges the gap between writing code and running it reliably in production, combining development and operations into a shared responsibility.
2. The DevOps loop (code, build, test, deploy, monitor, feedback) should be as automated and fast as possible.
3. Environment management (development, staging, production) ensures code is tested in realistic conditions before reaching users.
4. Infrastructure as Code means describing your servers, containers, and pipelines in version-controlled files rather than manual setup.
5. The "works on my machine" problem is solved by containers, which package your application with all its dependencies into a portable unit.
6. Deploying Gather requires coordinating two services (Next.js and Django) plus a database, making DevOps practices especially valuable.
7. DevOps is a culture of automation, shared ownership, and fast feedback. The tools are important, but the mindset is what makes them effective.

## Try It Yourself

Take a look at the Gather project as it stands after Module 06. List every manual step required to get both the frontend and backend running from a fresh clone. Include installing dependencies, setting up the database, creating environment files, running migrations, and starting each service. Count the steps. Then think about which of those steps could be automated with a single command. In the next lesson, you will do exactly that with Docker.
