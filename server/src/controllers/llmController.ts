import { Response } from 'express'
import { z } from 'zod'
import { LLMConfigModel } from '../models/LLMConfig.js'
import { LLMService, generateInvestmentPrompt, analyzeProjectInfoPrompt, analyzeEngineeringItemsPrompt, subdivideEngineeringItemPrompt } from '../lib/llm.js'
import { llmProviders } from '../lib/llmProviders.js'
import { ApiResponse, AuthRequest } from '../types/index.js'
import { pool } from '../db/config.js'

const createConfigSchema = z.object({
  name: z.string().min(1, '配置名称不能为空'),
  provider: z.string().min(1, '服务提供商不能为空'),
  api_key: z.string().min(1, 'API密钥不能为空'),
  base_url: z.string().min(1, '基础URL不能为空'),
  model: z.string().min(1, '模型名称不能为空'),
  is_default: z.union([z.boolean(), z.number()]).transform(val => Boolean(val)).optional(),
})

const updateConfigSchema = createConfigSchema.partial()

const setDefaultSchema = z.object({
  config_id: z.string(),
})

const testConnectionSchema = z.object({
  provider: z.string().min(1, '服务提供商不能为空'),
  api_key: z.string().min(1, 'API密钥不能为空'),
  base_url: z.string().min(1, '基础URL不能为空'),
  model: z.string().min(1, '模型名称不能为空'),
})

const generateContentSchema = z.object({
  project_name: z.string(),
  total_investment: z.number().positive(),
  construction_years: z.number().int().min(1),
  industry: z.string().optional(),
  use_default_config: z.boolean().default(true),
  config_id: z.string().optional(),
})

const analyzeProjectSchema = z.object({
  project_info: z.string().min(1, '项目信息不能为空'),
  use_default_config: z.boolean().default(true),
  config_id: z.string().optional(),
})

const analyzeEngineeringSchema = z.object({
  project_name: z.string().min(1, '项目名称不能为空'),
  project_description: z.string().optional(),
  total_investment: z.coerce.number().positive('总投资必须大于0'),
  use_default_config: z.boolean().default(true),
  config_id: z.string().optional(),
})

export class LLMController {
  static async getProviders(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      res.json({
        success: true,
        data: { providers: llmProviders }
      })
    } catch (error) {
      console.error('获取LLM服务商列表失败:', error)
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误' 
      })
    }
  }
  static async create(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: '用户未认证' 
        })
      }

      const configData = createConfigSchema.parse(req.body)

      const config = await LLMConfigModel.create({
        ...configData,
        user_id: userId,
        is_default: configData.is_default ?? false
      })

      if (!config) {
        return res.status(500).json({ 
          success: false, 
          error: '创建LLM配置失败' 
        })
      }

      res.status(201).json({
        success: true,
        data: { config }
      })
    } catch (error) {
      console.error('创建LLM配置失败:', error)
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

  static async getByUserId(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.userId
      const isAdmin = req.user?.isAdmin
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: '用户未认证' 
        })
      }

      const configs = await LLMConfigModel.findByUserId(userId, isAdmin)

      res.json({
        success: true,
        data: { configs }
      })
    } catch (error) {
      console.error('获取LLM配置列表失败:', error)
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误' 
      })
    }
  }

  static async getDefault(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: '用户未认证' 
        })
      }

      const config = await LLMConfigModel.findDefaultByUserId(userId)

      res.json({
        success: true,
        data: { config }
      })
    } catch (error) {
      console.error('获取默认LLM配置失败:', error)
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误' 
      })
    }
  }

  static async update(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.userId
      const isAdmin = req.user?.isAdmin
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: '用户未认证' 
        })
      }

      const { id } = req.params
      const updates = createConfigSchema.partial().parse(req.body)

      const existingConfig = await LLMConfigModel.findById(id)
      if (!existingConfig) {
        return res.status(404).json({ 
          success: false, 
          error: '配置不存在' 
        })
      }

      // 检查是否是管理员的配置
      const [ownerRows] = await pool.execute(
        'SELECT is_admin FROM users WHERE id = ?',
        [existingConfig.user_id]
      ) as any[]
      
      const isConfigOwnedByAdmin = ownerRows.length > 0 && ownerRows[0].is_admin
      
      // 普通用户不能修改管理员的配置
      if (!isAdmin && isConfigOwnedByAdmin) {
        return res.status(403).json({ 
          success: false, 
          error: '无权修改管理员的配置' 
        })
      }
      
      // 也不能修改其他用户的配置
      if (existingConfig.user_id !== userId && !isAdmin) {
        return res.status(403).json({ 
          success: false, 
          error: '无权修改此配置' 
        })
      }

      const config = await LLMConfigModel.update(id, updates)

      if (!config) {
        return res.status(500).json({ 
          success: false, 
          error: '更新LLM配置失败' 
        })
      }

      res.json({
        success: true,
        data: { config }
      })
    } catch (error) {
      console.error('更新LLM配置失败:', error)
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

  static async setDefault(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.userId
      const isAdmin = req.user?.isAdmin
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: '用户未认证' 
        })
      }

      const { config_id } = setDefaultSchema.parse(req.body)

      const config = await LLMConfigModel.findById(config_id)
      if (!config) {
        return res.status(404).json({ 
          success: false, 
          error: '配置不存在' 
        })
      }
      
      // 检查是否是管理员的配置
      const [ownerRows] = await pool.execute(
        'SELECT is_admin FROM users WHERE id = ?',
        [config.user_id]
      ) as any[]
      
      const isConfigOwnedByAdmin = ownerRows.length > 0 && ownerRows[0].is_admin
      
      // 普通用户不能设置管理员的配置为默认，只能设置自己的
      if (!isAdmin && isConfigOwnedByAdmin) {
        return res.status(403).json({ 
          success: false, 
          error: '不能设置管理员的配置为默认，请使用自己的配置' 
        })
      }

      if (config.user_id !== userId) {
        return res.status(403).json({ 
          success: false, 
          error: '无权操作此配置' 
        })
      }

      const updatedConfig = await LLMConfigModel.setDefault(config_id, userId)

      if (!updatedConfig) {
        return res.status(500).json({ 
          success: false, 
          error: '设置默认配置失败' 
        })
      }

      res.json({
        success: true,
        data: { config: updatedConfig }
      })
    } catch (error) {
      console.error('设置默认LLM配置失败:', error)
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

  static async testConnection(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const configData = testConnectionSchema.parse(req.body)

      const result = await LLMService.testConnection({
        name: configData.provider,
        provider: configData.provider,
        apiKey: configData.api_key,
        baseUrl: configData.base_url,
        model: configData.model
      })

      if (result.success) {
        res.json({
          success: true,
          data: { 
            message: '连接测试成功',
            content: result.content
          }
        })
      } else {
        res.status(400).json({
          success: false,
          error: '连接测试失败',
          message: result.error
        })
      }
    } catch (error) {
      console.error('测试LLM连接失败:', error)
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

  static async delete(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params
      const userId = req.user?.userId

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: '用户未认证' 
        })
      }

      const config = await LLMConfigModel.findById(id)
      if (!config) {
        return res.status(404).json({ 
          success: false, 
          error: '配置不存在' 
        })
      }

      if (config.user_id !== userId) {
        return res.status(403).json({ 
          success: false, 
          error: '无权删除此配置' 
        })
      }

      const deleted = await LLMConfigModel.delete(id)

      if (!deleted) {
        return res.status(500).json({ 
          success: false, 
          error: '删除LLM配置失败' 
        })
      }

      res.json({
        success: true,
        message: 'LLM配置删除成功'
      })
    } catch (error) {
      console.error('删除LLM配置失败:', error)
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误' 
      })
    }
  }

  static async generateInvestmentContent(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: '用户未认证' 
        })
      }

      const {
        project_name,
        total_investment,
        construction_years,
        industry,
        use_default_config,
        config_id
      } = generateContentSchema.parse(req.body)

      let config
      if (use_default_config) {
        config = await LLMConfigModel.findDefaultByUserId(userId)
      } else if (config_id) {
        config = await LLMConfigModel.findById(config_id)
      }

      if (!config) {
        return res.status(404).json({ 
          success: false, 
          error: '未找到可用的LLM配置' 
        })
      }

      const messages = generateInvestmentPrompt({
        projectName: project_name,
        totalInvestment: total_investment,
        constructionYears: construction_years,
        industry
      })

      const result = await LLMService.generateContent(config, messages, {
        maxTokens: 2000,
        temperature: 0.3
      })

      if (result.success) {
        res.json({
          success: true,
          data: { 
            content: result.content,
            config_name: config.name
          }
        })
      } else {
        res.status(400).json({
          success: false,
          error: '生成投资内容失败',
          message: result.error
        })
      }
    } catch (error) {
      console.error('生成投资内容失败:', error)
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

  static async analyzeProjectInfo(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: '用户未认证' 
        })
      }

      const {
        project_info,
        use_default_config,
        config_id
      } = analyzeProjectSchema.parse(req.body)

      let config
      if (use_default_config) {
        config = await LLMConfigModel.findDefaultByUserId(userId)
      } else if (config_id) {
        config = await LLMConfigModel.findById(config_id)
      }

      if (!config) {
        return res.status(404).json({ 
          success: false, 
          error: '未找到可用的LLM配置，请先配置LLM服务' 
        })
      }

      const messages = analyzeProjectInfoPrompt(project_info)

      const result = await LLMService.generateContent(config, messages, {
        maxTokens: 1000,
        temperature: 0.3
      })

      if (result.success && result.content) {
        try {
          // 尝试解析JSON
          let jsonContent = result.content
          // 妄图提取JSON内容（如果LLM返回了额外的文字）
          const jsonMatch = result.content.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            jsonContent = jsonMatch[0]
          }
          
          const parsedData = JSON.parse(jsonContent)
          
          res.json({
            success: true,
            data: { 
              analyzed_data: parsedData,
              config_name: config.name
            }
          })
        } catch (parseError) {
          res.status(400).json({
            success: false,
            error: '解析LLM响应失败',
            message: 'LLM返回的内容不是有效的JSON格式'
          })
        }
      } else {
        res.status(400).json({
          success: false,
          error: '分析项目信息失败',
          message: result.error
        })
      }
    } catch (error) {
      console.error('分析项目信息失败:', error)
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

  static async analyzeEngineeringItems(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: '用户未认证' 
        })
      }

      const {
        project_name,
        project_description,
        total_investment,
        use_default_config,
        config_id
      } = analyzeEngineeringSchema.parse(req.body)

      let config
      if (use_default_config) {
        config = await LLMConfigModel.findDefaultByUserId(userId)
      } else if (config_id) {
        config = await LLMConfigModel.findById(config_id)
      }

      if (!config) {
        return res.status(404).json({ 
          success: false, 
          error: '未找到可用的LLM配置，请先配置LLM服务' 
        })
      }

      const messages = analyzeEngineeringItemsPrompt(project_name, project_description || '', total_investment)

      console.log('========== AI分析工程子项开始 ==========')
      console.log('项目名称:', project_name)
      console.log('目标投资:', total_investment, '万元')
      console.log('使用配置:', config.name)
      
      const result = await LLMService.generateContent(config, messages, {
        maxTokens: 2000,
        temperature: 0.5
      })
      
      console.log('LLM返回内容长度:', result.content?.length || 0, '字符')

      if (result.success && result.content) {
        try {
          // 尝试解析JSON
          let jsonContent = result.content
          // 提取JSON内容（如果LLM返回了额外的文字）
          const jsonMatch = result.content.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            jsonContent = jsonMatch[0]
          }
          
          const parsedData = JSON.parse(jsonContent)
          
          console.log('解析成功，生成', parsedData.items?.length || 0, '个子项')
          if (parsedData.items) {
            parsedData.items.forEach((item: any, index: number) => {
              const total = item.construction_cost + item.equipment_cost + item.installation_cost + item.other_cost
              console.log(`  子项${index + 1}: ${item.name} - ${total.toFixed(2)}万元`)
            })
          }
          if (parsedData.suggestions) {
            console.log('AI建议:', parsedData.suggestions.length, '条')
            parsedData.suggestions.forEach((suggestion: string, index: number) => {
              console.log(`  建议${index + 1}: ${suggestion}`)
            })
          }
          if (parsedData.analysis) {
            console.log('分析结果:')
            console.log('  项目类型:', parsedData.analysis.project_type)
            console.log('  费用构成:', parsedData.analysis.cost_breakdown)
            console.log('  划分依据:', parsedData.analysis.reasoning)
          }
          console.log('========== AI分析完成 ==========')
          
          // 验证数据格式
          if (!parsedData.items || !Array.isArray(parsedData.items)) {
            return res.status(400).json({
              success: false,
              error: '无效的响应格式',
              message: 'LLM返回的数据格式不正确'
            })
          }
          
          res.json({
            success: true,
            data: { 
              items: parsedData.items,
              suggestions: parsedData.suggestions || [],
              analysis: parsedData.analysis || {},
              config_name: config.name,
              debug_info: {
                timestamp: new Date().toISOString(),
                prompt_length: messages.map(m => m.content).join('').length,
                response_length: result.content?.length || 0,
                items_count: parsedData.items?.length || 0
              }
            }
          })
        } catch (parseError) {
          console.error('JSON解析错误:', parseError)
          res.status(400).json({
            success: false,
            error: '解析LLM响应失败',
            message: 'LLM返回的内容不是有效的JSON格式'
          })
        }
      } else {
        res.status(400).json({
          success: false,
          error: '分析工程子项失败',
          message: result.error
        })
      }
    } catch (error) {
      console.error('分析工程子项失败:', error)
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

  static async subdivideEngineeringItem(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: '用户未认证' 
        })
      }

      const {
        item_name,
        item_remark,
        total_amount,
        project_name,
        project_description,
        use_default_config,
        config_id
      } = req.body

      let config
      if (use_default_config) {
        config = await LLMConfigModel.findDefaultByUserId(userId)
      } else if (config_id) {
        config = await LLMConfigModel.findById(config_id)
      }

      if (!config) {
        return res.status(404).json({ 
          success: false, 
          error: '未找到可用的LLM配置，请先配置LLM服务' 
        })
      }

      const messages = subdivideEngineeringItemPrompt(
        item_name, 
        item_remark || '', 
        total_amount,
        project_name,
        project_description || ''
      )

      console.log('========== AI细分子项开始 ==========')
      console.log('项目名称:', project_name)
      console.log('子项名称:', item_name)
      console.log('子项金额:', total_amount, '万元')
      console.log('使用配置:', config.name)
      
      const result = await LLMService.generateContent(config, messages, {
        maxTokens: 2000,
        temperature: 0.5
      })
      
      console.log('LLM返回内容长度:', result.content?.length || 0, '字符')

      if (result.success && result.content) {
        try {
          let jsonContent = result.content
          const jsonMatch = result.content.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            jsonContent = jsonMatch[0]
          }
          
          const parsedData = JSON.parse(jsonContent)
          
          console.log('解析成功，生成', parsedData.subItems?.length || 0, '个三级子项')
          if (parsedData.subItems) {
            parsedData.subItems.forEach((item: any, index: number) => {
              const total = (item.quantity * item.unit_price) / 10000
              console.log(`  三级子项${index + 1}: ${item.name} - ${item.quantity}${item.unit} × ${item.unit_price}元 = ${total.toFixed(2)}万元`)
              console.log(`    费用占比: 建设${(item.construction_ratio*100).toFixed(1)}% 设备${(item.equipment_ratio*100).toFixed(1)}% 安装${(item.installation_ratio*100).toFixed(1)}% 其它${(item.other_ratio*100).toFixed(1)}%`)
            })
          }
          console.log('========== AI细分完成 ==========')
          
          if (!parsedData.subItems || !Array.isArray(parsedData.subItems)) {
            return res.status(400).json({
              success: false,
              error: '无效的响应格式',
              message: 'LLM返回的数据格式不正确'
            })
          }
          
          res.json({
            success: true,
            data: { 
              subItems: parsedData.subItems,
              config_name: config.name
            }
          })
        } catch (parseError) {
          console.error('JSON解析错误:', parseError)
          res.status(400).json({
            success: false,
            error: '解析LLM响应失败',
            message: 'LLM返回的内容不是有效的JSON格式'
          })
        }
      } else {
        res.status(400).json({
          success: false,
          error: 'AI细分失败',
          message: result.error
        })
      }
    } catch (error) {
      console.error('AI细分子项失败:', error)
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误' 
      })
    }
  }
}