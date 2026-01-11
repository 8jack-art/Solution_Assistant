import { Router } from 'express'
import { DebugController } from '../controllers/debugController.js'

const router = Router()

// 诊断LLM连接
router.post('/diagnose', DebugController.diagnoseConnection)

// 获取提供商配置信息
router.get('/providers', DebugController.getProviderConfigs)

export default router
