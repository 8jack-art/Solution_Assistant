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
  Textarea,
  Code,
  Collapse,
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
  IconBug,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import { revenueCostApi } from '@/lib/api'
import { useRevenueCostStore, AIAnalysisResult, AIRevenueCategory, AIRevenueType } from '@/stores/revenueCostStore'
import AIDebugPanel from './AIDebugPanel'

/**
 * AI推荐营收结构组件（步骤2）
 */
const AIRevenueStructure: React.FC = () => {
  const { 
    context, 
    aiAnalysisResult, 
    revenueStructureLocked,
    setAIAnalysisResult,
    setRevenueStructureLocked 
  } = useRevenueCostStore()
  
  // 状态管理
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false)
  
  // 调试信息状态
  const [debugPanelOpened, setDebugPanelOpened] = useState(false) // 调试面板是否展开
  const [debugInfo, setDebugInfo] = useState<{
    timestamp: string
    requestUrl: string
    requestBody: any
    responseStatus?: number
    responseData?: any
    errorMessage?: string
    errorStack?: string
  } | null>(null)
  
  // 编辑类别弹窗
  const [editCategoryModalOpened, setEditCategoryModalOpened] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AIRevenueCategory | null>(null)
  const [originalEditingCategory, setOriginalEditingCategory] = useState<AIRevenueCategory | null>(null)
  const [categoryModified, setCategoryModified] = useState(false)
  
  // 编辑收入类型弹窗
  const [editRevenueTypeModalOpened, setEditRevenueTypeModalOpened] = useState(false)
  const [editingRevenueType, setEditingRevenueType] = useState<AIRevenueType | null>(null)
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
    
    // 记录请求信息
    const requestBody = {
      projectInfo: context.projectName || '',
    }
    const requestUrl = `/api/revenue-cost/ai-recommend/${context.projectId}`
    
    setDebugInfo({
      timestamp: new Date().toISOString(),
      requestUrl,
      requestBody,
    })
    
    try {
      const response = await revenueCostApi.aiRecommend(context.projectId, requestBody)

      // 记录响应信息
      setDebugInfo(prev => ({
        ...prev!,
        responseStatus: 200,
        responseData: response,
      }))

      if (!response.success || !response.data) {
        // 记录业务错误
        setDebugInfo(prev => ({
          ...prev!,
          errorMessage: response.error || '未知错误',
        }))
        
        notifications.show({
          title: 'AI分析失败',
          message: response.error || '未知错误',
          color: 'red',
        })
            
        // 不自动打开调试面板，由用户手动点击按钮
        return
      }

      setAIAnalysisResult(response.data.analysis)
      
      console.log('✅ AI分析成功，数据已设置:', response.data.analysis)
      console.log('✅ 营收类别数量:', response.data.analysis.total_categories)
      console.log('✅ 类别详情:', response.data.analysis.selected_categories)
      
      // 强制触发重新渲染
      setTimeout(() => {
        console.log('🔄 验证数据是否已保存到store...')
      }, 100)
      
      notifications.show({
        title: 'AI分析成功',
        message: `已推荐 ${response.data.analysis.total_categories} 个营收类别`,
        color: 'green',
      })
    } catch (error: any) {
      console.error('AI分析错误:', error)
      
      // 记录异常信息
      setDebugInfo(prev => ({
        ...prev!,
        responseStatus: error.response?.status || 500,
        errorMessage: error.message || '请求失败',
        errorStack: error.stack,
        responseData: error.response?.data,
      }))
      
      notifications.show({
        title: 'AI分析失败',
        message: error.message || '请稍后重试',
        color: 'red',
      })
      
      // 不自动打开调试面板，由用户手动点击按钮
    } finally {
      setGeneratingSuggestions(false)
    }
  }

  /**
   * 点击AI分析按钮（带确认）
   */
  const handleAIAnalysisClick = () => {
    console.log('🔵 点击开始AI分析按钮')
    console.log('📋 当前aiAnalysisResult:', aiAnalysisResult)
    console.log('📋 revenueStructureLocked:', revenueStructureLocked)
    
    if (aiAnalysisResult && aiAnalysisResult.selected_categories && aiAnalysisResult.selected_categories.length > 0) {
      console.log('⚠️ 检测到已有数据，弹出确认对话框')
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
        onConfirm: () => {
          console.log('✅ 用户点击了「继续」，开始分析...')
          generateAISuggestions()
        },
        onCancel: () => {
          console.log('❌ 用户取消了操作')
        },
      })
    } else {
      console.log('✅ 无数据，直接分析')
      generateAISuggestions()
    }
  }

  /**
   * 打开编辑类别弹窗
   */
  const openEditCategoryModal = (category: AIRevenueCategory) => {
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
    setAIAnalysisResult({
      ...aiAnalysisResult!,
      selected_categories: aiAnalysisResult!.selected_categories.map((cat) =>
        cat.category_code === editingCategory.category_code ? editingCategory : cat
      ),
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

    // 检查是否只剩一个收入类型
    if (editingCategory.recommended_revenue_types.length <= 1) {
      notifications.show({
        title: '无法删除',
        message: '至少需要保留一个收入类型',
        color: 'orange',
      })
      return
    }

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
  const openEditRevenueTypeModal = (revenueType: AIRevenueType) => {
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
    // 检查是否只剩一个类别
    if (aiAnalysisResult && aiAnalysisResult.selected_categories.length <= 1) {
      notifications.show({
        title: '无法删除',
        message: '至少需要保留一个营收类别',
        color: 'orange',
      })
      return
    }

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
        const newCategories = aiAnalysisResult!.selected_categories.filter(
          (cat) => cat.category_code !== categoryCode
        )
        setAIAnalysisResult({
          ...aiAnalysisResult!,
          selected_categories: newCategories,
          total_categories: newCategories.length,
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
        return 'orange'
      case 'medium':
        return 'green'
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
              disabled={
                generatingSuggestions || // AI分析中禁用
                !aiAnalysisResult || 
                !aiAnalysisResult.selected_categories || 
                aiAnalysisResult.selected_categories.length === 0
              }
              onChange={async (event) => {
                const locked = event.currentTarget.checked
                setRevenueStructureLocked(locked)
                
                if (locked) {
                  // 锁定时保存AI分析结果到数据库
                  if (context?.projectId && aiAnalysisResult) {
                    try {
                      console.log('💾 开始保存AI分析结果...')
                      console.log('📊 保存数据:', {
                        project_id: context.projectId,
                        workflow_step: 'suggest',
                        ai_analysis_result: aiAnalysisResult
                      })
                      const response = await revenueCostApi.save({
                        project_id: context.projectId,
                        workflow_step: 'suggest',
                        ai_analysis_result: aiAnalysisResult,
                      })
                      
                      console.log('💾 保存响应:', response)
                      
                      if (response.success) {
                        console.log('✅ AI分析结果已保存到数据库')
                        notifications.show({
                          title: '已锁定',
                          message: '营收结构表已锁定并保存，可以进行下一步',
                          color: 'green',
                        })
                      } else {
                        throw new Error(response.error || '保存失败')
                      }
                    } catch (error: any) {
                      console.error('❌ 保存AI分析结果失败:', error)
                      console.error('❌ 错误详情:', error.response?.data || error.message)
                      notifications.show({
                        title: '保存失败',
                        message: error.response?.data?.error || error.message || '请稍后重试',
                        color: 'red',
                      })
                      // 保存失败时取消锁定
                      setRevenueStructureLocked(false)
                    }
                  }
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
            
            {/* 调试按钮（只在有调试信息时显示） */}
            {debugInfo && (
              <Tooltip label="查看调试信息">
                <ActionIcon
                  variant="light"
                  color="orange"
                  size="lg"
                  onClick={() => setDebugPanelOpened(!debugPanelOpened)}
                >
                  <IconBug size={18} />
                </ActionIcon>
              </Tooltip>
            )}
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
                      <Stack gap="xs">
                        {category.recommended_revenue_types.map((type, idx) => (
                          <Group key={type.type_name} gap="xs">
                            <Text size="xs" c="#86909C" style={{ minWidth: '20px' }}>
                              {idx + 1}.
                            </Text>
                            <Badge
                              color={getPriorityColor(type.priority)}
                              variant="light"
                              size="sm"
                            >
                              {type.type_name}
                            </Badge>
                          </Group>
                        ))}
                      </Stack>
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
        
        {/* 调试面板（只在用户点击按钮后显示） */}
        {debugInfo && debugPanelOpened && (
          <AIDebugPanel 
            debugInfo={debugInfo} 
            currentStoreData={{
              aiAnalysisResult,
              revenueStructureLocked,
              context,
            }}
          />
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
