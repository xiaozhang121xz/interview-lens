import { NextRequest, NextResponse } from 'next/server';
import { getShareReport, validateShareToken } from '@/lib/services/share-report-storage';
import { readShareReportRenderedSlide } from '@/lib/services/share-report-artifacts';

interface RouteParams {
  params: Promise<{ token: string; slideIndex: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token, slideIndex } = await params;

    if (!token) {
      return NextResponse.json({ success: false, error: '缺少分享token' }, { status: 400 });
    }

    const validation = await validateShareToken(token);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error || '分享链接无效' },
        { status: 404 }
      );
    }

    const report = await getShareReport(token);
    if (!report?.slidesArtifact?.hasRenderedSlides) {
      return NextResponse.json(
        { success: false, error: '未生成真实 slides 预览' },
        { status: 404 }
      );
    }

    const slideNumber = Number.parseInt(slideIndex, 10);
    if (!Number.isInteger(slideNumber) || slideNumber < 1) {
      return NextResponse.json({ success: false, error: '无效的页码' }, { status: 400 });
    }

    const imageBuffer = await readShareReportRenderedSlide(report.slidesArtifact.reportId, slideNumber);
    if (!imageBuffer) {
      return NextResponse.json(
        { success: false, error: '渲染图片不存在' },
        { status: 404 }
      );
    }

    return new NextResponse(new Uint8Array(imageBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取渲染图片失败' },
      { status: 500 }
    );
  }
}
