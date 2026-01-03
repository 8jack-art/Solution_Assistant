import { pool } from '../db/config.js'
import { LLMService, LLMMessage } from '../lib/llm.js'
import { sseManager } from './sseManager.js'
// @ts-ignore
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  ImageRun
} from 'docx'
// @ts-ignore
import * as marked from 'marked'

/**
 * Word报告样式配置接口
 */
interface ReportStyleConfig {
  fonts: {
    body: string        // 正文字体
    heading: string     // 标题字体
    number: string      // 数字字体
  }
  fontSizes: {
    title: number       // 标题字号（pt）
    body: number        // 正文字号（pt）
    tableTitle: number  // 表名字号（pt）
    tableHeader: number // 表头字号（pt）
    tableBody: number   // 表体字号（pt）
  }
  paragraph: {
    lineSpacing: number | 'fixed'  // 行间距倍数或固定值
    lineSpacingValue?: number       // 固定行间距值（磅）
    spaceBefore: number             // 段前间距（行）
    spaceAfter: number              // 段后间距（行）
    firstLineIndent: number         // 首行缩进（字符数）
    headingIndent: number           // 标题缩进（字符数）
  }
  page: {
    margin: {
      top: number     // 上边距（cm）
      bottom: number  // 下边距（cm）
      left: number    // 左边距（cm）
      right: number   // 右边距（cm）
    }
    orientation: 'portrait' | 'landscape'  // 纸张方向
  }
  table: {
    headerBg: string      // 表头背景色
    border: string        // 边框样式
    zebraStripe: boolean  // 斑马纹
    alignment: 'left' | 'center' | 'right'  // 单元格对齐
  }
}

/**
 * 章节配置接口
 */
interface CoverSection {
  enabled: boolean
  title: string            // 报告标题
  subtitle?: string        // 副标题
  projectName: string      // 项目名称
  companyName?: string     // 编制单位
  author?: string          // 编制人
  date: string             // 编制日期
  logo?: string            // Logo图片base64
}

interface TableOfContentsSection {
  enabled: boolean
  title: string            // 目录标题
  includePageNumbers: boolean  // 包含页码
  depth: number            // 目录深度（1-3级标题）
}

interface BodySection {
  id: string
  title: string            // 章节标题
  content: string          // Markdown内容（含变量标记）
  level: number            // 标题级别
}

interface AppendixSection {
  id: string
  title: string            // 附录标题
  content: string          // Markdown内容（含变量标记）
}

interface ReportSections {
  cover: CoverSection
  toc: TableOfContentsSection
  body: BodySection[]
  appendix: AppendixSection[]
}

/**
 * 资源Map
 */
interface ResourceMap {
  tables: Record<string, TableResource>
  charts: Record<string, ChartResource>
}

interface TableResource {
  id: string
  title: string
  columns: string[]
  data: Record<string, any>[]
  style?: {
    headerBg?: string
    stripe?: boolean
    align?: 'left' | 'center' | 'right'
  }
}

interface ChartResource {
  id: string
  type: 'pie' | 'line' | 'bar'
  title: string
  base64Image: string  // 图片数据
  width?: number
  height?: number
}

/**
 * 报告服务类
 */
export class ReportService {
  /**
   * 异步生成报告
   */
  static async generateReportAsync(
    reportId: string,
    llmConfig: any,
    promptTemplate: string,
    project: any
  ): Promise<void> {
    try {
      console.log('开始生成报告:', reportId)
      
      // 收集项目相关数据
      const projectData = await this.collectProjectData(project.id)
      
      // 构建完整的提示词
      const fullPrompt = this.buildDataAwarePrompt(promptTemplate, projectData)
      
      // 调用LLM生成报告
      const result = await LLMService.generateContent(llmConfig, [
        { role: 'user' as const, content: fullPrompt }
      ], {
        maxTokens: 8000,
        temperature: 0.7
      })
      
      if (!result.success) {
        throw new Error(`LLM调用失败: ${result.error}`)
      }
      
      // 更新报告状态为完成
      await pool.execute(
        'UPDATE generated_reports SET generation_status = ?, report_content = ?, updated_at = NOW() WHERE id = ?',
        ['completed', result.content || '', reportId]
      )
      
      console.log('报告生成完成:', reportId)
    } catch (error) {
      console.error('生成报告失败:', error)
      
      // 更新报告状态为失败
      await pool.execute(
        'UPDATE generated_reports SET generation_status = ?, report_content = ?, updated_at = NOW() WHERE id = ?',
        ['failed', error.message, reportId]
      )
      
      throw error
    }
  }

  /**
   * 收集项目相关数据
   */
  static async collectProjectData(projectId: string): Promise<any> {
    try {
      console.log('开始收集项目数据，项目ID:', projectId)
      
      // 获取投资估算数据
      const [investmentEstimates] = await (pool as any).execute(
        'SELECT * FROM investment_estimates WHERE project_id = ?',
        [projectId]
      ) as any[]

      console.log('投资估算数据查询结果:', investmentEstimates.length, '条记录')

      // 获取收入成本数据
      const [revenueCostData] = await (pool as any).execute(
        'SELECT * FROM revenue_cost_estimates WHERE project_id = ?',
        [projectId]
      ) as any[]

      console.log('收入成本数据查询结果:', revenueCostData.length, '条记录')

      // 获取项目基本信息
      const [projects] = await (pool as any).execute(
        'SELECT * FROM investment_projects WHERE id = ?',
        [projectId]
      ) as any[]

      console.log('项目数据查询结果:', projects.length, '条记录')

      const project = projects[0] || {}
      
      // 解析JSON字段
      let investmentData = {}
      if (investmentEstimates.length > 0) {
        const estimate = investmentEstimates[0]
        console.log('投资估算原始数据键:', Object.keys(estimate))
        
        if (estimate.estimate_data && typeof estimate.estimate_data === 'string') {
          try {
            investmentData = JSON.parse(estimate.estimate_data)
            console.log('投资估算数据解析成功，键:', Object.keys(investmentData))
          } catch (e) {
            console.warn('解析投资估算数据失败:', e)
          }
        } else {
          console.warn('投资估算数据字段不存在或格式不正确')
        }
      } else {
        console.warn('未找到投资估算数据')
      }

      let revenueCostModelData = {}
      if (revenueCostData.length > 0) {
        const estimate = revenueCostData[0]
        console.log('收入成本原始数据键:', Object.keys(estimate))
        
        if (estimate.model_data && typeof estimate.model_data === 'string') {
          try {
            revenueCostModelData = JSON.parse(estimate.model_data)
            console.log('收入成本数据解析成功，键:', Object.keys(revenueCostModelData))
          } catch (e) {
            console.warn('解析收入成本数据失败:', e)
          }
        } else {
          console.warn('收入成本数据字段不存在或格式不正确')
        }
      } else {
        console.warn('未找到收入成本数据')
      }

      // 提取关键财务指标
      const financialIndicators = this.extractFinancialIndicators(revenueCostModelData)
      console.log('财务指标提取结果:', Object.keys(financialIndicators))

      const result = {
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
        investment: investmentData,
        revenueCost: revenueCostModelData,
        financialIndicators
      }
      
      console.log('项目数据收集完成')
      return result
    } catch (error) {
      console.error('收集项目数据失败:', error)
      throw error
    }
  }

  /**
   * 构建包含项目数据的提示词
   */
  static buildDataAwarePrompt(basePrompt: string, projectData: any): string {
    const { project, investment, revenueCost, financialIndicators } = projectData
    
    return `${basePrompt}

=== 项目基本信息 ===
项目名称：${project.name}
项目描述：${project.description}
总投资额：${project.totalInvestment}万元
建设期：${project.constructionYears}年
运营期：${project.operationYears}年
所属行业：${project.industry}
项目地点：${project.location}

=== 投资估算数据 ===
${JSON.stringify(investment, null, 2)}

=== 收入成本数据 ===
${JSON.stringify(revenueCost, null, 2)}

=== 关键财务指标 ===
${JSON.stringify(financialIndicators, null, 2)}

请基于以上数据生成专业的投资方案报告，确保数据准确性和分析深度。`
  }

  /**
   * 提取关键财务指标
   */
  static extractFinancialIndicators(revenueCostData: any): any {
    try {
      const indicators: any = {}
      
      if (revenueCostData.financialIndicators) {
        // 直接使用已有的财务指标
        return revenueCostData.financialIndicators
      }
      
      // 如果没有财务指标，尝试从收入成本数据中提取
      if (revenueCostData.revenueItems && revenueCostData.costItems) {
        const totalRevenue = revenueCostData.revenueItems.reduce((sum: number, item: any) => 
          sum + (item.annualRevenue || 0), 0)
        const totalCost = revenueCostData.costItems.reduce((sum: number, item: any) => 
          sum + (item.annualCost || 0), 0)
        
        indicators.totalRevenue = totalRevenue
        indicators.totalCost = totalCost
        indicators.profit = totalRevenue - totalCost
        indicators.profitMargin = totalRevenue > 0 ? (indicators.profit / totalRevenue * 100) : 0
      }
      
      return indicators
    } catch (error) {
      console.warn('提取财务指标失败:', error)
      return {}
    }
  }

  /**
   * 生成预览HTML
   */
  static generatePreview(content: string, format: 'html' | 'markdown'): string {
    try {
      if (format === 'markdown') {
        // 转换Markdown为HTML
        const result = marked.parse(content)
        return typeof result === 'string' ? result : String(result)
      } else {
        // 直接返回HTML内容
        return content
      }
    } catch (error) {
      console.error('生成预览失败:', error)
      return `<p>预览生成失败: ${error.message}</p>`
    }
  }

  /**
   * 生成Word文档
   */
  static async generateWordDocument(
    content: string,
    title: string,
    options?: {
      sections?: ReportSections
      resources?: ResourceMap
      styleConfig?: ReportStyleConfig
    }
  ): Promise<Buffer> {
    try {
      const { sections, resources, styleConfig } = options || {}

      // 如果有完整的章节配置，使用新方法
      if (sections && styleConfig) {
        const doc = await this.createCompleteDocument(
          sections,
          resources || { tables: {}, charts: {} },
          styleConfig
        )
        const buffer = await Packer.toBuffer(doc)
        return buffer
      }

      // 否则使用原有的简单方法
      const paragraphs = this.parseContentToWord(content, title)
      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      })
      const buffer = await Packer.toBuffer(doc)
      return buffer
    } catch (error) {
      console.error('生成Word文档失败:', error)
      throw new Error(`生成Word文档失败: ${error.message}`)
    }
  }

  /**
   * 解析内容为Word段落
   */
  static parseContentToWord(content: string, title: string): any[] {
    const paragraphs: any[] = []
    
    // 添加标题
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 32
          })
        ],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    )
    
    // 合并多个连续换行符为一个，避免段落间距过大
    const normalizedContent = content.replace(/\n\n+/g, '\n')
    // 按行分割内容
    const lines = normalizedContent.split('\n')
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      if (!trimmedLine) {
        // 空行
        paragraphs.push(new Paragraph({ text: '' }))
        continue
      }
      
      // 检查是否是标题
      if (trimmedLine.startsWith('# ')) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine.substring(2),
                bold: true,
                size: 28
              })
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          })
        )
      } else if (trimmedLine.startsWith('## ')) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine.substring(3),
                bold: true,
                size: 26
              })
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 }
          })
        )
      } else if (trimmedLine.startsWith('### ')) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine.substring(4),
                bold: true,
                size: 24
              })
            ],
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 }
          })
        )
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        // 列表项
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '• ' + trimmedLine.substring(2),
                size: 22
              })
            ],
            spacing: { before: 100, after: 100 }
          })
        )
      } else if (trimmedLine.match(/^\d+\. /)) {
        // 有序列表项
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine,
                size: 22
              })
            ],
            spacing: { before: 100, after: 100 }
          })
        )
      } else {
        // 普通段落
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine,
                size: 22
              })
            ],
            spacing: { before: 100, after: 200 }
          })
        )
      }
    }
    
    return paragraphs
  }

  /**
   * 流式生成报告（用于实时输出）
   */
  static async generateReportStream(
    reportId: string,
    llmConfig: any,
    promptTemplate: string,
    project: any
  ): Promise<void> {
    try {
      console.log('开始流式生成报告:', reportId)
      
      // 收集项目相关数据
      const projectData = await this.collectProjectData(project.id)
      
      // 构建完整的提示词
      const fullPrompt = this.buildDataAwarePrompt(promptTemplate, projectData)
      
      // 更新报告状态为生成中
      await pool.execute(
        'UPDATE generated_reports SET generation_status = ?, updated_at = NOW() WHERE id = ?',
        ['generating', reportId]
      )
      
      // 调用LLM流式生成
      await this.streamLLMResponse(reportId, llmConfig, fullPrompt)
      
      console.log('流式报告生成完成:', reportId)
    } catch (error) {
      console.error('流式生成报告失败:', error)
      
      // 更新报告状态为失败
      await pool.execute(
        'UPDATE generated_reports SET generation_status = ?, report_content = ?, updated_at = NOW() WHERE id = ?',
        ['failed', error.message, reportId]
      )
      
      throw error
    }
  }

  /**
   * 流式处理LLM响应
   */
  private static async streamLLMResponse(
    reportId: string,
    llmConfig: any,
    prompt: string
  ): Promise<void> {
    try {
      console.log('='.repeat(60))
      console.log('streamLLMResponse 开始')
      console.log('报告ID:', reportId)
      console.log('LLM配置 provider:', llmConfig.provider)
      console.log('LLM配置 model:', llmConfig.model)
      console.log('提示词长度:', prompt.length)
      
      const messages: LLMMessage[] = [{ role: 'user', content: prompt }]
      
      // 使用流式LLM调用
      console.log('调用 LLMService.generateContentStream...')
      const result = await LLMService.generateContentStream(llmConfig, messages, {
        maxTokens: 8000,
        temperature: 0.7
      })
      
      console.log('generateContentStream 返回结果:')
      console.log('  success:', result.success)
      console.log('  stream:', result.stream ? '存在' : '不存在')
      console.log('  error:', result.error || '无')
      
      if (!result.success || !result.stream) {
        console.error('LLM流式调用失败:', result.error)
        throw new Error(`LLM流式调用失败: ${result.error}`)
      }
      
      // 处理流式响应
      console.log('开始处理流式响应...')
      const reader = result.stream.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      let chunkCount = 0
      
      // 创建唯一的停止信号标识
      const STOP_SIGNAL = Symbol('STOP_SIGNAL')
      
      // 检查停止标志的辅助函数
      const checkStop = (): boolean => {
        const shouldStopFlag = sseManager.shouldStop(reportId)
        console.log(`【停止检查】shouldStop(${reportId}) = ${shouldStopFlag}`)
        if (shouldStopFlag) {
          console.log(`【停止检查】检测到停止标志: ${reportId}`)
          return true
        }
        return false
      }
      
      // 创建轮询停止标志的Promise，返回Symbol表示停止
      const waitForStop = (timeout: number): Promise<symbol> => {
        return new Promise((resolve) => {
          console.log(`[waitForStop] 启动停止检查，超时: ${timeout}ms`)
          const checkInterval = setInterval(() => {
            const shouldStopFlag = checkStop()
            console.log(`[waitForStop] 检查停止标志: ${shouldStopFlag}`)
            if (shouldStopFlag) {
              clearInterval(checkInterval)
              console.log(`[waitForStop] 检测到停止，返回 STOP_SIGNAL`)
              resolve(STOP_SIGNAL)
            }
          }, 30) // 每30ms检查一次
          
          setTimeout(() => {
            clearInterval(checkInterval)
            console.log(`[waitForStop] 超时，返回 TIMEOUT`)
            resolve(Symbol('TIMEOUT')) // 超时，返回不同的Symbol
          }, timeout)
        })
      }
      
      try {
        while (true) {
          // 先检查停止标志
          if (checkStop()) {
            console.log(`【流式生成】检测到停止标志，立即停止: ${reportId}`)
            
            // 保存当前已生成的内容
            await pool.execute(
              'UPDATE generated_reports SET generation_status = ?, report_content = ?, updated_at = NOW() WHERE id = ?',
              ['failed', fullContent, reportId]
            )
            
            // 通知前端停止
            sseManager.fail(reportId, '用户手动停止')
            return
          }
          
          // 使用Promise.race实现可中断的读取
          console.log(`等待读取数据块... (当前chunk: ${chunkCount})`)
          
          // 创建读取Promise和停止检查Promise的竞态
          const readPromise = reader.read()
          const stopCheckPromise = waitForStop(150) // 每150ms检查一次停止
          
          const raceResult = await Promise.race([readPromise, stopCheckPromise])
          
          // 检查是否是停止信号
          if (raceResult === STOP_SIGNAL) {
            console.log(`【流式生成】收到停止信号，终止生成: ${reportId}`)
            
            // 保存当前已生成的内容
            await pool.execute(
              'UPDATE generated_reports SET generation_status = ?, report_content = ?, updated_at = NOW() WHERE id = ?',
              ['failed', fullContent, reportId]
            )
            
            // 通知前端停止
            sseManager.fail(reportId, '用户手动停止')
            return
          }
          // 是 reader.read() 的结果
          const { done, value } = raceResult as { done: boolean; value: Uint8Array }
          
          if (done) {
            console.log('流式响应读取完成')
            break
          }
          
          // 安全检查：value 可能是 undefined
          if (!value || value.length === 0) {
            console.warn('收到空的数据块，跳过')
            continue
          }
          
          console.log(`收到数据块，大小: ${value.length} bytes`)
          
          // 解码当前数据块
          buffer += decoder.decode(value, { stream: true })
          console.log(`缓冲区内容长度: ${buffer.length}`)
          
          // 处理SSE格式的数据
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // 保留最后一个不完整的行
          console.log(`处理了 ${lines.length} 行数据`)
          
          for (const line of lines) {
            if (line.trim() === '') continue
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              
              // 跳过 [DONE] 消息
              if (data === '[DONE]') {
                console.log('收到 [DONE] 消息')
                continue
              }
              
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content || ''
                console.log(`解析到内容，长度: ${content.length}`)
                
                if (content) {
                  fullContent += content
                  
                  // 将内容逐字符推送，实现流畅的打字机效果
                  for (let i = 0; i < content.length; i++) {
                    const char = content[i]
                    // 通过SSE管理器实时推送到前端
                    sseManager.appendContent(reportId, char)
                  }
                  console.log(`已推送 ${content.length} 个字符到SSE管理器，累计内容长度: ${fullContent.length}`)
                  
                  // 同时保存到数据库（用于断线重连）
                  await pool.execute(
                    'UPDATE generated_reports SET report_content = ?, updated_at = NOW() WHERE id = ?',
                    [fullContent, reportId]
                  )
                  
                  // 保存到历史记录
                  await pool.execute(
                    'INSERT INTO report_generation_history (report_id, chunk_content, chunk_order) VALUES (?, ?, ?)',
                    [reportId, content, Math.floor(fullContent.length / 500)]
                  )
                }
              } catch (parseError) {
                console.warn('解析流式数据失败，可能不是有效的JSON:', data.substring(0, 100))
              }
            }
          }
        }
      } finally {
        console.log('释放reader锁')
        reader.releaseLock()
      }
      
      console.log(`流式处理完成，总内容长度: ${fullContent.length}`)
      
      // 标记报告完成，通过SSE推送最终内容
      sseManager.complete(reportId, fullContent)
      console.log('SSE推送完成')
      
      // 更新报告状态为完成
      await pool.execute(
        'UPDATE generated_reports SET generation_status = ?, updated_at = NOW() WHERE id = ?',
        ['completed', reportId]
      )
      
    } catch (error) {
      console.error('流式处理LLM响应失败:', error)
      console.error('错误堆栈:', error instanceof Error ? error.stack : '未知')
      
      // 通过SSE推送错误信息
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      sseManager.fail(reportId, errorMessage)
      
      // 更新报告状态为失败
      await pool.execute(
        'UPDATE generated_reports SET generation_status = ?, error_message = ?, updated_at = NOW() WHERE id = ?',
        ['failed', errorMessage, reportId]
      )
      
      throw error
    }
  }

  /**
   * 暂停报告生成
   */
  static async pauseReportGeneration(reportId: string): Promise<void> {
    try {
      await pool.execute(
        'UPDATE generated_reports SET generation_status = ?, updated_at = NOW() WHERE id = ? AND generation_status = ?',
        ['paused', reportId, 'generating']
      )
    } catch (error) {
      console.error('暂停报告生成失败:', error)
      throw error
    }
  }

  /**
   * 继续报告生成
   */
  static async resumeReportGeneration(reportId: string): Promise<void> {
    try {
      await pool.execute(
        'UPDATE generated_reports SET generation_status = ?, updated_at = NOW() WHERE id = ? AND generation_status = ?',
        ['generating', reportId, 'paused']
      )
    } catch (error) {
      console.error('继续报告生成失败:', error)
      throw error
    }
  }

  /**
   * 停止报告生成
   */
  static async stopReportGeneration(reportId: string): Promise<void> {
    try {
      await pool.execute(
        'UPDATE generated_reports SET generation_status = ?, updated_at = NOW() WHERE id = ?',
        ['failed', reportId]
      )
    } catch (error) {
      console.error('停止报告生成失败:', error)
      throw error
    }
  }

  // ==================== 样式应用函数 ====================

  /**
   * 创建带样式的段落
   */
  static createStyledParagraph(
    text: string,
    styleConfig: ReportStyleConfig,
    options?: {
      isHeading?: boolean
      headingLevel?: 'Heading1' | 'Heading2' | 'Heading3' | 'Title'
      alignment?: 'left' | 'center' | 'right' | 'start' | 'end' | 'both'
      bold?: boolean
      spacingBefore?: number
      spacingAfter?: number
      indent?: boolean  // 是否应用首行缩进
    }
  ): Paragraph {
    const {
      isHeading = false,
      headingLevel = HeadingLevel.HEADING_1,
      alignment = AlignmentType.LEFT,
      bold = false,
      spacingBefore = 0,
      spacingAfter = 0,
      indent = !isHeading  // 默认标题不缩进，正文缩进
    } = options || {}

    // 计算字号（docx使用双倍值）
    const fontSize = isHeading
      ? (styleConfig.fontSizes.title || 32) * 2
      : (styleConfig.fontSizes.body || 22) * 2

    // 计算行间距
    const lineSpacing = styleConfig.paragraph.lineSpacing
    let lineSpacingAttr: any = { line: 360 } // 默认1.5倍行间距
    if (lineSpacing === 'fixed' && styleConfig.paragraph.lineSpacingValue) {
      lineSpacingAttr = { line: styleConfig.paragraph.lineSpacingValue * 20 }
    } else if (typeof lineSpacing === 'number') {
      lineSpacingAttr = { line: lineSpacing * 240 }
    }

    // 计算首行缩进
    const firstLineIndent = indent ? (styleConfig.paragraph.firstLineIndent || 2) * 240 : 0
    
    // 计算标题缩进
    const headingIndent = isHeading ? (styleConfig.paragraph.headingIndent || 0) * 240 : 0

    return new Paragraph({
      children: [
        new TextRun({
          text: text,
          bold: bold || isHeading,
          size: fontSize,
          font: isHeading ? styleConfig.fonts.heading : styleConfig.fonts.body
        })
      ],
      heading: isHeading ? headingLevel : undefined,
      alignment: alignment,
      indent: {
        firstLine: isHeading ? headingIndent : firstLineIndent,
        left: isHeading ? 0 : 0
      },
      spacing: {
        // 使用 null 判断而不是 ||，避免 0 值被覆盖
        before: spacingBefore !== undefined ? spacingBefore * 100 : (isHeading ? 400 : 100),
        after: spacingAfter !== undefined ? spacingAfter * 100 : (isHeading ? 200 : 200),
        ...lineSpacingAttr
      }
    })
  }

  /**
   * 创建带样式的Word表格
   */
  static createStyledTable(
    tableData: Record<string, any>[],
    columns: string[],
    styleConfig: ReportStyleConfig
  ): Table {
    if (!tableData || tableData.length === 0) {
      return new Table({
        rows: [],
        width: { size: 100, type: WidthType.PERCENTAGE }
      })
    }

    // 表格宽度配置
    const columnWidth = Math.floor(100 / columns.length)

    // 创建表头行
    const headerRow = new TableRow({
      children: columns.map(col =>
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: col,
                  bold: true,
                  size: (styleConfig.fontSizes.tableHeader || 20) * 2,
                  font: styleConfig.fonts.heading
                })
              ],
              alignment: AlignmentType.CENTER
            })
          ],
          shading: {
            fill: styleConfig.table.headerBg || 'EEEEEE'
          },
          width: { size: columnWidth, type: WidthType.PERCENTAGE }
        })
      ),
      tableHeader: true
    })

    // 创建数据行
    const dataRows = tableData.map((row, rowIndex) =>
      new TableRow({
        children: columns.map(col =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: String(row[col] ?? ''),
                    size: (styleConfig.fontSizes.tableBody || 20) * 2,
                    font: styleConfig.fonts.body
                  })
                ],
                alignment: AlignmentType.LEFT
              })
            ],
            // 斑马纹背景
            shading: styleConfig.table.zebraStripe && rowIndex % 2 === 1
              ? { fill: 'F5F5F5' }
              : undefined,
            width: { size: columnWidth, type: WidthType.PERCENTAGE }
          })
        )
      })
    )

    // 表格边框样式
    const borderStyle = styleConfig.table.border || 'single'
    const tableWidth = columns.length * columnWidth

    return new Table({
      rows: [headerRow, ...dataRows],
      width: {
        size: Math.min(tableWidth, 100),
        type: WidthType.PERCENTAGE
      },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' }
      }
    })
  }

  /**
   * 创建图表图片段落
   */
  static createChartImage(
    base64Image: string,
    title: string,
    styleConfig: ReportStyleConfig
  ): Paragraph[] {
    const paragraphs: Paragraph[] = []

    // 添加标题
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: (styleConfig.fontSizes.tableTitle || 22) * 2,
            font: styleConfig.fonts.heading
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 }
      })
    )

    // 添加图片
    try {
      // 移除base64前缀
      const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '')
      const imageBuffer = Buffer.from(base64Data, 'base64')

      paragraphs.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: imageBuffer,
              type: 'png',
              transformation: {
                width: 500,
                height: 300
              }
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      )
    } catch (error) {
      console.error('创建图表图片失败:', error)
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '[图表加载失败]',
              size: (styleConfig.fontSizes.body || 22) * 2
            })
          ],
          alignment: AlignmentType.CENTER
        })
      )
    }

    return paragraphs
  }

  // ==================== 章节生成函数 ====================

  /**
   * 创建封面页
   */
  static createCoverPage(
    cover: CoverSection,
    styleConfig: ReportStyleConfig
  ): Paragraph[] {
    const paragraphs: Paragraph[] = []

    // 如果有Logo，添加到顶部
    if (cover.logo) {
      try {
        const base64Data = cover.logo.replace(/^data:image\/[a-z]+;base64,/, '')
        const imageBuffer = Buffer.from(base64Data, 'base64')
        paragraphs.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffer,
                type: 'png',
                transformation: {
                  width: 120,
                  height: 60
                }
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          })
        )
      } catch (error) {
        console.error('添加Logo失败:', error)
      }
    }

    // 报告标题
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: cover.title,
            bold: true,
            size: (styleConfig.fontSizes.title || 36) * 2,
            font: styleConfig.fonts.heading
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 }
      })
    )

    // 副标题
    if (cover.subtitle) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: cover.subtitle,
              size: (styleConfig.fontSizes.body || 24) * 2,
              font: styleConfig.fonts.body
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      )
    }

    // 空行
    paragraphs.push(new Paragraph({ text: '', spacing: { after: 400 } }))
    paragraphs.push(new Paragraph({ text: '', spacing: { after: 400 } }))

    // 项目名称
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `项目名称：${cover.projectName}`,
            size: (styleConfig.fontSizes.body || 24) * 2,
            font: styleConfig.fonts.body
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    )

    // 编制单位
    if (cover.companyName) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `编制单位：${cover.companyName}`,
              size: (styleConfig.fontSizes.body || 24) * 2,
              font: styleConfig.fonts.body
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      )
    }

    // 编制人
    if (cover.author) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `编制人：${cover.author}`,
              size: (styleConfig.fontSizes.body || 24) * 2,
              font: styleConfig.fonts.body
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      )
    }

    // 编制日期
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `编制日期：${cover.date}`,
            size: (styleConfig.fontSizes.body || 24) * 2,
            font: styleConfig.fonts.body
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    )

    return paragraphs
  }

  /**
   * 创建目录页
   */
  static createTableOfContents(
    toc: TableOfContentsSection,
    bodySections: BodySection[],
    styleConfig: ReportStyleConfig
  ): Paragraph[] {
    const paragraphs: Paragraph[] = []

    // 目录标题
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: toc.title,
            bold: true,
            size: (styleConfig.fontSizes.title || 32) * 2,
            font: styleConfig.fonts.heading
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 }
      })
    )

    // 提取标题生成目录
    for (const section of bodySections) {
      if (section.level <= toc.depth) {
        const indent = (section.level - 1) * 400
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: section.title,
                size: (styleConfig.fontSizes.body || 22) * 2,
                font: styleConfig.fonts.body
              })
            ],
            indent: { left: indent },
            spacing: { after: 100 }
          })
        )
      }
    }

    return paragraphs
  }

  /**
   * 创建章节内容（支持资源标记）
   */
  static createSectionContent(
    section: BodySection | AppendixSection,
    resources: ResourceMap,
    styleConfig: ReportStyleConfig
  ): any[] {
    const elements: any[] = []

    // 章节标题
    const headingLevel =
      'level' in section
        ? section.level === 1
          ? HeadingLevel.HEADING_1
          : section.level === 2
          ? HeadingLevel.HEADING_2
          : HeadingLevel.HEADING_3
        : HeadingLevel.HEADING_3  // 附录使用三级标题

    elements.push(
      this.createStyledParagraph(
        section.title,
        styleConfig,
        { isHeading: true, headingLevel, spacingAfter: 200 }
      )
    )

    // 解析内容并处理资源标记
    const contentElements = this.parseContentToWordWithResources(
      section.content,
      resources,
      styleConfig
    )
    elements.push(...contentElements)

    return elements
  }

  /**
   * 解析内容为Word元素（支持资源标记）
   */
  static parseContentToWordWithResources(
    content: string,
    resources: ResourceMap,
    styleConfig: ReportStyleConfig
  ): any[] {
    const elements: any[] = []
    // 合并多个连续换行符为一个，避免段落间距过大
    const normalizedContent = content.replace(/\n\n+/g, '\n')
    const lines = normalizedContent.split('\n')

    for (const line of lines) {
      const trimmedLine = line.trim()

      if (!trimmedLine) {
        elements.push(new Paragraph({ text: '' }))
        continue
      }

      // 检查是否是资源标记
      const tableMatch = trimmedLine.match(/^\{\{TABLE:(\w+)\}\}$/)
      const chartMatch = trimmedLine.match(/^\{\{CHART:(\w+)\}\}$/)

      if (tableMatch) {
        const tableId = tableMatch[1]
        const tableResource = resources.tables?.[tableId]
        if (tableResource) {
          // 添加表格标题
          elements.push(
            this.createStyledParagraph(
              tableResource.title,
              styleConfig,
              { bold: true, spacingAfter: 100 }
            )
          )
          // 添加表格
          const table = this.createStyledTable(
            tableResource.data,
            tableResource.columns,
            styleConfig
          )
          elements.push(table)
        } else {
          elements.push(
            this.createStyledParagraph(
              `[表格 ${tableId} 未找到]`,
              styleConfig
            )
          )
        }
        continue
      }

      if (chartMatch) {
        const chartId = chartMatch[1]
        const chartResource = resources.charts?.[chartId]
        if (chartResource) {
          const chartElements = this.createChartImage(
            chartResource.base64Image,
            chartResource.title,
            styleConfig
          )
          elements.push(...chartElements)
        } else {
          elements.push(
            this.createStyledParagraph(
              `[图表 ${chartId} 未找到]`,
              styleConfig
            )
          )
        }
        continue
      }

      // 普通段落（与原parseContentToWord相同的逻辑）
      if (trimmedLine.startsWith('# ')) {
        elements.push(
          this.createStyledParagraph(trimmedLine.substring(2), styleConfig, {
            isHeading: true,
            headingLevel: HeadingLevel.HEADING_1
          })
        )
      } else if (trimmedLine.startsWith('## ')) {
        elements.push(
          this.createStyledParagraph(trimmedLine.substring(3), styleConfig, {
            isHeading: true,
            headingLevel: HeadingLevel.HEADING_2
          })
        )
      } else if (trimmedLine.startsWith('### ')) {
        elements.push(
          this.createStyledParagraph(trimmedLine.substring(4), styleConfig, {
            isHeading: true,
            headingLevel: HeadingLevel.HEADING_3
          })
        )
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        elements.push(
          this.createStyledParagraph('• ' + trimmedLine.substring(2), styleConfig)
        )
      } else if (trimmedLine.match(/^\d+\. /)) {
        elements.push(this.createStyledParagraph(trimmedLine, styleConfig))
      } else {
        elements.push(this.createStyledParagraph(trimmedLine, styleConfig))
      }
    }

    return elements
  }

  // ==================== Word文档组装函数 ====================

  /**
   * 创建完整的Word文档（包含所有章节）
   */
  static async createCompleteDocument(
    sections: ReportSections,
    resources: ResourceMap,
    styleConfig: ReportStyleConfig
  ): Promise<Document> {
    const allChildren: any[] = []

    // 1. 添加封面
    if (sections.cover?.enabled) {
      const coverElements = this.createCoverPage(sections.cover, styleConfig)
      allChildren.push(...coverElements)
      // 分页符
      allChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '',
              break: 1
            })
          ]
        })
      )
    }

    // 2. 添加目录
    if (sections.toc?.enabled) {
      const tocElements = this.createTableOfContents(
        sections.toc,
        sections.body || [],
        styleConfig
      )
      allChildren.push(...tocElements)
      // 分页符
      allChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '',
              break: 1
            })
          ]
        })
      )
    }

    // 3. 添加正文
    if (sections.body && sections.body.length > 0) {
      for (const section of sections.body) {
        const sectionElements = this.createSectionContent(section, resources, styleConfig)
        allChildren.push(...sectionElements)
      }
    }

    // 4. 添加附录
    if (sections.appendix && sections.appendix.length > 0) {
      // 附录分页
      allChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '',
              break: 1
            })
          ]
        })
      )

      for (const appendix of sections.appendix) {
        const appendixElements = this.createSectionContent(appendix, resources, styleConfig)
        allChildren.push(...appendixElements)
      }
    }

    // 页面设置（边距）
    const pageMargin = styleConfig.page?.margin || {
      top: 2.54,
      bottom: 2.54,
      left: 3.17,
      right: 3.17
    }

    return new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: Math.round(pageMargin.top * 567),
              bottom: Math.round(pageMargin.bottom * 567),
              left: Math.round(pageMargin.left * 567),
              right: Math.round(pageMargin.right * 567)
            }
          }
        },
        children: allChildren
      }]
    })
  }
}
