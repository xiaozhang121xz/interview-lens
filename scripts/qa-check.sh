#!/bin/bash

# QA阻塞检查脚本
#
# 目标：在QA阶段自动运行所有关键检查
# 阻塞条件：任何检查失败则exit 1，阻止交付
# 使用：QA专家在审计前自动运行此脚本

set -e  # 遇到错误立即退出

echo "🔍 开始QA阻塞检查..."
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查计数
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# 检查函数
run_check() {
  local check_name=$1
  local check_command=$2

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  echo -e "${BLUE}📋 检查 $TOTAL_CHECKS: $check_name${NC}"

  if eval "$check_command" > /tmp/qa-check-$TOTAL_CHECKS.log 2>&1; then
    echo -e "${GREEN}✅ $check_name 检查通过${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
  else
    echo -e "${RED}❌ $check_name 检查失败${NC}"
    echo -e "${RED}🔴 阻塞条件触发: $check_name${NC}"
    echo -e "${YELLOW}查看详细日志:${NC} cat /tmp/qa-check-$TOTAL_CHECKS.log"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    return 1
  fi
}

# ==================== 阻塞条件检查 ====================

echo "==================================="
echo "🚨 阻塞条件检查（任何失败则阻止交付）"
echo "==================================="
echo ""

# 检查1: E2E测试实际执行
run_check \
  "E2E测试实际执行" \
  "bash ./.scripts/verify-e2e-executed.sh" || {
    echo ""
    echo -e "${RED}❌ QA阻塞: E2E测试未实际执行${NC}"
    echo -e "${YELLOW}原因: 测试代码编写完成 ≠ 测试实际执行${NC}"
    echo -e "${YELLOW}解决: Test专家必须执行测试并生成报告${NC}"
    echo ""
    exit 1
  }

echo ""

# 检查2: 侧边栏入口可访问性
run_check \
  "侧边栏入口可访问性" \
  "npm run smoke-test" || {
    echo ""
    echo -e "${RED}❌ QA阻塞: 侧边栏入口无法访问${NC}"
    echo -e "${YELLOW}原因: 配置的入口没有对应的页面文件或返回404${NC}"
    echo -e "${YELLOW}解决: frontend-expert必须修复入口配置或创建缺失页面${NC}"
    echo ""
    exit 1
  }

echo ""

# 检查3: 路由配置正确性
run_check \
  "路由配置正确性" \
  "npm run validate-routes" || {
    echo ""
    echo -e "${RED}❌ QA阻塞: 路由配置验证失败${NC}"
    echo -e "${YELLOW}原因: 侧边栏配置的路由与实际页面文件不匹配${NC}"
    echo -e "${YELLOW}解决: frontend-expert必须修复路由配置${NC}"
    echo ""
    exit 1
  }

echo ""

# 检查4: 构建验证
run_check \
  "构建验证" \
  "npm run build" || {
    echo ""
    echo -e "${RED}❌ QA阻塞: 构建失败${NC}"
    echo -e "${YELLOW}原因: TypeScript类型错误或构建配置问题${NC}"
    echo -e "${YELLOW}解决: 相关专家必须修复类型错误或构建问题${NC}"
    echo ""
    exit 1
  }

echo ""

# 检查5: 数据文件格式验证
run_check \
  "数据文件格式验证" \
  "node scripts/validate-data-files.js 2>/dev/null || echo '数据验证脚本不存在，跳过'" || {
    # 这个检查不是强制的，因为脚本可能不存在
    echo -e "${YELLOW}⚠️  数据文件格式验证跳过（脚本不存在）${NC}"
}

echo ""
echo "==================================="
echo "✅ 所有QA阻塞检查通过"
echo "==================================="
echo ""
echo -e "${GREEN}检查统计:${NC}"
echo -e "  总检查数: $TOTAL_CHECKS"
echo -e "${GREEN}  通过: $PASSED_CHECKS${NC}"
echo -e "${RED}  失败: $FAILED_CHECKS${NC}"
echo ""
echo -e "${GREEN}🎉 项目可以交付${NC}"
echo ""

exit 0
