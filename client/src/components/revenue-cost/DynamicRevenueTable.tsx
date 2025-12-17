import { modals } from '@mantine/modals'
import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Group,
  Stack,
  Text,
  ActionIcon,
  Tooltip,
  Badge,
  Grid,
  Switch,
} from '@mantine/core'
import { IconEdit, IconTrash, IconPlus, IconChartLine, IconSparkles, IconTable } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import ProductionRateModal from './ProductionRateModal'
import { revenueCostApi } from '@/lib/api'
import {
  RevenueItem,
  RevenueCategory,
  FieldTemplate,
  useRevenueCostStore,
  calculateTaxableIncome,
  calculateNonTaxIncome,
  calculateVatAmount,
  calculateYearlyRevenue,
  getProductionRateForYear,
} from '../../stores/revenueCostStore'

/**
 * 类别标签映射
 */
const CATEGORY_LABELS: Record<RevenueCategory, string> = {
  'digital-platform': '数字平台',
  'agriculture-crop': '农业种植',
  'manufacturing': '制造业',
  'service': '服务业',
  'real-estate': '房地产',
  'other': '其他',
}

/**
 * 字段模板标签映射
 */
const TEMPLATE_LABELS: Record<FieldTemplate, string> = {
  'quantity-price': '数量 × 单价',
  'area-yield-price': '面积 × 亩产量 × 单价',
  'capacity-utilization': '产能 × 利用率 × 单价',
  'subscription': '订阅数 × 单价',
  'direct-amount': '直接金额',
}

/**
 * 动态收入表格组件
 */
const DynamicRevenueTable: React.FC = () => {
  const { 
    context,
    aiAnalysisResult,
    revenueItems, 
    addRevenueItem, 
    updateRevenueItem, 
    deleteRevenueItem 
  } = useRevenueCostStore()
  
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<RevenueItem | null>(null)
  const [isNewItem, setIsNewItem] = useState(false)
  const [productionRateModalOpened, setProductionRateModalOpened] = useState(false) // 达产率配置弹窗
  const [aiEstimating, setAiEstimating] = useState(false) // AI测算中
  const [showRevenueDetailModal, setShowRevenueDetailModal] = useState(false) // 收入详表弹窗

  // 编辑表单状态
  const [formData, setFormData] = useState<Partial<RevenueItem>>({})

  /**
   * 打开新增对话框
   */
  const handleAdd = () => {
    setFormData({
      name: '',
      category: 'other',
      fieldTemplate: 'quantity-price',
      vatRate: 0.13,
      priceUnit: 'wan-yuan', // 默认万元
      priceIncreaseInterval: 0, // 默认不涨价
      priceIncreaseRate: 0,
    })
    setEditingItem(null)
    setIsNewItem(true)
    setShowEditModal(true)
  }

  /**
   * 打开编辑对话框
   */
  const handleEdit = (item: RevenueItem) => {
    setFormData({ ...item })
    setEditingItem(item)
    setIsNewItem(false)
    setShowEditModal(true)
  }

  /**
   * 删除收入项
   */
  const handleDelete = (item: RevenueItem) => {
    modals.openConfirmModal({
      title: '确认删除',
      children: (
        <Text size="sm">
          确定要删除收入项“<Text component="span" fw={600} c="red">{item.name}</Text>”吗？
        </Text>
      ),
      labels: { confirm: '确定删除', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        deleteRevenueItem(item.id)
        notifications.show({
          title: '成功',
          message: '收入项已删除',
          color: 'green',
        })
      },
    })
  }

  /**
   * AI测算收入项
   */
  const handleAiEstimate = async () => {
    if (!formData.name || formData.name.trim() === '') {
      notifications.show({
        title: '错误',
        message: '请先输入收入项名称',
        color: 'red',
      })
      return
    }

    if (!context?.projectId) {
      notifications.show({
        title: '错误',
        message: '未找到项目ID',
        color: 'red',
      })
      return
    }

    setAiEstimating(true)
    try {
      const response = await revenueCostApi.estimateItem(context.projectId, formData.name)

      if (response.success && response.data) {
        // 应用AI估算结果，包括 remark 和 unit
        setFormData({
          ...formData,
          category: response.data.category as RevenueCategory,
          fieldTemplate: response.data.fieldTemplate as FieldTemplate,
          quantity: response.data.quantity,
          unit: response.data.unit || '', // AI返回的数量单位
          unitPrice: response.data.unitPrice,
          priceUnit: 'wan-yuan', // AI返回的是万元
          vatRate: response.data.vatRate,
          area: response.data.area,
          yieldPerArea: response.data.yieldPerArea,
          capacity: response.data.capacity,
          capacityUnit: response.data.capacityUnit || '', // AI返回的产能单位
          utilizationRate: response.data.utilizationRate,
          subscriptions: response.data.subscriptions,
          directAmount: response.data.directAmount,
          remark: response.data.remark || '', // AI测算的理由填入备注
        })

        notifications.show({
          title: 'AI测算成功',
          message: '已自动填充关键信息，请检查并调整',
          color: 'green',
        })
      } else {
        throw new Error(response.error || 'AI测算失败')
      }
    } catch (error: any) {
      console.error('AI测算失败:', error)
      notifications.show({
        title: '测算失败',
        message: error.message || '请稍后重试',
        color: 'red',
      })
    } finally {
      setAiEstimating(false)
    }
  }

  /**
   * 保存收入项
   */
  const handleSave = () => {
    if (!formData.name || formData.name.trim() === '') {
      notifications.show({
        title: '错误',
        message: '请输入收入项名称',
        color: 'red',
      })
      return
    }

    if (isNewItem) {
      addRevenueItem(formData)
      notifications.show({
        title: '成功',
        message: '收入项已添加',
        color: 'green',
      })
    } else if (editingItem) {
      updateRevenueItem(editingItem.id, formData)
      notifications.show({
        title: '成功',
        message: '收入项已更新',
        color: 'green',
      })
    }

    setShowEditModal(false)
    setFormData({})
  }

  /**
   * AI自动生成收入项目表
   */
  const handleGenerateItems = async () => {
    if (!context?.projectId) {
      console.warn('AI生成跳过：未找到项目ID')
      return
    }

    if (!aiAnalysisResult || !aiAnalysisResult.selected_categories || aiAnalysisResult.selected_categories.length === 0) {
      console.warn('AI生成跳过：未完成AI营收结构分析')
      return
    }

    // 从 context 中构建投资数据（使用基础信息）
    const investmentData = {
      total_investment: context.totalInvestment,
      construction_years: context.constructionYears,
      operation_years: context.operationYears,
      construction_cost: 0, // 默认值
      equipment_cost: 0, // 默认值
    }

    console.log('🤖 开始自动生成收入项...')
    try {
      const response = await revenueCostApi.generateItems(context.projectId, {
        revenueStructure: aiAnalysisResult,
        investmentData,
      })

      if (response.success && response.data?.revenue_items) {
        // 清空现有收入项
        const currentItems = [...revenueItems]
        currentItems.forEach(item => deleteRevenueItem(item.id))

        // 添加AI生成的收入项
        response.data.revenue_items.forEach((item: any) => {
          addRevenueItem({
            name: item.name,
            category: item.category || 'other',
            fieldTemplate: item.field_template || 'quantity-price',
            quantity: item.quantity || 0,
            unitPrice: item.unit_price || 0,
            area: item.area || 0,
            yieldPerArea: item.yield_per_area || 0,
            capacity: item.capacity || 0,
            utilizationRate: item.utilization_rate || 0,
            subscriptions: item.subscriptions || 0,
            directAmount: item.direct_amount || 0,
          })
        })

        console.log(`✅ AI生成成功：${response.data.revenue_items.length} 个收入项`)
        notifications.show({
          title: '自动生成成功',
          message: `已自动生成 ${response.data.revenue_items.length} 个收入项，可继续编辑调整`,
          color: 'green',
        })
      } else {
        throw new Error(response.error || 'AI生成失败')
      }
    } catch (error: any) {
      console.error('❌ AI生成收入项失败:', error)
      // 不显示错误通知，只记录日志
    }
  }

  /**
   * 组件挂载时自动生成（如果收入项为空且有AI分析结果）
   */
  useEffect(() => {
    if (revenueItems.length === 0 && aiAnalysisResult && context) {
      handleGenerateItems()
    }
  }, [aiAnalysisResult]) // 当AI分析结果变化时触发

  /**
   * 格式化金额显示（万元，2位小数）
   */
  const formatAmount = (amount: number): string => {
    return amount.toFixed(2)
  }

  /**
   * 渲染字段值
   */
  const renderFieldValue = (item: RevenueItem): string => {
    switch (item.fieldTemplate) {
      case 'quantity-price':
        return `${item.quantity || 0} × ${item.unitPrice || 0}`
      case 'area-yield-price':
        return `${item.area || 0}亩 × ${item.yieldPerArea || 0} × ${item.unitPrice || 0}`
      case 'capacity-utilization':
        return `${item.capacity || 0} × ${((item.utilizationRate || 0) * 100).toFixed(0)}% × ${item.unitPrice || 0}`
      case 'subscription':
        return `${item.subscriptions || 0} × ${item.unitPrice || 0}`
      case 'direct-amount':
        return `${item.directAmount || 0}`
      default:
        return '-'
    }
  }

  /**
   * 渲染编辑表单字段
   */
  const renderFormFields = () => {
    const template = formData.fieldTemplate || 'quantity-price'

    return (
      <Stack gap="md">
        {/* 基础信息 - 全宽 */}
        <TextInput
          label="收入项名称"
          placeholder="请输入收入项名称"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        {/* 2栏布局 */}
        <Grid gutter="md">
          <Grid.Col span={6}>
            <Select
              label="收入类别"
              data={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              value={formData.category || 'other'}
              onChange={(value) => setFormData({ ...formData, category: value as RevenueCategory })}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <Select
              label="字段模板"
              data={Object.entries(TEMPLATE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              value={template}
              onChange={(value) => setFormData({ ...formData, fieldTemplate: value as FieldTemplate })}
            />
          </Grid.Col>
        </Grid>

        {/* 根据模板显示不同字段 */}
        {template === 'quantity-price' && (
          <>
            <Grid gutter="md">
              <Grid.Col span={8}>
                <NumberInput
                  label={formData.unit ? `数量（${formData.unit}）` : '数量'}
                  placeholder="请输入数量"
                  value={formData.quantity || 0}
                  onChange={(value) => setFormData({ ...formData, quantity: Number(value) })}
                  min={0}
                  decimalScale={4}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <TextInput
                  label="单位"
                  placeholder="如：公斤、吨"
                  value={formData.unit || ''}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </Grid.Col>
            </Grid>
            
            <Grid gutter="md">
              <Grid.Col span={8}>
                <NumberInput
                  label={`单价（${formData.priceUnit === 'yuan' ? '元' : '万元'}）`}
                  placeholder="请输入单价"
                  value={formData.unitPrice || 0}
                  onChange={(value) => setFormData({ ...formData, unitPrice: Number(value) })}
                  min={0}
                  decimalScale={4}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <Stack gap={0}>
                  <Text size="sm" fw={500} mb={4}>
                    单位
                  </Text>
                  <Switch
                    checked={formData.priceUnit === 'yuan'}
                    onChange={(event) => {
                      const isYuan = event.currentTarget.checked
                      const newUnit = isYuan ? 'yuan' : 'wan-yuan'
                      const currentPrice = formData.unitPrice || 0
                      let newPrice = currentPrice

                      // 单位切换时转换数值
                      if (formData.priceUnit === 'wan-yuan' && newUnit === 'yuan') {
                        // 万元 -> 元
                        newPrice = currentPrice * 10000
                      } else if (formData.priceUnit === 'yuan' && newUnit === 'wan-yuan') {
                        // 元 -> 万元
                        newPrice = currentPrice / 10000
                      }

                      setFormData({ 
                        ...formData, 
                        priceUnit: newUnit,
                        unitPrice: newPrice
                      })
                    }}
                    onLabel="元"
                    offLabel="万元"
                    size="md"
                  />
                </Stack>
              </Grid.Col>
            </Grid>
          </>
        )}

        {template === 'area-yield-price' && (
          <Grid gutter="md">
            <Grid.Col span={4}>
              <NumberInput
                label="面积（亩）"
                placeholder="请输入面积"
                value={formData.area || 0}
                onChange={(value) => setFormData({ ...formData, area: Number(value) })}
                min={0}
                decimalScale={4}
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <NumberInput
                label="亩产量"
                placeholder="请输入亩产量"
                value={formData.yieldPerArea || 0}
                onChange={(value) => setFormData({ ...formData, yieldPerArea: Number(value) })}
                min={0}
                decimalScale={4}
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <NumberInput
                label="单价（万元）"
                placeholder="请输入单价"
                value={formData.unitPrice || 0}
                onChange={(value) => setFormData({ ...formData, unitPrice: Number(value) })}
                min={0}
                decimalScale={4}
              />
            </Grid.Col>
          </Grid>
        )}

        {template === 'capacity-utilization' && (
          <>
            <Grid gutter="md">
              <Grid.Col span={8}>
                <NumberInput
                  label={formData.capacityUnit ? `产能（${formData.capacityUnit}）` : '产能'}
                  placeholder="请输入产能"
                  value={formData.capacity || 0}
                  onChange={(value) => setFormData({ ...formData, capacity: Number(value) })}
                  min={0}
                  decimalScale={4}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <TextInput
                  label="单位"
                  placeholder="如：台、件"
                  value={formData.capacityUnit || ''}
                  onChange={(e) => setFormData({ ...formData, capacityUnit: e.target.value })}
                />
              </Grid.Col>
            </Grid>

            <Grid gutter="md">
              <Grid.Col span={4}>
                <NumberInput
                  label="利用率（%）"
                  placeholder="请输入利用率"
                  value={(formData.utilizationRate || 0) * 100}
                  onChange={(value) => setFormData({ ...formData, utilizationRate: Number(value) / 100 })}
                  min={0}
                  max={100}
                  decimalScale={2}
                />
              </Grid.Col>
              <Grid.Col span={8}>
                <Group align="flex-end" gap="xs" style={{ height: '100%' }}>
                  <div style={{ flex: 1 }}>
                    <NumberInput
                      label="单价"
                      placeholder="请输入单价"
                      value={formData.unitPrice || 0}
                      onChange={(value) => setFormData({ ...formData, unitPrice: Number(value) })}
                      min={0}
                      decimalScale={4}
                    />
                  </div>
                  <div>
                    <Switch
                      checked={formData.priceUnit === 'yuan'}
                      onChange={(event) => {
                        const isYuan = event.currentTarget.checked
                        const newUnit = isYuan ? 'yuan' : 'wan-yuan'
                        const currentPrice = formData.unitPrice || 0
                        let newPrice = currentPrice

                        if (formData.priceUnit === 'wan-yuan' && newUnit === 'yuan') {
                          newPrice = currentPrice * 10000
                        } else if (formData.priceUnit === 'yuan' && newUnit === 'wan-yuan') {
                          newPrice = currentPrice / 10000
                        }

                        setFormData({ 
                          ...formData, 
                          priceUnit: newUnit,
                          unitPrice: newPrice
                        })
                      }}
                      onLabel="元"
                      offLabel="万元"
                      size="md"
                      style={{ marginBottom: '2px' }}
                    />
                  </div>
                </Group>
              </Grid.Col>
            </Grid>
          </>
        )}

        {template === 'subscription' && (
          <Grid gutter="md">
            <Grid.Col span={6}>
              <NumberInput
                label="订阅数"
                placeholder="请输入订阅数"
                value={formData.subscriptions || 0}
                onChange={(value) => setFormData({ ...formData, subscriptions: Number(value) })}
                min={0}
                decimalScale={0}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <NumberInput
                label="单价（万元）"
                placeholder="请输入单价"
                value={formData.unitPrice || 0}
                onChange={(value) => setFormData({ ...formData, unitPrice: Number(value) })}
                min={0}
                decimalScale={4}
              />
            </Grid.Col>
          </Grid>
        )}

        {template === 'direct-amount' && (
          <NumberInput
            label="金额（万元）"
            placeholder="请输入金额"
            value={formData.directAmount || 0}
            onChange={(value) => setFormData({ ...formData, directAmount: Number(value) })}
            min={0}
            decimalScale={2}
          />
        )}

        {/* 涨价参数 - 2栏 */}
        <Grid gutter="md">
          <Grid.Col span={6}>
            <NumberInput
              label="涨价间隔（年）"
              placeholder="0表示不涨价"
              description="每隔N年涨价一次，0表示不涨价"
              value={formData.priceIncreaseInterval || 0}
              onChange={(value) => setFormData({ ...formData, priceIncreaseInterval: Number(value) })}
              min={0}
              max={30}
              decimalScale={0}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <NumberInput
              label="涨价幅度（%）"
              placeholder="请输入涨价幅度"
              description="每次涨价的百分比，例如：5 表示 5%"
              value={formData.priceIncreaseRate || 0}
              onChange={(value) => setFormData({ ...formData, priceIncreaseRate: Number(value) })}
              min={0}
              max={100}
              decimalScale={2}
              disabled={(formData.priceIncreaseInterval || 0) === 0}
            />
          </Grid.Col>
        </Grid>

        {/* 增值税率和备注 - 2栏 */}
        <Grid gutter="md">
          <Grid.Col span={6}>
            <NumberInput
              label="增值税率（%）"
              placeholder="请输入增值税率"
              value={(formData.vatRate || 0.13) * 100}
              onChange={(value) => setFormData({ ...formData, vatRate: Number(value) / 100 })}
              min={0}
              max={100}
              decimalScale={2}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <Tooltip label={formData.remark || '无备注'} multiline w={300} withArrow>
              <TextInput
                label="备注"
                placeholder="请输入备注（可选）"
                value={formData.remark || ''}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              />
            </Tooltip>
          </Grid.Col>
        </Grid>
      </Stack>
    )
  }

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text size="md" fw={600} c="#1D2129">
            营业收入配置
          </Text>
          <Group gap="xs">
            <Tooltip label="配置达产率">
              <ActionIcon
                variant="light"
                color="orange"
                size="lg"
                onClick={() => setProductionRateModalOpened(true)}
              >
                <IconChartLine size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="查看收入详表">
              <ActionIcon
                variant="light"
                color="cyan"
                size="lg"
                onClick={() => setShowRevenueDetailModal(true)}
                disabled={revenueItems.length === 0}
              >
                <IconTable size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="新增收入项">
              <ActionIcon
                variant="filled"
                color="blue"
                size="lg"
                onClick={handleAdd}
              >
                <IconPlus size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {revenueItems.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#F7F8FA',
            borderRadius: '8px',
            border: '1px dashed #E5E6EB'
          }}>
            <Text size="sm" c="#86909C">
              暂无收入项，请点击"新增收入项"添加
            </Text>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover withTableBorder style={{ minWidth: '1000px' }}>
              <Table.Thead>
                <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
                  <Table.Th style={{ width: '50px', textAlign: 'center' }}>序号</Table.Th>
                  <Table.Th style={{ width: '180px' }}>收入项名称</Table.Th>
                  <Table.Th style={{ width: '100px' }}>类别</Table.Th>
                  <Table.Th style={{ width: '150px' }}>模板</Table.Th>
                  <Table.Th style={{ width: '200px' }}>参数值</Table.Th>
                  <Table.Th style={{ width: '100px', textAlign: 'right' }}>含税收入</Table.Th>
                  <Table.Th style={{ width: '100px', textAlign: 'right' }}>不含税收入</Table.Th>
                  <Table.Th style={{ width: '100px', textAlign: 'right' }}>增值税</Table.Th>
                  <Table.Th style={{ width: '80px', textAlign: 'center' }}>税率</Table.Th>
                  <Table.Th style={{ width: '100px', textAlign: 'center' }}>操作</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {revenueItems.map((item) => {
                  const taxableIncome = calculateTaxableIncome(item)
                  const nonTaxIncome = calculateNonTaxIncome(item)
                  const vatAmount = calculateVatAmount(item)

                  return (
                    <Table.Tr key={item.id}>
                      <Table.Td style={{ textAlign: 'center' }}>{item.index}</Table.Td>
                      <Table.Td>{item.name}</Table.Td>
                      <Table.Td>
                        <Badge size="sm" color="blue" variant="light">
                          {CATEGORY_LABELS[item.category]}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="#86909C">
                          {TEMPLATE_LABELS[item.fieldTemplate]}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="#4E5969">
                          {renderFieldValue(item)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={500}>
                          {formatAmount(taxableIncome)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={500} c="#165DFF">
                          {formatAmount(nonTaxIncome)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" c="#F7BA1E">
                          {formatAmount(vatAmount)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Text size="xs">
                          {(item.vatRate * 100).toFixed(0)}%
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Group gap={4} justify="center">
                          <Tooltip label="编辑">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              onClick={() => handleEdit(item)}
                              size="sm"
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="删除">
                            <ActionIcon
                              variant="light"
                              color="red"
                              onClick={() => handleDelete(item)}
                              size="sm"
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  )
                })}
                {/* 合计行 */}
                <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
                  <Table.Td style={{ textAlign: 'center' }}></Table.Td>
                  <Table.Td>
                    <Text fw={600}>合计</Text>
                  </Table.Td>
                  <Table.Td colSpan={3}></Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text fw={600} c="#1D2129">
                      {formatAmount(revenueItems.reduce((sum, item) => sum + calculateTaxableIncome(item), 0))}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text fw={600} c="#165DFF">
                      {formatAmount(revenueItems.reduce((sum, item) => sum + calculateNonTaxIncome(item), 0))}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text fw={600} c="#F7BA1E">
                      {formatAmount(revenueItems.reduce((sum, item) => sum + calculateVatAmount(item), 0))}
                    </Text>
                  </Table.Td>
                  <Table.Td colSpan={2}></Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </div>
        )}
      </Stack>

      {/* 编辑对话框 */}
      <Modal
        opened={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={
          <Group justify="space-between" style={{ width: '100%', paddingRight: '40px' }}>
            <Text size="lg" fw={600}>{isNewItem ? '新增收入项' : '编辑收入项'}</Text>
            <Button
              size="xs"
              leftSection={<IconSparkles size={14} />}
              onClick={handleAiEstimate}
              loading={aiEstimating}
              variant="light"
              color="violet"
            >
              AI测算
            </Button>
          </Group>
        }
        size="md"
      >
        {renderFormFields()}
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => setShowEditModal(false)}>
            取消
          </Button>
          <Button onClick={handleSave} style={{ backgroundColor: '#165DFF', color: '#FFFFFF' }}>
            保存
          </Button>
        </Group>
      </Modal>
      
      {/* 达产率配置弹窗 */}
      <ProductionRateModal
        opened={productionRateModalOpened}
        onClose={() => setProductionRateModalOpened(false)}
      />

      {/* 收入详表弹窗 */}
      <Modal
        opened={showRevenueDetailModal}
        onClose={() => setShowRevenueDetailModal(false)}
        title={
          <Text size="md">
            📊 营业收入、营业税金及附加和增值税估算表
          </Text>
        }
        size="calc(100vw - 100px)"
        styles={{
          body: {
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
          },
        }}
      >
        {(() => {
          if (!context) return <Text c="red">项目上下文未加载</Text>

          const operationYears = context.operationYears
          const years = Array.from({ length: operationYears }, (_, i) => i + 1)

          return (
            <Table striped withTableBorder size="xs" style={{ fontSize: '11px' }}>
              <Table.Thead>
                <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
                  <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>序号</Table.Th>
                  <Table.Th rowSpan={2} style={{ verticalAlign: 'middle', border: '1px solid #dee2e6' }}>项目</Table.Th>
                  <Table.Th colSpan={operationYears} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>运营期</Table.Th>
                </Table.Tr>
                <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
                  {years.map((year) => (
                    <Table.Th key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      {year}
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {/* 1. 营业收入区块 */}
                {revenueItems.map((item, idx) => {
                  const yearlyRevenues = years.map((year) => {
                    const productionRate = getProductionRateForYear(useRevenueCostStore.getState().productionRates, year)
                    return calculateYearlyRevenue(item, year, productionRate)
                  })

                  return (
                    <Table.Tr key={`revenue-${item.id}`}>
                      <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>{idx + 1}</Table.Td>
                      <Table.Td style={{ border: '1px solid #dee2e6' }}>{item.name}</Table.Td>
                      {yearlyRevenues.map((revenue, i) => (
                        <Table.Td key={i} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                          {revenue.toFixed(2)}
                        </Table.Td>
                      ))}
                    </Table.Tr>
                  )
                })}
                {/* 营业收入合计 */}
                <Table.Tr style={{ backgroundColor: '#F0F5FF' }}>
                  <Table.Td colSpan={2} style={{ border: '1px solid #dee2e6' }}>营业收入合计</Table.Td>
                  {years.map((year) => {
                    const yearTotal = revenueItems.reduce((sum, item) => {
                      const productionRate = getProductionRateForYear(useRevenueCostStore.getState().productionRates, year)
                      return sum + calculateYearlyRevenue(item, year, productionRate)
                    }, 0)
                    return (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {yearTotal.toFixed(2)}
                      </Table.Td>
                    )
                  })}
                </Table.Tr>

                {/* 2. 增值税区块 */}
                {revenueItems.map((item, idx) => {
                  const yearlyVATs = years.map((year) => {
                    const productionRate = getProductionRateForYear(useRevenueCostStore.getState().productionRates, year)
                    const revenue = calculateYearlyRevenue(item, year, productionRate)
                    return revenue - revenue / (1 + item.vatRate)
                  })

                  return (
                    <Table.Tr key={`vat-${item.id}`}>
                      <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>{idx + 1}</Table.Td>
                      <Table.Td style={{ border: '1px solid #dee2e6' }}>
                        {item.name}(增值税{(item.vatRate * 100).toFixed(0)}%)
                      </Table.Td>
                      {yearlyVATs.map((vat, i) => (
                        <Table.Td key={i} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                          {vat.toFixed(2)}
                        </Table.Td>
                      ))}
                    </Table.Tr>
                  )
                })}
                {/* 增值税合计 */}
                <Table.Tr style={{ backgroundColor: '#FFF7E6' }}>
                  <Table.Td colSpan={2} style={{ border: '1px solid #dee2e6' }}>增值税合计</Table.Td>
                  {years.map((year) => {
                    const yearTotal = revenueItems.reduce((sum, item) => {
                      const productionRate = getProductionRateForYear(useRevenueCostStore.getState().productionRates, year)
                      const revenue = calculateYearlyRevenue(item, year, productionRate)
                      return sum + (revenue - revenue / (1 + item.vatRate))
                    }, 0)
                    return (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {yearTotal.toFixed(2)}
                      </Table.Td>
                    )
                  })}
                </Table.Tr>

                {/* 3. 营业税金及附加区块 */}
                <Table.Tr>
                  <Table.Td colSpan={2} style={{ border: '1px solid #dee2e6' }}>城市维护建设税（增值税×7%）</Table.Td>
                  {years.map((year) => {
                    const vatTotal = revenueItems.reduce((sum, item) => {
                      const productionRate = getProductionRateForYear(useRevenueCostStore.getState().productionRates, year)
                      const revenue = calculateYearlyRevenue(item, year, productionRate)
                      return sum + (revenue - revenue / (1 + item.vatRate))
                    }, 0)
                    const urbanTax = vatTotal * 0.07
                    return (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {urbanTax.toFixed(2)}
                      </Table.Td>
                    )
                  })}
                </Table.Tr>
                {/* 营业税金及附加合计 */}
                <Table.Tr style={{ backgroundColor: '#E6F7F0' }}>
                  <Table.Td colSpan={2} style={{ border: '1px solid #dee2e6' }}>营业税金及附加合计</Table.Td>
                  {years.map((year) => {
                    const vatTotal = revenueItems.reduce((sum, item) => {
                      const productionRate = getProductionRateForYear(useRevenueCostStore.getState().productionRates, year)
                      const revenue = calculateYearlyRevenue(item, year, productionRate)
                      return sum + (revenue - revenue / (1 + item.vatRate))
                    }, 0)
                    const urbanTax = vatTotal * 0.07
                    return (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {urbanTax.toFixed(2)}
                      </Table.Td>
                    )
                  })}
                </Table.Tr>
              </Table.Tbody>
            </Table>
          )
        })()}
      </Modal>
    </>
  )
}

export default DynamicRevenueTable
