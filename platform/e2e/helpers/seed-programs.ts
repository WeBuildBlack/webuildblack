/**
 * Test seed helpers for program/cohort e2e tests.
 *
 * Uses the admin API and Supabase service role to create deterministic
 * test data before each suite and clean it up afterward.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local
const envPath = path.resolve(__dirname, '../../.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
for (const line of envFile.split('\n')) {
  if (!line || line.startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx === -1) continue;
  env[line.slice(0, idx)] = line.slice(idx + 1);
}

export const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
export const ADMIN_API_KEY = env.ADMIN_API_KEY;
export const APP_URL = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
export const WBB_SLACK_TEAM_ID = env.WBB_SLACK_TEAM_ID;

export function getServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// Unique suffix to avoid collision with real data
export const TEST_SLUG = 'e2e-test-program';
export const TEST_COHORT_SLUG = `${TEST_SLUG}-2026-spring`;
export const TEST_USER_EMAIL = 'e2e-programs-test@webuildblack.com';
export const TEST_USER_PASSWORD = 'e2e-test-password-2026!';

export const BRIDGE_REGISTRATION_FIELDS = [
  {
    key: 'target_role',
    label: 'Target Role',
    type: 'select',
    required: true,
    options: [
      { value: 'frontend', label: 'Frontend / Full-Stack Web' },
      { value: 'backend', label: 'Backend / Infrastructure' },
      { value: 'mobile', label: 'Mobile Development' },
      { value: 'data', label: 'Data (Analytics, Engineering, Science)' },
      { value: 'design', label: 'Design (UX/UI, Product Design)' },
      { value: 'product', label: 'Product / Program Management' },
    ],
  },
];

export const BRIDGE_UPDATE_FIELDS = [
  { key: 'dsa_problems', label: 'DSA Problems Practiced', type: 'number', default: 0 },
  { key: 'mock_interviews', label: 'Mock Interviews (Given + Received)', type: 'number', default: 0 },
  { key: 'applications_sent', label: 'Applications Sent', type: 'number', default: 0 },
  { key: 'pod_meeting_attended', label: 'Attended Pod Meeting This Week?', type: 'checkbox', default: false },
  { key: 'focus', label: 'Focus This Week', type: 'select', options: ['DSA', 'System Design', 'Behavioral', 'Applications', 'Mix'] },
  { key: 'confidence', label: 'Confidence (1-5)', type: 'rating', min: 1, max: 5 },
  { key: 'blockers', label: 'Blockers', type: 'textarea' },
  { key: 'wins', label: 'Wins', type: 'textarea' },
];

/** Create test program + open cohort + test user (WBB member). */
export async function seedTestData() {
  const sb = getServiceClient();

  // 1. Create test program
  const { data: program, error: progErr } = await sb
    .from('programs')
    .upsert({
      slug: TEST_SLUG,
      name: 'E2E Test Program',
      description: 'A test program for automated e2e tests.',
      duration_weeks: 8,
      capacity_per_cohort: 30,
      schedule: {
        cadence: [
          { season: 'spring', appOpen: '03-01', appClose: '04-01', kickoff: '04-15', endOffset: 8 },
        ],
        podRoles: ['frontend', 'backend'],
        podMinSize: 2,
        podMaxSize: 5,
      },
      registration_fields: BRIDGE_REGISTRATION_FIELDS,
      update_fields: BRIDGE_UPDATE_FIELDS,
      is_active: true,
    }, { onConflict: 'slug' })
    .select()
    .single();

  if (progErr) throw new Error(`Seed program failed: ${progErr.message}`);

  // 2. Create open cohort (application open now)
  const today = new Date();
  const appOpen = new Date(today);
  appOpen.setDate(today.getDate() - 7);
  const appClose = new Date(today);
  appClose.setDate(today.getDate() + 14);
  const kickoff = new Date(today);
  kickoff.setDate(today.getDate() + 21);
  const endDate = new Date(kickoff);
  endDate.setDate(kickoff.getDate() + 8 * 7);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const { data: cohort, error: cohortErr } = await sb
    .from('cohorts')
    .upsert({
      program_id: program.id,
      slug: TEST_COHORT_SLUG,
      name: 'E2E Test Program - Spring 2026',
      start_date: fmt(kickoff),
      end_date: fmt(endDate),
      application_open: fmt(appOpen),
      application_close: fmt(appClose),
      capacity: 30,
      status: 'open',
    }, { onConflict: 'slug' })
    .select()
    .single();

  if (cohortErr) throw new Error(`Seed cohort failed: ${cohortErr.message}`);

  // 3. Create (or reuse) test user marked as WBB member
  let userId: string;

  // Check if user already exists
  const { data: existingUsers } = await sb.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u: any) => u.email === TEST_USER_EMAIL);

  if (existing) {
    userId = existing.id;
    // Update password in case it changed
    await sb.auth.admin.updateUserById(userId, { password: TEST_USER_PASSWORD });
  } else {
    const { data: newUser, error: userErr } = await sb.auth.admin.createUser({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'E2E Test User', is_wbb_member: true },
    });
    if (userErr) throw new Error(`Seed user failed: ${userErr.message}`);
    userId = newUser.user.id;
  }

  // Ensure profile is marked as WBB member
  await sb.from('profiles').upsert({
    id: userId,
    email: TEST_USER_EMAIL,
    full_name: 'E2E Test User',
    is_wbb_member: true,
    slack_user_id: 'U_E2E_TEST',
    slack_team_id: WBB_SLACK_TEAM_ID,
    role: 'student',
  }, { onConflict: 'id' });

  return { program, cohort, userId };
}

/** Create an in-progress cohort for weekly-update tests. */
export async function seedInProgressCohort() {
  const sb = getServiceClient();

  const { data: program } = await sb
    .from('programs')
    .select('id')
    .eq('slug', TEST_SLUG)
    .single();

  if (!program) throw new Error('Test program not found. Run seedTestData first.');

  const inProgressSlug = `${TEST_SLUG}-2026-inprogress`;
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 14); // Started 2 weeks ago
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 8 * 7);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const { data: cohort, error } = await sb
    .from('cohorts')
    .upsert({
      program_id: program.id,
      slug: inProgressSlug,
      name: 'E2E Test Program - In Progress',
      start_date: fmt(startDate),
      end_date: fmt(endDate),
      application_open: '2026-01-01',
      application_close: '2026-02-01',
      capacity: 30,
      status: 'in_progress',
    }, { onConflict: 'slug' })
    .select()
    .single();

  if (error) throw new Error(`Seed in-progress cohort failed: ${error.message}`);

  return { cohort, inProgressSlug };
}

/** Register the test user for a cohort and set status to active. */
export async function seedRegistration(userId: string, cohortId: string, pod?: string) {
  const sb = getServiceClient();

  const { data: reg, error } = await sb
    .from('cohort_registrations')
    .upsert({
      user_id: userId,
      cohort_id: cohortId,
      registration_data: { target_role: 'frontend' },
      status: pod ? 'active' : 'registered',
      pod: pod || null,
    }, { onConflict: 'user_id,cohort_id' })
    .select()
    .single();

  if (error) throw new Error(`Seed registration failed: ${error.message}`);
  return reg;
}

/** Insert a weekly update for the test user. */
export async function seedWeeklyUpdate(userId: string, cohortId: string, weekNumber: number, data: Record<string, any>) {
  const sb = getServiceClient();

  const { data: update, error } = await sb
    .from('weekly_updates')
    .upsert({
      user_id: userId,
      cohort_id: cohortId,
      week_number: weekNumber,
      data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,cohort_id,week_number' })
    .select()
    .single();

  if (error) throw new Error(`Seed weekly update failed: ${error.message}`);
  return update;
}

/** Clean up all test data. */
export async function teardownTestData() {
  const sb = getServiceClient();

  // Delete in reverse dependency order
  await sb.from('weekly_updates').delete().like('cohort_id', '%').in(
    'cohort_id',
    (await sb.from('cohorts').select('id').like('slug', `${TEST_SLUG}%`)).data?.map((c: any) => c.id) || []
  );

  const { data: cohortIds } = await sb.from('cohorts').select('id').like('slug', `${TEST_SLUG}%`);
  if (cohortIds && cohortIds.length > 0) {
    const ids = cohortIds.map((c: any) => c.id);
    await sb.from('weekly_updates').delete().in('cohort_id', ids);
    await sb.from('cohort_registrations').delete().in('cohort_id', ids);
  }

  await sb.from('cohorts').delete().like('slug', `${TEST_SLUG}%`);
  await sb.from('programs').delete().eq('slug', TEST_SLUG);

  // Delete test user
  const { data: existingUsers } = await sb.auth.admin.listUsers();
  const testUser = existingUsers?.users?.find((u: any) => u.email === TEST_USER_EMAIL);
  if (testUser) {
    await sb.from('profiles').delete().eq('id', testUser.id);
    await sb.auth.admin.deleteUser(testUser.id);
  }
}
