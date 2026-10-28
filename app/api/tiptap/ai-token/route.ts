import { NextRequest, NextResponse } from 'next/server';
import { extractUserId } from '@/lib/auth';
import {
  createTiptapAccessToken,
  type TiptapPermission,
} from '@/lib/tiptap/auth';

async function issueAiToken(request: NextRequest, documentId?: string) {
  const userId = await extractUserId(request);
  const permissions: TiptapPermission[] = [
    { action: 'AI:Toolkit', resource: '*' },
  ];
  const audiences: Array<'AI' | 'Documents'> = ['AI'];
  if (documentId) {
    audiences.push('Documents');
    permissions.push({ action: 'Documents:Write', resource: documentId });
  }

  const token = await createTiptapAccessToken({
    userId,
    audiences,
    permissions,
  });
  return NextResponse.json({ token, userId, documentId, expiresIn: 1800 });
}

function handleError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'UNAUTHORIZED') {
    return NextResponse.json({ error: '未授权访问' }, { status: 401 });
  }
  if (message === 'TIPTAP_NOT_CONFIGURED') {
    return NextResponse.json({ error: 'Tiptap 尚未配置' }, { status: 503 });
  }
  console.error('生成 AI Token 错误:', error);
  return NextResponse.json({ error: '生成 AI Token 失败' }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const documentId = request.nextUrl.searchParams.get('documentId')?.trim();
    return await issueAiToken(request, documentId || undefined);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      documentId?: unknown;
    };
    const documentId =
      typeof body.documentId === 'string' ? body.documentId.trim() : undefined;
    return await issueAiToken(request, documentId || undefined);
  } catch (error) {
    return handleError(error);
  }
}
