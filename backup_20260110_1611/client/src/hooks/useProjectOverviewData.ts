import { useMemo } from 'react'

export interface ProjectOverviewData {
  projectName: string
  constructionUnit: string
  constructionSite: string
  constructionScale: string
  investmentScale: string
  fundingSource: string
  constructionPeriod: string
  productsServices: string[]
}

// 从localStorage读取保存的项目概况信息
export const getSavedProjectOverviewInfo = (projectId: string): {
  investmentSummary: string
  fundingSource: string
  constructionScale: string
  productsServices: string[]
  savedAt: string
} | null => {
  try {
    // 1. 首先尝试从主key读取投资构成、资金来源、建设规模
    const mainData = localStorage.getItem(`project_overview_${projectId}`)
    let result: {
      investmentSummary: string
      fundingSource: string
      constructionScale: string
      productsServices: string[]
      savedAt: string
    } = {
      investmentSummary: '',
      fundingSource: '',
      constructionScale: '',
      productsServices: [],
      savedAt: ''
    }
    
    if (mainData) {
      const parsed = JSON.parse(mainData)
      console.log('[getSavedProjectOverviewInfo] 从project_overview读取:', parsed)
      result.investmentSummary = parsed.investmentSummary || ''
      result.fundingSource = parsed.fundingSource || ''
      result.constructionScale = parsed.constructionScale || ''
      result.savedAt = parsed.savedAt || ''
    }
    
    // 2. 再尝试从单独的products key读取（syncProductsServicesToLocalStorage保存的）
    const productsKey = `project_overview_products_${projectId}`
    const productsData = localStorage.getItem(productsKey)
    if (productsData) {
      const products = JSON.parse(productsData)
      console.log('[getSavedProjectOverviewInfo] 从project_overview_products读取:', products)
      result.productsServices = Array.isArray(products) ? products : []
    }
    
    // 检查是否有任何数据
    if (result.investmentSummary || result.fundingSource || result.productsServices.length > 0) {
      return result
    }
  } catch (error) {
    console.error('[getSavedProjectOverviewInfo] 读取失败:', error)
  }
  return null
}

export const useProjectOverviewData = (projectData: any): ProjectOverviewData | null => {
  return useMemo(() => {
    if (!projectData) return null

    const project = projectData.project || {}
    const estimate = projectData.estimate || {}
    const revenueItems = projectData.revenueItems || []

    // 尝试从localStorage读取保存的项目概况信息
    const projectId = project.id || project.projectId
    const savedInfo = projectId ? getSavedProjectOverviewInfo(projectId) : null

    // 建设规模 - 优先使用保存的建设规模信息
    let constructionScaleText = ''
    if (savedInfo?.constructionScale) {
      constructionScaleText = savedInfo.constructionScale
      console.log('[useProjectOverviewData] 使用保存的建设规模信息')
    } else {
      // 从投资估算简表提取建设规模（备用逻辑）
      const partAChildren = estimate.partA?.children || []
      constructionScaleText = partAChildren
        .map((item: any) => `${item.name || ''}: ${item.amount || 0}万元`)
        .join('；')
      console.log('[useProjectOverviewData] 使用计算的建设规模信息')
    }

    // 提取总投资规模 - 优先使用保存的投资构成信息
    const totalInvestment = project.totalInvestment || 0
    
    // 如果有保存的投资构成信息，使用它作为investmentScale
    let investmentScaleText = ''
    if (savedInfo?.investmentSummary) {
      investmentScaleText = savedInfo.investmentSummary
      console.log('[useProjectOverviewData] 使用保存的投资构成信息')
    } else {
      investmentScaleText = `总投资${totalInvestment}万元`
      console.log('[useProjectOverviewData] 未找到保存信息，使用默认格式')
    }

    // 资金来源 - 优先使用保存的资金来源信息
    let fundingSourceText = ''
    if (savedInfo?.fundingSource) {
      fundingSourceText = savedInfo.fundingSource
      console.log('[useProjectOverviewData] 使用保存的资金来源信息')
    } else {
      // 计算资金来源（备用逻辑）
      const loanAmount = estimate.loanAmount || 0
      const selfFundedAmount = totalInvestment - loanAmount
      const loanRatio = totalInvestment > 0 ? ((loanAmount / totalInvestment) * 100).toFixed(2) : '0.00'
      const selfRatio = totalInvestment > 0 ? ((selfFundedAmount / totalInvestment) * 100).toFixed(2) : '0.00'
      fundingSourceText = `申请银行贷款${loanAmount}万元，占投资估算总额的${loanRatio}%；业主自筹${selfFundedAmount}万元，占投资估算总额的${selfRatio}%`
      console.log('[useProjectOverviewData] 使用计算的资金来源信息')
    }

    // 产品/服务 - 优先使用保存的收入项名称数组
    let productsServices: string[] = []
    console.log('[useProjectOverviewData] 检查productsServices:', {
      'savedInfo存在': !!savedInfo,
      'savedInfo.productsServices': savedInfo?.productsServices,
      'savedInfo.productsServices长度': savedInfo?.productsServices?.length,
      'revenueItems长度': revenueItems.length
    })
    if (savedInfo?.productsServices && savedInfo.productsServices.length > 0) {
      productsServices = savedInfo.productsServices
      console.log('[useProjectOverviewData] 使用保存的收入项名称数组:', productsServices)
    } else {
      // 从revenueItems提取（备用逻辑）
      productsServices = revenueItems.map((item: any) => item.name || '').filter(Boolean)
      console.log('[useProjectOverviewData] 使用计算的收入项名称数组:', productsServices)
    }

    // 建设周期 - 增加更详细的时间信息
    const constructionYears = project.constructionYears || 0
    const operationYears = project.operationYears || 0
    const constructionPeriodText = constructionYears > 0 ? `${constructionYears}年` : '暂无数据'

    // 增加项目类型信息
    const projectType = project.project_type || '暂无数据'

    console.log('[useProjectOverviewData] 提取的数据:', {
      projectName: project.name,
      hasSavedInfo: !!savedInfo,
      savedAt: savedInfo?.savedAt,
      investmentScaleText,
      fundingSourceText,
      constructionScaleText,
      productsServices,
      constructionPeriodText,
      projectType
    })

    return {
      projectName: project.name || '暂无项目名称',
      constructionUnit: project.constructionUnit || '暂无建设单位',
      constructionSite: project.location || '暂无建设地点',
      constructionScale: constructionScaleText || '暂无建设规模数据',
      investmentScale: investmentScaleText || '暂无投资规模数据',
      fundingSource: fundingSourceText || '暂无资金来源数据',
      constructionPeriod: constructionPeriodText,
      productsServices: productsServices.length > 0 ? productsServices : ['暂无产品或服务数据']
    }
  }, [projectData])
}