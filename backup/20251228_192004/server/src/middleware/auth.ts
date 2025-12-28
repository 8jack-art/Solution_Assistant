import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt.js'
import { ApiResponse } from '../types/index.js'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    username: string
    isAdmin: boolean
  }
}

export function authenticateToken(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ success: false, error: '访问令牌缺失' })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return res.status(403).json({ success: false, error: '访问令牌无效' })
  }

  req.user = {
    userId: payload.userId,
    username: payload.username,
    isAdmin: payload.isAdmin
  }

  next()
}

export function requireAdmin(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ success: false, error: '需要管理员权限' })
  }
  next()
}