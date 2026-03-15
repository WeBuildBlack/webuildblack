import { test, expect, type Page } from '@playwright/test';
import {
  seedTestData,
  seedInProgressCohort,
  seedRegistration,
  seedWeeklyUpdate,
  teardownTestData,
  getServiceClient,
  TEST_SLUG,
  TEST_COHORT_SLUG,
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  ADMIN_API_KEY,
  APP_URL,
} from './helpers/seed-programs';

let testUserId: string;
let openCohortId: string;
let inProgressCohortId: string;
let inProgressSlug: string;

// ----------------------------------------------------------------
// SETUP & TEARDOWN
// ----------------------------------------------------------------

test.beforeAll(async () => {
  const { userId, cohort } = await seedTestData();
  testUserId = userId;
  openCohortId = cohort.id;

  const ip = await seedInProgressCohort();
  inProgressCohortId = ip.cohort.id;
  inProgressSlug = ip.inProgressSlug;
});

test.afterAll(async () => {
  await teardownTestData();
});

// ----------------------------------------------------------------
// HELPER: log in as test user
// ----------------------------------------------------------------

async function loginAsTestUser(page: Page) {
  await page.goto('/auth/login');
  await page.fill('input#email', TEST_USER_EMAIL);
  await page.fill('input#password', TEST_USER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

// ================================================================
// 1. NAVIGATION
// ================================================================

test.describe('Navigation', () => {
  test('nav bar shows Programs link', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    const programsLink = nav.locator('a[href="/programs"]');
    await expect(programsLink).toBeVisible();
    await expect(programsLink).toHaveText('Programs');
  });

  test('mobile nav shows Programs link', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    // Open hamburger
    await page.click('button[aria-label="Toggle menu"]');
    const mobileMenu = page.locator('.md\\:hidden').last();
    const programsLink = mobileMenu.locator('a[href="/programs"]');
    await expect(programsLink).toBeVisible();
  });

  test('Programs link navigates to /programs', async ({ page }) => {
    await page.goto('/');
    await page.click('nav a[href="/programs"]');
    await expect(page).toHaveURL('/programs');
  });
});

// ================================================================
// 2. PROGRAMS LISTING PAGE (unauthenticated)
// ================================================================

test.describe('Programs Page (Unauthenticated)', () => {
  test('renders page with heading and description', async ({ page }) => {
    await page.goto('/programs');
    await expect(page.locator('h1')).toContainText('Programs');
    await expect(page.locator('text=Structured programs')).toBeVisible();
  });

  test('displays test program card with correct info', async ({ page }) => {
    await page.goto('/programs');
    const card = page.locator(`a[href="/programs/${TEST_SLUG}"]`);
    await expect(card).toBeVisible();
    await expect(card).toContainText('E2E Test Program');
    await expect(card).toContainText('8 weeks');
    await expect(card).toContainText('Free');
  });

  test('shows Registration Open badge for open cohort', async ({ page }) => {
    await page.goto('/programs');
    const card = page.locator(`a[href="/programs/${TEST_SLUG}"]`);
    await expect(card.locator('text=Registration Open')).toBeVisible();
  });

  test('program card links to detail page', async ({ page }) => {
    await page.goto('/programs');
    await page.click(`a[href="/programs/${TEST_SLUG}"]`);
    await expect(page).toHaveURL(`/programs/${TEST_SLUG}`);
  });
});

// ================================================================
// 3. PROGRAM DETAIL PAGE (unauthenticated)
// ================================================================

test.describe('Program Detail Page (Unauthenticated)', () => {
  test('displays program name and description', async ({ page }) => {
    await page.goto(`/programs/${TEST_SLUG}`);
    await expect(page.locator('h1')).toContainText('E2E Test Program');
    await expect(page.locator('text=A test program for automated e2e tests')).toBeVisible();
  });

  test('shows program metadata badges', async ({ page }) => {
    await page.goto(`/programs/${TEST_SLUG}`);
    await expect(page.locator('text=8 weeks')).toBeVisible();
    await expect(page.locator('text=Free for WBB members')).toBeVisible();
    await expect(page.locator('text=30 spots per cohort')).toBeVisible();
  });

  test('shows cohort info with dates and status', async ({ page }) => {
    await page.goto(`/programs/${TEST_SLUG}`);
    await expect(page.locator('text=Registration Open')).toBeVisible();
    // Should show spots like "X / 30"
    await expect(page.locator('text=/\\d+ \\/ 30/')).toBeVisible();
  });

  test('shows Sign in with Slack button for unauthenticated users', async ({ page }) => {
    await page.goto(`/programs/${TEST_SLUG}`);
    await expect(page.locator('text=Sign in with your WBB Slack account')).toBeVisible();
    await expect(page.locator('a', { hasText: 'Sign in with Slack' })).toBeVisible();
  });

  test('shows cohort schedule section', async ({ page }) => {
    await page.goto(`/programs/${TEST_SLUG}`);
    await expect(page.locator('text=Cohort Schedule')).toBeVisible();
    // Verify the schedule card exists with the season and kickoff date
    await expect(page.locator('text=Kickoff:').first()).toBeVisible();
  });

  test('back link returns to programs listing', async ({ page }) => {
    await page.goto(`/programs/${TEST_SLUG}`);
    await page.locator('a', { hasText: 'All Programs' }).click();
    await expect(page).toHaveURL('/programs');
  });

  test('nonexistent program shows not found', async ({ page }) => {
    await page.goto('/programs/does-not-exist-xyz');
    await expect(page.locator('text=Program Not Found')).toBeVisible();
  });
});

// ================================================================
// 4. AUTH GATING
// ================================================================

test.describe('Auth Gating', () => {
  test('weekly updates page redirects unauthenticated user to login', async ({ page }) => {
    await page.goto(`/programs/${TEST_SLUG}/updates`);
    await expect(page).toHaveURL(/\/auth\/login/);
    const url = new URL(page.url());
    expect(url.searchParams.get('next')).toBe(`/programs/${TEST_SLUG}/updates`);
  });

  test('specific week page redirects unauthenticated user to login', async ({ page }) => {
    await page.goto(`/programs/${TEST_SLUG}/updates/1`);
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

// ================================================================
// 5. REGISTRATION FLOW (authenticated WBB member)
// ================================================================

test.describe('Registration Flow', () => {
  test('authenticated WBB member sees registration form on detail page', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto(`/programs/${TEST_SLUG}`);

    // Should see the registration form (not Slack prompt)
    await expect(page.locator('text=Register for')).toBeVisible();
    await expect(page.locator('select')).toBeVisible(); // target_role select
    await expect(page.locator('button[type="submit"]', { hasText: 'Register' })).toBeVisible();
  });

  test('submitting registration form succeeds and shows confirmation', async ({ page }) => {
    // Clean up any existing registration first
    const sb = getServiceClient();
    await sb.from('cohort_registrations').delete()
      .eq('user_id', testUserId)
      .eq('cohort_id', openCohortId);

    await loginAsTestUser(page);
    await page.goto(`/programs/${TEST_SLUG}`);

    // Fill form
    await page.selectOption('select', 'frontend');
    await page.click('button[type="submit"]', { hasText: 'Register' });

    // Wait for success
    await expect(page.locator('text=You\'re Registered')).toBeVisible({ timeout: 10000 });
  });

  test('already-registered user sees registered status instead of form', async ({ page }) => {
    // Ensure registration exists
    await seedRegistration(testUserId, openCohortId);

    await loginAsTestUser(page);
    await page.goto(`/programs/${TEST_SLUG}`);

    await expect(page.locator('text=You\'re Registered')).toBeVisible();
    // Should NOT see the registration form
    await expect(page.locator('button[type="submit"]', { hasText: 'Register' })).not.toBeVisible();
  });

  test('registration data is persisted in database', async ({ page }) => {
    const sb = getServiceClient();
    const { data: reg } = await sb
      .from('cohort_registrations')
      .select('*')
      .eq('user_id', testUserId)
      .eq('cohort_id', openCohortId)
      .single();

    expect(reg).toBeTruthy();
    expect(reg.registration_data.target_role).toBe('frontend');
    expect(reg.status).toMatch(/registered|active/);
  });
});

// ================================================================
// 6. REGISTRATION API VALIDATION
// ================================================================

test.describe('Registration API', () => {
  test('rejects unauthenticated request', async ({ request }) => {
    const res = await request.post(`/api/programs/${TEST_SLUG}/register`, {
      data: { registration_data: { target_role: 'frontend' } },
    });
    expect(res.status()).toBe(401);
  });

  test('rejects duplicate registration', async ({ page }) => {
    await seedRegistration(testUserId, openCohortId);
    await loginAsTestUser(page);

    const res = await page.evaluate(async (slug) => {
      const r = await fetch(`/api/programs/${slug}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_data: { target_role: 'backend' } }),
      });
      return { status: r.status, body: await r.json() };
    }, TEST_SLUG);

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Already registered');
  });
});

// ================================================================
// 7. WEEKLY UPDATES FLOW (authenticated, in-progress cohort)
// ================================================================

test.describe('Weekly Updates Flow', () => {
  test.beforeAll(async () => {
    // Register test user for the in-progress cohort with active status and pod
    await seedRegistration(testUserId, inProgressCohortId, 'frontend');
  });

  test('updates page renders form for current week', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto(`/programs/${TEST_SLUG}/updates`);

    await expect(page.locator('h1')).toContainText('Weekly Updates');
    // Progress summary cards
    await expect(page.locator('text=current week')).toBeVisible();
    await expect(page.locator('text=pod meetings attended')).toBeVisible();
    // Form fields from update_fields
    await expect(page.locator('text=DSA Problems Practiced')).toBeVisible();
    await expect(page.locator('text=Mock Interviews')).toBeVisible();
    await expect(page.locator('text=Applications Sent')).toBeVisible();
    await expect(page.locator('text=Attended Pod Meeting This Week?')).toBeVisible();
    await expect(page.locator('text=Focus This Week')).toBeVisible();
    await expect(page.locator('text=Confidence (1-5)')).toBeVisible();
    await expect(page.locator('text=Blockers')).toBeVisible();
    await expect(page.locator('text=Wins')).toBeVisible();
    // Submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows pod assignment in header', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto(`/programs/${TEST_SLUG}/updates`);
    await expect(page.locator('text=Pod:')).toBeVisible();
    await expect(page.locator('text=frontend')).toBeVisible();
  });

  test('submitting weekly update succeeds', async ({ page }) => {
    // Clean any existing update for this week
    const sb = getServiceClient();
    await sb.from('weekly_updates').delete()
      .eq('user_id', testUserId)
      .eq('cohort_id', inProgressCohortId);

    await loginAsTestUser(page);
    await page.goto(`/programs/${TEST_SLUG}/updates`);

    // Fill form fields
    // Number inputs
    const dsaInput = page.locator('label:has-text("DSA Problems Practiced") + input, label:has-text("DSA Problems Practiced") ~ input').first();
    await dsaInput.fill('5');

    const mocksInput = page.locator('label:has-text("Mock Interviews") + input, label:has-text("Mock Interviews") ~ input').first();
    await mocksInput.fill('2');

    const appsInput = page.locator('label:has-text("Applications Sent") + input, label:has-text("Applications Sent") ~ input').first();
    await appsInput.fill('10');

    // Checkbox: pod meeting
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.check();

    // Select: focus
    const focusSelect = page.locator('select').first();
    await focusSelect.selectOption('DSA');

    // Rating: confidence - click button "4"
    const ratingBtn = page.locator('button:has-text("4")').first();
    await ratingBtn.click();

    // Textareas
    const textareas = page.locator('textarea');
    await textareas.nth(0).fill('Struggling with system design');
    await textareas.nth(1).fill('Got a callback from Google!');

    // Submit
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Weekly update saved')).toBeVisible({ timeout: 10000 });
  });

  test('submitted update appears in history timeline', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto(`/programs/${TEST_SLUG}/updates`);

    // History section should show the update
    await expect(page.locator('text=Update History')).toBeVisible();
    // Check activity summary snippets (values may have been edited by prior test)
    const historySection = page.locator('text=Update History').locator('..');
    await expect(historySection.locator('a').first()).toBeVisible();
  });

  test('update data is persisted correctly in database', async ({ page }) => {
    const sb = getServiceClient();
    const { data: updates } = await sb
      .from('weekly_updates')
      .select('*')
      .eq('user_id', testUserId)
      .eq('cohort_id', inProgressCohortId)
      .order('week_number', { ascending: false });

    expect(updates).toBeTruthy();
    expect(updates!.length).toBeGreaterThanOrEqual(1);

    // Find the update from the submit test (most recent)
    const update = updates![0];
    expect(update.data).toBeTruthy();
    // Check that numeric fields are present and reasonable
    expect(typeof update.data.dsa_problems).toBe('number');
    expect(typeof update.data.applications_sent).toBe('number');
    expect(update.data.pod_meeting_attended).toBe(true);
    expect(update.data.focus).toBe('DSA');
    expect(update.data.confidence).toBe(4);
    expect(update.data.blockers).toContain('system design');
    expect(update.data.wins).toContain('Google');
  });

  test('re-submitting same week edits rather than duplicates', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto(`/programs/${TEST_SLUG}/updates`);

    // The form should be pre-filled with previous data
    // Change DSA to 8
    const dsaInput = page.locator('label:has-text("DSA Problems Practiced") + input, label:has-text("DSA Problems Practiced") ~ input').first();
    await dsaInput.fill('8');

    await page.click('button[type="submit"]');
    await expect(page.locator('text=Weekly update saved')).toBeVisible({ timeout: 10000 });

    // Verify only one update exists for this week
    const sb = getServiceClient();
    const { data: updates } = await sb
      .from('weekly_updates')
      .select('*')
      .eq('user_id', testUserId)
      .eq('cohort_id', inProgressCohortId);

    expect(updates!.length).toBe(1);
    expect(updates![0].data.dsa_problems).toBe(8);
  });

  test('week detail page shows submitted data', async ({ page }) => {
    // Seed a specific week update
    await seedWeeklyUpdate(testUserId, inProgressCohortId, 1, {
      dsa_problems: 3,
      mock_interviews: 1,
      applications_sent: 5,
      confidence: 4,
      wins: 'Phone screen went great',
    });

    await loginAsTestUser(page);
    await page.goto(`/programs/${TEST_SLUG}/updates/1`);

    await expect(page.locator('h1')).toContainText('Week 1 Update');
    await expect(page.locator('text=Phone screen went great')).toBeVisible();
    // Back link
    await expect(page.locator('a', { hasText: 'All Updates' })).toBeVisible();
  });
});

// ================================================================
// 8. WEEKLY UPDATES API VALIDATION
// ================================================================

test.describe('Weekly Updates API', () => {
  test('rejects unauthenticated request', async ({ request }) => {
    const res = await request.post(`/api/programs/${TEST_SLUG}/updates`, {
      data: { week_number: 0, data: { dsa_problems: 1 } },
    });
    expect(res.status()).toBe(401);
  });

  test('GET returns user updates', async ({ page }) => {
    await loginAsTestUser(page);

    const res = await page.evaluate(async (slug) => {
      const r = await fetch(`/api/programs/${slug}/updates`);
      return { status: r.status, body: await r.json() };
    }, TEST_SLUG);

    expect(res.status).toBe(200);
    expect(res.body.updates).toBeDefined();
    expect(Array.isArray(res.body.updates)).toBe(true);
  });
});

// ================================================================
// 9. DASHBOARD: MY PROGRAMS SECTION
// ================================================================

test.describe('Dashboard - My Programs', () => {
  test('shows active program registration on dashboard', async ({ page }) => {
    // Clean up open cohort registration (from Registration Flow tests) so only in-progress remains
    const sb = getServiceClient();
    await sb.from('cohort_registrations').delete()
      .eq('user_id', testUserId)
      .eq('cohort_id', openCohortId);

    // Ensure fresh active registration for in-progress cohort
    await sb.from('cohort_registrations')
      .upsert({
        user_id: testUserId,
        cohort_id: inProgressCohortId,
        registration_data: { target_role: 'frontend' },
        status: 'active',
        pod: 'frontend',
      }, { onConflict: 'user_id,cohort_id' });

    await loginAsTestUser(page);
    await expect(page).toHaveURL(/\/dashboard/);

    await expect(page.locator('text=My Programs')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'E2E Test Program' })).toBeVisible();
    await expect(page.locator('text=Pod:').first()).toBeVisible();
  });

  test('dashboard shows Weekly Update button for in-progress cohort', async ({ page }) => {
    await loginAsTestUser(page);
    // Wait for dashboard to fully load
    await expect(page.locator('text=My Programs')).toBeVisible({ timeout: 10000 });
    const updateBtn = page.locator('a', { hasText: 'Weekly Update' }).first();
    await expect(updateBtn).toBeVisible({ timeout: 10000 });
    await updateBtn.click();
    await expect(page).toHaveURL(`/programs/${TEST_SLUG}/updates`);
  });

  test('dashboard shows Explore Programs link when no programs', async ({ page }) => {
    // Temporarily remove registrations
    const sb = getServiceClient();
    await sb.from('cohort_registrations').delete().eq('user_id', testUserId);

    await loginAsTestUser(page);
    await expect(page.locator('a', { hasText: 'Explore Programs' })).toBeVisible();

    // Restore
    await seedRegistration(testUserId, inProgressCohortId, 'frontend');
  });
});

// ================================================================
// 10. ADMIN API ENDPOINTS
// ================================================================

test.describe('Admin API', () => {
  const headers = {
    Authorization: `Bearer ${ADMIN_API_KEY}`,
    'Content-Type': 'application/json',
  };

  test('GET /api/admin/programs returns programs list', async ({ request }) => {
    const res = await request.get('/api/admin/programs', { headers });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.programs).toBeDefined();
    const testProg = body.programs.find((p: any) => p.slug === TEST_SLUG);
    expect(testProg).toBeTruthy();
    expect(testProg.name).toBe('E2E Test Program');
  });

  test('GET /api/admin/programs/[slug] returns program with cohorts', async ({ request }) => {
    const res = await request.get(`/api/admin/programs/${TEST_SLUG}`, { headers });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.program.slug).toBe(TEST_SLUG);
    expect(body.cohorts).toBeDefined();
    expect(body.cohorts.length).toBeGreaterThanOrEqual(1);
  });

  test('PUT /api/admin/programs/[slug] updates program', async ({ request }) => {
    const res = await request.put(`/api/admin/programs/${TEST_SLUG}`, {
      headers,
      data: { description: 'Updated by e2e test' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.program.description).toBe('Updated by e2e test');

    // Restore
    await request.put(`/api/admin/programs/${TEST_SLUG}`, {
      headers,
      data: { description: 'A test program for automated e2e tests.' },
    });
  });

  test('GET /api/admin/cohorts returns cohorts list', async ({ request }) => {
    const res = await request.get('/api/admin/cohorts', { headers });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.cohorts).toBeDefined();
    const testCohort = body.cohorts.find((c: any) => c.slug === TEST_COHORT_SLUG);
    expect(testCohort).toBeTruthy();
    expect(testCohort.registration_count).toBeDefined();
  });

  test('GET /api/admin/cohorts?status=open filters by status', async ({ request }) => {
    const res = await request.get('/api/admin/cohorts?status=open', { headers });
    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const c of body.cohorts) {
      expect(c.status).toBe('open');
    }
  });

  test('GET /api/admin/cohorts/[slug] returns single cohort', async ({ request }) => {
    const res = await request.get(`/api/admin/cohorts/${TEST_COHORT_SLUG}`, { headers });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.cohort.slug).toBe(TEST_COHORT_SLUG);
    expect(body.cohort.registration_count).toBeDefined();
  });

  test('GET /api/admin/cohorts/[slug]/registrations returns registrations', async ({ request }) => {
    // Ensure at least one registration
    await seedRegistration(testUserId, openCohortId);

    const res = await request.get(`/api/admin/cohorts/${TEST_COHORT_SLUG}/registrations`, { headers });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.registrations).toBeDefined();
    expect(body.registrations.length).toBeGreaterThanOrEqual(1);
    // Should include profile data
    const reg = body.registrations[0];
    expect(reg.profiles).toBeDefined();
    expect(reg.profiles.email).toBeTruthy();
  });

  test('GET /api/admin/cohorts/[slug]/updates returns weekly updates', async ({ request }) => {
    const res = await request.get(`/api/admin/cohorts/${inProgressSlug}/updates`, { headers });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.updates).toBeDefined();
    expect(Array.isArray(body.updates)).toBe(true);
  });

  test('admin endpoints reject requests without API key', async ({ request }) => {
    const endpoints = [
      '/api/admin/programs',
      `/api/admin/programs/${TEST_SLUG}`,
      '/api/admin/cohorts',
      `/api/admin/cohorts/${TEST_COHORT_SLUG}`,
      `/api/admin/cohorts/${TEST_COHORT_SLUG}/registrations`,
      `/api/admin/cohorts/${TEST_COHORT_SLUG}/updates`,
    ];

    for (const url of endpoints) {
      const res = await request.get(url);
      expect(res.status()).toBe(401);
    }
  });
});

// ================================================================
// 11. PROGRAM CREATION VIA ADMIN API
// ================================================================

test.describe('Admin Program Creation', () => {
  const CREATE_SLUG = 'e2e-admin-created';
  const headers = {
    Authorization: `Bearer ${ADMIN_API_KEY}`,
    'Content-Type': 'application/json',
  };

  test.afterAll(async () => {
    const sb = getServiceClient();
    await sb.from('cohorts').delete().like('slug', `${CREATE_SLUG}%`);
    await sb.from('programs').delete().eq('slug', CREATE_SLUG);
  });

  test('POST /api/admin/programs creates a new program', async ({ request }) => {
    const res = await request.post('/api/admin/programs', {
      headers,
      data: {
        slug: CREATE_SLUG,
        name: 'Admin Created Program',
        description: 'Created via admin API in e2e test.',
        duration_weeks: 4,
        capacity_per_cohort: 15,
        registration_fields: [
          { key: 'experience', label: 'Experience Level', type: 'select', required: true, options: ['junior', 'mid', 'senior'] },
        ],
        update_fields: [
          { key: 'hours_studied', label: 'Hours Studied', type: 'number', default: 0 },
        ],
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.program.slug).toBe(CREATE_SLUG);
    expect(body.program.name).toBe('Admin Created Program');
    expect(body.program.registration_fields).toHaveLength(1);
    expect(body.program.update_fields).toHaveLength(1);
  });

  test('newly created program appears on /programs page', async ({ page }) => {
    await page.goto('/programs');
    await expect(page.locator(`a[href="/programs/${CREATE_SLUG}"]`)).toBeVisible();
    await expect(page.locator('text=Admin Created Program')).toBeVisible();
  });
});
