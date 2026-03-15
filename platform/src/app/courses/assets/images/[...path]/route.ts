import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const filePath = segments.join('/');

  // Prevent directory traversal
  if (filePath.includes('..')) {
    return new NextResponse('Not found', { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext];

  if (!mimeType) {
    return new NextResponse('Not found', { status: 404 });
  }

  const absolutePath = path.resolve(
    process.cwd(),
    '..',
    'courses',
    'assets',
    'images',
    filePath
  );

  // Verify the resolved path is still within courses/assets/images
  const allowedDir = path.resolve(process.cwd(), '..', 'courses', 'assets', 'images');
  if (!absolutePath.startsWith(allowedDir)) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const file = await readFile(absolutePath);
    return new NextResponse(file, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
