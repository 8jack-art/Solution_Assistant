import { Request, Response } from 'express'
import { z } from 'zod'
import { UserModel } from '../models/User.js'
import { comparePassword, hashPassword } from '../utils/password.js'
import { generateToken } from '../utils/jwt.js'
import { ApiResponse, AuthRequest } from '../types/index.js'

const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
})

const registerSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符'),
  password: z.string().min(6, '密码至少6个字符'),
  isAdmin: z.boolean().default(false),
})

export class AuthController {
  static async login(req: Request, res: Response<ApiResponse>) {
    try {
      const { username, password } = loginSchema.parse(req.body)

      const user = await UserModel.findByUsername(username)
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: '用户名或密码错误' 
        })
      }

      if (user.is_expired) {
        return res.status(403).json({ 
          success: false, 
          error: '账号已过期' 
        })
      }

      const isPasswordValid = await comparePassword(password, user.password_hash)
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false, 
          error: '用户名或密码错误' 
        })
      }

      const token = generateToken({
        userId: user.id,
        username: user.username,
        isAdmin: user.is_admin
      })

      const { password_hash, ...userWithoutPassword } = user

      res.json({
        success: true,
        data: {
          user: userWithoutPassword,
          token
        }
      })
    } catch (error) {
      console.error('登录失败:', error)
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '输入验证失败',
          message: error.errors[0].message
        })
      }
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误' 
      })
    }
  }

  static async register(req: Request, res: Response<ApiResponse>) {
    try {
      const { username, password, isAdmin } = registerSchema.parse(req.body)

      const existingUser = await UserModel.findByUsername(username)
      if (existingUser) {
        return res.status(409).json({ 
          success: false, 
          error: '用户名已存在' 
        })
      }

      const passwordHash = await hashPassword(password)

      const newUser = await UserModel.create({
        username,
        password_hash: passwordHash,
        is_admin: isAdmin,
        is_expired: false
      })

      if (!newUser) {
        return res.status(500).json({ 
          success: false, 
          error: '创建用户失败' 
        })
      }

      const { password_hash, ...userWithoutPassword } = newUser

      res.status(201).json({
        success: true,
        data: { user: userWithoutPassword }
      })
    } catch (error) {
      console.error('注册失败:', error)
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '输入验证失败',
          message: error.errors[0].message
        })
      }
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误' 
      })
    }
  }

  static async getCurrentUser(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: '用户未认证' 
        })
      }

      const user = await UserModel.findById(userId)
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: '用户不存在' 
        })
      }

      const { password_hash, ...userWithoutPassword } = user

      res.json({
        success: true,
        data: { user: userWithoutPassword }
      })
    } catch (error) {
      console.error('获取当前用户失败:', error)
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误' 
      })
    }
  }

  static async testUsers(req: Request, res: Response<ApiResponse>) {
    try {
      const testUsers = [
        { username: 'admin', password: '123456', role: '管理员' },
        { username: 'user', password: '123456', role: '普通用户' }
      ]

      res.json({
        success: true,
        data: { testUsers }
      })
    } catch (error) {
      console.error('获取测试用户失败:', error)
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误' 
      })
    }
  }
}