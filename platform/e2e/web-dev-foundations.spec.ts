import { test, expect } from '@playwright/test';

test.describe('Web Development Foundations Course', () => {
  test('course catalog page loads and shows the course', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.locator('text=Web Development Foundations')).toBeVisible();
  });

  test('course detail page loads with correct title', async ({ page }) => {
    await page.goto('/courses/web-dev-foundations');
    await expect(page.locator('h1')).toContainText('Web Development Foundations');
  });

  test('course detail page shows sidebar metadata', async ({ page }) => {
    await page.goto('/courses/web-dev-foundations');
    const sidebar = page.locator('.sticky');
    await expect(sidebar.locator('text=Difficulty')).toBeVisible();
    await expect(sidebar.locator('text=Duration')).toBeVisible();
    await expect(sidebar.locator('text=Modules')).toBeVisible();
    await expect(sidebar.locator('text=Lessons')).toBeVisible();
  });

  test('curriculum section shows all 10 modules', async ({ page }) => {
    await page.goto('/courses/web-dev-foundations');
    await expect(page.locator('text=Terminal & Command Line')).toBeVisible();
    await expect(page.locator('text=How the Web Works')).toBeVisible();
    await expect(page.locator('text=Git & GitHub')).toBeVisible();
    await expect(page.locator('text=HTML Fundamentals')).toBeVisible();
    await expect(page.locator('text=CSS Fundamentals')).toBeVisible();
    await expect(page.locator('text=CSS Layout')).toBeVisible();
    await expect(page.locator('text=Responsive Web Design').first()).toBeVisible();
    await expect(page.locator('text=JavaScript Fundamentals')).toBeVisible();
    await expect(page.locator('text=JavaScript & the DOM')).toBeVisible();
    await expect(page.locator('text=Capstone')).toBeVisible();
  });

  test('free preview lesson is accessible without login', async ({ page }) => {
    await page.goto('/courses/web-dev-foundations');
    const freePreview = page.locator('text=Free Preview').first();
    await expect(freePreview).toBeVisible();
  });

  test('module 01 shows correct lessons and project', async ({ page }) => {
    await page.goto('/courses/web-dev-foundations');
    await expect(page.locator('text=What Is the Terminal?')).toBeVisible();
    await expect(page.locator('text=Navigating the Filesystem')).toBeVisible();
    await expect(page.locator('text=Creating and Managing Files')).toBeVisible();
    await expect(page.locator('text=Essential Terminal Commands')).toBeVisible();
    await expect(page.locator('text=Terminal Treasure Hunt')).toBeVisible();
  });

  test('module 04 shows HTML lessons and project', async ({ page }) => {
    await page.goto('/courses/web-dev-foundations');
    await expect(page.locator('text=Introduction to HTML')).toBeVisible();
    await expect(page.locator('text=Text Elements and Structure')).toBeVisible();
    await expect(page.locator('text=Links, Images, and Media')).toBeVisible();
    await expect(page.locator('text=Forms and Inputs')).toBeVisible();
    await expect(page.locator('text=Semantic HTML and Accessibility')).toBeVisible();
    await expect(page.locator('text=Recipe Page').first()).toBeVisible();
  });

  test('module 10 shows capstone lessons', async ({ page }) => {
    await page.goto('/courses/web-dev-foundations');
    await expect(page.locator('text=Planning Your Portfolio')).toBeVisible();
    await expect(page.locator('text=Building the Portfolio')).toBeVisible();
    await expect(page.locator('text=Deploying to the Web')).toBeVisible();
    await expect(page.locator('text=Personal Portfolio Site')).toBeVisible();
  });

  test('all other courses load on catalog page', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.locator('text=AI Engineering for Web Developers')).toBeVisible();
    await expect(page.locator('text=Web Development Foundations')).toBeVisible();
  });
});
