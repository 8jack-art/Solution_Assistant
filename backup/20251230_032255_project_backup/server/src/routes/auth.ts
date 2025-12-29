import { AuthController } from '../controllers/authController.js'
import { authenticateToken } from '../middleware/auth.js'

const express = require('express')
const router = express.Router()

router.post('/login', AuthController.login)
router.post('/register', AuthController.register)
router.get('/me', authenticateToken, AuthController.getCurrentUser)
router.get('/test-users', AuthController.testUsers)

export default router