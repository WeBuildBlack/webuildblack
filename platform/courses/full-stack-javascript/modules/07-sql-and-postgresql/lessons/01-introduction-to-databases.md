---
title: "Introduction to Databases"
estimatedMinutes: 30
---

# Introduction to Databases

Every application that persists data needs a database. A static in-memory array works fine for a few hours of experimentation, but the moment your process restarts, all your data is gone. Databases solve this: they store data on disk, provide a query language for retrieving and manipulating it, and handle concurrent access from multiple clients safely. This lesson covers why databases exist, the difference between relational and document-based databases, and how to get PostgreSQL running on your machine.

---

## Why Not Just Use Files?

You already know how to read and write files with Node's `fs` module. Why not just store data in JSON files?

The answer is that files work until they do not:

- **Concurrency**: If two requests try to write to the same file at the same time, one will overwrite the other. Databases handle concurrent writes safely with transactions and locking.
- **Querying**: Finding all posts where `author = "Devin"` in a JSON file means reading the entire file into memory and filtering in JavaScript. Databases index data so queries are fast even on millions of rows.
- **Relationships**: Linking data across files (posts to authors, orders to products) requires careful management in application code. Databases make relationships first-class with foreign keys and joins.
- **Durability**: Databases write to disk with guarantees -- if the server crashes mid-write, they can recover to a consistent state. A file mid-write may be corrupted.
- **Scale**: A single JSON file holding millions of records is impractical. Databases are built to handle large data sets efficiently.

For serious applications, files are appropriate for static assets, configuration, and content. For structured, queryable data that changes over time, you need a database.

---

## Relational Databases

Relational databases store data in **tables** -- think spreadsheets with rows and columns, but with strict schemas and powerful query capabilities. They use SQL (Structured Query Language) to read and write data.

Key concepts:

- **Table**: A named collection of rows with a fixed set of columns. Example: a `users` table with columns `id`, `email`, `name`, `created_at`.
- **Row**: A single record in a table. Example: `(1, "devin@example.com", "Devin", "2026-01-01")`.
- **Column**: A named field with a specific data type. Example: `email TEXT NOT NULL UNIQUE`.
- **Primary key**: A column (or set of columns) that uniquely identifies each row. Typically `id`.
- **Foreign key**: A column that references the primary key of another table. Links related data across tables.
- **Index**: A data structure that speeds up queries on specific columns.

Well-known relational databases: PostgreSQL, MySQL, SQLite, Microsoft SQL Server, Oracle.

---

## NoSQL Databases

The "NoSQL" category covers a wide range of databases that store data differently from relational tables. The most common types:

**Document databases** (MongoDB, CouchDB) store JSON-like documents instead of rows. Each document can have a different shape. Good for hierarchical or variable-structure data.

```json
{
  "_id": "abc123",
  "title": "Hello World",
  "body": "My first post",
  "tags": ["javascript", "node"],
  "comments": [
    { "author": "Alex", "body": "Great post!" }
  ]
}
```

**Key-value stores** (Redis, DynamoDB) store data as simple key-value pairs, like a hash map. Extremely fast for lookups by key. Used for caching, sessions, and real-time data.

**Wide-column stores** (Cassandra, HBase) are designed for massive scale and time-series data.

**Graph databases** (Neo4j) model data as nodes and edges. Ideal for social networks and recommendation engines.

### Relational vs. Document: When to Use Which

| Consideration | Relational (PostgreSQL) | Document (MongoDB) |
|--------------|------------------------|-------------------|
| Data structure | Structured, consistent schema | Flexible, varying schemas |
| Relationships | Excellent (joins, foreign keys) | Awkward at scale |
| Transactions | Full ACID support | Limited (improving) |
| Query flexibility | Very high (SQL) | Good for document lookups |
| Scaling writes | Vertical scaling, read replicas | Horizontal sharding |
| Typical use | Business apps, APIs, analytics | Content, catalogs, logs |

For most web applications -- including everything you will build in this course -- PostgreSQL is an excellent choice. It is reliable, feature-rich, well-supported, and the data model of tables with foreign keys fits most application domains naturally.

---

## PostgreSQL Overview

PostgreSQL (often called Postgres) is an open-source relational database with a 35-year history. It is known for:

- **ACID compliance**: Atomicity, Consistency, Isolation, Durability. Transactions either fully succeed or fully roll back.
- **Rich data types**: TEXT, INTEGER, BOOLEAN, TIMESTAMPTZ, UUID, JSONB, arrays, and more.
- **Extensibility**: Functions, custom types, full-text search, PostGIS for geographic data.
- **Performance**: Excellent query optimizer, indexing options (B-tree, GIN, GiST, BRIN), and parallel query execution.
- **Active community**: Excellent documentation, regular releases, wide adoption from startups to Fortune 500 companies.

Supabase (used by the WBB course platform) is built on PostgreSQL. Amazon RDS, Google Cloud SQL, and Railway all offer managed PostgreSQL hosting. Understanding PostgreSQL directly transfers to working with any of these services.

---

## Installing PostgreSQL

### macOS

**Option 1: Postgres.app (recommended for beginners)**
Download from [postgresapp.com](https://postgresapp.com). It installs as a menu bar app and is the easiest way to manage PostgreSQL on a Mac. After installation:

```bash
# Add Postgres.app CLI tools to your PATH (add to ~/.zshrc or ~/.bash_profile)
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"

# Verify installation
psql --version
```

**Option 2: Homebrew**
```bash
brew install postgresql@16
brew services start postgresql@16
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Switch to the postgres user and open psql
sudo -u postgres psql
```

### Windows

Download the installer from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/). The installer includes pgAdmin (a GUI tool) and adds psql to your PATH. During installation, set a password for the `postgres` superuser -- you will need it.

---

## psql: The PostgreSQL Command-Line Client

`psql` is the official PostgreSQL interactive terminal. You will use it to connect to databases, run queries, and inspect schemas.

### Connecting

```bash
# Connect to the default database with your OS username
psql

# Connect to a specific database
psql mydb

# Connect with specific user and host
psql -U postgres -h localhost -d mydb

# Connect using a connection string
psql postgresql://postgres:password@localhost:5432/mydb
```

### Essential psql Commands

These are meta-commands that start with `\`:

```sql
-- List all databases
\l

-- Connect to a database
\c mydb

-- List all tables in current database
\dt

-- Describe a table (show columns and types)
\d posts

-- Show all schemas
\dn

-- Quit psql
\q

-- Run a SQL file
\i /path/to/file.sql

-- Toggle expanded display (useful for wide tables)
\x

-- Show query execution time
\timing
```

### Creating a Database

```bash
# From the terminal (not inside psql)
createdb blog_development
createdb blog_test

# Or from inside psql
# CREATE DATABASE blog_development;

# Connect to the new database
psql blog_development
```

Convention: use separate databases for development, testing, and production. This prevents a test run from destroying your development data.

---

## A First SQL Query

Once inside psql, you can run SQL queries. SQL statements end with a semicolon:

```sql
-- Create a simple table
CREATE TABLE greetings (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a row
INSERT INTO greetings (message) VALUES ('Hello, PostgreSQL!');

-- Query the table
SELECT * FROM greetings;

-- Result:
--  id |      message       |          created_at
-- ----+--------------------+-------------------------------
--   1 | Hello, PostgreSQL! | 2026-03-14 12:00:00.000000+00

-- Clean up
DROP TABLE greetings;
```

SQL is not case-sensitive for keywords (`SELECT`, `select`, and `Select` all work), but convention is to write SQL keywords in uppercase and identifiers (table names, column names) in lowercase_with_underscores.

---

## Key Takeaways

- Databases solve the limitations of flat files: they handle concurrency, support fast queries, model relationships, and guarantee data durability.
- Relational databases (PostgreSQL, MySQL) store data in tables with rows and columns, linked by foreign keys. They use SQL for all operations.
- Document databases (MongoDB) store JSON-like documents with flexible schemas. Better for variable-structure data, worse for complex relationships.
- PostgreSQL is a robust, open-source relational database used in production by companies of every size. It is the right choice for most web application backends.
- `psql` is the PostgreSQL command-line client. Key commands: `\l` (list databases), `\dt` (list tables), `\d tablename` (describe table), `\q` (quit).
- Create separate databases for development and testing. `createdb dbname` creates a database from the terminal.
- SQL keywords are conventionally written in uppercase. Identifiers (table and column names) use lowercase_with_underscores.

---

## Try It Yourself

**Exercise 1: Install and Verify**
Install PostgreSQL using one of the methods above. Verify the installation by running `psql --version` in your terminal. Then connect to the default database with `psql` and run `SELECT version();` to confirm the connection works.

**Exercise 2: Create a Database**
Run `createdb practice_db` from your terminal. Connect to it with `psql practice_db`. Use `\l` to confirm the database exists in the list.

**Exercise 3: Create and Query a Table**
Inside `practice_db`, create a table called `todos` with columns: `id` (SERIAL PRIMARY KEY), `task` (TEXT NOT NULL), `done` (BOOLEAN DEFAULT FALSE), and `created_at` (TIMESTAMPTZ DEFAULT NOW()). Insert three rows. Then `SELECT * FROM todos` to see all rows. Try `SELECT * FROM todos WHERE done = false` to filter. When done, drop the table with `DROP TABLE todos;`.