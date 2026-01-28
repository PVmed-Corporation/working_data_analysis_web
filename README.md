<div align="center">
  <h1 align="center">Digital Dashboard </h1>

  <p align="center">
    一个基于 React 和 Vite 构建的综合数据分析仪表盘，用于可视化团队的工作日志、代码提交情况及项目进度。数据通过后端服务器存储在 SQLite 数据库中，支持跨设备访问。
  </p>
</div>



## ✨ Features

该应用包含三个核心数据分析模块：

1.  **📊 工作日志数据分析**
    * 支持导入禅道 (ZenTao) 导出的 Excel 工时表或矩阵格式工时表。
    * 自动聚合团队成员的周工时、任务内容。
    * 提供日期范围筛选器和详细的时间/内容透视表。

2.  **💻 代码提交数据分析**
    * 可视化团队成员的 **Pure Commit**  与 **Code Review**  数量。
    * 支持历史报告的存储与回溯查看。

3.  **🚀 项目进度数据分析**
    * 追踪项目的交付等待率和**总耗时**。
    * 按项目分组管理多个历史分析报告。
    * 提供任务状态分布饼图及成员耗时排行。


## 📁 文件命名规范

为了确保系统能够准确解析日期和项目信息，请在上传文件前严格遵循以下命名规则：

### 1. 项目进度文件 
* **格式：** `yyyy-mm-dd_项目名称_analysis.xlsx`
* **示例：**
    * `2025-11-17_iRT Ferret SP14_analysis.xlsx`

### 2. 代码分析文件 
* **格式：** `code_analysis_yyyy-mm-dd.xlsx`
* **示例：**
    * `code_analysis_2025-11-17.xlsx`

> **注意：**
> * 工作日志文件 (Work Logs) 目前支持标准的 Excel 导出格式，对文件名无强制要求。



## 🛠️ 本地运行 

**前置要求 :**
* Node.js 
* npm

**安装与启动步骤:**

1.  **安装依赖 :**
    ```bash
    # 安装前端依赖
    npm install
    
    # 安装后端依赖
    cd server
    npm install
    cd ..
    ```


2.  **启动应用 :**
    
    **选项 A: 同时启动前后端（推荐，跨平台兼容）**
    ```bash
    npm run dev:all
    ```
    > 使用 `concurrently` 同时启动前后端，支持 Windows、Linux 和 macOS。
    
    **选项 B: 分别启动**
    ```bash
    # 终端 1: 启动后端服务器
    npm run dev:server
    
    # 终端 2: 启动前端开发服务器
    npm run dev
    ```

3.  **访问应用 :**
    - 前端：打开浏览器访问 `http://localhost:3000`
    - 后端 API：`http://localhost:3001/api/health`

## 🗄️ 数据存储

应用使用以下架构：
- **前端**: React + Vite (端口 3000)
- **后端**: Express.js (端口 3001)
- **数据库**: SQLite (`database/analytics.db`)

所有数据存储在后端数据库中，支持多设备访问同一份数据。

## 📤 导出功能

使用顶部的 "Export Dashboard" 按钮可以将所有数据导出为 Excel 文件，方便备份和离线查看。

