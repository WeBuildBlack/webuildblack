import { NextResponse } from 'next/server';

export function verifyAdminKey(request: Request): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    return NextResponse.json({ error: 'Admin API not configured' }, { status: 500 });
  }

  if (!authHeader || authHeader !== `Bearer ${adminKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // null means authorized
}
