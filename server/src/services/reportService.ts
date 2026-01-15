import { pool } from '../db/config.js'
import { LLMService, LLMMessage } from '../lib/llm.js'
import { sseManager } from './sseManager.js'
import { buildAllTableDataJSON } from '../utils/tableDataBuilder.js'
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
// @ts-ignore
import htmlToDocx from 'html-to-docx'

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
  // 独立段落样式配置（HTML转Word使用）
  heading1?: {
    font: string         // 字体
    fontSize: number       // 字号（pt）
    bold?: boolean        // 是否加粗
    lineSpacing: number    // 行间距倍数
    spaceBefore: number    // 段前间距（行）
    spaceAfter: number     // 段后间距（行）
    firstLineIndent: number // 首行缩进（字符数）
  }
  heading2?: {
    font: string         // 字体
    fontSize: number       // 字号（pt）
    bold?: boolean        // 是否加粗
    lineSpacing: number    // 行间距倍数
    spaceBefore: number    // 段前间距（行）
    spaceAfter: number     // 段后间距（行）
    firstLineIndent: number // 首行缩进（字符数）
  }
  body?: {
    font: string         // 字体
    fontSize: number       // 字号（pt）
    bold?: boolean        // 是否加粗
    lineSpacing: number    // 行间距倍数
    spaceBefore: number    // 段前间距（行）
    spaceAfter: number     // 段后间距（行）
    firstLineIndent: number // 首行缩进（字符数）
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
      let investmentData: any = {}
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
        
        // 【修复】将顶层字段加入到 investmentData 中
        // construction_interest 等字段是 investment_estimates 表的直接字段，不是 estimate_data 里面的
        if (estimate.construction_interest !== undefined) {
          investmentData.construction_interest = Number(estimate.construction_interest) || 0
          console.log('添加 construction_interest 到 investmentData:', investmentData.construction_interest)
        }
        if (estimate.basic_reserve !== undefined) {
          investmentData.basic_reserve = Number(estimate.basic_reserve) || 0
        }
        if (estimate.price_reserve !== undefined) {
          investmentData.price_reserve = Number(estimate.price_reserve) || 0
        }
      } else {
        console.warn('未找到投资估算数据')
      }

      let revenueCostModelData: any = {}
      if (revenueCostData.length > 0) {
        const estimate = revenueCostData[0]
        console.log('收入成本原始数据键:', Object.keys(estimate))
        
        // 解析 model_data（兼容字符串和已解析的对象）
        if (estimate.model_data) {
          if (typeof estimate.model_data === 'string') {
            try {
              revenueCostModelData = JSON.parse(estimate.model_data)
              console.log('收入成本数据解析成功，键:', Object.keys(revenueCostModelData))
            } catch (e) {
              console.warn('解析收入成本数据失败:', e)
            }
          } else {
            // 已经是解析后的对象
            revenueCostModelData = estimate.model_data
            console.log('收入成本数据已是对象格式，键:', Object.keys(revenueCostModelData))
          }
          
          // 打印 depreciationAmortization 数据（如果存在）
          if (revenueCostModelData.depreciationAmortization) {
            console.log('找到 depreciationAmortization 数据')
          } else {
            console.warn('revenueCostModelData 中没有 depreciationAmortization 字段')
          }
        } else {
          console.warn('收入成本数据字段不存在或格式不正确')
        }
        
        // 打印 revenueCostModelData 的所有 keys
        console.log('collectProjectData: revenueCostModelData keys:', Object.keys(revenueCostModelData))
        console.log('collectProjectData: productionRates 存在:', !!revenueCostModelData.productionRates)
      } else {
        console.warn('未找到收入成本数据')
      }

      // 提取关键财务指标
      const financialIndicators = this.extractFinancialIndicators(revenueCostModelData)
      console.log('财务指标提取结果:', Object.keys(financialIndicators))

      // 获取项目概况数据
      let projectOverview = ''
      try {
        const [overviews] = await (pool as any).execute(
          'SELECT content FROM report_project_overview WHERE project_id = ?',
          [projectId]
        ) as any[]
        
        if (overviews.length > 0 && overviews[0].content) {
          projectOverview = overviews[0].content
          console.log('项目概况数据查询成功')
        } else {
          console.log('未找到项目概况数据')
        }
      } catch (e) {
        console.warn('查询项目概况数据失败:', e)
      }

      // 构建表格数据JSON（用于 {{DATA:xxx}} 变量替换）
      const tableDataJSON = buildAllTableDataJSON({
        project: {
          id: project.id,
          name: project.project_name,
          description: project.project_info || '',
          constructionUnit: project.construction_unit || '',
          totalInvestment: project.total_investment,
          constructionYears: project.construction_years,
          operationYears: project.operation_years,
          projectType: project.project_type || project.industry || '',
          location: project.location || ''
        },
        investment: investmentData,
        revenueCost: revenueCostModelData,
        financialIndicators
      })
      console.log('表格数据JSON keys:', Object.keys(tableDataJSON))
      
      const result = {
        project: {
          id: project.id,
          name: project.project_name,
          description: project.project_info || '',
          constructionUnit: project.construction_unit || '',
          totalInvestment: project.total_investment,
          constructionYears: project.construction_years,
          operationYears: project.operation_years,
          projectType: project.project_type || project.industry || '',
          location: project.location || ''
        },
        investment: investmentData,
        revenueCost: revenueCostModelData,
        financialIndicators,
        projectOverview,
        tableDataJSON
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
   * 
   * 新的设计：完全由提示词模板控制数据注入
   * 
   * 可用的数据标记：
   * - {{PROJECT}} - 项目基本信息
   * - {{INVESTMENT}} - 投资估算数据
   * - {{REVENUE_COST}} - 收入成本数据
   * - {{FINANCIAL}} - 关键财务指标
   * - {{ALL_DATA}} - 所有数据（相当于原来的完整注入）
   * - {{DATA:xxx}} - 表格数据JSON（10个表格）
   * 
   * 示例：
   * "请分析 {{PROJECT}} 中的项目情况，投资估算为 {{INVESTMENT}}"
   */
  static buildDataAwarePrompt(basePrompt: string, projectData: any): string {
    const { project, investment, revenueCost, financialIndicators, projectOverview, tableDataJSON } = projectData
    
    // 计算运营负荷数据（所有模式都需要）
    const productionRates = revenueCost?.productionRates || []
    const operationLoadJson = JSON.stringify(
      productionRates.map((p: any) => ({
        year: p.yearIndex,
        rate: `${(p.rate * 100).toFixed(0)}%`
      })),
      null,
      2
    )
    
    // 获取修理费配置（包含费用类型、比率、金额）
    const repairConfig = revenueCost?.costConfig?.repair || {}
    
    // 获取折旧与摊销数据
    const depAmortData = revenueCost?.depreciationAmortization || {}
    const depreciationA = depAmortData.A || {}
    const depreciationD = depAmortData.D || {}
    
    // 提取 A（建筑）和 D（设备）的原值
    const valueA = depreciationA.原值 || depreciationA.originalValue || 0
    const valueD = depreciationD.原值 || depreciationD.originalValue || 0
    
    // 建设期利息：从投资估算数据中获取
    const constructionInterest = investment?.partF?.合计 || 0
    
    // 固定资产原值合计 = A原值 + D原值
    const fixedAssetsOriginalValue = valueA + valueD
    
    // 固定资产投资 = 固定资产原值 - 建设期利息（不能为负数）
    const fixedAssetsInvestment = Math.max(0, fixedAssetsOriginalValue - constructionInterest)
    
    // [DEBUG] 打印修理费计算日志
    console.log('🔧 [repair_rate] 调试信息:')
    console.log('  depAmort.A?.原值:', valueA)
    console.log('  depAmort.D?.原值:', valueD)
    console.log('  constructionInterest (建设期利息):', constructionInterest)
    console.log('  fixedAssetsOriginalValue (原值合计):', fixedAssetsOriginalValue)
    console.log('  fixedAssetsInvestment (固定资产投资):', fixedAssetsInvestment)
    console.log('  repairConfig.type:', repairConfig.type)
    console.log('  repairConfig.percentageOfFixedAssets:', repairConfig.percentageOfFixedAssets)
    
    // 年修理费
    const annualRepairCost = repairConfig.type === 'percentage' 
      ? fixedAssetsInvestment * (repairConfig.percentageOfFixedAssets || 0) / 100
      : (repairConfig.directAmount || 0)
    
    console.log('  annualRepairCost (年修理费):', annualRepairCost)
    
    // 组合修理费详细信息为JSON格式（与 reportStore.ts 保持一致）
    const repairRateJson = JSON.stringify({
      标题: '修理费估算表',
      计算方式: repairConfig.type === 'percentage' ? '按固定资产投资百分比' : '固定金额',
      '固定资产投资额（万元）': fixedAssetsInvestment,
      '占固定资产投资百分比（%）': repairConfig.percentageOfFixedAssets || 0,
      '固定金额（万元）': repairConfig.directAmount || 0,
      '年修理费（万元）': annualRepairCost,
      说明: repairConfig.type === 'percentage' 
        ? `按固定资产投资额的${repairConfig.percentageOfFixedAssets || 0}%计算`
        : `每年固定 ${repairConfig.directAmount || 0} 万元`
    }, null, 2)
    
    // 获取其他费用配置（包含土地流转信息）
    const otherExpenses = revenueCost?.costConfig?.otherExpenses || {}
    
    // 检测费用名称是否包含"土地"或"流转"
    const hasLandTransfer = (otherExpenses.name || '').includes('土地') || 
                            (otherExpenses.name || '').includes('流转')
    
    // 构建土地流转JSON
    const landTransferJson = hasLandTransfer 
      ? JSON.stringify({
          name: otherExpenses.name,
          remark: otherExpenses.remark || ''
        }, null, 2)
      : 'null'
    
    // 检查是否使用简化的数据标记
    const hasProjectMarker = basePrompt.includes('{{PROJECT}}')
    const hasInvestmentMarker = basePrompt.includes('{{INVESTMENT}}')
    const hasRevenueCostMarker = basePrompt.includes('{{REVENUE_COST}}')
    const hasFinancialMarker = basePrompt.includes('{{FINANCIAL}}')
    const hasAllDataMarker = basePrompt.includes('{{ALL_DATA}}')
    
    // 检查是否有表格数据变量 {{DATA:xxx}}
    const dataVariableRegex = /\{\{DATA:(\w+)\}\}/g
    const hasDataVariables = dataVariableRegex.test(basePrompt)
    
    // 如果模板中没有任何数据标记，保持原有行为（向后兼容）
    if (!hasProjectMarker && !hasInvestmentMarker && !hasRevenueCostMarker && 
        !hasFinancialMarker && !hasAllDataMarker && !hasDataVariables) {
      // 检查是否包含旧版变量（如 {{project_name}} 等），如果有则进行变量替换
      let processedPrompt = basePrompt
      
      // 获取运营负荷数据（从达产率配置productionRates）
      const productionRates = revenueCost?.productionRates || []
      
      // [DEBUG] 打印 productionRates 数据来源
      console.log('📊 [operation_load] 调试信息:')
      console.log('  revenueCost 存在:', !!revenueCost)
      console.log('  revenueCost.productionRates 存在:', !!(revenueCost?.productionRates))
      console.log('  productionRates 长度:', productionRates.length)
      console.log('  productionRates 数据:', JSON.stringify(productionRates))
      
      const operationLoadJson = JSON.stringify(
        productionRates.map((p: any) => ({
          year: p.yearIndex,
          rate: `${(p.rate * 100).toFixed(0)}%`
        })),
        null,
        2
      )
      
      console.log('  operationLoadJson:', operationLoadJson)

      // 替换单个变量
      processedPrompt = processedPrompt
        .replace(/\{\{project_name\}\}/g, project.name || '')
        .replace(/\{\{project_description\}\}/g, project.description || '')
        .replace(/\{\{construction_unit\}\}/g, project.constructionUnit || '')
        .replace(/\{\{total_investment\}\}/g, String(project.totalInvestment || 0))
        .replace(/\{\{construction_years\}\}/g, String(project.constructionYears || 0))
        .replace(/\{\{operation_years\}\}/g, String(project.operationYears || 0))
        .replace(/\{\{project_type\}\}/g, project.projectType || '')
        .replace(/\{\{location\}\}/g, project.location || '')
        .replace(/\{\{roi\}\}/g, String(financialIndicators?.roi || 0))
        .replace(/\{\{irr\}\}/g, String(financialIndicators?.irr || 0))
        .replace(/\{\{npv\}\}/g, String(financialIndicators?.npv || 0))
        .replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString('zh-CN'))
        .replace(/\{\{project_overview\}\}/g, projectOverview || '')
        .replace(/\{\{operation_load\}\}/g, operationLoadJson || '[]')
        .replace(/\{\{repair_rate\}\}/g, repairRateJson || '{}')
        .replace(/\{\{land_transfer\}\}/g, landTransferJson || 'null')
      
      // 注意：表格变量 {{TABLE:xxx}} 和图表变量 {{CHART:xxx}} 保持不变
      // 让 LLM 生成的报告中保留这些标记，导出 Word 时会自动解析并插入实际表格
      
      return processedPrompt
    }
    
    // 替换 {{DATA:xxx}} 变量
    let dataReplacedPrompt = basePrompt
    if (hasDataVariables && tableDataJSON) {
      dataReplacedPrompt = basePrompt.replace(dataVariableRegex, (match, dataKey) => {
        const variableKey = `{{DATA:${dataKey}}}`
        if (tableDataJSON[variableKey]) {
          return tableDataJSON[variableKey]
        }
        // 如果找不到对应的数据，尝试使用简化的key
        const altKey = `DATA:${dataKey}`
        if (tableDataJSON[altKey]) {
          return tableDataJSON[altKey]
        }
        return `[表格数据 ${dataKey} 未找到]`
      })
    } else {
      dataReplacedPrompt = basePrompt
    }
    
    // 构建注入的数据块
    let injectedData = ''
    
    // 注入项目基本信息
    if (hasProjectMarker || hasAllDataMarker) {
      injectedData += `
=== 项目基本信息 ===
项目名称：${project.name || ''}
项目描述：${project.description || ''}
总投资额：${project.totalInvestment || 0}万元
建设期：${project.constructionYears || 0}年
运营期：${project.operationYears || 0}年
项目类型：${project.projectType || ''}
项目地点：${project.location || ''}
`
    }
    
    // 注入投资估算数据
    if (hasInvestmentMarker || hasAllDataMarker) {
      // 对投资估算数据进行摘要处理，避免过长的 JSON
      const investmentSummary = this.summarizeInvestmentData(investment)
      injectedData += `
=== 投资估算数据 ===
${investmentSummary}
`
    }
    
    // 注入收入成本数据
    if (hasRevenueCostMarker || hasAllDataMarker) {
      const revenueCostSummary = this.summarizeRevenueCostData(revenueCost)
      injectedData += `
=== 收入成本数据 ===
${revenueCostSummary}
`
    }
    
    // 注入财务指标
    if (hasFinancialMarker || hasAllDataMarker) {
      injectedData += `
=== 关键财务指标 ===
${JSON.stringify(financialIndicators, null, 2)}
`
    }
    
    // 替换模板中的数据标记为实际数据
    const processedPrompt = dataReplacedPrompt
      .replace(/\{\{PROJECT\}\}/g, injectedData.includes('项目基本信息') ? this.formatProjectBasic(project) : '')
      .replace(/\{\{INVESTMENT\}\}/g, injectedData.includes('投资估算数据') ? this.summarizeInvestmentData(investment) : '')
      .replace(/\{\{REVENUE_COST\}\}/g, injectedData.includes('收入成本数据') ? this.summarizeRevenueCostData(revenueCost) : '')
      .replace(/\{\{FINANCIAL\}\}/g, injectedData.includes('关键财务指标') ? JSON.stringify(financialIndicators, null, 2) : '')
      .replace(/\{\{ALL_DATA\}\}/g, injectedData.trim())
      // 统一替换项目概况和运营负荷变量（所有模式都需要）
      .replace(/\{\{project_overview\}\}/g, projectOverview || '')
      .replace(/\{\{operation_load\}\}/g, operationLoadJson || '[]')
    
    return processedPrompt
  }

  /**
   * 格式化项目基本信息为文本
   */
  private static formatProjectBasic(project: any): string {
    return `项目名称：${project.name || ''}
项目描述：${project.description || ''}
总投资额：${project.totalInvestment || 0}万元
建设期：${project.constructionYears || 0}年
运营期：${project.operationYears || 0}年
项目类型：${project.projectType || ''}
项目地点：${project.location || ''}`
  }

  /**
   * 摘要投资估算数据，减少 token 使用
   */
  private static summarizeInvestmentData(investment: any): string {
    if (!investment || Object.keys(investment).length === 0) {
      return '无投资估算数据'
    }
    
    // 如果数据量小，直接返回 JSON
    const jsonStr = JSON.stringify(investment, null, 2)
    if (jsonStr.length < 2000) {
      return jsonStr
    }
    
    // 数据量大，生成摘要
    const summary: any = {
      _note: '原始数据过大，此为摘要',
      总投资: investment.totalInvestment || investment.total || '未统计',
    }
    
    // 提取主要分类的汇总
    if (investment.landCost) summary.土地费用 = '[详见原始数据]'
    if (investment.constructionCost) summary.建设投资 = '[详见原始数据]'
    if (investment.equipmentCost) summary.设备购置 = '[详见原始数据]'
    if (investment.installCost) summary.安装工程 = '[详见原始数据]'
    if (investment.otherCost) summary.其他费用 = '[详见原始数据]'
    if (investment.contingency) summary.预备费 = '[详见原始数据]'
    
    return `原始投资估算数据量较大，以下为关键摘要：
${JSON.stringify(summary, null, 2)}

如需完整数据，请使用 {{ALL_DATA}} 标记获取全部原始 JSON 数据。`
  }

  /**
   * 摘要收入成本数据，减少 token 使用
   */
  private static summarizeRevenueCostData(revenueCost: any): string {
    if (!revenueCost || Object.keys(revenueCost).length === 0) {
      return '无收入成本数据'
    }
    
    const summary: any = { _note: '原始数据过大，此为摘要' }
    
    // 提取收入汇总
    if (revenueCost.revenueItems && Array.isArray(revenueCost.revenueItems)) {
      const totalRevenue = revenueCost.revenueItems.reduce((sum: number, item: any) => 
        sum + (item.annualRevenue || 0), 0)
      summary.年收入合计 = `${totalRevenue}万元`
      summary.收入项目数 = revenueCost.revenueItems.length
    }
    
    // 提取成本汇总
    if (revenueCost.costItems && Array.isArray(revenueCost.costItems)) {
      const totalCost = revenueCost.costItems.reduce((sum: number, item: any) => 
        sum + (item.annualCost || 0), 0)
      summary.年成本合计 = `${totalCost}万元`
      summary.成本项目数 = revenueCost.costItems.length
    }
    
    // 提取财务指标
    if (revenueCost.financialIndicators) {
      summary.财务指标 = {
        ROI: revenueCost.financialIndicators.roi,
        IRR: revenueCost.financialIndicators.irr,
        NPV: revenueCost.financialIndicators.npv
      }
    }
    
    return `原始收入成本数据量较大，以下为关键摘要：
${JSON.stringify(summary, null, 2)}

如需完整数据，请使用 {{ALL_DATA}} 标记获取全部原始 JSON 数据。`
  }

  /**
   * 提取关键财务指标
   */
  static extractFinancialIndicators(revenueCostData: any): any {
    try {
      console.log('extractFinancialIndicators 开始处理')
      console.log('revenueCostData keys:', Object.keys(revenueCostData || {}))
      
      const indicators: any = {}
      
      // 优先使用已有的财务指标
      if (revenueCostData?.financialIndicators) {
        console.log('找到现有的 financialIndicators:', revenueCostData.financialIndicators)
        return revenueCostData.financialIndicators
      }
      
      // 尝试从其他字段获取财务指标
      if (revenueCostData?.profitAnalysis) {
        console.log('从 profitAnalysis 提取财务指标')
        const profitAnalysis = revenueCostData.profitAnalysis
        if (profitAnalysis.financialIndicators) {
          console.log('从 profitAnalysis.financialIndicators 提取:', profitAnalysis.financialIndicators)
          return profitAnalysis.financialIndicators
        }
      }
      
      // 如果没有财务指标，尝试从收入成本数据中提取基础指标
      if (revenueCostData?.revenueItems && revenueCostData?.costItems) {
        console.log('从收入成本数据计算基础财务指标')
        const totalRevenue = revenueCostData.revenueItems.reduce((sum: number, item: any) =>
          sum + (item.annualRevenue || 0), 0)
        const totalCost = revenueCostData.costItems.reduce((sum: number, item: any) =>
          sum + (item.annualCost || 0), 0)
        
        indicators.totalRevenue = totalRevenue
        indicators.totalCost = totalCost
        indicators.profit = totalRevenue - totalCost
        indicators.profitMargin = totalRevenue > 0 ? (indicators.profit / totalRevenue * 100) : 0
        
        // 添加一些默认的财务指标值，避免返回空数据
        indicators.irr = 0
        indicators.npv = 0
        indicators.paybackPeriod = 0
        indicators.roi = indicators.profitMargin
        indicators.totalInvestmentROI = indicators.profitMargin
        
        console.log('计算得到的财务指标:', indicators)
      } else {
        console.warn('无法找到收入成本数据来计算财务指标')
        
        // 返回默认的财务指标结构，避免完全为空
        indicators.irr = 0
        indicators.npv = 0
        indicators.paybackPeriod = 0
        indicators.roi = 0
        indicators.totalInvestmentROI = 0
        indicators.totalRevenue = 0
        indicators.totalCost = 0
        indicators.profit = 0
        indicators.profitMargin = 0
      }
      
      return indicators
    } catch (error) {
      console.error('提取财务指标失败:', error)
      // 返回默认结构，避免完全为空
      return {
        irr: 0,
        npv: 0,
        paybackPeriod: 0,
        roi: 0,
        totalInvestmentROI: 0,
        totalRevenue: 0,
        totalCost: 0,
        profit: 0,
        profitMargin: 0
      }
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
            size: 32,
            color: '000000'
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
                size: 28,
                color: '000000'
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
                size: 26,
                color: '000000'
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
                size: 24,
                color: '000000'
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
                size: 22,
                color: '000000'
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
                size: 22,
                color: '000000'
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
                size: 22,
                color: '000000'
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
    project: any,
    tableDataJSON?: Record<string, string>
  ): Promise<void> {
    try {
      console.log('开始流式生成报告:', reportId)
      console.log('tableDataJSON keys:', tableDataJSON ? Object.keys(tableDataJSON) : '无')
      
      // 收集项目相关数据
      const projectData = await this.collectProjectData(project.id)
      
      // 如果前端传入了 tableDataJSON，优先使用它
      if (tableDataJSON) {
        console.log('使用前端传入的 tableDataJSON')
        projectData.tableDataJSON = tableDataJSON
      }
      
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
          font: isHeading ? styleConfig.fonts.heading : styleConfig.fonts.body,
          color: '000000'
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
                  font: styleConfig.fonts.heading,
                  color: '000000'
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
                    font: styleConfig.fonts.body,
                    color: '000000'
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

    // 添加标题 - 使用黑体、四号、居中、段前0、段后0、1.5倍行距
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 56,  // 四号字 = 28pt * 2
            font: '黑体',  // 使用黑体
            color: '000000'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 0,   // 段前0
          after: 0,    // 段后0
          line: 360    // 1.5倍行间距
        }
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

  // ==================== 项目概况生成相关方法 ====================

  /**
   * 流式生成项目概况
   */
  static async generateOverviewStream(
    streamId: string,
    llmConfig: any,
    customPrompt: string,
    project: any,
    projectData: any
  ): Promise<void> {
    try {
      console.log('开始流式生成项目概况:', streamId)
      console.log('项目名称:', project.project_name)
      
      // 构建项目概况提示词
      const overviewPrompt = this.buildOverviewPrompt(customPrompt, project, projectData)
      
      const messages: LLMMessage[] = [{ role: 'user', content: overviewPrompt }]
      
      // 使用流式LLM调用
      const result = await LLMService.generateContentStream(llmConfig, messages, {
        maxTokens: 4000,
        temperature: 0.7
      })
      
      if (!result.success || !result.stream) {
        console.error('LLM流式调用失败:', result.error)
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
          
          if (done) {
            console.log('流式响应读取完成')
            break
          }
          
          if (!value || value.length === 0) {
            continue
          }
          
          // 解码当前数据块
          buffer += decoder.decode(value, { stream: true })
          
          // 处理SSE格式的数据
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            if (line.trim() === '') continue
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              
              if (data === '[DONE]') {
                continue
              }
              
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content || ''
                
                if (content) {
                  fullContent += content
                  
                  // 将内容逐字符推送，实现流畅的打字机效果
                  for (let i = 0; i < content.length; i++) {
                    const char = content[i]
                    sseManager.appendContent(streamId, char)
                  }
                }
              } catch (parseError) {
                console.warn('解析流式数据失败:', parseError)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
      
      console.log(`项目概况生成完成，总内容长度: ${fullContent.length}`)
      
      // 标记完成，通过SSE推送最终内容
      sseManager.complete(streamId, fullContent)
      
    } catch (error) {
      console.error('流式生成项目概况失败:', error)
      
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      sseManager.fail(streamId, errorMessage)
      
      throw error
    }
  }

  /**
   * 构建项目概况提示词
   */
  private static buildOverviewPrompt(
    customPrompt: string,
    project: any,
    projectData: any
  ): string {
    // 如果有自定义提示词，使用它
    if (customPrompt && customPrompt.trim()) {
      return customPrompt
    }
    
    // 默认提示词
    const { project: proj, investment, revenueCost, financialIndicators } = projectData
    
    return `请为以下投资项目生成一份项目概况，要求内容全面、结构清晰、格式规范：

=== 项目基本信息 ===
项目名称：${proj?.name || project.project_name || ''}
项目描述：${proj?.description || project.project_info || ''}
总投资额：${proj?.totalInvestment || project.total_investment || 0}万元
建设期：${proj?.constructionYears || project.construction_years || 0}年
运营期：${proj?.operationYears || project.operation_years || 0}年
项目类型：${proj?.projectType || project.project_type || ''}
项目地点：${proj?.location || project.location || ''}

=== 投资估算摘要 ===
${this.summarizeInvestmentData(investment)}

=== 财务指标 ===
${JSON.stringify(financialIndicators || {}, null, 2)}

请根据以上信息生成一份完整的项目概况，包括：
1. 项目背景与建设必要性
2. 项目建设内容与规模
3. 投资估算与资金来源
4. 财务评价结论

请使用规范的报告语言，段落之间用空行分隔。`
  }

  /**
   * 非流式生成项目概况（生成完成后再返回结果）
   */
  static async generateOverviewAsync(
    llmConfig: any,
    customPrompt: string,
    project: any,
    projectData: any
  ): Promise<string> {
    try {
      console.log('开始非流式生成项目概况')
      console.log('项目名称:', project.project_name)
      
      // 构建项目概况提示词
      const overviewPrompt = this.buildOverviewPrompt(customPrompt, project, projectData)
      
      const messages: LLMMessage[] = [{ role: 'user', content: overviewPrompt }]
      
      // 调用LLM生成内容（非流式）
      const result = await LLMService.generateContent(llmConfig, messages, {
        maxTokens: 4000,
        temperature: 0.7
      })
      
      if (!result.success) {
        throw new Error(`LLM调用失败: ${result.error}`)
      }
      
      const content = result.content || ''
      console.log(`项目概况生成完成，内容长度: ${content.length}`)
      
      return content
    } catch (error) {
      console.error('非流式生成项目概况失败:', error)
      throw error
    }
  }

  // ==================== HTML 转 Word 相关方法 ====================

  // 默认样式配置（用于HTML转Word）
  private static getDefaultStyleConfig(): ReportStyleConfig {
    return {
      fonts: {
        body: '宋体',
        heading: '黑体',
        number: 'Times New Roman'
      },
      fontSizes: {
        title: 22,
        body: 12,
        tableTitle: 12,
        tableHeader: 10.5,
        tableBody: 10.5
      },
      paragraph: {
        lineSpacing: 1.5,
        spaceBefore: 0,
        spaceAfter: 0,
        firstLineIndent: 2,
        headingIndent: 0
      },
      // 独立段落样式默认值
      heading1: {
        font: '黑体',
        fontSize: 22,        // 二号
        bold: true,
        lineSpacing: 1.5,
        spaceBefore: 0,
        spaceAfter: 6,
        firstLineIndent: 0
      },
      heading2: {
        font: '黑体',
        fontSize: 16,        // 小三
        bold: true,
        lineSpacing: 1.5,
        spaceBefore: 6,
        spaceAfter: 6,
        firstLineIndent: 0
      },
      body: {
        font: '宋体',
        fontSize: 12,        // 小四
        bold: false,
        lineSpacing: 1.5,
        spaceBefore: 0,
        spaceAfter: 0,
        firstLineIndent: 2   // 首行缩进2字符
      },
      page: {
        margin: {
          top: 2.5,
          bottom: 2.5,
          left: 2.5,
          right: 2.5
        },
        orientation: 'portrait'
      },
      table: {
        headerBg: 'EEEEEE',
        border: 'single',
        zebraStripe: false,
        alignment: 'left'
      }
    }
  }

  /**
   * 从 HTML 内容生成 Word 文档
   * 使用 html-to-docx 库，保持 HTML 样式转换为 Word 样式
   * @param htmlContent HTML 内容
   * @param title 文档标题
   * @param styleConfig 样式配置（仅在 useFixedExportStyle 为 false 时使用）
   * @param useFixedExportStyle 是否使用固定导出样式（默认 true），为 true 时忽略用户配置，使用默认样式
   * @param resources 资源数据（表格和图表），用于变量替换
   */
  static async generateWordFromHtml(
    htmlContent: string,
    title: string,
    styleConfig?: ReportStyleConfig,
    useFixedExportStyle: boolean = true,
    resources?: ResourceMap
  ): Promise<Buffer> {
    try {
      console.log('开始从HTML生成Word文档（html-to-docx）')
      console.log('收到的styleConfig:', JSON.stringify(styleConfig, null, 2))
      console.log('useFixedExportStyle:', useFixedExportStyle)
      
      // 动态导入 html-to-docx
      // @ts-ignore
      const htmlToDocxModule = await import('html-to-docx')
      const htmlToDocx = htmlToDocxModule.default || htmlToDocxModule
      
      // 如果 useFixedExportStyle 为 true，使用固定的默认样式，忽略用户配置
      const config = useFixedExportStyle 
        ? this.getDefaultStyleConfig() 
        : (styleConfig || this.getDefaultStyleConfig())
      
      console.log('最终使用的样式配置:', JSON.stringify(config, null, 2))
      
      // 先处理变量替换
      let processedContent = this.replaceVariablesInContent(htmlContent, resources || { tables: {}, charts: {} }, config)
      
      // 构建 HTML 内容，包含样式
      const htmlBodyContent = this.buildStyledHtmlContent(processedContent, config)
      
      // 构建完整的 HTML 文档
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    /* 页面设置 */
    @page {
      size: ${config.page?.orientation || 'portrait'};
      margin: ${(config.page?.margin?.top || 2.5)}cm ${(config.page?.margin?.right || 2.5)}cm ${(config.page?.margin?.bottom || 2.5)}cm ${(config.page?.margin?.left || 2.5)}cm;
    }
    
    /* 全局设置 */
    body {
      font-family: "${config.body?.font || config.fonts?.body || '宋体'}", "SimSun", serif;
      font-size: ${config.body?.fontSize || config.fontSizes?.body || 12}pt;
      line-height: ${config.body?.lineSpacing || config.paragraph?.lineSpacing || 1.5};
      color: #000000;
    }
    
    /* 标题1样式 */
    h1, .heading1 {
      font-family: "${config.heading1?.font || config.fonts?.heading || '黑体'}", "SimHei", sans-serif;
      font-size: ${config.heading1?.fontSize || 22}pt;
      font-weight: ${config.heading1?.bold !== false ? 'bold' : 'normal'};
      line-height: ${config.heading1?.lineSpacing || 1.5};
      margin-top: ${(config.heading1?.spaceBefore || 0)}pt;
      margin-bottom: ${(config.heading1?.spaceAfter || 6)}pt;
      color: #000000;
      page-break-after: avoid;
    }
    
    /* 标题2样式 */
    h2, .heading2 {
      font-family: "${config.heading2?.font || config.fonts?.heading || '黑体'}", "SimHei", sans-serif;
      font-size: ${config.heading2?.fontSize || 16}pt;
      font-weight: ${config.heading2?.bold !== false ? 'bold' : 'normal'};
      line-height: ${config.heading2?.lineSpacing || 1.5};
      margin-top: ${(config.heading2?.spaceBefore || 6)}pt;
      margin-bottom: ${(config.heading2?.spaceAfter || 6)}pt;
      color: #000000;
      page-break-after: avoid;
    }
    
    /* 标题3样式 */
    h3 {
      font-family: "${config.fonts?.heading || '黑体'}", "SimHei", sans-serif;
      font-size: 14pt;
      font-weight: bold;
      margin-top: 12pt;
      margin-bottom: 6pt;
      color: #000000;
    }
    
    /* 正文段落样式 */
    p {
      font-family: "${config.body?.font || config.fonts?.body || '宋体'}", "SimSun", serif;
      font-size: ${config.body?.fontSize || config.fontSizes?.body || 12}pt;
      line-height: ${config.body?.lineSpacing || config.paragraph?.lineSpacing || 1.5};
      margin-top: 0;
      margin-bottom: ${config.body?.spaceAfter || config.paragraph?.spaceAfter || 0}pt;
      text-indent: ${(config.body?.firstLineIndent || config.paragraph?.firstLineIndent || 2) * 12}pt;
      color: #000000;
    }
    
    /* 列表样式 */
    ul, ol {
      margin: 0;
      padding: 0;
    }
    
    li {
      font-family: "${config.body?.font || config.fonts?.body || '宋体'}", "SimSun", serif;
      font-size: ${config.body?.fontSize || config.fontSizes?.body || 12}pt;
      line-height: ${config.body?.lineSpacing || config.paragraph?.lineSpacing || 1.5};
      margin-left: 24pt;
      margin-bottom: 2pt;
    }
    
    /* 表格样式 */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16pt 0;
      font-family: "${config.fonts?.body || '宋体'}", "SimSun", serif;
      font-size: ${config.fontSizes?.tableBody || 10.5}pt;
    }
    
    th {
      background-color: #${config.table?.headerBg || 'EEEEEE'};
      font-weight: bold;
      text-align: center;
      font-family: "${config.fonts?.heading || '黑体'}", "SimHei", sans-serif;
      font-size: ${config.fontSizes?.tableHeader || 10.5}pt;
      padding: 8pt;
      border: 1px solid #000000;
    }
    
    td {
      padding: 8pt;
      border: 1px solid #000000;
      text-align: left;
    }
    
    tr:nth-child(even) {
      background-color: ${config.table?.zebraStripe ? '#F5F5F5' : 'transparent'};
    }
  </style>
</head>
<body>
  <h1 style="text-align: center; margin: 24pt 0; font-family: "黑体", "SimHei", sans-serif; font-size: ${config.heading1?.fontSize || 22}pt; font-weight: bold; color: #000000;">${title}</h1>
  ${htmlBodyContent}
</body>
</html>`
      
      // html-to-docx 选项
      const options = {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
        font: config.body?.font || config.fonts?.body || '宋体',
        fontSize: config.body?.fontSize || config.fontSizes?.body || 12,
        lineSpacing: (Number(config.body?.lineSpacing || config.paragraph?.lineSpacing || 1.5) * 240) as number,
        margins: {
          top: (Number(config.page?.margin?.top) || 2.5) * 28.35 * 20,
          bottom: (Number(config.page?.margin?.bottom) || 2.5) * 28.35 * 20,
          left: (Number(config.page?.margin?.left) || 2.5) * 28.35 * 20,
          right: (Number(config.page?.margin?.right) || 2.5) * 28.35 * 20,
        }
      }
      
      console.log('html-to-docx options:', JSON.stringify(options, null, 2))
      
      // 生成 Word 文档
      const docxBuffer = await htmlToDocx(fullHtml, options)
      
      console.log('Word文档生成成功（html-to-docx）')
      return Buffer.from(docxBuffer)
      
    } catch (error) {
      console.error('HTML转Word失败:', error)
      throw new Error(`HTML转Word失败: ${error.message}`)
    }
  }

  /**
   * 构建带样式的 HTML 内容
   */
  static buildStyledHtmlContent(htmlContent: string, config: ReportStyleConfig): string {
    // 如果内容是纯文本，包装为段落
    if (!htmlContent.includes('<') && !htmlContent.includes('>')) {
      const firstLineIndent = (config.body?.firstLineIndent || config.paragraph?.firstLineIndent || 2) * 12
      return `<p style="font-family: \"${config.body?.font || config.fonts?.body || '宋体'}\", \"SimSun\", serif; font-size: ${config.body?.fontSize || config.fontSizes?.body || 12}pt; line-height: ${config.body?.lineSpacing || config.paragraph?.lineSpacing || 1.5}; text-indent: ${firstLineIndent}pt; margin-bottom: ${config.body?.spaceAfter || config.paragraph?.spaceAfter || 0}pt;">${htmlContent}</p>`
    }
    
    return htmlContent
  }

  /**
   * 替换内容中的变量标记
   * 将 {{TABLE:xxx}} 和 {{CHART:xxx}} 替换为实际的表格HTML或图表图片
   */
  static replaceVariablesInContent(
    content: string,
    resources: ResourceMap,
    config: ReportStyleConfig
  ): string {
    let result = content

    // 替换表格变量 {{TABLE:tableId}}
    result = result.replace(/\{\{TABLE:(\w+)\}\}/g, (match, tableId) => {
      const tableResource = resources.tables?.[tableId]
      if (tableResource) {
        return this.generateTableHtml(tableResource, config)
      }
      return `[表格 ${tableId} 未找到]`
    })

    // 替换图表变量 {{CHART:chartId}}
    result = result.replace(/\{\{CHART:(\w+)\}\}/g, (match, chartId) => {
      const chartResource = resources.charts?.[chartId]
      if (chartResource) {
        return this.generateChartHtml(chartResource, config)
      }
      return `[图表 ${chartId} 未找到]`
    })

    return result
  }

  /**
   * 生成表格HTML
   */
  static generateTableHtml(tableResource: TableResource, config: ReportStyleConfig): string {
    if (!tableResource.data || tableResource.data.length === 0) {
      return `<p>[表格 ${tableResource.title} 无数据]</p>`
    }

    const columns = tableResource.columns
    const data = tableResource.data

    // 生成表头
    const headerRow = columns.map(col => 
      `<th style="background-color: #${config.table?.headerBg || 'EEEEEE'}; font-weight: bold; text-align: center; padding: 8pt; border: 1px solid #000000; font-family: ${config.fonts?.heading || '黑体'}; font-size: ${config.fontSizes?.tableHeader || 10.5}pt;">${col}</th>`
    ).join('')

    // 生成数据行
    const dataRows = data.map((row, rowIndex) => {
      const rowBg = config.table?.zebraStripe && rowIndex % 2 === 1 ? 'background-color: #F5F5F5;' : ''
      const cells = columns.map(col => 
        `<td style="padding: 8pt; border: 1px solid #000000; text-align: left; ${rowBg} font-family: ${config.fonts?.body || '宋体'}; font-size: ${config.fontSizes?.tableBody || 10.5}pt;">${row[col] ?? ''}</td>`
      ).join('')
      return `<tr>${cells}</tr>`
    }).join('')

    return `
      <p style="font-weight: bold; font-family: ${config.fonts?.body || '宋体'}; font-size: ${config.fontSizes?.tableTitle || 12}pt; margin-bottom: 8pt; margin-top: 16pt;">${tableResource.title}</p>
      <table style="border-collapse: collapse; width: 100%; margin: 8pt 0;">
        <thead>
          <tr>${headerRow}</tr>
        </thead>
        <tbody>
          ${dataRows}
        </tbody>
      </table>
    `
  }

  /**
   * 生成图表HTML
   */
  static generateChartHtml(chartResource: ChartResource, config: ReportStyleConfig): string {
    // 移除base64前缀
    const base64Data = chartResource.base64Image.replace(/^data:image\/[a-z]+;base64,/, '')
    
    return `
      <p style="font-weight: bold; font-family: ${config.fonts?.heading || '黑体'}; font-size: 14pt; text-align: center; margin-bottom: 8pt; margin-top: 16pt;">${chartResource.title}</p>
      <div style="text-align: center; margin: 16pt 0;">
        <img src="data:image/png;base64,${base64Data}" alt="${chartResource.title}" style="max-width: 100%; height: auto;" />
      </div>
    `
  }
}
