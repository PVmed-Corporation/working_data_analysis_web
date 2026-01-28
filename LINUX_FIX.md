# Linux 跨平台兼容性修复

## 问题描述

在 Linux 系统上运行 `npm run dev:all` 时报错：
```
sh: 1: start: not found
```

## 原因

原始的 `dev:all` 脚本使用了 Windows 特定的 `start` 命令：
```json
"dev:all": "start cmd /k \"cd server && npm run dev\" && npm run dev"
```

`start` 命令只在 Windows 命令提示符中可用，在 Linux/macOS 的 shell 中不存在。

## 解决方案

使用跨平台的 `concurrently` 包来同时运行多个命令。

### 已应用的修复

#### 1. 安装 concurrently
```bash
npm install --save-dev concurrently
```

#### 2. 更新 package.json
```json
{
  "scripts": {
    "dev:all": "concurrently \"npm run dev:server\" \"npm run dev\""
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

### 使用方法

现在在任何平台上都可以使用：

```bash
# 同时启动前后端
npm run dev:all
```

`concurrently` 会在同一个终端中并行运行两个命令，输出会带有颜色标识，方便区分。

### 优势

✅ **跨平台兼容**: Windows、Linux、macOS 都可用  
✅ **简单易用**: 一个命令启动所有服务  
✅ **彩色输出**: 不同进程的输出用不同颜色区分  
✅ **自动清理**: 按 Ctrl+C 会同时停止所有进程

### 验证

在 Linux 系统上：
```bash
# 重新安装依赖
npm install

# 启动应用
npm run dev:all
```

应该能看到类似输出：
```
[0] 
[0] > working-data-analysis-server@1.0.0 dev
[0] > tsx watch src/index.ts
[1] 
[1] > working-data-analysis@0.0.0 dev
[1] > vite
[0] 
[0] ✅ Database loaded
[0] 🚀 Server is running on http://localhost:3001
[1] 
[1] VITE v6.4.1  ready in 283 ms
[1] ➜  Local:   http://localhost:3000/
```

## 替代方案

如果不想使用 `concurrently`，可以继续使用分别启动的方式：

```bash
# 终端 1
npm run dev:server

# 终端 2  
npm run dev
```

这种方式在所有平台上都能工作，只是需要两个终端窗口。
