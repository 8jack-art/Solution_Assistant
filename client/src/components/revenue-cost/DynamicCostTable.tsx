import React, { useState } from 'react'
import {
  Card,
  Stack,
  Text,
  Button,
  Group,
  Table,
  Modal,
  TextInput,
  NumberInput,
  Select,
  ActionIcon,
  Tooltip,
  Badge,
  Tabs,
} from '@mantine/core'
import { IconPlus, IconEdit, IconTrash, IconPackage } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useRevenueCostStore, CostItem, FieldTemplate } from '@/stores/revenueCostStore'

/**
 * 成本类别标签
 */
const COST_CATEGORY_LABELS = {
  'raw-material': '外购原材料',
  'labor': '人工费用',
  'manufacturing': '制造费用',
  'other': '其他成本',
}

/**
 * 添加方式选项（外购原材料专用）
 */
const PURCHASE_METHOD_OPTIONS = [
  { value: 'quantity-price', label: '数量×单价' },
  { value: 'direct-amount', label: '直接金额' },
]

/**
 * 动态成本表格组件
 */
const DynamicCostTable: React.FC = () => {
  const { costItems, addCostItem, updateCostItem, deleteCostItem } = useRevenueCostStore()
  
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<CostItem | null>(null)
  const [isNewItem, setIsNewItem] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('raw-material')

  // 表单数据
  const [formData, setFormData] = useState<Partial<CostItem>>({})

  /**
   * 打开新增弹窗
   */
  const handleAdd = (category: string) => {
    setFormData({
      name: '',
      category: category as any,
      fieldTemplate: 'quantity-price',
    })
    setEditingItem(null)
    setIsNewItem(true)
    setShowModal(true)
  }

  /**
   * 打开编辑弹窗
   */
  const handleEdit = (item: CostItem) => {
    setFormData({ ...item })
    setEditingItem(item)
    setIsNewItem(false)
    setShowModal(true)
  }

  /**
   * 删除成本项
   */
  const handleDelete = (item: CostItem) => {
    if (confirm(`确定要删除"${item.name}"吗？`)) {
      deleteCostItem(item.id)
      notifications.show({
        title: '成功',
        message: '成本项已删除',
        color: 'green',
      })
    }
  }

  /**
   * 保存成本项（含表单验证）
   */
  const handleSave = () => {
    // 验证：名称不能为空
    if (!formData.name || formData.name.trim() === '') {
      notifications.show({
        title: '错误',
        message: '请输入成本项名称',
        color: 'red',
      })
      return
    }

    // 验证：添加方式不能为空（外购原材料）
    if (formData.category === 'raw-material' && !formData.fieldTemplate) {
      notifications.show({
        title: '错误',
        message: '请选择添加方式',
        color: 'red',
      })
      return
    }

    // 验证：根据字段模板验证必填项
    if (formData.fieldTemplate === 'quantity-price') {
      if (!formData.quantity || formData.quantity <= 0) {
        notifications.show({
          title: '错误',
          message: '请输入有效的数量',
          color: 'red',
        })
        return
      }
      if (!formData.unitPrice || formData.unitPrice <= 0) {
        notifications.show({
          title: '错误',
          message: '请输入有效的单价',
          color: 'red',
        })
        return
      }
    } else if (formData.fieldTemplate === 'direct-amount') {
      if (!formData.directAmount || formData.directAmount <= 0) {
        notifications.show({
          title: '错误',
          message: '请输入有效的金额',
          color: 'red',
        })
        return
      }
    }

    // 保存
    if (isNewItem) {
      addCostItem(formData)
      notifications.show({
        title: '成功',
        message: '成本项已添加',
        color: 'green',
      })
    } else if (editingItem) {
      updateCostItem(editingItem.id, formData)
      notifications.show({
        title: '成功',
        message: '成本项已更新',
        color: 'green',
      })
    }

    setShowModal(false)
    setFormData({})
  }

  /**
   * 计算总金额
   */
  const calculateTotal = (item: CostItem): number => {
    if (item.fieldTemplate === 'quantity-price') {
      return (item.quantity || 0) * (item.unitPrice || 0) / 10000 // 转为万元
    } else if (item.fieldTemplate === 'direct-amount') {
      return item.directAmount || 0
    }
    return 0
  }

  /**
   * 格式化金额
   */
  const formatAmount = (amount: number): string => {
    return amount.toFixed(2)
  }

  /**
   * 获取指定类别的成本项
   */
  const getCostItemsByCategory = (category: string) => {
    return costItems.filter(item => item.category === category)
  }

  /**
   * 渲染表单字段
   */
  const renderFormFields = () => {
    const template = formData.fieldTemplate || 'quantity-price'

    return (
      <Stack gap="md">
        <TextInput
          label="成本项名称"
          placeholder="请输入成本项名称"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          withAsterisk
        />

        {/* 外购原材料必须选择添加方式 */}
        {formData.category === 'raw-material' && (
          <Select
            label="添加方式"
            placeholder="请选择添加方式"
            data={PURCHASE_METHOD_OPTIONS}
            value={template}
            onChange={(value) => setFormData({ ...formData, fieldTemplate: value as FieldTemplate })}
            required
            withAsterisk
            clearable={false}
          />
        )}

        {/* 根据模板显示不同字段 */}
        {template === 'quantity-price' && (
          <>
            <NumberInput
              label="数量"
              placeholder="请输入数量"
              value={formData.quantity || ''}
              onChange={(value) => setFormData({ ...formData, quantity: Number(value) })}
              min={0}
              decimalScale={2}
              required
              withAsterisk
            />
            <NumberInput
              label="单价（元）"
              placeholder="请输入单价"
              value={formData.unitPrice || ''}
              onChange={(value) => setFormData({ ...formData, unitPrice: Number(value) })}
              min={0}
              decimalScale={2}
              required
              withAsterisk
            />
          </>
        )}

        {template === 'direct-amount' && (
          <NumberInput
            label="直接金额（万元）"
            placeholder="请输入金额"
            value={formData.directAmount || ''}
            onChange={(value) => setFormData({ ...formData, directAmount: Number(value) })}
            min={0}
            decimalScale={2}
            required
            withAsterisk
          />
        )}

        <TextInput
          label="备注"
          placeholder="请输入备注（可选）"
          value={formData.remark || ''}
          onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
        />
      </Stack>
    )
  }

  /**
   * 渲染成本表格
   */
  const renderCostTable = (category: string) => {
    const items = getCostItemsByCategory(category)

    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Text size="md" fw={600} c="#1D2129">
              {COST_CATEGORY_LABELS[category as keyof typeof COST_CATEGORY_LABELS]}
            </Text>
            <Button
              size="sm"
              leftSection={<IconPlus size={16} />}
              onClick={() => handleAdd(category)}
              style={{ backgroundColor: '#165DFF', color: '#FFFFFF' }}
            >
              新增{COST_CATEGORY_LABELS[category as keyof typeof COST_CATEGORY_LABELS]}
            </Button>
          </Group>

          {items.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: '#F7F8FA',
              borderRadius: '8px',
              border: '1px dashed #E5E6EB'
            }}>
              <Text size="sm" c="#86909C">
                暂无数据，请点击"新增"按钮添加
              </Text>
            </div>
          ) : (
            <>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>序号</Table.Th>
                    <Table.Th>名称</Table.Th>
                    <Table.Th>计算方式</Table.Th>
                    <Table.Th>总金额（万元）</Table.Th>
                    <Table.Th>备注</Table.Th>
                    <Table.Th w={100}>操作</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>{item.index}</Table.Td>
                      <Table.Td>
                        <Text fw={500}>{item.name}</Text>
                      </Table.Td>
                      <Table.Td>
                        {item.fieldTemplate === 'quantity-price' ? (
                          <Text size="sm" c="#4E5969">
                            {item.quantity} × {item.unitPrice}元
                          </Text>
                        ) : (
                          <Badge color="gray" variant="light">直接金额</Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text fw={600} c="#165DFF">
                          {formatAmount(calculateTotal(item))}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="#86909C">{item.remark || '-'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Tooltip label="编辑">
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              onClick={() => handleEdit(item)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="删除">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => handleDelete(item)}
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

              {/* 汇总行 */}
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#F7F8FA',
                borderRadius: '8px',
                border: '1px solid #E5E6EB'
              }}>
                <Group justify="space-between">
                  <Text size="sm" fw={600} c="#1D2129">
                    {COST_CATEGORY_LABELS[category as keyof typeof COST_CATEGORY_LABELS]}合计
                  </Text>
                  <Text size="md" fw={700} c="#165DFF">
                    {formatAmount(items.reduce((sum, item) => sum + calculateTotal(item), 0))} 万元
                  </Text>
                </Group>
              </div>
            </>
          )}
        </Stack>
      </Card>
    )
  }

  return (
    <>
      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <Stack gap="lg">
          <div>
            <Group gap="xs" mb="xs">
              <IconPackage size={24} color="#F7BA1E" />
              <Text size="lg" fw={600} c="#1D2129">
                成本建模
              </Text>
            </Group>
            <Text size="sm" c="#86909C">
              配置营业成本参数，包括外购原材料、人工费用、制造费用等
            </Text>
          </div>

          <Tabs value={activeTab} onChange={(value) => setActiveTab(value!)}>
            <Tabs.List>
              <Tabs.Tab value="raw-material">外购原材料</Tabs.Tab>
              <Tabs.Tab value="labor">人工费用</Tabs.Tab>
              <Tabs.Tab value="manufacturing">制造费用</Tabs.Tab>
              <Tabs.Tab value="other">其他成本</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="raw-material" pt="md">
              {renderCostTable('raw-material')}
            </Tabs.Panel>

            <Tabs.Panel value="labor" pt="md">
              {renderCostTable('labor')}
            </Tabs.Panel>

            <Tabs.Panel value="manufacturing" pt="md">
              {renderCostTable('manufacturing')}
            </Tabs.Panel>

            <Tabs.Panel value="other" pt="md">
              {renderCostTable('other')}
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Card>

      {/* 编辑/新增弹窗 */}
      <Modal
        opened={showModal}
        onClose={() => setShowModal(false)}
        title={
          <Group gap="xs">
            <IconPackage size={20} color="#165DFF" />
            <Text fw={600} c="#1D2129">
              {isNewItem ? '新增' : '编辑'}
              {formData.category && COST_CATEGORY_LABELS[formData.category as keyof typeof COST_CATEGORY_LABELS]}
            </Text>
          </Group>
        }
        centered
        size="md"
      >
        <Stack gap="md">
          {renderFormFields()}
          
          <Group justify="flex-end" gap="md" mt="md">
            <Button
              variant="default"
              onClick={() => setShowModal(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              style={{ backgroundColor: '#165DFF', color: '#FFFFFF' }}
            >
              确定
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}

export default DynamicCostTable
