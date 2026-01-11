import express from 'express'
import { LLMController } from '../controllers/llmController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// 不需要认证的路由
router.get('/providers', LLMController.getProviders)
router.post('/test-connection', LLMController.testConnection)
router.post('/test-connection-python', LLMController.testConnectionPython)

// 需要认证的路由
router.use(authenticateToken)

router.post('/create', LLMController.create)
router.get('/', LLMController.getByUserId)
router.get('/default', LLMController.getDefault)
router.put('/:id', LLMController.update)
router.post('/set-default', LLMController.setDefault)
router.delete('/:id', LLMController.delete)
router.post('/generate-investment-content', LLMController.generateInvestmentContent)
router.post('/analyze-project-info', LLMController.analyzeProjectInfo)
router.post('/analyze-engineering-items', LLMController.analyzeEngineeringItems)
router.post('/subdivide-engineering-item', LLMController.subdivideEngineeringItem)

export default router