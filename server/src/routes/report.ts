import express from 'express'
import { ReportController } from '../controllers/reportController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// 模板管理相关路由（需要放在前面，避免被/:id拦截）
router.post('/templates', authenticateToken, ReportController.createTemplate)
router.get('/templates', authenticateToken, ReportController.getTemplates)
router.put('/templates/:id', authenticateToken, ReportController.updateTemplate)
router.delete('/templates/:id', authenticateToken, ReportController.deleteTemplate)
router.post('/templates/set-default', authenticateToken, ReportController.setDefaultTemplate)

// 报告生成相关路由
router.post('/generate', authenticateToken, ReportController.generate)
router.get('/stream/:reportId', authenticateToken, ReportController.stream)
router.patch('/:id/pause', authenticateToken, ReportController.pauseGeneration)
router.patch('/:id/resume', authenticateToken, ReportController.resumeGeneration)
router.patch('/:id/stop', authenticateToken, ReportController.stopGeneration)
router.get('/:id', authenticateToken, ReportController.getById)
router.get('/project/:projectId', authenticateToken, ReportController.getByProjectId)
router.delete('/:id', authenticateToken, ReportController.delete)

// 预览和导出相关路由
router.post('/preview', authenticateToken, ReportController.preview)
router.post('/export', authenticateToken, ReportController.export)

export default router