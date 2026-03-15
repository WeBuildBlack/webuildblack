import { test, expect } from '@playwright/test';

test.describe('Full-Stack JavaScript Course', () => {
  test('course catalog page shows the course', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.locator('text=Full-Stack JavaScript')).toBeVisible();
  });

  test('course detail page loads with correct title', async ({ page }) => {
    await page.goto('/courses/full-stack-javascript');
    await expect(page.locator('h1')).toContainText('Full-Stack JavaScript');
  });

  test('course detail page shows sidebar metadata', async ({ page }) => {
    await page.goto('/courses/full-stack-javascript');
    const sidebar = page.locator('.sticky');
    await expect(sidebar.locator('text=Difficulty')).toBeVisible();
    await expect(sidebar.locator('text=Duration')).toBeVisible();
    await expect(sidebar.locator('text=Modules')).toBeVisible();
    await expect(sidebar.locator('text=Lessons')).toBeVisible();
  });

  test('course detail page shows price', async ({ page }) => {
    await page.goto('/courses/full-stack-javascript');
    await expect(page.locator('text=$49')).toBeVisible();
  });

  test('curriculum section shows all 10 modules', async ({ page }) => {
    await page.goto('/courses/full-stack-javascript');
    await expect(page.locator('text=Advanced JavaScript (ES6+)')).toBeVisible();
    await expect(page.locator('text=Asynchronous JavaScript')).toBeVisible();
    await expect(page.locator('text=APIs & JSON')).toBeVisible();
    await expect(page.locator('text=React.js Fundamentals')).toBeVisible();
    await expect(page.locator('text=React State & Hooks')).toBeVisible();
    await expect(page.locator('text=Node.js & Express')).toBeVisible();
    await expect(page.locator('text=SQL & PostgreSQL')).toBeVisible();
    await expect(page.locator('text=Full-Stack Integration')).toBeVisible();
    await expect(page.locator('text=Authentication & Security')).toBeVisible();
    await expect(page.locator('text=Capstone').first()).toBeVisible();
  });

  test('free preview lesson is accessible without login', async ({ page }) => {
    await page.goto('/courses/full-stack-javascript');
    const freePreview = page.locator('text=Free Preview').first();
    await expect(freePreview).toBeVisible();
  });

  test('module 01 shows correct lessons and project', async ({ page }) => {
    await page.goto('/courses/full-stack-javascript');
    await expect(page.locator('text=Destructuring and Spread Operators')).toBeVisible();
    await expect(page.locator('text=Arrow Functions and this')).toBeVisible();
    await expect(page.locator('text=Template Literals and Enhanced Object Literals')).toBeVisible();
    await expect(page.locator('text=Modules and Imports')).toBeVisible();
    await expect(page.locator('text=Iterators, Generators, and Symbols')).toBeVisible();
    await expect(page.locator('text=Utility Library')).toBeVisible();
  });

  test('module 04 shows React lessons and project', async ({ page }) => {
    await page.goto('/courses/full-stack-javascript');
    await expect(page.locator('text=Why React?')).toBeVisible();
    await expect(page.locator('text=JSX and Components')).toBeVisible();
    await expect(page.locator('text=Props and Data Flow')).toBeVisible();
    await expect(page.locator('text=Conditional Rendering')).toBeVisible();
    await expect(page.locator('text=Lists and Keys')).toBeVisible();
    await expect(page.locator('text=Forms in React')).toBeVisible();
    await expect(page.locator('text=Component Library').first()).toBeVisible();
  });

  test('module 07 shows SQL lessons and project', async ({ page }) => {
    await page.goto('/courses/full-stack-javascript');
    await expect(page.locator('text=Introduction to Databases')).toBeVisible();
    await expect(page.locator('text=Joins and Relationships')).toBeVisible();
    await expect(page.locator('text=Connecting PostgreSQL to Node.js')).toBeVisible();
    await expect(page.locator('text=Bookstore Database')).toBeVisible();
  });

  test('module 09 shows auth lessons and project', async ({ page }) => {
    await page.goto('/courses/full-stack-javascript');
    await expect(page.locator('text=Authentication vs Authorization')).toBeVisible();
    await expect(page.locator('text=Password Hashing with bcrypt')).toBeVisible();
    await expect(page.locator('text=JWT Authentication')).toBeVisible();
    await expect(page.locator('text=Security Best Practices')).toBeVisible();
    await expect(page.locator('text=Secure Auth System')).toBeVisible();
  });

  test('module 10 shows capstone lessons and project', async ({ page }) => {
    await page.goto('/courses/full-stack-javascript');
    await expect(page.locator('text=Planning a Full-Stack Project')).toBeVisible();
    await expect(page.locator('text=Building the MVP')).toBeVisible();
    await expect(page.locator('text=Polish and Deployment')).toBeVisible();
    await expect(page.locator('text=Full-Stack Capstone').first()).toBeVisible();
  });

  test('prerequisites are listed', async ({ page }) => {
    await page.goto('/courses/full-stack-javascript');
    await expect(page.locator('text=HTML & CSS fundamentals')).toBeVisible();
    await expect(page.locator('text=JavaScript basics')).toBeVisible();
  });
});
