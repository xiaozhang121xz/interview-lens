#!/bin/bash
# 安全启动开发服务器脚本
# 用于在 inotify 受限的容器环境中启动 Next.js 开发服务器

echo "=== 检查系统资源 ==="
echo "当前文件句柄使用: $(lsof 2>/dev/null | wc -l)"
echo "当前 inotify 监视: $(find /proc/*/fd -lname anon_inode:inotify 2>/dev/null | wc -l)"

# 设置环境变量
export CHOKIDAR_USEPOLLING=true
export CHOKIDAR_INTERVAL=3000
export WATCHPACK_POLLING=true
export NEXT_WEBPACK_USEPOLLING=true

# 清理旧的构建缓存（忽略 NFS 锁定错误）
if [ -d ".next" ]; then
    echo "清理 .next 目录..."
    rm -rf .next 2>/dev/null || {
        echo "⚠️  .next 目录部分文件被 NFS 锁定，跳过清理"
        echo "   开发服务器仍可正常运行"
    }
fi

# 启动服务器
echo "启动 Next.js 开发服务器（轮询模式）..."
echo "注意：热更新可能较慢，修改代码后请等待 3-5 秒"
npx next dev --webpack