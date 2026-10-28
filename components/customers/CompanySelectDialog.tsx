/**
 * 公司选择对话框
 *
 * @module components/customers/CompanySelectDialog
 * @description 展示模糊搜索结果，让用户选择正确的公司
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
import { Building2, MapPin, Calendar, User, CheckCircle2, Loader2 } from 'lucide-react';

// ============================================
// 类型定义
// ============================================

export interface CompanyItem {
  keyNo: string;
  name: string;
  creditCode: string;
  establishDate: string;
  legalPerson: string;
  status: string;
  address: string;
  province: string;
  city: string;
}

interface CompanySelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: CompanyItem[];
  isLoading: boolean;
  searchKey: string;
  onSelect: (company: CompanyItem) => void;
}

// ============================================
// 组件实现
// ============================================

export function CompanySelectDialog({
  open,
  onOpenChange,
  companies,
  isLoading,
  searchKey,
  onSelect,
}: CompanySelectDialogProps) {
  const [selectedKeyNo, setSelectedKeyNo] = useState<string>('');

  // 处理选择确认
  const handleConfirm = () => {
    const selected = companies.find((c) => c.keyNo === selectedKeyNo);
    if (selected) {
      onSelect(selected);
      onOpenChange(false);
      setSelectedKeyNo(''); // 重置选择
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    if (status.includes('存续') || status.includes('在业') || status.includes('正常')) {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    if (status.includes('注销') || status.includes('吊销')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            选择目标公司
          </DialogTitle>
          <DialogDescription>
            搜索 "<span className="font-medium text-foreground">{searchKey}</span>" 找到 {companies.length} 家匹配公司，请选择您要查询的公司
          </DialogDescription>
        </DialogHeader>

        {/* 可滚动内容区域 */}
        <div className="py-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
              <p className="text-sm text-muted-foreground">正在搜索公司...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Building2 className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-muted-foreground">未找到匹配的公司</p>
              <p className="text-xs text-muted-foreground mt-1">请尝试使用更精确的公司名称</p>
            </div>
          ) : (
            <RadioGroup value={selectedKeyNo} onValueChange={setSelectedKeyNo} className="space-y-3">
              {companies.map((company) => (
                <div
                  key={company.keyNo}
                  className={`flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-all ${
                    selectedKeyNo === company.keyNo
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'hover:border-blue-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedKeyNo(company.keyNo)}
                >
                  <RadioGroupItem value={company.keyNo} id={company.keyNo} className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Label
                        htmlFor={company.keyNo}
                        className="text-sm font-medium cursor-pointer leading-tight"
                      >
                        {company.name}
                      </Label>
                      <Badge variant="outline" className={`shrink-0 ${getStatusColor(company.status)}`}>
                        {company.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>法人：{company.legalPerson}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>成立：{company.establishDate || '未知'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{company.address || `${company.province}${company.city}`}</span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      统一社会信用代码：{company.creditCode}
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedKeyNo || isLoading}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            确认选择
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}