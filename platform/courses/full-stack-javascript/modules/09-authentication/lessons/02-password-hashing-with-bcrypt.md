---
title: "Password Hashing with bcrypt"
estimatedMinutes: 35
---

# Password Hashing with bcrypt

Passwords are the most sensitive data your application handles. How you store them determines whether a database breach is a minor incident or a catastrophic one. This lesson covers exactly how to store passwords safely using bcrypt, and why every shortcut in this area has real consequences.

---

## Why Plaintext Passwords Are Catastrophic

In 2013, Adobe suffered a breach exposing 153 million user records. The passwords were not stored in plaintext, but they were encrypted (not hashed) with 3DES, using the same key for every password. Researchers cracked the encryption for common passwords and used that to deduce others. The breach remains a case study in how not to store passwords.

In 2012, LinkedIn stored passwords as unsalted SHA-1 hashes. When 117 million records leaked, attackers cracked 90% of them within days using precomputed rainbow tables.

Storing passwords in plaintext is worse than either of those. If your database is ever accessed by an unauthorized party (SQL injection, a misconfigured backup, a compromised employee), every user's password is immediately exposed. And because people reuse passwords, a breach of your small app can compromise your users' bank accounts, email, and more.

The rule is absolute: **never store a password in a form that can be reversed into the original.**

---

## Hashing vs Encryption

These terms are often confused, and the distinction matters.

**Encryption** is a two-way process. You encrypt data with a key, and you can decrypt it back to the original with a key. Encryption is appropriate for data you need to read back: credit card numbers (in PCI-compliant systems), API keys, personal health information. Encryption is not appropriate for passwords because the ability to decrypt means the ability to expose.

**Hashing** is a one-way process. You feed data into a hash function, get a fixed-length output (the hash), and cannot reverse that process. You can only verify a password by hashing the input again and comparing the result. This is exactly what you want for passwords.

```javascript
// Encryption (reversible)
encrypt("mypassword", key)  // → "a3f9b2..."
decrypt("a3f9b2...", key)   // → "mypassword"  (BAD for passwords)

// Hashing (one-way)
hash("mypassword")  // → "$2b$10$abc123..."
hash("mypassword")  // → "$2b$10$abc123..."  (same input, same output)
// You cannot go backwards from "$2b$10$abc123..." to "mypassword"
```

Standard hash functions like MD5 and SHA-1 are fast. That is a problem for passwords. Fast means an attacker can try billions of combinations per second on modern hardware. bcrypt is designed to be slow, and you control exactly how slow.

---

## What Makes bcrypt the Right Tool

bcrypt was designed in 1999 specifically for password hashing. It has three properties that make it well-suited for this job.

**It is slow by design.** bcrypt includes a configurable work factor (called salt rounds) that determines how computationally expensive each hash operation is. More rounds means slower hashing, which means slower cracking.

**It incorporates a salt automatically.** A salt is random data added to the password before hashing. This ensures that two users with the same password get different hashes, defeating precomputed rainbow table attacks.

**The salt is stored in the hash output.** bcrypt produces a single string that contains the algorithm version, salt rounds, salt, and hash. You store one field and bcrypt handles the rest.

A bcrypt hash looks like this:

```
$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
 ^^  ^^  ^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 |   |   salt (22 chars)         hash (31 chars)
 |   salt rounds (10)
 algorithm version (2b)
```

Everything needed to verify the password is in that one string.

---

## Installing and Using bcrypt

Install the package in your server directory:

```bash
npm install bcrypt
```

For TypeScript projects or if you prefer a pure JS implementation without native bindings:

```bash
npm install bcryptjs
```

The API is identical between the two packages. The examples here use `bcrypt`.

### Hashing a Password

```javascript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12; // More on this number below

async function hashPassword(plaintext) {
  // bcrypt.hash() generates a fresh random salt and hashes in one step
  const hash = await bcrypt.hash(plaintext, SALT_ROUNDS);
  return hash;
}

const hash = await hashPassword('myS3cur3P@ssword');
console.log(hash);
// → "$2b$12$..." (different every call due to random salt)
```

### Verifying a Password

```javascript
async function verifyPassword(plaintext, storedHash) {
  // bcrypt.compare() extracts the salt from the stored hash,
  // re-hashes the plaintext with that salt, and compares the result
  const isValid = await bcrypt.compare(plaintext, storedHash);
  return isValid; // true or false
}

const isValid = await verifyPassword('myS3cur3P@ssword', hash);
console.log(isValid); // → true

const isInvalid = await verifyPassword('wrongpassword', hash);
console.log(isInvalid); // → false
```

You never extract the salt manually. `bcrypt.compare()` handles that by reading the salt embedded in the hash string.

---

## Choosing Salt Rounds

Salt rounds (also called the cost factor or work factor) control how slow bcrypt is. Each increment doubles the computation time.

```javascript
// Rough timing on a 2024 laptop (single hash operation):
// rounds: 8  → ~2ms    (too fast for production)
// rounds: 10 → ~10ms   (acceptable minimum)
// rounds: 12 → ~250ms  (good default)
// rounds: 14 → ~1000ms (high security, noticeable UX impact on login)
// rounds: 16 → ~4000ms (excessive for most apps)
```

The right number depends on your hardware and tolerance for login latency. A common target is 250-500ms per hash on your production hardware, which usually lands between 12 and 14 rounds.

```javascript
// Measure hash time on your machine before deciding
import bcrypt from 'bcrypt';

async function benchmarkRounds(rounds) {
  const start = Date.now();
  await bcrypt.hash('testpassword', rounds);
  const duration = Date.now() - start;
  console.log(`Rounds ${rounds}: ${duration}ms`);
}

for (const rounds of [10, 11, 12, 13, 14]) {
  await benchmarkRounds(rounds);
}
```

Store `SALT_ROUNDS` as an environment variable so you can tune it without a code change:

```javascript
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
```

---

## Storing Hashes in PostgreSQL

Your users table needs a `password_hash` column, not a `password` column. The name signals to every developer who reads the schema that this field is a hash, not a reversible value.

```sql
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,   -- bcrypt output is always ~60 chars
  display_name  VARCHAR(100),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index email for fast login lookups
CREATE INDEX idx_users_email ON users(email);
```

bcrypt hashes are always 60 characters long for the `2b` version. `VARCHAR(255)` gives room if the format ever changes.

---

## Building the User Registration Endpoint

Here is a complete registration endpoint for the blog app:

```javascript
// server/routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../db.js'; // Your pg Pool instance

const router = express.Router();
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

router.post('/register', async (req, res) => {
  const { email, password, displayName } = req.body;

  // 1. Validate input -- never trust the client
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // 2. Check if the email is already taken
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // 3. Hash the password before storing anything
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 4. Insert the new user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, created_at`,
      [email.toLowerCase().trim(), passwordHash, displayName || null]
    );

    const newUser = result.rows[0];

    // 5. Return the user WITHOUT the password hash
    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name,
        createdAt: newUser.created_at,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

export default router;
```

A few things to notice in this implementation.

**Input validation happens before the database.** Do not run expensive bcrypt operations on invalid input.

**Emails are normalized.** `toLowerCase().trim()` prevents duplicate accounts from `User@Example.com` and `user@example.com`.

**The password hash is never returned.** The `RETURNING` clause explicitly lists safe fields. Never use `SELECT *` from a users table in a response.

**Errors are generic at the HTTP layer.** The internal error is logged for debugging, but the client gets a safe generic message.

---

## Preventing Timing Attacks on Login

When a login attempt uses an email that does not exist, you should still run `bcrypt.compare()` against a dummy hash. This prevents timing attacks, where an attacker measures response time to determine whether an email exists in your system.

```javascript
// Without this protection, a fast response (no bcrypt run) reveals
// "this email doesn't exist in our database" to anyone measuring latency
const DUMMY_HASH = '$2b$12$invalidhashfortimingXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    'SELECT id, email, password_hash, display_name FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );

  const user = result.rows[0];

  // Always run bcrypt.compare(), even if the user was not found
  const hashToCompare = user ? user.password_hash : DUMMY_HASH;
  const isValid = await bcrypt.compare(password, hashToCompare);

  if (!user || !isValid) {
    // Same error message regardless of which check failed
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Proceed with creating a session or token (covered in lessons 3 and 4)
  res.json({ message: 'Login successful', userId: user.id });
});
```

This pattern ensures login always takes approximately the same amount of time, whether the email exists or not. The full login implementation with session and JWT creation comes in the next two lessons.

---

## Key Takeaways

- Never store passwords in plaintext or in any reversible form; always use a one-way hash
- Hashing is one-way; encryption is two-way. Passwords need hashing, not encryption
- bcrypt automatically generates and embeds a random salt, defeating rainbow table attacks
- Salt rounds control the cost of hashing: target 250-500ms per operation on your production hardware
- Store hashes in a `password_hash` column (`VARCHAR(255)`) and never include them in API responses
- Always normalize emails (lowercase, trim) before storing or querying to prevent duplicate accounts
- Run `bcrypt.compare()` even when the user is not found, to prevent timing attacks that reveal user enumeration

---

## Try It Yourself

**Exercise 1.** Add the `users` table migration to your blog app database. Create a file `server/migrations/002_add_users.sql` with the `CREATE TABLE` statement from this lesson. Run it against your local PostgreSQL database with `psql -d your_db_name -f server/migrations/002_add_users.sql` and verify the schema with `\d users`.

**Exercise 2.** Write a standalone benchmark script at `server/scripts/hash-benchmark.js` that tests bcrypt at rounds 10 through 14, hashing three passwords at each level and logging the average time. Run it and decide which round count is right for your machine. Then consider: if your production server has half the CPU speed, how would your choice change?

**Exercise 3.** Implement `POST /api/auth/register` in your blog app and test it with a REST client (Insomnia, Postman, or curl). Confirm: (1) a successful registration returns 201 with user data but no hash, (2) a duplicate email returns 409, (3) a short password returns 400, and (4) checking the database directly shows a bcrypt hash in `password_hash`, not the original password.
