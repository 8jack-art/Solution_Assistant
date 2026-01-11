import { pool } from '../db/config.js'
import { LLMService, LLMMessage } from '../lib/llm.js'
// @ts-ignore
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
// @ts-ignore
import * as marked from 'marked'

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
        ['failed', error instanceof Error ? error.message : String(error), reportId]
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
      return `<p>预览生成失败: ${error instanceof Error ? error.message : String(error)}</p>`
    }
  }

  /**
   * 生成Word文档
   */
  static async generateWordDocument(content: string, title: string): Promise<Buffer> {
    try {
      // 解析内容为段落
      const paragraphs = this.parseContentToWord(content, title)
      
      // 创建Word文档
      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      })
      
      // 生成Buffer
      const buffer = await Packer.toBuffer(doc)
      return buffer
    } catch (error) {
      console.error('生成Word文档失败:', error)
      throw new Error(`生成Word文档失败: ${error instanceof Error ? error.message : String(error)}`)
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
    
    // 按行分割内容
    const lines = content.split('\n')
    
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
        ['failed', error instanceof Error ? error.message : String(error), reportId]
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
      const messages: LLMMessage[] = [{ role: 'user', content: prompt }]
      
      // 使用流式LLM调用
      const result = await LLMService.generateContentStream(llmConfig, messages, {
        maxTokens: 8000,
        temperature: 0.7
      })
      
      if (!result.success || !result.stream) {
        throw new Error(`LLM流式调用失败: ${result.error}`)
      }
      
      // 处理流式响应
      const reader = result.stream.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      
      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break
          
          // 解码当前数据块
          buffer += decoder.decode(value, { stream: true })
          
          // 处理SSE格式的数据
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // 保留最后一个不完整的行
          
          for (const line of lines) {
            if (line.trim() === '') continue
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              
              // 跳过 [DONE] 消息
              if (data === '[DONE]') continue
              
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content || ''
                
                if (content) {
                  fullContent += content
                  
                  // 实时保存内容到数据库
                  await pool.execute(
                    'UPDATE generated_reports SET report_content = ?, updated_at = NOW() WHERE id = ?',
                    [fullContent, reportId]
                  )
                  
                  // 保存到历史记录
                  await pool.execute(
                    'INSERT INTO report_generation_history (report_id, chunk_content, chunk_order) VALUES (?, ?, ?)',
                    [reportId, content, Math.floor(fullContent.length / 500)] // 简单的序号
                  )
                }
              } catch (parseError) {
                console.error('解析流式数据失败:', parseError)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
      
      // 更新报告状态为完成
      await pool.execute(
        'UPDATE generated_reports SET generation_status = ?, updated_at = NOW() WHERE id = ?',
        ['completed', reportId]
      )
      
    } catch (error) {
      console.error('流式处理LLM响应失败:', error)
      
      // 更新报告状态为失败
      await pool.execute(
        'UPDATE generated_reports SET generation_status = ?, error_message = ?, updated_at = NOW() WHERE id = ?',
        ['failed', error instanceof Error ? error.message : '未知错误', reportId]
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
}