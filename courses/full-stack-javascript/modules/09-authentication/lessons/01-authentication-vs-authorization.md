---
title: "Authentication vs Authorization"
estimatedMinutes: 30
---

# Authentication vs Authorization

Security is one of those topics developers often treat as an afterthought. You build the feature, it works, and then security becomes "something to add later." That approach has caused some of the most damaging data breaches in history. This module puts security at the center from the start.

Before writing a single line of auth code, you need to understand two concepts that are frequently confused: authentication and authorization. They sound similar, they work together, and mixing them up leads to real vulnerabilities.

---

## Authentication: Who Are You?

Authentication is the process of verifying identity. When a user submits a username and password, your server is asking: "Can you prove you are who you claim to be?"

Authentication answers the question: **who are you?**

A successful authentication produces a verified identity. From that point forward, your application knows which user is making requests. Common authentication factors include:

- Something you **know** (password, PIN, security question)
- Something you **have** (phone for SMS code, hardware key, authenticator app)
- Something you **are** (fingerprint, face ID)

Most web apps rely on "something you know" (passwords), sometimes combined with "something you have" (2FA). The combination is called multi-factor authentication (MFA).

When authentication fails, the correct HTTP response is **401 Unauthorized**. Despite the name, 401 means "you are not authenticated." The naming is a historical quirk in the HTTP spec.

---

## Authorization: What Can You Do?

Authorization is the process of determining what an authenticated user is allowed to do. Once your app knows who someone is, it still needs to decide what they can access.

Authorization answers the question: **what are you allowed to do?**

Consider a blog application. All of these users might be authenticated (logged in), but they have different permissions:

- A **reader** can view posts
- An **author** can create and edit their own posts
- An **editor** can edit any post
- An **admin** can delete posts and manage users

Authorization rules determine which of those actions each user can take. When authorization fails (authenticated user tries to do something they are not allowed to), the correct HTTP response is **403 Forbidden**.

```
401 Unauthorized  →  Not logged in (authentication failed)
403 Forbidden     →  Logged in, but not allowed (authorization failed)
```

This distinction matters practically. If you return a 403 when someone is not logged in, your frontend cannot tell the difference between "wrong credentials" and "you do not have permission." Handle them separately.

---

## The Flow Together

Here is how authentication and authorization work together in a typical request:

```
1. User submits credentials (email + password)
2. Server verifies credentials → Authentication
3. Server creates a session or token representing the verified identity
4. User makes a request to a protected resource
5. Server checks: is this user authenticated? → If not, 401
6. Server checks: is this user authorized for this resource? → If not, 403
7. Server fulfills the request
```

Think of it like an office building. The front desk checks your ID (authentication) and gives you a badge. The badge lets you into the lobby and common areas. But when you try to enter the server room, the door reader checks your badge permissions (authorization). A valid badge does not automatically mean access everywhere.

---

## Common Authentication Patterns

Modern web applications use several different approaches to authentication. You will see all of these in production systems.

### Session-Based Authentication

The server creates a session after login, stores it server-side (in memory, Redis, or a database), and sends a session ID to the client via a cookie. On every subsequent request, the browser automatically sends the cookie, and the server looks up the session.

```
Client                          Server
  |                               |
  |-- POST /login (credentials) ->|
  |                               | Verify credentials
  |                               | Create session in store
  |<-- Set-Cookie: sessionId=abc -|
  |                               |
  |-- GET /dashboard (cookie) --->|
  |                               | Look up session by ID
  |                               | Attach user to request
  |<-- 200 Dashboard data --------|
```

Sessions are stateful: the server maintains state. This makes logout straightforward (delete the session), but it adds complexity when scaling horizontally across multiple servers (they all need access to the same session store).

### JWT (JSON Web Token) Authentication

The server creates a signed token containing the user's identity after login and sends it to the client. The client stores the token (in a cookie or memory) and includes it in subsequent requests. The server verifies the token's signature without looking anything up.

```
Client                          Server
  |                               |
  |-- POST /login (credentials) ->|
  |                               | Verify credentials
  |                               | Sign JWT with secret key
  |<-- { token: "eyJ..." } -------|
  |                               |
  |-- GET /dashboard             |
  |   Authorization: Bearer eyJ ->|
  |                               | Verify JWT signature
  |                               | Decode user from token
  |<-- 200 Dashboard data --------|
```

JWTs are stateless: the server does not store anything. This scales well but makes logout harder. You cannot "invalidate" a JWT without maintaining a blocklist, which partially defeats the stateless benefit.

### OAuth / Social Login

OAuth is a protocol for delegating authentication to a third party (Google, GitHub, Slack). The user authenticates with the third party, which gives your app a token confirming the user's identity. You never see their password for that service.

```
1. User clicks "Login with Google"
2. Browser redirects to Google's login page
3. User logs into Google
4. Google redirects back to your app with an authorization code
5. Your server exchanges the code for an access token
6. Your server uses the token to get user info from Google
7. Your server creates a session/JWT for your app
```

OAuth handles authentication by proxy. It is not a replacement for thinking about authorization in your own app.

---

## Why Learn Auth From Scratch?

You might be wondering why you are learning bcrypt, sessions, and JWTs manually instead of just using a library like Passport.js or a service like Auth0.

There are real reasons to understand the fundamentals first.

**You will debug issues more effectively.** Auth bugs are often security issues. When something goes wrong, knowing what is happening underneath lets you diagnose the problem instead of guessing.

**Libraries make decisions for you.** Passport.js is flexible but requires configuration. If you do not understand what it is configuring, you cannot make informed choices or catch misconfiguration.

**Services are not free forever.** Auth0 has pricing tiers. If you ever need to migrate away or customize behavior, understanding the underlying mechanics matters.

**Interviews test the fundamentals.** Senior engineers are expected to understand how JWT verification works, what makes a session secure, and what RBAC means.

This module walks you through the manual implementation. After you understand it, you can absolutely use Passport.js or Auth0 in production and understand exactly what they are doing for you.

---

## Security Is a Mindset

Authentication and authorization are not features you add at the end. They are part of the architecture. When you design a data model, you should be asking: who can read this? Who can write this? How do we verify identity?

A few principles that run through everything in this module:

**Defense in depth.** Multiple layers of security are better than relying on one. Validate on the client for UX, but always validate on the server. Hash passwords even if your database access is limited.

**Principle of least privilege.** Give users the minimum access they need. An author should not be able to edit other authors' posts just because they are authenticated.

**Fail securely.** When something goes wrong in auth logic, default to denying access. Never default to granting it.

**Never trust client input.** The client can send anything. Validate and sanitize on the server every time.

These principles will come up in each of the following lessons. Keep them in mind.

---

## Key Takeaways

- Authentication verifies identity (who are you), producing a 401 when it fails
- Authorization determines permissions (what can you do), producing a 403 when it fails
- Session-based auth is stateful: the server stores session data and looks it up on each request
- JWT auth is stateless: the server signs a token that the client presents on each request
- OAuth delegates authentication to a trusted third party without exposing passwords
- Understanding auth fundamentals makes you a better debugger, architect, and engineer
- Security is a mindset: defense in depth, least privilege, fail securely, never trust input

---

## Try It Yourself

**Exercise 1.** Look at two different web apps you use regularly (a social app, a banking app, a developer tool). For each one, try to identify: how do you think they handle authentication (session, JWT, OAuth)? What clues does the network tab in DevTools give you? Look for cookies vs Authorization headers in requests.

**Exercise 2.** In the blog app from Module 08, map out every route. For each route, decide: should it require authentication? Should it require any additional authorization? For example: listing posts is public, but creating a post requires login, and editing a post requires being the author. Write this out as a table before writing any code. This is the authorization model for the module project.

**Exercise 3.** Research one real-world data breach (the 2012 LinkedIn breach, the 2013 Adobe breach, or the 2019 Collection #1 breach are all well-documented). What went wrong with authentication? What should have been done differently? Understanding real failures makes the technical decisions in the next lessons concrete.
