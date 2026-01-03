import express from 'express';
import { InvestmentController } from '../controllers/investmentController.js';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();
router.use(authenticateToken);
router.post('/calculate', InvestmentController.calculate);
router.post('/save', InvestmentController.save);
router.get('/project/:projectId', InvestmentController.getByProjectId);
router.post('/generate/:projectId', InvestmentController.generateSummary);
export default router;
//# sourceMappingURL=investment.js.map