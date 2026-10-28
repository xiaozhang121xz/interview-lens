#!/bin/bash

# 清理 3000 端口占用并启动开发服务器
# 确保始终在 3000 端口启动

echo "🔍 检查 3000 端口占用情况..."

# 查找占用 3000 端口的进程（使用 ss 命令，比 lsof 更可靠）
PORT_INFO=$(ss -tlnp 2>/dev/null | grep :3000)

if [ -n "$PORT_INFO" ]; then
    echo "⚠️  发现端口 3000 被占用"
    echo "📋 占用信息:"
    echo "$PORT_INFO"

    # 从 ss 输出中提取 PID
    PORT_PID=$(echo "$PORT_INFO" | grep -oP 'pid=\K[0-9]+')

    if [ -n "$PORT_PID" ]; then
        echo "🔨 正在关闭进程 $PORT_PID..."

        # 先尝试优雅关闭
        kill $PORT_PID 2>/dev/null
        sleep 2

        # 检查是否还在运行
        if ss -tlnp 2>/dev/null | grep -q :3000; then
            echo "⚡ 强制关闭进程..."
            kill -9 $PORT_PID 2>/dev/null
            sleep 1
        fi

        echo "✅ 端口 3000 已释放"
    fi
else
    echo "✅ 端口 3000 未被占用"
fi

# 清理 .next 目录
echo "🧹 清理构建缓存..."
rm -rf .next

# 启动开发服务器
echo "🚀 启动开发服务器在端口 3000..."
PORT=3000 next dev --turbopack
