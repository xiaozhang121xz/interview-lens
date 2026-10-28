#!/bin/bash

# E2E环境自动修复脚本
#
# 目标：自动检测并修复Playwright环境问题
# 解决：缺少系统库、浏览器未安装、依赖缺失等问题

set -e

echo "🔧 E2E环境自动修复..."
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查并安装Playwright浏览器
echo -e "${BLUE}📦 检查Playwright浏览器...${NC}"

if ! npx playwright --version > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Playwright未安装，正在安装...${NC}"
  npm install -D @playwright/test
fi

echo -e "${GREEN}✅ Playwright已安装${NC}"
echo ""

# 安装浏览器
echo -e "${BLUE}🌐 安装Playwright浏览器...${NC}"

if npx playwright install chromium > /tmp/playwright-install.log 2>&1; then
  echo -e "${GREEN}✅ Chromium浏览器安装成功${NC}"
else
  echo -e "${YELLOW}⚠️  浏览器安装遇到问题，尝试安装系统依赖...${NC}"

  # 检测系统类型
  if [ -f /etc/debian_version ]; then
    echo -e "${BLUE}📦 检测到Debian/Ubuntu系统${NC}"
    echo -e "${BLUE}📦 安装系统依赖...${NC}"

    # 尝试安装Playwright系统依赖
    if npx playwright install-deps chromium > /tmp/playwright-deps.log 2>&1; then
      echo -e "${GREEN}✅ 系统依赖安装成功${NC}"
    else
      echo -e "${YELLOW}⚠️  部分依赖可能需要手动安装${NC}"
      echo -e "${YELLOW}查看日志: cat /tmp/playwright-deps.log${NC}"

      # 尝试安装常见的缺失库
      echo -e "${BLUE}📦 尝试安装常见的缺失库...${NC}"

      if command -v apt-get > /dev/null 2>&1; then
        echo -e "${BLUE}📦 使用apt-get安装...${NC}"

        # 检查是否有sudo权限
        if sudo -n true > /dev/null 2>&1; then
          sudo apt-get update -qq
          sudo apt-get install -y \
            libnspr4 \
            libnss3 \
            libatk1.0-0 \
            libatk-bridge2.0-0 \
            libcups2 \
            libdrm2 \
            libxkbcommon0 \
            libxcomposite1 \
            libxdamage1 \
            libxfixes3 \
            libxrandr2 \
            libgbm1 \
            libasound2 > /tmp/apt-install.log 2>&1

          if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ 系统库安装成功${NC}"
          else
            echo -e "${YELLOW}⚠️  部分库安装失败，可能需要手动安装${NC}"
            echo -e "${YELLOW}查看日志: cat /tmp/apt-install.log${NC}"
          fi
        else
          echo -e "${YELLOW}⚠️  无sudo权限，跳过系统库安装${NC}"
        fi
      fi
    fi
  elif [ -f /etc/redhat-release ]; then
    echo -e "${BLUE}📦 检测到RedHat/CentOS系统${NC}"
    echo -e "${YELLOW}⚠️  请手动安装系统依赖${NC}"
  else
    echo -e "${YELLOW}⚠️  未知系统类型${NC}"
  fi
fi

echo ""

# 验证storage-state.json
echo -e "${BLUE}🔑 验证storage-state.json配置...${NC}"

STORAGE_STATE_FILE="tests/storage-state.json"

if [ ! -f "$STORAGE_STATE_FILE" ]; then
  echo -e "${YELLOW}⚠️  storage-state.json不存在，创建默认配置...${NC}"

  # 创建默认的storage-state.json
  cat > "$STORAGE_STATE_FILE" << 'EOF'
{
  "cookies": [],
  "origins": [
    {
      "origin": "http://localhost:3000",
      "localStorage": [
        {
          "name": "az-user-info",
          "value": "{\"state\":{\"user\":{\"id\":\"test-user-001\",\"username\":\"test\",\"name\":\"测试用户\",\"email\":\"test@example.com\",\"role\":\"user\",\"displayName\":\"测试用户\",\"phone\":\"13800138000\"},\"isAuthenticated\":true},\"version\":0}"
        }
      ]
    }
  ]
}
EOF

  echo -e "${GREEN}✅ storage-state.json创建成功${NC}"
else
  echo -e "${GREEN}✅ storage-state.json已存在${NC}"

  # 验证storage-state.json格式
  if python3 -m json.tool "$STORAGE_STATE_FILE" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ storage-state.json格式正确${NC}"
  else
    echo -e "${RED}❌ storage-state.json格式错误${NC}"
    echo -e "${YELLOW}请检查文件格式并修复${NC}"
  fi
fi

echo ""

# 验证playwright.config.ts配置
echo -e "${BLUE}⚙️  验证playwright.config.ts配置...${NC}"

CONFIG_FILE="playwright.config.ts"

if [ -f "$CONFIG_FILE" ]; then
  # 检查baseURL配置
  if grep -q "baseURL.*localhost:3000" "$CONFIG_FILE" || grep -q "baseURL.*localhost:3006" "$CONFIG_FILE"; then
    echo -e "${GREEN}✅ baseURL配置正确${NC}"
  else
    echo -e "${YELLOW}⚠️  baseURL可能配置错误，请检查${NC}"
  fi

  # 检查storageState配置
  if grep -q "storageState.*storage-state.json" "$CONFIG_FILE"; then
    echo -e "${GREEN}✅ storageState配置正确${NC}"
  else
    echo -e "${YELLOW}⚠️  storageState未配置，请检查${NC}"
  fi
else
  echo -e "${RED}❌ playwright.config.ts不存在${NC}"
fi

echo ""

# 运行环境测试
echo -e "${BLUE}🧪 运行Playwright环境测试...${NC}"

# 创建临时测试文件
TEMP_TEST_FILE="tests/smoke/environment-check.smoke.ts"

mkdir -p tests/smoke

cat > "$TEMP_TEST_FILE" << 'EOF'
import { test, expect } from '@playwright/test';

test.describe('E2E环境检查', () => {
  test('Playwright环境正常', async ({ page }) => {
    // 尝试访问一个简单的页面
    await page.goto('about:blank');
    expect(await page.title()).toBe('');
  });
});
EOF

# 运行测试
if npx playwright test "$TEMP_TEST_FILE" > /tmp/env-test.log 2>&1; then
  echo -e "${GREEN}✅ Playwright环境测试通过${NC}"

  # 清理临时测试文件
  rm -f "$TEMP_TEST_FILE"
else
  echo -e "${RED}❌ Playwright环境测试失败${NC}"
  echo -e "${YELLOW}查看日志: cat /tmp/env-test.log${NC}"

  # 保留临时测试文件用于调试
  echo -e "${YELLOW}临时测试文件: $TEMP_TEST_FILE${NC}"
fi

echo ""
echo "==================================="
echo -e "${GREEN}✅ E2E环境修复完成${NC}"
echo "==================================="
echo ""
echo "下一步："
echo "  1. 运行 npm run smoke-test（冒烟测试）"
echo "  2. 运行 npm run test:e2e（完整E2E测试）"
echo ""

exit 0
