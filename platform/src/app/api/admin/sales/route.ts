import { NextResponse } from 'next/server';
import { verifyAdminKey } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  const supabase = createServiceClient();

  // Get revenue stats view
  const { data: revenueStats } = await supabase
    .from('v_revenue_stats')
    .select('*');

  // Get recent payments
  const { data: recentPayments } = await supabase
    .from('payments')
    .select('*, profiles(email, full_name)')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(50);

  const totalRevenue = (revenueStats || []).reduce(
    (sum: number, r: any) => sum + (r.total_revenue_cents || 0),
    0
  );

  return NextResponse.json({
    totalRevenueCents: totalRevenue,
    totalRevenueDollars: (totalRevenue / 100).toFixed(2),
    byCourse: revenueStats || [],
    recentPayments: recentPayments || [],
  });
}
