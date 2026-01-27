<div align="center">
  <h1 align="center">Digital Dashboard </h1>

  <p align="center">
    一个基于 React 和 Vite 构建的综合数据分析仪表盘，用于可视化团队的工作日志、代码提交情况及项目进度。数据通过本地 IndexedDB 进行持久化存储。
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

### 1. 项目进度文件 (Project Files)
用于“项目进度数据分析”模块。系统会解析文件名中的日期和项目名称。
* **格式：** `yyyy-mm-dd_项目名称_analysis.xlsx`
* **示例：**
    * `2025-11-17_iRT Ferret SP14_analysis.xlsx`

### 2. 代码分析文件 (Code Analysis Files)
用于“代码提交数据分析”模块。系统会从文件名中提取报告日期。
* **格式：** `code_analysis_yyyy-mm-dd.xlsx`
* **示例：**
    * `code_analysis_2025-11-17.xlsx`

> **注意：**
> * 工作日志文件 (Work Logs) 目前支持标准的 Excel 导出格式，对文件名无强制要求。



## 🛠️ 本地运行 

**前置要求 (Prerequisites):**
* Node.js 
* npm

**安装与启动步骤:**

1.  **安装依赖 (Install dependencies):**
    ```bash
    npm install
    ```


2.  **启动开发服务器 (Run the app):**
    ```bash
    npm run dev
    ```

3.  **访问应用:**
    打开浏览器访问控制台输出的地址（ `http://localhost:3000`）。
