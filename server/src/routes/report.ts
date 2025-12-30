import express from 'express'
import { ReportController } from '../controllers/reportController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// 报告生成相关路由
router.post('/generate', authenticateToken, ReportController.generate)
router.get('/stream/:reportId', authenticateToken, ReportController.stream)
router.get('/:id', authenticateToken, ReportController.getById)
router.get('/project/:projectId', authenticateToken, ReportController.getByProjectId)
router.delete('/:id', authenticateToken, ReportController.delete)

// 模板管理相关路由
router.post('/templates', authenticateToken, ReportController.createTemplate)
router.get('/templates', authenticateToken, ReportController.getTemplates)
router.put('/templates/:id', authenticateToken, ReportController.updateTemplate)
router.delete('/templates/:id', authenticateToken, ReportController.deleteTemplate)
router.post('/templates/set-default', authenticateToken, ReportController.setDefaultTemplate)

// 预览和导出相关路由
router.post('/preview', authenticateToken, ReportController.preview)
router.post('/export', authenticateToken, ReportController.export)

export default router