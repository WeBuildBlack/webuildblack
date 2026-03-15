import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const dotenv = fs.readFileSync('/Users/devinjackson/projects/webuildblack/platform/.env.local', 'utf8');
const env = Object.fromEntries(dotenv.split('\n').filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0,i), l.slice(i+1)]; }));

const BASE = 'https://localhost:3000';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  // Login first
  await page.goto(`${BASE}/auth/login`);
  await page.fill('input[type="email"]', 'jackson.t.devin@gmail.com');
  await page.fill('input[type="password"]', `slack_U3DT6TQK0_T3D5CD091`);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('Logged in, URL:', page.url());

  // Get the auth cookie
  const cookies = await context.cookies();
  const authCookie = cookies.find(c => c.name.includes('auth-token'));
  console.log('Auth cookie exists:', !!authCookie);
  console.log('Auth cookie value preview:', authCookie?.value?.substring(0, 50));

  // Now test the API directly - call the enroll endpoint
  console.log('\n=== Test /api/enroll ===');
  const enrollRes = await page.evaluate(async (slug) => {
    const res = await fetch('/api/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseSlug: slug }),
    });
    return { status: res.status, body: await res.json() };
  }, 'intro-to-web-dev');
  console.log('Enroll response:', JSON.stringify(enrollRes));

  // Test what the server-side Supabase client sees
  // Create a debug API route by hitting dashboard and checking server logs
  console.log('\n=== Test dashboard data via API ===');

  // Use service role to check enrollments with join
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Test: does the anon key + auth token work for enrollment query?
  const sbAnon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // Extract the access token from cookie
  let accessToken = null;
  if (authCookie) {
    try {
      const decoded = Buffer.from(authCookie.value.replace('base64-', ''), 'base64').toString();
      const parsed = JSON.parse(decoded);
      accessToken = parsed.access_token;
      console.log('Access token found:', !!accessToken);
    } catch(e) {
      console.log('Could not parse auth cookie:', e.message);
    }
  }

  if (accessToken) {
    // Set the session on the anon client
    await sbAnon.auth.setSession({ access_token: accessToken, refresh_token: 'dummy' });
    const { data: { user } } = await sbAnon.auth.getUser(accessToken);
    console.log('User from anon client:', user?.id, user?.email);

    // Test enrollment query as the user would see it
    const { data: enrollments, error: enrollErr } = await sbAnon
      .from('enrollments')
      .select('*, courses(slug)')
      .eq('user_id', user.id);
    console.log('Enrollments (anon):', JSON.stringify(enrollments));
    console.log('Enrollment error:', enrollErr);

    // Test profile query
    const { data: profile, error: profErr } = await sbAnon
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    console.log('Profile (anon):', JSON.stringify(profile));
    console.log('Profile error:', profErr);

    // Test enrollment without join
    const { data: enrollNoJoin, error: enrollNoJoinErr } = await sbAnon
      .from('enrollments')
      .select('*')
      .eq('user_id', user.id);
    console.log('Enrollments without join (anon):', JSON.stringify(enrollNoJoin));
    console.log('Enrollment no-join error:', enrollNoJoinErr);
  }

  await browser.close();
  console.log('\n=== DONE ===');
})();
