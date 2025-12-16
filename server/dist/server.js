import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { testConnection } from './db/config.js';
import { initDatabase } from './db/init.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/project.js';
import investmentRoutes from './routes/investment.js';
import llmRoutes from './routes/llm.js';
import revenueCostRoutes from './routes/revenueCost.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟窗口
    max: 500, // 提高到500次请求
    message: { success: false, error: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(limiter);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/investment', investmentRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/revenue-cost', revenueCostRoutes);
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '服务运行正常',
        timestamp: new Date().toISOString()
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: '接口不存在'
    });
});
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.status(500).json({
        success: false,
        error: '服务器内部错误'
    });
});
async function startServer() {
    try {
        console.log('🚀 正在启动服务器...');
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('❌ 数据库连接失败，服务器启动中止');
            process.exit(1);
        }
        const dbInitialized = await initDatabase();
        if (!dbInitialized) {
            console.error('❌ 数据库初始化失败，服务器启动中止');
            process.exit(1);
        }
        app.listen(PORT, () => {
            console.log(`✅ 服务器启动成功`);
            console.log(`📍 服务地址: http://localhost:${PORT}`);
            console.log(`🏥 健康检查: http://localhost:${PORT}/api/health`);
            console.log(`📝 API文档: http://localhost:${PORT}/api`);
            console.log(`🔑 测试账号:`);
            console.log(`   管理员: admin / 123456`);
            console.log(`   用户: user / 123456`);
        });
    }
    catch (error) {
        console.error('❌ 服务器启动失败:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map