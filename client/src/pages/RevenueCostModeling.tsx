import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Card,
  Group,
  Stack,
  Stepper,
  LoadingOverlay,
  NumberInput,
  Divider,
  Table,
  ActionIcon,
  Tooltip,
  Modal,
} from '@mantine/core'
import {
  IconChartBar,
  IconArrowLeft,
  IconEdit,
  IconCalendar,
  IconBuildingFactory,
  IconTool,
  IconFileText,
  IconCoin,
  IconCurrencyDollar,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { projectApi, investmentApi, revenueCostApi } from '@/lib/api'
import * as XLSX from 'xlsx'
import { useRevenueCostStore } from '@/stores/revenueCostStore'
import { InvestmentEstimate } from '@/types'
import AIRevenueStructure from '@/components/revenue-cost/AIRevenueStructure'
import DynamicRevenueTable from '@/components/revenue-cost/DynamicRevenueTable'
import DynamicCostTable from '@/components/revenue-cost/DynamicCostTable'
import ProductionRateModal from '@/components/revenue-cost/ProductionRateModal'
import FinancialIndicatorsTable from '@/components/revenue-cost/FinancialIndicatorsTable'
import { Header } from '@/components/common/Header'

// 步骤定义
const STEPS = [
  { label: '基础数据', value: 0 },
  { label: 'AI推荐结构', value: 1 },
  { label: '收入建模', value: 2 },
  { label: '成本建模', value: 3 },
  { label: '项目投资现金流量', value: 4 },
]

/**
 * 营业收入与成本测算主页面
 */
const RevenueCostModeling: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  // Zustand Store
  const { 
    setContext, 
    currentStep, 
    setCurrentStep,
    revenueStructureLocked,
    setAiAnalysisResult,
    setRevenueStructureLocked,
    revenueItems,  // 添加这一行
    productionRates,  // 添加这一行
    aiAnalysisResult  // 添加这一行
  } = useRevenueCostStore()

  // 状态管理
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<any>(null)
  const [investmentEstimate, setInvestmentEstimate] = useState<InvestmentEstimate | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false) // 标记数据是否已完全加载

  // 基础数据状态
  const [repaymentPeriod, setRepaymentPeriod] = useState(0)
  const [constructionDepreciationYears, setConstructionDepreciationYears] = useState(50)
  const [constructionResidualRate, setConstructionResidualRate] = useState(5)
  const [equipmentDepreciationYears, setEquipmentDepreciationYears] = useState(10)
  const [equipmentResidualRate, setEquipmentResidualRate] = useState(5)
  const [intangibleAmortizationYears, setIntangibleAmortizationYears] = useState(50)
  const [intangibleResidualRate, setIntangibleResidualRate] = useState(0)
  const [constructionInputTaxRate, setConstructionInputTaxRate] = useState(9)
  const [equipmentInputTaxRate, setEquipmentInputTaxRate] = useState(9)
  
  // 计算值状态
  const [constructionOriginalValue, setConstructionOriginalValue] = useState(0)
  const [equipmentOriginalValue, setEquipmentOriginalValue] = useState(0)
  const [deductibleInputTax, setDeductibleInputTax] = useState(0)
  
  // 还本付息计划表状态
  const [repaymentPlanOpened, setRepaymentPlanOpened] = useState(false)
  const [repaymentTableData, setRepaymentTableData] = useState<Array<{
    序号: string
    项目: string
    合计: number | null
    分年数据: number[]
    isMainRow?: boolean
  }>>([])
  
  // 折旧摊销表状态
  const [depreciationData, setDepreciationData] = useState<Array<{
    序号: string
    资产类别: string
    原值: number
    年折旧摊销额: number
    分年数据: number[]
  }>>([])
  
  // 建设期利息详情状态
  const [constructionInterestDetails, setConstructionInterestDetails] = useState<any>(null)
  
  // 弹窗状态控制
  const [editModalOpened, setEditModalOpened] = useState(false)
  const [depreciationTableOpened, setDepreciationTableOpened] = useState(false)
  const [editingFieldData, setEditingFieldData] = useState<{
    type: string
    label: string
    value1: number
    value2: number
    unit1: string
    unit2: string
    min1: number
    max1: number
    min2: number
    max2: number
  } | null>(null)
  const [tempValue1, setTempValue1] = useState(0)
  const [tempValue2, setTempValue2] = useState(0)

  // 加载项目基础信息和投资估算数据
  useEffect(() => {
    const loadProjectData = async () => {
      try {
        setLoading(true)
        
        // 获取store方法
        const { loadFromBackend } = useRevenueCostStore.getState()
        const [projectResponse, estimateResponse, revenueCostResponse] = await Promise.all([
          projectApi.getById(id!),
          investmentApi.getByProjectId(id!),
          revenueCostApi.getByProjectId(id!) // 加载收入成本数据
        ])
        
        let projectData = null
        let estimateData = null
        
        // 首先处理项目数据
        if (projectResponse.success && projectResponse.data) {
          projectData = projectResponse.data.project || projectResponse.data
          setProject(projectData)
          
          // 初始化还款期为运营期
          setRepaymentPeriod(projectData.operation_years || 0)
          
          // 初始化Zustand Store上下文
          setContext({
            projectId: projectData.id,
            projectName: projectData.project_name,
            constructionYears: projectData.construction_years,
            operationYears: projectData.operation_years,
            totalInvestment: projectData.total_investment,
          })
        } else {
          notifications.show({
            title: '错误',
            message: '加载项目数据失败',
            color: 'red',
          })
          navigate('/dashboard')
          return
        }
        
        // 然后处理投资估算数据
        if (estimateResponse.success && estimateResponse.data?.estimate) {
          estimateData = estimateResponse.data.estimate
          console.log('✅ 成功加载投资估算数据:', estimateData)
          console.log('📋 投资估算详细字段:', {
            construction_cost: estimateData.construction_cost,
            equipment_cost: estimateData.equipment_cost,
            installation_cost: estimateData.installation_cost,
            other_cost: estimateData.other_cost,
            basic_reserve: estimateData.basic_reserve,
            price_reserve: estimateData.price_reserve,
            construction_interest: estimateData.construction_interest
          })
          setInvestmentEstimate(estimateData)
          
          // 修复：在project和estimateData都设置好后，再检查并自动保存建设期利息详情
          // 此时projectData已经不为null，可以安全传递
          await saveConstructionInterestDetailsIfNeeded(estimateData, projectData)
                
          // 设置建设期利息详情
          if (estimateData.construction_interest_details) {
            // 确保数据是对象格式（如果是JSON字符串则反序列化）
            let interestDetails = estimateData.construction_interest_details;
            if (typeof interestDetails === 'string') {
              try {
                interestDetails = JSON.parse(interestDetails);
                console.log('📋 前端JSON反序列化建设期利息详情成功:', interestDetails);
              } catch (e) {
                console.error('📋 前端JSON反序列化建设期利息详情失败:', e);
                interestDetails = null;
              }
            }
            if (interestDetails) {
              setConstructionInterestDetails(interestDetails);
              console.log('📋 设置建设期利息详情:', interestDetails);
            }
          }
        } else {
          console.warn('⚠️ 投资估算API响应异常:', estimateResponse)
        }
        
        // 加载收入成本数据（包括AI分析结果）
        if (revenueCostResponse.success && revenueCostResponse.data?.estimate) {
          const revenueCostData = revenueCostResponse.data.estimate
          console.log('✅ 成功加载收入成本数据')
          
          // 使用store的loadFromBackend方法恢复完整数据
          await loadFromBackend(id!)
          
          // 恢复AI分析结果（如果store中没有的话）
          if (revenueCostData.ai_analysis_result) {
            console.log('🤖 恢复AI分析结果:', revenueCostData.ai_analysis_result)
            setAiAnalysisResult(revenueCostData.ai_analysis_result)
            // 如果工作流步骤是suggest或更后，说明已经锁定
            if (revenueCostData.workflow_step && ['suggest', 'revenue', 'cost', 'profit', 'validate', 'done'].includes(revenueCostData.workflow_step)) {
              setRevenueStructureLocked(true)
            }
          }
          
          // 设置当前工作流步骤
          if (revenueCostData.workflow_step) {
            setCurrentStep(revenueCostData.workflow_step)
          }
        }
      } catch (error) {
        console.error('加载项目失败:', error)
        notifications.show({
          title: '错误',
          message: '加载项目数据时发生错误',
          color: 'red',
        })
        navigate('/dashboard')
      } finally {
        setLoading(false)
        setDataLoaded(true) // 标记数据已完全加载
      }
    }

    if (id) {
      loadProjectData()
    }
  }, [id, navigate])

  // 检查并自动保存建设期利息详情
  const saveConstructionInterestDetailsIfNeeded = async (estimateData: any, project: any) => {
    // 添加参数验证
    if (!estimateData) {
      console.log('⚠️ estimateData参数为空，跳过建设期利息详情保存')
      return
    }
    
    if (!project) {
      console.log('⚠️ project参数为空，跳过建设期利息详情保存')
      return
    }
    
    // 检查是否已有建设期利息详情
    if (estimateData.construction_interest_details) {
      console.log('✅ 建设期利息详情已存在，跳过保存')
      return
    }

    // 检查是否有partF数据（建设期利息数据）
    if (!estimateData.estimate_data?.partF) {
      console.log('⚠️ 未找到partF数据，无法生成建设期利息详情')
      return
    }

    // 🔧 修复：添加详细的调试日志，跟踪建设期利息数据流
    console.log('🔄 saveConstructionInterestDetailsIfNeeded 被调用')
    console.log('📋 estimateData:', estimateData)
    console.log('📋 project:', project)
    console.log('📋 estimateData.estimate_data:', estimateData?.estimate_data)
    console.log('📋 partF:', estimateData?.estimate_data?.partF)
    console.log('📋 partF.分年利息:', estimateData?.estimate_data?.partF?.分年利息)
      
    try {
      // 准备建设期利息详情数据
      const constructionInterestDetails = prepareConstructionInterestDetails(estimateData.estimate_data, project)
      
      // 如果准备失败，直接返回
      if (!constructionInterestDetails) {
        console.log('⚠️ 建设期利息详情准备失败，跳过保存')
        return
      }
      
      // 🔧 关键修复：如果存在完整的estimate_data结构，必须发送给后端
      // 否则后端会使用简化字段重新计算，覆盖完整结构
      const saveData: any = {
        project_id: project.id,
        construction_cost: Number(estimateData.construction_cost) || 0,
        equipment_cost: Number(estimateData.equipment_cost) || 0,
        installation_cost: Number(estimateData.installation_cost) || 0,
        other_cost: Number(estimateData.other_cost) || 0,
        land_cost: Number(estimateData.land_cost) || 0,
        basic_reserve_rate: 0.05,
        price_reserve_rate: 0.03,
        construction_period: Number(estimateData.construction_period) || 3,
        loan_rate: Number(project.loan_interest_rate) || 0.049,
        custom_loan_amount: estimateData.custom_loan_amount ? Number(estimateData.custom_loan_amount) : undefined,
        // 添加建设期利息详情数据
        construction_interest_details: constructionInterestDetails,
      }

      // 包含完整的estimate_data结构
      if (estimateData.estimate_data?.partA?.children?.length > 0 && 
          estimateData.estimate_data?.partG?.合计 > 0) {
        saveData.estimate_data = estimateData.estimate_data
        console.log('✅ 发送完整estimate_data结构到后端')
      } else {
        console.warn('⚠️ estimate_data结构不完整，后端将使用简化字段计算')
      }

      console.log('📊 准备保存的建设期利息详情:', constructionInterestDetails)
      
      // 调用API保存
      const response = await investmentApi.save(saveData)
      
      if (response.success) {
        console.log('✅ 建设期利息详情已成功保存到数据库')
        notifications.show({
          title: '数据已更新',
          message: '建设期利息详情已自动保存',
          color: 'green',
        })
        
        // 更新本地投资估算数据
        setInvestmentEstimate(prev => prev ? {
          ...prev,
          construction_interest_details: constructionInterestDetails
        } : null)
      } else {
        console.error('❌ 保存建设期利息详情失败:', response.error)
        notifications.show({
          title: '保存失败',
          message: response.error || '建设期利息详情保存失败',
          color: 'red',
        })
      }
    } catch (error: any) {
      console.error('❌ 保存建设期利息详情时发生错误:', error)
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      })
      notifications.show({
        title: '保存失败',
        message: error.response?.data?.error || error.message || '建设期利息详情保存失败',
        color: 'red',
      })
    }
  }

  // 准备建设期利息详情数据
  const prepareConstructionInterestDetails = (estimateData: any, project: any) => {
    // 🔧 修复：使用正确的字段名 分年利息（有"年"字）
    // 添加空值检查
    if (!estimateData?.partF?.分年利息) {
      console.log('⚠️ 未找到partF.分年利息数据，无法生成建设期利息详情')
      console.log('📋 estimateData:', estimateData)
      console.log('📋 partF:', estimateData?.partF)
      return null
    }
    
    // 添加project参数的空值检查
    if (!project) {
      console.log('⚠️ project参数为空，无法生成建设期利息详情')
      return null
    }

    // 🔧 修复：使用正确的字段名 分年利息（有"年"字）
    const yearlyInterestData = estimateData.partF.分年利息
    const constructionYears = project.construction_years || 0
    
    console.log('✅ 成功读取分年利息数据:', {
      '建设期年限': constructionYears,
      '分年利息数据条数': yearlyInterestData?.length || 0,
      '分年利息数据': yearlyInterestData
    })

    // 计算各年期末借款余额
    const calculateEndOfYearBalance = (yearIndex: number): number => {
      let balance = 0
      for (let i = 0; i <= yearIndex; i++) {
        if (yearlyInterestData[i]) {
          balance += yearlyInterestData[i].当期借款金额 || 0
        }
      }
      return balance
    }

    // 🔧 修复：使用正确的字段名 分年利息（有"年"字）
    // 准备JSON数据结构
    return {
      基本信息: {
        贷款总额: estimateData.partF.贷款总额 || 0,
        年利率: estimateData.partF.年利率 || project.loan_interest_rate || 0,
        建设期年限: constructionYears,
        贷款期限: estimateData.partF.贷款期限 || 0
      },
      分年数据: yearlyInterestData.map((data: any, index: number) => ({
        年份: index + 1,
        期初借款余额: index === 0 ? 0 : calculateEndOfYearBalance(index - 1),
        当期借款金额: data?.当期借款金额 || 0,
        当期利息: data?.当期利息 || 0,
        期末借款余额: calculateEndOfYearBalance(index)
      })),
      汇总信息: {
        总借款金额: yearlyInterestData.reduce((sum: number, data: any) => sum + (data?.当期借款金额 || 0), 0),
        总利息: yearlyInterestData.reduce((sum: number, data: any) => sum + (data?.当期利息 || 0), 0),
        期末借款余额: calculateEndOfYearBalance(yearlyInterestData.length - 1)
      }
    }
  }

  // 计算原值和待抵扣进销项税
  useEffect(() => {
    if (!project) return

    // 如果没有投资估算数据，显示提示
    if (!investmentEstimate) {
      console.log('⚠️ 未找到投资估算数据，请先完成投资估算')
      setConstructionOriginalValue(0)
      setEquipmentOriginalValue(0)
      setDeductibleInputTax(0)
      return
    }

    // 从 estimate_data.partA.children 汇总提取各项费用
    let constructionFee = 0
    let equipmentFee = 0
    let installationFee = 0
    let otherFee = 0
    
    if (investmentEstimate.estimate_data?.partA?.children) {
      investmentEstimate.estimate_data.partA.children.forEach((item: any) => {
        constructionFee += Number(item.建设工程费) || 0
        equipmentFee += Number(item.设备购置费) || 0
        installationFee += Number(item.安装工程费) || 0
        otherFee += Number(item.其它费用) || 0
      })
    }
    
    // 获取第二部分工程其它费用总和和土地费用
    const partBTotal = Number(investmentEstimate.estimate_data?.partB?.合计) || 0
    let landCost = 0
    if (investmentEstimate.estimate_data?.partB?.children) {
      const landItem = investmentEstimate.estimate_data.partB.children.find(
        (item: any) => item.工程或费用名称 === '土地费用'
      )
      landCost = Number(landItem?.合计) || 0
    }
    
    // 建安费 = (第一部分的建设工程费+安装工程费+其他费用) + 第二部分总和 - 土地费用
    const totalConstructionFee = constructionFee + installationFee + otherFee + partBTotal - landCost
    const constructionInterest = Number(investmentEstimate.construction_interest) || 0 // 建设期利息
    const contingency = (Number(investmentEstimate.basic_reserve) || 0) + (Number(investmentEstimate.price_reserve) || 0) // 预备费 = 基本预备费 + 涨价预备费

    console.log('📈 投资估算数据:', {
      '建设工程费': constructionFee,
      '安装工程费': installationFee,
      '其他费用': otherFee,
      '第二部分总和': partBTotal,
      '土地费用': landCost,
      '建安费合计': totalConstructionFee,
      '设备购置费': equipmentFee,
      '建设期利息': constructionInterest,
      '预备费合计': contingency
    })

    // 建安费原值 = 建安费 / (1 + 建安进率) + (建息 + 预备费) * 建安费 / (建安费 + 设备费)
    const totalFee = totalConstructionFee + equipmentFee
    const constructionOriginal = totalFee > 0
      ? totalConstructionFee / (1 + constructionInputTaxRate / 100) + 
        (constructionInterest + contingency) * totalConstructionFee / totalFee
      : 0
    
    // 设备原值 = 设备费 / (1 + 机械进率) + (建息 + 预备费) * 设备费 / (建安费 + 设备费)
    const equipmentOriginal = totalFee > 0
      ? equipmentFee / (1 + equipmentInputTaxRate / 100) + 
        (constructionInterest + contingency) * equipmentFee / totalFee
      : 0
    
    // 待抵扣进销项税 = 建安费/(1+建安进率)*建安进率 + 设备费/(1+机械进率)*机械进率
    const deductibleTax = totalConstructionFee / (1 + constructionInputTaxRate / 100) * (constructionInputTaxRate / 100) +
      equipmentFee / (1 + equipmentInputTaxRate / 100) * (equipmentInputTaxRate / 100)

    console.log('📊 计算结果:', {
      '建安费原值': constructionOriginal.toFixed(2),
      '设备原值': equipmentOriginal.toFixed(2),
      '待抵扣进销项税': deductibleTax.toFixed(2)
    })

    setConstructionOriginalValue(constructionOriginal)
    setEquipmentOriginalValue(equipmentOriginal)
    setDeductibleInputTax(deductibleTax)
  }, [project, investmentEstimate, constructionInputTaxRate, equipmentInputTaxRate])

  /**
   * 计算还本付息计划表（等额本金还款方式）
   * 新公式：当年利息 = (期初借款余额 - 当期还本/2) × 年利率
   */
  useEffect(() => {
    if (!project || !investmentEstimate) return

    const loanAmount = Number(investmentEstimate.loan_amount) || 0
    if (loanAmount === 0 || repaymentPeriod === 0) {
      setRepaymentTableData([])
      return
    }

    const loanYears = repaymentPeriod
    const interestRate = Number(project.loan_interest_rate) || 0.049 // 默认4.9%
    const operationYears = project.operation_years || 0
    const totalMonths = loanYears * 12
    const monthlyPrincipal = loanAmount / totalMonths // 每月固定本金

    console.log('📋 还本付息计算参数:', {
      '贷款总额': loanAmount,
      '贷款年限': loanYears,
      '年利率': interestRate,
      '运营期': operationYears,
      '每月还本': monthlyPrincipal.toFixed(2)
    })

    // 预先计算总利息
    let totalInterest = 0
    for (let y = 0; y < loanYears; y++) {
      const yearOpeningBalance = loanAmount - (monthlyPrincipal * y * 12)
      if (yearOpeningBalance <= 0) break

      const monthsInYear = Math.min(12, totalMonths - y * 12)
      const yearPrincipal = monthlyPrincipal * monthsInYear

      // 关键公式：当年利息 = (期初余额 - 当期还本/2) × 年利率
      const yearInterest = Math.max(0, (yearOpeningBalance - yearPrincipal / 2) * interestRate)
      totalInterest += yearInterest
    }

    console.log('💰 总利息:', totalInterest.toFixed(2))

    // 生成表格数据
    const data: Array<{
      序号: string
      项目: string
      合计: number | null
      分年数据: number[]
      isMainRow?: boolean
    }> = []

    // 1. 期初借款余额
    data.push({
      序号: '1',
      项目: '期初借款余额',
      合计: null,
      分年数据: Array.from({ length: operationYears }, (_, i) => {
        if (i === 0) return loanAmount
        if (i >= loanYears) return 0
        const monthsPassed = i * 12
        return Math.max(0, loanAmount - monthlyPrincipal * monthsPassed)
      })
    })

    // 2. 当期还本付息（主行）
    data.push({
      序号: '2',
      项目: '当期还本付息',
      合计: loanAmount + totalInterest,
      isMainRow: true,
      分年数据: Array.from({ length: operationYears }, (_, i) => {
        if (i >= loanYears) return 0

        const yearOpeningBalance = loanAmount - (monthlyPrincipal * i * 12)
        if (yearOpeningBalance <= 0) return 0

        const monthsRemaining = Math.min(12, totalMonths - i * 12)
        const yearPrincipal = monthlyPrincipal * monthsRemaining
        const yearInterest = Math.max(0, (yearOpeningBalance - yearPrincipal / 2) * interestRate)

        return yearPrincipal + yearInterest
      })
    })

    // 3. 还本（子行）
    data.push({
      序号: '2.1',
      项目: '还本',
      合计: loanAmount,
      分年数据: Array.from({ length: operationYears }, (_, i) => {
        if (i >= loanYears) return 0
        const monthsRemaining = Math.min(12, totalMonths - i * 12)
        return monthlyPrincipal * monthsRemaining
      })
    })

    // 4. 付息（子行）
    data.push({
      序号: '2.2',
      项目: '付息',
      合计: totalInterest,
      分年数据: Array.from({ length: operationYears }, (_, i) => {
        if (i >= loanYears) return 0

        const yearOpeningBalance = loanAmount - (monthlyPrincipal * i * 12)
        if (yearOpeningBalance <= 0) return 0

        const monthsRemaining = Math.min(12, totalMonths - i * 12)
        const yearPrincipal = monthlyPrincipal * monthsRemaining

        return Math.max(0, (yearOpeningBalance - yearPrincipal / 2) * interestRate)
      })
    })

    // 5. 期末借款余额
    data.push({
      序号: '3',
      项目: '期末借款余额',
      合计: null,
      分年数据: Array.from({ length: operationYears }, (_, i) => {
        if (i >= loanYears) return 0
        const monthsPassed = (i + 1) * 12
        if (monthsPassed >= totalMonths) return 0
        return Math.max(0, loanAmount - monthlyPrincipal * monthsPassed)
      })
    })

    setRepaymentTableData(data)
    
    // 保存还本付息计划简表数据到store
    const { setLoanRepaymentTableData } = useRevenueCostStore.getState()
    setLoanRepaymentTableData({
      rows: data.map(row => ({
        序号: row.序号,
        项目: row.项目,
        合计: row.合计,
        建设期: [], // 简表中建设期为空
        运营期: row.分年数据
      })),
      updatedAt: new Date().toISOString()
    })
  }, [project, investmentEstimate, repaymentPeriod])

  /**
   * 计算折旧摊销表（直线法）
   */
  useEffect(() => {
    if (!project || !investmentEstimate) return

    const operationYears = project.operation_years || 0
    if (operationYears === 0) {
      setDepreciationData([])
      return
    }

    // 提取土地费用（从 partB 获取）
    let landCost = 0
    if (investmentEstimate.estimate_data?.partB?.children) {
      const landItem = investmentEstimate.estimate_data.partB.children.find(
        (item: any) => item.工程或费用名称 === '土地费用'
      )
      landCost = Number(landItem?.合计) || 0
    }

    const data: Array<{
      序号: string
      资产类别: string
      原值: number
      年折旧摊销额: number
      分年数据: number[]
    }> = []

    // A. 房屋（建筑物）
    const constructionAnnualDepreciation = constructionOriginalValue * (1 - constructionResidualRate / 100) / constructionDepreciationYears
    const constructionYearlyData = Array.from({ length: operationYears }, (_, i) => {
      // 折旧年限内，每年按固定额度折旧
      return i < constructionDepreciationYears ? constructionAnnualDepreciation : 0
    })
    // 折旧/摊销额合计 = 运营期各列的合计值，结果保留两位小数
    const constructionTotalDepreciation = Number(constructionYearlyData.reduce((sum, val) => sum + val, 0).toFixed(2))
    data.push({
      序号: 'A',
      资产类别: '🏢 房屋（建筑物）',
      原值: constructionOriginalValue,
      年折旧摊销额: constructionTotalDepreciation,
      分年数据: constructionYearlyData
    })

    // D. 设备购置
    const equipmentAnnualDepreciation = equipmentOriginalValue * (1 - equipmentResidualRate / 100) / equipmentDepreciationYears
    const equipmentYearlyData = Array.from({ length: operationYears }, (_, i) => {
      return i < equipmentDepreciationYears ? equipmentAnnualDepreciation : 0
    })
    // 折旧/摊销额合计 = 运营期各列的合计值，结果保留两位小数
    const equipmentTotalDepreciation = Number(equipmentYearlyData.reduce((sum, val) => sum + val, 0).toFixed(2))
    data.push({
      序号: 'D',
      资产类别: '⚙️ 设备购置',
      原值: equipmentOriginalValue,
      年折旧摊销额: equipmentTotalDepreciation,
      分年数据: equipmentYearlyData
    })

    // E. 无形资产（土地） - 从投资估算 partB 土地费用获取
    const intangibleOriginalValue = landCost // 土地费用即为无形资产原值
    const intangibleAnnualAmortization = intangibleOriginalValue > 0
      ? intangibleOriginalValue * (1 - intangibleResidualRate / 100) / intangibleAmortizationYears
      : 0
    const intangibleYearlyData = Array.from({ length: operationYears }, (_, i) => {
      return i < intangibleAmortizationYears ? intangibleAnnualAmortization : 0
    })
    // 折旧/摊销额合计 = 运营期各列的合计值，结果保留两位小数
    const intangibleTotalAmortization = Number(intangibleYearlyData.reduce((sum, val) => sum + val, 0).toFixed(2))
    data.push({
      序号: 'E',
      资产类别: '🌍 无形资产（土地）',
      原值: intangibleOriginalValue,
      年折旧摊销额: intangibleTotalAmortization,
      分年数据: intangibleYearlyData
    })

    // 计算合计行数据
    // 合计行原值 = 所有行原值之和
    const totalOriginalValue = data.reduce((sum, row) => sum + (row.原值 ?? 0), 0)
    
    // 计算合计行各年的分摊金额
    const totalYearlyData = Array.from({ length: operationYears }, (_, yearIdx) => {
      return data.reduce((sum, row) => sum + (row.分年数据?.[yearIdx] ?? 0), 0)
    })
    
    // 合计行年折旧摊销额 = 运营期各列的合计值，结果保留两位小数
    const totalAnnualDepreciation = Number(totalYearlyData.reduce((sum, val) => sum + val, 0).toFixed(2))
    
    console.log('📊 合计行计算过程:')
    console.log(`  合计行各年分摊金额: [${totalYearlyData.map(v => v.toFixed(2)).join(', ')}]`)
    console.log(`  折旧/摊销额合计: ${totalYearlyData.reduce((sum, val) => sum + val, 0).toFixed(2)}`)
    
    // 添加合计行到数据数组
    data.push({
      序号: '合计',
      资产类别: '合计',
      原值: totalOriginalValue,
      年折旧摊销额: totalAnnualDepreciation,
      分年数据: totalYearlyData
    })

    console.log('📉 折旧摊销表数据:', {
      '土地费用': landCost,
      '无形资产原值': intangibleOriginalValue,
      '年摊销额': intangibleAnnualAmortization,
      '合计行原值': totalOriginalValue,
      '运营期': operationYears,
      '合计行年折旧/摊销额': totalAnnualDepreciation,
      '表格数据行数': data.length,
      '表格数据': data
    })
    setDepreciationData(data)
    console.log('✅ 折旧摊销数据已设置，depreciationData.length:', data.length)
  }, [
    project,
    investmentEstimate,
    constructionOriginalValue,
    equipmentOriginalValue,
    constructionDepreciationYears,
    constructionResidualRate,
    equipmentDepreciationYears,
    equipmentResidualRate,
    intangibleAmortizationYears,
    intangibleResidualRate
  ])
  
  // 注意：自动保存已移至 revenueCostStore.ts 中的防抖机制
  // 所有数据修改都会自动保存到数据库
  
  // 在页面加载时检查 revenueTableData 是否需要重新生成
  useEffect(() => {
    const { revenueTableData, context, generateRevenueTableData } = useRevenueCostStore.getState();
    
    if (revenueTableData && revenueTableData.rows) {
      const row3 = revenueTableData.rows.find(r => r.序号 === '3');
      const row2 = revenueTableData.rows.find(r => r.序号 === '2');
      
      // 检查序号2和序号3的数据是否有效（运营期数据不为0）
      const row2运营期和 = row2?.运营期?.reduce((sum, v) => sum + (v || 0), 0) || 0;
      const row3运营期和 = row3?.运营期?.reduce((sum, v) => sum + (v || 0), 0) || 0;
      
      // 如果序号2或序号3的数据为0，且存在收入项，则重新生成数据
      if ((row2运营期和 === 0 || row3运营期和 === 0) && context && revenueItems.length > 0) {
        const deductibleInputTaxValue = deductibleInputTax || 0;
        const newTableData = generateRevenueTableData(deductibleInputTaxValue, 0.07);
        if (newTableData) {
          // 保存到 store
          useRevenueCostStore.getState().setRevenueTableData(newTableData);
        }
      }
    } else if (context && revenueItems.length > 0) {
      // 触发数据生成
      const deductibleInputTaxValue = deductibleInputTax || 0;
      const newTableData = generateRevenueTableData(deductibleInputTaxValue, 0.07);
      if (newTableData) {
        // 保存到 store
        useRevenueCostStore.getState().setRevenueTableData(newTableData);
      }
    }
  }, [revenueItems.length, deductibleInputTax, dataLoaded]);

  // 打开编辑弹窗（年限和残值率同时编辑）
  const openEditModal = (
    type: string, 
    label: string, 
    value1: number, 
    unit1: string, 
    min1: number, 
    max1: number,
    value2: number,
    unit2: string,
    min2: number,
    max2: number
  ) => {
    setEditingFieldData({ type, label, value1, unit1, min1, max1, value2, unit2, min2, max2 })
    setTempValue1(value1)
    setTempValue2(value2)
    setEditModalOpened(true)
  }

  // 打开简单编辑弹窗（单个值）
  const openSimpleEditModal = (type: string, label: string, value: number, unit: string, min: number, max: number) => {
    setEditingFieldData({ 
      type, 
      label, 
      value1: value, 
      unit1: unit, 
      min1: min, 
      max1: max,
      value2: 0,
      unit2: '',
      min2: 0,
      max2: 0
    })
    setTempValue1(value)
    setTempValue2(0)
    setEditModalOpened(true)
  }

  // 保存编辑
  const saveEdit = () => {
    if (!editingFieldData) return
    
    switch (editingFieldData.type) {
      case 'repaymentPeriod':
        setRepaymentPeriod(tempValue1)
        break
      case 'construction':
        setConstructionDepreciationYears(tempValue1)
        setConstructionResidualRate(tempValue2)
        break
      case 'equipment':
        setEquipmentDepreciationYears(tempValue1)
        setEquipmentResidualRate(tempValue2)
        break
      case 'intangible':
        setIntangibleAmortizationYears(tempValue1)
        setIntangibleResidualRate(tempValue2)
        break
      case 'constructionInputTaxRate':
        setConstructionInputTaxRate(tempValue1)
        break
      case 'equipmentInputTaxRate':
        setEquipmentInputTaxRate(tempValue1)
        break
    }
    
    setEditModalOpened(false)
    setEditingFieldData(null)
  }

  // 步骤映射
  const stepMap: Record<number, string> = {
    0: 'period',
    1: 'suggest',
    2: 'revenue',
    3: 'cost',
    4: 'profit',
  }

  const activeStep = Object.keys(stepMap).find(
    key => stepMap[Number(key)] === currentStep
  ) ? Number(Object.keys(stepMap).find(key => stepMap[Number(key)] === currentStep)) : 0

  // 步骤导航处理
  const handleNext = async () => {
    // 步骤1：AI推荐营收结构 - 检查是否锁定
    if (activeStep === 1 && !revenueStructureLocked) {
      notifications.show({
        title: '请锁定营收结构表',
        message: '必须先锁定营收结构表后才能进行下一步',
        color: 'orange',
      })
      return
    }

    // 步骤0：基础数据确认 - 保存还本付息计划简表数据
    if (activeStep === 0) {
      await saveLoanRepaymentScheduleData();
    }

    // 步骤2：收入建模 - 保存营业收入表数据
    if (activeStep === 2) {
      const { saveRevenueTableData } = useRevenueCostStore.getState();
      const urbanTaxRate = 0.07; // 默认城市建设维护税税率
      await saveRevenueTableData(deductibleInputTax, urbanTaxRate);
    }

    // 步骤3：成本建模 - 保存总成本费用表数据
    if (activeStep === 3) {
      const { saveCostTableData } = useRevenueCostStore.getState();
      await saveCostTableData();
    }

    if (activeStep < STEPS.length - 1) {
      setCurrentStep(stepMap[activeStep + 1] as any)
    }
  }

  // 保存还本付息计划简表数据
  const saveLoanRepaymentScheduleData = async () => {
    if (!project || !repaymentTableData || repaymentTableData.length === 0) {
      notifications.show({
        title: '⚠️ 无数据保存',
        message: '还款期数据为空，跳过还本付息计划保存',
        color: 'yellow',
      })
      return;
    }

    try {
      // 准备还本付息计划简表数据
      const loanRepaymentScheduleData = prepareLoanRepaymentScheduleData();
      
      // 添加详细调试日志
      console.log('🔍 准备保存还本付息计划数据');
      console.log('📋 项目信息:', {
        project_id: project.id,
        project_name: project.project_name,
        operation_years: project.operation_years,
        loan_interest_rate: project.loan_interest_rate
      });
      console.log('💰 投资估算数据:', {
        construction_cost: investmentEstimate?.construction_cost,
        equipment_cost: investmentEstimate?.equipment_cost,
        installation_cost: investmentEstimate?.installation_cost,
        other_cost: investmentEstimate?.other_cost,
        land_cost: investmentEstimate?.land_cost,
        loan_amount: investmentEstimate?.loan_amount,
        custom_loan_amount: investmentEstimate?.custom_loan_amount
      });
      console.log('📊 还本付息计划数据:', loanRepaymentScheduleData);
      console.log('📊 还本付息表格原始数据:', repaymentTableData);
      
      // 调用投资估算API保存
      // 重构：确保包含完整的estimate_data结构，避免覆盖
      const requestData: any = {
        project_id: project.id,
        // 传入现有数据以保持完整性
        construction_cost: Number(investmentEstimate?.construction_cost) || 0,
        equipment_cost: Number(investmentEstimate?.equipment_cost) || 0,
        installation_cost: Number(investmentEstimate?.installation_cost) || 0,
        other_cost: Number(investmentEstimate?.other_cost) || 0,
        land_cost: Number(investmentEstimate?.land_cost) || 0,
        basic_reserve_rate: 0.05,
        price_reserve_rate: 0.03,
        construction_period: Number(investmentEstimate?.construction_period) || 3,
        loan_rate: Number(project.loan_interest_rate) || 0.049,
        custom_loan_amount: investmentEstimate?.custom_loan_amount ? Number(investmentEstimate.custom_loan_amount) : undefined,
        // 添加还本付息计划简表数据
        loan_repayment_schedule_simple: loanRepaymentScheduleData,
      }

      // 🔧 关键修复：如果存在完整的estimate_data结构，必须发送给后端
      // 否则后端会使用简化字段重新计算，覆盖完整结构
      if (investmentEstimate && 
          investmentEstimate.estimate_data?.partA?.children?.length > 0 && 
          investmentEstimate.estimate_data?.partG?.合计 > 0) {
        requestData.estimate_data = investmentEstimate.estimate_data
        console.log('✅ 发送完整estimate_data结构到后端')
      } else {
        console.warn('⚠️ estimate_data结构不完整，后端将使用简化字段计算')
        console.warn('⚠️ investmentEstimate状态:', investmentEstimate ? '存在' : '为空')
      }

      console.log('🔍 发送给后端的完整数据:', JSON.stringify(requestData, null, 2));
      console.log('🔍 数据类型验证:', {
        project_id: typeof requestData.project_id,
        construction_cost: typeof requestData.construction_cost,
        equipment_cost: typeof requestData.equipment_cost,
        installation_cost: typeof requestData.installation_cost,
        other_cost: typeof requestData.other_cost,
        land_cost: typeof requestData.land_cost,
        loan_rate: typeof requestData.loan_rate,
        loan_repayment_schedule_simple: typeof requestData.loan_repayment_schedule_simple,
        loan_repayment_schedule_simple_value: requestData.loan_repayment_schedule_simple
      });

      const response = await investmentApi.save(requestData);

      if (response.success) {
        notifications.show({
          title: '✅ 保存成功',
          message: '还本付息计划简表已保存到数据库',
          color: 'green',
        })
      } else {
        notifications.show({
          title: '❌ 保存失败',
          message: response.error || '还本付息计划保存失败',
          color: 'red',
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '❌ 保存失败',
        message: error.response?.data?.error || '还本付息计划保存失败',
        color: 'red',
      })
    }
  }

  // 准备还本付息计划简表数据
  const prepareLoanRepaymentScheduleData = () => {
    if (!repaymentTableData || repaymentTableData.length === 0) {
      return null;
    }

    // 提取贷款总额和利率（从还款期数据计算）
    const loanAmount = repaymentTableData.find((row: any) => row.序号 === '2.1')?.合计 || 0;
    const totalInterest = repaymentTableData.find((row: any) => row.序号 === '2.2')?.合计 || 0;
    
    console.log('🔍 开始提取还款计划数据');
    console.log('🔍 贷款总额:', loanAmount, '总利息:', totalInterest);
    console.log('🔍 原始表格数据:', repaymentTableData.map(row => ({
      序号: row.序号,
      项目: row.项目,
      合计: row.合计,
      分年数据: row.分年数据
    })));
    
    // 从2号行（当期还本付息）提取每年的数据
    const mainRow = repaymentTableData.find((row: any) => row.序号 === '2');
    if (!mainRow || !mainRow.分年数据) {
      console.log('🔍 未找到主行数据');
      return null;
    }
    
    // 从2.1行（还本）提取每年还本数据
    const principalRow = repaymentTableData.find((row: any) => row.序号 === '2.1');
    
    // 从2.2行（付息）提取每年付息数据
    const interestRow = repaymentTableData.find((row: any) => row.序号 === '2.2');
    
    // 从1号行（期初借款余额）提取每年期初余额
    const openingRow = repaymentTableData.find((row: any) => row.序号 === '1');
    
    // 从3号行（期末借款余额）提取每年期末余额
    const closingRow = repaymentTableData.find((row: any) => row.序号 === '3');
    
    // 构建还款计划数据
    const repaymentSchedule = mainRow.分年数据
      .map((value: any, yearIndex) => {
        const year = yearIndex + 1;
        return {
          年份: year,
          期初借款余额: openingRow?.分年数据[yearIndex] || 0,
          当期还本: principalRow?.分年数据[yearIndex] || 0,
          当期付息: interestRow?.分年数据[yearIndex] || 0,
          当期还本付息: value || 0,
          期末借款余额: closingRow?.分年数据[yearIndex] || 0,
        };
      })
      .filter((item) => item.期初借款余额 > 0); // 只保留有效年份的数据
      
    console.log('🔍 提取的还款计划数据:', repaymentSchedule);

    return {
      基本信息: {
        贷款总额: loanAmount,
        年利率: project.loan_interest_rate || 0.049,
        贷款期限: repaymentPeriod,
        还款方式: 'equal-principal',
        运营期年限: project.operation_years || 0
      },
      还款计划: repaymentSchedule.map((item: any) => ({
        年份: item.年份,
        期初借款余额: item.期初借款余额,
        当期还本: item.当期还本,
        当期付息: item.当期付息,
        当期还本付息: item.当期还本付息,
        期末借款余额: item.期末借款余额,
      })),
      汇总信息: {
        贷款总额: loanAmount,
        总利息: totalInterest,
        总还本付息: loanAmount + totalInterest,
        还款年数: repaymentSchedule.length
      }
    };
  }

  // 导出还本付息计划简表为Excel
  const handleExportRepaymentPlanTable = () => {
    if (!project || !repaymentTableData || repaymentTableData.length === 0) {
      notifications.show({
        title: '导出失败',
        message: '没有可导出的还本付息计划数据',
        color: 'red',
      });
      return;
    }

    const excelData: any[] = [];
    
    // 添加表头
    const headerRow: any = { '序号': '', '项目': '', '合计': '' };
    for (let i = 0; i < repaymentPeriod; i++) {
      headerRow[`运营期${i + 1}`] = '';
    }
    excelData.push(headerRow);
    
    // 第二行表头
    const headerRow2: any = { '序号': '', '项目': '', '合计': '' };
    for (let i = 0; i < repaymentPeriod; i++) {
      headerRow2[`${i + 1}`] = i + 1;
    }
    excelData.push(headerRow2);

    // 添加数据行
    repaymentTableData.forEach((row) => {
      const dataRow: any = { '序号': row.序号, '项目': row.项目 };
      dataRow['合计'] = row.合计 !== null ? row.合计 : '';
      for (let i = 0; i < repaymentPeriod; i++) {
        dataRow[`${i + 1}`] = row.分年数据[i] !== undefined ? row.分年数据[i] : '';
      }
      excelData.push(dataRow);
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '还本付息计划简表');

    XLSX.writeFile(wb, `还本付息计划简表_${project.project_name || '项目'}.xlsx`);

    notifications.show({
      title: '导出成功',
      message: '还本付息计划简表已导出为Excel文件',
      color: 'green',
    });
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setCurrentStep(stepMap[activeStep - 1] as any)
    }
  }

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <>
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Stack gap="lg">
                <div>
                  <Group gap="sm" mb="xs" justify="space-between">
                    <Group gap="sm">
                      <IconCalendar size={24} color="#165DFF" />
                      <Text size="lg" fw={600} c="#1D2129">
                        基础数据确认
                      </Text>
                    </Group>
                    <Group gap="xs">
                      <Tooltip label="查看还本付息计划简表">
                        <ActionIcon
                          variant="light"
                          color="green"
                          size="lg"
                          onClick={() => setRepaymentPlanOpened(true)}
                          disabled={!investmentEstimate || repaymentPeriod === 0}
                        >
                          <IconCurrencyDollar size={20} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="查看折旧与摊销简表">
                        <ActionIcon 
                          variant="light" 
                          color="blue" 
                          size="lg"
                          onClick={() => setDepreciationTableOpened(true)}
                        >
                          <IconFileText size={20} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                  <Text size="sm" c="#86909C">
                    确认项目基础参数和折旧摊销相关数据，点击编辑图标可修改
                  </Text>
                </div>

                {/* 横向排列的三个表格 */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  {/* 表格1：项目基础信息 */}
                  <div style={{ flex: 1 }}>
                    <Group gap="xs" mb="md">
                      <IconFileText size={18} color="#4E5969" />
                      <Text size="sm" fw={500} c="#1D2129">项目基础信息</Text>
                    </Group>
                    <Table
                      striped
                      styles={{
                        table: { border: 'none' },
                        th: { 
                          color: '#1D2129', 
                          fontWeight: 600,
                          borderLeft: 'none',
                          borderRight: 'none',
                          borderTop: 'none'
                        },
                        td: {
                          borderLeft: 'none',
                          borderRight: 'none'
                        }
                      }}
                    >
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>参数</Table.Th>
                          <Table.Th>数值</Table.Th>
                          <Table.Th w={50}>操作</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        <Table.Tr>
                          <Table.Td>建设期</Table.Td>
                          <Table.Td>
                            <Text fw={600} c="#4E5969">{project?.construction_years || 0} 年</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="#86909C">只读</Text>
                          </Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td>运营期</Table.Td>
                          <Table.Td>
                            <Text fw={600} c="#4E5969">{project?.operation_years || 0} 年</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="#86909C">只读</Text>
                          </Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td>计算期</Table.Td>
                          <Table.Td>
                            <Text fw={600} c="#165DFF">{(project?.construction_years || 0) + (project?.operation_years || 0)} 年</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="#86909C">只读</Text>
                          </Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td>
                            <Group gap={4}>
                              <IconCalendar size={14} color="#F7BA1E" />
                              <Text size="sm">还款期</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text fw={600} c="#165DFF">{repaymentPeriod} 年</Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap={4}>
                              <Tooltip label="点击编辑">
                                <ActionIcon 
                                  variant="subtle" 
                                  color="blue" 
                                  onClick={() => openSimpleEditModal('repaymentPeriod', '还款期', repaymentPeriod, '年', 1, 50)}
                                >
                                  <IconEdit size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="恢复默认">
                                <ActionIcon 
                                  variant="subtle" 
                                  color="green" 
                                  onClick={() => setRepaymentPeriod(project?.operation_years || 0)}
                                >
                                  <IconCalendar size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      </Table.Tbody>
                    </Table>
                  </div>

                  {/* 分隔线 */}
                  <Divider orientation="vertical" style={{ height: 'auto', alignSelf: 'stretch' }} />

                  {/* 表格2：折旧摊销设置 */}
                  <div style={{ flex: 1 }}>
                    <Group gap="xs" mb="md">
                      <IconBuildingFactory size={18} color="#4E5969" />
                      <Text size="sm" fw={500} c="#1D2129">折旧摊销设置</Text>
                    </Group>
                    <Table
                      striped
                      styles={{
                        table: { border: 'none' },
                        th: { 
                          color: '#1D2129', 
                          fontWeight: 600,
                          borderLeft: 'none',
                          borderRight: 'none',
                          borderTop: 'none'
                        },
                        td: {
                          borderLeft: 'none',
                          borderRight: 'none'
                        }
                      }}
                    >
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>资产类别</Table.Th>
                          <Table.Th>年限</Table.Th>
                          <Table.Th>残值率</Table.Th>
                          <Table.Th w={50}>操作</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        <Table.Tr>
                          <Table.Td>
                            <Group gap={4}>
                              <IconBuildingFactory size={14} color="#165DFF" />
                              <Text size="sm">建安工程</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600}>{constructionDepreciationYears}年</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600} c="#00C48C">{constructionResidualRate}%</Text>
                          </Table.Td>
                          <Table.Td>
                            <Tooltip label="编辑">
                              <ActionIcon 
                                variant="subtle" 
                                color="blue" 
                                size="xs"
                                onClick={() => openEditModal(
                                  'construction', 
                                  '建安工程', 
                                  constructionDepreciationYears, 
                                  '年', 
                                  1, 
                                  100,
                                  constructionResidualRate,
                                  '%',
                                  0,
                                  100
                                )}
                              >
                                <IconEdit size={12} />
                              </ActionIcon>
                            </Tooltip>
                          </Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td>
                            <Group gap={4}>
                              <IconTool size={14} color="#165DFF" />
                              <Text size="sm">机械设备</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600}>{equipmentDepreciationYears}年</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600} c="#00C48C">{equipmentResidualRate}%</Text>
                          </Table.Td>
                          <Table.Td>
                            <Tooltip label="编辑">
                              <ActionIcon 
                                variant="subtle" 
                                color="blue" 
                                size="xs"
                                onClick={() => openEditModal(
                                  'equipment', 
                                  '机械设备', 
                                  equipmentDepreciationYears, 
                                  '年', 
                                  1, 
                                  100,
                                  equipmentResidualRate,
                                  '%',
                                  0,
                                  100
                                )}
                              >
                                <IconEdit size={12} />
                              </ActionIcon>
                            </Tooltip>
                          </Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td>
                            <Group gap={4}>
                              <IconFileText size={14} color="#165DFF" />
                              <Text size="sm">无形资产</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600}>{intangibleAmortizationYears}年</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600} c="#00C48C">{intangibleResidualRate}%</Text>
                          </Table.Td>
                          <Table.Td>
                            <Tooltip label="编辑">
                              <ActionIcon 
                                variant="subtle" 
                                color="blue" 
                                size="xs"
                                onClick={() => openEditModal(
                                  'intangible', 
                                  '无形资产', 
                                  intangibleAmortizationYears, 
                                  '年', 
                                  1, 
                                  100,
                                  intangibleResidualRate,
                                  '%',
                                  0,
                                  100
                                )}
                              >
                                <IconEdit size={12} />
                              </ActionIcon>
                            </Tooltip>
                          </Table.Td>
                        </Table.Tr>
                      </Table.Tbody>
                    </Table>
                  </div>

                  {/* 分隔线 */}
                  <Divider orientation="vertical" style={{ height: 'auto', alignSelf: 'stretch' }} />

                  {/* 表格3：原值与税率 */}
                  <div style={{ flex: 1 }}>
                    <Group gap="xs" mb="md">
                      <IconCoin size={18} color="#F7BA1E" />
                      <Text size="sm" fw={500} c="#1D2129">原值与税率</Text>
                    </Group>
                    <Table
                      striped
                      styles={{
                        table: { border: 'none' },
                        th: { 
                          color: '#1D2129', 
                          fontWeight: 600,
                          borderLeft: 'none',
                          borderRight: 'none',
                          borderTop: 'none'
                        },
                        td: {
                          borderLeft: 'none',
                          borderRight: 'none'
                        }
                      }}
                    >
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>参数</Table.Th>
                          <Table.Th>数值（万元）</Table.Th>
                          <Table.Th>税率</Table.Th>
                          <Table.Th w={50}>操作</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        <Table.Tr>
                          <Table.Td>建安费原值</Table.Td>
                          <Table.Td>
                            <Text fw={600} c="#1D2129" size="sm">{constructionOriginalValue.toFixed(2)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text fw={600} c="#165DFF" size="sm">{constructionInputTaxRate}%</Text>
                          </Table.Td>
                          <Table.Td>
                            <Tooltip label="编辑税率">
                              <ActionIcon 
                                variant="subtle" 
                                color="blue"
                                size="xs" 
                                onClick={() => openSimpleEditModal('constructionInputTaxRate', '建安费进项税率', constructionInputTaxRate, '%', 0, 100)}
                              >
                                <IconEdit size={12} />
                              </ActionIcon>
                            </Tooltip>
                          </Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td>设备原值</Table.Td>
                          <Table.Td>
                            <Text fw={600} c="#1D2129" size="sm">{equipmentOriginalValue.toFixed(2)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text fw={600} c="#165DFF" size="sm">{equipmentInputTaxRate}%</Text>
                          </Table.Td>
                          <Table.Td>
                            <Tooltip label="编辑税率">
                              <ActionIcon 
                                variant="subtle" 
                                color="blue" 
                                size="xs"
                                onClick={() => openSimpleEditModal('equipmentInputTaxRate', '机械设备进项税率', equipmentInputTaxRate, '%', 0, 100)}
                              >
                                <IconEdit size={12} />
                              </ActionIcon>
                            </Tooltip>
                          </Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td>待抵扣进项税</Table.Td>
                          <Table.Td>
                            <Text fw={600} c="#F7BA1E" size="sm">{deductibleInputTax.toFixed(2)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="#86909C">-</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="#86909C">只读</Text>
                          </Table.Td>
                        </Table.Tr>
                      </Table.Tbody>
                    </Table>
                  </div>
                </div>

                {/* 说明提示 */}
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: investmentEstimate ? '#F2F8FF' : '#FFF7E6',
                  borderRadius: '8px',
                  border: investmentEstimate ? '1px solid #B5D6FF' : '1px solid #FFD591'
                }}>
                  {investmentEstimate ? (
                    <Text size="sm" c="#165DFF">
                      ℹ️ 以上数据将用于后续的折旧摘销计算和财务评价，请仔细核对
                    </Text>
                  ) : (
                    <Text size="sm" c="#FF7D00">
                      ⚠️ 未找到投资估算数据，请先在项目详情页面完成「投资估算」后再进行收入成本预测
                    </Text>
                  )}
                </div>
              </Stack>
            </Card>

            {/* 编辑弹窗 */}
            <Modal
              opened={editModalOpened}
              onClose={() => setEditModalOpened(false)}
              title={
                <Group gap="xs">
                  <IconEdit size={20} color="#165DFF" />
                  <Text fw={600} c="#1D2129">修改参数</Text>
                </Group>
              }
              centered
              styles={{
                title: { fontWeight: 600 },
              }}
            >
              <Stack gap="md">
                {editingFieldData?.unit2 ? (
                  // 双值编辑（年限 + 残值率）
                  <>
                    <div>
                      <Text size="sm" c="#86909C" mb={8}>{editingFieldData?.label} - 折旧/摊销年限</Text>
                      <NumberInput
                        value={tempValue1}
                        onChange={(val) => setTempValue1(Number(val))}
                        min={editingFieldData?.min1}
                        max={editingFieldData?.max1}
                        decimalScale={0}
                        rightSection={<Text size="sm" c="#86909C">{editingFieldData?.unit1}</Text>}
                        styles={{
                          input: {
                            height: '40px',
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#165DFF'
                          }
                        }}
                        autoFocus
                      />
                    </div>
                    <div>
                      <Text size="sm" c="#86909C" mb={8}>{editingFieldData?.label} - 残值率</Text>
                      <NumberInput
                        value={tempValue2}
                        onChange={(val) => setTempValue2(Number(val))}
                        min={editingFieldData?.min2}
                        max={editingFieldData?.max2}
                        decimalScale={2}
                        rightSection={<Text size="sm" c="#86909C">{editingFieldData?.unit2}</Text>}
                        styles={{
                          input: {
                            height: '40px',
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#00C48C'
                          }
                        }}
                      />
                    </div>
                  </>
                ) : (
                  // 单值编辑
                  <div>
                    <Text size="sm" c="#86909C" mb={8}>{editingFieldData?.label}</Text>
                    <NumberInput
                      value={tempValue1}
                      onChange={(val) => setTempValue1(Number(val))}
                      min={editingFieldData?.min1}
                      max={editingFieldData?.max1}
                      decimalScale={editingFieldData?.unit1 === '%' ? 2 : 0}
                      rightSection={<Text size="sm" c="#86909C">{editingFieldData?.unit1}</Text>}
                      styles={{
                        input: {
                          height: '40px',
                          fontSize: '16px',
                          fontWeight: 600,
                          color: '#165DFF'
                        }
                      }}
                      autoFocus
                    />
                  </div>
                )}
                <Group justify="flex-end" gap="md">
                  <Button 
                    variant="default" 
                    onClick={() => setEditModalOpened(false)}
                    style={{ height: '36px' }}
                  >
                    取消
                  </Button>
                  <Button 
                    onClick={saveEdit}
                    style={{ 
                      height: '36px',
                      backgroundColor: '#165DFF'
                    }}
                  >
                    确定
                  </Button>
                </Group>
              </Stack>
            </Modal>

            {/* 折旧与摊销表弹窗 */}
            <Modal
              opened={depreciationTableOpened}
              onClose={() => setDepreciationTableOpened(false)}
              title={
                <Group gap="xs">
                  <IconFileText size={20} color="#165DFF" />
                  <Text fw={600} c="#1D2129">折旧与摊销估算表</Text>
                </Group>
              }
              size="1400px"
              centered
            >
              <Stack gap="md">
                {/* 计算说明 */}
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#F0F5FF',
                  borderRadius: '8px',
                  border: '1px solid #ADC6FF'
                }}>
                  <Text size="sm" c="#165DFF" fw={500} mb={4}>
                    📉 折旧摊销方法
                  </Text>
                  <Text size="xs" c="#4E5969">
                    • 折旧方法：直线法（平均年限法）<br />
                    • <strong>年折旧额 = （固定资产原值 - 预计残值）÷ 预计使用年限</strong><br />
                    • 摊销方法：直线法（平均分摊）
                  </Text>
                </div>
            
                {/* 折旧摊销表格 */}
                {depreciationData.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <Table
                      striped
                      withTableBorder
                      styles={{
                        th: {
                          backgroundColor: '#F7F8FA',
                          color: '#1D2129',
                          fontWeight: 600,
                          fontSize: '13px',
                          textAlign: 'center',
                          border: '1px solid #E5E6EB'
                        },
                        td: {
                          fontSize: '13px',
                          textAlign: 'center',
                          border: '1px solid #E5E6EB'
                        }
                      }}
                    >
                      <Table.Thead>
                        {/* 第一行表头：运营期 */}
                        <Table.Tr>
                          <Table.Th rowSpan={2} style={{ width: '60px', verticalAlign: 'middle' }}>序号</Table.Th>
                          <Table.Th rowSpan={2} style={{ width: '200px', textAlign: 'left', verticalAlign: 'middle' }}>资产类别</Table.Th>
                          <Table.Th rowSpan={2} style={{ width: '120px', verticalAlign: 'middle' }}>原值（万元）</Table.Th>
                          <Table.Th rowSpan={2} style={{ width: '140px', verticalAlign: 'middle' }}>折旧/摊销额合计（万元）</Table.Th>
                          <Table.Th colSpan={project?.operation_years || 0} style={{ borderBottom: '1px solid #E5E6EB' }}>
                            运营期
                          </Table.Th>
                        </Table.Tr>
                        {/* 第二行表头：年份 */}
                        <Table.Tr>
                          {Array.from({ length: project?.operation_years || 0 }, (_, i) => (
                            <Table.Th key={i} style={{ width: '80px' }}>
                              {i + 1}
                            </Table.Th>
                          ))}
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {depreciationData.map((row) => (
                          <Table.Tr 
                            key={row.序号}
                            style={{ 
                              backgroundColor: row.序号 === '合计' ? '#E6F7FF' : undefined,
                              fontWeight: row.序号 === '合计' ? 700 : 600
                            }}
                          >
                            <Table.Td>
                              <Text fw={600}>{row.序号}</Text>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'left' }}>
                              <Text size="sm">{row.资产类别}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Text fw={600} c="#165DFF">
                                {row.原值.toFixed(2)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text fw={600} c="#00C48C">
                                {row.年折旧摊销额.toFixed(2)}
                              </Text>
                            </Table.Td>
                            {row.分年数据.map((value, yearIdx) => (
                              <Table.Td key={yearIdx}>
                                {value > 0 ? (
                                  <Text size="xs" c="#4E5969">
                                    {value.toFixed(2)}
                                  </Text>
                                ) : (
                                  <Text size="xs" c="#C9CDD4">-</Text>
                                )}
                              </Table.Td>
                            ))}
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </div>
                ) : (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    backgroundColor: '#FFF7E6',
                    borderRadius: '8px',
                    border: '1px dashed #FFD591'
                  }}>
                    <Text size="sm" c="#FF7D00">
                      ⚠️ 请先完成投资估算，系统将自动计算折旧摊销表
                    </Text>
                  </div>
                )}
            
                {/* 净值信息标签 */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '16px',
                  padding: '8px 0',
                  borderTop: '1px solid #E5E6EB'
                }}>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <Text size="sm" fw={500} c="#1D2129">
                      固定资产净值为：
                      <Text span fw={700} c="#165DFF">
                        {(depreciationData.filter(d => ['A', 'D'].includes(d.序号)).reduce((sum, row) => {
                          // 计算固定资产净值 = 原值 - 累计折旧
                          const totalDepreciation = row.分年数据.reduce((acc, val) => acc + val, 0);
                          return sum + (row.原值 - totalDepreciation);
                        }, 0)).toFixed(2)}万元
                      </Text>
                      ，
                      无形资产净值为：
                      <Text span fw={700} c="#00C48C">
                        {(depreciationData.filter(d => d.序号 === 'E').reduce((sum, row) => {
                          // 计算无形资产净值 = 原值 - 累计摊销
                          const totalAmortization = row.分年数据.reduce((acc, val) => acc + val, 0);
                          return sum + (row.原值 - totalAmortization);
                        }, 0)).toFixed(2)}万元
                      </Text>
                      。
                      合计：
                      <Text span fw={700} c="#F7BA1E">
                        {(depreciationData.filter(d => d.序号 !== '合计').reduce((sum, row) => {
                          // 计算总净值 = 原值 - 累计折旧/摊销（排除合计行）
                          const totalAmount = row.分年数据.reduce((acc, val) => acc + val, 0);
                          return sum + (row.原值 - totalAmount);
                        }, 0)).toFixed(2)}万元
                      </Text>
                    </Text>
                  </div>
                  <Button 
                    onClick={() => setDepreciationTableOpened(false)}
                    style={{ 
                      height: '36px',
                      backgroundColor: '#165DFF'
                    }}
                  >
                    关闭
                  </Button>
                </div>
              </Stack>
            </Modal>

            {/* 还本付息计划表弹窗 */}
            <Modal
              opened={repaymentPlanOpened}
              onClose={() => setRepaymentPlanOpened(false)}
              title={
                <Group justify="space-between" w="100%">
                  <Group gap="xs">
                    <IconCurrencyDollar size={20} color="#00C48C" />
                    <Text fw={600} c="#1D2129">还本付息计划简表（等额本金还款）</Text>
                  </Group>
                  <Group gap="xs">
                    <Tooltip label="导出Excel">
                      <ActionIcon
                        variant="light"
                        color="green"
                        size={16}
                        onClick={handleExportRepaymentPlanTable}
                      >
                        <IconFileText size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              }
              size="1400px"
              centered
            >
              <Stack gap="md">
                {/* 计算公式说明 */}
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#E6F4FF',
                  borderRadius: '8px',
                  border: '1px solid #91CAFF'
                }}>
                  <Text size="sm" c="#165DFF" fw={500} mb={4}>
                    📊 计算公式
                  </Text>
                  <Text size="xs" c="#4E5969">
                    • 还款方式：等额本金（每月偏还固定本金）<br />
                    • <strong>当年利息 = (期初借款余额 - 当期还本/2) × 年利率</strong><br />
                    • 还款期：{repaymentPeriod} 年 | 年利率：{((Number(project?.loan_interest_rate) || 0.049) * 100).toFixed(2)}%
                  </Text>
                </div>

                {/* 建设期利息详情 */}
                {constructionInterestDetails && (
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#F0F5FF',
                    borderRadius: '8px',
                    border: '1px solid #ADC6FF'
                  }}>
                    <Text size="sm" c="#165DFF" fw={500} mb={8}>
                      💰 建设期利息详情
                    </Text>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '8px' }}>
                      <div>
                        <Text size="xs" c="#86909C">贷款总额</Text>
                        <Text fw={600} c="#1D2129">{Number(constructionInterestDetails.基本信息?.贷款总额 || 0).toFixed(2)}万元</Text>
                      </div>
                      <div>
                        <Text size="xs" c="#86909C">年利率</Text>
                        <Text fw={600} c="#1D2129">{(Number(constructionInterestDetails.基本信息?.年利率 || 0) * 100).toFixed(2)}%</Text>
                      </div>
                      <div>
                        <Text size="xs" c="#86909C">建设期年限</Text>
                        <Text fw={600} c="#1D2129">{constructionInterestDetails.基本信息?.建设期年限 || 0}年</Text>
                      </div>
                      <div>
                        <Text size="xs" c="#86909C">贷款期限</Text>
                        <Text fw={600} c="#1D2129">{constructionInterestDetails.基本信息?.贷款期限 || 0}年</Text>
                      </div>
                    </div>
                    
                    {/* 分年数据表格 */}
                    {constructionInterestDetails.分年数据 && constructionInterestDetails.分年数据.length > 0 && (
                      <div style={{ overflowX: 'auto', marginTop: '8px' }}>
                        <Table
                          striped
                          withTableBorder
                          styles={{
                            th: {
                              backgroundColor: '#F7F8FA',
                              color: '#1D2129',
                              fontWeight: 600,
                              fontSize: '12px',
                              textAlign: 'center',
                              border: '1px solid #E5E6EB'
                            },
                            td: {
                              fontSize: '12px',
                              textAlign: 'center',
                              border: '1px solid #E5E6EB'
                            }
                          }}
                        >
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>年份</Table.Th>
                              <Table.Th>期初借款余额</Table.Th>
                              <Table.Th>当期借款金额</Table.Th>
                              <Table.Th>当期利息</Table.Th>
                              <Table.Th>期末借款余额</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {constructionInterestDetails.分年数据.map((data: any, index: number) => (
                              <Table.Tr key={index}>
                                <Table.Td>{data.年份}</Table.Td>
                                <Table.Td>{data.期初借款余额?.toFixed(2)}</Table.Td>
                                <Table.Td>{data.当期借款金额?.toFixed(2)}</Table.Td>
                                <Table.Td>{data.当期利息?.toFixed(2)}</Table.Td>
                                <Table.Td>{data.期末借款余额?.toFixed(2)}</Table.Td>
                              </Table.Tr>
                            ))}
                            {/* 汇总行 */}
                            {constructionInterestDetails.汇总信息 && (
                              <Table.Tr style={{ backgroundColor: '#E6F7FF' }}>
                                <Table.Td fw={700}>汇总</Table.Td>
                                <Table.Td fw={700}>{constructionInterestDetails.汇总信息.总借款金额?.toFixed(2)}</Table.Td>
                                <Table.Td fw={700}>{constructionInterestDetails.汇总信息.总利息?.toFixed(2)}</Table.Td>
                                <Table.Td fw={700}>{constructionInterestDetails.汇总信息.期末借款余额?.toFixed(2)}</Table.Td>
                                <Table.Td fw={700}>-</Table.Td>
                              </Table.Tr>
                            )}
                          </Table.Tbody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}

                {/* 还本付息表格 */}
                {repaymentTableData.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <Table
                      striped
                      withTableBorder
                      styles={{
                        th: {
                          backgroundColor: '#F7F8FA',
                          color: '#1D2129',
                          fontWeight: 600,
                          fontSize: '13px',
                          textAlign: 'center',
                          border: '1px solid #E5E6EB'
                        },
                        td: {
                          fontSize: '13px',
                          textAlign: 'center',
                          border: '1px solid #E5E6EB'
                        }
                      }}
                    >
                      <Table.Thead>
                        {/* 第一行表头：运营期 */}
                        <Table.Tr>
                          <Table.Th rowSpan={2} style={{ width: '60px', verticalAlign: 'middle' }}>序号</Table.Th>
                          <Table.Th rowSpan={2} style={{ width: '180px', textAlign: 'left', verticalAlign: 'middle' }}>项目</Table.Th>
                          <Table.Th rowSpan={2} style={{ width: '120px', verticalAlign: 'middle' }}>合计</Table.Th>
                          <Table.Th colSpan={repaymentPeriod} style={{ borderBottom: '1px solid #E5E6EB' }}>
                            运营期
                          </Table.Th>
                        </Table.Tr>
                        {/* 第二行表头：年份 */}
                        <Table.Tr>
                          {Array.from({ length: repaymentPeriod }, (_, i) => (
                            <Table.Th key={i} style={{ width: '80px' }}>
                              {i + 1}
                            </Table.Th>
                          ))}
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {repaymentTableData.map((row, idx) => (
                          <Table.Tr 
                            key={idx}
                            style={{
                              backgroundColor: row.isMainRow ? '#E6F7FF' : undefined,
                              fontWeight: row.isMainRow ? 600 : undefined
                            }}
                          >
                            <Table.Td>
                              {row.序号.includes('.') ? (
                                <Text size="xs" c="#86909C" ml="md">{row.序号}</Text>
                              ) : (
                                <Text fw={600}>{row.序号}</Text>
                              )}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'left' }}>
                              {row.序号.includes('.') ? (
                                <Text size="sm" c="#4E5969" ml="md">{row.项目}</Text>
                              ) : (
                                <Text fw={row.isMainRow ? 600 : 500}>{row.项目}</Text>
                              )}
                            </Table.Td>
                            <Table.Td>
                              {row.合计 !== null ? (
                                <Text 
                                  fw={row.isMainRow ? 700 : 600} 
                                  c={row.isMainRow ? '#00C48C' : '#165DFF'}
                                >
                                  {row.合计.toFixed(2)}
                                </Text>
                              ) : (
                                <Text size="xs" c="#86909C">-</Text>
                              )}
                            </Table.Td>
                            {/* 只显示还款期的列 */}
                            {row.分年数据.slice(0, repaymentPeriod).map((value, yearIdx) => (
                              <Table.Td key={yearIdx}>
                                {value > 0 ? (
                                  <Text size="xs" c={row.isMainRow ? '#00C48C' : '#4E5969'}>
                                    {value.toFixed(2)}
                                  </Text>
                                ) : (
                                  <Text size="xs" c="#C9CDD4">0.00</Text>
                                )}
                              </Table.Td>
                            ))}
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </div>
                ) : (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    backgroundColor: '#FFF7E6',
                    borderRadius: '8px',
                    border: '1px dashed #FFD591'
                  }}>
                    <Text size="sm" c="#FF7D00">
                      ⚠️ 请先设置还款期，系统将自动计算还本付息计划表
                    </Text>
                  </div>
                )}

                {/* 关闭按钮 */}
                <Group justify="flex-end">
                  <Button 
                    onClick={() => setRepaymentPlanOpened(false)}
                    style={{ 
                      height: '36px',
                      backgroundColor: '#00C48C'
                    }}
                  >
                    关闭
                  </Button>
                </Group>
              </Stack>
            </Modal>
          </>
        )

      case 1:
        return <AIRevenueStructure />

      case 2:
        return (
          <Stack gap="md">
            <DynamicRevenueTable deductibleInputTax={deductibleInputTax} />
          </Stack>
        )

      case 3:
        return <DynamicCostTable 
          repaymentTableData={repaymentTableData}
          depreciationData={depreciationData}
        />

      case 4:
        return (
          <FinancialIndicatorsTable
            repaymentTableData={repaymentTableData}
            depreciationData={depreciationData}
            investmentEstimate={investmentEstimate}
          />
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <Container size="xl" style={{ position: 'relative', minHeight: '100vh' }}>
        <LoadingOverlay visible={true} />
      </Container>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F7FA' }}>
      {/* Header */}
      <Header
        title="收入及成本预测"
        subtitle="Revenue & Cost Modeling"
        icon="📊"
        showBackButton={true}
        backTo={`/investment/${id}`}
      />

      {/* Main Content */}
      <Container size="xl" py="lg" px="lg" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <Stack gap="xl">
          {/* 项目信息卡片 */}
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB' }}>
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="#86909C" mb={4}>项目名称</Text>
                <Text size="md" fw={600} c="#1D2129">{project?.project_name}</Text>
              </div>
              <Group gap="xl">
                <div>
                  <Text size="xs" c="#86909C" mb={4}>项目总资金</Text>
                  <Text size="md" fw={600} c="#165DFF">
                    {(Number(investmentEstimate?.estimate_data?.partG?.合计) || Number(investmentEstimate?.final_total) || Number(project?.total_investment) || 0).toFixed(2)} 万元
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="#86909C" mb={4}>建设期</Text>
                  <Text size="md" fw={600} c="#1D2129">
                    {project?.construction_years} 年
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="#86909C" mb={4}>运营期</Text>
                  <Text size="md" fw={600} c="#1D2129">
                    {project?.operation_years} 年
                  </Text>
                </div>
              </Group>
            </Group>
          </Card>

          {/* 步骤指示器 */}
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB' }}>
            <Stepper 
              active={activeStep}
              color="#165DFF"
              size="sm"
            >
              {STEPS.map((step, index) => (
                <Stepper.Step key={index} label={step.label} />
              ))}
            </Stepper>
          </Card>

          {/* 步骤内容 */}
          {renderStepContent()}

          {/* 导航按钮 */}
          <Group justify="space-between">
            {activeStep > 0 && (
              <Button
                variant="default"
                onClick={handleBack}
                style={{ height: '40px', padding: '0 24px' }}
              >
                上一步
              </Button>
            )}
            {activeStep === 0 && <div />}
            <Group gap="md">
              {activeStep === STEPS.length - 1 ? (
                <Button
                  style={{ 
                    height: '40px', 
                    padding: '0 24px',
                    backgroundColor: '#00C48C',
                    color: '#FFFFFF'
                  }}
                  onClick={() => {
                    navigate(`/report/${id}`)
                  }}
                >
                  完成并保存
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  style={{ 
                    height: '40px', 
                    padding: '0 24px',
                    backgroundColor: '#165DFF',
                    color: '#FFFFFF'
                  }}
                >
                  下一步
                </Button>
              )}
            </Group>
          </Group>
        </Stack>
      </Container>
    </div>
  )
}

export default RevenueCostModeling
