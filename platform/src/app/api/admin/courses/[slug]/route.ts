import { NextResponse } from 'next/server';
import { verifyAdminKey } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/server';

interface Props {
  params: { slug: string };
}

export async function GET(request: Request, { params }: Props) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  const supabase = createServiceClient();
  const { data: course, error } = await supabase
    .from('courses')
    .select('*, modules(*, lessons(*)), enrollments(count)')
    .eq('slug', params.slug)
    .single();

  if (error || !course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  return NextResponse.json({ course });
}

export async function PUT(request: Request, { params }: Props) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  const updates = await request.json();
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('courses')
    .update(updates)
    .eq('slug', params.slug)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ course: data });
}

export async function DELETE(request: Request, { params }: Props) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('slug', params.slug);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Course deleted' });
}
