/**
 * 智能填充结果对话框
 *
 * @module components/customers/SmartFillDialog
 * @description 显示AI搜索结果，让用户选择填充策略
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ExternalLink, Info, AlertCircle, AlertTriangle, Newspaper, Sparkles } from 'lucide-react';

// ============================================
// 类型定义
// ============================================

interface NewsHighlight {
  title: string;
  summary?: string;
  date?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  url?: string;
}

interface SearchResult {
  fullName?: string;
  description?: string;
  industry?: string;
  contactName?: string;
  phone?: string;
  address?: string;
  background?: string;
  contactBackground?: string;
  notes?: string;
  sources?: string[];
  confidence?: 'high' | 'medium' | 'low';
  // 新闻舆情相关字段（新增）
  businessSummary?: string;
  keyEvents?: string;
  riskAlerts?: string;
  sentimentOverview?: 'positive' | 'neutral' | 'negative';
  newsHighlights?: NewsHighlight[];
  recommendation?: string;
}

interface FormDataFields {
  name: string;
  companyFullName: string;
  industry: string;
  description: string;
  contactName: string;
  contactInfo: string;
  address: string;
  background: string;
  contactBackground: string;
  notes: string;
}

interface SmartFillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchResult: SearchResult | null;
  currentFormData: FormDataFields;
  onConfirm: (data: Partial<FormDataFields>, strategy: 'empty' | 'all') => void;
}

// ============================================
// 辅助函数
// ============================================

/**
 * 计算找到的信息数量
 */
function countFoundInfo(result: SearchResult): number {
  return Object.entries(result).filter(([key, value]) => {
    if (key === 'sources' || key === 'confidence') return false;
    return value && String(value).trim().length > 0;
  }).length;
}

/**
 * 获取置信度显示文本
 */
function getConfidenceLabel(confidence?: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return '高';
    case 'medium':
      return '中';
    case 'low':
      return '低';
    default:
      return '未知';
  }
}

/**
 * 获取置信度颜色类名
 */
function getConfidenceColorClass(confidence?: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'low':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

/**
 * 计算空白字段数量
 */
function countEmptyFields(formData: FormDataFields): number {
  return Object.entries(formData).filter(([key, value]) => {
    if (key === 'notes') return false; // 备注字段不计入
    return !value || String(value).trim().length === 0;
  }).length;
}

// ============================================
// 组件实现
// ============================================

export function SmartFillDialog({
  open,
  onOpenChange,
  searchResult,
  currentFormData,
  onConfirm,
}: SmartFillDialogProps) {
  const [fillStrategy, setFillStrategy] = useState<'empty' | 'all'>('empty');

  if (!searchResult) return null;

  const foundCount = countFoundInfo(searchResult);
  const emptyFieldCount = countEmptyFields(currentFormData);
  const confidenceLabel = getConfidenceLabel(searchResult.confidence);
  const confidenceColorClass = getConfidenceColorClass(searchResult.confidence);

  // 处理确认填充
  const handleConfirm = () => {
    const dataToFill: Partial<FormDataFields> = {};

    // 根据策略决定填充哪些字段
    if (fillStrategy === 'empty') {
      // 仅填充空白字段
      if (!currentFormData.companyFullName && searchResult.fullName) {
        dataToFill.companyFullName = searchResult.fullName;
      }
      if (!currentFormData.description && searchResult.description) {
        dataToFill.description = searchResult.description;
      }
      if (!currentFormData.industry && searchResult.industry) {
        dataToFill.industry = searchResult.industry;
      }
      if (!currentFormData.contactName && searchResult.contactName) {
        dataToFill.contactName = searchResult.contactName;
      }
      if (!currentFormData.contactInfo && searchResult.phone) {
        dataToFill.contactInfo = searchResult.phone;
      }
      if (!currentFormData.address && searchResult.address) {
        dataToFill.address = searchResult.address;
      }
      if (!currentFormData.background && searchResult.background) {
        dataToFill.background = searchResult.background;
      }
      if (!currentFormData.contactBackground && searchResult.contactBackground) {
        dataToFill.contactBackground = searchResult.contactBackground;
      }
      if (!currentFormData.notes && searchResult.notes) {
        dataToFill.notes = searchResult.notes;
      }
    } else {
      // 全部替换
      if (searchResult.fullName) dataToFill.companyFullName = searchResult.fullName;
      if (searchResult.description) dataToFill.description = searchResult.description;
      if (searchResult.industry) dataToFill.industry = searchResult.industry;
      if (searchResult.contactName) dataToFill.contactName = searchResult.contactName;
      if (searchResult.phone) dataToFill.contactInfo = searchResult.phone;
      if (searchResult.address) dataToFill.address = searchResult.address;
      if (searchResult.background) dataToFill.background = searchResult.background;
      if (searchResult.contactBackground) dataToFill.contactBackground = searchResult.contactBackground;
      if (searchResult.notes) dataToFill.notes = searchResult.notes;
    }

    onConfirm(dataToFill, fillStrategy);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            智能填充结果
          </DialogTitle>
          <DialogDescription>
            AI已为您找到以下客户信息，请选择填充方式
          </DialogDescription>
        </DialogHeader>

        {/* 可滚动内容区域 */}
        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          {/* 统计信息 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                找到 {foundCount} 条信息
              </Badge>
              <Badge variant="outline" className={confidenceColorClass}>
                置信度: {confidenceLabel}
              </Badge>
            </div>
            {searchResult.confidence === 'low' && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                请核实信息准确性
              </div>
            )}
          </div>

          {/* 信息预览 */}
          <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
            {searchResult.description && (
              <div>
                <span className="text-xs text-muted-foreground font-medium">公司简介:</span>
                <p className="text-sm mt-1 line-clamp-3">{searchResult.description}</p>
              </div>
            )}
            {searchResult.industry && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">行业:</span>
                <span className="text-sm">{searchResult.industry}</span>
              </div>
            )}
            {searchResult.contactName && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">联系人:</span>
                <span className="text-sm">{searchResult.contactName}</span>
              </div>
            )}
            {searchResult.phone && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">联系方式:</span>
                <span className="text-sm">{searchResult.phone}</span>
              </div>
            )}
            {searchResult.address && (
              <div>
                <span className="text-xs text-muted-foreground font-medium">地址:</span>
                <p className="text-sm mt-1">{searchResult.address}</p>
              </div>
            )}
            {searchResult.background && (
              <div>
                <span className="text-xs text-muted-foreground font-medium">客户背景:</span>
                <p className="text-sm mt-1 line-clamp-2">{searchResult.background}</p>
              </div>
            )}
            {searchResult.contactBackground && (
              <div>
                <span className="text-xs text-muted-foreground font-medium">联系人背景:</span>
                <p className="text-sm mt-1 line-clamp-2">{searchResult.contactBackground}</p>
              </div>
            )}
            {searchResult.notes && (
              <div>
                <span className="text-xs text-muted-foreground font-medium">备注摘要:</span>
                <p className="text-sm mt-1 line-clamp-3 whitespace-pre-line">{searchResult.notes}</p>
              </div>
            )}
          </div>

          {/* 新闻舆情展示区域 */}
          {(searchResult.businessSummary || searchResult.keyEvents || searchResult.riskAlerts || searchResult.newsHighlights?.length) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Newspaper className="w-4 h-4" />
                新闻舆情分析
                {searchResult.sentimentOverview && (
                  <Badge
                    variant="outline"
                    className={
                      searchResult.sentimentOverview === 'positive'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : searchResult.sentimentOverview === 'negative'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                    }
                  >
                    {searchResult.sentimentOverview === 'positive'
                      ? '正面'
                      : searchResult.sentimentOverview === 'negative'
                        ? '负面'
                        : '中性'}
                  </Badge>
                )}
              </div>

              {searchResult.businessSummary && (
                <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                  <h4 className="text-sm font-medium text-blue-800 mb-1">新闻归纳主营业务</h4>
                  <p className="text-sm text-blue-700">{searchResult.businessSummary}</p>
                </div>
              )}

              {/* 重要事件 */}
              {searchResult.keyEvents && (
                <div className="border rounded-lg p-3 bg-orange-50 border-orange-200">
                  <h4 className="text-sm font-medium text-orange-800 mb-1">重要事件</h4>
                  <p className="text-sm text-orange-700">{searchResult.keyEvents}</p>
                </div>
              )}

              {/* 风险提示 */}
              {searchResult.riskAlerts && (
                <div className="border rounded-lg p-3 bg-red-50 border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <h4 className="text-sm font-medium text-red-800">风险提示</h4>
                  </div>
                  <p className="text-sm text-red-700">{searchResult.riskAlerts}</p>
                </div>
              )}

              {/* 新闻摘要列表 */}
              {searchResult.newsHighlights && searchResult.newsHighlights.length > 0 && (
                <div className="border rounded-lg p-3 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">相关新闻</h4>
                  {searchResult.newsHighlights.slice(0, 5).map((news, idx) => (
                    <div key={idx} className="flex items-start gap-2 py-1 border-b last:border-b-0">
                      <Badge
                        variant="outline"
                        className={`shrink-0 ${
                          news.sentiment === 'positive'
                            ? 'bg-green-50 text-green-600 border-green-200'
                            : news.sentiment === 'negative'
                              ? 'bg-red-50 text-red-600 border-red-200'
                              : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        {news.sentiment === 'positive' ? '正面' : news.sentiment === 'negative' ? '负面' : '中性'}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{news.title}</p>
                        {(news.summary || news.date) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {news.summary} {news.date && `- ${news.date}`}
                          </p>
                        )}
                      </div>
                      {news.url && (
                        <a
                          href={news.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 客户评估建议 */}
              {searchResult.recommendation && (
                <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-medium text-blue-800">评估建议</h4>
                  </div>
                  <p className="text-sm text-blue-700">{searchResult.recommendation}</p>
                </div>
              )}
            </div>
          )}

          {/* 来源链接 */}
          {searchResult.sources && searchResult.sources.length > 0 && (
            <div className="text-xs text-muted-foreground space-y-1">
              <span className="font-medium">数据来源: </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {searchResult.sources.slice(0, 3).map((source, idx) => {
                  const isTianyancha = source.includes('tianyancha.com');
                  const sourceLabel = isTianyancha ? '天眼查' : 'AI搜索';
                  const sourceColorClass = isTianyancha
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-purple-50 text-purple-700 border-purple-200';

                  return (
                    <span key={idx} className="inline-flex items-center gap-1">
                      <Badge variant="outline" className={sourceColorClass}>
                        {sourceLabel}
                      </Badge>
                      <a
                        href={source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {source.length > 40 ? source.slice(0, 40) + '...' : source}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* 填充策略选择 */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-sm font-medium">填充方式</Label>
            <RadioGroup
              value={fillStrategy}
              onValueChange={(value) => setFillStrategy(value as 'empty' | 'all')}
              className="space-y-2"
            >
              <div className="flex items-start space-x-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="empty" id="empty" className="mt-0.5" />
                <div className="space-y-1">
                  <Label htmlFor="empty" className="text-sm font-medium cursor-pointer">
                    仅填充空白字段（推荐）
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    当前有 {emptyFieldCount} 个空白字段可填充，已输入的内容不会被覆盖
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="all" id="all" className="mt-0.5" />
                <div className="space-y-1">
                  <Label htmlFor="all" className="text-sm font-medium cursor-pointer">
                    全部替换
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    使用搜索结果替换所有相关字段，已输入的内容将被覆盖
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* 提示信息 */}
          <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
            <Info className="w-4 h-4 mt-0.5" />
            <p className="text-xs">
              搜索结果仅供参考，请在提交前核实信息准确性。您可以在表单中进一步修改填充的内容。
            </p>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm}>
            确认填充
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
