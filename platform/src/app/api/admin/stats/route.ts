import { NextResponse } from 'next/server';
import { verifyAdminKey } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  const supabase = createServiceClient();

  // Total students
  const { count: totalStudents } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  // Total enrollments
  const { count: totalEnrollments } = await supabase
    .from('enrollments')
    .select('id', { count: 'exact', head: true });

  // WBB members
  const { count: wbbMembers } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_wbb_member', true);

  // Enrollment stats by course
  const { data: enrollmentStats } = await supabase
    .from('v_enrollment_stats')
    .select('*');

  // Revenue stats
  const { data: revenueStats } = await supabase
    .from('v_revenue_stats')
    .select('*');

  // Total revenue
  const totalRevenueCents = (revenueStats || []).reduce(
    (sum: number, r: any) => sum + (r.total_revenue_cents || 0),
    0
  );

  // Completed lessons
  const { count: completedLessons } = await supabase
    .from('progress')
    .select('id', { count: 'exact', head: true });

  return NextResponse.json({
    totalStudents: totalStudents || 0,
    totalEnrollments: totalEnrollments || 0,
    wbbMembers: wbbMembers || 0,
    totalRevenueCents,
    totalRevenueDollars: (totalRevenueCents / 100).toFixed(2),
    completedLessons: completedLessons || 0,
    enrollmentsByCourse: enrollmentStats || [],
    revenueByCourse: revenueStats || [],
  });
}
