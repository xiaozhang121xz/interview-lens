'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast, ToastProvider } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { StatsCard } from '@/components/ui/stats-card';
import { SearchInput } from '@/components/ui/search-input';
import {
  Sparkles,
  Code,
  Layout,
  Palette,
  Zap,
  Settings,
  Copy,
  Eye,
  Download,
  Rocket,
  Target,
  Layers,
  Command,
  Lightbulb,
  FileCode,
  Box,
  Package,
  Component,
  BrickWall,
  Wrench,
  MonitorSpeaker,
  Puzzle,
  X,
  Search,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/dashboard-layout';

// 组件数据
const componentsData = [
  {
    name: 'Button',
    description: '交互按钮组件',
    icon: Component,
    category: '基础组件',
    complexity: '简单',
    props: ['variant', 'size', 'asChild', 'disabled'],
    usageCount: 45,
    file: 'components/ui/button.tsx',
    features: ['多种变体', '不同尺寸', '自定义样式', '无障碍支持'],
    scenarios: [
      '表单提交按钮',
      '导航操作',
      '模态对话框确认',
      '页面主要操作',
      '工具栏按钮',
    ],
    codeExample: `<Button variant="default" size="lg">
  点击我
</Button>`,
    designSystem: {
      variants: [
        'default',
        'destructive',
        'outline',
        'secondary',
        'ghost',
        'link',
      ],
      sizes: ['default', 'sm', 'lg', 'icon'],
      colors: ['primary', 'secondary', 'accent', 'destructive'],
    },
  },
  {
    name: 'Card',
    description: '内容卡片容器',
    icon: Layout,
    category: '布局组件',
    complexity: '简单',
    props: ['className', 'children'],
    usageCount: 32,
    file: 'components/ui/card.tsx',
    features: ['灵活布局', '嵌套支持', '响应式', '主题集成'],
    scenarios: [
      '仪表板统计卡片',
      '产品展示卡片',
      '用户信息卡片',
      '内容摘要卡片',
      '设置面板卡片',
    ],
    codeExample: `<Card className="w-full">
  <CardHeader>
    <CardTitle>卡片标题</CardTitle>
  </CardHeader>
  <CardContent>
    卡片内容
  </CardContent>
</Card>`,
    designSystem: {
      variants: ['default', 'outlined', 'elevated', 'flat'],
      padding: ['none', 'sm', 'md', 'lg'],
      backgrounds: ['solid', 'gradient', 'glass'],
    },
  },
  {
    name: 'Input',
    description: '文本输入框',
    icon: Code,
    category: '表单组件',
    complexity: '简单',
    props: ['type', 'placeholder', 'value', 'onChange', 'disabled'],
    usageCount: 28,
    file: 'components/ui/input.tsx',
    features: ['类型验证', '状态管理', '样式定制', '错误处理'],
    scenarios: ['用户名输入', '密码输入', '搜索框', '表单字段', '数字输入'],
    codeExample: `<Input
  type="text"
  placeholder="请输入内容"
  className="w-full"
/>`,
    designSystem: {
      variants: ['default', 'outline', 'filled', 'underlined'],
      states: ['default', 'focus', 'error', 'disabled', 'success'],
      sizes: ['sm', 'md', 'lg'],
    },
  },
  {
    name: 'Dialog',
    description: '模态对话框',
    icon: Box,
    category: '反馈组件',
    complexity: '中等',
    props: ['open', 'onOpenChange', 'children'],
    usageCount: 18,
    file: 'components/ui/dialog.tsx',
    features: ['模态显示', '焦点管理', '键盘导航', '动画效果'],
    scenarios: ['确认对话框', '表单模态框', '详情弹窗', '设置面板', '图片预览'],
    codeExample: `<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>标题</DialogTitle>
    </DialogHeader>
    内容
  </DialogContent>
</Dialog>`,
    designSystem: {
      variants: ['default', 'fullscreen', 'drawer', 'popover'],
      animations: ['fade', 'slide', 'scale', 'bounce'],
      sizes: ['sm', 'md', 'lg', 'xl', 'full'],
    },
  },
  {
    name: 'Select',
    description: '下拉选择器',
    icon: Layers,
    category: '表单组件',
    complexity: '中等',
    props: ['value', 'onValueChange', 'placeholder', 'disabled'],
    usageCount: 22,
    file: 'components/ui/select.tsx',
    features: ['搜索过滤', '多选支持', '自定义渲染', '分组显示'],
    scenarios: ['选项选择', '状态切换', '分类筛选', '语言选择', '日期选择器'],
    codeExample: `<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="选择选项" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">选项1</SelectItem>
  </SelectContent>
</Select>`,
    designSystem: {
      variants: ['default', 'searchable', 'multi-select', 'creatable'],
      animations: ['fade', 'slide'],
      positions: ['bottom', 'top'],
    },
  },
  {
    name: 'Badge',
    description: '标签徽章',
    icon: Target,
    category: '显示组件',
    complexity: '简单',
    props: ['variant', 'children', 'className'],
    usageCount: 35,
    file: 'components/ui/badge.tsx',
    features: ['颜色变体', '大小选项', '圆角样式', '自定义内容'],
    scenarios: ['状态标签', '数量标记', '分类标签', '优先级标识', '徽章通知'],
    codeExample: `<Badge variant="default">
  标签内容
</Badge>`,
    designSystem: {
      variants: ['default', 'secondary', 'destructive', 'outline'],
      sizes: ['sm', 'md', 'lg'],
      shapes: ['rounded', 'pill', 'square'],
    },
  },
  {
    name: 'Table',
    description: '数据表格',
    icon: MonitorSpeaker,
    category: '数据展示',
    complexity: '复杂',
    props: ['data', 'columns', 'onRowClick', 'sorting'],
    usageCount: 15,
    file: 'components/ui/table.tsx',
    features: ['排序功能', '分页支持', '选择行', '自定义渲染'],
    scenarios: ['数据列表', '用户管理表格', '产品列表', '统计报表', '配置表格'],
    codeExample: `<Table>
  <TableHeader>
    <TableRow>
      <TableHead>列名</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>数据</TableCell>
    </TableRow>
  </TableBody>
</Table>`,
    designSystem: {
      variants: ['default', 'striped', 'bordered', 'compact'],
      densities: ['comfortable', 'compact', 'spacious'],
    },
  },
  {
    name: 'Tabs',
    description: '标签页切换',
    icon: Layers,
    category: '导航组件',
    complexity: '中等',
    props: ['value', 'onValueChange', 'orientation'],
    usageCount: 12,
    file: 'components/ui/tabs.tsx',
    features: ['多种方向', '动画效果', '自定义样式', '键盘导航'],
    scenarios: [
      '页面内容切换',
      '设置分类',
      '产品详情标签',
      '表单步骤',
      '文档章节',
    ],
    codeExample: `<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="tab1">标签1</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    内容
  </TabsContent>
</Tabs>`,
    designSystem: {
      orientations: ['horizontal', 'vertical'],
      animations: ['slide', 'fade', 'scale'],
      variants: ['default', 'pills', 'underline'],
    },
  },
];

function ComponentsPageContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [selectedComponent, setSelectedComponent] = useState<
    (typeof componentsData)[0] | null
  >(null);
  const { showToast } = useToast();

  // 复制到剪贴板功能
  const handleCopyCode = async (code: string, componentName: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast(`${componentName} 组件代码已复制到剪贴板`, 'success');
    } catch (error) {
      showToast('复制失败，请手动复制代码', 'error');
    }
  };

  // 过滤组件
  const filteredComponents = componentsData.filter((component) => {
    const matchesSearch =
      component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      component.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === '全部' || component.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 获取所有分类 - 确保顺序一致性避免hydration错误
  const categorySet = new Set(componentsData.map((c) => c.category));
  const categories = ['全部', ...Array.from(categorySet).sort()];

  // 获取使用最多的组件
  const topComponents = componentsData
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 3);

  return (
    <DashboardLayout title="组件管理">
      <div className="space-y-2">
        {/* 标题栏 - 同步调整为小尺寸和蓝色背景 */}
        <PageHeader
          variant="card"
          size="sm"
          title="组件管理中心"
          description="探索和管理您的 shadcn/ui 组件库，了解每个组件的功能、使用场景和最佳实践"
          icon={Component}
        />

        {/* 搜索和统计区域 */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* 左侧搜索和过滤 - 调整为与统计卡片完全一致的样式 */}
          <div className="lg:w-96 bg-white/80 backdrop-blur-sm border-gray-200 rounded-xl py-3 shadow-sm">
            <div className="px-4">
              {/* 搜索框 */}
              <div className="mb-3">
                <SearchInput
                  placeholder="搜索组件名称或描述..."
                  value={searchTerm}
                  onChange={setSearchTerm}
                  className="border-gray-200 focus:border-primary focus:ring-primary/20 h-9 text-sm"
                />
              </div>

              {/* 分类标签 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-gray-500" />
                  <p className="text-sm font-medium text-gray-700">组件分类</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={
                        selectedCategory === category ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className={`hover:bg-primary/5 hover:border-primary hover:text-primary transition-all duration-200 h-7 text-xs ${
                        selectedCategory === category
                          ? 'shadow-sm ring-2 ring-primary/20'
                          : 'hover:shadow-sm'
                      }`}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 右侧区域 - 包含专家建议和统计卡片 */}
          <div className="flex-1 flex flex-col gap-2">
            {/* AI 前端设计技能建议 - 在统计卡片上方 */}
            <Alert className="border-primary/20 bg-primary/5">
              <Lightbulb className="h-4 w-4 text-primary" />
              <AlertDescription className="text-primary">
                <strong>前端专家建议：</strong> 基于 shadcn/ui
                的设计原则，建议优先使用变体和尺寸 prop
                来控制组件样式，避免直接修改
                className。这能确保设计系统的一致性和可维护性。
              </AlertDescription>
            </Alert>

            {/* 统计卡片 - 四个一行 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatsCard
                title="总组件数"
                value={componentsData.length}
                description="shadcn/ui 组件"
                variant="compact"
              />

              <StatsCard
                title="使用次数"
                value={topComponents.reduce((sum, c) => sum + c.usageCount, 0)}
                description="总使用次数"
                variant="compact"
              />

              <StatsCard
                title="组件分类"
                value={categories.length - 1}
                description="功能分类"
                variant="compact"
              />

              <StatsCard
                title="常用组件"
                value={topComponents.length}
                description="高频使用"
                variant="compact"
              />
            </div>
          </div>
        </div>

        {/* 组件列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredComponents.map((component, index) => (
            <Card
              key={component.name}
              className="group hover:shadow-lg transition-all duration-300 border-gray-200 hover:border-primary/30 overflow-hidden bg-white/80 backdrop-blur-sm"
            >
              <CardHeader className="pb-1 px-4 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <component.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-gray-900">
                        {component.name}
                      </CardTitle>
                      <CardDescription className="text-gray-600 text-xs">
                        {component.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {component.complexity}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-3">
                {/* 组件元信息 */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Layers className="w-4 h-4" />
                    <span className="text-xs">{component.category}</span>
                  </div>
                </div>

                {/* 主要特性 */}
                <div className="flex flex-wrap gap-1">
                  {component.features.slice(0, 3).map((feature, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                  {component.features.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{component.features.length - 3}
                    </Badge>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 hover:bg-primary/5 hover:border-primary hover:text-primary h-9 text-sm"
                    onClick={() => setSelectedComponent(component)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    应用详情
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hover:bg-primary/10 hover:text-primary h-9 w-9"
                    onClick={() =>
                      handleCopyCode(component.codeExample, component.name)
                    }
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 选中组件详情 */}
        {selectedComponent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <selectedComponent.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900">
                        {selectedComponent.name}
                      </h2>
                      <p className="text-gray-600">
                        {selectedComponent.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedComponent(null)}
                    className="hover:bg-gray-100"
                  >
                    ✕
                  </Button>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">概览</TabsTrigger>
                    <TabsTrigger value="scenarios">应用场景</TabsTrigger>
                    <TabsTrigger value="props">属性</TabsTrigger>
                    <TabsTrigger value="code">代码示例</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
                        <CardHeader className="pb-2 px-4 pt-3">
                          <CardTitle className="text-base text-gray-900">
                            基本信息
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 text-sm">
                              分类：
                            </span>
                            <Badge className="text-xs">
                              {selectedComponent.category}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 text-sm">
                              复杂度：
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {selectedComponent.complexity}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 text-sm">
                              使用次数：
                            </span>
                            <span className="font-medium text-sm">
                              {selectedComponent.usageCount}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 text-sm">
                              文件位置：
                            </span>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {selectedComponent.file}
                            </code>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
                        <CardHeader className="pb-2 px-4 pt-3">
                          <CardTitle className="text-base text-gray-900">
                            设计系统
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 space-y-2">
                          {Object.entries(selectedComponent.designSystem).map(
                            ([key, value]) => (
                              <div key={key}>
                                <div className="font-medium text-gray-700 text-sm capitalize mb-1">
                                  {key}:
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {Array.isArray(value) ? (
                                    value.map((v, idx) => (
                                      <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {v}
                                      </Badge>
                                    ))
                                  ) : (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {value}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
                      <CardHeader className="pb-2 px-4 pt-3">
                        <CardTitle className="text-base text-gray-900">
                          主要特性
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {selectedComponent.features.map((feature, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded-lg"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-primary" />
                              <span className="text-xs">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="scenarios" className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedComponent.scenarios.map((scenario, idx) => (
                        <Card
                          key={idx}
                          className="bg-white/80 backdrop-blur-sm border-gray-200"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                <Target className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900 mb-1 text-sm">
                                  场景 {idx + 1}
                                </h4>
                                <p className="text-xs text-gray-600">
                                  {scenario}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="props" className="space-y-3">
                    <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-gray-900 mb-3 text-sm">
                          属性列表
                        </h4>
                        <div className="space-y-2">
                          {selectedComponent.props.map((prop, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <code className="bg-gray-100 px-3 py-1 rounded-md text-xs font-mono">
                                {prop}
                              </code>
                              <span className="text-xs text-gray-600">
                                组件属性
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="code" className="space-y-3">
                    <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900 text-sm">
                            代码示例
                          </h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleCopyCode(
                                selectedComponent.codeExample,
                                selectedComponent.name
                              )
                            }
                            className="h-8 text-xs"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            复制
                          </Button>
                        </div>
                        <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto">
                          <code className="text-xs">
                            {selectedComponent.codeExample}
                          </code>
                        </pre>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Main export with ToastProvider wrapper
export default function ComponentsPage() {
  return (
    <ToastProvider>
      <ComponentsPageContent />
    </ToastProvider>
  );
}
