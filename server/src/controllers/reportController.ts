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
   * 获取当前用户ID
   */
  private static getUserId(req: Request): string | null {
    const user = (req as any).user
    return user?.userId || null
  }

  /**
   * 创建新的报告记录
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, templateId, title } = req.body
      const userId = ReportController.getUserId(req)

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
         VALUES (?, ?, ?, ?, ?, 'generating')`,
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
      const userId = ReportController.getUserId(req)

      console.log('='.repeat(60))
      console.log('【诊断】启动报告生成')
      console.log('【诊断】报告ID:', id)
      console.log('【诊断】提示词长度:', promptTemplate?.length || 0)
      console.log('【诊断】用户ID:', userId)
      console.log('【诊断】请求头:', JSON.stringify(req.headers, null, 2))

      if (!userId) {
        console.error('【诊断】ERROR: 用户未授权')
        res.status(401).json({ success: false, error: '未授权' })
        return
      }

      // 获取报告信息
      const [reports] = await pool.execute(
        'SELECT * FROM generated_reports WHERE id = ?',
        [id]
      ) as any[]
      
      console.log('【诊断】查询报告结果:', reports.length, '条')
      
      if (reports.length === 0) {
        console.error('【诊断】ERROR: 报告不存在')
        res.status(404).json({ success: false, error: '报告不存在' })
        return
      }

      const report = reports[0]
      console.log('【诊断】报告信息:', JSON.stringify(report, null, 2))

      // 检查报告是否属于当前用户
      if (report.user_id !== userId) {
        console.error('【诊断】ERROR: 无权操作此报告, 报告用户:', report.user_id, '当前用户:', userId)
        res.status(403).json({ success: false, error: '无权操作此报告' })
        return
      }

      // 获取 LLM 配置
      console.log('【诊断】开始查询LLM配置...')
      const [configs] = await pool.execute(
        'SELECT * FROM llm_configs WHERE user_id = ? AND is_default = TRUE',
        [userId]
      ) as any[]
      
      console.log('【诊断】默认LLM配置查询结果:', configs.length, '条')
      
      if (configs.length === 0) {
        // 如果没有默认配置，尝试获取第一个配置
        console.log('【诊断】无默认配置，尝试获取第一个配置...')
        const [allConfigs] = await pool.execute(
          'SELECT * FROM llm_configs WHERE user_id = ? LIMIT 1',
          [userId]
        ) as any[]
        
        console.log('【诊断】所有LLM配置查询结果:', allConfigs.length, '条')
        
        if (allConfigs.length === 0) {
          console.error('【诊断】ERROR: 未配置LLM')
          res.status(400).json({ success: false, error: '未配置 LLM，请先配置大模型' })
          return
        }
        
        configs.push(allConfigs[0])
      }

      const llmConfig = configs[0]
      console.log('【诊断】使用的LLM配置:', JSON.stringify({
        provider: llmConfig.provider,
        model: llmConfig.model,
        id: llmConfig.id
      }, null, 2))
      
      // 获取项目信息
      console.log('【诊断】开始查询项目信息...')
      const [projects] = await pool.execute(
        'SELECT * FROM investment_projects WHERE id = ?',
        [report.project_id]
      ) as any[]
      
      console.log('【诊断】项目查询结果:', projects.length, '条')
      
      if (projects.length === 0) {
        console.error('【诊断】ERROR: 项目不存在')
        res.status(404).json({ success: false, error: '项目不存在' })
        return
      }

      const project = projects[0]
      console.log('【诊断】项目信息:', JSON.stringify({
        id: project.id,
        project_name: project.project_name,
        total_investment: project.total_investment
      }, null, 2))

      // 设置 SSE 响应头
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no') // 禁用 Nginx 缓冲

      // 注册 SSE 连接
      console.log('【诊断】注册SSE连接...')
      sseManager.register(id, res)

      // 更新报告状态为生成中
      await pool.execute(
        'UPDATE generated_reports SET generation_status = ?, updated_at = NOW() WHERE id = ?',
        ['generating', id]
      )
      console.log('【诊断】报告状态已更新为generating')

      // 启动流式生成
      console.log('【诊断】开始调用 ReportService.generateReportStream...')
      await ReportService.generateReportStream(id, llmConfig, promptTemplate, project)
      
      console.log('【诊断】流式生成调用完成')
    } catch (error) {
      console.error('【诊断】生成报告失败:', error)
      console.error('【诊断】错误堆栈:', error instanceof Error ? error.stack : '未知')
      
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
      const userId = ReportController.getUserId(req)

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
      const userId = ReportController.getUserId(req)

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
      const userId = ReportController.getUserId(req)

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
      const userId = ReportController.getUserId(req)

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
      const userId = ReportController.getUserId(req)

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
      const userId = ReportController.getUserId(req)

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

      // 设置停止标志，让流式生成循环检测并退出
      // 注意：不要在这里调用 unregister，因为它会删除 stopFlags
      console.log('【停止】设置停止标志...')
      sseManager.setStopFlag(id)
      
      // 不立即调用 unregister，让流式生成循环自己检测到停止标志后自然退出
      // 循环退出后，finally 块会释放 reader 锁
      
      await ReportService.stopReportGeneration(id)
      
      res.json({ success: true, message: '已停止' })
    } catch (error) {
      console.error('停止失败:', error)
      res.status(500).json({ success: false, error: '停止失败' })
    }
  }

  /**
   * 导出 Word 文档（扩展版本，支持章节和资源配置）
   */
  static async exportWithConfig(req: Request, res: Response): Promise<void> {
    try {
      const { 
        title, 
        sections, 
        styleConfig, 
        resources 
      } = req.body
      const userId = ReportController.getUserId(req)

      if (!userId) {
        res.status(401).json({ success: false, error: '未授权' })
        return
      }

      // 生成 Word 文档
      const buffer = await ReportService.generateWordDocument(
        '', // content - 留空，使用sections
        title || '投资方案报告',
        { sections, resources, styleConfig }
      )

      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title || '投资方案报告')}.docx"`)

      res.send(buffer)
    } catch (error) {
      console.error('导出失败:', error)
      res.status(500).json({ success: false, error: '导出失败' })
    }
  }

  /**
   * 导出 Word 文档（从数据库读取报告内容）
   */
  static async export(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = ReportController.getUserId(req)

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
      const userId = ReportController.getUserId(req)
      console.log('getTemplates called, userId:', userId)

      const [templates] = await pool.execute(
        `SELECT * FROM report_templates 
         WHERE user_id = ? OR is_system = TRUE 
         ORDER BY is_system DESC, created_at DESC`,
        [userId]
      ) as any[]

      console.log('getTemplates found:', templates.length, 'templates')

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
      const userId = ReportController.getUserId(req)

      if (!name) {
        res.status(400).json({ success: false, error: '模板名称不能为空' })
        return
      }

      // 如果没有提供提示词，则为重命名操作
      if (!promptTemplate) {
        // 重命名：检查是否有模板ID或其他标识
        // 这里简化处理，新建模板时必须有提示词
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
      const userId = ReportController.getUserId(req)

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
   * 重命名模板
   */
  static async renameTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { name } = req.body
      const userId = ReportController.getUserId(req)

      if (!name) {
        res.status(400).json({ success: false, error: '模板名称不能为空' })
        return
      }

      // 检查模板是否存在且属于当前用户
      const [templates] = await pool.execute(
        'SELECT * FROM report_templates WHERE id = ?',
        [id]
      ) as any[]
      
      if (templates.length === 0) {
        res.status(404).json({ success: false, error: '模板不存在' })
        return
      }

      if (templates[0].is_system) {
        res.status(403).json({ success: false, error: '系统模板不能重命名' })
        return
      }

      if (templates[0].user_id !== userId) {
        res.status(403).json({ success: false, error: '无权操作此模板' })
        return
      }

      await pool.execute(
        'UPDATE report_templates SET name = ?, updated_at = NOW() WHERE id = ?',
        [name, id]
      )

      res.json({ success: true, message: '重命名成功' })
    } catch (error) {
      console.error('重命名模板失败:', error)
      res.status(500).json({ success: false, error: '重命名模板失败' })
    }
  }

  /**
   * 更新模板内容
   */
  static async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { name, description, promptTemplate } = req.body
      const userId = ReportController.getUserId(req)

      // 检查模板是否存在
      const [templates] = await pool.execute(
        'SELECT * FROM report_templates WHERE id = ?',
        [id]
      ) as any[]
      
      if (templates.length === 0) {
        res.status(404).json({ success: false, error: '模板不存在' })
        return
      }

      const template = templates[0]

      // 检查权限：只能修改自己的模板，系统模板也可以修改
      if (template.user_id !== userId && !template.is_system) {
        res.status(403).json({ success: false, error: '无权操作此模板' })
        return
      }

      // 构建更新字段
      const updates: string[] = []
      const values: any[] = []

      if (name !== undefined) {
        updates.push('name = ?')
        values.push(name)
      }
      if (description !== undefined) {
        updates.push('description = ?')
        values.push(description)
      }
      if (promptTemplate !== undefined) {
        updates.push('prompt_template = ?')
        values.push(promptTemplate)
      }

      if (updates.length === 0) {
        res.status(400).json({ success: false, error: '没有要更新的字段' })
        return
      }

      updates.push('updated_at = NOW()')
      values.push(id)

      await pool.execute(
        `UPDATE report_templates SET ${updates.join(', ')} WHERE id = ?`,
        values
      )

      res.json({ success: true, message: '模板已更新' })
    } catch (error) {
      console.error('更新模板失败:', error)
      res.status(500).json({ success: false, error: '更新模板失败' })
    }
  }

  /**
   * 获取项目的汇总数据（用于变量替换）
   */
  static async getProjectSummary(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params
      const userId = ReportController.getUserId(req)

      console.log('getProjectSummary called, projectId:', projectId, 'userId:', userId)

      // 验证用户ID
      if (!userId) {
        res.status(401).json({ success: false, error: '未授权' })
        return
      }

      // 获取项目基本信息 - 使用 null 代替 undefined
      const [projects] = await pool.execute(
        'SELECT * FROM investment_projects WHERE id = ? AND user_id = ?',
        [projectId, userId || null]
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
            location: project.location || '',
            constructionUnit: project.construction_unit || ''
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

  // ==================== 样式配置相关 API ====================

  /**
   * 获取样式配置列表
   */
  static async getStyleConfigs(req: Request, res: Response): Promise<void> {
    try {
      const userId = ReportController.getUserId(req)
      console.log('getStyleConfigs called, userId:', userId)

      const [configs] = await pool.execute(
        `SELECT * FROM report_style_configs 
         WHERE user_id = ? OR user_id IS NULL 
         ORDER BY is_default DESC, created_at DESC`,
        [userId]
      ) as any[]

      console.log('getStyleConfigs found:', configs.length, 'configs')

      res.json({ success: true, configs })
    } catch (error) {
      console.error('获取样式配置列表失败:', error)
      res.status(500).json({ success: false, error: '获取样式配置列表失败' })
    }
  }

  /**
   * 获取默认样式配置
   */
  static async getDefaultStyleConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = ReportController.getUserId(req)

      // 先尝试获取用户自己的默认样式
      const [userDefaults] = await pool.execute(
        'SELECT * FROM report_style_configs WHERE user_id = ? AND is_default = TRUE LIMIT 1',
        [userId]
      ) as any[]

      if (userDefaults.length > 0) {
        res.json({ success: true, config: userDefaults[0] })
        return
      }

      // 如果没有用户默认样式，获取系统默认样式
      const [systemDefaults] = await pool.execute(
        'SELECT * FROM report_style_configs WHERE user_id IS NULL AND is_default = TRUE LIMIT 1'
      ) as any[]

      if (systemDefaults.length > 0) {
        res.json({ success: true, config: systemDefaults[0] })
        return
      }

      // 如果没有任何默认样式，返回空
      res.json({ success: true, config: null })
    } catch (error) {
      console.error('获取默认样式配置失败:', error)
      res.status(500).json({ success: false, error: '获取默认样式配置失败' })
    }
  }

  /**
   * 保存样式配置
   */
  static async saveStyleConfig(req: Request, res: Response): Promise<void> {
    try {
      const { name, config, isDefault } = req.body
      const userId = ReportController.getUserId(req)

      if (!name) {
        res.status(400).json({ success: false, error: '样式名称不能为空' })
        return
      }

      if (!config) {
        res.status(400).json({ success: false, error: '样式配置不能为空' })
        return
      }

      const configId = uuidv4()
      const configJson = JSON.stringify(config)

      // 如果设为默认样式，先取消该用户其他默认样式
      if (isDefault) {
        await pool.execute(
          'UPDATE report_style_configs SET is_default = FALSE WHERE user_id = ?',
          [userId]
        )
      }

      await pool.execute(
        `INSERT INTO report_style_configs 
         (id, user_id, name, config, is_default) 
         VALUES (?, ?, ?, ?, ?)`,
        [configId, userId, name, configJson, isDefault || false]
      )

      res.json({ success: true, configId })
    } catch (error) {
      console.error('保存样式配置失败:', error)
      res.status(500).json({ success: false, error: '保存样式配置失败' })
    }
  }

  /**
   * 删除样式配置
   */
  static async deleteStyleConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = ReportController.getUserId(req)

      // 检查样式配置是否存在
      const [configs] = await pool.execute(
        'SELECT * FROM report_style_configs WHERE id = ?',
        [id]
      ) as any[]
      
      if (configs.length === 0) {
        res.status(404).json({ success: false, error: '样式配置不存在' })
        return
      }

      const styleConfig = configs[0]

      // 系统样式不能删除
      if (styleConfig.user_id === null) {
        res.status(403).json({ success: false, error: '系统样式不能删除' })
        return
      }

      // 只能删除自己的样式配置
      if (styleConfig.user_id !== userId) {
        res.status(403).json({ success: false, error: '无权删除此样式配置' })
        return
      }

      await pool.execute(
        'DELETE FROM report_style_configs WHERE id = ?',
        [id]
      )

      res.json({ success: true })
    } catch (error) {
      console.error('删除样式配置失败:', error)
      res.status(500).json({ success: false, error: '删除样式配置失败' })
    }
  }
}
