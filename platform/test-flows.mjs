import { chromium } from 'playwright';

const BASE = 'https://localhost:3000';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  // Enable console logging from the browser
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
  });

  console.log('\n=== TEST 1: Homepage loads ===');
  const homeRes = await page.goto(BASE);
  console.log('Status:', homeRes.status());
  console.log('Title:', await page.title());

  console.log('\n=== TEST 2: Login page loads ===');
  await page.goto(`${BASE}/auth/login`);
  const hasSlackBtn = await page.locator('text=Sign in with Slack').count();
  const hasEmailForm = await page.locator('input[type="email"]').count();
  console.log('Has Slack button:', hasSlackBtn > 0);
  console.log('Has email form:', hasEmailForm > 0);

  console.log('\n=== TEST 3: Sign in with email/password (Slack-created account) ===');
  // Use the password that was set during Slack OAuth signup
  const email = 'jackson.t.devin@gmail.com';
  // Password format from the Slack auth route: slack_${slackUserId}_${wbbTeamId}
  // We need to find the slack user ID. Let's try a direct Supabase admin login instead.

  // First, let's try the Supabase service role to get the user's slack ID
  const { createClient } = await import('@supabase/supabase-js');
  const dotenv = await import('fs').then(fs => fs.readFileSync('/Users/devinjackson/projects/webuildblack/platform/.env.local', 'utf8'));
  const env = Object.fromEntries(dotenv.split('\n').filter(l => l && !l.startsWith('#')).map(l => l.split('=')));

  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await sb.from('profiles').select('*').eq('email', email).single();
  console.log('Profile from DB:', JSON.stringify(profile, null, 2));

  const slackUserId = profile?.slack_user_id;
  const password = `slack_${slackUserId}_${env.WBB_SLACK_TEAM_ID}`;
  console.log('Trying password pattern: slack_<slackId>_<teamId>');

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForTimeout(3000);
  console.log('Current URL after login:', page.url());

  // Check if we're on dashboard
  if (page.url().includes('/dashboard')) {
    console.log('Login SUCCESS - redirected to dashboard');
  } else {
    // Check for error message
    const errorText = await page.locator('.bg-red-50').textContent().catch(() => 'none');
    console.log('Login FAILED - error:', errorText);
    console.log('Page content:', await page.locator('main').textContent().catch(() => 'could not read'));
  }

  console.log('\n=== TEST 4: Dashboard content ===');
  await page.goto(`${BASE}/dashboard`);
  await page.waitForTimeout(2000);
  const currentUrl = page.url();
  console.log('Dashboard URL:', currentUrl);

  if (currentUrl.includes('/auth/login')) {
    console.log('REDIRECTED to login - user NOT authenticated');
  } else {
    const mainContent = await page.locator('main').textContent();
    console.log('Has "My Courses":', mainContent.includes('My Courses'));
    console.log('Has "No Courses Yet":', mainContent.includes('No Courses Yet'));
    console.log('Has "intro-to-web-dev" or "Introduction to Web Development":',
      mainContent.includes('Introduction to Web Development'));
    console.log('Has WBB Member badge:', mainContent.includes('WBB Member'));

    // Check cookies
    const cookies = await context.cookies();
    const sbCookies = cookies.filter(c => c.name.includes('supabase') || c.name.includes('sb-'));
    console.log('Supabase cookies:', sbCookies.map(c => `${c.name} (${c.value.substring(0,20)}...)`));
  }

  console.log('\n=== TEST 5: Course detail page ===');
  await page.goto(`${BASE}/courses/intro-to-web-dev`);
  await page.waitForTimeout(2000);
  const courseContent = await page.locator('main').textContent().catch(() => 'ERROR');
  console.log('Has "Enrolled":', courseContent.includes('Enrolled'));
  console.log('Has "Start Learning":', courseContent.includes('Start Learning'));
  console.log('Has "Enroll Now":', courseContent.includes('Enroll Now'));
  console.log('Has "Enroll for Free":', courseContent.includes('Enroll for Free'));

  // Check for errors
  const errorOverlay = await page.locator('text=Unhandled Runtime Error').count();
  console.log('Has runtime error:', errorOverlay > 0);
  if (errorOverlay > 0) {
    const errorMsg = await page.locator('[role="dialog"], .nextjs-container-errors-body').textContent().catch(() => 'could not read');
    console.log('Error:', errorMsg);
  }

  await browser.close();
  console.log('\n=== DONE ===');
})();
