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
import { projectApi, investmentApi } from '@/lib/api'
import { useRevenueCostStore } from '@/stores/revenueCostStore'
import { InvestmentEstimate } from '@/types'
import AIRevenueStructure from '@/components/revenue-cost/AIRevenueStructure'
import DynamicRevenueTable from '@/components/revenue-cost/DynamicRevenueTable'
import ProductionRateModel from '@/components/revenue-cost/ProductionRateModel'
import DynamicCostTable from '@/components/revenue-cost/DynamicCostTable'

// 步骤定义
const STEPS = [
  { label: '基础数据', value: 0 },
  { label: '折旧摊销估算', value: 1 },
  { label: 'AI推荐结构', value: 2 },
  { label: '收入建模', value: 3 },
  { label: '成本建模', value: 4 },
  { label: '利润税金', value: 5 },
]

/**
 * 营业收入与成本测算主页面
 */
const RevenueCostModeling: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  // Zustand Store
  const { setContext, currentStep, setCurrentStep } = useRevenueCostStore()

  // 状态管理
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<any>(null)
  const [investmentEstimate, setInvestmentEstimate] = useState<InvestmentEstimate | null>(null)

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
        const [projectResponse, estimateResponse] = await Promise.all([
          projectApi.getById(id!),
          investmentApi.getByProjectId(id!)
        ])
        
        if (projectResponse.success && projectResponse.data) {
          const projectData = projectResponse.data.project || projectResponse.data
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
        }
        
        // 加载投资估算数据
        if (estimateResponse.success && estimateResponse.data?.estimate) {
          const estimateData = estimateResponse.data.estimate
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
        } else {
          console.warn('⚠️ 投资估算API响应异常:', estimateResponse)
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
      }
    }

    if (id) {
      loadProjectData()
    }
  }, [id, navigate])

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
    let partBTotal = Number(investmentEstimate.estimate_data?.partB?.合计) || 0
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
  }, [project, investmentEstimate, repaymentPeriod])

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
    1: 'depreciation',
    2: 'suggest',
    3: 'revenue',
    4: 'cost',
    5: 'profit',
  }

  const activeStep = Object.keys(stepMap).find(
    key => stepMap[Number(key)] === currentStep
  ) ? Number(Object.keys(stepMap).find(key => stepMap[Number(key)] === currentStep)) : 0

  // 步骤导航处理
  const handleNext = () => {
    if (activeStep < STEPS.length - 1) {
      setCurrentStep(stepMap[activeStep + 1] as any)
    }
  }

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
                      <Tooltip label="查看还本付息计划表">
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
                            <Tooltip label="点击编辑">
                              <ActionIcon 
                                variant="subtle" 
                                color="blue" 
                                onClick={() => openSimpleEditModal('repaymentPeriod', '还款期', repaymentPeriod, '年', 1, 50)}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
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
                          <Table.Td>待抵扣进销项税</Table.Td>
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

            {/* 折旧与摊销简表弹窗 */}
            <Modal
              opened={depreciationTableOpened}
              onClose={() => setDepreciationTableOpened(false)}
              title={
                <Group gap="xs">
                  <IconFileText size={20} color="#165DFF" />
                  <Text fw={600} c="#1D2129">折旧与摊销简表</Text>
                </Group>
              }
              size="1400px"
              centered
            >
              <Table
                striped
                withTableBorder
                styles={{
                  th: {
                    backgroundColor: '#F7F8FA',
                    color: '#1D2129',
                    fontWeight: 600,
                    fontSize: '13px'
                  },
                  td: {
                    fontSize: '13px'
                  }
                }}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>序号</Table.Th>
                    <Table.Th>资产类别</Table.Th>
                    <Table.Th>构成说明</Table.Th>
                    <Table.Th>原值（万元）</Table.Th>
                    <Table.Th>折旧/摊销年限（年）</Table.Th>
                    <Table.Th>残值率</Table.Th>
                    <Table.Th>年折旧/摊销额（万元）</Table.Th>
                    <Table.Th>备注</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>A</Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Text>🏢</Text>
                        <Text>房屋（建筑物）</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>不含税建筑工程费 + 分摊建息与预备费</Table.Td>
                    <Table.Td>
                      <Text fw={600}>{constructionOriginalValue.toFixed(2)}</Text>
                    </Table.Td>
                    <Table.Td>{constructionDepreciationYears}</Table.Td>
                    <Table.Td>{constructionResidualRate}%</Table.Td>
                    <Table.Td>
                      <Text fw={600} c="#165DFF">
                        {(constructionOriginalValue * (1 - constructionResidualRate / 100) / constructionDepreciationYears).toFixed(2)}
                      </Text>
                    </Table.Td>
                    <Table.Td>进项税{constructionInputTaxRate}%已扣除</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>B</Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Text>🔧</Text>
                        <Text>建安工程（安装、装饰等）</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>不含税安装及配套工程费 + 分摊建息与预备费</Table.Td>
                    <Table.Td>
                      <Text fw={600}>0.00</Text>
                    </Table.Td>
                    <Table.Td>30</Table.Td>
                    <Table.Td>5%</Table.Td>
                    <Table.Td>
                      <Text fw={600} c="#165DFF">0.00</Text>
                    </Table.Td>
                    <Table.Td>包括装修、机电、道路等</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>C</Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Text>📦</Text>
                        <Text>其他工程费用分摊项</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>建设管理费、工程监理费等按比例资本化部分</Table.Td>
                    <Table.Td>
                      <Text fw={600}>0.00</Text>
                    </Table.Td>
                    <Table.Td>{constructionDepreciationYears}</Table.Td>
                    <Table.Td>-</Table.Td>
                    <Table.Td>
                      <Text fw={600} c="#165DFF">0.00</Text>
                    </Table.Td>
                    <Table.Td>按(A+B+D)总额比例分摊</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>D</Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Text>⚙️</Text>
                        <Text>设备购置</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>不含税设备购置费 + 分摊建息与预备费</Table.Td>
                    <Table.Td>
                      <Text fw={600}>{equipmentOriginalValue.toFixed(2)}</Text>
                    </Table.Td>
                    <Table.Td>{equipmentDepreciationYears}</Table.Td>
                    <Table.Td>{equipmentResidualRate}%</Table.Td>
                    <Table.Td>
                      <Text fw={600} c="#165DFF">
                        {(equipmentOriginalValue * (1 - equipmentResidualRate / 100) / equipmentDepreciationYears).toFixed(2)}
                      </Text>
                    </Table.Td>
                    <Table.Td>进项税{equipmentInputTaxRate}%已扣除</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>E</Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Text>🌍</Text>
                        <Text>无形资产（土地）</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>B部分"项目土地费用"</Table.Td>
                    <Table.Td>
                      <Text fw={600}>0.00</Text>
                    </Table.Td>
                    <Table.Td>{intangibleAmortizationYears}</Table.Td>
                    <Table.Td>{intangibleResidualRate}%</Table.Td>
                    <Table.Td>
                      <Text fw={600} c="#165DFF">0.00</Text>
                    </Table.Td>
                    <Table.Td>按{intangibleAmortizationYears}年直线摊销</Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
              <Group justify="flex-end" mt="md">
                <Button 
                  onClick={() => setDepreciationTableOpened(false)}
                  style={{ 
                    height: '36px',
                    backgroundColor: '#165DFF'
                  }}
                >
                  关闭
                </Button>
              </Group>
            </Modal>

            {/* 还本付息计划表弹窗 */}
            <Modal
              opened={repaymentPlanOpened}
              onClose={() => setRepaymentPlanOpened(false)}
              title={
                <Group gap="xs">
                  <IconCurrencyDollar size={20} color="#00C48C" />
                  <Text fw={600} c="#1D2129">还本付息计划表（等额本金还款）</Text>
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
                          textAlign: 'center'
                        },
                        td: {
                          fontSize: '13px',
                          textAlign: 'center'
                        }
                      }}
                    >
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th style={{ width: '60px' }}>序号</Table.Th>
                          <Table.Th style={{ width: '180px', textAlign: 'left' }}>项目</Table.Th>
                          <Table.Th style={{ width: '120px' }}>合计</Table.Th>
                          {Array.from({ length: project?.operation_years || 0 }, (_, i) => (
                            <Table.Th key={i} style={{ width: '100px' }}>
                              第{i + 1}年
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
                            {row.分年数据.map((value, yearIdx) => (
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
        return (
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack gap="lg">
              <div>
                <Text size="lg" fw={600} c="#1D2129" mb="md">
                  折旧摊销估算
                </Text>
                <Text size="sm" c="#86909C">
                  固定资产折旧费估算表与无形资产和其他资产摊销估算表
                </Text>
              </div>

              {/* 固定资产折旧费估算表 */}
              <div>
                <Text size="md" fw={500} c="#1D2129" mb="md">固定资产折旧费估算表</Text>
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  backgroundColor: '#F7F8FA',
                  borderRadius: '8px',
                  border: '1px dashed #E5E6EB'
                }}>
                  <Text size="sm" c="#86909C">
                    🚧 表格展示开发中...
                  </Text>
                  <Text size="xs" c="#86909C" mt="md">
                    将根据基础数据自动计算各年度折旧费用
                  </Text>
                </div>
              </div>

              {/* 无形资产和其他资产摊销估算表 */}
              <div>
                <Text size="md" fw={500} c="#1D2129" mb="md">无形资产和其他资产摊销估算表</Text>
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  backgroundColor: '#F7F8FA',
                  borderRadius: '8px',
                  border: '1px dashed #E5E6EB'
                }}>
                  <Text size="sm" c="#86909C">
                    🚧 表格展示开发中...
                  </Text>
                  <Text size="xs" c="#86909C" mt="md">
                    将根据基础数据自动计算各年度摊销费用
                  </Text>
                </div>
              </div>
            </Stack>
          </Card>
        )

      case 2:
        return <AIRevenueStructure />

      case 3:
        return (
          <Stack gap="md">
            <DynamicRevenueTable />
            <ProductionRateModel />
          </Stack>
        )

      case 4:
        return <DynamicCostTable />

      case 5:
        return (
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack gap="lg">
              <div>
                <Text size="lg" fw={600} c="#1D2129" mb="md">
                  利润税金
                </Text>
                <Text size="sm" c="#86909C">
                  查看利润税金汇总
                </Text>
              </div>
              <div style={{ 
                padding: '40px', 
                textAlign: 'center',
                backgroundColor: '#F7F8FA',
                borderRadius: '8px'
              }}>
                <Text size="sm" c="#86909C">
                  🚧 功能开发中...
                </Text>
              </div>
            </Stack>
          </Card>
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
    <Container size="xl" style={{ minHeight: '100vh', padding: 0 }}>
      {/* Header */}
      <Paper shadow="none" p="0" style={{ 
        height: '50px', 
        borderBottom: '1px solid #E5E6EB', 
        backgroundColor: '#FFFFFF',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0 16px' 
        }}>
          <Group gap="md">
            <IconChartBar size={24} color="#F7BA1E" />
            <Title order={3} c="#1D2129" style={{ fontSize: '20px', fontWeight: 600 }}>
              收入及成本预测
            </Title>
          </Group>
          <Button
            leftSection={<IconArrowLeft size={16} />}
            variant="subtle"
            size="sm"
            onClick={() => navigate(`/investment/${id}`)}
            style={{ height: '32px', padding: '4px 12px', color: '#1D2129' }}
          >
            返回投资估算
          </Button>
        </div>
      </Paper>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
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
                  <Text size="xs" c="#86909C" mb={4}>总投资</Text>
                  <Text size="md" fw={600} c="#165DFF">
                    {project?.total_investment} 万元
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
                    notifications.show({
                      title: '功能开发中',
                      message: '完成功能即将推出',
                      color: 'blue',
                    })
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
      </div>
    </Container>
  )
}

export default RevenueCostModeling
