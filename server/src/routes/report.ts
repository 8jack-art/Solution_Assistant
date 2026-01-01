import express from 'express'
import { ReportController } from '../controllers/reportController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// 所有路由都需要认证
router.use(authenticateToken)

// 报告 CRUD
router.post('/create', ReportController.create)
router.get('/:id', ReportController.getById)
router.get('/project/:projectId', ReportController.getByProjectId)

// 流式生成
router.post('/generate/:id', ReportController.generate)
router.get('/stream/:id', ReportController.stream)

// 生成控制
router.post('/pause/:id', ReportController.pause)
router.post('/resume/:id', ReportController.resume)
router.post('/stop/:id', ReportController.stop)

// 导出
router.post('/export/:id', ReportController.export)

// 模板管理
router.get('/templates', ReportController.getTemplates)
router.post('/templates', ReportController.saveTemplate)
router.delete('/templates/:id', ReportController.deleteTemplate)

// 项目汇总数据
router.get('/project/summary/:projectId', ReportController.getProjectSummary)

export default router
