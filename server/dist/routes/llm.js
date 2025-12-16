import { Router } from 'express';
import { LLMController } from '../controllers/llmController.js';
import { authenticateToken } from '../middleware/auth.js';
const router = Router();
// 不需要认证的路由
router.get('/providers', LLMController.getProviders);
router.post('/test-connection', LLMController.testConnection);
// 需要认证的路由
router.use(authenticateToken);
router.post('/create', LLMController.create);
router.get('/', LLMController.getByUserId);
router.get('/default', LLMController.getDefault);
router.put('/:id', LLMController.update);
router.post('/set-default', LLMController.setDefault);
router.delete('/:id', LLMController.delete);
router.post('/generate-investment-content', LLMController.generateInvestmentContent);
router.post('/analyze-project-info', LLMController.analyzeProjectInfo);
router.post('/analyze-engineering-items', LLMController.analyzeEngineeringItems);
router.post('/subdivide-engineering-item', LLMController.subdivideEngineeringItem);
router.post('/analyze-revenue-structure', LLMController.analyzeRevenueStructure);
export default router;
//# sourceMappingURL=llm.js.map