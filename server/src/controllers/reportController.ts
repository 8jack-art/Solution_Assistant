import { Response } from 'express'
import { z } from 'zod'
import { pool } from '../db/config.js'
import { ApiResponse, AuthRequest } from '../types/index.js'
import { InvestmentProjectModel } from '../models/InvestmentProject.js'
import { LLMService } from '../lib/llm.js'
import { LLMConfigModel } from '../models/LLMConfig.js'
import { ReportService } from '../services/reportService.js'

// 验证Schema
const generateReportSchema = z.object({
  project_id: z.string().min(1, '项目ID不能为空'),
  template_id: z.string().optional(),
  custom_prompt: z.string().optional(),
  report_title: z.string().min(1, '报告标题不能为空'),
  use_default_config: z.boolean().default(true),
  config_id: z.string().optional(),
})

const createTemplateSchema = z.object({
  name: z.string().min(1, '模板名称不能为空'),
  description: z.string().optional(),
  prompt_template: z.string().min(1, '提示词模板不能为空'),
  is_default: z.boolean().default(false),
})

const updateTemplateSchema = createTemplateSchema.partial()

const exportReportSchema = z.object({
  report_id: z.string().min(1, '报告ID不能为空'),
  format: z.enum(['docx']).default('docx'),
  title: z.string().optional(),
})

const previewReportSchema = z.object({
  content: z.string().min(1, '内容不能为空'),
  format: z.enum(['html', 'markdown']).default('html'),
})

/**
 * 投资方案报告控制器
 */
export class ReportController {
  /**
   * 生成投资方案报告
   */
  static async generate(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId
      const isAdmin = req.user?.isAdmin

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '用户未认证'
        })
      }

      const validatedData = generateReportSchema.parse(req.body)

      // 验证项目存在且有权限
      const project = await InvestmentProjectModel.findById(validatedData.project_id)
      if (!project) {
        return res.status(404).json({
          success: false,
          error: '项目不存在'
        })
      }

      if (!isAdmin && project.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: '无权操作此项目'
        })
      }

      // 获取LLM配置
      let llmConfig
      if (validatedData.use_default_config) {
        llmConfig = await LLMConfigModel.findDefaultByUserId(userId)
      } else if (validatedData.config_id) {
        llmConfig = await LLMConfigModel.findById(validatedData.config_id)
      }

      if (!llmConfig) {
        return res.status(400).json({
          success: false,
          error: '未找到可用的LLM配置，请先配置LLM服务'
        })
      }

      // 获取模板或使用自定义提示词
      let promptTemplate = validatedData.custom_prompt
      if (validatedData.template_id && !promptTemplate) {
        const [templates] = await (pool as any).execute(
          'SELECT prompt_template FROM report_templates WHERE id = ?',
          [validatedData.template_id]
        ) as any[]
        
        if (!templates || templates.length === 0) {
          return res.status(404).json({
            success: false,
            error: '模板不存在'
          })
        }
        
        promptTemplate = templates[0].prompt_template
      }

      if (!promptTemplate) {
        return res.status(400).json({
          success: false,
          error: '请选择模板或提供自定义提示词'
        })
      }

      // 创建报告记录
      const [insertResult] = await (pool as any).execute(
        `INSERT INTO generated_reports 
         (project_id, template_id, user_id, report_title, generation_status) 
         VALUES (?, ?, ?, ?, 'generating')`,
        [
          validatedData.project_id,
          validatedData.template_id || null,
          userId,
          validatedData.report_title
        ]
      ) as any[]

      const reportId = insertResult.insertId

      // 异步生成报告
      ReportService.generateReportAsync(reportId, llmConfig, promptTemplate, project)
        .catch(error => {
          console.error('异步生成报告失败:', error)
          // 更新报告状态为失败
          pool.execute(
            'UPDATE generated_reports SET generation_status = ?, report_content = ? WHERE id = ?',
            ['failed', error.message, reportId]
          )
        })

      res.json({
        success: true,
        data: {
          report_id: reportId,
          message: '报告生成已开始，请使用流式接口获取生成进度'
        }
      })
    } catch (error) {
      console.error('生成报告失败:', error)
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

  /**
   * 流式获取报告生成内容
   */
  static async stream(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId
      const isAdmin = req.user?.isAdmin
      const { reportId } = req.params

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '用户未认证'
        })
      }

      // 验证报告存在且有权限
      const [reports] = await (pool as any).execute(
        'SELECT * FROM generated_reports WHERE id = ?',
        [reportId]
      ) as any[]

      if (!reports || reports.length === 0) {
        return res.status(404).json({
          success: false,
          error: '报告不存在'
        })
      }

      const report = reports[0]

      // 验证权限
      if (!isAdmin && report.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: '无权查看此报告'
        })
      }

      // 设置SSE响应头
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      })

      // 发送初始状态
      res.write(`data: ${JSON.stringify({
        type: 'status',
        status: report.generation_status,
        content: report.report_content || '',
        title: report.report_title
      })}\n\n`)

      // 如果报告已完成，发送完成事件
      if (report.generation_status === 'completed') {
        res.write(`data: ${JSON.stringify({
          type: 'completed',
          content: report.report_content || '',
          title: report.report_title
        })}\n\n`)
        res.end()
        return
      }

      // 如果报告失败，发送错误事件
      if (report.generation_status === 'failed') {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: report.report_content || '生成失败'
        })}\n\n`)
        res.end()
        return
      }

      // 定期检查报告状态
      const checkInterval = setInterval(async () => {
        try {
          const [currentReports] = await (pool as any).execute(
            'SELECT * FROM generated_reports WHERE id = ?',
            [reportId]
          ) as any[]

          if (!currentReports || currentReports.length === 0) {
            clearInterval(checkInterval)
            res.write(`data: ${JSON.stringify({
              type: 'error',
              error: '报告不存在'
            })}\n\n`)
            res.end()
            return
          }

          const currentReport = currentReports[0]

          // 获取历史记录
          const [history] = await (pool as any).execute(
            'SELECT * FROM report_generation_history WHERE report_id = ? ORDER BY chunk_order ASC',
            [reportId]
          ) as any[]

          // 构建完整内容
          let fullContent = ''
          if (history && history.length > 0) {
            fullContent = history.map(h => h.chunk_content || '').join('')
          } else if (currentReport.report_content) {
            fullContent = currentReport.report_content
          }

          // 发送内容更新
          res.write(`data: ${JSON.stringify({
            type: 'content',
            status: currentReport.generation_status,
            content: fullContent,
            title: currentReport.report_title,
            progress: history ? history.length : 0
          })}\n\n`)

          // 如果生成完成或失败，结束连接
          if (currentReport.generation_status === 'completed' || 
              currentReport.generation_status === 'failed') {
            
            if (currentReport.generation_status === 'completed') {
              res.write(`data: ${JSON.stringify({
                type: 'completed',
                content: fullContent,
                title: currentReport.report_title
              })}\n\n`)
            } else {
              res.write(`data: ${JSON.stringify({
                type: 'error',
                error: currentReport.report_content || '生成失败'
              })}\n\n`)
            }
            
            clearInterval(checkInterval)
            res.end()
          }
        } catch (error) {
          console.error('检查报告状态失败:', error)
          clearInterval(checkInterval)
          res.write(`data: ${JSON.stringify({
            type: 'error',
            error: '检查状态失败'
          })}\n\n`)
          res.end()
        }
      }, 1000) // 每秒检查一次

      // 设置超时，避免长时间占用连接
      setTimeout(() => {
        clearInterval(checkInterval)
        res.end()
      }, 300000) // 5分钟超时

      req.on('close', () => {
        clearInterval(checkInterval)
      })
    } catch (error) {
      console.error('流式获取报告失败:', error)
      res.status(500).json({
        success: false,
        error: '服务器内部错误'
      })
    }
  }

  /**
   * 获取报告详情
   */
  static async getById(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId
      const isAdmin = req.user?.isAdmin
      const { id } = req.params

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '用户未认证'
        })
      }

      const [reports] = await (pool as any).execute(
        'SELECT * FROM generated_reports WHERE id = ?',
        [id]
      ) as any[]

      if (!reports || reports.length === 0) {
        return res.status(404).json({
          success: false,
          error: '报告不存在'
        })
      }

      const report = reports[0]

      // 验证权限
      if (!isAdmin && report.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: '无权查看此报告'
        })
      }

      // 解析JSON字段
      if (report.report_data && typeof report.report_data === 'string') {
        try {
          report.report_data = JSON.parse(report.report_data)
        } catch (e) {
          console.warn('解析report_data失败:', e)
        }
      }

      res.json({
        success: true,
        data: { report }
      })
    } catch (error) {
      console.error('获取报告详情失败:', error)
      res.status(500).json({
        success: false,
        error: '服务器内部错误'
      })
    }
  }

  /**
   * 获取项目的所有报告
   */
  static async getByProjectId(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId
      const isAdmin = req.user?.isAdmin
      const { projectId } = req.params

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '用户未认证'
        })
      }

      // 验证项目存在且有权限
      const project = await InvestmentProjectModel.findById(projectId)
      if (!project) {
        return res.status(404).json({
          success: false,
          error: '项目不存在'
        })
      }

      if (!isAdmin && project.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: '无权查看此项目'
        })
      }

      const [reports] = await (pool as any).execute(
        'SELECT * FROM generated_reports WHERE project_id = ? ORDER BY created_at DESC',
        [projectId]
      ) as any[]

      res.json({
        success: true,
        data: { reports }
      })
    } catch (error) {
      console.error('获取项目报告列表失败:', error)
      res.status(500).json({
        success: false,
        error: '服务器内部错误'
      })
    }
  }

  /**
   * 删除报告
   */
  static async delete(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId
      const isAdmin = req.user?.isAdmin
      const { id } = req.params

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '用户未认证'
        })
      }

      const [reports] = await (pool as any).execute(
        'SELECT * FROM generated_reports WHERE id = ?',
        [id]
      ) as any[]

      if (!reports || reports.length === 0) {
        return res.status(404).json({
          success: false,
          error: '报告不存在'
        })
      }

      const report = reports[0]

      // 验证权限
      if (!isAdmin && report.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: '无权删除此报告'
        })
      }

      // 删除报告（会级联删除历史记录）
      await (pool as any).execute('DELETE FROM generated_reports WHERE id = ?', [id])

      res.json({
        success: true,
        message: '报告删除成功'
      })
    } catch (error) {
      console.error('删除报告失败:', error)
      res.status(500).json({
        success: false,
        error: '服务器内部错误'
      })
    }
  }

  /**
   * 创建报告模板
   */
  static async createTemplate(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '用户未认证'
        })
      }

      const validatedData = createTemplateSchema.parse(req.body)

      // 如果设置为默认，先取消其他默认模板
      if (validatedData.is_default) {
        await (pool as any).execute(
          'UPDATE report_templates SET is_default = FALSE WHERE user_id = ?',
          [userId]
        )
      }

      const [insertResult] = await (pool as any).execute(
        `INSERT INTO report_templates 
         (user_id, name, description, prompt_template, is_default) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          validatedData.name,
          validatedData.description || null,
          validatedData.prompt_template,
          validatedData.is_default
        ]
      ) as any[]

      const templateId = insertResult.insertId

      res.status(201).json({
        success: true,
        data: {
          template: {
            id: templateId,
            ...validatedData
          }
        }
      })
    } catch (error) {
      console.error('创建报告模板失败:', error)
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

  /**
   * 获取报告模板列表
   */
  static async getTemplates(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId
      const isAdmin = req.user?.isAdmin

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '用户未认证'
        })
      }

      let query = 'SELECT * FROM report_templates WHERE user_id = ? OR is_system = TRUE'
      let params = [userId]

      // 如果是管理员，可以获取所有模板
      if (isAdmin) {
        query = 'SELECT * FROM report_templates'
        params = []
      }

      const [templates] = await (pool as any).execute(query, params) as any[]

      res.json({
        success: true,
        data: { templates }
      })
    } catch (error) {
      console.error('获取报告模板列表失败:', error)
      res.status(500).json({
        success: false,
        error: '服务器内部错误'
      })
    }
  }

  /**
   * 更新报告模板
   */
  static async updateTemplate(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId
      const isAdmin = req.user?.isAdmin
      const { id } = req.params

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '用户未认证'
        })
      }

      const validatedData = updateTemplateSchema.parse(req.body)

      // 验证模板存在且有权限
      const [templates] = await (pool as any).execute(
        'SELECT * FROM report_templates WHERE id = ?',
        [id]
      ) as any[]

      if (!templates || templates.length === 0) {
        return res.status(404).json({
          success: false,
          error: '模板不存在'
        })
      }

      const template = templates[0]

      // 验证权限（系统模板只有管理员可以修改）
      if (template.is_system && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: '无权修改系统模板'
        })
      }

      if (!isAdmin && template.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: '无权修改此模板'
        })
      }

      // 如果设置为默认，先取消其他默认模板
      if (validatedData.is_default) {
        await (pool as any).execute(
          'UPDATE report_templates SET is_default = FALSE WHERE user_id = ? AND id != ?',
          [userId, id]
        )
      }

      const updateFields: string[] = []
      const updateValues: any[] = []

      if (validatedData.name !== undefined) {
        updateFields.push('name = ?')
        updateValues.push(validatedData.name)
      }
      if (validatedData.description !== undefined) {
        updateFields.push('description = ?')
        updateValues.push(validatedData.description)
      }
      if (validatedData.prompt_template !== undefined) {
        updateFields.push('prompt_template = ?')
        updateValues.push(validatedData.prompt_template)
      }
      if (validatedData.is_default !== undefined) {
        updateFields.push('is_default = ?')
        updateValues.push(validatedData.is_default)
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: '没有需要更新的字段'
        })
      }

      updateFields.push('updated_at = NOW()')
      updateValues.push(id)

      await (pool as any).execute(
        `UPDATE report_templates SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      )

      res.json({
        success: true,
        message: '模板更新成功'
      })
    } catch (error) {
      console.error('更新报告模板失败:', error)
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

  /**
   * 删除报告模板
   */
  static async deleteTemplate(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId
      const isAdmin = req.user?.isAdmin
      const { id } = req.params

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '用户未认证'
        })
      }

      // 验证模板存在且有权限
      const [templates] = await (pool as any).execute(
        'SELECT * FROM report_templates WHERE id = ?',
        [id]
      ) as any[]

      if (!templates || templates.length === 0) {
        return res.status(404).json({
          success: false,
          error: '模板不存在'
        })
      }

      const template = templates[0]

      // 验证权限（系统模板只有管理员可以删除）
      if (template.is_system && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: '无权删除系统模板'
        })
      }

      if (!isAdmin && template.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: '无权删除此模板'
        })
      }

      await (pool as any).execute('DELETE FROM report_templates WHERE id = ?', [id])

      res.json({
        success: true,
        message: '模板删除成功'
      })
    } catch (error) {
      console.error('删除报告模板失败:', error)
      res.status(500).json({
        success: false,
        error: '服务器内部错误'
      })
    }
  }

  /**
   * 设置默认模板
   */
  static async setDefaultTemplate(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId
      const { template_id } = req.body

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '用户未认证'
        })
      }

      if (!template_id) {
        return res.status(400).json({
          success: false,
          error: '模板ID不能为空'
        })
      }

      // 验证模板存在且有权限
      const [templates] = await (pool as any).execute(
        'SELECT * FROM report_templates WHERE id = ?',
        [template_id]
      ) as any[]

      if (!templates || templates.length === 0) {
        return res.status(404).json({
          success: false,
          error: '模板不存在'
        })
      }

      const template = templates[0]

      // 验证权限（系统模板不能设置为个人默认）
      if (template.is_system) {
        return res.status(400).json({
          success: false,
          error: '系统模板不能设置为个人默认'
        })
      }

      if (template.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: '无权操作此模板'
        })
      }

      // 取消其他默认模板，设置当前为默认
      await (pool as any).execute(
        'UPDATE report_templates SET is_default = FALSE WHERE user_id = ?',
        [userId]
      )

      await (pool as any).execute(
        'UPDATE report_templates SET is_default = TRUE WHERE id = ?',
        [template_id]
      )

      res.json({
        success: true,
        message: '默认模板设置成功'
      })
    } catch (error) {
      console.error('设置默认模板失败:', error)
      res.status(500).json({
        success: false,
        error: '服务器内部错误'
      })
    }
  }

  /**
   * 预览报告内容
   */
  static async preview(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '用户未认证'
        })
      }

      const validatedData = previewReportSchema.parse(req.body)

      // 生成预览HTML
      const previewHtml = ReportService.generatePreview(validatedData.content, validatedData.format)

      res.json({
        success: true,
        data: {
          preview: previewHtml,
          format: validatedData.format
        }
      })
    } catch (error) {
      console.error('预览报告失败:', error)
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

  /**
   * 导出Word文档
   */
  static async export(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId
      const isAdmin = req.user?.isAdmin

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '用户未认证'
        })
      }

      const validatedData = exportReportSchema.parse(req.body)

      // 验证报告存在且有权限
      const [reports] = await (pool as any).execute(
        'SELECT * FROM generated_reports WHERE id = ?',
        [validatedData.report_id]
      ) as any[]

      if (!reports || reports.length === 0) {
        return res.status(404).json({
          success: false,
          error: '报告不存在'
        })
      }

      const report = reports[0]

      // 验证权限
      if (!isAdmin && report.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: '无权导出此报告'
        })
      }

      // 获取完整内容
      let content = report.report_content || ''
      
      // 如果有历史记录，从历史记录构建完整内容
      if (!content) {
        const [history] = await (pool as any).execute(
          'SELECT chunk_content FROM report_generation_history WHERE report_id = ? ORDER BY chunk_order ASC',
          [validatedData.report_id]
        ) as any[]

        if (history && history.length > 0) {
          content = history.map(h => h.chunk_content || '').join('')
        }
      }

      if (!content) {
        return res.status(400).json({
          success: false,
          error: '报告内容为空，无法导出'
        })
      }

      // 生成Word文档
      const docxBuffer = await ReportService.generateWordDocument(
        content,
        validatedData.title || report.report_title
      )

      // 设置响应头
      const filename = `${validatedData.title || report.report_title}.docx`
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
      res.setHeader('Content-Length', docxBuffer.length)

      res.send(docxBuffer)
    } catch (error) {
      console.error('导出Word文档失败:', error)
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
}