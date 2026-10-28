import {
  insightReportResponseSchema,
  insightReportV2ResponseSchema,
  type InsightReportResponse,
  type InsightReportV2Response,
} from '@/lib/validations/ai';

export type InsightReportVersion = 'v1' | 'v2';

export interface StoredInsightReportV1 {
  version: 'v1';
  data: InsightReportResponse;
}

export interface StoredInsightReportV2 {
  version: 'v2';
  data: InsightReportV2Response;
}

export type StoredInsightReport = StoredInsightReportV1 | StoredInsightReportV2;
export type InsightReportContent = InsightReportResponse | InsightReportV2Response;

export function isInsightReportV2(report: InsightReportContent): report is InsightReportV2Response {
  return 'interviewGoal' in report;
}

export function isInsightReportV1(report: InsightReportContent): report is InsightReportResponse {
  return 'businessScenario' in report;
}

export function wrapInsightReport(
  version: InsightReportVersion,
  data: InsightReportContent
): StoredInsightReport {
  if (version === 'v2') {
    return {
      version,
      data: insightReportV2ResponseSchema.parse(data),
    };
  }

  return {
    version,
    data: insightReportResponseSchema.parse(data),
  };
}

export function parseStoredInsightReport(content: string): StoredInsightReport {
  const raw = JSON.parse(content);

  if (raw && typeof raw === 'object' && 'version' in raw && 'data' in raw) {
    if (raw.version === 'v2') {
      return {
        version: 'v2',
        data: insightReportV2ResponseSchema.parse(raw.data),
      };
    }

    return {
      version: 'v1',
      data: insightReportResponseSchema.parse(raw.data),
    };
  }

  return {
    version: 'v1',
    data: insightReportResponseSchema.parse(raw),
  };
}

export function extractInsightReportSummary(content: string): string | undefined {
  try {
    const parsed = parseStoredInsightReport(content);
    const summary =
      parsed.version === 'v2'
        ? parsed.data.interviewGoal.summary
        : parsed.data.businessScenario.summary;

    return summary.length > 200 ? `${summary.slice(0, 200)}...` : summary;
  } catch {
    return undefined;
  }
}
