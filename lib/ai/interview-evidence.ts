type InterviewRecordEvidence = {
  content: string;
  type?: string | null;
  isHighlight?: boolean | null;
  createdAt?: Date | string | null;
};

type TranscriptEvidence = {
  content: string;
  speaker?: string | null;
  confidence?: number | null;
  isKeyPoint?: boolean | null;
  createdAt?: Date | string | null;
};

const RECORD_TYPE_LABELS: Record<string, string> = {
  answer: '客户回答',
  note: '访谈备注',
  pain_point: '痛点记录',
  requirement: '需求记录',
  other: '其他记录',
};

function normalizedContent(content: string): string {
  return content.trim().replace(/\s+/g, ' ');
}

/**
 * 将人工记录和实时转写合并为带稳定证据编号的上下文。
 * 相同文本只保留人工记录，避免模型重复计算同一条信息。
 */
export function buildInterviewEvidence(
  records: InterviewRecordEvidence[] = [],
  transcripts: TranscriptEvidence[] = []
): { text: string; count: number } {
  const seen = new Set<string>();
  const rows: Array<{ time: number; text: string }> = [];

  records.forEach((record, index) => {
    const content = normalizedContent(record.content);
    if (!content || seen.has(content)) return;
    seen.add(content);
    const label = RECORD_TYPE_LABELS[record.type || ''] || '访谈记录';
    const highlight = record.isHighlight ? '【重点】' : '';
    rows.push({
      time: record.createdAt ? new Date(record.createdAt).getTime() : index,
      text: `[R${index + 1}][${label}]${highlight} ${content}`,
    });
  });

  transcripts.forEach((transcript, index) => {
    const content = normalizedContent(transcript.content);
    if (!content || seen.has(content)) return;
    seen.add(content);
    const speaker = transcript.speaker?.trim() || '说话人未标注';
    const keyPoint = transcript.isKeyPoint ? '【重点】' : '';
    const confidence =
      typeof transcript.confidence === 'number'
        ? ` 识别置信度:${Math.round(transcript.confidence * 100)}%`
        : '';
    rows.push({
      time: transcript.createdAt
        ? new Date(transcript.createdAt).getTime()
        : records.length + index,
      text: `[T${index + 1}][实时转写][${speaker}]${keyPoint} ${content}${confidence}`,
    });
  });

  rows.sort((a, b) => a.time - b.time);
  return {
    text: rows.map((row) => row.text).join('\n\n'),
    count: rows.length,
  };
}

