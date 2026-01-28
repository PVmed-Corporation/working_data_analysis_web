import express from 'express';
import cors from 'cors';
import { initDatabase } from './database.js';
import worklogRouter from './routes/worklog.js';
import codeAnalysisRouter from './routes/codeAnalysis.js';
import projectProgressRouter from './routes/projectProgress.js';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors()); // 允许跨域请求
app.use(express.json({ limit: '50mb' })); // 解析 JSON 请求体，增加限制以支持大文件
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 异步启动服务器
const startServer = async () => {
    try {
        // 初始化数据库
        await initDatabase();

        // API 路由
        app.use('/api/worklogs', worklogRouter);
        app.use('/api/code-analysis', codeAnalysisRouter);
        app.use('/api/project-progress', projectProgressRouter);

        // 健康检查端点
        app.get('/api/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        // 错误处理中间件
        app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            console.error('Server error:', err);
            res.status(500).json({ error: 'Internal server error' });
        });

        // 启动服务器
        app.listen(PORT, () => {
            console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
            console.log(`📊 API endpoints:`);
            console.log(`   - GET/POST/DELETE http://localhost:${PORT}/api/worklogs`);
            console.log(`   - GET/POST/DELETE http://localhost:${PORT}/api/code-analysis`);
            console.log(`   - GET/POST/DELETE http://localhost:${PORT}/api/project-progress`);
            console.log(`   - GET http://localhost:${PORT}/api/health\n`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;
