import { test, expect } from '@playwright/test';

const COURSE_SLUG = 'production-ready-web-apps';
const COURSE_URL = `/courses/${COURSE_SLUG}`;
const FREE_PREVIEW_LESSON_PATH = `/courses/${COURSE_SLUG}/learn/01-system-design-thinking/01-from-working-app-to-production-app`;

test.describe('Production-Ready Web Apps Course', () => {
  test.describe('Course Discovery', () => {
    test('user browses catalog and navigates to course', async ({ page }) => {
      await page.goto('/courses');

      const courseCard = page.locator(`a[href="${COURSE_URL}"]`);
      await expect(courseCard).toBeVisible();
      await expect(courseCard).toContainText('Production-Ready Web Apps');

      await courseCard.click();
      await expect(page).toHaveURL(COURSE_URL);
      await expect(page.locator('h1')).toContainText('Production-Ready Web Apps');
    });

    test('catalog shows course alongside all other courses', async ({ page }) => {
      await page.goto('/courses');
      await expect(page.locator('text=Web Development Foundations')).toBeVisible();
      await expect(page.locator('text=AI Engineering for Web Developers')).toBeVisible();
      await expect(page.locator('text=Full-Stack JavaScript')).toBeVisible();
      await expect(page.locator('text=Full-Stack Python')).toBeVisible();
      await expect(page.locator('text=Production-Ready Web Apps')).toBeVisible();
    });
  });

  test.describe('Course Detail Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(COURSE_URL);
    });

    test('displays correct metadata in sidebar', async ({ page }) => {
      const sidebar = page.locator('.sticky');
      await expect(sidebar.locator('text=Difficulty')).toBeVisible();
      await expect(sidebar.locator('text=Advanced')).toBeVisible();
      await expect(sidebar.locator('text=Duration')).toBeVisible();
      await expect(sidebar.locator('text=Modules')).toBeVisible();
      await expect(sidebar.locator('text=Lessons')).toBeVisible();
      await expect(sidebar.getByText('$79')).toBeVisible();
    });

    test('shows all 10 modules in curriculum', async ({ page }) => {
      const moduleHeadings = [
        'System Design Thinking',
        'Database Performance and Optimization',
        'Background Jobs and Task Queues',
        'Caching Strategies',
        'Object Storage and File Processing',
        'Real-Time at Scale',
        'Observability and Incident Response',
        'Advanced Deployment and Infrastructure',
        'Security and Reliability Patterns',
      ];

      for (const heading of moduleHeadings) {
        await expect(page.locator(`text=${heading}`)).toBeVisible();
      }
      await expect(page.getByRole('heading', { name: /Capstone/ })).toBeVisible();
    });

    test('module 01 lists all lessons and project', async ({ page }) => {
      await expect(page.locator('text=From Working App to Production App')).toBeVisible();
      await expect(page.locator('text=Latency, Throughput, and the 99th Percentile')).toBeVisible();
      await expect(page.locator('text=Horizontal vs. Vertical Scaling')).toBeVisible();
      await expect(page.locator('text=CAP Theorem and Consistency Tradeoffs')).toBeVisible();
      await expect(page.locator('text=Designing Gather for 100K Users')).toBeVisible();
      await expect(page.locator('text=Gather Architecture Review')).toBeVisible();
    });

    test('free preview badge appears on first lesson', async ({ page }) => {
      const freePreviewBadge = page.locator('text=Free Preview').first();
      await expect(freePreviewBadge).toBeVisible();
    });

    test('prerequisites section displays course requirements', async ({ page }) => {
      await expect(page.locator('text=Full-Stack Python course')).toBeVisible();
      await expect(page.locator('text=Docker')).toBeVisible();
    });

    test('user can navigate back to catalog from detail page', async ({ page }) => {
      const backLink = page.locator('a', { hasText: /back to courses/i });
      await expect(backLink).toBeVisible();
      await backLink.click();
      await expect(page).toHaveURL('/courses');
    });
  });

  test.describe('Free Preview Lesson (Unauthenticated)', () => {
    test('directly accessing free preview lesson redirects to login with return URL', async ({ page }) => {
      // Middleware protects all /learn routes, even free preview
      await page.goto(FREE_PREVIEW_LESSON_PATH);

      await expect(page).toHaveURL(/\/auth\/login/);
      const url = new URL(page.url());
      expect(url.searchParams.get('next')).toBe(FREE_PREVIEW_LESSON_PATH);
    });

    test('directly accessing lesson URL redirects to login', async ({ page }) => {
      await page.goto(FREE_PREVIEW_LESSON_PATH);
      await expect(page).toHaveURL(/\/auth\/login/);
      const url = new URL(page.url());
      expect(url.searchParams.get('next')).toBe(FREE_PREVIEW_LESSON_PATH);
    });

    test('non-preview lesson also redirects to login', async ({ page }) => {
      const protectedPath = `/courses/${COURSE_SLUG}/learn/02-database-performance/01-query-performance-with-explain-analyze`;
      await page.goto(protectedPath);
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test.describe('Auth Flow', () => {
    test('login page has Slack OAuth button and email/password form', async ({ page }) => {
      await page.goto('/auth/login');

      // Page title
      await expect(page.locator('h1')).toContainText('Welcome Back');

      // Wait for client hydration, then check Slack button
      const slackButton = page.getByRole('button', { name: /sign in with slack/i });
      await expect(slackButton).toBeVisible({ timeout: 10000 });

      // Email/password form
      await expect(page.locator('input#email')).toBeVisible();
      await expect(page.locator('input#password')).toBeVisible();

      // Submit button
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Link to signup (use the in-page link, not nav)
      await expect(page.getByRole('link', { name: 'Sign up', exact: true })).toBeVisible();
    });

    test('signup page has Slack OAuth button and registration form', async ({ page }) => {
      await page.goto('/auth/signup');

      // Page title
      await expect(page.locator('h1')).toContainText('Create Your Account');

      // Wait for client hydration, then check Slack button
      const slackButton = page.getByRole('button', { name: /sign up with slack/i });
      await expect(slackButton).toBeVisible({ timeout: 10000 });

      // Registration form with name, email, password
      await expect(page.locator('input#fullName')).toBeVisible();
      await expect(page.locator('input#email')).toBeVisible();
      await expect(page.locator('input#password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();

      // Link to login (use the in-page link, not nav)
      await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
    });

    test('user navigates from login to signup and back', async ({ page }) => {
      await page.goto('/auth/login');

      // Click the in-page "Sign up" link (not nav)
      await page.getByRole('link', { name: 'Sign up', exact: true }).click();
      await expect(page).toHaveURL('/auth/signup');
      await expect(page.locator('h1')).toContainText('Create Your Account');

      // Click the in-page "Sign in" link (not nav)
      await page.getByRole('link', { name: 'Sign in', exact: true }).click();
      await expect(page).toHaveURL('/auth/login');
      await expect(page.locator('h1')).toContainText('Welcome Back');
    });

    test('course detail enrollment button leads to auth for unauthenticated user', async ({ page }) => {
      await page.goto(COURSE_URL);

      const enrollButton = page.locator('.sticky').locator('a, button', { hasText: /enroll|purchase|start|buy/i }).first();
      await expect(enrollButton).toBeVisible();
      await enrollButton.click();

      // Should end up at auth or checkout page
      await expect(page).toHaveURL(/\/auth\/(login|signup)|\/checkout\//);
    });
  });

  test.describe('Checkout (Unauthenticated)', () => {
    test('direct checkout URL shows login prompt or redirects', async ({ page }) => {
      await page.goto(`/checkout/${COURSE_SLUG}`);

      // Checkout page may render with a login prompt, or it may redirect
      const url = page.url();
      const onAuthPage = url.includes('/auth/login');
      const hasLoginPrompt = await page.locator('a[href*="login"], a[href*="signup"]').first().isVisible().catch(() => false);
      expect(onAuthPage || hasLoginPrompt).toBeTruthy();
    });
  });

  test.describe('Navigation', () => {
    test('nav shows courses link and auth state for unauthenticated user', async ({ page }) => {
      await page.goto('/courses');
      const nav = page.locator('nav');
      await expect(nav.locator('a[href="/courses"]')).toBeVisible();
      await expect(nav.getByText('Log In')).toBeVisible();
    });

    test('full browse flow: catalog to course detail and back', async ({ page }) => {
      await page.goto('/courses');
      await page.locator(`a[href="${COURSE_URL}"]`).click();
      await expect(page).toHaveURL(COURSE_URL);

      await page.locator('a', { hasText: /back to courses/i }).click();
      await expect(page).toHaveURL('/courses');
    });

    test('dashboard redirects unauthenticated user to login', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test.describe('Content Integrity', () => {
    test('module 02 shows database performance lessons', async ({ page }) => {
      await page.goto(COURSE_URL);
      await expect(page.locator('text=Query Performance with EXPLAIN ANALYZE')).toBeVisible();
      await expect(page.locator('text=Indexing Strategies')).toBeVisible();
      await expect(page.locator('text=Connection Pooling with PgBouncer')).toBeVisible();
      await expect(page.locator('text=Database Migrations Without Downtime')).toBeVisible();
      await expect(page.locator('text=Read Replicas and Query Routing')).toBeVisible();
    });

    test('module 03 shows background jobs lessons', async ({ page }) => {
      await page.goto(COURSE_URL);
      await expect(page.locator('text=Why Synchronous Is Not Enough')).toBeVisible();
      await expect(page.locator('text=Celery Fundamentals')).toBeVisible();
      await expect(page.locator('text=Monitoring Celery with Flower')).toBeVisible();
    });

    test('module 10 capstone shows final lessons and project', async ({ page }) => {
      await page.goto(COURSE_URL);
      await expect(page.locator('text=System Design Interview Practice')).toBeVisible();
      await expect(page.locator('text=Load Testing and Capacity Planning')).toBeVisible();
      await expect(page.locator('text=Production Launch Checklist')).toBeVisible();
      await expect(page.locator('text=Production Launch').first()).toBeVisible();
    });
  });
});
