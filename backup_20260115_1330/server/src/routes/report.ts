import express from 'express'
import { ReportController } from '../controllers/reportController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// 所有路由都需要认证
router.use(authenticateToken)

// ==================== 模板管理 - 必须放在 /:id 之前 ====================
router.get('/templates', ReportController.getTemplates)
router.post('/templates', ReportController.saveTemplate)
router.put('/templates/:id', ReportController.updateTemplate)
router.patch('/templates/:id', ReportController.renameTemplate)
router.delete('/templates/:id', ReportController.deleteTemplate)

// ==================== 样式配置管理 ====================
router.get('/styles', ReportController.getStyleConfigs)
router.get('/styles/default', ReportController.getDefaultStyleConfig)
router.post('/styles', ReportController.saveStyleConfig)
router.delete('/styles/:id', ReportController.deleteStyleConfig)

// ==================== 报告 CRUD ====================
router.post('/create', ReportController.create)
router.get('/:id', ReportController.getById)
router.get('/project/:projectId', ReportController.getByProjectId)

// ==================== 流式生成 ====================
router.post('/generate/:id', ReportController.generate)
router.get('/stream/:id', ReportController.stream)

// ==================== 生成控制 ====================
router.post('/pause/:id', ReportController.pause)
router.post('/resume/:id', ReportController.resume)
router.post('/stop/:id', ReportController.stop)

// ==================== 导出 ====================
router.post('/export/:id', ReportController.export)
router.post('/export-with-config', ReportController.exportWithConfig)
router.post('/export-html', ReportController.exportHtml)

// ==================== 项目汇总数据 ====================
router.get('/project/summary/:projectId', ReportController.getProjectSummary)

// ==================== 项目概况管理 ====================
router.post('/project/overview', ReportController.saveProjectOverview)
router.get('/project/overview/:projectId', ReportController.getProjectOverview)

// ==================== 项目概况生成（SSE流式） ====================
router.post('/generate/overview/:projectId', ReportController.generateProjectOverview)

// ==================== 项目概况生成（非流式） ====================
router.post('/generate/overview-nonstream/:projectId', ReportController.generateOverviewNonStream)

export default router
