---
title: "Module Project: Bookstore Database"
estimatedMinutes: 90
---

# Module Project: Bookstore Database

In this project you will design a relational database schema for a bookstore, write a seed data script, and practice writing queries of increasing complexity. You will also write a Node.js script that connects to the database and runs these queries programmatically. By the end, you will have hands-on experience with the full cycle: schema design, data insertion, querying with joins, and connecting Postgres to Node.

---

## Schema Overview

Your database will have four tables:

| Table | Description |
|-------|-------------|
| `authors` | Book authors (one author can write many books) |
| `genres` | Book genres/categories |
| `books` | The main catalog (each book has one primary author) |
| `book_genres` | Junction table: many-to-many between books and genres |
| `reviews` | Reader reviews for books (one book, many reviews) |

---

## Part 1: Schema Design

Create a file called `schema.sql`. Write `CREATE TABLE` statements for all five tables.

```sql
-- schema.sql

-- TODO: Drop tables in the correct order to avoid foreign key constraint errors
-- (children before parents)

-- TODO: Create the authors table
-- Columns:
--   id          SERIAL PRIMARY KEY
--   name        TEXT NOT NULL
--   bio         TEXT
--   birth_year  INTEGER CHECK (birth_year > 1000 AND birth_year < 2100)
--   created_at  TIMESTAMPTZ DEFAULT NOW()

-- TODO: Create the genres table
-- Columns:
--   id    SERIAL PRIMARY KEY
--   name  TEXT NOT NULL UNIQUE

-- TODO: Create the books table
-- Columns:
--   id            SERIAL PRIMARY KEY
--   title         TEXT NOT NULL
--   author_id     INTEGER NOT NULL REFERENCES authors(id) ON DELETE CASCADE
--   isbn          TEXT UNIQUE  (nullable -- not all books have ISBNs in the system)
--   price         NUMERIC(10, 2) NOT NULL CHECK (price >= 0)
--   published_at  DATE
--   in_stock      BOOLEAN NOT NULL DEFAULT TRUE
--   created_at    TIMESTAMPTZ DEFAULT NOW()

-- TODO: Create the book_genres junction table
-- Columns:
--   book_id   INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE
--   genre_id  INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE
--   PRIMARY KEY (book_id, genre_id)

-- TODO: Create the reviews table
-- Columns:
--   id          SERIAL PRIMARY KEY
--   book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE
--   reviewer    TEXT NOT NULL
--   rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5)
--   body        TEXT
--   created_at  TIMESTAMPTZ DEFAULT NOW()

-- TODO: Add indexes for common query patterns:
--   books.author_id  (FK lookup)
--   books.in_stock   (filtering in-stock books)
--   reviews.book_id  (FK lookup)
```

Verify your schema with `\dt` and `\d books` in psql.

---

## Part 2: Seed Data

Create a file called `seed.sql` with enough data to make interesting queries:

```sql
-- seed.sql

-- TODO: Insert at least 5 authors
-- Include a mix of birth years, some with bios and some without

-- TODO: Insert at least 6 genres
-- Examples: 'Fiction', 'Non-Fiction', 'Science Fiction', 'Mystery',
-- 'Biography', 'Self-Help', 'Technology', 'History'

-- TODO: Insert at least 10 books
-- Mix of:
--   - Multiple books per author (to test one-to-many joins)
--   - Some out of stock (in_stock = FALSE)
--   - Various prices (some free, some expensive)
--   - Various publication dates

-- TODO: Tag each book with 1-3 genres in book_genres
-- Make sure at least one genre has multiple books
-- and at least one book has multiple genres

-- TODO: Insert at least 15 reviews across books
-- Include a range of ratings (1-5)
-- Some books should have multiple reviews, some should have none
```

Run it: `psql bookstore_dev -f seed.sql`

---

## Part 3: SQL Queries

Create a file called `queries.sql`. Write and run each of these queries in psql. Add a comment above each with the question it answers.

```sql
-- queries.sql

-- Query 1: All books with their author name
-- Expected output: book title, author name, price, in_stock
-- TODO: Write this query

-- Query 2: All in-stock books under $20, sorted by price ascending
-- TODO: Write this query

-- Query 3: Number of books per author, including authors with zero books
-- Expected output: author name, book_count
-- Sort by book_count descending
-- TODO: Write this query (hint: LEFT JOIN)

-- Query 4: Average rating for each book (only include books that have at least one review)
-- Expected output: book title, average_rating (rounded to 1 decimal), review_count
-- Sort by average_rating descending
-- TODO: Write this query

-- Query 5: All genres with their book count
-- Include genres that have no books tagged to them
-- Sort by book_count descending
-- TODO: Write this query (hint: junction table + LEFT JOIN)

-- Query 6: Books with ALL their genres listed on one row
-- Expected output: book title, genres (comma-separated list like "Fiction, Mystery")
-- Hint: STRING_AGG(genres.name, ', ' ORDER BY genres.name)
-- TODO: Write this query

-- Query 7: The top 3 most reviewed books
-- Expected output: book title, author name, review_count
-- TODO: Write this query

-- Query 8: Books that have no reviews at all
-- Hint: anti-join with LEFT JOIN ... WHERE reviews.id IS NULL
-- TODO: Write this query

-- Query 9: Authors whose books have an average rating above 4.0
-- Expected output: author name, avg_rating across all their books
-- Only include authors whose books have at least 3 reviews total
-- TODO: Write this query (hint: nested aggregation or subquery)

-- Query 10: Revenue report -- total value of in-stock inventory per genre
-- Expected output: genre name, book_count, total_inventory_value
-- (total_inventory_value = sum of price for all in-stock books in that genre)
-- Sort by total_inventory_value descending
-- TODO: Write this query

-- Query 11: Update -- mark all books published before 2000 as out of stock
-- Use RETURNING to see which books were affected
-- TODO: Write this query

-- Query 12: Delete -- remove all reviews with rating = 1
-- Use RETURNING to see which reviews were deleted
-- TODO: Write this query

-- Bonus Query 13: Pagination -- books page 2 of 3 per page, in-stock only, sorted by title
-- TODO: Write this query

-- Bonus Query 14: Find books where title contains a search term (case-insensitive)
-- Use ILIKE with a placeholder pattern like '%search%'
-- TODO: Write this query with the search term hardcoded as a string literal

-- Bonus Query 15: Most recent review for each book (using a subquery or DISTINCT ON)
-- Expected output: book title, reviewer, rating, review date
-- TODO: Write this query
```

---

## Part 4: Node.js Query Script

Create a file called `run-queries.js` that connects to the database and runs at least 5 of the queries programmatically.

```javascript
// run-queries.js
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// TODO: Create a pool using process.env.DATABASE_URL
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // TODO: Query 1 -- all books with author names
  // Print each book as: "Title" by Author -- $Price (in stock: yes/no)

  // TODO: Query 2 -- all genres with book counts
  // Print: "Genre: N books"

  // TODO: Query 3 -- top 3 most reviewed books
  // Print: "1. Title (N reviews)"

  // TODO: Query 4 -- average rating per book (books with reviews only)
  // Print: "Title: X.X stars (N reviews)"

  // TODO: Query 5 -- books with no reviews
  // Print: "No reviews: Title"
}

main()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
```

Run it: `node run-queries.js`

---

## Acceptance Criteria

- [ ] All 5 tables are created with correct column types, constraints, and foreign keys
- [ ] All foreign keys use `ON DELETE CASCADE` or `ON DELETE SET NULL` appropriately
- [ ] Seed data contains at least 5 authors, 6 genres, 10 books, genre tags, and 15 reviews
- [ ] At least one genre has no books (to test LEFT JOIN behavior)
- [ ] At least one book has no reviews (to test anti-join)
- [ ] Queries 1-10 all return correct results
- [ ] Query 11 (UPDATE) correctly uses `RETURNING` and updates the right rows
- [ ] Query 12 (DELETE) correctly uses `RETURNING`
- [ ] `run-queries.js` connects successfully and prints formatted output for all 5 chosen queries
- [ ] All queries use parameterized syntax (`$1`, `$2`) where values are passed as parameters in the Node script

---

## Stretch Goals

**Stretch 1: Migration Script**
Create a `migrate.js` Node.js script that reads `schema.sql` and `seed.sql` using `fs.readFile` and runs them against the database using `pool.query()`. The script should drop and recreate the tables each time it runs (useful for development). Add a `npm run migrate` script to `package.json`.

**Stretch 2: Search Function**
In `run-queries.js`, add a function `searchBooks(term)` that accepts a search term and returns all books whose title or author name contains that term (case-insensitive). Use parameterized queries with `ILIKE $1` and pass `'%' + term + '%'` as the parameter.

**Stretch 3: Report Generator**
Write a function `generateReport()` that prints a formatted summary: total books, total authors, most popular genre, highest-rated book, and average price. Make it look like a real report with headers and aligned columns.

**Stretch 4: EXPLAIN ANALYZE**
Run `EXPLAIN ANALYZE` on your most complex query (the one with multiple joins). Observe the query plan. Add the missing indexes (if any) and run `EXPLAIN ANALYZE` again. Document the before/after execution times in a comment.

---

## Submission Checklist

- [ ] `schema.sql` creates all tables cleanly (can be run multiple times with DROP IF EXISTS)
- [ ] `seed.sql` populates all tables with realistic test data
- [ ] `queries.sql` contains all 12 required queries with comments
- [ ] `run-queries.js` connects to the database and prints formatted output
- [ ] `.env` is in `.gitignore` (never commit credentials)
- [ ] You can explain the difference between INNER JOIN and LEFT JOIN
- [ ] You can explain why parameterized queries prevent SQL injection