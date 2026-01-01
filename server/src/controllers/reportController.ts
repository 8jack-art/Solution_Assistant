import { Request, Response } from 'express'
import { pool } from '../db/config.js'
import { ReportService } from '../services/reportService.js'
import { sseManager } from '../services/sseManager.js'
import { v4 as uuidv4 } from 'uuid'

/**
 * 报告控制器
 * 处理报告生成相关的 API 请求
 */
export class ReportController {
  /**
   * 创建新的报告记录
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, templateId, title } = req.body
      const userId = (req as any).user?.id || (req as any).userId

      if (!projectId) {
        res.status(400).json({ success: false, error: '缺少项目ID' })
        return
      }

      if (!userId) {
        res.status(401).json({ success: false, error: '未授权' })
        return
      }

      const reportId = uuidv4()
      
      await pool.execute(
        `INSERT INTO generated_reports 
         (id, project_id, template_id, user_id, report_title, generation_status) 
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [reportId, projectId, templateId || null, userId, title || '投资项目方案报告']
      )

      res.json({ success: true, reportId })
    } catch (error) {
      console.error('创建报告失败:', error)
      res.status(500).json({ success: false, error: '创建报告失败' })
    }
  }

  /**
   * 启动流式报告生成 (SSE)
   */
  static async generate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { promptTemplate } = req.body
      const userId = (req as any).user?.id || (req as any).userId

      console.log('='.repeat(60))
      console.log('启动报告生成:', id)
      console.log('提示词长度:', promptTemplate?.length || 0)

      // 获取报告信息
      const [reports] = await pool.execute(
        'SELECT * FROM generated_reports WHERE id = ?',
        [id]
      ) as any[]
      
      if (reports.length === 0) {
        res.status(404).json({ success: false, error: '报告不存在' })
        return
      }

      const report = reports[0]

      // 检查报告是否属于当前用户
      if (report.user_id !== userId) {
        res.status(403).json({ success: false, error: '无权操作此报告' })
        return
      }

      // 获取 LLM 配置
      const [configs] = await pool.execute(
        'SELECT * FROM llm_configs WHERE user_id = ? AND is_default = TRUE',
        [userId]
      ) as any[]
      
      if (configs.length === 0) {
        // 如果没有默认配置，尝试获取第一个配置
        const [allConfigs] = await pool.execute(
          'SELECT * FROM llm_configs WHERE user_id = ? LIMIT 1',
          [userId]
        ) as any[]
        
        if (allConfigs.length === 0) {
          res.status(400).json({ success: false, error: '未配置 LLM，请先配置大模型' })
          return
        }
        
        configs.push(allConfigs[0])
      }

      const llmConfig = configs[0]
      
      // 获取项目信息
      const [projects] = await pool.execute(
        'SELECT * FROM investment_projects WHERE id = ?',
        [report.project_id]
      ) as any[]
      
      if (projects.length === 0) {
        res.status(404).json({ success: false, error: '项目不存在' })
        return
      }

      const project = projects[0]

      // 设置 SSE 响应头
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no') // 禁用 Nginx 缓冲

      // 注册 SSE 连接
      sseManager.register(id, res)

      // 更新报告状态为生成中
      await pool.execute(
        'UPDATE generated_reports SET generation_status = ?, updated_at = NOW() WHERE id = ?',
        ['generating', id]
      )

      // 启动流式生成
      console.log('开始调用 ReportService.generateReportStream...')
      await ReportService.generateReportStream(id, llmConfig, promptTemplate, project)
      
      console.log('流式生成调用完成')
    } catch (error) {
      console.error('生成报告失败:', error)
      
      // 尝试发送错误到前端
      const { id } = req.params
      if (sseManager.isConnected(id)) {
        sseManager.fail(id, error instanceof Error ? error.message : '生成报告失败')
      }
      
      // 更新报告状态为失败
      try {
        await pool.execute(
          'UPDATE generated_reports SET generation_status = ?, updated_at = NOW() WHERE id = ?',
          ['failed', id]
        )
      } catch {
        // 忽略数据库更新错误
      }
      
      // 关闭响应
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: '生成报告失败' })
      } else {
        res.end()
      }
    }
  }

  /**
   * 获取 SSE 事件流 (用于前端连接)
   */
  static async stream(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = (req as any).user?.id || (req as any).userId

      console.log('SSE 连接请求，报告ID:', id)

      // 获取报告信息验证权限
      const [reports] = await pool.execute(
        'SELECT * FROM generated_reports WHERE id = ?',
        [id]
      ) as any[]
      
      if (reports.length === 0) {
        res.status(404).json({ success: false, error: '报告不存在' })
        return
      }

      const report = reports[0]

      // 检查报告是否属于当前用户
      if (report.user_id !== userId) {
        res.status(403).json({ success: false, error: '无权操作此报告' })
        return
      }

      // 设置 SSE 响应头
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')

      // 注册 SSE 连接
      sseManager.register(id, res)

      // 如果报告已有内容，发送已有内容
      if (report.report_content) {
        sseManager.send(id, {
          type: 'content',
          status: report.generation_status,
          content: report.report_content,
          progress: report.report_content.length
        })
      }

      // 如果已完成或失败，发送完成事件
      if (['completed', 'failed', 'paused'].includes(report.generation_status)) {
        sseManager.send(id, {
          type: report.generation_status === 'completed' ? 'completed' : 'error',
          status: report.generation_status,
          content: report.report_content || ''
        })
      }

      console.log('SSE 连接已建立，报告状态:', report.generation_status)
    } catch (error) {
      console.error('SSE 连接失败:', error)
      res.status(500).json({ success: false, error: '连接失败' })
    }
  }

  /**
   * 获取报告详情
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = (req as any).user?.id || (req as any).userId

      const [reports] = await pool.execute(
        `SELECT r.*, t.name as template_name, t.prompt_template 
         FROM generated_reports r 
         LEFT JOIN report_templates t ON r.template_id = t.id 
         WHERE r.id = ?`,
        [id]
      ) as any[]
      
      if (reports.length === 0) {
        res.status(404).json({ success: false, error: '报告不存在' })
        return
      }

      const report = reports[0]

      // 检查权限
      if (report.user_id !== userId) {
        res.status(403).json({ success: false, error: '无权查看此报告' })
        return
      }

      res.json({ success: true, report })
    } catch (error) {
      console.error('获取报告失败:', error)
      res.status(500).json({ success: false, error: '获取报告失败' })
    }
  }

  /**
   * 获取项目的报告列表
   */
  static async getByProjectId(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params
      const userId = (req as any).user?.id || (req as any).userId

      const [reports] = await pool.execute(
        `SELECT r.*, t.name as template_name 
         FROM generated_reports r 
         LEFT JOIN report_templates t ON r.template_id = t.id 
         WHERE r.project_id = ? AND r.user_id = ?
         ORDER BY r.created_at DESC`,
        [projectId, userId]
      ) as any[]

      res.json({ success: true, reports })
    } catch (error) {
      console.error('获取报告列表失败:', error)
      res.status(500).json({ success: false, error: '获取报告列表失败' })
    }
  }

  /**
   * 暂停报告生成
   */
  static async pause(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = (req as any).user?.id || (req as any).userId

      // 验证权限
      const [reports] = await pool.execute(
        'SELECT * FROM generated_reports WHERE id = ?',
        [id]
      ) as any[]
      
      if (reports.length === 0) {
        res.status(404).json({ success: false, error: '报告不存在' })
        return
      }

      if (reports[0].user_id !== userId) {
        res.status(403).json({ success: false, error: '无权操作此报告' })
        return
      }

      await ReportService.pauseReportGeneration(id)
      
      res.json({ success: true, message: '已暂停' })
    } catch (error) {
      console.error('暂停失败:', error)
      res.status(500).json({ success: false, error: '暂停失败' })
    }
  }

  /**
   * 继续报告生成
   */
  static async resume(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = (req as any).user?.id || (req as any).userId

      // 验证权限
      const [reports] = await pool.execute(
        'SELECT * FROM generated_reports WHERE id = ?',
        [id]
      ) as any[]
      
      if (reports.length === 0) {
        res.status(404).json({ success: false, error: '报告不存在' })
        return
      }

      if (reports[0].user_id !== userId) {
        res.status(403).json({ success: false, error: '无权操作此报告' })
        return
      }

      await ReportService.resumeReportGeneration(id)
      
      res.json({ success: true, message: '已继续' })
    } catch (error) {
      console.error('继续失败:', error)
      res.status(500).json({ success: false, error: '继续失败' })
    }
  }

  /**
   * 停止报告生成
   */
  static async stop(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = (req as any).user?.id || (req as any).userId

      // 验证权限
      const [reports] = await pool.execute(
        'SELECT * FROM generated_reports WHERE id = ?',
        [id]
      ) as any[]
      
      if (reports.length === 0) {
        res.status(404).json({ success: false, error: '报告不存在' })
        return
      }

      if (reports[0].user_id !== userId) {
        res.status(403).json({ success: false, error: '无权操作此报告' })
        return
      }

      // 断开 SSE 连接
      sseManager.unregister(id)

      await ReportService.stopReportGeneration(id)
      
      res.json({ success: true, message: '已停止' })
    } catch (error) {
      console.error('停止失败:', error)
      res.status(500).json({ success: false, error: '停止失败' })
    }
  }

  /**
   * 导出 Word 文档
   */
  static async export(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = (req as any).user?.id || (req as any).userId

      // 获取报告内容
      const [reports] = await pool.execute(
        'SELECT * FROM generated_reports WHERE id = ?',
        [id]
      ) as any[]
      
      if (reports.length === 0) {
        res.status(404).json({ success: false, error: '报告不存在' })
        return
      }

      const report = reports[0]

      // 检查权限
      if (report.user_id !== userId) {
        res.status(403).json({ success: false, error: '无权导出此报告' })
        return
      }

      if (!report.report_content) {
        res.status(400).json({ success: false, error: '报告内容为空' })
        return
      }

      // 生成 Word 文档
      const buffer = await ReportService.generateWordDocument(
        report.report_content,
        report.report_title
      )

      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(report.report_title)}.docx"`)

      res.send(buffer)
    } catch (error) {
      console.error('导出失败:', error)
      res.status(500).json({ success: false, error: '导出失败' })
    }
  }

  /**
   * 获取模板列表
   */
  static async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req as any).userId

      const [templates] = await pool.execute(
        `SELECT * FROM report_templates 
         WHERE user_id = ? OR is_system = TRUE 
         ORDER BY is_system DESC, created_at DESC`,
        [userId]
      ) as any[]

      res.json({ success: true, templates })
    } catch (error) {
      console.error('获取模板列表失败:', error)
      res.status(500).json({ success: false, error: '获取模板列表失败' })
    }
  }

  /**
   * 保存模板
   */
  static async saveTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, promptTemplate, isDefault } = req.body
      const userId = (req as any).user?.id || (req as any).userId

      if (!name || !promptTemplate) {
        res.status(400).json({ success: false, error: '模板名称和提示词不能为空' })
        return
      }

      const templateId = uuidv4()
      
      await pool.execute(
        `INSERT INTO report_templates 
         (id, user_id, name, description, prompt_template, is_default, is_system) 
         VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
        [templateId, userId, name, description || '', promptTemplate, isDefault || false]
      )

      res.json({ success: true, templateId })
    } catch (error) {
      console.error('保存模板失败:', error)
      res.status(500).json({ success: false, error: '保存模板失败' })
    }
  }

  /**
   * 删除模板
   */
  static async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = (req as any).user?.id || (req as any).userId

      // 检查是否为系统模板
      const [templates] = await pool.execute(
        'SELECT * FROM report_templates WHERE id = ?',
        [id]
      ) as any[]
      
      if (templates.length === 0) {
        res.status(404).json({ success: false, error: '模板不存在' })
        return
      }

      if (templates[0].is_system) {
        res.status(403).json({ success: false, error: '系统模板不能删除' })
        return
      }

      if (templates[0].user_id !== userId) {
        res.status(403).json({ success: false, error: '无权删除此模板' })
        return
      }

      await pool.execute(
        'DELETE FROM report_templates WHERE id = ?',
        [id]
      )

      res.json({ success: true })
    } catch (error) {
      console.error('删除模板失败:', error)
      res.status(500).json({ success: false, error: '删除模板失败' })
    }
  }

  /**
   * 获取项目的汇总数据（用于变量替换）
   */
  static async getProjectSummary(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params
      const userId = (req as any).user?.id || (req as any).userId

      // 获取项目基本信息
      const [projects] = await pool.execute(
        'SELECT * FROM investment_projects WHERE id = ? AND user_id = ?',
        [projectId, userId]
      ) as any[]
      
      if (projects.length === 0) {
        res.status(404).json({ success: false, error: '项目不存在' })
        return
      }

      const project = projects[0]

      // 收集项目数据
      const projectData = await ReportService.collectProjectData(projectId)

      res.json({ 
        success: true, 
        data: {
          project: {
            id: project.id,
            name: project.project_name,
            description: project.project_info || '',
            totalInvestment: project.total_investment,
            constructionYears: project.construction_years,
            operationYears: project.operation_years,
            industry: project.industry || '',
            location: project.location || ''
          },
          investment: projectData.investment,
          revenueCost: projectData.revenueCost,
          financialIndicators: projectData.financialIndicators
        }
      })
    } catch (error) {
      console.error('获取项目汇总数据失败:', error)
      res.status(500).json({ success: false, error: '获取项目汇总数据失败' })
    }
  }
}
