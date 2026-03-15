import { test, expect } from '@playwright/test';

test.describe('Full-Stack Python Course', () => {
  test('course catalog page loads and shows the course', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.locator('text=Full-Stack Python')).toBeVisible();
  });

  test('course detail page loads with correct title', async ({ page }) => {
    await page.goto('/courses/full-stack-python');
    await expect(page.locator('h1')).toContainText('Full-Stack Python');
  });

  test('course detail page shows sidebar metadata', async ({ page }) => {
    await page.goto('/courses/full-stack-python');
    const sidebar = page.locator('.sticky');
    await expect(sidebar.locator('text=Difficulty')).toBeVisible();
    await expect(sidebar.locator('text=Duration')).toBeVisible();
    await expect(sidebar.locator('text=Modules')).toBeVisible();
    await expect(sidebar.locator('text=Lessons')).toBeVisible();
  });

  test('course detail page shows correct difficulty and price', async ({ page }) => {
    await page.goto('/courses/full-stack-python');
    await expect(page.locator('text=DifficultyAdvanced')).toBeVisible();
    await expect(page.getByText('$69')).toBeVisible();
  });

  test('curriculum section shows all 8 modules', async ({ page }) => {
    await page.goto('/courses/full-stack-python');
    await expect(page.locator('text=TypeScript for Web Developers')).toBeVisible();
    await expect(page.locator('text=Advanced React Patterns')).toBeVisible();
    await expect(page.locator('text=State Management & Data Fetching')).toBeVisible();
    await expect(page.locator('text=Testing Web Applications')).toBeVisible();
    await expect(page.locator('text=Python for Web Developers')).toBeVisible();
    await expect(page.locator('text=Django Web Framework')).toBeVisible();
    await expect(page.locator('text=DevOps & Deployment')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Capstone/ })).toBeVisible();
  });

  test('free preview lesson is accessible without login', async ({ page }) => {
    await page.goto('/courses/full-stack-python');
    const freePreview = page.locator('text=Free Preview').first();
    await expect(freePreview).toBeVisible();
  });

  test('module 01 shows TypeScript lessons and project', async ({ page }) => {
    await page.goto('/courses/full-stack-python');
    await expect(page.locator('text=Why TypeScript?')).toBeVisible();
    await expect(page.locator('text=Types, Interfaces, and Enums')).toBeVisible();
    await expect(page.locator('text=Generics')).toBeVisible();
    await expect(page.locator('text=TypeScript with React')).toBeVisible();
    await expect(page.locator('text=Advanced Type Patterns')).toBeVisible();
    await expect(page.locator('text=Type-Safe API Client')).toBeVisible();
  });

  test('module 02 shows Advanced React lessons', async ({ page }) => {
    await page.goto('/courses/full-stack-python');
    await expect(page.locator('text=Component Composition Patterns')).toBeVisible();
    await expect(page.locator('text=Compound Components')).toBeVisible();
    await expect(page.locator('text=Server Components and Next.js')).toBeVisible();
    await expect(page.locator('text=Advanced Dashboard')).toBeVisible();
  });

  test('module 05 shows Python lessons', async ({ page }) => {
    await page.goto('/courses/full-stack-python');
    await expect(page.locator('text=Python for JavaScript Developers')).toBeVisible();
    await expect(page.locator('text=Data Structures in Python')).toBeVisible();
    await expect(page.locator('text=Virtual Environments and pip')).toBeVisible();
    await expect(page.locator('text=Gather Event Analytics CLI')).toBeVisible();
  });

  test('module 06 shows Django lessons', async ({ page }) => {
    await page.goto('/courses/full-stack-python');
    await expect(page.locator('text=Introduction to Django')).toBeVisible();
    await expect(page.locator('text=Models and the ORM')).toBeVisible();
    await expect(page.locator('text=Serializers and Django REST Framework')).toBeVisible();
    await expect(page.locator('text=Django REST API').first()).toBeVisible();
  });

  test('module 08 shows capstone lessons', async ({ page }) => {
    await page.goto('/courses/full-stack-python');
    await expect(page.locator('text=Architecture and Planning')).toBeVisible();
    await expect(page.locator('text=Building with Best Practices')).toBeVisible();
    await expect(page.locator('text=Testing and Shipping')).toBeVisible();
    await expect(page.locator('text=Production Capstone')).toBeVisible();
  });

  test('prerequisites are listed', async ({ page }) => {
    await page.goto('/courses/full-stack-python');
    await expect(page.locator('text=JavaScript (ES6+) proficiency')).toBeVisible();
    await expect(page.locator('text=React fundamentals')).toBeVisible();
  });

  test('all courses load on catalog page', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.locator('text=Web Development Foundations')).toBeVisible();
    await expect(page.locator('text=AI Engineering for Web Developers')).toBeVisible();
    await expect(page.locator('text=Full-Stack JavaScript')).toBeVisible();
    await expect(page.locator('text=Full-Stack Python')).toBeVisible();
  });
});
