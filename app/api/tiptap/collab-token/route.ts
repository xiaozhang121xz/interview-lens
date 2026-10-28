import { NextRequest, NextResponse } from 'next/server';
import { extractUserId } from '@/lib/auth';
import { createTiptapAccessToken } from '@/lib/tiptap/auth';

async function issueCollaborationToken(request: NextRequest, documentId: string) {
  const userId = await extractUserId(request);
  const appId = process.env.NEXT_PUBLIC_TIPTAP_COLLAB_APP_ID;
  if (!appId) throw new Error('TIPTAP_NOT_CONFIGURED');

  const token = await createTiptapAccessToken({
    userId,
    audiences: ['Documents'],
    permissions: [{ action: 'Documents:Write', resource: documentId }],
  });
  return NextResponse.json({ token, appId, userId, documentId, expiresIn: 1800 });
}

function handleError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'UNAUTHORIZED') {
    return NextResponse.json({ error: '未授权访问' }, { status: 401 });
  }
  if (message === 'TIPTAP_NOT_CONFIGURED') {
    return NextResponse.json({ error: 'Tiptap 尚未配置' }, { status: 503 });
  }
  console.error('生成 Collaboration Token 错误:', error);
  return NextResponse.json({ error: '生成 Token 失败' }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const documentId = request.nextUrl.searchParams.get('documentId')?.trim();
    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }
    return await issueCollaborationToken(request, documentId);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { documentId?: unknown };
    if (typeof body.documentId !== 'string' || !body.documentId.trim()) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }
    return await issueCollaborationToken(request, body.documentId.trim());
  } catch (error) {
    return handleError(error);
  }
}
