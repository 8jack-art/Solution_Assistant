import { Router } from 'express'
import { RevenueCostController } from '../controllers/revenueCostController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// 所有路由都需要认证
router.use(authenticateToken)

// 保存收入成本建模数据
router.post('/save', RevenueCostController.save)

// 加载收入成本建模数据
router.get('/project/:projectId', RevenueCostController.getByProjectId)

// AI推荐营收结构
router.post('/ai-recommend/:projectId', RevenueCostController.aiRecommend)

// AI分析税率和计费模式
router.post('/analyze-pricing', RevenueCostController.analyzePricing)

// AI生成收入项目表
router.post('/generate-items/:projectId', RevenueCostController.generateItems)

// 更新工作流步骤
router.patch('/workflow/:projectId', RevenueCostController.updateWorkflowStep)

// 删除收入成本建模数据
router.delete('/:id', RevenueCostController.delete)

export default router
