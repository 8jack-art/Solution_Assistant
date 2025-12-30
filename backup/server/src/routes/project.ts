import { Router } from 'express'
import { ProjectController } from '../controllers/projectController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

router.use(authenticateToken)

router.post('/', ProjectController.create)
router.get('/', ProjectController.getByUserId)
router.get('/:id', ProjectController.getById)
router.put('/:id', ProjectController.update)
router.patch('/:id/status', ProjectController.updateStatus)
router.patch('/:id/lock', ProjectController.lock)
router.patch('/:id/unlock', ProjectController.unlock)
router.delete('/:id', ProjectController.delete)

export default router