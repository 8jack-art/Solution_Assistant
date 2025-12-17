import React, { useState } from 'react'
import {
  Card,
  Stack,
  Text,
  Button,
  Group,
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  Modal,
  TextInput,
  NumberInput,
  Switch,
  Loader,
} from '@mantine/core'
import {
  IconSparkles,
  IconEdit,
  IconTrash,
  IconPlus,
  IconCheck,
  IconX,
  IconLock,
  IconLockOpen,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import { revenueCostApi } from '@/lib/api'
import { useRevenueCostStore } from '@/stores/revenueCostStore'

/**
 * 营业收入类型
 */
interface RevenueType {
  type_name: string
  priority: 'high' | 'medium' | 'low'
  suggested_vat_rate: number
  typical_pricing_model: string
  estimated_proportion: string
}

/**
 * 营收类别
 */
interface RevenueCategory {
  category_code: string
  category_name: string
  category_icon: string
  relevance_score: number
  reasoning: string
  recommended_revenue_types: RevenueType[]
}

/**
 * AI分析结果
 */
interface AIAnalysisResult {
  selected_categories: RevenueCategory[]
  total_categories: number
  analysis_summary: string
}

/**
 * AI推荐营收结构组件（步骤2）
 */
const AIRevenueStructure: React.FC = () => {
  const { context } = useRevenueCostStore()
  
  // 状态管理
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AIAnalysisResult | null>(null)
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false)
  const [revenueStructureLocked, setRevenueStructureLocked] = useState(false)
  
  // 编辑类别弹窗
  const [editCategoryModalOpened, setEditCategoryModalOpened] = useState(false)
  const [editingCategory, setEditingCategory] = useState<RevenueCategory | null>(null)
  const [originalEditingCategory, setOriginalEditingCategory] = useState<RevenueCategory | null>(null)
  const [categoryModified, setCategoryModified] = useState(false)
  
  // 编辑收入类型弹窗
  const [editRevenueTypeModalOpened, setEditRevenueTypeModalOpened] = useState(false)
  const [editingRevenueType, setEditingRevenueType] = useState<RevenueType | null>(null)
  const [analyzingPricingModel, setAnalyzingPricingModel] = useState(false)

  /**
   * 开始AI分析营收结构
   */
  const generateAISuggestions = async () => {
    if (!context?.projectId) {
      notifications.show({
        title: '错误',
        message: '未找到项目信息',
        color: 'red',
      })
      return
    }

    setGeneratingSuggestions(true)
    try {
      const response = await revenueCostApi.aiRecommend(context.projectId, {
        projectInfo: context.projectName || '',
      })

      if (!response.success || !response.data) {
        notifications.show({
          title: 'AI分析失败',
          message: response.error || '未知错误',
          color: 'red',
        })
        return
      }

      setAiAnalysisResult(response.data.analysis)
      notifications.show({
        title: 'AI分析成功',
        message: `已推荐 ${response.data.analysis.total_categories} 个营收类别`,
        color: 'green',
      })
    } catch (error: any) {
      console.error('AI分析错误:', error)
      notifications.show({
        title: 'AI分析失败',
        message: error.message || '请稍后重试',
        color: 'red',
      })
    } finally {
      setGeneratingSuggestions(false)
    }
  }

  /**
   * 点击AI分析按钮（带确认）
   */
  const handleAIAnalysisClick = () => {
    if (aiAnalysisResult && aiAnalysisResult.selected_categories && aiAnalysisResult.selected_categories.length > 0) {
      modals.openConfirmModal({
        title: '确认重新分析',
        centered: true,
        children: (
          <Text size="sm">
            当前已有 <strong>{aiAnalysisResult.total_categories}</strong> 个营收类别数据。
            <br /><br />
            点击 <strong>「继续」</strong> 将会覆盖当前数据，是否继续？
          </Text>
        ),
        labels: { confirm: '继续', cancel: '取消' },
        confirmProps: { color: 'red' },
        onConfirm: () => generateAISuggestions(),
      })
    } else {
      generateAISuggestions()
    }
  }

  /**
   * 打开编辑类别弹窗
   */
  const openEditCategoryModal = (category: RevenueCategory) => {
    // 深拷贝原始数据，用于取消时恢复
    setOriginalEditingCategory(JSON.parse(JSON.stringify(category)))
    setEditingCategory(JSON.parse(JSON.stringify(category)))
    setCategoryModified(false)
    setEditCategoryModalOpened(true)
  }

  /**
   * 应用类别修改
   */
  const applyCategory修改 = () => {
    if (!editingCategory) return

    // 更新 aiAnalysisResult
    setAiAnalysisResult((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        selected_categories: prev.selected_categories.map((cat) =>
          cat.category_code === editingCategory.category_code ? editingCategory : cat
        ),
      }
    })

    notifications.show({
      title: '应用成功',
      message: '营收类别已更新',
      color: 'green',
    })

    setEditCategoryModalOpened(false)
    setEditingCategory(null)
    setOriginalEditingCategory(null)
    setCategoryModified(false)
  }

  /**
   * 取消类别修改
   */
  const cancelCategoryEdit = () => {
    setEditingCategory(null)
    setOriginalEditingCategory(null)
    setCategoryModified(false)
    setEditCategoryModalOpened(false)
  }

  /**
   * 删除收入类型
   */
  const deleteRevenueType = (typeName: string) => {
    if (!editingCategory) return

    setEditingCategory({
      ...editingCategory,
      recommended_revenue_types: editingCategory.recommended_revenue_types.filter(
        (t) => t.type_name !== typeName
      ),
    })
    setCategoryModified(true)
  }

  /**
   * 打开编辑收入类型弹窗
   */
  const openEditRevenueTypeModal = (revenueType: RevenueType) => {
    setEditingRevenueType(JSON.parse(JSON.stringify(revenueType)))
    setEditRevenueTypeModalOpened(true)
  }

  /**
   * 打开新增收入类型弹窗
   */
  const openAddRevenueTypeModal = () => {
    setEditingRevenueType({
      type_name: '',
      priority: 'medium',
      suggested_vat_rate: 0.13,
      typical_pricing_model: '',
      estimated_proportion: '0',
    })
    setEditRevenueTypeModalOpened(true)
  }

  /**
   * AI分析税率和计费模式
   */
  const analyzeRevenueTypePricing = async () => {
    if (!editingRevenueType || !editingRevenueType.type_name.trim()) {
      notifications.show({
        title: '提示',
        message: '请先输入营业收入类型名称',
        color: 'orange',
      })
      return
    }

    const typeName = editingRevenueType.type_name.trim()

    // 验证是否为有效的收入类型名称（允许测试性收入）
    const isTestRevenue = /测试[0-9A-Za-z\u4e00-\u9fa5]*/.test(typeName)

    if (!isTestRevenue) {
      const revenueKeywords = [
        '收入', '销售', '服务', '租赁', '费', '佣金', '营业', '产品',
        '咨询', '代理', '会员', '订阅', '推广', '培训', '管理',
        '运营', '维护', '加工', '制作', '设计', '开发', '建设',
        '种植', '养殖', '捕捞', '采集', '生产'
      ]

      const hasRevenueKeyword = revenueKeywords.some((keyword) => typeName.includes(keyword))

      if (!hasRevenueKeyword) {
        notifications.show({
          title: '输入无效',
          message: '请输入有效的营业收入类型名称，例如："中药材销售收入"、"咨询服务费"等',
          color: 'orange',
        })
        return
      }
    }

    setAnalyzingPricingModel(true)
    try {
      const response = await revenueCostApi.analyzePricing(typeName)

      if (!response.success || !response.data) {
        notifications.show({
          title: 'AI分析失败',
          message: response.error || '未知错误',
          color: 'red',
        })
        return
      }

      // 更新税率和计费模式
      setEditingRevenueType({
        ...editingRevenueType,
        suggested_vat_rate: response.data.vat_rate / 100, // 转换为小数
        typical_pricing_model: response.data.pricing_model,
      })

      notifications.show({
        title: 'AI分析成功',
        message: `税率：${response.data.vat_rate}%，计费模式：${response.data.pricing_model}`,
        color: 'green',
      })
    } catch (error: any) {
      console.error('AI分析错误:', error)
      notifications.show({
        title: 'AI分析失败',
        message: error.message || '请稍后重试',
        color: 'red',
      })
    } finally {
      setAnalyzingPricingModel(false)
    }
  }

  /**
   * 保存收入类型编辑
   */
  const saveRevenueTypeEdit = () => {
    if (!editingRevenueType || !editingCategory) return

    if (!editingRevenueType.type_name.trim()) {
      notifications.show({
        title: '验证失败',
        message: '请输入营业收入类型名称',
        color: 'red',
      })
      return
    }

    // 检查是否为新增（没有原始type_name）还是编辑
    const isNew = !editingCategory.recommended_revenue_types.find(
      (t) => t.type_name === editingRevenueType.type_name
    )

    if (isNew) {
      // 新增
      setEditingCategory({
        ...editingCategory,
        recommended_revenue_types: [
          ...editingCategory.recommended_revenue_types,
          editingRevenueType,
        ],
      })
    } else {
      // 编辑
      setEditingCategory({
        ...editingCategory,
        recommended_revenue_types: editingCategory.recommended_revenue_types.map((t) =>
          t.type_name === editingRevenueType.type_name ? editingRevenueType : t
        ),
      })
    }

    setCategoryModified(true)
    setEditRevenueTypeModalOpened(false)
    setEditingRevenueType(null)
  }

  /**
   * 删除营收类别
   */
  const deleteCategory = (categoryCode: string) => {
    modals.openConfirmModal({
      title: '确认删除',
      centered: true,
      children: (
        <Text size="sm">
          确定要删除该营收类别吗？此操作不可恢复。
        </Text>
      ),
      labels: { confirm: '删除', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        setAiAnalysisResult((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            selected_categories: prev.selected_categories.filter(
              (cat) => cat.category_code !== categoryCode
            ),
            total_categories: prev.total_categories - 1,
          }
        })
        notifications.show({
          title: '删除成功',
          message: '营收类别已删除',
          color: 'green',
        })
      },
    })
  }

  /**
   * 获取优先级颜色
   */
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'red'
      case 'medium':
        return 'orange'
      case 'low':
        return 'gray'
      default:
        return 'gray'
    }
  }

  /**
   * 获取优先级文字
   */
  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return '高'
      case 'medium':
        return '中'
      case 'low':
        return '低'
      default:
        return '中'
    }
  }

  return (
    <Card shadow="sm" padding="xl" radius="md" withBorder>
      <Stack gap="lg">
        {/* 标题和操作栏 */}
        <Group justify="space-between">
          <div>
            <Text size="lg" fw={600} c="#1D2129">
              AI推荐营收结构
            </Text>
            <Text size="sm" c="#86909C" mt={4}>
              根据项目特征智能推荐合适的营业收入类型
            </Text>
          </div>

          <Group gap="md">
            {/* 锁定开关 */}
            <Switch
              checked={revenueStructureLocked}
              disabled={!aiAnalysisResult || !aiAnalysisResult.selected_categories || aiAnalysisResult.selected_categories.length === 0}
              onChange={(event) => {
                const locked = event.currentTarget.checked
                setRevenueStructureLocked(locked)
                if (locked) {
                  notifications.show({
                    title: '已锁定',
                    message: '营收结构表已锁定，可以进行下一步',
                    color: 'green',
                  })
                } else {
                  notifications.show({
                    title: '已解锁',
                    message: '营收结构表已解锁，可以继续编辑',
                    color: 'blue',
                  })
                }
              }}
              label={
                <Text size="sm" c={revenueStructureLocked ? '#00C48C' : '#86909C'}>
                  {revenueStructureLocked ? '已锁定' : '未锁定'}
                </Text>
              }
              color="green"
              thumbIcon={
                revenueStructureLocked ? (
                  <IconLock size={12} />
                ) : (
                  <IconLockOpen size={12} />
                )
              }
            />

            {/* AI分析按钮 */}
            <Button
              leftSection={generatingSuggestions ? <Loader size={16} /> : <IconSparkles size={16} />}
              onClick={handleAIAnalysisClick}
              loading={generatingSuggestions}
              disabled={revenueStructureLocked}
              style={{
                backgroundColor: '#165DFF',
                color: '#FFFFFF',
              }}
            >
              {generatingSuggestions ? 'AI分析中...' : '开始AI分析'}
            </Button>
          </Group>
        </Group>

        {/* AI分析结果汇总表格 */}
        {aiAnalysisResult && aiAnalysisResult.selected_categories.length > 0 && (
          <div>
            <Text size="sm" c="#86909C" mb="md">
              {aiAnalysisResult.analysis_summary}
            </Text>

            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>序号</Table.Th>
                  <Table.Th>营收大类</Table.Th>
                  <Table.Th>营业收入类型</Table.Th>
                  <Table.Th>相关度</Table.Th>
                  <Table.Th>操作</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {aiAnalysisResult.selected_categories.map((category, index) => (
                  <Table.Tr key={category.category_code}>
                    <Table.Td>{index + 1}</Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {category.category_icon} {category.category_name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {category.recommended_revenue_types.map((type) => (
                          <Badge
                            key={type.type_name}
                            color={getPriorityColor(type.priority)}
                            variant="light"
                            size="sm"
                          >
                            {type.type_name}
                          </Badge>
                        ))}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="#165DFF" fw={600}>
                        {(category.relevance_score * 100).toFixed(0)}%
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="编辑">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() => openEditCategoryModal(category)}
                            disabled={revenueStructureLocked}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="删除">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => deleteCategory(category.category_code)}
                            disabled={revenueStructureLocked}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        )}

        {/* 无数据提示 */}
        {!aiAnalysisResult && !generatingSuggestions && (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#F7F8FA',
            borderRadius: '8px',
          }}>
            <Text size="sm" c="#86909C">
              点击「开始AI分析」按钮，系统将根据项目信息智能推荐营收结构
            </Text>
          </div>
        )}
      </Stack>

      {/* 编辑营收类别弹窗 */}
      <Modal
        opened={editCategoryModalOpened}
        onClose={cancelCategoryEdit}
        title={
          <Text size="lg" fw={600}>
            编辑营收类别 - {editingCategory?.category_name}
          </Text>
        }
        size="xl"
        centered
      >
        {editingCategory && (
          <Stack gap="md">
            {/* 推荐理由和相关度 */}
            <Card withBorder p="md">
              <Group justify="space-between">
                <div style={{ flex: 1 }}>
                  <Text size="xs" c="#86909C" mb={4}>推荐理由</Text>
                  <Text size="sm">{editingCategory.reasoning}</Text>
                </div>
                <div>
                  <Text size="xs" c="#86909C" mb={4}>相关度</Text>
                  <Text size="lg" fw={700} c="#165DFF">
                    {(editingCategory.relevance_score * 100).toFixed(0)}%
                  </Text>
                </div>
              </Group>
            </Card>

            {/* 营业收入类型表格 */}
            <div>
              <Group justify="space-between" mb="md">
                <Text size="sm" fw={500}>营业收入类型</Text>
                <Button
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={openAddRevenueTypeModal}
                >
                  新增
                </Button>
              </Group>

              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>序号</Table.Th>
                    <Table.Th>优先级</Table.Th>
                    <Table.Th>名称</Table.Th>
                    <Table.Th>计费模式</Table.Th>
                    <Table.Th>税率</Table.Th>
                    <Table.Th>占比</Table.Th>
                    <Table.Th>操作</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {editingCategory.recommended_revenue_types.map((type, index) => (
                    <Table.Tr key={type.type_name}>
                      <Table.Td>{index + 1}</Table.Td>
                      <Table.Td>
                        <Badge color={getPriorityColor(type.priority)} size="sm">
                          {getPriorityText(type.priority)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{type.type_name}</Table.Td>
                      <Table.Td>
                        <Text size="sm" c="#4E5969">{type.typical_pricing_model}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600} c="#00C48C">
                          {(type.suggested_vat_rate * 100).toFixed(0)}%
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{type.estimated_proportion}%</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            size="sm"
                            onClick={() => openEditRevenueTypeModal(type)}
                          >
                            <IconEdit size={14} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() => deleteRevenueType(type.type_name)}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>

            {/* 操作按钮 */}
            <Group justify="flex-end" gap="md">
              <Button
                variant="filled"
                onClick={applyCategory修改}
                disabled={!categoryModified}
                style={{
                  backgroundColor: categoryModified ? '#165DFF' : '#E5E6EB',
                  color: categoryModified ? '#FFFFFF' : '#86909C',
                }}
              >
                应用
              </Button>
              <Button variant="default" onClick={cancelCategoryEdit}>
                取消
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* 编辑/新增收入类型弹窗 */}
      <Modal
        opened={editRevenueTypeModalOpened}
        onClose={() => {
          setEditRevenueTypeModalOpened(false)
          setEditingRevenueType(null)
        }}
        title={
          <Text size="md" fw={600}>
            {editingRevenueType?.type_name ? '编辑' : '新增'}营业收入类型
          </Text>
        }
        size="md"
        centered
      >
        {editingRevenueType && (
          <Stack gap="md">
            <TextInput
              label="收入类型名称"
              placeholder="例如：中药材销售收入"
              value={editingRevenueType.type_name}
              onChange={(e) =>
                setEditingRevenueType({
                  ...editingRevenueType,
                  type_name: e.target.value,
                })
              }
              required
            />

            <NumberInput
              label="增值税率 (%)"
              value={editingRevenueType.suggested_vat_rate * 100}
              onChange={(value) =>
                setEditingRevenueType({
                  ...editingRevenueType,
                  suggested_vat_rate: (value as number) / 100,
                })
              }
              min={0}
              max={100}
              step={1}
              decimalScale={0}
            />

            <TextInput
              label="计费模式"
              placeholder="例如：按重量销售"
              value={editingRevenueType.typical_pricing_model}
              onChange={(e) =>
                setEditingRevenueType({
                  ...editingRevenueType,
                  typical_pricing_model: e.target.value,
                })
              }
            />

            <Group justify="space-between" gap="md">
              <Button
                variant="light"
                leftSection={analyzingPricingModel ? <Loader size={14} /> : <IconSparkles size={14} />}
                onClick={analyzeRevenueTypePricing}
                loading={analyzingPricingModel}
              >
                AI分析
              </Button>

              <Group gap="md">
                <Button variant="default" onClick={() => setEditRevenueTypeModalOpened(false)}>
                  取消
                </Button>
                <Button onClick={saveRevenueTypeEdit}>
                  确定
                </Button>
              </Group>
            </Group>
          </Stack>
        )}
      </Modal>
    </Card>
  )
}

export default AIRevenueStructure
