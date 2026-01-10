import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import * as XLSX from 'xlsx-js-style'
import { projectApi, investmentApi, llmConfigApi, dataCache } from '@/lib/api'
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Card,
  Group,
  Stack,
  Table,
  NumberInput,
  Modal,
  TextInput,
  Textarea,
  ActionIcon,
  Tooltip,
  Select,
  Switch,
} from '@mantine/core'
import { IconEdit, IconChartBar, IconCurrencyDollar } from '@tabler/icons-react'
import { Trash, Check, X, Wand2, RotateCcw, Bot, Clipboard, Pencil, MapPin, DollarSign, ZoomIn, RotateCw, FileSpreadsheet, Info, Receipt } from 'lucide-react'
import { notifications } from '@mantine/notifications'

import LoadingOverlay from '@/components/LoadingOverlay'
import ConstructionInterestModal from '@/components/revenue-cost/ConstructionInterestModal'
import LoanRepaymentScheduleTable from '@/components/revenue-cost/LoanRepaymentScheduleTable'
import { Header } from '@/components/common/Header'
import { useRevenueCostStore } from '@/stores/revenueCostStore'
import { setProjectUpdateTime } from '@/lib/projectUpdateTime'

// 投资估算数据结构
interface InvestmentItem {
  id: string
  序号: string
  工程或费用名称: string
  建设工程费?: number
  设备购置费?: number
  安装工程费?: number
  其它费用?: number
  合计: number
  占总投资比例?: number
  备注?: string
  children?: InvestmentItem[]
  [key: string]: any  // 索引签名，允许动态字段访问
}

interface InvestmentEstimate {
  projectId: string
  projectName: string
  targetInvestment: number
  constructionYears: number
  operationYears: number
  loanRatio: number
  loanInterestRate: number
  landCost: number
  
  // A-G部分
  partA: InvestmentItem
  partB: InvestmentItem
  partC: InvestmentItem
  partD: InvestmentItem
  partE: InvestmentItem
  partF: {
    贷款总额: number
    年利率: number
    建设期年限: number
    分年利息: Array<{
      年份: number
      期初本金累计: number
      当期借款金额: number
      当期利息: number
    }>
    合计: number
    占总投资比例: number
  }
  partG: InvestmentItem
  
  // 迭代信息
  iterationCount: number
  gapRate: number
  
  // 额外数据字段
  construction_interest_details?: any
  loan_repayment_schedule_simple?: any
  loan_repayment_schedule_detailed?: any
}

// 将简化的estimate_data转换为完整的表格数据结构
const buildFullEstimateStructure = (estimateData: any, projectData: any): InvestmentEstimate => {
  const constructionCost = estimateData.constructionCost || 0
  const equipmentCost = estimateData.equipmentCost || 0
  const installationCost = estimateData.installationCost || 0
  const otherCost = estimateData.otherCost || 0
  const landCost = estimateData.landCost || 0
  const basicReserve = estimateData.basicReserve || 0
  const priceReserve = estimateData.priceReserve || 0
  const buildingInvestment = estimateData.buildingInvestment || 0
  const constructionInterest = estimateData.constructionInterest || 0
  const totalInvestment = estimateData.totalInvestment || 0
  
  // A部分：从estimate_response中获取children数据
  const partA: InvestmentItem = {
    id: 'partA',
    序号: '一',
    工程或费用名称: '第一部分 工程费用',
    建设工程费: constructionCost,
    设备购置费: equipmentCost,
    安装工程费: installationCost,
    其它费用: 0,
    合计: buildingInvestment,
    占总投资比例: totalInvestment > 0 ? buildingInvestment / totalInvestment : 0,
    备注: '',
    children: estimateData.partA?.children || []
  }
  
  // B部分：其它费用（包含土地费用、基本预备费、价差预备费）
  const partB: InvestmentItem = {
    id: 'partB',
    序号: '二',
    工程或费用名称: '第二部分 其它费用',
    建设工程费: 0,
    设备购置费: 0,
    安装工程费: 0,
    其它费用: otherCost + landCost + basicReserve + priceReserve,
    合计: otherCost + landCost + basicReserve + priceReserve,
    占总投资比例: totalInvestment > 0 ? (otherCost + landCost + basicReserve + priceReserve) / totalInvestment : 0,
    备注: '',
    children: [
      { id: 'B1', 序号: '1', 工程或费用名称: '土地费用', 建设工程费: 0, 设备购置费: 0, 安装工程费: 0, 其它费用: landCost, 合计: landCost, 备注: '' },
      { id: 'B2', 序号: '2', 工程或费用名称: '基本预备费', 建设工程费: 0, 设备购置费: 0, 安装工程费: 0, 其它费用: basicReserve, 合计: basicReserve, 备注: '' },
      { id: 'B3', 序号: '3', 工程或费用名称: '价差预备费', 建设工程费: 0, 设备购置费: 0, 安装工程费: 0, 其它费用: priceReserve, 合计: priceReserve, 备注: '' },
      { id: 'B4', 序号: '4', 工程或费用名称: '其它费用', 建设工程费: 0, 设备购置费: 0, 安装工程费: 0, 其它费用: otherCost, 合计: otherCost, 备注: '' }
    ]
  }
  
  // C部分：一+二
  const partC: InvestmentItem = {
    id: 'partC',
    序号: '三',
    工程或费用名称: '第一、二部分合计',
    建设工程费: constructionCost,
    设备购置费: equipmentCost,
    安装工程费: installationCost,
    其它费用: otherCost + landCost + basicReserve + priceReserve,
    合计: buildingInvestment + otherCost + landCost + basicReserve + priceReserve,
    占总投资比例: totalInvestment > 0 ? (buildingInvestment + otherCost + landCost + basicReserve + priceReserve) / totalInvestment : 0,
    备注: ''
  }
  
  // D部分：建设期利息
  const partD: InvestmentItem = {
    id: 'partD',
    序号: '四',
    工程或费用名称: '建设期利息',
    建设工程费: 0,
    设备购置费: 0,
    安装工程费: 0,
    其它费用: 0,
    合计: constructionInterest,
    占总投资比例: totalInvestment > 0 ? constructionInterest / totalInvestment : 0,
    备注: ''
  }
  
  // E部分：三+四 = 项目总投资
  const partE: InvestmentItem = {
    id: 'partE',
    序号: '五',
    工程或费用名称: '项目总资金',
    建设工程费: 0,
    设备购置费: 0,
    安装工程费: 0,
    其它费用: 0,
    合计: totalInvestment - constructionInterest,
    占总投资比例: totalInvestment > 0 ? (totalInvestment - constructionInterest) / totalInvestment : 0,
    备注: '不含建设期利息'
  }
  
  // F部分：建设期利息详细信息
  const partF = {
    贷款总额: estimateData.loanAmount || 0,
    年利率: projectData?.loan_interest_rate || 0.049,
    建设期年限: projectData?.construction_years || 3,
    贷款期限: projectData?.operation_years || 17, // 添加贷款期限字段，默认运营期年限
    分年利息: estimateData.construction_interest_details?.分年数据 || [],
    合计: constructionInterest,
    占总投资比例: totalInvestment > 0 ? constructionInterest / totalInvestment : 0
  }
  
  // G部分：总投资
  const partG: InvestmentItem = {
    id: 'partG',
    序号: '六',
    工程或费用名称: '总投资',
    建设工程费: 0,
    设备购置费: 0,
    安装工程费: 0,
    其它费用: 0,
    合计: totalInvestment,
    占总投资比例: 1,
    备注: ''
  }
  
  return {
    projectId: projectData?.id || '',
    projectName: projectData?.project_name || '',
    targetInvestment: projectData?.total_investment || 0,
    constructionYears: projectData?.construction_years || 3,
    operationYears: projectData?.operation_years || 17,
    loanRatio: projectData?.loan_ratio || 0,
    loanInterestRate: projectData?.loan_interest_rate || 0.049,
    landCost: landCost,
    partA,
    partB,
    partC,
    partD,
    partE,
    partF,
    partG,
    iterationCount: estimateData.iterationCount || 8,
    gapRate: estimateData.gapRate || 0,
    // 保留建设期利息详情和还本付息计划数据
    construction_interest_details: estimateData.construction_interest_details,
    loan_repayment_schedule_simple: estimateData.loan_repayment_schedule_simple,
    loan_repayment_schedule_detailed: estimateData.loan_repayment_schedule_detailed
  }
}

const InvestmentSummary: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = (location.state as { autoGenerate?: boolean } | null) || null
  const autoGenerateRequested = Boolean(locationState?.autoGenerate)
  const [autoGenerateHandled, setAutoGenerateHandled] = useState(false)
  // 禁用响应式布局，使用固定尺寸
  
  // 请求取消控制器
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // 标记用户是否手动切换过项目类型（用于区分默认值和用户选择）
  const userHasManuallySwitched = useRef(false)
  
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [analyzingAI, setAnalyzingAI] = useState(false)
  const [project, setProject] = useState<any>(null)
  const [estimate, setEstimate] = useState<InvestmentEstimate | null>(null)
  const [aiItems, setAiItems] = useState<any[]>([])
  const [showAIPreview, setShowAIPreview] = useState(false)
  const [editingItem, setEditingItem] = useState<number | null>(null)
  const [tempEditItem, setTempEditItem] = useState<any>(null)
  const [showEditSubItems, setShowEditSubItems] = useState(false)
  const [editingSubItems, setEditingSubItems] = useState<InvestmentItem[]>([])
  const [originalSubItems, setOriginalSubItems] = useState<InvestmentItem[]>([])
  const [showEditSingleItem, setShowEditSingleItem] = useState(false)
  const [editingSingleItemIndex, setEditingSingleItemIndex] = useState<number | null>(null)
  const [singleItemTemp, setSingleItemTemp] = useState<InvestmentItem | null>(null)
  const [adjustmentPercentage, setAdjustmentPercentage] = useState(0)
  const [showEditLandCost, setShowEditLandCost] = useState(false)
  const [editingLandCost, setEditingLandCost] = useState<{amount: number, remark: string}>({amount: 0, remark: ''})
  const [showEditLoan, setShowEditLoan] = useState(false)
  const [editingLoan, setEditingLoan] = useState<{
    mode: 'amount' | 'ratio',
    amount: number,
    ratio: number,
    roundingMode: 'none' | 'million' | 'tenMillion'
  }>({mode: 'amount', amount: 0, ratio: 0, roundingMode: 'tenMillion'})
  const [showSubdivideModal, setShowSubdivideModal] = useState(false)
  const [subdividingItemIndex, setSubdividingItemIndex] = useState<number | null>(null)
  const [analyzingSubItem, setAnalyzingSubItem] = useState(false)
  const [showAddSubItemModal, setShowAddSubItemModal] = useState(false)
  const [newSubItemTemp, setNewSubItemTemp] = useState<InvestmentItem | null>(null)
  // 三级子项数据: key为二级子项索引, value为三级子项数组
  const [thirdLevelItems, setThirdLevelItems] = useState<Record<number, any[]>>({})
  const [editingThirdLevelItem, setEditingThirdLevelItem] = useState<{parentIndex: number, itemIndex: number} | null>(null)
  const [thirdLevelItemTemp, setThirdLevelItemTemp] = useState<any>(null)
  const [showConstructionInterestModal, setShowConstructionInterestModal] = useState(false)

  
  // 项目类型：控制市政公用设施费是否计算（默认农业项目，免市政费）
  const [projectType, setProjectType] = useState<'agriculture' | 'construction'>('agriculture')
  
  // 项目类型变更时重新计算投资估算
  const handleProjectTypeChange = async (newType: 'agriculture' | 'construction') => {
    // 标记用户已手动切换过项目类型
    userHasManuallySwitched.current = true
    setProjectType(newType)
    
    // 立即保存项目类型到数据库（无论是否有估算数据）
    try {
      const saveData = {
        project_id: id!,
        estimate_data: {
          projectType: newType
        }
      }
      await investmentApi.save(saveData)
      console.log(`[handleProjectTypeChange] 已保存项目类型到数据库: ${newType}`)
    } catch (error) {
      console.error('保存项目类型失败:', error)
    }
    
    // 如果有估算数据，则重新计算
    if (estimate) {
      setGenerating(true)
      try {
        const tableItems = extractCurrentTableItems()
        const response = await investmentApi.generateSummary(id!, tableItems, undefined, undefined, newType)
        
        if (response.success && response.data) {
          const newEstimate = response.data.summary
          setEstimate(newEstimate)
          
          // 保存到数据库（包含新的projectType和三级子项数据）
          const estimateWithThirdLevel = {
            ...newEstimate,
            thirdLevelItems: thirdLevelItems,
            projectType: newType
          }
          await saveEstimateToDatabase(estimateWithThirdLevel)
          
          notifications.show({
            title: '✨ 重新计算完成',
            message: `已切换为${newType === 'agriculture' ? '农业' : '建筑'}项目类型，市政公用设施费已${newType === 'agriculture' ? '免除' : '按1.5%计算'}`,
            color: 'green',
            autoClose: 4000,
          })
        }
      } catch (error: any) {
        console.error('切换项目类型失败:', error)
      } finally {
        setGenerating(false)
      }
    }
  }

  const columnStyles = {
    sequence: { width: '35px', textAlign: 'center' as const },
    name: { width: '210px' },
    construction: { width: '80px', textAlign: 'center' as const },
    equipment: { width: '80px', textAlign: 'center' as const },
    installation: { width: '80px', textAlign: 'center' as const },
    other: { width: '70px', textAlign: 'center' as const },
    total: { width: '80px', textAlign: 'center' as const },
    unit: { width: '40px', textAlign: 'center' as const },
    quantity: { width: '65px', textAlign: 'center' as const },
    unitPrice: { width: '75px', textAlign: 'center' as const },
    ratio: { width: '65px', textAlign: 'center' as const },
    remark: { width: '250px' }
  }

  // 预处理表格计算数据（将计算逻辑前置，避免JSX中直接计算）
  const processedTableData = React.useMemo(() => {
    if (!estimate) return null
    
    const partATotal = {
      construction: estimate.partA.children?.reduce((sum, item) => sum + (item.建设工程费 || 0), 0) || 0,
      equipment: estimate.partA.children?.reduce((sum, item) => sum + (item.设备购置费 || 0), 0) || 0,
      installation: estimate.partA.children?.reduce((sum, item) => sum + (item.安装工程费 || 0), 0) || 0,
      other: estimate.partA.children?.reduce((sum, item) => sum + (item.其它费用 || 0), 0) || 0,
    }
    
    // 内联计算B部分合计
    const partBTotal = estimate.partB.children?.reduce((sum, item) => {
      const otherCost = item.其它费用 ?? item.合计 ?? 0
      return sum + otherCost
    }, 0) || 0
    
    const partCTotalOther = partATotal.other + partBTotal
    
    return {
      partATotal,
      partBTotal,
      partCTotalOther,
      partGTotal: estimate.partG?.合计 || 0
    }
  }, [estimate])
  
  // 处理三级子项计算
  const processThirdLevelItems = React.useMemo(() => {
    if (!estimate?.partA?.children) return {}
    
    const result: Record<number, any[]> = {}
    Object.keys(thirdLevelItems).forEach(key => {
      const parentIndex = parseInt(key)
      const thirdItems = thirdLevelItems[parentIndex]
      if (thirdItems && thirdItems.length > 0) {
        result[parentIndex] = thirdItems.map(subItem => {
          const totalPrice = (subItem.quantity * subItem.unit_price) / 10000
          return {
            ...subItem,
            totalPrice,
            constructionCost: totalPrice * subItem.construction_ratio,
            equipmentCost: totalPrice * subItem.equipment_ratio,
            installationCost: totalPrice * subItem.installation_ratio,
            otherCost: totalPrice * subItem.other_ratio
          }
        })
      }
    })
    return result
  }, [estimate?.partA?.children, thirdLevelItems])

  // 格式化数量显示：整数型单位显示整数，其他显示2位小数
  const formatQuantity = (quantity: number, unit: string): string => {
    if (!quantity && quantity !== 0) return ''
    const integerUnits = ['条', '项', '个', '台', '套', '辆', '处', '座', '栗', '间']
    if (integerUnits.includes(unit)) {
      return Math.round(quantity).toString()
    }
    return quantity.toFixed(2)
  }

  // 重算三级子项，使其与当前二级子项金额匹配
  const recalculateThirdLevelItems = (savedThirdLevelItems: Record<number, any[]>): Record<number, any[]> => {
    if (!estimate?.partA?.children || estimate.partA.children.length === 0) {
      return savedThirdLevelItems
    }

    const recalculated: Record<number, any[]> = {}
    const partAChildren = estimate.partA.children

    Object.keys(savedThirdLevelItems).forEach(key => {
      const parentIndex = parseInt(key)
      const thirdItems = savedThirdLevelItems[parentIndex]
      
      // 安全检查：确保索引在有效范围内
      if (parentIndex < 0 || parentIndex >= partAChildren.length) {
        console.warn(`跳过索引 ${parentIndex}: 超出二级子项数组范围 (0-${partAChildren.length - 1})`)
        recalculated[parentIndex] = thirdItems
        return
      }
      
      const currentSecondItem = partAChildren[parentIndex]

      if (!thirdItems || thirdItems.length === 0) {
        recalculated[parentIndex] = thirdItems
        return
      }

      if (!currentSecondItem) {
        console.warn(`跳过索引 ${parentIndex}: 对应的二级子项不存在`)
        recalculated[parentIndex] = thirdItems
        return
      }

      // 安全检查：确保二级子项有合计属性
      if (typeof currentSecondItem.合计 !== 'number') {
        console.warn(`跳过索引 ${parentIndex}: 二级子项缺少有效的合计属性`)
        recalculated[parentIndex] = thirdItems
        return
      }

      // 计算保存的三级子项的原始总额
      let savedTotal = 0
      thirdItems.forEach((subItem: any) => {
        savedTotal += (subItem.quantity * subItem.unit_price) / 10000
      })

      if (savedTotal === 0) {
        recalculated[parentIndex] = thirdItems
        return
      }

      // 获取当前二级子项的总额
      const currentTotal = currentSecondItem.合计 || 0

      // 计算调整比例
      const ratio = currentTotal / savedTotal

      console.log(`重算三级子项[${parentIndex}]: 保存总额=${savedTotal.toFixed(2)}, 当前总额=${currentTotal.toFixed(2)}, 比例=${ratio.toFixed(4)}`)

      // 按比例调整每个三级子项的单价
      const adjustedThirdItems = thirdItems.map((subItem: any) => {
        return {
          ...subItem,
          unit_price: subItem.unit_price * ratio
        }
      })

      recalculated[parentIndex] = adjustedThirdItems
    })

    return recalculated
  }

  const calculatePartBOtherTotal = () => {
    if (!estimate?.partB?.children) {
      return 0
    }
    return estimate.partB.children.reduce((sum, item) => {
      const otherCost = item.其它费用 ?? item.合计 ?? 0
      return sum + otherCost
    }, 0)
  }
  
  const extractCurrentTableItems = () => {

    if (!estimate?.partA?.children || estimate.partA.children.length === 0) {
      return undefined
    }

    return estimate.partA.children.map((item) => ({
      name: item.工程或费用名称,
      construction_cost: item.建设工程费 || 0,
      equipment_cost: item.设备购置费 || 0,
      installation_cost: item.安装工程费 || 0,
      other_cost: item.其它费用 || 0,
      remark: item.备注 || ''
    }))
  }
  
  const generateEstimate = async (silent = false, projectData?: any) => {
    const currentProject = projectData || project
    if (!currentProject) return

    setGenerating(true)
    try {
      // 先从数据库加载已保存的三级子项数据
      let savedThirdLevelItems: Record<number, any[]> = {}
      try {
        const estimateResponse = await investmentApi.getByProjectId(id!)
        if (estimateResponse.success && estimateResponse.data?.estimate) {
          const estimateData = estimateResponse.data.estimate.estimate_data
          savedThirdLevelItems = estimateData.thirdLevelItems || {}
        }
      } catch (e) {
        savedThirdLevelItems = thirdLevelItems
      }
      
      const tableItems = extractCurrentTableItems()

      // 生成投资估算（传递当前项目类型，确保市政公用设施费正确计算）
      const response = await investmentApi.generateSummary(id!, tableItems, undefined, undefined, projectType)
      
      if (response.success && response.data) {
        // 使用summary作为详细数据
        const estimateData = response.data.summary
        // 强制在下一个事件循环中更新状态，确保渲染
        setTimeout(() => setEstimate(estimateData), 0)
        
        // 等待estimate更新后重算三级子项
        setTimeout(() => {
          if (Object.keys(savedThirdLevelItems).length > 0) {
            const recalculatedItems = recalculateThirdLevelItems(savedThirdLevelItems)
            setThirdLevelItems(recalculatedItems)
            console.log('重新生成后已重算三级子项:', recalculatedItems)
            
            // 保存到数据库（包含重算后的三级子项数据，同时保存当前项目类型）
            const estimateWithThirdLevel = {
              ...estimateData,
              thirdLevelItems: recalculatedItems,
              projectType: projectType
            }
            saveEstimateToDatabase(estimateWithThirdLevel)
          } else {
            // 没有三级子项，直接保存（包含当前项目类型）
            saveEstimateToDatabase({ ...estimateData, projectType: projectType })
          }
        }, 50)
        
        if (!silent) {
          notifications.show({
            title: '✨ 生成成功',
            message: `投资估算已生成，迭代${response.data.summary.iterationCount}次，差距率${response.data.summary.gapRate?.toFixed(2) || 'N/A'}%`,
            color: 'green',
            autoClose: 4000,
          })
        }
      } else {
        const errorMsg = response.error || '生成投资估算失败'
        notifications.show({
          title: '❌ 生成失败',
          message: errorMsg,
          color: 'red',
          autoClose: 6000,
        })
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || '生成投资估算失败'
      console.error('生成投资估算失败:', error)
      
      notifications.show({
        title: '❌ 生成失败',
        message: errorMsg,
        color: 'red',
        autoClose: 6000,
      })
    } finally {
      setGenerating(false)
    }
  }

  // 重新生成投资估算（静默模式，不显示通知）- 刷新时保留三级子项
  const handleRegenerate = async () => {
    if (!project) return
    
    // 确定使用的项目类型：
    // 1. 如果当前状态不是默认值（用户已手动切换过），直接使用当前状态
    // 2. 如果当前状态是默认值，尝试从数据库加载之前保存的类型
    // 3. 数据库也没有保存的，使用默认值
    let effectiveProjectType = projectType
    
    // 如果当前使用的是默认值且用户从未手动切换过，才尝试从数据库加载之前保存的类型
    if (projectType === 'agriculture' && !userHasManuallySwitched.current) {
      try {
        const estimateResponse = await investmentApi.getByProjectId(id!)
        if (estimateResponse.success && estimateResponse.data?.estimate) {
          const estimateData = estimateResponse.data.estimate.estimate_data
          if (estimateData?.projectType) {
            effectiveProjectType = estimateData.projectType
            setProjectType(effectiveProjectType)
            console.log(`[handleRegenerate] 从数据库加载项目类型: ${effectiveProjectType}`)
          }
        }
      } catch (error) {
        console.error('加载项目类型失败:', error)
      }
    }
    
    // 使用有效的项目类型重新生成
    setGenerating(true)
    
    try {
      const tableItems = extractCurrentTableItems()
      const response = await investmentApi.generateSummary(id!, tableItems, undefined, undefined, effectiveProjectType)
      
      if (response.success && response.data) {
        const newEstimateData = response.data.summary
        setEstimate(newEstimateData)
        
        // 等待estimate更新后重算三级子项
        setTimeout(() => {
          // 重新加载三级子项数据
          const loadThirdLevelItems = async () => {
            try {
              const estimateResponse = await investmentApi.getByProjectId(id!)
              if (estimateResponse.success && estimateResponse.data?.estimate) {
                const savedThirdLevelItems = estimateResponse.data.estimate.estimate_data?.thirdLevelItems || {}
                if (Object.keys(savedThirdLevelItems).length > 0) {
                  const recalculatedItems = recalculateThirdLevelItems(savedThirdLevelItems)
                  setThirdLevelItems(recalculatedItems)
                  console.log('刷新后已重算三级子项:', recalculatedItems)
                  
                  // 保留重算后的三级子项数据，同时保存当前的项目类型
                  const estimateWithThirdLevel = {
                    ...newEstimateData,
                    thirdLevelItems: recalculatedItems,
                    projectType: effectiveProjectType
                  }
                  saveEstimateToDatabase(estimateWithThirdLevel)
                } else {
                  // 没有三级子项，直接保存
                  saveEstimateToDatabase({ ...newEstimateData, projectType: effectiveProjectType })
                }
              } else {
                // 没有保存的数据，直接保存当前数据
                saveEstimateToDatabase({ ...newEstimateData, projectType: effectiveProjectType })
              }
            } catch (e) {
              console.error('加载三级子项失败:', e)
              // 出错时直接保存当前数据
              saveEstimateToDatabase({ ...newEstimateData, projectType: effectiveProjectType })
            }
          }
          loadThirdLevelItems()
        }, 50)
        
        notifications.show({
          title: '✨ 刷新成功',
          message: `投资估算已刷新，迭代${response.data.summary.iterationCount}次`,
          color: 'green',
          autoClose: 3000,
        })
      }
    } catch (error: any) {
      console.error('刷新失败:', error)
      notifications.show({
        title: '❌ 刷新失败',
        message: error.response?.data?.error || '请稍后重试',
        color: 'red',
        autoClose: 5000,
      })
    } finally {
      setGenerating(false)
    }
  }

  // 生成投资估算并保留指定的三级子项数据（用于加载页面时保留已有三级子项）
  const generateEstimateWithThirdLevel = async (existingThirdLevelItems: Record<number, any[]>, silent = false) => {
    if (!project) return

    setGenerating(true)
    try {
      const tableItems = extractCurrentTableItems()

      // 生成投资估算（传递当前项目类型，确保市政公用设施费正确计算）
      const response = await investmentApi.generateSummary(id!, tableItems, undefined, undefined, projectType)
      
      if (response.success && response.data) {
        const estimateData = response.data.summary
        setEstimate(estimateData)
        
        // 使用传入的三级子项数据（而不是依赖React状态），同时保存当前项目类型
        const estimateWithThirdLevel = {
          ...estimateData,
          thirdLevelItems: existingThirdLevelItems,
          projectType: projectType
        }
        await saveEstimateToDatabase(estimateWithThirdLevel)
        
        if (!silent) {
          notifications.show({
            title: '✨ 生成成功',
            message: `投资估算已生成，迭代${response.data.summary.iterationCount}次，差距率${response.data.summary.gapRate?.toFixed(2) || 'N/A'}%`,
            color: 'green',
            autoClose: 4000,
          })
        }
      } else {
        const errorMsg = response.error || '生成投资估算失败'
        notifications.show({
          title: '❌ 生成失败',
          message: errorMsg,
          color: 'red',
          autoClose: 6000,
        })
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || '生成投资估算失败'
      console.error('生成投资估算失败:', error)
      
      notifications.show({
        title: '❌ 生成失败',
        message: errorMsg,
        color: 'red',
        autoClose: 6000,
      })
    } finally {
      setGenerating(false)
    }
  }

  // 导出Excel
  const exportToExcel = () => {
    if (!estimate || !project) {
      notifications.show({
        title: '⚠️ 无法导出',
        message: '没有可导出的数据',
        color: 'orange',
        autoClose: 3000,
      })
      return
    }

    try {
      // 创建工作簿
      const wb = XLSX.utils.book_new()
      
      // 准备数据
      const data: any[][] = []
      
      // 标题行
      data.push([`${project.project_name} - 投资估算简表`])
      data.push([]) // 空行
      
      // 表头
      data.push(['序号', '工程或费用名称', '建设工程费（万元）', '设备购置费（万元）', '安装工程费（万元）', '其它费用（万元）', '合计（万元）', '单位', '数量', '单位价值（元）', '占总投资比例', '备注'])
      
      const totalInvestment = estimate.partG?.合计 || 0
      
      // A部分
      const aConstructionTotal = estimate.partA.children?.reduce((sum, item) => sum + (item.建设工程费 || 0), 0) || 0
      const aEquipTotal = estimate.partA.children?.reduce((sum, item) => sum + (item.设备购置费 || 0), 0) || 0
      const aInstallTotal = estimate.partA.children?.reduce((sum, item) => sum + (item.安装工程费 || 0), 0) || 0
      const aOtherTotal = estimate.partA.children?.reduce((sum, item) => sum + (item.其它费用 || 0), 0) || 0
      data.push([
        estimate.partA.序号,
        estimate.partA.工程或费用名称,
        aConstructionTotal,
        aEquipTotal,
        aInstallTotal,
        aOtherTotal,
        estimate.partA.合计,
        '',
        '',
        '',
        totalInvestment > 0 ? `${(((estimate.partA.合计 || 0) / totalInvestment) * 100).toFixed(2)}%` : '',
        estimate.partA.备注 || ''
      ])
      // A部分子项
      estimate.partA.children?.forEach((item, parentIndex) => {
        const itemSerial = item.序号
        data.push([
          itemSerial,
          item.工程或费用名称,
          item.建设工程费 || 0,
          item.设备购置费 || 0,
          item.安装工程费 || 0,
          item.其它费用 || 0,
          item.合计,
          '—',
          '—',
          '—',
          totalInvestment > 0 ? `${(((item.合计 || 0) / totalInvestment) * 100).toFixed(2)}%` : '',
          item.备注 || ''
        ])
        
        // 添加三级子项（如果有）
        const thirdItems = thirdLevelItems[parentIndex]
        if (thirdItems && thirdItems.length > 0) {
          thirdItems.forEach((subItem: any, subIndex: number) => {
            const totalPrice = (subItem.quantity * subItem.unit_price) / 10000
            const constructionCost = totalPrice * subItem.construction_ratio
            const equipmentCost = totalPrice * subItem.equipment_ratio
            const installationCost = totalPrice * subItem.installation_ratio
            const otherCost = totalPrice * subItem.other_ratio
            const childSerial = subIndex + 1
            
            data.push([
              childSerial,
              subItem.name,
              constructionCost,
              equipmentCost,
              installationCost,
              otherCost,
              totalPrice,
              subItem.unit,
              subItem.quantity,
              subItem.unit_price,
              totalInvestment > 0 ? `${((totalPrice / totalInvestment) * 100).toFixed(2)}%` : '',
              ''
            ])
          })
        }
      })
      
      // B部分
      const bOtherTotal = calculatePartBOtherTotal()
      data.push([
        estimate.partB.序号,
        estimate.partB.工程或费用名称,
        0,
        0,
        0,
        bOtherTotal,
        estimate.partB.合计,
        '—',
        '—',
        '—',
        totalInvestment > 0 ? `${(((estimate.partB.合计 || 0) / totalInvestment) * 100).toFixed(2)}%` : '',
        estimate.partB.备注 || ''
      ])
      // B部分子项
      estimate.partB.children?.forEach(item => {
        data.push([
          item.序号,
          item.工程或费用名称,
          '—',
          '—',
          '—',
          item.其它费用 || item.合计 || 0,
          item.合计,
          '—',
          '—',
          '—',
          totalInvestment > 0 ? `${(((item.合计 || 0) / totalInvestment) * 100).toFixed(2)}%` : '',
          item.备注 || ''
        ])
      })
      
      // C部分
      data.push([
        estimate.partC.序号,
        estimate.partC.工程或费用名称,
        aConstructionTotal,
        aEquipTotal,
        aInstallTotal,
        aOtherTotal + bOtherTotal,
        estimate.partC.合计,
        '—',
        '—',
        '—',
        totalInvestment > 0 ? `${(((estimate.partC.合计 || 0) / totalInvestment) * 100).toFixed(2)}%` : '',
        estimate.partC.备注 || ''
      ])
      
      // D部分
      data.push([
        estimate.partD.序号,
        estimate.partD.工程或费用名称,
        '—',
        '—',
        '—',
        '—',
        estimate.partD.合计,
        '—',
        '—',
        '—',
        totalInvestment > 0 ? `${(((estimate.partD.合计 || 0) / totalInvestment) * 100).toFixed(2)}%` : '',
        estimate.partD.备注 || ''
      ])
      
      // E部分
      data.push([
        estimate.partE.序号,
        estimate.partE.工程或费用名称,
        '—',
        '—',
        '—',
        '—',
        estimate.partE.合计,
        '—',
        '—',
        '—',
        totalInvestment > 0 ? `${(((estimate.partE.合计 || 0) / totalInvestment) * 100).toFixed(2)}%` : '',
        estimate.partE.备注 || ''
      ])
      
      // F部分 - 建设期利息（带详细说明）
      const loanDetails = [
        `贷款总额: ${(Number(estimate?.partF?.贷款总额 || 0) || 0).toFixed(2)}万元 (占总投资${((Number(estimate?.partF?.贷款总额 || 0) || 0) / (estimate.partG?.合计 || 1) * 100).toFixed(2)}%)`,
        `年利率: ${((estimate?.partF?.年利率 || 0) * 100).toFixed(1)}%`,
        `建设期: ${estimate?.partF?.建设期年限 || 0}年`
      ]
      if (estimate?.partF?.分年利息?.length > 0) {
        loanDetails.push('各年利息计算:')
        estimate?.partF?.分年利息?.forEach(year => {
          loanDetails.push(
            `第${year.年份}年: (${Number(year.期初本金累计 || 0).toFixed(2)} + ${Number(year.当期借款金额 || 0).toFixed(2)} ÷ 2) × ${((estimate?.partF?.年利率 || 0) * 100).toFixed(1)}% = ${Number(year.当期利息 || 0).toFixed(2)}万元`
          )
        })
      }
      data.push([
        'F',
        '建设期利息',
        '—',
        '—',
        '—',
        '—',
        estimate?.partF?.合计 || 0,
        '—',
        '—',
        '—',
        totalInvestment > 0 ? `${(((estimate?.partF?.合计 || 0) / totalInvestment) * 100).toFixed(2)}%` : '',
        loanDetails.join('\n')
      ])
      
      // G部分
      data.push([
        estimate.partG?.序号,
        estimate.partG?.工程或费用名称,
        '—',
        '—',
        '—',
        '—',
        estimate.partG?.合计,
        '—',
        '—',
        '—',
        '100.00%',
        estimate.partG?.备注 || ''
      ])
      
      // 创建工作表
      const ws = XLSX.utils.aoa_to_sheet(data)
      
      // 定义样式
      // 标题样式
      const titleStyle = {
        font: { name: 'Microsoft YaHei', sz: 14, bold: true, color: { rgb: '1D2129' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: 'FFFFFF' } }
      }
      
      // 表头样式
      const headerStyle = {
        font: { name: 'Microsoft YaHei', sz: 10, bold: true, color: { rgb: '1D2129' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: 'F7F8FA' } },
        border: {
          top: { style: 'thin', color: { rgb: 'E5E6EB' } },
          bottom: { style: 'thin', color: { rgb: 'E5E6EB' } },
          left: { style: 'thin', color: { rgb: 'E5E6EB' } },
          right: { style: 'thin', color: { rgb: 'E5E6EB' } }
        }
      }
      
      // 主项样式（A-G）
      const mainRowStyle = {
        font: { name: 'Microsoft YaHei', sz: 10, bold: true, color: { rgb: '1D2129' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: 'FFFFFF' } },
        border: {
          top: { style: 'thin', color: { rgb: 'E5E6EB' } },
          bottom: { style: 'thin', color: { rgb: 'E5E6EB' } },
          left: { style: 'thin', color: { rgb: 'E5E6EB' } },
          right: { style: 'thin', color: { rgb: 'E5E6EB' } }
        }
      }
      
      // 子项样式
      const subRowStyle = {
        font: { name: 'Microsoft YaHei', sz: 8, color: { rgb: '4E5969' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: 'FFFFFF' } },
        border: {
          top: { style: 'thin', color: { rgb: 'E5E6EB' } },
          bottom: { style: 'thin', color: { rgb: 'E5E6EB' } },
          left: { style: 'thin', color: { rgb: 'E5E6EB' } },
          right: { style: 'thin', color: { rgb: 'E5E6EB' } }
        }
      }
      
      // 数字列样式（合计、比例）
      const numberStyle = {
        ...mainRowStyle,
        alignment: { horizontal: 'right', vertical: 'center' },
        numFmt: '0.00'  // 显示2位小数
      }
      
      const subNumberStyle = {
        ...subRowStyle,
        alignment: { horizontal: 'right', vertical: 'center' },
        numFmt: '0.00'  // 显示2位小数
      }
      
      // 备注列样式
      const remarkStyle = {
        ...mainRowStyle,
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true }
      }
      
      const subRemarkStyle = {
        ...subRowStyle,
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        font: { name: 'Microsoft YaHei', sz: 7, color: { rgb: '86909C' } }
      }
      
      // 应用样式
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      
      // 标题行（第1行）
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
        if (!ws[cellAddress]) continue
        ws[cellAddress].s = titleStyle
      }
      
      // 表头行（第3行）
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 2, c: C })
        if (!ws[cellAddress]) continue
        ws[cellAddress].s = headerStyle
      }
      
      // 数据行样式
      const aChildCount = estimate.partA.children?.length || 0
      const bChildCount = estimate.partB.children?.length || 0
      
      for (let R = 3; R <= range.e.r; ++R) {
        const rowIndex = R - 3 // 数据从第4行开始，对应data数组的索引
        const isAMain = rowIndex === 0
        const isAChild = rowIndex > 0 && rowIndex <= aChildCount
        const isBMain = rowIndex === aChildCount + 1
        const isBChild = rowIndex > aChildCount + 1 && rowIndex <= aChildCount + 1 + bChildCount
        const isMainRow = rowIndex > aChildCount + 1 + bChildCount // C/D/E/F/G都是主项
        
        // 通过序号判断是否为标题行：A-G 及 一/二/三 视为标题
        const serialCell = ws[XLSX.utils.encode_cell({ r: R, c: 0 })]
        let isMainLikeRow = false
        if (serialCell && typeof serialCell.v === 'string') {
          const serial = String(serialCell.v).replace(/、$/, '')
          if (/^[A-G]$/.test(serial) || serial === '一' || serial === '二' || serial === '三') {
            isMainLikeRow = true
          }
        }
        
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
          const cell = ws[cellAddress]
          if (!cell) continue
          
          let style
          if (isMainLikeRow) {
            // 主项行
            if (C === 2 || C === 3 || C === 4 || C === 5 || C === 6 || C === 8 || C === 9 || C === 10) {
              // 金额列 + 数量 + 单位价值 + 占总投资比例
              style = numberStyle
            } else if (C === 7) {
              // 单位
              style = mainRowStyle
            } else if (C === 11) {
              // 备注列
              style = remarkStyle
            } else {
              style = mainRowStyle
            }
          } else {
            // 子项行
            if (C === 2 || C === 3 || C === 4 || C === 5 || C === 6 || C === 8 || C === 9 || C === 10) {
              // 金额列 + 数量 + 单位价值 + 占总投资比例
              style = subNumberStyle
            } else if (C === 7) {
              // 单位
              style = subRowStyle
            } else if (C === 11) {
              // 备注列
              style = subRemarkStyle
            } else {
              style = subRowStyle
            }
          }
          
          // 序号列级别加粗控制：仅标题行 A-G 及 一/二/三 加粗，其余不加粗
          if (C === 0) {
            const value = cell.v
            const baseStyle = style || (isMainLikeRow ? mainRowStyle : subRowStyle)
            let bold = false
            
            if (typeof value === 'string') {
              const serial = value.replace(/、$/, '')
              if (/^[A-G]$/.test(serial) || serial === '一' || serial === '二' || serial === '三') {
                bold = true
              }
            }
            
            style = {
              ...baseStyle,
              font: {
                ...(baseStyle.font || {}),
                bold,
              },
            }
          }
          
          ws[cellAddress].s = style
        }
      }
      
      // 设置列宽
      ws['!cols'] = [
        { wch: 8 },   // 序号
        { wch: 50 },  // 工程或费用名称
        { wch: 10 },  // 建设工程费（万元）
        { wch: 10 },  // 设备购置费（万元）
        { wch: 10 },  // 安装工程费（万元）
        { wch: 10 },  // 其它费用（万元）
        { wch: 12 },  // 合计（万元）
        { wch: 5 },   // 单位
        { wch: 8 },   // 数量
        { wch: 12 },  // 单位价值（元）
        { wch: 10 },  // 占总投资比例
        { wch: 30 }   // 备注
      ]
      
      // 设置行高
      ws['!rows'] = []
      ws['!rows'][0] = { hpt: 30 } // 标题行
      ws['!rows'][2] = { hpt: 25 } // 表头行
      
      // 合并标题单元格（第一行，A1到L1）
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }
      ]
      
      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(wb, ws, '投资估算简表')
      
      // 导出文件
      XLSX.writeFile(wb, `${project.project_name}-投资估算表.xlsx`)
      
      notifications.show({
        title: '✅ 导出成功',
        message: 'Excel文件已下载',
        color: 'green',
        autoClose: 3000,
      })
    } catch (error) {
      console.error('导出失败:', error)
      notifications.show({
        title: '❌ 导出失败',
        message: '请稍后重试',
        color: 'red',
        autoClose: 6000,
      })
    }
  }

  // 加载计数器，用于调试重复加载问题
  const loadCounterRef = useRef(0)
  // 加载状态锁，防止重复加载
  const isLoadingRef = useRef(false)
  // 记录当前加载的ID，用于清理过期请求
  const currentLoadIdRef = useRef<string | null>(null)
  
  useEffect(() => {
    if (!id) return
    
    loadCounterRef.current += 1
    console.log(`[数据加载] useEffect执行 #${loadCounterRef.current}, id=${id}`)
    
    // 防止重复加载：如果已经在加载中，且ID相同，则跳过
    if (isLoadingRef.current && currentLoadIdRef.current === id) {
      console.log('[数据加载] 已在加载中，跳过重复请求')
      return
    }
    
    // 设置加载状态
    isLoadingRef.current = true
    currentLoadIdRef.current = id
    
    const loadData = async () => {
      try {
        // 先尝试从缓存获取（不强制清除缓存）
        const cacheKey = `investment:${id}`
        const cachedData = dataCache.get(cacheKey)
        
        if (cachedData) {
          console.log('[数据加载] 使用缓存数据')
          
          // 缓存格式可能与数据库格式不符，需要兼容处理
          // 缓存结构: { data: { estimate: { estimate_data: {...} } } }
          let estimateData = null
          let projectData = null
          
          // 尝试从缓存提取 estimate_data
          if (cachedData.data?.estimate?.estimate_data) {
            estimateData = cachedData.data.estimate.estimate_data
          } else if (cachedData.data?.estimate) {
            // 兼容：estimate_data 不存在时直接使用 estimate
            estimateData = cachedData.data.estimate
          }
          
          // 尝试从缓存提取 project 数据
          if (cachedData.data?.project) {
            projectData = cachedData.data.project
          }
          
          if (estimateData) {
            // 恢复三级子项数据
            if (estimateData.thirdLevelItems) {
              setThirdLevelItems(estimateData.thirdLevelItems)
            }
            // 恢复项目类型
            if (estimateData.projectType) {
              setProjectType(estimateData.projectType)
            }
            
            // 如果有项目数据，直接使用；否则需要加载项目信息
            if (projectData) {
              setProject(projectData)
              setEstimate(estimateData)
            } else {
              // 项目数据不在缓存中，需要单独加载
              console.log('[数据加载] 缓存中没有项目信息，加载项目数据')
              const projectResponse = await projectApi.getById(id!)
              if (projectResponse.success && projectResponse.data?.project) {
                setProject(projectResponse.data.project)
                setEstimate(estimateData)
              } else {
                // 项目加载失败，只设置estimate
                setEstimate(estimateData)
              }
            }
          } else {
            console.log('[数据加载] 缓存数据格式异常，从服务器加载')
            await loadProjectAndEstimate()
          }
        } else {
          console.log('[数据加载] 缓存不存在，从服务器加载')
          await loadProjectAndEstimate()
        }
      } catch (error) {
        console.error('[数据加载] 失败:', error)
        // 出错时回退到服务器加载
        await loadProjectAndEstimate()
      } finally {
        isLoadingRef.current = false
      }
    }
    
    loadData()
    
    // 组件卸载时取消所有请求
    return () => {
      console.log(`[数据加载] useEffect清理 #${loadCounterRef.current}`)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      // 清理加载状态（如果当前正在加载的是这个ID）
      if (currentLoadIdRef.current === id) {
        isLoadingRef.current = false
      }
    }
  }, [id])

  const loadProjectAndEstimate = async () => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // 创建新的AbortController
    abortControllerRef.current = new AbortController()
    
    setLoading(true)
    console.log(`[数据加载] 开始加载项目${id}的投资估算数据`)
    
    try {
      // 加载项目信息
      const projectResponse = await projectApi.getById(id!)
      if (projectResponse.success && projectResponse.data?.project) {
        const projectData = projectResponse.data.project
        setProject(projectData)
        console.log(`[数据加载] 项目信息加载成功:`, projectData.project_name)
        
        // 先检查是否已有投资估算（无论是否autoGenerateRequested，都需要先加载已有数据）
        console.log(`[数据加载] 开始加载投资估算数据...`)
        const estimateResponse = await investmentApi.getByProjectId(id!, {
          signal: abortControllerRef.current.signal,
          useCache: false // 禁用缓存，直接从服务器获取
        })
        
        // 添加调试日志
        console.log(`[数据加载] API响应:`, JSON.stringify(estimateResponse, null, 2))
        
        // 检查是否有数据库连接错误
        if (!estimateResponse.success && estimateResponse.error && estimateResponse.error.includes('数据库')) {
          console.error('[数据加载] 数据库连接错误:', estimateResponse.error)
          notifications.show({
            title: '❌ 数据库连接错误',
            message: '无法连接到数据库，请稍后重试',
            color: 'red',
            autoClose: 6000,
          })
          return
        }
        
        let existingThirdLevelItems: Record<number, any[]> = {}
        
        if (estimateResponse.success && estimateResponse.data?.estimate) {
          console.log(`[数据加载] 找到投资估算数据`)
          // 使用estimate_data字段作为详细数据，兼容不同的数据结构
          let estimateData = estimateResponse.data.estimate.estimate_data
          
          console.log(`[数据加载] estimateData:`, estimateData ? '存在' : '不存在')
          console.log(`[数据加载] estimateData.partA:`, estimateData?.partA ? '存在' : '不存在')
          console.log(`[数据加载] estimateData.partG:`, estimateData?.partG ? '存在' : '不存在')
          
          // 调试：打印estimateData的所有key
          if (estimateData) {
            console.log(`[数据加载] estimateData的顶层keys:`, Object.keys(estimateData))
            // 如果estimateData是嵌套结构，也检查constructionCost等简化字段
            console.log(`[数据加载] estimateData.constructionCost:`, estimateData.constructionCost)
            console.log(`[数据加载] estimateData.partA?.children?.length:`, estimateData?.partA?.children?.length)
            console.log(`[数据加载] estimateData.partG?.合计:`, estimateData?.partG?.合计)
          }
          
          // 如果estimate_data不存在，尝试直接使用estimate
          if (!estimateData) {
            estimateData = estimateResponse.data.estimate
          }
          
          // 数据完整性检查 - 检查 estimateData 是否包含完整结构
          const isCompleteStructure = estimateData?.partA?.children?.length > 0 && 
                                     estimateData?.partG?.合计 > 0
          
          if (!estimateData || !isCompleteStructure) {
            console.log('[数据加载] 投资估算数据为空或不完整，将自动生成完整结构')
            // 从简化的estimate_data构建完整的表格数据结构
            estimateData = buildFullEstimateStructure(estimateData || {}, projectData)
            console.log('[数据加载] 已构建完整结构，partA.children长度:', estimateData?.partA?.children?.length)
          } else {
            console.log('[数据加载] 投资估算数据完整')
          }
          
          console.log(`[数据加载] 投资估算数据加载成功，迭代次数: ${estimateData?.iterationCount || '未知'}`)
          
          // 恢复三级子项数据（如果存在）- 先保存到局部变量
          if (estimateData.thirdLevelItems) {
            existingThirdLevelItems = estimateData.thirdLevelItems
            setThirdLevelItems(existingThirdLevelItems)
            console.log(`[数据加载] 已恢复${Object.keys(existingThirdLevelItems).length}个三级子项数据`)
          }
          
          // 恢复项目类型（如果存在）- 优先使用数据库中的值
          if (estimateData.projectType) {
            setProjectType(estimateData.projectType)
            console.log(`[数据加载] 已恢复项目类型: ${estimateData.projectType}`)
          } else {
            console.log(`[数据加载] 未找到保存的项目类型，使用默认值: agriculture`)
          }

          
          // 检查是否需要自动生成（修复逻辑：只有确实没有数据时才自动生成）
          const shouldAutoGenerate = autoGenerateRequested &&
                                !autoGenerateHandled &&
                                !estimateData
          
          if (shouldAutoGenerate) {
            setAutoGenerateHandled(true)
            console.log(`[数据加载] 确实没有估算数据，开始自动生成投资估算（保留三级子项）`)
            // 直接在这里实现生成逻辑（保留三级子项）
            setGenerating(true)
            try {
              const tableItems = estimateData?.partA?.children?.map((item: any) => ({
                name: item.工程或费用名称,
                construction_cost: item.建设工程费 || 0,
                equipment_cost: item.设备购置费 || 0,
                installation_cost: item.安装工程费 || 0,
                other_cost: item.其它费用 || 0,
                remark: item.备注 || ''
              })) || []
              
              const landCostFromProject = projectData.land_cost ?? 0
              // 生成投资估算（传递当前项目类型，确保市政公用设施费正确计算）
              const response = await investmentApi.generateSummary(id!, tableItems, undefined, landCostFromProject, projectType)
              if (response.success && response.data) {
                const newEstimateData = response.data.summary
                // 使用 setTimeout 确保状态更新触发渲染
                setTimeout(() => setEstimate(newEstimateData), 0)
                
                // 使用局部变量保存三级子项
                const estimateWithThirdLevel = {
                  ...newEstimateData,
                  thirdLevelItems: existingThirdLevelItems
                }
                await investmentApi.save({
                  project_id: id!,
                  estimate_data: estimateWithThirdLevel
                })
                console.log(`[数据加载] 自动生成完成，已保存三级子项`)
              }
            } catch (e: any) {
              // 忽略被取消的请求
              if (e.name !== 'AbortError') {
                console.error('[数据加载] 生成估算失败:', e)
                notifications.show({
                  title: '❌ 生成失败',
                  message: '自动生成投资估算失败，请稍后重试',
                  color: 'red',
                  autoClose: 6000,
                })
              }
            } finally {
              setGenerating(false)
            }
            return
          } else if (autoGenerateRequested && !autoGenerateHandled) {
            console.log(`[数据加载] 已有完整估算数据，跳过自动生成`)
            setAutoGenerateHandled(true)
          }
          
          // 确保从数据库获取的额外字段被合并到estimateData中
          if (estimateResponse.data.estimate) {
            // 合并数据库中保存的建设期利息详情和还本付息计划数据
            estimateData.construction_interest_details = estimateResponse.data.estimate.construction_interest_details;
            estimateData.loan_repayment_schedule_simple = estimateResponse.data.estimate.loan_repayment_schedule_simple;
            estimateData.loan_repayment_schedule_detailed = estimateResponse.data.estimate.loan_repayment_schedule_detailed;
            
            // 添加调试日志
          } else {
          }
          
          // 使用 setTimeout 确保状态更新触发渲染
          setTimeout(() => setEstimate(estimateData), 0)
          console.log(`[数据加载] 投资估算数据已设置到组件状态`)
        } else {
          console.log(`[数据加载] 未找到投资估算数据，${autoGenerateRequested ? '将自动生成' : '显示空状态'}`)
          // 没有估算，自动生成（传递项目数据）
          if (autoGenerateRequested && !autoGenerateHandled) {
            setAutoGenerateHandled(true)
          }
          await generateEstimate(false, projectData)
        }
      } else {
        const errorMsg = projectResponse.error || '加载项目失败'
        console.error(`[数据加载] 项目信息加载失败:`, errorMsg)
        notifications.show({
          title: '❌ 加载失败',
          message: errorMsg,
          color: 'red',
          autoClose: 6000,
        })
      }
    } catch (error: any) {
      // 忽略被取消的请求
      if (error.name !== 'AbortError') {
        const errorMsg = error.response?.data?.error || error.message || '加载项目失败'
        console.error(`[数据加载] 数据加载异常:`, error)
        
        // 尝试从缓存恢复数据（降级策略）
        const cacheKey = `investment:${id}`
        const cachedData = (window as any).dataCache?.get?.(cacheKey)
        
        if (cachedData) {
          console.log(`[数据加载] 从缓存恢复数据成功`)
          notifications.show({
            title: '⚠️ 使用缓存数据',
            message: '网络异常，已从缓存恢复数据',
            color: 'orange',
            autoClose: 4000,
          })
          
          if (cachedData.success && cachedData.data?.estimate) {
            let estimateData = cachedData.data.estimate.estimate_data
            
            // 确保从数据库获取的额外字段被合并到estimateData中
            if (cachedData.data.estimate) {
              // 合并数据库中保存的建设期利息详情和还本付息计划数据
              if (!estimateData) {
                estimateData = cachedData.data.estimate
              }
              estimateData.construction_interest_details = cachedData.data.estimate.construction_interest_details;
              estimateData.loan_repayment_schedule_simple = cachedData.data.estimate.loan_repayment_schedule_simple;
              estimateData.loan_repayment_schedule_detailed = cachedData.data.estimate.loan_repayment_schedule_detailed;
            }
            
            if (estimateData?.thirdLevelItems) {
              setThirdLevelItems(estimateData.thirdLevelItems)
            }
            setTimeout(() => setEstimate(estimateData), 0)
          }
        } else {
          notifications.show({
            title: '❌ 加载失败',
            message: errorMsg,
            color: 'red',
            autoClose: 6000,
          })
        }
      }
    } finally {
      setLoading(false)
      console.log(`[数据加载] 数据加载流程完成`)
    }
  }

  const analyzeWithAI = async () => {
    if (!project) return
      
    setAnalyzingAI(true)
    try {
      const aiResponse = await llmConfigApi.analyzeEngineeringItems({
        project_name: project.project_name,
        project_description: project.project_info || '',
        total_investment: project.total_investment
      })
        
      if (aiResponse.success && aiResponse.data?.items) {
        setAiItems(aiResponse.data.items)
        setShowAIPreview(true) // 自动打开预览
        
        console.log('AI分析工程子项成功:', aiResponse.data.items)
        notifications.show({
          title: '✨ AI分析完成',
          message: `已生成${aiResponse.data.items.length}个工程子项建议`,
          color: 'blue',
          position: 'bottom-right',
          autoClose: 4000,
        })
      } else {
        notifications.show({
          title: '❌ AI分析失败',
          message: aiResponse.error || '请检查LLM配置是否正确',
          color: 'red',
          position: 'bottom-right',
          autoClose: 6000,
        })
      }
    } catch (aiError: any) {
      console.error('AI分析失败:', aiError)
      notifications.show({
        title: '❌ AI分析失败',
        message: aiError.response?.data?.error || aiError.message || '请检查LLM配置',
        color: 'red',
        position: 'bottom-right',
        autoClose: 6000,
      })
    } finally {
      setAnalyzingAI(false)
    }
  }

  const applyAIItemsToEstimate = async () => {
    if (!project || aiItems.length === 0) return

    setGenerating(true)
    setShowAIPreview(false) // 关闭预览Modal

    try {
      // 直接调用generateSummary API，传入AI生成的子项
      const response = await investmentApi.generateSummary(id!, aiItems)

      if (response.success && response.data) {
        // 使用summary作为详细数据
        const estimateData = response.data.summary
        // 强制在下一个事件循环中更新状态，确保渲染
        setTimeout(() => setEstimate(estimateData), 0)
        
        // 保存到数据库（包含三级子项数据和当前项目类型）
        const estimateWithThirdLevel = {
          ...estimateData,
          thirdLevelItems: thirdLevelItems,
          projectType: projectType
        }
        await saveEstimateToDatabase(estimateWithThirdLevel)
        
        notifications.show({
          title: '🚀 应用成功',
          message: `AI建议的${aiItems.length}个子项已应用到投资估算表，迭代${response.data.summary.iterationCount}次，差距率${response.data.summary.gapRate?.toFixed(2) || 'N/A'}%`,
          color: 'green',
          position: 'bottom-right',
          autoClose: 6000,
        })
      } else {
        const errorMsg = response.error || '应用AI子项失败'
        notifications.show({
          title: '❌ 应用失败',
          message: errorMsg,
          color: 'red',
          position: 'bottom-right',
          autoClose: 6000,
        })
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || '应用AI子项失败'
      console.error('应用AI子项失败:', error)

      notifications.show({
        title: '❌ 应用失败',
        message: errorMsg,
        color: 'red',
        position: 'bottom-right',
        autoClose: 6000,
      })
    } finally {
      setGenerating(false)
    }
  }

  // 编辑AI子项
  const startEditItem = (index: number) => {
    setEditingItem(index)
    setTempEditItem({ ...aiItems[index] })
  }

  const cancelEdit = () => {
    setEditingItem(null)
    setTempEditItem(null)
  }

  const saveEditItem = (index: number) => {
    const updatedItems = [...aiItems]
    updatedItems[index] = { ...tempEditItem }
    setAiItems(updatedItems)
    setEditingItem(null)
    setTempEditItem(null)
    notifications.show({
      title: '✅ 修改成功',
      message: '子项信息已更新',
      color: 'green',
      autoClose: 3000,
    })
  }

  const deleteItem = (index: number) => {
    const updatedItems = aiItems.filter((_, i) => i !== index)
    setAiItems(updatedItems)
    notifications.show({
      title: '✅ 删除成功',
      message: '子项已删除',
      color: 'green',
      autoClose: 3000,
    })
  }

  const updateEditItem = (field: string, value: any) => {
    setTempEditItem((prev: any) => ({
      ...prev,
      [field]: value
    }))
  }

  // 打开修改子项对话框
  const openEditSubItems = () => {
    if (!estimate?.partA?.children) {
      notifications.show({
        title: '⚠️ 无法编辑',
        message: '还没有A部分子项数据',
        color: 'orange',
        autoClose: 4000,
      })
      return
    }
    // 深拷贝A部分子项用于编辑
    const itemsCopy = JSON.parse(JSON.stringify(estimate.partA.children))
    setOriginalSubItems(itemsCopy)
    setEditingSubItems(itemsCopy)
    setShowEditSubItems(true)
  }

  // 打开编辑单个子项的弹窗
  const openEditSingleItem = (index: number) => {
    const item = editingSubItems[index]
    setSingleItemTemp(JSON.parse(JSON.stringify(item)))
    setEditingSingleItemIndex(index)
    setAdjustmentPercentage(0)
    setShowEditSingleItem(true)
  }

  // 删除子项
  const deleteSubItem = (index: number) => {
    const updated = editingSubItems.filter((_, i) => i !== index)
    const updatedOriginal = originalSubItems.filter((_, i) => i !== index)
    setEditingSubItems(updated)
    setOriginalSubItems(updatedOriginal)
    notifications.show({
      title: '✅ 删除成功',
      message: '子项已删除',
      color: 'green',
      position: 'bottom-right',
      autoClose: 3000,
    })
  }

  // 增加新子项
  const addNewSubItem = () => {
    // 生成下一个序号
    const getNextNumber = () => {
      if (editingSubItems.length === 0) return '1.1'
      const lastItem = editingSubItems[editingSubItems.length - 1]
      const lastNumber = lastItem.序号
      const parts = lastNumber.split('.')
      if (parts.length === 2) {
        const nextSubNumber = parseInt(parts[1]) + 1
        return `${parts[0]}.${nextSubNumber}`
      }
      return '1.1'
    }

    const newItem: InvestmentItem = {
      id: `new_${Date.now()}`,
      序号: getNextNumber(),
      工程或费用名称: '',
      建设工程费: 0,
      设备购置费: 0,
      安装工程费: 0,
      其它费用: 0,
      合计: 0,
      备注: ''
    }

    setNewSubItemTemp(newItem)
    setShowAddSubItemModal(true)
  }

  // 更新单个子项的字段值（带自动合计）
  const updateSingleItemField = (field: string, value: any) => {
    if (!singleItemTemp) return
    
    const updated = { ...singleItemTemp }
    
    if (field === '工程或费用名称' || field === '备注') {
      (updated as any)[field] = value
    } else {
      // 数字字段 - 直接赋值，如果是number则使用，否则为0
      (updated as any)[field] = typeof value === 'number' ? value : 0
      // 自动计算合计
      updated.合计 = (updated.建设工程费 || 0) + (updated.设备购置费 || 0) + 
                    (updated.安装工程费 || 0) + (updated.其它费用 || 0)
    }
    
    setSingleItemTemp(updated)
  }

  // 更新新增子项的字段值（带自动合计）
  const updateNewSubItemField = (field: string, value: any) => {
    if (!newSubItemTemp) return
    
    const updated = { ...newSubItemTemp }
    
    if (field === '工程或费用名称' || field === '备注') {
      (updated as any)[field] = value
    } else {
      (updated as any)[field] = typeof value === 'number' ? value : 0
      updated.合计 = (updated.建设工程费 || 0) + (updated.设备购置费 || 0) + 
                    (updated.安装工程费 || 0) + (updated.其它费用 || 0)
    }
    
    setNewSubItemTemp(updated)
  }

  // 应用新增子项
  const applyNewSubItem = () => {
    if (!newSubItemTemp) return
    
    // 验证：费用名称必填
    if (!newSubItemTemp.工程或费用名称 || newSubItemTemp.工程或费用名称.trim() === '') {
      notifications.show({
        title: '❌ 验证失败',
        message: '费用名称不能为空',
        color: 'red',
        position: 'bottom-right',
        autoClose: 4000,
      })
      return
    }
    
    // 验证：合计金额必须大于0
    if (newSubItemTemp.合计 <= 0) {
      notifications.show({
        title: '❌ 验证失败',
        message: '费用金额必须大于0',
        color: 'red',
        position: 'bottom-right',
        autoClose: 4000,
      })
      return
    }
    
    const updatedEditing = [...editingSubItems, newSubItemTemp]
    const updatedOriginal = [...originalSubItems, { ...newSubItemTemp, 合计: 0 }]
    
    setEditingSubItems(updatedEditing)
    setOriginalSubItems(updatedOriginal)
    setShowAddSubItemModal(false)
    setNewSubItemTemp(null)
    
    notifications.show({
      title: '✅ 添加成功',
      message: '新子项已添加到列表',
      color: 'green',
      position: 'bottom-right',
      autoClose: 3000,
    })
  }

  // 取消新增子项
  const cancelNewSubItem = () => {
    setShowAddSubItemModal(false)
    setNewSubItemTemp(null)
  }

  // 验证和调整三级子项数据的算法
  const validateAndAdjustThirdLevelItems = (
    subItems: any[], 
    targetTotal: number,
    targetConstruction: number,
    targetEquipment: number,
    targetInstallation: number,
    targetOther: number
  ) => {
    const n = subItems.length
    if (n === 0) return subItems

    console.log('=== 三级子项验证和调整算法 ===')
    console.log('输入：二级子项总价S =', targetTotal, '万元')
    console.log('输入：目标四类费用:', targetConstruction.toFixed(2), targetEquipment.toFixed(2), 
                targetInstallation.toFixed(2), targetOther.toFixed(2))

    // 定义需要取整的单位
    const integerUnits = ['个', '根', '套', '组', '樘', '块', '台', '件', '点位', '节点']

    // 步骤1：计算三级子项初始总价
    let initialTotalSum = 0
    const adjustedItems = subItems.map((item, index) => {
      const itemTotal = (item.quantity * item.unit_price) / 10000
      initialTotalSum += itemTotal
      return {
        ...item,
        initialTotal: itemTotal,
        index
      }
    })

    console.log('步骤1：初始总价合计 =', initialTotalSum.toFixed(2), '万元')

    // 步骤2：按目标总价调整各子项，保持相对比例
    adjustedItems.forEach((item, i) => {
      // 计算该子项应占的比例
      const ratio = initialTotalSum > 0 ? item.initialTotal / initialTotalSum : 1 / n
      // 按比例分配目标总价
      item.targetTotal = targetTotal * ratio
      console.log(`  子项${i + 1}: 初始=${item.initialTotal.toFixed(2)}, 目标=${item.targetTotal.toFixed(2)} 万元`)
    })

    // 步骤3：计算各三级子项的四类费用（使用目标总价）
    adjustedItems.forEach((item, i) => {
      // 使用各子项自身的费用占比
      const totalRatioSum = item.construction_ratio + item.equipment_ratio + 
                           item.installation_ratio + item.other_ratio
      
      // 强制防止负数比例
      const safeConstRatio = Math.max(0, item.construction_ratio || 0)
      const safeEquipRatio = Math.max(0, item.equipment_ratio || 0)
      const safeInstRatio = Math.max(0, item.installation_ratio || 0)
      const safeOtherRatio = Math.max(0, item.other_ratio || 0)
      const safeTotalRatio = safeConstRatio + safeEquipRatio + safeInstRatio + safeOtherRatio
      
      // 归一化占比（确保总和为1）
      const normalizedConstruction = safeTotalRatio > 0 ? safeConstRatio / safeTotalRatio : 0.25
      const normalizedEquipment = safeTotalRatio > 0 ? safeEquipRatio / safeTotalRatio : 0.25
      const normalizedInstallation = safeTotalRatio > 0 ? safeInstRatio / safeTotalRatio : 0.25
      const normalizedOther = safeTotalRatio > 0 ? safeOtherRatio / safeTotalRatio : 0.25

      // 使用目标总价计算各项费用
      item.construction = item.targetTotal * normalizedConstruction
      item.equipment = item.targetTotal * normalizedEquipment
      item.installation = item.targetTotal * normalizedInstallation
      item.other = item.targetTotal * normalizedOther

      console.log(`  子项${i + 1} 费用: 建设=${item.construction.toFixed(2)}, 设备=${item.equipment.toFixed(2)}, 安装=${item.installation.toFixed(2)}, 其它=${item.other.toFixed(2)}`)
    })

    // 步骤4：计算当前四类费用总和
    let currentConstruction = 0, currentEquipment = 0, currentInstallation = 0, currentOther = 0
    adjustedItems.forEach(item => {
      currentConstruction += item.construction
      currentEquipment += item.equipment
      currentInstallation += item.installation
      currentOther += item.other
    })

    console.log('步骤4：当前四类费用合计:', currentConstruction.toFixed(2), currentEquipment.toFixed(2), 
                currentInstallation.toFixed(2), currentOther.toFixed(2))
    console.log('步骤4：目标四类费用:', targetConstruction.toFixed(2), targetEquipment.toFixed(2), 
                targetInstallation.toFixed(2), targetOther.toFixed(2))

    // 步骤5：按比例微调四类费用使其匹配目标值
    const delta1 = targetConstruction - currentConstruction
    const delta2 = targetEquipment - currentEquipment
    const delta3 = targetInstallation - currentInstallation
    const delta4 = targetOther - currentOther

    console.log('步骤5：费用差额:', delta1.toFixed(2), delta2.toFixed(2), delta3.toFixed(2), delta4.toFixed(2))

    // 判断是否需要调整
    const needsAdjustment = Math.abs(delta1) > 0.01 || Math.abs(delta2) > 0.01 || 
                           Math.abs(delta3) > 0.01 || Math.abs(delta4) > 0.01

    if (needsAdjustment) {
      console.log('步骤5：需要微调')
      
      // 按比例分配差额到各子项
      adjustedItems.forEach((item, i) => {
        const itemRatio = item.targetTotal / targetTotal
        item.construction += delta1 * itemRatio
        item.equipment += delta2 * itemRatio
        item.installation += delta3 * itemRatio
        item.other += delta4 * itemRatio

        console.log(`  子项${i + 1} 调整后: 建设=${item.construction.toFixed(2)}, 设备=${item.equipment.toFixed(2)}, 安装=${item.installation.toFixed(2)}, 其它=${item.other.toFixed(2)}`)
      })
    }

    // 输出：重新计算工程量，保持单价不变
    const finalItems = adjustedItems.map((item, i) => {
      // 最终总价 = 四项费用之和
      const finalTotal = item.construction + item.equipment + item.installation + item.other
      
      // 反推工程量：工程量 = (总价 × 10000) / 单价
      let newQuantity = item.unit_price > 0 ? (finalTotal * 10000) / item.unit_price : 0
      let finalUnitPrice = item.unit_price
      
      // 如果单位需要取整，则调整数量和单价
      if (integerUnits.includes(item.unit)) {
        const roundedQuantity = Math.ceil(newQuantity) // 向上取整
        if (roundedQuantity > 0) {
          // 重新计算单价以保持总价不变
          finalUnitPrice = (finalTotal * 10000) / roundedQuantity
          newQuantity = roundedQuantity
          console.log(`  子项${i + 1} 取整: ${item.unit} 数量${item.quantity.toFixed(2)}→${roundedQuantity}, 单价${item.unit_price.toFixed(2)}→${finalUnitPrice.toFixed(2)}`)
        }
      }
      
      // 重新计算占比（确保总和为1且无负数）
      let newConstRatio = finalTotal > 0 ? Math.max(0, item.construction / finalTotal) : 0.25
      let newEquipRatio = finalTotal > 0 ? Math.max(0, item.equipment / finalTotal) : 0.25
      let newInstRatio = finalTotal > 0 ? Math.max(0, item.installation / finalTotal) : 0.25
      let newOtherRatio = finalTotal > 0 ? Math.max(0, item.other / finalTotal) : 0.25
      
      // 强制归一化：调整最大的那一项以确保总和为1
      const ratioSum = newConstRatio + newEquipRatio + newInstRatio + newOtherRatio
      if (Math.abs(ratioSum - 1) > 0.0001) {
        // 找到最大的那一项
        const ratios = [
          { name: 'const', value: newConstRatio },
          { name: 'equip', value: newEquipRatio },
          { name: 'inst', value: newInstRatio },
          { name: 'other', value: newOtherRatio }
        ]
        ratios.sort((a, b) => b.value - a.value)
        const adjustment = 1 - ratioSum
        
        if (ratios[0].name === 'const') newConstRatio += adjustment
        else if (ratios[0].name === 'equip') newEquipRatio += adjustment
        else if (ratios[0].name === 'inst') newInstRatio += adjustment
        else newOtherRatio += adjustment
        
        console.log(`  子项${i + 1} 归一化: 原总和=${ratioSum.toFixed(4)}, 调整=${adjustment.toFixed(4)}`)
      }

      console.log(`输出 子项${i + 1}: 总价=${finalTotal.toFixed(2)}万元, 工程量=${newQuantity.toFixed(2)}, 单价=${finalUnitPrice.toFixed(2)}元, 占比总和=${(newConstRatio + newEquipRatio + newInstRatio + newOtherRatio).toFixed(4)}`)

      return {
        name: item.name,
        quantity: integerUnits.includes(item.unit) ? Math.round(newQuantity) : newQuantity,
        unit: item.unit,
        unit_price: finalUnitPrice,
        construction_ratio: Number(newConstRatio.toFixed(6)),
        equipment_ratio: Number(newEquipRatio.toFixed(6)),
        installation_ratio: Number(newInstRatio.toFixed(6)),
        other_ratio: Number(newOtherRatio.toFixed(6))
      }
    })

    // 验证最终结果
    let finalTotalSum = 0
    finalItems.forEach(item => {
      const itemTotal = (item.quantity * item.unit_price) / 10000
      finalTotalSum += itemTotal
    })
    console.log('验证：最终总价合计 =', finalTotalSum.toFixed(2), '万元，目标 =', targetTotal.toFixed(2), '万元')
    console.log('=== 验证和调整完成 ===')
    
    return finalItems
  }

  // 细化全部二级子项
  const handleSubdivideAll = async () => {
    if (!estimate?.partA?.children || !project) return
    
    setAnalyzingSubItem(true)
    
    try {
      for (let index = 0; index < estimate.partA.children.length; index++) {
        const item = estimate.partA.children[index]
        setSubdividingItemIndex(index)
        
        try {
          const aiResponse = await llmConfigApi.subdivideEngineeringItem({
            item_name: item.工程或费用名称,
            item_remark: item.备注 || '',
            total_amount: item.合计 || 0,
            project_name: project.project_name,
            project_description: project.project_info || ''
          })
          
          if (aiResponse.success && aiResponse.data?.subItems) {
            const rawSubItems = aiResponse.data.subItems
            const adjustedSubItems = validateAndAdjustThirdLevelItems(
              rawSubItems,
              item.合计 || 0,
              item.建设工程费 || 0,
              item.设备购置费 || 0,
              item.安装工程费 || 0,
              item.其它费用 || 0
            )
            
            setThirdLevelItems(prev => ({
              ...prev,
              [index]: adjustedSubItems
            }))
            updateParentItemFromThirdItems(index, adjustedSubItems)
          }
        } catch (error) {
          console.error(`细分子项${index}失败:`, error)
        }
      }
      
      notifications.show({
        title: '✨ 细化完成',
        message: `已完成${estimate.partA.children.length}个子项的细化`,
        color: 'green',
        position: 'bottom-right',
        autoClose: 4000,
      })
    } catch (error: any) {
      notifications.show({
        title: '❌ 细化失败',
        message: error.message || '请检查LLM配置',
        color: 'red',
        position: 'bottom-right',
        autoClose: 6000,
      })
    } finally {
      setAnalyzingSubItem(false)
      setSubdividingItemIndex(null)
    }
  }

  // 处理AI细分子项
  const handleSubdivideItem = async (index: number) => {
    if (!estimate?.partA?.children || !project) return
    
    const item = estimate.partA.children[index]
    setAnalyzingSubItem(true)
    
    try {
      // 调用AI分析API
      const aiResponse = await llmConfigApi.subdivideEngineeringItem({
        item_name: item.工程或费用名称,
        item_remark: item.备注 || '',
        total_amount: item.合计 || 0,
        project_name: project.project_name,
        project_description: project.project_info || ''
      })
      
      if (aiResponse.success && aiResponse.data?.subItems) {
        const rawSubItems = aiResponse.data.subItems
        
        console.log('AI原始返回数据:', rawSubItems)
        
        // 调用验证和调整算法
        const adjustedSubItems = validateAndAdjustThirdLevelItems(
          rawSubItems,
          item.合计 || 0,
          item.建设工程费 || 0,
          item.设备购置费 || 0,
          item.安装工程费 || 0,
          item.其它费用 || 0
        )
        
        // 将三级子项添加到当前子项下
        setThirdLevelItems(prev => ({
          ...prev,
          [index]: adjustedSubItems
        }))
        updateParentItemFromThirdItems(index, adjustedSubItems)
        
        console.log('AI细分结果(调整后):', adjustedSubItems)
        
        notifications.show({
          title: '✨ AI细分完成',
          message: `已生成${adjustedSubItems.length}个三级子项，并已校验调整`,
          color: 'blue',
          position: 'bottom-right',
          autoClose: 4000,
        })
      } else {
        notifications.show({
          title: '❌ AI细分失败',
          message: aiResponse.error || '请检查LLM配置',
          color: 'red',
          position: 'bottom-right',
          autoClose: 6000,
        })
      }
    } catch (error: any) {
      console.error('AI细分失败:', error)
      notifications.show({
        title: '❌ AI细分失败',
        message: error.response?.data?.error || error.message || '请检查LLM配置',
        color: 'red',
        position: 'bottom-right',
        autoClose: 6000,
      })
    } finally {
      setAnalyzingSubItem(false)
      setSubdividingItemIndex(null)
    }
  }

  // 打开编辑三级子项
  const openEditThirdLevelItem = (parentIndex: number, itemIndex: number) => {
    const items = thirdLevelItems[parentIndex]
    if (!items || !items[itemIndex]) return
    
    setEditingThirdLevelItem({ parentIndex, itemIndex })
    setThirdLevelItemTemp(JSON.parse(JSON.stringify(items[itemIndex])))
  }

  // 根据三级子项重新计算二级子项费用
  const updateParentItemFromThirdItems = (parentIndex: number, customItems?: any[]) => {
    setEstimate(prev => {
      if (!prev?.partA?.children) {
        return prev
      }

      const thirdItems = customItems ?? thirdLevelItems[parentIndex]
      const updatedChildren = [...prev.partA.children]

      if (!updatedChildren[parentIndex]) {
        return prev
      }

      if (!thirdItems || thirdItems.length === 0) {
        updatedChildren[parentIndex] = {
          ...updatedChildren[parentIndex],
          建设工程费: 0,
          设备购置费: 0,
          安装工程费: 0,
          其它费用: 0,
          合计: 0,
        }

        return {
          ...prev,
          partA: {
            ...prev.partA,
            children: updatedChildren
          }
        }
      }

      let totalConstruction = 0
      let totalEquipment = 0
      let totalInstallation = 0
      let totalOther = 0
      let totalSum = 0

      thirdItems.forEach((subItem: any) => {
        const quantity = subItem?.quantity || 0
        const unitPrice = subItem?.unit_price || 0
        const itemTotal = (quantity * unitPrice) / 10000

        totalConstruction += itemTotal * (subItem?.construction_ratio || 0)
        totalEquipment += itemTotal * (subItem?.equipment_ratio || 0)
        totalInstallation += itemTotal * (subItem?.installation_ratio || 0)
        totalOther += itemTotal * (subItem?.other_ratio || 0)
        totalSum += itemTotal
      })

      updatedChildren[parentIndex] = {
        ...updatedChildren[parentIndex],
        建设工程费: Number(totalConstruction.toFixed(2)),
        设备购置费: Number(totalEquipment.toFixed(2)),
        安装工程费: Number(totalInstallation.toFixed(2)),
        其它费用: Number(totalOther.toFixed(2)),
        合计: Number(totalSum.toFixed(2)),
      }

      return {
        ...prev,
        partA: {
          ...prev.partA,
          children: updatedChildren
        }
      }
    })
  }

  // 归一化费用占比（编辑三级子项时使用）
  const normalizeThirdLevelRatios = () => {
    if (!thirdLevelItemTemp) return
    
    const currentSum = 
      (thirdLevelItemTemp.construction_ratio || 0) +
      (thirdLevelItemTemp.equipment_ratio || 0) +
      (thirdLevelItemTemp.installation_ratio || 0) +
      (thirdLevelItemTemp.other_ratio || 0)
    
    if (currentSum === 0) {
      notifications.show({
        title: '⚠️ 无法归一化',
        message: '所有占比都为0，无法归一化',
        color: 'orange',
        position: 'bottom-right',
        autoClose: 3000,
      })
      return
    }
    
    // 找出所有非零的占比
    const nonZeroRatios: Array<{key: string, value: number}> = []
    if ((thirdLevelItemTemp.construction_ratio || 0) > 0) {
      nonZeroRatios.push({key: 'construction_ratio', value: thirdLevelItemTemp.construction_ratio})
    }
    if ((thirdLevelItemTemp.equipment_ratio || 0) > 0) {
      nonZeroRatios.push({key: 'equipment_ratio', value: thirdLevelItemTemp.equipment_ratio})
    }
    if ((thirdLevelItemTemp.installation_ratio || 0) > 0) {
      nonZeroRatios.push({key: 'installation_ratio', value: thirdLevelItemTemp.installation_ratio})
    }
    if ((thirdLevelItemTemp.other_ratio || 0) > 0) {
      nonZeroRatios.push({key: 'other_ratio', value: thirdLevelItemTemp.other_ratio})
    }
    
    // 计算差值
    const gap = 1 - currentSum
    
    // 将差值平均分配到非零项
    const adjustment = gap / nonZeroRatios.length
    
    const normalized = { ...thirdLevelItemTemp }
    nonZeroRatios.forEach(item => {
      normalized[item.key] = Math.max(0, item.value + adjustment)
    })
    
    setThirdLevelItemTemp(normalized)
    
    notifications.show({
      title: '✅ 归一化成功',
      message: `已将占比总和调整为1，差值${gap.toFixed(3)}已平均分配到非零项`,
      color: 'green',
      position: 'bottom-right',
      autoClose: 3000,
    })
  }

  // 应用三级子项修改
  const applyThirdLevelItemEdit = () => {
    if (!editingThirdLevelItem || !thirdLevelItemTemp) return
    
    // 校验占比总和是否为1
    const ratioSum = 
      (thirdLevelItemTemp.construction_ratio || 0) +
      (thirdLevelItemTemp.equipment_ratio || 0) +
      (thirdLevelItemTemp.installation_ratio || 0) +
      (thirdLevelItemTemp.other_ratio || 0)
    
    if (Math.abs(ratioSum - 1) > 0.001) {
      notifications.show({
        title: '⚠️ 无法应用',
        message: `费用占比总和必须等于1，当前为${ratioSum.toFixed(3)}，请先归一化`,
        color: 'orange',
        position: 'bottom-right',
        autoClose: 4000,
      })
      return
    }
    
    const { parentIndex, itemIndex } = editingThirdLevelItem
    const updatedItems = [...(thirdLevelItems[parentIndex] || [])]
    updatedItems[itemIndex] = { ...thirdLevelItemTemp }
    
    setThirdLevelItems(prev => ({
      ...prev,
      [parentIndex]: updatedItems
    }))
    updateParentItemFromThirdItems(parentIndex, updatedItems)
    
    setEditingThirdLevelItem(null)
    setThirdLevelItemTemp(null)
    
    notifications.show({
      title: '✅ 修改成功',
      message: '三级子项已更新，已重新计算上级子项合计',
      color: 'green',
      position: 'bottom-right',
      autoClose: 3000,
    })
  }

  // 取消三级子项编辑
  const cancelThirdLevelItemEdit = () => {
    setEditingThirdLevelItem(null)
    setThirdLevelItemTemp(null)
  }

  // 删除三级子项
  const deleteThirdLevelItem = (parentIndex: number, itemIndex: number) => {
    const items = thirdLevelItems[parentIndex]
    if (!items) return
    
    const updatedItems = items.filter((_, i) => i !== itemIndex)

    setThirdLevelItems(prev => ({
      ...prev,
      [parentIndex]: updatedItems
    }))

    updateParentItemFromThirdItems(parentIndex, updatedItems)
    
    notifications.show({
      title: '✅ 删除成功',
      message: '三级子项已删除，已重新计算上级子项合计',
      color: 'green',
      position: 'bottom-right',
      autoClose: 3000,
    })
  }

  // 更新三级子项字段
  const updateThirdLevelItemField = (field: string, value: any) => {
    if (!thirdLevelItemTemp) return
    setThirdLevelItemTemp((prev: any) => ({
      ...prev,
      [field]: value
    }))
  }

  // 打开细分三级子项弹窗，并加载已保存的三级子项数据
  const openSubdivideModal = async () => {
    // 先从数据库加载已保存的三级子项数据
    try {
      const estimateResponse = await investmentApi.getByProjectId(id!)
      if (estimateResponse.success && estimateResponse.data?.estimate) {
        const estimateData = estimateResponse.data.estimate.estimate_data
        const savedThirdLevelItems = estimateData.thirdLevelItems || {}
        
        if (Object.keys(savedThirdLevelItems).length > 0) {
          // 重算三级子项，使其与当前二级子项金额匹配
          const recalculatedItems = recalculateThirdLevelItems(savedThirdLevelItems)
          setThirdLevelItems(recalculatedItems)
          console.log('已重算三级子项以匹配当前二级子项:', recalculatedItems)
        }
      }
    } catch (error) {
      console.error('加载三级子项失败:', error)
    }
    
    // 打开弹窗
    setShowSubdivideModal(true)
  }

  // 保存估算数据到数据库（包含projectType）
  const saveEstimateToDatabase = async (estimateData: any) => {
    try {
      console.log('=== 开始保存估算数据到数据库 ===')
      console.log('项目ID:', id)
      console.log('估算数据包含partA:', !!estimateData?.partA)
      console.log('估算数据包含partG:', !!estimateData?.partG)
      console.log('三级子项数据:', estimateData.thirdLevelItems)
      console.log('项目类型:', projectType)
      
      // 更新项目修改时间（用于Dashboard显示）
      if (id) {
        setProjectUpdateTime(id)
      }
      
      // 确保数据结构完整 - 如果不完整，从原始数据构建
      let finalEstimateData = estimateData
      const isCompleteStructure = estimateData?.partA?.children?.length > 0 && 
                                   estimateData?.partG?.合计 > 0
      
      if (!isCompleteStructure && project) {
        console.log('⚠️ 估算数据结构不完整，将使用buildFullEstimateStructure构建完整结构')
        finalEstimateData = buildFullEstimateStructure(estimateData || {}, project)
        console.log('已构建完整结构，partA.children长度:', finalEstimateData?.partA?.children?.length)
      }
      
      // 确保数据结构正确，并包含projectType
      const saveData = {
        project_id: id!,
        estimate_data: {
          ...finalEstimateData,
          projectType: estimateData.projectType ?? projectType  // 保存项目类型（优先使用传入的值）
        }
      }
      
      console.log('保存到数据库的数据结构 - partA存在:', !!saveData.estimate_data.partA)
      console.log('保存到数据库的数据结构 - partG.合计:', saveData.estimate_data.partG?.合计)
      
      // 使用正确的API调用格式
      const response = await investmentApi.save(saveData)
      
      if (!response.success) {
        console.error('保存估算数据失败:', response.error)
        throw new Error(response.error || '保存失败')
      } else {
        console.log('✅ 估算数据已保存到数据库')
        console.log('保存的数据包含三级子项:', !!estimateData.thirdLevelItems)
        console.log('保存的项目类型:', projectType)
        if (estimateData.thirdLevelItems) {
          console.log('三级子项条目数:', Object.keys(estimateData.thirdLevelItems).length)
        }
      }
    } catch (error) {
      console.error('❌ 保存估算数据失败:', error)
      throw error
    }
  }

  // 生成投资构成信息文本
  const generateInvestmentSummaryText = (est: InvestmentEstimate | null): string => {
    if (!est) return ''
    
    const totalInvestment = est.partG?.合计 || 0
    const constructionCost = est.partA?.合计 || 0
    
    // partB包含：土地费用、建设单位管理费等
    const otherCost = est.partB?.合计 || 0
    
    // 🔍 查找基本预备费 - 由于后端数据结构问题，partD返回的是"基本预备费"
    // 先检查partB.children中是否有"基本预备费"，如果没有则从partD.合计获取
    let basicReserve = est.partB?.children?.find(c => 
      c.工程或费用名称?.includes('基本预备费') || 
      c.工程或费用名称 === '基本预备费'
    )?.合计 || 0
    
    // 如果partB.children中没有基本预备费，则从partD.合计获取（后端数据结构异常时的处理）
    if (basicReserve === 0 && est.partD?.工程或费用名称 === '基本预备费') {
      basicReserve = est.partD?.合计 || 0
    }
    
    // 工程建设其他费用 = partB合计（基本预备费在partD中）
    const otherExpenses = otherCost
    
    // 💰 建设期利息 - 由于后端数据结构问题，partD返回的是"基本预备费"，所以从partF.合计获取
    const constructionInterest = est.partF?.合计 || 0
    
    return `总投资${totalInvestment.toFixed(2)}万元，其中：工程费用${constructionCost.toFixed(2)}万元，工程建设其他费用${otherExpenses.toFixed(2)}万元，基本预备费${basicReserve.toFixed(2)}万元，建设期利息${constructionInterest.toFixed(2)}万元。`
  }

  // 生成资金来源信息文本
  const generateFundingSourceText = (est: InvestmentEstimate | null): string => {
    if (!est) return ''
    
    const totalInvestment = est.partG?.合计 || 0
    const loanAmount = Number(est.partF?.贷款总额) || 0
    const selfFundedAmount = totalInvestment - loanAmount
    const loanRatio = totalInvestment > 0 ? (loanAmount / totalInvestment * 100) : 0
    const selfRatio = totalInvestment > 0 ? (selfFundedAmount / totalInvestment * 100) : 0
    
    return `资金来源：申请银行贷款${loanAmount.toFixed(2)}万元，占投资估算总额的${loanRatio.toFixed(2)}%；业主多渠道筹集${selfFundedAmount.toFixed(2)}万元，占投资估算总额的${selfRatio.toFixed(2)}%。`
  }

  // [DEBUG] 生成建设规模信息文本（整合partA子项的备注，用于AI生成项目概况）
  const generateConstructionScaleText = (est: InvestmentEstimate | null): string => {
    if (!est?.partA?.children) {
      console.log('[generateConstructionScaleText] partA.children为空，返回空字符串')
      return ''
    }
    
    const remarks = est.partA.children
      .map((item, index) => {
        const remark = item.备注 || ''
        console.log(`[generateConstructionScaleText] 子项${index + 1} "${item.工程或费用名称}" - 备注: "${remark}"`)
        return remark
      })
      .filter(r => r && r.trim() !== '')
    
    const result = remarks.join('；')
    console.log(`[generateConstructionScaleText] 整合后的建设规模提示词: "${result}"`)
    
    return result
  }

  // 保存项目概况信息到localStorage和数据库
  const saveProjectOverviewInfo = async (est: InvestmentEstimate | null, projId: string) => {
    if (!est) {
      console.warn('[saveProjectOverviewInfo] estimate为空，跳过保存')
      return
    }
    
    // 生成各种文本信息
    const investmentSummary = generateInvestmentSummaryText(est)
    const fundingSource = generateFundingSourceText(est)
    const constructionScale = generateConstructionScaleText(est)
    
    console.log('[saveProjectOverviewInfo] 生成项目概况信息:')
    console.log('  信息1(投资构成):', investmentSummary)
    console.log('  信息2(资金来源):', fundingSource)
    console.log('  [DEBUG] 信息3(建设规模):', constructionScale)
    
    // 1. 保存到localStorage（作为备用和快速访问）
    const overviewInfo = {
      investmentSummary,
      fundingSource,
      constructionScale,  // [DEBUG] 保存建设规模信息
      savedAt: new Date().toISOString(),
      projectId: projId
    }
    localStorage.setItem(`project_overview_${projId}`, JSON.stringify(overviewInfo))
    console.log('[saveProjectOverviewInfo] 已保存到localStorage')
    
    // 2. 保存到数据库（持久化存储）
    // 将investmentSummary和fundingSource保存到investments表的estimate_data字段
    try {
      const saveData = {
        project_id: projId,
        estimate_data: {
          investmentSummary,
          fundingSource,
          constructionScale,  // [DEBUG] 保存建设规模信息到数据库
        }
      }
      const response = await investmentApi.save(saveData)
      if (response.success) {
        console.log('[saveProjectOverviewInfo] 已保存到数据库')
      } else {
        console.error('[saveProjectOverviewInfo] 保存到数据库失败:', response.error)
      }
    } catch (error) {
      console.error('[saveProjectOverviewInfo] 保存到数据库异常:', error)
    }
  }

  // 关闭并应用三级子项// 关闭并应用三级子项
  const closeAndApplyThirdLevelItems = async () => {
    if (!estimate?.partA?.children || !project) {
      setShowSubdivideModal(false)
      return
    }

    // 检查是否有三级子项数据
    const hasThirdLevelData = Object.keys(thirdLevelItems).length > 0
    
    if (!hasThirdLevelData) {
      setShowSubdivideModal(false)
      return
    }
    
    // 校验所有三级子项的占比总和是否为1
    let hasInvalidRatios = false
    for (const [parentIndex, items] of Object.entries(thirdLevelItems)) {
      if (items && items.length > 0) {
        for (const subItem of items) {
          const ratioSum = 
            (subItem.construction_ratio || 0) +
            (subItem.equipment_ratio || 0) +
            (subItem.installation_ratio || 0) +
            (subItem.other_ratio || 0)
          
          if (Math.abs(ratioSum - 1) > 0.001) {
            hasInvalidRatios = true
            notifications.show({
              title: '⚠️ 无法应用',
              message: `序号${estimate.partA.children[parseInt(parentIndex)].序号}的三级子项"${subItem.name}"费用占比总和为${ratioSum.toFixed(3)}，必须等于1`,
              color: 'orange',
              position: 'bottom-right',
              autoClose: 5000,
            })
            break
          }
        }
        if (hasInvalidRatios) break
      }
    }
    
    if (hasInvalidRatios) {
      return
    }

    setGenerating(true)
    setShowSubdivideModal(false)

    try {
      // 构造新的二级子项数据（包含三级子项计算结果）
      const updatedChildren = estimate.partA.children.map((item, index) => {
        const thirdItems = thirdLevelItems[index]
        if (!thirdItems || thirdItems.length === 0) {
          return item
        }

        // 计算三级子项的总费用
        let totalConstruction = 0
        let totalEquipment = 0
        let totalInstallation = 0
        let totalOther = 0
        let totalSum = 0

        thirdItems.forEach((subItem: any) => {
          const itemTotal = (subItem.quantity * subItem.unit_price) / 10000
          totalConstruction += itemTotal * subItem.construction_ratio
          totalEquipment += itemTotal * subItem.equipment_ratio
          totalInstallation += itemTotal * subItem.installation_ratio
          totalOther += itemTotal * subItem.other_ratio
          totalSum += itemTotal
        })

        return {
          ...item,
          建设工程费: Number(totalConstruction.toFixed(2)),
          设备购置费: Number(totalEquipment.toFixed(2)),
          安装工程费: Number(totalInstallation.toFixed(2)),
          其它费用: Number(totalOther.toFixed(2)),
          合计: Number(totalSum.toFixed(2)),
        }
      })

      // 构造tableItems参数
      const tableItems = updatedChildren.map((item) => ({
        name: item.工程或费用名称,
        construction_cost: item.建设工程费 || 0,
        equipment_cost: item.设备购置费 || 0,
        installation_cost: item.安装工程费 || 0,
        other_cost: item.其它费用 || 0,
        remark: item.备注 || ''
      }))

      // 调用API重新计算
      const response = await investmentApi.generateSummary(id!, tableItems)
      
      console.log('应用三级子项API响应:', response)

      if (response.success && response.data) {
        const newEstimate = response.data.summary
        
        // 检查二级子项的值是否发生了变化
        let hasChanges = false
        const itemsNeedResubdivide: number[] = []
        
        if (newEstimate.partA?.children) {
          newEstimate.partA.children.forEach((newItem: any, index: number) => {
            const oldItem = updatedChildren[index]
            if (oldItem) {
              // 比较各项费用是否有变化（误差大于0.01）
              const constDiff = Math.abs((newItem.建设工程费 || 0) - (oldItem.建设工程费 || 0))
              const equipDiff = Math.abs((newItem.设备购置费 || 0) - (oldItem.设备购置费 || 0))
              const instDiff = Math.abs((newItem.安装工程费 || 0) - (oldItem.安装工程费 || 0))
              const otherDiff = Math.abs((newItem.其它费用 || 0) - (oldItem.其它费用 || 0))
              const totalDiff = Math.abs((newItem.合计 || 0) - (oldItem.合计 || 0))
              
              if (constDiff > 0.01 || equipDiff > 0.01 || instDiff > 0.01 || otherDiff > 0.01 || totalDiff > 0.01) {
                hasChanges = true
                // 只有当该二级子项有三级子项时，才需要重新细分
                if (thirdLevelItems[index] && thirdLevelItems[index].length > 0) {
                  itemsNeedResubdivide.push(index)
                }
              }
            }
          })
        }
        
        setEstimate(newEstimate)
        
        // 如果有变化且有需要重新细分的项，则重新计算三级子项
        if (hasChanges && itemsNeedResubdivide.length > 0) {
          console.log(`检测到${itemsNeedResubdivide.length}个二级子项发生变化，重新计算三级子项`)
          console.log('变化的二级子项索引:', itemsNeedResubdivide)
          console.log('旧的二级子项数据:', updatedChildren)
          console.log('新的二级子项数据:', newEstimate.partA.children)
          
          // 对每个变化的二级子项，按比例调整其三级子项
          const newThirdLevelItems = { ...thirdLevelItems }
          
          itemsNeedResubdivide.forEach(index => {
            const oldItem = updatedChildren[index]
            const newItem = newEstimate.partA.children[index]
            const thirdItems = thirdLevelItems[index]
            
            if (!thirdItems || thirdItems.length === 0 || !oldItem || !newItem) return
            
            // 计算调整比例 - 根据合计的变化
            const oldTotal = oldItem.合计 || 0
            const newTotal = newItem.合计 || 0
            
            if (oldTotal === 0) return
            
            const ratio = newTotal / oldTotal
            
            console.log(`二级子项${index}：旧合计=${oldTotal}, 新合计=${newTotal}, 比例=${ratio}`)
            
            // 按比例调整每个三级子项的单价
            const adjustedThirdItems = thirdItems.map((subItem: any) => {
              return {
                ...subItem,
                unit_price: subItem.unit_price * ratio
              }
            })
            
            newThirdLevelItems[index] = adjustedThirdItems
          })
          
          // 更新三级子项
          setThirdLevelItems(newThirdLevelItems)
          
          console.log('三级子项已按比例调整，新的三级子项数据:', newThirdLevelItems)
          
          // 保存三级子项数据到数据库（包含当前项目类型）
          const estimateWithThirdLevel = {
            ...newEstimate,
            thirdLevelItems: newThirdLevelItems,
            projectType: projectType
          }
          await saveEstimateToDatabase(estimateWithThirdLevel)
          
          notifications.show({
            title: '✅ 应用成功',
            message: `三级子项数据已应用到投资简表，${itemsNeedResubdivide.length}个子项已按比例调整`,
            color: 'green',
            position: 'bottom-right',
            autoClose: 5000,
          })
        } else {
          // 保存三级子项数据到数据库（包含当前项目类型）
          const estimateWithThirdLevel = {
            ...newEstimate,
            thirdLevelItems: thirdLevelItems,
            projectType: projectType
          }
          await saveEstimateToDatabase(estimateWithThirdLevel)
          
          notifications.show({
            title: '✅ 应用成功',
            message: '三级子项数据已应用到投资简表',
            color: 'green',
            position: 'bottom-right',
            autoClose: 4000,
          })
        }
      } else {
        throw new Error(response.error || '应用失败')
      }
    } catch (error: any) {
      console.error('应用三级子项失败:', error)
      const errorMsg = error.response?.data?.error || error.message || '应用失败'
      notifications.show({
        title: '❌ 应用失败',
        message: errorMsg,
        color: 'red',
        position: 'bottom-right',
        autoClose: 6000,
      })
    } finally {
      setGenerating(false)
    }
  }

  // 应用百分比调整
  const applyPercentageAdjustment = (percentage: number) => {
    if (!singleItemTemp || editingSingleItemIndex === null) return
    
    // 获取原始值（从editingSubItems中）
    const originalItem = editingSubItems[editingSingleItemIndex!]
    const ratio = 1 + (percentage / 100)
    
    const adjusted = { ...singleItemTemp }
    adjusted.建设工程费 = (originalItem.建设工程费 || 0) * ratio
    adjusted.设备购置费 = (originalItem.设备购置费 || 0) * ratio
    adjusted.安装工程费 = (originalItem.安装工程费 || 0) * ratio
    adjusted.其它费用 = (originalItem.其它费用 || 0) * ratio
    adjusted.合计 = adjusted.建设工程费 + adjusted.设备购置费 + adjusted.安装工程费 + adjusted.其它费用
    
    setSingleItemTemp(adjusted)
    setAdjustmentPercentage(percentage)
  }

  // 应用单个子项的修改
  const applySingleItemEdit = () => {
    if (!singleItemTemp || editingSingleItemIndex === null) return
    
    const updated = [...editingSubItems]
    updated[editingSingleItemIndex] = { ...singleItemTemp }
    setEditingSubItems(updated)
    
    setShowEditSingleItem(false)
    setSingleItemTemp(null)
    setEditingSingleItemIndex(null)
    setAdjustmentPercentage(0)
    
    notifications.show({
      title: '✅ 修改成功',
      message: '子项已更新',
      color: 'green',
      position: 'bottom-right',
      autoClose: 3000,
    })
  }

  // 取消单个子项的编辑
  const cancelSingleItemEdit = () => {
    setShowEditSingleItem(false)
    setSingleItemTemp(null)
    setEditingSingleItemIndex(null)
    setAdjustmentPercentage(0)
  }

  // 打开修改土地费用对话框
  const openEditLandCost = () => {
    if (!estimate?.partB?.children) {
      notifications.show({
        title: '⚠️ 无法编辑',
        message: '还没有土地费用数据',
        color: 'orange',
        autoClose: 4000,
      })
      return
    }
    // 土地费用在partB.children中，序号为'11'
    const landItem = estimate.partB.children.find(item => item.序号 === '11')
    if (!landItem) {
      notifications.show({
        title: '⚠️ 无法编辑',
        message: '未找到土地费用数据',
        color: 'orange',
        autoClose: 4000,
      })
      return
    }
    setEditingLandCost({
      amount: landItem?.合计 || 0,
      remark: landItem?.备注 || ''
    })
    setShowEditLandCost(true)
  }

  // 应用土地费用修改
  const applyLandCostModification = async () => {
    if (!project) return

    setGenerating(true)
    setShowEditLandCost(false)

    try {
      // 调用API重新计算，传递土地费用
      const tableItems = extractCurrentTableItems()
      const response = await investmentApi.generateSummary(id!, tableItems, undefined, editingLandCost.amount)
      
      console.log('应用修改土地费用API响应:', response)

      if (response.success && response.data) {
        setEstimate(response.data.summary)
      } else {
        throw new Error(response.error || '应用修改失败')
      }
    } catch (error: any) {
      console.error('应用修改失败:', error)
      const errorMsg = error.response?.data?.error || error.message || '应用修改失败'
      notifications.show({
        title: '❌ 应用失败',
        message: errorMsg,
        color: 'red',
        position: 'bottom-right',
        autoClose: 6000,
      })
    } finally {
      setGenerating(false)
    }
  }

  // 打开修改贷款额对话框
  const openEditLoan = () => {
    if (!estimate?.partF) {
      notifications.show({
        title: '⚠️ 无法编辑',
        message: '还没有贷款数据',
        color: 'orange',
        autoClose: 4000,
      })
      return
    }
    const buildingInvestment = estimate?.partE?.合计 || 0
    const currentLoan = estimate?.partF?.贷款总额 || 0
    const projectRatio = (project?.loan_ratio || 0) * 100
    
    setEditingLoan({
      mode: 'amount',
      amount: currentLoan,
      ratio: projectRatio,
      roundingMode: 'tenMillion'
    })
    setShowEditLoan(true)
  }

  // 计算取整后的贷款金额
  const calculateRoundedLoanAmount = () => {
    if (!estimate) return 0
    
    const totalInvestment = estimate.partG?.合计 || 0
    let amount = 0
    
    if (editingLoan.mode === 'amount') {
      amount = editingLoan.amount
    } else {
      amount = totalInvestment * (editingLoan.ratio / 100)
      
      // 只在比例模式下应用取整
      if (editingLoan.roundingMode === 'million') {
        const amountInYuan = amount * 10000
        amount = Math.floor(amountInYuan / 1000000) * 100
      } else if (editingLoan.roundingMode === 'tenMillion') {
        const amountInYuan = amount * 10000
        amount = Math.floor(amountInYuan / 10000000) * 1000
      }
    }
    
    return amount
  }

  // 应用贷款额修改
  const applyLoanModification = async () => {
    if (!project) return

    setGenerating(true)
    setShowEditLoan(false)

    try {
      const finalLoanAmount = calculateRoundedLoanAmount()

      // 调用API重新计算，传递贷款额
      const tableItems = extractCurrentTableItems()
      const response = await investmentApi.generateSummary(id!, tableItems, finalLoanAmount, undefined)
      
      console.log('应用修改贷款额API响应:', response)

      if (response.success && response.data) {
        setEstimate(response.data.summary)
      } else {
        throw new Error(response.error || '应用修改失败')
      }
    } catch (error: any) {
      console.error('应用修改失败:', error)
      const errorMsg = error.response?.data?.error || error.message || '应用修改失败'
      notifications.show({
        title: '❌ 应用失败',
        message: errorMsg,
        color: 'red',
        position: 'bottom-right',
        autoClose: 6000,
      })
    } finally {
      setGenerating(false)
    }
  }

  // 检查子项是否有改变
  const hasSubItemsChanged = () => {
    if (!estimate?.partA?.children || editingSubItems.length === 0) return false
    const original = estimate.partA.children
    if (original.length !== editingSubItems.length) return true
    
    for (let i = 0; i < original.length; i++) {
      const orig = original[i]
      const edit = editingSubItems[i]
      if (orig.工程或费用名称 !== edit.工程或费用名称 ||
          (orig.建设工程费 || 0) !== (edit.建设工程费 || 0) ||
          (orig.设备购置费 || 0) !== (edit.设备购置费 || 0) ||
          (orig.安装工程费 || 0) !== (edit.安装工程费 || 0) ||
          (orig.其它费用 || 0) !== (edit.其它费用 || 0) ||
          (orig.备注 || '') !== (edit.备注 || '')) {
        return true
      }
    }
    return false
  }

  // 应用修改的子项并重新迭代
  const applySubItemsModification = async () => {
    if (!project || editingSubItems.length === 0) return

    setGenerating(true)
    setShowEditSubItems(false)

    try {
      // 转换为API需要的格式
      const formattedItems = editingSubItems.map(item => ({
        name: item.工程或费用名称,
        construction_cost: item.建设工程费 || 0,
        equipment_cost: item.设备购置费 || 0,
        installation_cost: item.安装工程费 || 0,
        other_cost: item.其它费用 || 0,
        remark: item.备注 || ''
      }))
      
      // 调用API应用修改的子项
      const response = await investmentApi.generateSummary(id!, formattedItems)
      console.log('应用修改子项API响应:', response)

      if (response.success && response.data) {
        setEstimate(response.data.summary)
        notifications.show({
          title: '✅ 修改完成',
          message: `子项已更新，迭代${response.data.summary.iterationCount}次，差距率${response.data.summary.gapRate?.toFixed(2) || 'N/A'}%`,
          color: 'green',
          position: 'bottom-right',
          autoClose: 4000,
        })
      } else {
        throw new Error(response.error || '应用修改失败')
      }
    } catch (error: any) {
      console.error('应用修改失败:', error)
      const errorMsg = error.response?.data?.error || error.message || '应用修改失败'
      notifications.show({
        title: '❌ 应用失败',
        message: errorMsg,
        color: 'red',
        position: 'bottom-right',
        autoClose: 6000,
      })
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text>加载中...</Text>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text>项目不存在</Text>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F7FA', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <LoadingOverlay visible={analyzingAI} message="🤖 AI正在分析工程子项..." />
      
      {/* Header */}
      <Header
        title="投资估算简表"
        subtitle="Investment Summary"
        icon="💰"
        height={70}
        showBackButton={true}
        backTo={`/project/${id}`}
      />

      {/* Main Content */}
      <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', padding: '16px', flex: 1 }}>
        
        {/* 固定在投资表左侧的操作按钮组 */}
        {estimate && (
          <div style={{
            position: 'fixed',
            left: 'calc(50% - 740px)',  // 位于投资估算简表卡片左侧边缘位置
            top: '280px',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',  // 缩小间距至8px
            alignItems: 'center'
          }}>
          {/* AI分析子项 */}
          <Tooltip label="AI分析子项" position="right" withArrow>
            <ActionIcon
              onClick={analyzeWithAI}
              disabled={analyzingAI || generating}
              size={40}  // 缩小20%：50→40
              radius={40}
              style={{ 
                backgroundColor: analyzingAI ? '#C9CDD4' : '#FFFFFF',
                color: analyzingAI ? '#FFFFFF' : '#165DFF',
                border: '1px solid #E5E6EB',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                transition: 'all 0.2s ease',
                width: '40px',  // 缩小20%：50→40
                height: '40px',  // 缩小20%：50→40
                borderRadius: '50%'
              }}
            >
              <Bot size={24} />  {/* 缩小20%：30→24 */}
            </ActionIcon>
          </Tooltip>
          
          {aiItems.length > 0 && (
            <Tooltip label={`查看AI建议(${aiItems.length}项)`} position="right" withArrow>
              <ActionIcon
                onClick={() => setShowAIPreview(true)}
                disabled={generating}
                size={40}  // 缩小20%：50→40
                radius={40}
                style={{ 
                  backgroundColor: '#FFFFFF',
                  color: '#52C41A',
                  border: '1px solid #E5E6EB',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.2s ease',
                  width: '40px',  // 缩小20%：50→40
                  height: '40px',  // 缩小20%：50→40
                  borderRadius: '50%'
                }}
              >
                <Clipboard size={24} />  {/* 缩小20%：30→24 */}
              </ActionIcon>
            </Tooltip>
          )}
          
          {estimate?.partA?.children && (
            <>
              <Tooltip label="修改子项" position="right" withArrow>
                <ActionIcon
                  onClick={openEditSubItems}
                  disabled={generating}
                  size={40}  // 缩小20%：50→40
                  radius={40}
                  style={{ 
                    backgroundColor: '#FFFFFF',
                    color: '#FF7A00',
                    border: '1px solid #E5E6EB',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.2s ease',
                    width: '40px',  // 缩小20%：50→40
                    height: '40px',  // 缩小20%：50→40
                    borderRadius: '50%'
                  }}
                >
                  <Pencil size={24} />  {/* 缩小20%：30→24 */}
                </ActionIcon>
              </Tooltip>
              
              <Tooltip label="修改土地费用" position="right" withArrow>
                <ActionIcon
                  onClick={openEditLandCost}
                  disabled={generating}
                  size={40}  // 缩小20%：50→40
                  radius={40}
                  style={{ 
                    backgroundColor: '#FFFFFF',
                    color: '#722ED1',
                    border: '1px solid #E5E6EB',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.2s ease',
                    width: '40px',  // 缩小20%：50→40
                    height: '40px',  // 缩小20%：50→40
                    borderRadius: '50%'
                  }}
                >
                  <MapPin size={24} />  {/* 缩小20%：30→24 */}
                </ActionIcon>
              </Tooltip>
              
              <Tooltip label="修改贷款额" position="right" withArrow>
                <ActionIcon
                  onClick={openEditLoan}
                  disabled={generating}
                  size={40}  // 缩小20%：50→40
                  radius={40}
                  style={{ 
                    backgroundColor: '#FFFFFF',
                    color: '#52C41A',
                    border: '1px solid #E5E6EB',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.2s ease',
                    width: '40px',  // 缩小20%：50→40
                    height: '40px',  // 缩小20%：50→40
                    borderRadius: '50%'
                  }}
                >
                  <IconCurrencyDollar size={24} stroke={1.5} />  {/* 缩小20%：30→24 */}
                </ActionIcon>
              </Tooltip>
            </>
          )}
          
          {/* 细分三级子项 */}
          {estimate?.partA?.children && estimate.partA.children.length > 0 && (
            <Tooltip label="三级子项" position="right" withArrow>
              <ActionIcon
                onClick={openSubdivideModal}
                disabled={generating || analyzingSubItem}
                size={40}  // 缩小20%：50→40
                radius={40}
                style={{ 
                  backgroundColor: '#FFFFFF',
                  color: '#1890FF',
                  border: '1px solid #E5E6EB',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.2s ease',
                  width: '40px',  // 缩小20%：50→40
                  height: '40px',  // 缩小20%：50→40
                  borderRadius: '50%'
                }}
              >
                <ZoomIn size={24} />  {/* 缩小20%：30→24 */}
              </ActionIcon>
            </Tooltip>
          )}
          
          {/* 分割线 */}
          <div style={{ 
            width: '24px',  // 缩小20%：30→24
            height: '1px', 
            backgroundColor: '#E5E6EB',
            margin: '6px 0'  // 稍微缩小
          }} />
          
          {/* 重新生成投资估算 */}
          <Tooltip label="重新生成投资估算" position="right" withArrow>
            <ActionIcon
              onClick={handleRegenerate}
              disabled={generating}
              size={40}  // 缩小20%：50→40
              radius={40}
              style={{ 
                backgroundColor: generating ? '#C9CDD4' : '#FFFFFF',
                color: generating ? '#FFFFFF' : '#52C41A',
                border: '1px solid #E5E6EB',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                transition: 'all 0.2s ease',
                width: '40px',  // 缩小20%：50→40
                height: '40px',  // 缩小20%：50→40
                borderRadius: '50%'
              }}
            >
              <RotateCw size={24} />  {/* 缩小20%：30→24 */}
            </ActionIcon>
          </Tooltip>
          
          {/* 导出Excel */}
          <Tooltip label="导出Excel" position="right" withArrow>
            <ActionIcon
              onClick={exportToExcel}
              disabled={!estimate}
              size={40}  // 缩小20%：50→40
              radius={40}
              style={{ 
                backgroundColor: '#FFFFFF',
                color: '#165DFF',
                border: '1px solid #E5E6EB',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                transition: 'all 0.2s ease',
                width: '40px',  // 缩小20%：50→40
                height: '40px',  // 缩小20%：50→40
                borderRadius: '50%'
              }}
            >
              <FileSpreadsheet size={24} />  {/* 缩小20%：30→24 */}
            </ActionIcon>
          </Tooltip>
          
          {/* 收入及成本预测 */}
          <Tooltip 
            label={!estimate || Math.abs(estimate.gapRate) >= 1.5 ? "差距率≥1.5%时禁止使用" : "收入及成本预测"} 
            position="right" 
            withArrow
          >
            <ActionIcon
              onClick={async () => {
                if (estimate && Math.abs(estimate.gapRate) < 1.5) {
                  // 先保存项目概况信息到localStorage和数据库
                  await saveProjectOverviewInfo(estimate, id!)
                  
                  // 自动保存投资估算数据（包含当前项目类型）
                  try {
                    const estimateWithThirdLevel = {
                      ...estimate,
                      thirdLevelItems: thirdLevelItems,
                      projectType: projectType
                    }
                    await saveEstimateToDatabase(estimateWithThirdLevel)
                    console.log('[收入成本预测] 投资估算数据已保存到数据库')
                  } catch (error) {
                    console.error('保存投资估算数据失败:', error)
                  }
                  // 跳转到收入成本预测页面
                  navigate(`/revenue-cost/${id}`)
                }
              }}
              disabled={!estimate || Math.abs(estimate.gapRate) >= 1.5}
              size={40}  // 缩小20%：50→40
              radius={40}
              style={{ 
                backgroundColor: (!estimate || Math.abs(estimate.gapRate) >= 1.5) ? '#F2F3F5' : '#FFFFFF',
                color: (!estimate || Math.abs(estimate.gapRate) >= 1.5) ? '#C9CDD4' : '#F7BA1E',
                border: '1px solid #E5E6EB',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                transition: 'all 0.2s ease',
                width: '40px',  // 缩小20%：50→40
                height: '40px',  // 缩小20%：50→40
                borderRadius: '50%',
                cursor: (!estimate || Math.abs(estimate.gapRate) >= 1.5) ? 'not-allowed' : 'pointer'
              }}
            >
              <IconChartBar size={24} stroke={1.5} />  {/* 缩小20%：30→24 */}
            </ActionIcon>
          </Tooltip>
        </div>
      )}
        
        <Stack gap="lg">
          {/* 项目信息卡片 */}
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB', width: '100%' }}>
            <Group justify="space-between" align="center">
              <div>
                <Title order={4} c="#1D2129" style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                  {project.project_name}
                </Title>
                <Group gap="lg">
                  <Text size="sm" c="#86909C">目标总投资：<Text span fw={600} c="#1D2129">{project.total_investment}万元</Text></Text>
                  <Text size="sm" c="#86909C">建设期：<Text span fw={600} c="#1D2129">{project.construction_years}年</Text></Text>
                  <Text size="sm" c="#86909C">运营期：<Text span fw={600} c="#1D2129">{project.operation_years}年</Text></Text>
                  <Text size="sm" c="#86909C">贷款比例：<Text span fw={600} c="#1D2129">{(project.loan_ratio * 100).toFixed(1)}%</Text></Text>
                  <Text size="sm" c="#86909C">年利率：<Text span fw={600} c="#1D2129">{(project.loan_interest_rate * 100).toFixed(2)}%</Text></Text>
                </Group>
              </div>
            </Group>
          </Card>

          {/* 投资估算表格 */}
          {!estimate ? (
            <Card shadow="sm" padding="xl" radius="md" withBorder style={{ borderColor: '#E5E6EB' }}>
              <Stack align="center" gap="xl" py="xl">
                <div style={{ fontSize: '64px', opacity: 0.3 }}>📊</div>
                <div style={{ textAlign: 'center' }}>
                  <Text c="#1D2129" size="lg" fw={500} mb="xs">还没有投资估算</Text>
                  <Text c="#86909C" size="sm">点击上方按钮开始生成投资估算简表</Text>
                </div>
              </Stack>
            </Card>
          ) : (
            <Stack gap="md">
              {/* 迭代信息 */}
              {estimate ? (
<Card 
  shadow="sm" 
  padding="md" 
  radius="md" 
  withBorder 
  style={{ borderColor: '#E5E6EB', width: '100%' }}
>
  {/* 关键修改：justify 从 center 改为 start（靠左对齐） */}
  {/* 可选：加 ml="0" 或 style={{ marginLeft: 0 }} 消除默认左间距（按需） */}
  <Group gap="30px" align="center" justify="start" style={{ width: '100%' }}>
    <div style={{ textAlign: 'center' }}>
      <Text size="xs" c="#86909C" mb={4}>迭代次数</Text>
      <Text size="lg" fw={600} c="#165DFF">{estimate?.iterationCount || 0} 次</Text>
    </div>
    <div style={{ textAlign: 'center' }}>
      <Text size="xs" c="#86909C" mb={4}>差距率</Text>
      <Text size="lg" fw={600} c={(project?.total_investment ?? 0) > (estimate?.partG?.合计 || 0) ? '#00C48C' : '#FF4D4F'}>
        {estimate?.gapRate !== undefined && estimate?.gapRate !== null 
          ? `${estimate.gapRate < 0 ? '-' : '+'}${Math.abs(estimate.gapRate).toFixed(2)}%`
          : 'N/A'}
      </Text>
    </div>
    <div style={{ textAlign: 'center' }}>
      <Text size="xs" c="#86909C" mb={4}>目标总投资</Text>
      <Text size="lg" fw={600} c="#1D2129">{Number(project?.total_investment ?? 0).toFixed(2)} 万元</Text>
    </div>
    <div style={{ textAlign: 'center' }}>
      <Text size="xs" c="#86909C" mb={4}>项目总资金</Text>
      <Text size="lg" fw={600} c="#165DFF">{estimate?.partG?.合计?.toFixed(2) || 0} 万元</Text>
    </div>
    <div style={{ textAlign: 'center' }}>
      <Text size="xs" c="#86909C" mb={4}>建设期利息</Text>
      <Text size="lg" fw={600} c="#1D2129">{estimate?.partF?.合计?.toFixed(2) || 0} 万元</Text>
    </div>
    <div style={{ textAlign: 'center' }}>
      <Tooltip label="查看建设期利息详情" position="top" withArrow>
        <ActionIcon
          onClick={() => setShowConstructionInterestModal(true)}
          size={32}
          radius={32}
          style={{
            backgroundColor: '#F0F5FF',
            color: '#165DFF',
            border: '1px solid #CCE0FF',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.2s ease',
            width: '32px',
            height: '32px',
            borderRadius: '50%'
          }}
        >
          <Receipt size={18} />
        </ActionIcon>
      </Tooltip>

    </div>
    
    {/* 项目类型选择 - 控制市政公用设施费 */}
    <div style={{ textAlign: 'center' }}>
      <Text size="xs" c="#86909C" mb={4}>项目类型</Text>
      <Group gap="xs" justify="center" align="center">
        <Text size="sm" c={projectType === 'agriculture' ? '#52C41A' : '#4E5969'} fw={projectType === 'agriculture' ? 600 : 400}>农业</Text>
        <Switch
          size="xs"
          checked={projectType === 'construction'}
          onChange={(e) => handleProjectTypeChange(e.currentTarget.checked ? 'construction' : 'agriculture')}
          disabled={generating}
          color="#165DFF"
          styles={{
            track: {
              backgroundColor: projectType === 'construction' ? '#165DFF' : '#E5E6EB',
            }
          }}
        />
        <Text size="sm" c={projectType === 'construction' ? '#165DFF' : '#4E5969'} fw={projectType === 'construction' ? 600 : 400}>建筑</Text>
      </Group>
      <Text size="xs" c={projectType === 'agriculture' ? '#52C41A' : '#165DFF'} mt={4} fw={500}>
        {projectType === 'agriculture' ? '免市政费' : '市政费1.5%'}
      </Text>
    </div>
  </Group>
</Card>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#86909C' }}>
                  <Text>正在加载投资估算数据...</Text>
                </div>
              )}

              {/* 投资估算简表 - 完整表格 */}
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB' }}>
                {/* 
  // 临时注释：隐藏投资估算简表标题
  <Text size="sm" c="#1D2129" fw={600} mb="md">投资估算简表</Text>
  */}
                {estimate && estimate.partA && estimate.partB && estimate.partC && estimate.partD && estimate.partE && estimate.partG ? (
                  <Table withTableBorder withColumnBorders style={{ fontSize: '13px', tableLayout: 'fixed', width: '100%' }}>
                    <Table.Thead>
                      <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
                        <Table.Th style={{ ...columnStyles.sequence, minWidth: columnStyles.sequence.width, maxWidth: columnStyles.sequence.width }}>序号</Table.Th>
                        <Table.Th style={{ ...columnStyles.name, textAlign: 'center', minWidth: columnStyles.name.width, maxWidth: columnStyles.name.width }}>工程或费用名称</Table.Th>
                        <Table.Th style={{ ...columnStyles.construction, minWidth: columnStyles.construction.width, maxWidth: columnStyles.construction.width }}>建设工程费<br />（万元）</Table.Th>
                        <Table.Th style={{ ...columnStyles.equipment, minWidth: columnStyles.equipment.width, maxWidth: columnStyles.equipment.width }}>设备购置费<br />（万元）</Table.Th>
                        <Table.Th style={{ ...columnStyles.installation, minWidth: columnStyles.installation.width, maxWidth: columnStyles.installation.width }}>安装工程费<br />（万元）</Table.Th>
                        <Table.Th style={{ ...columnStyles.other, minWidth: columnStyles.other.width, maxWidth: columnStyles.other.width }}>其它费用<br />（万元）</Table.Th>
                        <Table.Th style={{ ...columnStyles.total, minWidth: columnStyles.total.width, maxWidth: columnStyles.total.width }}>合计<br />（万元）</Table.Th>
                        <Table.Th style={{ ...columnStyles.unit, minWidth: columnStyles.unit.width, maxWidth: columnStyles.unit.width }}>单位</Table.Th>
                        <Table.Th style={{ ...columnStyles.quantity, minWidth: columnStyles.quantity.width, maxWidth: columnStyles.quantity.width }}>数量</Table.Th>
                        <Table.Th style={{ ...columnStyles.unitPrice, minWidth: columnStyles.unitPrice.width, maxWidth: columnStyles.unitPrice.width }}>单位价值<br />（元）</Table.Th>
                        <Table.Th style={{ ...columnStyles.ratio, minWidth: columnStyles.ratio.width, maxWidth: columnStyles.ratio.width }}>占总投资<br />比例</Table.Th>
                        <Table.Th style={{ ...columnStyles.remark, textAlign: 'center', minWidth: columnStyles.remark.width, maxWidth: columnStyles.remark.width }}>备注</Table.Th>
                      </Table.Tr>
                    </Table.Thead>

                    <Table.Tbody>
                      {/* A部分主行 - 使用预处理数据 */}
                      <Table.Tr style={{ backgroundColor: '#FFFFFF', fontWeight: 700 }}>
                        <Table.Td style={{ ...columnStyles.sequence }}>{estimate.partA.序号}</Table.Td>
                        <Table.Td style={{ ...columnStyles.name }}>{estimate.partA.工程或费用名称}</Table.Td>
                        <Table.Td style={{ ...columnStyles.construction }}>{(processedTableData?.partATotal?.construction || 0).toFixed(2)}</Table.Td>
                        <Table.Td style={{ ...columnStyles.equipment }}>{(processedTableData?.partATotal?.equipment || 0).toFixed(2)}</Table.Td>
                        <Table.Td style={{ ...columnStyles.installation }}>{(processedTableData?.partATotal?.installation || 0).toFixed(2)}</Table.Td>
                        <Table.Td style={{ ...columnStyles.other }}>{(processedTableData?.partATotal?.other || 0).toFixed(2)}</Table.Td>
                        <Table.Td style={{ ...columnStyles.total, fontWeight: 700 }}>
                          {estimate.partA.合计?.toFixed(2) || '0.00'}
                        </Table.Td>
                        <Table.Td style={{ ...columnStyles.unit }}></Table.Td>
                        <Table.Td style={{ ...columnStyles.quantity }}></Table.Td>
                        <Table.Td style={{ ...columnStyles.unitPrice }}></Table.Td>
                        <Table.Td style={{ ...columnStyles.ratio, fontWeight: 700 }}>
                          {estimate.partG?.合计 && estimate.partG?.合计 > 0
                            ? `${(((estimate.partA.合计 || 0) / estimate.partG?.合计) * 100).toFixed(2)}%`
                            : ''}
                        </Table.Td>
                        <Table.Td style={{ ...columnStyles.remark }}>{estimate.partA.备注}</Table.Td>
                      </Table.Tr>
                      {/* A部分子项 */}
                      {estimate.partA.children?.map((item, index) => (
                        <React.Fragment key={`A-${index}`}>
                          {/* 二级子项 */}
                          <Table.Tr>
                            <Table.Td style={{ ...columnStyles.sequence }}>{item.序号}</Table.Td>
                            <Table.Td style={{ ...columnStyles.name }}>{item.工程或费用名称}</Table.Td>
                            <Table.Td style={{ ...columnStyles.construction }}>{item.建设工程费?.toFixed(2) || '0.00'}</Table.Td>
                            <Table.Td style={{ ...columnStyles.equipment }}>{item.设备购置费?.toFixed(2) || '0.00'}</Table.Td>
                            <Table.Td style={{ ...columnStyles.installation }}>{item.安装工程费?.toFixed(2) || '0.00'}</Table.Td>
                            <Table.Td style={{ ...columnStyles.other }}>{item.其它费用?.toFixed(2) || '0.00'}</Table.Td>
                            <Table.Td style={{ ...columnStyles.total }}>{item.合计?.toFixed(2) || '0.00'}</Table.Td>
                            <Table.Td style={{ ...columnStyles.unit }}></Table.Td>
                            <Table.Td style={{ ...columnStyles.quantity }}></Table.Td>
                            <Table.Td style={{ ...columnStyles.unitPrice }}></Table.Td>
                            <Table.Td style={{ ...columnStyles.ratio }}>
                              {estimate.partG?.合计 && estimate.partG?.合计 > 0
                                ? `${(((item.合计 || 0) / estimate.partG?.合计) * 100).toFixed(2)}%`
                                : ''}
                            </Table.Td>
                            <Table.Td style={{ ...columnStyles.remark, fontSize: '11px' }}>{item.备注 || ''}</Table.Td>
                          </Table.Tr>

                          {/* 三级子项 */}
                          {thirdLevelItems[index]?.map((subItem: any, subIndex: number) => {
                            const totalPrice = (subItem.quantity * subItem.unit_price) / 10000
                            const constructionCost = totalPrice * subItem.construction_ratio
                            const equipmentCost = totalPrice * subItem.equipment_ratio
                            const installationCost = totalPrice * subItem.installation_ratio
                            const otherCost = totalPrice * subItem.other_ratio
                            
                            return (
                              <Table.Tr key={`A-${index}-${subIndex}`}>
                                <Table.Td style={{ ...columnStyles.sequence, fontSize: '11px' }}>{subIndex + 1}</Table.Td>
                                <Table.Td style={{ ...columnStyles.name, fontSize: '11px', paddingLeft: '24px' }}>{subItem.name}</Table.Td>
                                <Table.Td style={{ ...columnStyles.construction, fontSize: '11px' }}>{constructionCost > 0 ? constructionCost.toFixed(2) : ''}</Table.Td>
                                <Table.Td style={{ ...columnStyles.equipment, fontSize: '11px' }}>{equipmentCost > 0 ? equipmentCost.toFixed(2) : ''}</Table.Td>
                                <Table.Td style={{ ...columnStyles.installation, fontSize: '11px' }}>{installationCost > 0 ? installationCost.toFixed(2) : ''}</Table.Td>
                                <Table.Td style={{ ...columnStyles.other, fontSize: '11px' }}>{otherCost > 0 ? otherCost.toFixed(2) : ''}</Table.Td>
                                <Table.Td style={{ ...columnStyles.total, fontSize: '11px' }}>{totalPrice > 0 ? totalPrice.toFixed(2) : ''}</Table.Td>
                                <Table.Td style={{ ...columnStyles.unit, fontSize: '11px' }}>{subItem.unit || ''}</Table.Td>
                                <Table.Td style={{ ...columnStyles.quantity, fontSize: '11px' }}>{formatQuantity(subItem.quantity, subItem.unit)}</Table.Td>
                                <Table.Td style={{ ...columnStyles.unitPrice, fontSize: '11px' }}>{subItem.unit_price > 0 ? subItem.unit_price.toFixed(2) : ''}</Table.Td>
                                <Table.Td style={{ ...columnStyles.ratio, fontSize: '11px' }}>
                                  {estimate.partG?.合计 && estimate.partG?.合计 > 0
                                    ? `${((totalPrice / estimate.partG?.合计) * 100).toFixed(2)}%`
                                    : ''}
                                </Table.Td>
                                <Table.Td style={{ ...columnStyles.remark, fontSize: '11px' }}></Table.Td>
                              </Table.Tr>
                            )
                          })}
                        </React.Fragment>
                      ))}

                      {/* B部分主行 - 使用预处理数据 */}
                      <Table.Tr style={{ backgroundColor: '#FFFFFF', fontWeight: 700 }}>
                        <Table.Td style={{ ...columnStyles.sequence }}>{estimate.partB.序号}</Table.Td>
                        <Table.Td style={{ ...columnStyles.name }}>{estimate.partB.工程或费用名称}</Table.Td>
                        <Table.Td style={{ ...columnStyles.construction }}>0.00</Table.Td>
                        <Table.Td style={{ ...columnStyles.equipment }}>0.00</Table.Td>
                        <Table.Td style={{ ...columnStyles.installation }}>0.00</Table.Td>
                        <Table.Td style={{ ...columnStyles.other }}>{(processedTableData?.partBTotal || 0).toFixed(2)}</Table.Td>
                        <Table.Td style={{ ...columnStyles.total, fontWeight: 700 }}>
                          {typeof estimate.partB.合计 === 'number' ? estimate.partB.合计.toFixed(2) : '0.00'}
                        </Table.Td>
                        <Table.Td style={{ ...columnStyles.unit }}></Table.Td>
                        <Table.Td style={{ ...columnStyles.quantity }}></Table.Td>
                        <Table.Td style={{ ...columnStyles.unitPrice }}></Table.Td>
                        <Table.Td style={{ ...columnStyles.ratio, fontWeight: 700 }}>
                          {estimate.partG?.合计 && estimate.partG?.合计 > 0
                            ? `${(((estimate.partB.合计 || 0) / estimate.partG?.合计) * 100).toFixed(2)}%`
                            : ''}
                        </Table.Td>
                        <Table.Td style={{ ...columnStyles.remark }}>{estimate.partB.备注}</Table.Td>
                      </Table.Tr>
                      {/* B部分子项 */}
                      {estimate.partB.children?.map((item, index) => (
                        <Table.Tr key={`B-${index}`}>
                          <Table.Td style={{ ...columnStyles.sequence }}>{item.序号}</Table.Td>
                          <Table.Td style={{ ...columnStyles.name }}>{item.工程或费用名称}</Table.Td>
                          <Table.Td style={{ ...columnStyles.construction }}></Table.Td>
                          <Table.Td style={{ ...columnStyles.equipment }}></Table.Td>
                          <Table.Td style={{ ...columnStyles.installation }}></Table.Td>
                          <Table.Td style={{ ...columnStyles.other }}>{item.其它费用?.toFixed(2) || item.合计?.toFixed(2) || '0.00'}</Table.Td>
                          <Table.Td style={{ ...columnStyles.total }}>
                            {typeof item.合计 === 'number' ? item.合计.toFixed(2) : '0.00'}
                          </Table.Td>
                          <Table.Td style={{ ...columnStyles.unit }}></Table.Td>
                          <Table.Td style={{ ...columnStyles.quantity }}></Table.Td>
                          <Table.Td style={{ ...columnStyles.unitPrice }}></Table.Td>
                          <Table.Td style={{ ...columnStyles.ratio }}>
                            {estimate.partG?.合计 && estimate.partG?.合计 > 0
                              ? `${(((item.合计 || item.其它费用 || 0) / estimate.partG?.合计) * 100).toFixed(2)}%`
                              : ''}
                          </Table.Td>
                          <Table.Td style={{ ...columnStyles.remark, fontSize: '13px' }}>{item.备注}</Table.Td>
                        </Table.Tr>
                      ))}

                    {/* C部分 - 使用预处理数据 */}
                    <Table.Tr style={{ backgroundColor: '#FFFFFF', fontWeight: 700 }}>
                      <Table.Td style={{ ...columnStyles.sequence }}>{estimate.partC.序号}</Table.Td>
                      <Table.Td style={{ ...columnStyles.name }}>{estimate.partC.工程或费用名称}</Table.Td>
                      <Table.Td style={{ ...columnStyles.construction }}>{(processedTableData?.partATotal?.construction || 0).toFixed(2)}</Table.Td>
                      <Table.Td style={{ ...columnStyles.equipment }}>{(processedTableData?.partATotal?.equipment || 0).toFixed(2)}</Table.Td>
                      <Table.Td style={{ ...columnStyles.installation }}>{(processedTableData?.partATotal?.installation || 0).toFixed(2)}</Table.Td>
                      <Table.Td style={{ ...columnStyles.other }}>{(processedTableData?.partCTotalOther || 0).toFixed(2)}</Table.Td>
                      <Table.Td style={{ ...columnStyles.total, fontWeight: 700 }}>
                        {typeof estimate.partC.合计 === 'number' ? estimate.partC.合计.toFixed(2) : '0.00'}
                      </Table.Td>
                      <Table.Td style={{ ...columnStyles.unit }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.quantity }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.unitPrice }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.ratio, fontWeight: 700 }}>
                        {estimate.partG?.合计 && estimate.partG?.合计 > 0
                          ? `${(((estimate.partC.合计 || 0) / estimate.partG?.合计) * 100).toFixed(2)}%`
                          : ''}
                      </Table.Td>
                      <Table.Td style={{ ...columnStyles.remark }}>{estimate.partC.备注}</Table.Td>
                    </Table.Tr>

                    {/* D部分 - 白色背景 */}
                    <Table.Tr style={{ backgroundColor: '#FFFFFF', fontWeight: 700 }}>
                      <Table.Td style={{ ...columnStyles.sequence }}>{estimate.partD.序号}</Table.Td>
                      <Table.Td style={{ ...columnStyles.name }}>{estimate.partD.工程或费用名称}</Table.Td>
                      <Table.Td style={{ ...columnStyles.construction }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.equipment }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.installation }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.other }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.total, fontWeight: 700 }}>
                        {typeof estimate.partD.合计 === 'number' ? estimate.partD.合计.toFixed(2) : '0.00'}
                      </Table.Td>
                      <Table.Td style={{ ...columnStyles.unit }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.quantity }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.unitPrice }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.ratio, fontWeight: 700 }}>
                        {estimate.partG?.合计 && estimate.partG?.合计 > 0
                          ? `${(((estimate.partD.合计 || 0) / estimate.partG?.合计) * 100).toFixed(2)}%`
                          : ''}
                      </Table.Td>
                      <Table.Td style={{ ...columnStyles.remark }}>{estimate.partD.备注}</Table.Td>
                    </Table.Tr>

                    {/* E部分 - 白色背景 */}
                    <Table.Tr style={{ backgroundColor: '#FFFFFF', fontWeight: 700 }}>
                      <Table.Td style={{ ...columnStyles.sequence }}>{estimate.partE.序号}</Table.Td>
                      <Table.Td style={{ ...columnStyles.name }}>{estimate.partE.工程或费用名称}</Table.Td>
                      <Table.Td style={{ ...columnStyles.construction }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.equipment }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.installation }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.other }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.total, fontWeight: 700 }}>
                        {typeof estimate.partE.合计 === 'number' ? estimate.partE.合计.toFixed(2) : '0.00'}
                      </Table.Td>
                      <Table.Td style={{ ...columnStyles.unit }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.quantity }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.unitPrice }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.ratio, fontWeight: 700 }}>
                        {estimate.partG?.合计 && estimate.partG?.合计 > 0
                          ? `${(((estimate.partE.合计 || 0) / estimate.partG?.合计) * 100).toFixed(2)}%`
                          : ''}
                      </Table.Td>
                      <Table.Td style={{ ...columnStyles.remark, fontSize: '11px' }}>{estimate.partE.备注}</Table.Td>
                    </Table.Tr>

                    {/* F部分 - 白色背景，带详细贷款信息 */}
                    <Table.Tr style={{ backgroundColor: '#FFFFFF', fontWeight: 700 }}>
                      <Table.Td style={{ ...columnStyles.sequence }}>F</Table.Td>
                      <Table.Td style={{ ...columnStyles.name }}>建设期利息</Table.Td>
                      <Table.Td style={{ ...columnStyles.construction }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.equipment }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.installation }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.other }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.total, fontWeight: 700 }}>
                        {estimate?.partF?.合计?.toFixed(2) || '0.00'}
                      </Table.Td>
                      <Table.Td style={{ ...columnStyles.unit }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.quantity }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.unitPrice }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.ratio, fontWeight: 700 }}>
                        {estimate.partG?.合计 && estimate.partG?.合计 > 0
                          ? `${(((estimate?.partF?.合计 || 0) / estimate.partG?.合计) * 100).toFixed(2)}%`
                          : ''}
                      </Table.Td>
                      <Table.Td style={{ ...columnStyles.remark, fontSize: '11px' }}>
                        <div>贷款总额: {(Number(estimate?.partF?.贷款总额) || 0).toFixed(2)}万元 (占总投资{((Number(estimate?.partF?.贷款总额) || 0) / (estimate.partG?.合计 || 1) * 100).toFixed(2)}%)</div>
                        <div>年利率: {((estimate?.partF?.年利率 || 0) * 100).toFixed(1)}%</div>
                        <div>建设期: {estimate?.partF?.建设期年限}年</div>
                        {estimate?.partF?.分年利息?.length > 0 && (
                          <div style={{ marginTop: '4px' }}>
                            <div>各年利息计算:</div>
                            {estimate?.partF?.分年利息?.map((year, idx) => (
                              <div key={idx} style={{ fontSize: '10px', color: '#666' }}>
                                第{year.年份}年: ({Number(year.期初本金累计 || 0).toFixed(2)} + {Number(year.当期借款金额 || 0).toFixed(2)} ÷ 2) × {((estimate?.partF?.年利率 || 0) * 100).toFixed(1)}% = {Number(year.当期利息 || 0).toFixed(2)}万元
                              </div>
                            ))}
                          </div>
                        )}
                      </Table.Td>
                    </Table.Tr>

                    {/* G部分 - 白色背景 */}
                    <Table.Tr style={{ backgroundColor: '#FFFFFF', fontWeight: 700 }}>
                      <Table.Td style={{ ...columnStyles.sequence, fontSize: '15px', color: '#165DFF' }}>{estimate.partG?.序号}</Table.Td>
                      <Table.Td style={{ ...columnStyles.name, fontSize: '15px', color: '#165DFF' }}>{estimate.partG?.工程或费用名称}</Table.Td>
                      <Table.Td style={{ ...columnStyles.construction, fontSize: '15px', color: '#165DFF' }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.equipment, fontSize: '15px', color: '#165DFF' }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.installation, fontSize: '15px', color: '#165DFF' }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.other, fontSize: '15px', color: '#165DFF' }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.total, fontWeight: 700, fontSize: '15px', color: '#165DFF' }}>
                        {typeof estimate.partG?.合计 === 'number' ? estimate.partG?.合计.toFixed(2) : '0.00'}
                      </Table.Td>
                      <Table.Td style={{ ...columnStyles.unit, fontSize: '15px', color: '#165DFF' }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.quantity, fontSize: '15px', color: '#165DFF' }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.unitPrice, fontSize: '15px', color: '#165DFF' }}></Table.Td>
                      <Table.Td style={{ ...columnStyles.ratio, fontWeight: 700, fontSize: '15px', color: '#165DFF' }}>100.00%</Table.Td>
                      <Table.Td style={{ ...columnStyles.remark, fontSize: '15px', color: '#165DFF' }}>{estimate.partG?.备注}</Table.Td>
                    </Table.Tr>
                  </Table.Tbody>
                </Table>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#86909C' }}>
                  <Text>正在加载投资估算数据...</Text>
                </div>
              )}
              </Card>
            </Stack>
          )}
        </Stack>
      </div>

      {/* AI分析预览Modal */}
      <Modal
        opened={showAIPreview}
        onClose={() => setShowAIPreview(false)}
        title="🤖 AI工程子项分析结果"
        size="xl"
        styles={{
          title: { fontWeight: 600, fontSize: '18px', color: '#1D2129' }
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="#86909C">
            AI根据项目信息生成了以下工程子项建议。您可以直接编辑费用数据或删除不需要的子项，然后点击"🚀 应用"将修改后的数据应用到投资估算表中。
          </Text>
          <Table withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
                <Table.Th style={{ textAlign: 'center', width: '60px' }}>操作</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>子项名称</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>建设工程费(万元)</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>设备购置费(万元)</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>安装工程费(万元)</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>其它费用(万元)</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>合计(万元)</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>备注</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {aiItems.map((item, index) => {
                const isEditing = editingItem === index
                const currentItem = isEditing ? tempEditItem : item
                
                return (
                  <Table.Tr key={index}>
                    <Table.Td style={{ textAlign: 'center' }}>
                      {isEditing ? (
                        <Group gap={4} justify="center">
                          <ActionIcon
                            size="sm"
                            color="green"
                            onClick={() => saveEditItem(index)}
                            variant="light"
                          >
                            <Check size={14} />
                          </ActionIcon>
                          <ActionIcon
                            size="sm"
                            color="red"
                            onClick={cancelEdit}
                            variant="light"
                          >
                            <X size={14} />
                          </ActionIcon>
                        </Group>
                      ) : (
                        <Group gap={4} justify="center">
                          <Tooltip label="编辑">
                            <ActionIcon
                              size="sm"
                              color="blue"
                              onClick={() => startEditItem(index)}
                              variant="light"
                            >
                              <IconEdit size={14} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="删除">
                            <ActionIcon
                              size="sm"
                              color="red"
                              onClick={() => deleteItem(index)}
                              variant="light"
                            >
                              <Trash size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {isEditing ? (
                        <TextInput
                          size="xs"
                          value={currentItem.name}
                          onChange={(e) => updateEditItem('name', e.target.value)}
                          style={{ width: '100%' }}
                        />
                      ) : (
                        item.name
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <NumberInput
                          size="xs"
                          value={currentItem.construction_cost}
                          onChange={(value) => updateEditItem('construction_cost', value || 0)}
                          style={{ width: '100px' }}
                          decimalScale={2}
                        />
                      ) : (
                        item.construction_cost.toFixed(2)
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <NumberInput
                          size="xs"
                          value={currentItem.equipment_cost}
                          onChange={(value) => updateEditItem('equipment_cost', value || 0)}
                          style={{ width: '100px' }}
                          decimalScale={2}
                        />
                      ) : (
                        item.equipment_cost.toFixed(2)
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <NumberInput
                          size="xs"
                          value={currentItem.installation_cost}
                          onChange={(value) => updateEditItem('installation_cost', value || 0)}
                          style={{ width: '100px' }}
                          decimalScale={2}
                        />
                      ) : (
                        item.installation_cost.toFixed(2)
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <NumberInput
                          size="xs"
                          value={currentItem.other_cost}
                          onChange={(value) => updateEditItem('other_cost', value || 0)}
                          style={{ width: '100px' }}
                          decimalScale={2}
                        />
                      ) : (
                        item.other_cost.toFixed(2)
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {(currentItem.construction_cost + currentItem.equipment_cost + currentItem.installation_cost + currentItem.other_cost).toFixed(2)}
                    </Table.Td>
                    <Table.Td style={{ fontSize: '12px' }}>
                      {isEditing ? (
                        <TextInput
                          size="xs"
                          value={currentItem.remark || ''}
                          onChange={(e) => updateEditItem('remark', e.target.value)}
                          style={{ width: '100%' }}
                        />
                      ) : (
                        item.remark || ''
                      )}
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
          
          <Group justify="space-between" mt="md">
            <Text size="xs" c="#86909C" style={{ fontStyle: 'italic' }}>
              💡 提示：应用后将自动重新计算完整的投资估算简表
            </Text>
            <Group gap="md">
              <Button 
                onClick={() => setShowAIPreview(false)}
                variant="outline"
                style={{ 
                  borderColor: '#165DFF', 
                  color: '#165DFF',
                  backgroundColor: 'transparent'
                }}
              >
                取消
              </Button>
              <Button 
                onClick={applyAIItemsToEstimate}
                disabled={generating}
                loading={generating}
                style={{ 
                  backgroundColor: '#00C48C', 
                  color: '#FFFFFF'
                }}
              >
                {generating ? '应用中...' : '🚀 应用'}
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      {/* 修改工程费用子项Modal - 第一层：列表视图 */}
      <Modal
        opened={showEditSubItems}
        onClose={() => setShowEditSubItems(false)}
        title="✂️ 修改工程费用子项"
        size="xl"
        centered
        styles={{
          title: { fontWeight: 600, fontSize: '18px', color: '#1D2129' }
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="#86909C">
            修改当前投资表内"第一部分 工程费用"下的所有子项。修改后点击"应用"将重新计算投资估算。
          </Text>
          
          <Table withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
                <Table.Th style={{ textAlign: 'center', width: '60px' }}>序号</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>费用名称</Table.Th>
                <Table.Th style={{ textAlign: 'center', width: '120px' }}>费用金额(万元)</Table.Th>
                <Table.Th style={{ textAlign: 'center', width: '120px' }}>调整金额(万元)</Table.Th>
                <Table.Th style={{ textAlign: 'center', width: '180px' }}>备注</Table.Th>
                <Table.Th style={{ textAlign: 'center', width: '100px' }}>操作</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {editingSubItems.map((item, index) => {
                const originalItem = originalSubItems[index]
                const diff = (item['合计'] || 0) - (originalItem?.['合计'] || 0)
                const isIncrease = diff > 0
                const isDecrease = diff < 0
                
                return (
                  <Table.Tr key={item.id || index}>
                    <Table.Td style={{ textAlign: 'center', fontSize: '14px', fontWeight: 500 }}>
                      {item.序号}
                    </Table.Td>
                    <Table.Td style={{ fontSize: '14px' }}>
                      {item.工程或费用名称}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: '14px' }}>
                      {item.合计?.toFixed(2) || '0.00'}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontSize: '14px' }}>
                      {diff !== 0 && (
                        <Text 
                          span 
                          fw={600} 
                          c={isDecrease ? '#52C41A' : '#FF4D4F'}
                        >
                          {diff.toFixed(2)} {isDecrease ? '↓' : '↑'}
                        </Text>
                      )}
                      {diff === 0 && <Text span c="#86909C">-</Text>}
                    </Table.Td>
                    <Table.Td style={{ fontSize: '13px', color: '#86909C' }}>
                      {item.备注 || '-'}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="center">
                        <Tooltip label="修改">
                          <ActionIcon
                            size="sm"
                            color="blue"
                            onClick={() => openEditSingleItem(index)}
                            variant="light"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="删除">
                          <ActionIcon
                            size="sm"
                            color="red"
                            onClick={() => deleteSubItem(index)}
                            variant="light"
                          >
                            <Trash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                )
              })}
              
              {/* 合计行 */}
              <Table.Tr style={{ backgroundColor: '#F7F8FA', fontWeight: 600 }}>
                <Table.Td colSpan={2} style={{ textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>
                  合计
                </Table.Td>
                <Table.Td style={{ textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#1D2129' }}>
                  {editingSubItems.reduce((sum, item) => sum + (item.合计 || 0), 0).toFixed(2)}
                </Table.Td>
                <Table.Td style={{ textAlign: 'right', fontSize: '14px', fontWeight: 700 }}>
                  {(() => {
                    const totalDiff = editingSubItems.reduce((sum, item, idx) => {
                      const orig = originalSubItems[idx]
                      return sum + ((item['合计'] || 0) - (orig?.['合计'] || 0))
                    }, 0)
                    const isIncrease = totalDiff > 0
                    const isDecrease = totalDiff < 0
                    
                    if (totalDiff === 0) return <Text span c="#86909C">-</Text>
                    
                    return (
                      <Text 
                        span 
                        fw={700} 
                        c={isDecrease ? '#52C41A' : '#FF4D4F'}
                      >
                        {totalDiff.toFixed(2)} {isDecrease ? '↓' : '↑'}
                      </Text>
                    )
                  })()}
                </Table.Td>
                <Table.Td colSpan={2}></Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
          
          <Group justify="space-between" mt="md">
            <Group gap="md">
              <Button 
                onClick={addNewSubItem}
                leftSection={<Text fw={600}>➕</Text>}
                variant="outline"
                style={{ 
                  borderColor: '#52C41A', 
                  color: '#52C41A',
                  backgroundColor: 'transparent'
                }}
              >
                增加子项
              </Button>
              <Text size="xs" c="#86909C" style={{ fontStyle: 'italic' }}>
                💡 提示：应用后将重新计算完整的投资估算简表
              </Text>
            </Group>
            <Group gap="md">
              <Button 
                onClick={() => setShowEditSubItems(false)}
                variant="outline"
                style={{ 
                  borderColor: '#165DFF', 
                  color: '#165DFF',
                  backgroundColor: 'transparent'
                }}
              >
                取消
              </Button>
              <Button 
                onClick={applySubItemsModification}
                disabled={generating || !hasSubItemsChanged()}
                loading={generating}
                style={{ 
                  backgroundColor: hasSubItemsChanged() ? '#165DFF' : '#C9CDD4', 
                  color: '#FFFFFF'
                }}
              >
                {generating ? '应用中...' : '应用'}
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      {/* 修改单个子项Modal - 第二层：详细编辑 */}
      <Modal
        opened={showEditSingleItem}
        onClose={cancelSingleItemEdit}
        title={`✏️ 编辑子项：${singleItemTemp?.工程或费用名称 || ''}`}
        size="md"
        centered
        styles={{
          title: { fontWeight: 600, fontSize: '16px', color: '#1D2129' }
        }}
      >
        {singleItemTemp && (
          <Stack gap="md">
            <TextInput
              label="费用名称"
              value={singleItemTemp.工程或费用名称}
              onChange={(e) => updateSingleItemField('工程或费用名称', e.target.value)}
              styles={{
                label: { fontSize: '14px', fontWeight: 500, color: '#1D2129', marginBottom: '8px' },
                input: { fontSize: '14px', borderColor: '#E5E6EB' }
              }}
            />

            <div>
              <Text size="sm" fw={500} c="#1D2129" mb={8}>各项费用明细(万元)</Text>
              <Stack gap="xs">
                <NumberInput
                  label="建设工程费"
                  value={singleItemTemp.建设工程费 || 0}
                  onChange={(value) => updateSingleItemField('建设工程费', value)}
                  decimalScale={2}
                  min={0}
                  hideControls
                  styles={{
                    label: { fontSize: '13px', color: '#4E5969', marginBottom: '4px' },
                    input: { fontSize: '14px', textAlign: 'right', borderColor: '#E5E6EB' }
                  }}
                />
                <NumberInput
                  label="设备购置费"
                  value={singleItemTemp.设备购置费 || 0}
                  onChange={(value) => updateSingleItemField('设备购置费', value)}
                  decimalScale={2}
                  min={0}
                  hideControls
                  styles={{
                    label: { fontSize: '13px', color: '#4E5969', marginBottom: '4px' },
                    input: { fontSize: '14px', textAlign: 'right', borderColor: '#E5E6EB' }
                  }}
                />
                <NumberInput
                  label="安装工程费"
                  value={singleItemTemp.安装工程费 || 0}
                  onChange={(value) => updateSingleItemField('安装工程费', value)}
                  decimalScale={2}
                  min={0}
                  hideControls
                  styles={{
                    label: { fontSize: '13px', color: '#4E5969', marginBottom: '4px' },
                    input: { fontSize: '14px', textAlign: 'right', borderColor: '#E5E6EB' }
                  }}
                />
                <NumberInput
                  label="其它费用"
                  value={singleItemTemp.其它费用 || 0}
                  onChange={(value) => updateSingleItemField('其它费用', value)}
                  decimalScale={2}
                  min={0}
                  hideControls
                  styles={{
                    label: { fontSize: '13px', color: '#4E5969', marginBottom: '4px' },
                    input: { fontSize: '14px', textAlign: 'right', borderColor: '#E5E6EB' }
                  }}
                />
              </Stack>
            </div>

            <div style={{ 
              padding: '12px', 
              backgroundColor: '#F7F8FA', 
              borderRadius: '4px',
              border: '1px solid #E5E6EB'
            }}>
              <Group justify="space-between">
                <Text size="sm" fw={600} c="#1D2129">合计</Text>
                <Text size="lg" fw={700} c="#165DFF">
                  {singleItemTemp.合计?.toFixed(2) || '0.00'} 万元
                </Text>
              </Group>
            </div>

            <div>
              <Group justify="space-between" mb={8}>
                <Text size="sm" fw={500} c="#1D2129">整体调整百分比</Text>
                <Text size="sm" fw={600} c={adjustmentPercentage <= 0 ? '#52C41A' : '#FF4D4F'}>
                  {adjustmentPercentage >= 0 ? '+' : ''}{adjustmentPercentage}%
                </Text>
              </Group>
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustmentPercentage}
                onChange={(e) => applyPercentageAdjustment(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  outline: 'none',
                  background: `linear-gradient(to right, #52C41A 0%, #86909C 50%, #FF4D4F 100%)`,
                  cursor: 'pointer'
                }}
              />
              <Group justify="space-between" mt={4}>
                <Text size="xs" c="#86909C">-100%</Text>
                <Text size="xs" c="#86909C">0%</Text>
                <Text size="xs" c="#86909C">+100%</Text>
              </Group>
            </div>

            <Textarea
              label="备注"
              value={singleItemTemp.备注 || ''}
              onChange={(e) => updateSingleItemField('备注', e.target.value)}
              placeholder="请输入备注"
              minRows={3}
              styles={{
                label: { fontSize: '14px', fontWeight: 500, color: '#1D2129', marginBottom: '8px' },
                input: { fontSize: '13px', borderColor: '#E5E6EB' }
              }}
            />

            <Group justify="flex-end" gap="md" mt="md">
              <Button 
                onClick={cancelSingleItemEdit}
                variant="outline"
                style={{ 
                  borderColor: '#165DFF', 
                  color: '#165DFF',
                  backgroundColor: 'transparent'
                }}
              >
                取消
              </Button>
              <Button 
                onClick={applySingleItemEdit}
                style={{ 
                  backgroundColor: '#165DFF', 
                  color: '#FFFFFF'
                }}
              >
                应用
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* 修改土地费用Modal */}
      <Modal
        opened={showEditLandCost}
        onClose={() => setShowEditLandCost(false)}
        title="🏞️ 修改土地费用"
        size="md"
        centered
        styles={{
          title: { fontWeight: 600, fontSize: '16px', color: '#1D2129' }
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="#86909C">
            修改土地费用后将重新计算整个投资估算表。
          </Text>
          
          <NumberInput
            label="土地费用金额(万元)"
            value={editingLandCost.amount}
            onChange={(value) => setEditingLandCost(prev => ({ ...prev, amount: typeof value === 'number' ? value : 0 }))}
            decimalScale={2}
            min={0}
            hideControls
            styles={{
              label: { fontSize: '14px', fontWeight: 500, color: '#1D2129', marginBottom: '8px' },
              input: { fontSize: '14px', textAlign: 'left', borderColor: '#E5E6EB' }
            }}
          />

          <Textarea
            label="备注"
            value={editingLandCost.remark}
            onChange={(e) => setEditingLandCost(prev => ({ ...prev, remark: e.target.value }))}
            placeholder="请输入备注"
            minRows={3}
            styles={{
              label: { fontSize: '14px', fontWeight: 500, color: '#1D2129', marginBottom: '8px' },
              input: { fontSize: '13px', borderColor: '#E5E6EB' }
            }}
          />

          <Group justify="flex-end" gap="md" mt="md">
            <Button 
              onClick={() => setShowEditLandCost(false)}
              variant="outline"
              style={{ 
                borderColor: '#165DFF', 
                color: '#165DFF',
                backgroundColor: 'transparent'
              }}
            >
              取消
            </Button>
            <Button 
              onClick={applyLandCostModification}
              disabled={generating}
              loading={generating}
              style={{ 
                backgroundColor: '#722ED1', 
                color: '#FFFFFF'
              }}
            >
              {generating ? '应用中...' : '应用'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 修改贷款额Modal */}
      <Modal
        opened={showEditLoan}
        onClose={() => setShowEditLoan(false)}
        title="💰 修改贷款额度"
        size="md"
        centered
               styles={{
          title: { fontWeight: 600, fontSize: '16px', color: '#1D2129' }
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="#86909C">
            选择修改方式并输入新的贷款额度，系统将自动重新计算建设期利息。
          </Text>
          
          <Select
            label="修改方式"
            value={editingLoan.mode}
            onChange={(value) => setEditingLoan(prev => ({ ...prev, mode: (value as 'amount' | 'ratio') || 'amount' }))}
            data={[
              { value: 'amount', label: '输入具体数额（万元）' },
              { value: 'ratio', label: '输入比例修改（%）' }
            ]}
            styles={{
              label: { fontSize: '14px', fontWeight: 500, color: '#1D2129', marginBottom: '8px' },
              input: { fontSize: '14px', borderColor: '#E5E6EB' }
            }}
          />

          {editingLoan.mode === 'amount' ? (
            <NumberInput
              label="贷款金额（万元）"
              value={editingLoan.amount}
              onChange={(value) => setEditingLoan(prev => ({ ...prev, amount: typeof value === 'number' ? value : 0 }))}
              decimalScale={2}
              min={0}
              hideControls
              styles={{
                label: { fontSize: '14px', fontWeight: 500, color: '#1D2129', marginBottom: '8px' },
                input: { fontSize: '14px', textAlign: 'left', borderColor: '#E5E6EB' }
              }}
            />
          ) : (
            <>
              <NumberInput
                label="贷款比例（%）"
                value={editingLoan.ratio}
                onChange={(value) => setEditingLoan(prev => ({ ...prev, ratio: typeof value === 'number' ? value : 0 }))}
                decimalScale={2}
                min={0}
                max={80}
                hideControls
                styles={{
                  label: { fontSize: '14px', fontWeight: 500, color: '#1D2129', marginBottom: '8px' },
                  input: { fontSize: '14px', textAlign: 'left', borderColor: '#E5E6EB' }
                }}
              />
              <Text size="xs" c="#86909C" mt={4}>
                当前总投资: {(estimate?.partG.合计 || 0).toFixed(2)}万元
              </Text>
              <Text size="xs" c="#FF4D4F" mt={2} fw={600}>
                贷款金额约为 {calculateRoundedLoanAmount().toFixed(2)}万元
              </Text>

              <Select
                label="贷款金额取整"
                value={editingLoan.roundingMode}
                onChange={(value) => setEditingLoan(prev => ({ ...prev, roundingMode: (value as 'none' | 'million' | 'tenMillion') || 'tenMillion' }))}
                data={[
                  { value: 'none', label: '不取整' },
                  { value: 'million', label: '按百万取整' },
                  { value: 'tenMillion', label: '按千万取整（推荐）' }
                ]}
                styles={{
                  label: { fontSize: '14px', fontWeight: 500, color: '#1D2129', marginBottom: '8px' },
                  input: { fontSize: '14px', borderColor: '#E5E6EB' }
                }}
              />
              <Text size="xs" c="#86909C">
                将贷款金额舍去尾数到最近的千万或百万
              </Text>
            </>
          )}

          <Group justify="flex-end" gap="md" mt="md">
            <Button 
              onClick={() => setShowEditLoan(false)}
              variant="outline"
              style={{ 
                borderColor: '#165DFF', 
                color: '#165DFF',
                backgroundColor: 'transparent'
              }}
            >
              取消
            </Button>
            <Button 
              onClick={applyLoanModification}
              disabled={generating}
              loading={generating}
              style={{ 
                backgroundColor: '#52C41A', 
                color: '#FFFFFF'
              }}
            >
              {generating ? '应用中...' : '确认修改'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 细分三级子项Modal */}
      <Modal
        opened={showSubdivideModal}
        onClose={() => {
          if (!analyzingSubItem) {
            setShowSubdivideModal(false)
          }
        }}
        title="🔍 细分三级子项"
        size="1200px"
        closeOnClickOutside={!analyzingSubItem}
        closeOnEscape={!analyzingSubItem}
        withCloseButton={!analyzingSubItem}
        styles={{
          title: { fontWeight: 600, fontSize: '18px', color: '#1D2129' }
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="#86909C">
            选择要细分的二级子项，AI将分析该子项并生成三级子项明细。
          </Text>
          
          <Table withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
                <Table.Th style={{ textAlign: 'center', width: '60px', fontSize: '13px' }}>序号</Table.Th>
                <Table.Th style={{ textAlign: 'center', width: '500px', fontSize: '13px' }}>工程或费用名称</Table.Th>
                <Table.Th style={{ textAlign: 'center', width: '80px', fontSize: '13px' }}>建设工程费<br />(万元)</Table.Th>
                <Table.Th style={{ textAlign: 'center', width: '80px', fontSize: '13px' }}>设备购置费<br />(万元)</Table.Th>
                <Table.Th style={{ textAlign: 'center', width: '80px', fontSize: '13px' }}>安装工程费<br />(万元)</Table.Th>
                <Table.Th style={{ textAlign: 'center', width: '80px', fontSize: '13px' }}>其它费用<br />(万元)</Table.Th>
                <Table.Th style={{ textAlign: 'center', width: '96px', fontSize: '13px' }}>合计<br />(万元)</Table.Th>
                <Table.Th style={{ textAlign: 'center', width: '40px', fontSize: '13px' }}>单位</Table.Th>
                <Table.Th style={{ textAlign: 'center', width: '64px', fontSize: '13px' }}>数量</Table.Th>
                <Table.Th style={{ textAlign: 'center', width: '96px', fontSize: '13px' }}>单位价值<br />(元)</Table.Th>
                <Table.Th style={{ textAlign: 'center', width: '80px', fontSize: '13px' }}>操作</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {estimate?.partA?.children?.map((item, index) => (
                <React.Fragment key={index}>
                  {/* 二级子项 */}
                  <Table.Tr style={{ backgroundColor: '#FAFAFA' }}>
                    <Table.Td style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>{item.序号}</Table.Td>
                    <Table.Td style={{ fontSize: '12px', fontWeight: 600 }}>{item.工程或费用名称}</Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontSize: '12px' }}>{(item.建设工程费 || 0).toFixed(2)}</Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontSize: '12px' }}>{(item.设备购置费 || 0).toFixed(2)}</Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontSize: '12px' }}>{(item.安装工程费 || 0).toFixed(2)}</Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontSize: '12px' }}>{(item.其它费用 || 0).toFixed(2)}</Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>{(item.合计 || 0).toFixed(2)}</Table.Td>
                    <Table.Td style={{ textAlign: 'center', fontSize: '12px' }}>—</Table.Td>
                    <Table.Td style={{ textAlign: 'center', fontSize: '12px' }}>—</Table.Td>
                    <Table.Td style={{ textAlign: 'center', fontSize: '12px' }}>—</Table.Td>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Tooltip label="AI细分">
                        <ActionIcon
                          size="sm"
                          color="blue"
                          onClick={() => {
                            setSubdividingItemIndex(index)
                            handleSubdivideItem(index)
                          }}
                          disabled={analyzingSubItem}
                          loading={analyzingSubItem && subdividingItemIndex === index}
                          variant="light"
                        >
                          <Wand2 size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 三级子项 */}
                  {thirdLevelItems[index]?.map((subItem: any, subIndex: number) => {
                    const totalPrice = (subItem.quantity * subItem.unit_price) / 10000
                    const constructionCost = totalPrice * subItem.construction_ratio
                    const equipmentCost = totalPrice * subItem.equipment_ratio
                    const installationCost = totalPrice * subItem.installation_ratio
                    const otherCost = totalPrice * subItem.other_ratio
                    
                    return (
                      <Table.Tr key={`${index}-${subIndex}`} style={{ backgroundColor: '#FFFFFF' }}>
                        <Table.Td style={{ textAlign: 'center', fontSize: '11px' }}>{subIndex + 1}</Table.Td>
                        <Table.Td style={{ fontSize: '11px', paddingLeft: '24px' }}>{subItem.name}</Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontSize: '11px' }}>{constructionCost.toFixed(2)}</Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontSize: '11px' }}>{equipmentCost.toFixed(2)}</Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontSize: '11px' }}>{installationCost.toFixed(2)}</Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontSize: '11px' }}>{otherCost.toFixed(2)}</Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontSize: '11px' }}>{totalPrice.toFixed(2)}</Table.Td>
                        <Table.Td style={{ textAlign: 'center', fontSize: '11px' }}>{subItem.unit}</Table.Td>
                        <Table.Td style={{ textAlign: 'center', fontSize: '11px' }}>{formatQuantity(subItem.quantity, subItem.unit)}</Table.Td>
                        <Table.Td style={{ textAlign: 'center', fontSize: '11px' }}>{subItem.unit_price.toFixed(2)}</Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Group gap={4} justify="center">
                            <Tooltip label="修改">
                              <ActionIcon
                                size="sm"
                                color="blue"
                                onClick={() => openEditThirdLevelItem(index, subIndex)}
                                variant="light"
                                disabled={analyzingSubItem}
                              >
                                <IconEdit size={14} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="删除">
                              <ActionIcon
                                size="sm"
                                color="red"
                                onClick={() => deleteThirdLevelItem(index, subIndex)}
                                variant="light"
                                disabled={analyzingSubItem}
                              >
                                <Trash size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    )
                  })}
                </React.Fragment>
              ))}
            </Table.Tbody>
          </Table>

          <Group justify="space-between" gap="md" mt="md">
            <Button 
              onClick={handleSubdivideAll}
              disabled={analyzingSubItem || generating || !estimate?.partA?.children || estimate.partA.children.length === 0}
              loading={analyzingSubItem}
              style={{ 
                backgroundColor: '#52C41A', 
                color: '#FFFFFF'
              }}
            >
              {analyzingSubItem ? '细化中...' : '细化全部'}
            </Button>
            <Group gap="md">
              <Button 
                onClick={closeAndApplyThirdLevelItems}
                disabled={generating || analyzingSubItem || Object.keys(thirdLevelItems).length === 0}
                loading={generating}
                style={{ 
                  backgroundColor: '#1E6FFF', 
                  color: '#FFFFFF'
                }}
              >
                {generating ? '应用中...' : '关闭并应用'}
              </Button>
              <Button 
                onClick={() => setShowSubdivideModal(false)}
                disabled={analyzingSubItem}
                variant="outline"
                style={{ 
                  borderColor: '#165DFF', 
                  color: '#165DFF',
                  backgroundColor: 'transparent'
                }}
              >
                取消
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      {/* 增加子项Modal */}
      <Modal
        opened={showAddSubItemModal}
        onClose={cancelNewSubItem}
        title="➕ 增加子项"
        size="md"
        centered
        styles={{
          title: { fontWeight: 600, fontSize: '16px', color: '#1D2129' }
        }}
      >
        {newSubItemTemp && (
          <Stack gap="md">
            <Text size="sm" c="#86909C">
              请填写新子项的详细信息，费用名称为必填项，合计金额必须大于0。
            </Text>

            <TextInput
              label="费用名称"
              value={newSubItemTemp.工程或费用名称}
              onChange={(e) => updateNewSubItemField('工程或费用名称', e.target.value)}
              placeholder="请输入费用名称"
              required
              error={newSubItemTemp.工程或费用名称.trim() === '' ? '费用名称不能为空' : null}
              styles={{
                label: { fontSize: '14px', fontWeight: 500, color: '#1D2129', marginBottom: '8px' },
                input: { fontSize: '14px', borderColor: '#E5E6EB' }
              }}
            />

            <div>
              <Text size="sm" fw={500} c="#1D2129" mb={8}>各项费用明细(万元)</Text>
              <Stack gap="xs">
                <NumberInput
                  label="建设工程费"
                  value={newSubItemTemp.建设工程费 || 0}
                  onChange={(value) => updateNewSubItemField('建设工程费', value)}
                  decimalScale={2}
                  min={0}
                  hideControls
                  styles={{
                    label: { fontSize: '13px', color: '#4E5969', marginBottom: '4px' },
                    input: { fontSize: '14px', textAlign: 'left', borderColor: '#E5E6EB' }
                  }}
                />
                <NumberInput
                  label="设备购置费"
                  value={newSubItemTemp.设备购置费 || 0}
                  onChange={(value) => updateNewSubItemField('设备购置费', value)}
                  decimalScale={2}
                  min={0}
                  hideControls
                  styles={{
                    label: { fontSize: '13px', color: '#4E5969', marginBottom: '4px' },
                    input: { fontSize: '14px', textAlign: 'left', borderColor: '#E5E6EB' }
                  }}
                />
                <NumberInput
                  label="安装工程费"
                  value={newSubItemTemp.安装工程费 || 0}
                  onChange={(value) => updateNewSubItemField('安装工程费', value)}
                  decimalScale={2}
                  min={0}
                  hideControls
                  styles={{
                    label: { fontSize: '13px', color: '#4E5969', marginBottom: '4px' },
                    input: { fontSize: '14px', textAlign: 'left', borderColor: '#E5E6EB' }
                  }}
                />
                <NumberInput
                  label="其它费用"
                  value={newSubItemTemp.其它费用 || 0}
                  onChange={(value) => updateNewSubItemField('其它费用', value)}
                  decimalScale={2}
                  min={0}
                  hideControls
                  styles={{
                    label: { fontSize: '13px', color: '#4E5969', marginBottom: '4px' },
                    input: { fontSize: '14px', textAlign: 'left', borderColor: '#E5E6EB' }
                  }}
                />
              </Stack>
            </div>

            <div style={{ 
              padding: '12px', 
              backgroundColor: '#F7F8FA', 
              borderRadius: '4px',
              border: '1px solid #E5E6EB'
            }}>
              <Group justify="space-between">
                <Text size="sm" fw={600} c="#1D2129">合计</Text>
                <Text size="lg" fw={700} c={newSubItemTemp.合计 > 0 ? '#165DFF' : '#F53F3F'}>
                  {newSubItemTemp.合计?.toFixed(2) || '0.00'} 万元
                </Text>
              </Group>
              {newSubItemTemp.合计 <= 0 && (
                <Text size="xs" c="#F53F3F" mt={4}>
                  ⚠️ 合计金额必须大于0
                </Text>
              )}
            </div>

            <Textarea
              label="备注"
              value={newSubItemTemp.备注 || ''}
              onChange={(e) => updateNewSubItemField('备注', e.target.value)}
              placeholder="请输入备注"
              minRows={3}
              styles={{
                label: { fontSize: '14px', fontWeight: 500, color: '#1D2129', marginBottom: '8px' },
                input: { fontSize: '13px', borderColor: '#E5E6EB' }
              }}
            />

            <Group justify="flex-end" gap="md" mt="md">
              <Button 
                onClick={cancelNewSubItem}
                variant="outline"
                style={{ 
                  borderColor: '#165DFF', 
                  color: '#165DFF',
                  backgroundColor: 'transparent'
                }}
              >
                取消
              </Button>
              <Button 
                onClick={applyNewSubItem}
                style={{ 
                  backgroundColor: '#165DFF', 
                  color: '#FFFFFF'
                }}
              >
                应用
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* 编辑三级子项Modal */}
      <Modal
        opened={editingThirdLevelItem !== null}
        onClose={cancelThirdLevelItemEdit}
        title="✏️ 编辑三级子项"
        size="md"
        centered
        styles={{
          title: { fontWeight: 600, fontSize: '16px', color: '#1D2129' }
        }}
      >
        {thirdLevelItemTemp && (
          <Stack gap="md">
            <TextInput
              label="子项名称"
              value={thirdLevelItemTemp.name || ''}
              onChange={(e) => updateThirdLevelItemField('name', e.target.value)}
              styles={{
                label: { fontSize: '14px', fontWeight: 500, color: '#1D2129', marginBottom: '8px' },
                input: { fontSize: '14px', borderColor: '#E5E6EB' }
              }}
            />

            <Group grow>
              <NumberInput
                label="工程量"
                value={thirdLevelItemTemp.quantity || 0}
                onChange={(value) => updateThirdLevelItemField('quantity', value)}
                decimalScale={2}
                min={0}
                hideControls
                styles={{
                  label: { fontSize: '13px', color: '#4E5969', marginBottom: '4px' },
                  input: { fontSize: '14px', textAlign: 'right', borderColor: '#E5E6EB' }
                }}
              />
              <Select
                label="单位"
                value={thirdLevelItemTemp.unit || ''}
                onChange={(value) => updateThirdLevelItemField('unit', value || '')}
                data={[
                  { value: 'm', label: 'm' },
                  { value: 'm²', label: 'm²' },
                  { value: 'm³', label: 'm³' },
                  { value: 'kg', label: 'kg' },
                  { value: 't', label: 't' },
                  { value: 'km', label: 'km' },
                  { value: 'km²', label: 'km²' },
                  { value: '个', label: '个' },
                  { value: '项', label: '项' },
                  { value: '根', label: '根' },
                  { value: '套', label: '套' },
                  { value: '组', label: '组' },
                  { value: '樘', label: '樘' },
                  { value: '块', label: '块' },
                  { value: '台', label: '台' },
                  { value: '件', label: '件' },
                  { value: '亩', label: '亩' },
                  { value: 't/a', label: 't/a' },
                  { value: 'TB', label: 'TB' },
                  { value: '点位', label: '点位' },
                  { value: '节点', label: '节点' },
                  { value: 't/d', label: 't/d' },
                  { value: 'KW', label: 'KW' },
                ]}
                placeholder="请选择单位"
                searchable
                styles={{
                  label: { fontSize: '13px', color: '#4E5969', marginBottom: '4px' },
                  input: { fontSize: '14px', borderColor: '#E5E6EB' }
                }}
              />
            </Group>

            <NumberInput
              label="单位价值(元)"
              value={thirdLevelItemTemp.unit_price || 0}
              onChange={(value) => updateThirdLevelItemField('unit_price', value)}
              decimalScale={2}
              min={0}
              hideControls
              styles={{
                label: { fontSize: '13px', color: '#4E5969', marginBottom: '4px' },
                input: { fontSize: '14px', textAlign: 'right', borderColor: '#E5E6EB' }
              }}
            />

            <div>
              <Group justify="space-between" align="center" mb={8}>
                <Text size="sm" fw={500} c="#1D2129">费用占比（总和必须等于1）</Text>
                <Tooltip label="将占比总和强制归一化为1">
                  <ActionIcon
                    size="sm"
                    color="blue"
                    onClick={normalizeThirdLevelRatios}
                    variant="light"
                  >
                    <RotateCcw size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <Stack gap="xs">
                <NumberInput
                  label="建设工程费占比"
                  value={thirdLevelItemTemp.construction_ratio || 0}
                  onChange={(value) => updateThirdLevelItemField('construction_ratio', value)}
                  decimalScale={3}
                  min={0}
                  max={1}
                  step={0.1}
                  hideControls
                  styles={{
                    label: { fontSize: '13px', color: '#4E5969', marginBottom: '4px' },
                    input: { fontSize: '14px', textAlign: 'right', borderColor: '#E5E6EB' }
                  }}
                />
                <NumberInput
                  label="设备购置费占比"
                  value={thirdLevelItemTemp.equipment_ratio || 0}
                  onChange={(value) => updateThirdLevelItemField('equipment_ratio', value)}
                  decimalScale={3}
                  min={0}
                  max={1}
                  step={0.1}
                  hideControls
                  styles={{
                    label: { fontSize: '13px', color: '#4E5969', marginBottom: '4px' },
                    input: { fontSize: '14px', textAlign: 'right', borderColor: '#E5E6EB' }
                  }}
                />
                <NumberInput
                  label="安装工程费占比"
                  value={thirdLevelItemTemp.installation_ratio || 0}
                  onChange={(value) => updateThirdLevelItemField('installation_ratio', value)}
                  decimalScale={3}
                  min={0}
                  max={1}
                  step={0.1}
                  hideControls
                  styles={{
                    label: { fontSize: '13px', color: '#4E5969', marginBottom: '4px' },
                    input: { fontSize: '14px', textAlign: 'right', borderColor: '#E5E6EB' }
                  }}
                />
                <NumberInput
                  label="其它费用占比"
                  value={thirdLevelItemTemp.other_ratio || 0}
                  onChange={(value) => updateThirdLevelItemField('other_ratio', value)}
                  decimalScale={3}
                  min={0}
                  max={1}
                  step={0.1}
                  hideControls
                  styles={{
                    label: { fontSize: '13px', color: '#4E5969', marginBottom: '4px' },
                    input: { fontSize: '14px', textAlign: 'right', borderColor: '#E5E6EB' }
                  }}
                />
              </Stack>
              <div>
                <Text size="xs" c="#86909C">当前比例总和:</Text>
                <Text 
                  size="sm" 
                  fw={((
                    (thirdLevelItemTemp.construction_ratio || 0) +
                    (thirdLevelItemTemp.equipment_ratio || 0) +
                    (thirdLevelItemTemp.installation_ratio || 0) +
                    (thirdLevelItemTemp.other_ratio || 0)
                  ).toFixed(3) !== '1.000') ? 700 : 400}
                  c={((
                    (thirdLevelItemTemp.construction_ratio || 0) +
                    (thirdLevelItemTemp.equipment_ratio || 0) +
                    (thirdLevelItemTemp.installation_ratio || 0) +
                    (thirdLevelItemTemp.other_ratio || 0)
                  ).toFixed(3) !== '1.000') ? '#FF4D4F' : '#1D2129'}
                  mt={4}
                >
                  {(
                    (thirdLevelItemTemp.construction_ratio || 0) +
                    (thirdLevelItemTemp.equipment_ratio || 0) +
                    (thirdLevelItemTemp.installation_ratio || 0) +
                    (thirdLevelItemTemp.other_ratio || 0)
                  ).toFixed(3)}
                </Text>
              </div>
            </div>

            <div style={{ 
              padding: '12px', 
              backgroundColor: '#F7F8FA', 
              borderRadius: '4px',
              border: '1px solid #E5E6EB'
            }}>
              <Group justify="space-between">
                <Text size="sm" fw={600} c="#1D2129">总价</Text>
                <Text size="lg" fw={700} c="#165DFF">
                  {((thirdLevelItemTemp.quantity || 0) * (thirdLevelItemTemp.unit_price || 0) / 10000).toFixed(2)} 万元
                </Text>
              </Group>
            </div>

            <Group justify="flex-end" gap="md" mt="md">
              <Button 
                onClick={cancelThirdLevelItemEdit}
                variant="outline"
                style={{ 
                  borderColor: '#165DFF', 
                  color: '#165DFF',
                  backgroundColor: 'transparent'
                }}
              >
                取消
              </Button>
              <Button 
                onClick={applyThirdLevelItemEdit}
                style={{ 
                  backgroundColor: '#165DFF', 
                  color: '#FFFFFF'
                }}
              >
                应用
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* 建设期利息详情Modal */}
      <ConstructionInterestModal
        opened={showConstructionInterestModal}
        onClose={() => setShowConstructionInterestModal(false)}
        estimate={estimate}
      />

    </div>
  )
}

export default InvestmentSummary
