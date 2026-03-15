import { test, expect } from '@playwright/test';

const COURSE_SLUG = 'ai-engineering-for-web-devs';
const COURSE_URL = `/courses/${COURSE_SLUG}`;
const FREE_PREVIEW_LESSON_PATH = `/courses/${COURSE_SLUG}/learn/01-llm-fundamentals/01-what-are-large-language-models`;

test.describe('AI Engineering for Web Developers Course', () => {
  test.describe('Course Discovery', () => {
    test('user browses catalog and navigates to course', async ({ page }) => {
      await page.goto('/courses');

      const courseCard = page.locator(`a[href="${COURSE_URL}"]`);
      await expect(courseCard).toBeVisible();
      await expect(courseCard).toContainText('AI Engineering for Web Developers');

      await courseCard.click();
      await expect(page).toHaveURL(COURSE_URL);
      await expect(page.locator('h1')).toContainText('AI Engineering for Web Developers');
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
      await expect(sidebar.locator('text=Intermediate')).toBeVisible();
      await expect(sidebar.locator('text=Duration')).toBeVisible();
      await expect(sidebar.locator('text=Modules')).toBeVisible();
      await expect(sidebar.locator('text=Lessons')).toBeVisible();
      await expect(sidebar.getByText('$49')).toBeVisible();
    });

    test('shows all 10 modules in curriculum', async ({ page }) => {
      const moduleHeadings = [
        'LLM Fundamentals',
        'Prompt Engineering',
        'OpenAI API Deep Dive',
        'Anthropic API & Claude',
        'Building AI Features in Web Apps',
        'Embeddings & Vector Databases',
        'RAG from Scratch',
        'Deployment & Production',
      ];

      for (const heading of moduleHeadings) {
        await expect(page.locator(`text=${heading}`)).toBeVisible();
      }
      await expect(page.getByRole('heading', { name: /AI Agents/ })).toBeVisible();
      await expect(page.getByRole('heading', { name: /Capstone/ })).toBeVisible();
    });

    test('module 01 lists all lessons and project', async ({ page }) => {
      await expect(page.locator('text=What Are Large Language Models?')).toBeVisible();
      await expect(page.locator('text=Transformers Explained for Web Developers')).toBeVisible();
      await expect(page.locator('text=Tokens, Context Windows, and Pricing')).toBeVisible();
      await expect(page.locator('text=The Model Landscape: Choosing the Right LLM')).toBeVisible();
      await expect(page.locator('text=Model Showdown')).toBeVisible();
    });

    test('module 05 lists lessons and project', async ({ page }) => {
      await expect(page.locator('text=Architecture Patterns for AI Web Apps')).toBeVisible();
      await expect(page.locator('text=Building a Chat UI')).toBeVisible();
      await expect(page.locator('text=Streaming AI Responses to the Browser')).toBeVisible();
      await expect(page.locator('text=Error Handling & Resilience for AI Features')).toBeVisible();
      await expect(page.locator('text=AI Chat Widget')).toBeVisible();
    });

    test('free preview badge appears on first lesson', async ({ page }) => {
      const freePreviewBadge = page.locator('text=Free Preview').first();
      await expect(freePreviewBadge).toBeVisible();
    });

    test('user can navigate back to catalog from detail page', async ({ page }) => {
      const backLink = page.locator('a', { hasText: /back to courses/i });
      await expect(backLink).toBeVisible();
      await backLink.click();
      await expect(page).toHaveURL('/courses');
    });

    test('prerequisites section displays course requirements', async ({ page }) => {
      await expect(page.locator('text=JavaScript')).toBeVisible();
      await expect(page.locator('text=Python')).toBeVisible();
      await expect(page.locator('text=REST APIs')).toBeVisible();
      await expect(page.locator('text=HTML/CSS')).toBeVisible();
    });
  });

  test.describe('Auth Gating (Unauthenticated)', () => {
    test('directly accessing free preview lesson redirects to login with return URL', async ({ page }) => {
      await page.goto(FREE_PREVIEW_LESSON_PATH);

      await expect(page).toHaveURL(/\/auth\/login/);
      const url = new URL(page.url());
      expect(url.searchParams.get('next')).toBe(FREE_PREVIEW_LESSON_PATH);
    });

    test('non-preview lesson redirects to login', async ({ page }) => {
      const protectedPath = `/courses/${COURSE_SLUG}/learn/03-openai-api/01-chat-completions-api`;
      await page.goto(protectedPath);
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('dashboard redirects unauthenticated user to login', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test.describe('Auth Flow', () => {
    test('login page has Slack OAuth button and email/password form', async ({ page }) => {
      await page.goto('/auth/login');

      await expect(page.locator('h1')).toContainText('Welcome Back');

      const slackButton = page.getByRole('button', { name: /sign in with slack/i });
      await expect(slackButton).toBeVisible({ timeout: 10000 });

      await expect(page.locator('input#email')).toBeVisible();
      await expect(page.locator('input#password')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Sign up', exact: true })).toBeVisible();
    });

    test('signup page has Slack OAuth button and registration form', async ({ page }) => {
      await page.goto('/auth/signup');

      await expect(page.locator('h1')).toContainText('Create Your Account');

      const slackButton = page.getByRole('button', { name: /sign up with slack/i });
      await expect(slackButton).toBeVisible({ timeout: 10000 });

      await expect(page.locator('input#fullName')).toBeVisible();
      await expect(page.locator('input#email')).toBeVisible();
      await expect(page.locator('input#password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
    });

    test('user navigates from login to signup and back', async ({ page }) => {
      await page.goto('/auth/login');

      await page.getByRole('link', { name: 'Sign up', exact: true }).click();
      await expect(page).toHaveURL('/auth/signup');
      await expect(page.locator('h1')).toContainText('Create Your Account');

      await page.getByRole('link', { name: 'Sign in', exact: true }).click();
      await expect(page).toHaveURL('/auth/login');
      await expect(page.locator('h1')).toContainText('Welcome Back');
    });
  });

  test.describe('Enrollment/Checkout (Unauthenticated)', () => {
    test('enrollment button on detail page redirects to auth', async ({ page }) => {
      await page.goto(COURSE_URL);

      const enrollButton = page.locator('.sticky').locator('a, button', { hasText: /enroll|purchase|start|buy/i }).first();
      await expect(enrollButton).toBeVisible();
      await enrollButton.click();

      await expect(page).toHaveURL(/\/auth\/(login|signup)|\/checkout\//);
    });

    test('direct checkout URL shows login prompt or redirects', async ({ page }) => {
      await page.goto(`/checkout/${COURSE_SLUG}`);

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
  });

  test.describe('Content Integrity', () => {
    test('module 03 shows OpenAI API lessons', async ({ page }) => {
      await page.goto(COURSE_URL);
      await expect(page.locator('text=Chat Completions API')).toBeVisible();
      await expect(page.locator('text=Streaming Responses')).toBeVisible();
      await expect(page.locator('text=Function Calling & Tool Use')).toBeVisible();
      await expect(page.locator('text=Cost Management')).toBeVisible();
    });

    test('module 07 shows RAG lessons including frameworks', async ({ page }) => {
      await page.goto(COURSE_URL);
      await expect(page.locator('text=What Is RAG and Why It Matters')).toBeVisible();
      await expect(page.locator('text=Document Chunking Strategies')).toBeVisible();
      await expect(page.locator('text=Building a Retrieval Pipeline')).toBeVisible();
      await expect(page.locator('text=Evaluating RAG Systems')).toBeVisible();
      await expect(page.locator('text=RAG with LlamaIndex and LangChain')).toBeVisible();
    });

    test('module 08 shows agent lessons including frameworks', async ({ page }) => {
      await page.goto(COURSE_URL);
      await expect(page.locator('text=The ReAct Pattern')).toBeVisible();
      await expect(page.locator('text=Giving Agents Tools')).toBeVisible();
      await expect(page.locator('text=Agent Frameworks: LangGraph and CrewAI')).toBeVisible();
    });

    test('module 10 shows deployment lessons including eval and workflows', async ({ page }) => {
      await page.goto(COURSE_URL);
      await expect(page.locator('text=Managing LLM Costs in Production')).toBeVisible();
      await expect(page.locator('text=Caching Strategies for AI Applications')).toBeVisible();
      await expect(page.locator('text=Safety Guardrails for AI Applications')).toBeVisible();
      await expect(page.locator('text=Monitoring and Observability for AI Applications')).toBeVisible();
      await expect(page.locator('text=Prompt Evaluation with Langfuse')).toBeVisible();
      await expect(page.locator('text=Durable AI Workflows with Temporal')).toBeVisible();
      await expect(page.locator('text=Production Hardening')).toBeVisible();
    });
  });
});
