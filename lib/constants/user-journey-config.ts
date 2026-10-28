/**
 * 用户角色画像与旅程配置
 *
 * @module lib/constants/user-journey-config
 * @description 定义4种用户角色的旅程配置，用于动态展示差异化内容
 */

// ============================================
// 类型定义
// ============================================

/** 用户角色类型 */
export type UserRolePersona = 'sales' | 'product' | 'developer' | 'manager';

/** 图标名称 */
export type IconName = 'Briefcase' | 'FileText' | 'Code' | 'Users';

/** 旅程阶段配置 */
export interface JourneyStageConfig {
  name: string;
  description: string;
  features: string[];
  aiActions: string[];
  outputs: string[];
}

/** 用户旅程完整配置 */
export interface UserJourneyConfig {
  id: UserRolePersona;
  label: string;
  description: string;
  iconName: IconName;
  stages: {
    before: JourneyStageConfig;
    during: JourneyStageConfig;
    after: JourneyStageConfig;
  };
  /** 访谈前提纲生成侧重 */
  outlineFocus: string[];
}

// ============================================
// 通用旅程阶段配置
// ============================================

/** 访谈中阶段 - 所有角色相同 */
const DURING_STAGE: JourneyStageConfig = {
  name: '访谈中',
  description: 'AI帮你"实时深挖"',
  features: [
    '语音实时转写',
    '智能追问推荐',
    '关键信息高亮',
    '动态提纲调整',
  ],
  aiActions: [
    '实时语音转文字',
    '根据回答推荐追问',
    '识别痛点与需求',
    '聚焦高价值内容',
  ],
  outputs: [
    '实时转写记录',
    '追问问题清单',
    '标记的关键信息',
  ],
};

/** 访谈后阶段 - 所有角色相同 */
const AFTER_STAGE: JourneyStageConfig = {
  name: '访谈后',
  description: 'AI自动"输出交付物"',
  features: [
    '访谈记录汇总',
    '需求结构化提炼',
    '一键生成交付物',
  ],
  aiActions: [
    '自动整理访谈记录',
    '提炼业务场景、痛点、需求',
    '生成标准化文档',
  ],
  outputs: [
    'PRD 初稿',
    '用户画像',
    '用户旅程图',
  ],
};

// ============================================
// 4种角色的旅程配置
// ============================================

export const USER_JOURNEY_CONFIGS: Record<UserRolePersona, UserJourneyConfig> = {
  sales: {
    id: 'sales',
    label: '一线销售',
    description: '快速懂客户业务，获取客户真实需求，提升专业度',
    iconName: 'Briefcase',
    outlineFocus: [
      '竞品分析与对比',
      '客户痛点挖掘',
      '成交机会识别',
      '客户决策流程',
      '预算与时间表',
    ],
    stages: {
      before: {
        name: '访谈前',
        description: 'AI帮你"补齐业务认知"',
        features: [
          '行业知识库',
          '竞品分析模板',
          '客户背景调研',
        ],
        aiActions: [
          '生成行业背景知识',
          '分析竞品优劣势',
          '生成针对性访谈提纲',
          '配套访谈记录表',
        ],
        outputs: [
          '客户背景分析',
          '竞品对比报告',
          '深度访谈提纲',
          '记录表模板',
        ],
      },
      during: DURING_STAGE,
      after: AFTER_STAGE,
    },
  },

  product: {
    id: 'product',
    label: '产品/需求',
    description: '高质量访谈输出，直接写PRD',
    iconName: 'FileText',
    outlineFocus: [
      '需求挖掘深度',
      '用户场景分析',
      'PRD要素收集',
      '功能优先级判断',
      '用户故事采集',
    ],
    stages: {
      before: {
        name: '访谈前',
        description: 'AI帮你"补齐业务认知"',
        features: [
          '需求采集模板',
          '用户场景库',
          'PRD要素清单',
        ],
        aiActions: [
          '生成用户场景分析',
          '设计需求采集提纲',
          '准备PRD要素问题',
          '配套访谈记录表',
        ],
        outputs: [
          '用户场景图谱',
          '需求采集提纲',
          'PRD要素清单',
          '记录表模板',
        ],
      },
      during: DURING_STAGE,
      after: AFTER_STAGE,
    },
  },

  developer: {
    id: 'developer',
    label: '研发/架构',
    description: '理解真实业务，减少沟通偏差',
    iconName: 'Code',
    outlineFocus: [
      '技术场景理解',
      '系统边界确认',
      '数据流与接口',
      '性能与扩展需求',
      '技术约束识别',
    ],
    stages: {
      before: {
        name: '访谈前',
        description: 'AI帮你"补齐业务认知"',
        features: [
          '技术场景模板',
          '系统边界清单',
          '数据流分析',
        ],
        aiActions: [
          '生成技术场景分析',
          '设计技术访谈提纲',
          '准备接口与数据问题',
          '配套访谈记录表',
        ],
        outputs: [
          '技术场景图谱',
          '系统边界文档',
          '技术访谈提纲',
          '记录表模板',
        ],
      },
      during: DURING_STAGE,
      after: AFTER_STAGE,
    },
  },

  manager: {
    id: 'manager',
    label: '团队管理者',
    description: '标准化访谈，沉淀客户知识',
    iconName: 'Users',
    outlineFocus: [
      '标准化流程',
      '知识沉淀要点',
      '团队协作机制',
      '经验传承收集',
      '最佳实践萃取',
    ],
    stages: {
      before: {
        name: '访谈前',
        description: 'AI帮你"补齐业务认知"',
        features: [
          '标准化模板库',
          '团队协作空间',
          '知识沉淀体系',
        ],
        aiActions: [
          '生成标准化访谈模板',
          '设计团队协作流程',
          '准备知识沉淀问题',
          '配套访谈记录表',
        ],
        outputs: [
          '标准化访谈模板',
          '团队协作指南',
          '知识沉淀提纲',
          '记录表模板',
        ],
      },
      during: DURING_STAGE,
      after: AFTER_STAGE,
    },
  },
};

// ============================================
// 辅助函数
// ============================================

/**
 * 获取用户角色配置
 */
export function getUserJourneyConfig(role: UserRolePersona): UserJourneyConfig {
  return USER_JOURNEY_CONFIGS[role];
}

/**
 * 获取所有角色选项（用于选择器）
 */
export function getRolePersonaOptions(): Array<{
  id: UserRolePersona;
  label: string;
  description: string;
  iconName: IconName;
}> {
  return Object.values(USER_JOURNEY_CONFIGS).map((config) => ({
    id: config.id,
    label: config.label,
    description: config.description,
    iconName: config.iconName,
  }));
}

/**
 * 验证角色类型
 */
export function isValidRolePersona(role: string): role is UserRolePersona {
  return role in USER_JOURNEY_CONFIGS;
}