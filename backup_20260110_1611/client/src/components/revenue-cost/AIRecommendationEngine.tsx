import React, { useState } from 'react'
import {
  Card,
  Stack,
  Text,
  Button,
  Group,
  Checkbox,
  Table,
  LoadingOverlay,
  Badge,
  Select,
} from '@mantine/core'
import { IconSparkles, IconCheck, IconX } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useRevenueCostStore, RevenueItem, RevenueCategory, FieldTemplate } from '@/stores/revenueCostStore'

/**
 * AI推荐的收入项结构
 */
interface AIRecommendation {
  id: string
  name: string
  category: RevenueCategory
  fieldTemplate: FieldTemplate
  defaultVatRate: number
  reason: string
  selected: boolean
  // 允许用户编辑收入类型
  editableCategory?: RevenueCategory
}

/**
 * AI推荐营收结构组件
 */
const AIRecommendationEngine: React.FC = () => {
  const { context, addRevenueItem } = useRevenueCostStore()
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [hasRecommended, setHasRecommended] = useState(false)

  // 收入类别选项
  const categoryOptions = [
    { value: 'digital-platform', label: '数字平台' },
    { value: 'agriculture-crop', label: '农业种植' },
    { value: 'manufacturing', label: '制造业' },
    { value: 'service', label: '服务业' },
    { value: 'real-estate', label: '房地产' },
    { value: 'other', label: '其他' },
  ]

  // 获取类别标签
  const getCategoryLabel = (category: RevenueCategory): string => {
    return categoryOptions.find(opt => opt.value === category)?.label || '其他'
  }

  // 获取字段模板标签
  const getFieldTemplateLabel = (template: FieldTemplate): string => {
    const labels: Record<FieldTemplate, string> = {
      'quantity-price': '数量×单价',
      'area-yield-price': '面积×亩产量×单价',
      'capacity-utilization': '产能×利用率×单价',
      'subscription': '订阅数×单价',
      'direct-amount': '直接金额',
    }
    return labels[template]
  }

  // AI推荐逻辑
  const handleAIRecommend = async () => {
    if (!context) {
      notifications.show({
        title: '错误',
        message: '未找到项目上下文',
        color: 'red',
      })
      return
    }

    setLoading(true)
    try {
      // 模拟AI推荐（实际应该调用后端API）
      await new Promise(resolve => setTimeout(resolve, 1500))

      const projectName = context.projectName.toLowerCase()
      const aiRecommendations: AIRecommendation[] = []

      // 数字平台类项目
      if (projectName.includes('云平台') || projectName.includes('saas') || 
          projectName.includes('ai') || projectName.includes('智能')) {
        aiRecommendations.push(
          {
            id: 'ai-1',
            name: 'SaaS平台会员费',
            category: 'digital-platform',
            fieldTemplate: 'subscription',
            defaultVatRate: 0.06,
            reason: '数字平台通常采用订阅制收费模式',
            selected: true,
            editableCategory: 'digital-platform'
          },
          {
            id: 'ai-2',
            name: 'API调用费',
            category: 'digital-platform',
            fieldTemplate: 'quantity-price',
            defaultVatRate: 0.06,
            reason: 'API服务按调用次数计费',
            selected: true,
            editableCategory: 'digital-platform'
          },
          {
            id: 'ai-3',
            name: 'AI增值服务费',
            category: 'digital-platform',
            fieldTemplate: 'direct-amount',
            defaultVatRate: 0.06,
            reason: '增值服务可按项目直接计费',
            selected: false,
            editableCategory: 'digital-platform'
          }
        )
      }

      // 农业种植类项目
      if (projectName.includes('种植') || projectName.includes('农田') || 
          projectName.includes('果树') || projectName.includes('甘蔗')) {
        aiRecommendations.push(
          {
            id: 'ai-4',
            name: '农产品销售收入',
            category: 'agriculture-crop',
            fieldTemplate: 'area-yield-price',
            defaultVatRate: 0.09,
            reason: '农产品销售按面积、亩产量计算',
            selected: true,
            editableCategory: 'agriculture-crop'
          },
          {
            id: 'ai-5',
            name: '种苗销售收入',
            category: 'agriculture-crop',
            fieldTemplate: 'quantity-price',
            defaultVatRate: 0.09,
            reason: '种苗按数量销售',
            selected: false,
            editableCategory: 'agriculture-crop'
          }
        )
      }

      // 制造业类项目
      if (projectName.includes('生产') || projectName.includes('制造') || 
          projectName.includes('加工') || projectName.includes('车间')) {
        aiRecommendations.push(
          {
            id: 'ai-6',
            name: '产品销售收入',
            category: 'manufacturing',
            fieldTemplate: 'capacity-utilization',
            defaultVatRate: 0.13,
            reason: '制造业产品按产能和利用率计算',
            selected: true,
            editableCategory: 'manufacturing'
          }
        )
      }

      // 服务业类项目
      if (projectName.includes('服务') || projectName.includes('咨询') || projectName.includes('培训')) {
        aiRecommendations.push(
          {
            id: 'ai-7',
            name: '服务费收入',
            category: 'service',
            fieldTemplate: 'direct-amount',
            defaultVatRate: 0.06,
            reason: '服务业收入按项目直接计费',
            selected: true,
            editableCategory: 'service'
          }
        )
      }

      // 如果没有匹配到任何类型，给出通用推荐
      if (aiRecommendations.length === 0) {
        aiRecommendations.push(
          {
            id: 'ai-8',
            name: '主营业务收入',
            category: 'other',
            fieldTemplate: 'quantity-price',
            defaultVatRate: 0.13,
            reason: '通用收入项，可根据实际业务调整',
            selected: true,
            editableCategory: 'other'
          }
        )
      }

      setRecommendations(aiRecommendations)
      setHasRecommended(true)

      notifications.show({
        title: '推荐成功',
        message: `AI已为您推荐 ${aiRecommendations.length} 个营收项`,
        color: 'blue',
      })
    } catch (error) {
      console.error('AI推荐失败:', error)
      notifications.show({
        title: '推荐失败',
        message: 'AI推荐服务暂时不可用，请稍后重试',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  // 切换选中状态
  const toggleSelection = (id: string) => {
    setRecommendations(prev =>
      prev.map(item =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    )
  }

  // 更新收入类型
  const updateCategory = (id: string, category: string) => {
    setRecommendations(prev =>
      prev.map(item =>
        item.id === id ? { ...item, editableCategory: category as RevenueCategory } : item
      )
    )
  }

  // 应用选中的推荐
  const handleApplySelected = () => {
    const selectedItems = recommendations.filter(r => r.selected)
    
    if (selectedItems.length === 0) {
      notifications.show({
        title: '提示',
        message: '请至少选择一个推荐项',
        color: 'orange',
      })
      return
    }

    selectedItems.forEach(item => {
      addRevenueItem({
        name: item.name,
        category: item.editableCategory || item.category, // 使用编辑后的类别
        fieldTemplate: item.fieldTemplate,
        vatRate: item.defaultVatRate,
      })
    })

    notifications.show({
      title: '应用成功',
      message: `已添加 ${selectedItems.length} 个收入项到收入建模`,
      color: 'green',
    })

    // 清空推荐列表
    setRecommendations([])
    setHasRecommended(false)
  }

  return (
    <Card shadow="sm" padding="xl" radius="md" withBorder style={{ position: 'relative' }}>
      <LoadingOverlay visible={loading} />
      
      <Stack gap="lg">
        <div>
          <Group gap="xs" mb="xs">
            <IconSparkles size={24} color="#F7BA1E" />
            <Text size="lg" fw={600} c="#1D2129">
              AI推荐营收结构
            </Text>
          </Group>
          <Text size="sm" c="#86909C">
            基于项目类型智能推荐适合的营收项目结构，可编辑收入类型后应用
          </Text>
        </div>

        {!hasRecommended ? (
          <div style={{
            padding: '60px 40px',
            textAlign: 'center',
            backgroundColor: '#F7F8FA',
            borderRadius: '8px',
            border: '1px dashed #E5E6EB'
          }}>
            <IconSparkles size={48} color="#C9CDD4" style={{ marginBottom: '16px' }} />
            <Text size="md" c="#4E5969" mb="xl">
              点击下方按钮，让AI为您的项目推荐合适的营收结构
            </Text>
            <Button
              size="md"
              leftSection={<IconSparkles size={18} />}
              onClick={handleAIRecommend}
              style={{ backgroundColor: '#F7BA1E', color: '#FFFFFF' }}
            >
              开始AI推荐
            </Button>
          </div>
        ) : (
          <>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={50}>选择</Table.Th>
                  <Table.Th>收入项名称</Table.Th>
                  <Table.Th>收入类型</Table.Th>
                  <Table.Th>计算模板</Table.Th>
                  <Table.Th>增值税率</Table.Th>
                  <Table.Th>推荐理由</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {recommendations.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Checkbox
                        checked={item.selected}
                        onChange={() => toggleSelection(item.id)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>{item.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Select
                        size="xs"
                        data={categoryOptions}
                        value={item.editableCategory || item.category}
                        onChange={(value) => updateCategory(item.id, value!)}
                        style={{ width: 120 }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Badge color="blue" variant="light">
                        {getFieldTemplateLabel(item.fieldTemplate)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="#165DFF">{(item.defaultVatRate * 100).toFixed(0)}%</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="#86909C">{item.reason}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <Group justify="space-between">
              <Button
                variant="default"
                leftSection={<IconX size={16} />}
                onClick={() => {
                  setRecommendations([])
                  setHasRecommended(false)
                }}
              >
                重新推荐
              </Button>
              <Button
                leftSection={<IconCheck size={16} />}
                onClick={handleApplySelected}
                style={{ backgroundColor: '#00C48C', color: '#FFFFFF' }}
              >
                应用选中的推荐 ({recommendations.filter(r => r.selected).length})
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Card>
  )
}

export default AIRecommendationEngine
