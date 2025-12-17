import React, { useState } from 'react'
import {
  Card,
  Stack,
  Text,
  Button,
  Group,
  Table,
  Modal,
  NumberInput,
  ActionIcon,
  Tooltip,
  SegmentedControl,
  TextInput,
  Select,
} from '@mantine/core'
import { IconEdit, IconTrash, IconPackage, IconTable } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useRevenueCostStore, CostItem } from '@/stores/revenueCostStore'
import { calculateTaxableIncome } from '@/stores/revenueCostStore'

/**
 * 动态成本表格组件
 */
const DynamicCostTable: React.FC = () => {
  const { context, costItems, addCostItem, updateCostItem, deleteCostItem, revenueItems } = useRevenueCostStore()
  
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<CostItem | null>(null)
  const [isNewItem, setIsNewItem] = useState(false)
  const [showCostDetailModal, setShowCostDetailModal] = useState(false)
  
  // 表单数据
  const [formData, setFormData] = useState<Partial<CostItem>>({
    name: '',
    directAmount: 0,
    linkedRevenueId: undefined,
    percentage: 0,
    category: 'other',
    fieldTemplate: 'direct-amount'
  });

  /**
   * 打开新增对话框
   */
  const handleAdd = () => {
    setFormData({
      name: '',
      directAmount: 0,
      linkedRevenueId: undefined,
      percentage: 0,
      category: 'other',
      fieldTemplate: 'direct-amount'
    });
    setEditingItem(null);
    setIsNewItem(true);
    setShowModal(true);
  }

  /**
   * 打开编辑对话框
   */
  const handleEdit = (item: CostItem) => {
    setFormData({ ...item });
    setEditingItem(item);
    setIsNewItem(false);
    setShowModal(true);
  }

  /**
   * 删除成本项
   */
  const handleDelete = (item: CostItem) => {
    deleteCostItem(item.id);
    notifications.show({
      title: '成功',
      message: '成本项已删除',
      color: 'green',
    });
  }

  /**
   * 保存成本项
   */
  const handleSave = () => {
    // 验证表单
    if (!formData.name || formData.name.trim() === '') {
      notifications.show({
        title: '错误',
        message: '请输入成本项名称',
        color: 'red',
      });
      return;
    }
    
    // 如果选择了关联收入，必须填写百分比
    if (formData.linkedRevenueId && (!formData.percentage || formData.percentage <= 0)) {
      notifications.show({
        title: '错误',
        message: '请输入有效的百分比',
        color: 'red',
      });
      return;
    }
    
    // 如果没有关联收入，必须填写金额
    if (!formData.linkedRevenueId && (!formData.directAmount || formData.directAmount <= 0)) {
      notifications.show({
        title: '错误',
        message: '请输入有效的金额或选择关联收入',
        color: 'red',
      });
      return;
    }
    
    if (isNewItem) {
      // 新增成本项
      addCostItem({
        name: formData.name,
        directAmount: formData.directAmount,
        category: 'other',
        fieldTemplate: 'direct-amount'
      });
      notifications.show({
        title: '成功',
        message: '成本项已添加',
        color: 'green',
      });
    } else if (editingItem) {
      // 更新成本项
      updateCostItem(editingItem.id, {
        name: formData.name,
        directAmount: formData.directAmount
      });
      notifications.show({
        title: '成功',
        message: '成本项已更新',
        color: 'green',
      });
    }
    
    setShowModal(false);
    setEditingItem(null);
  }

  /**
   * 格式化金额
   */
  const formatAmount = (amount: number): string => {
    return amount.toFixed(2);
  }

  /**
   * 计算成本项的实际金额
   */
  const calculateCostAmount = (item: CostItem): number => {
    if (item.linkedRevenueId && item.percentage) {
      const linkedRevenue = revenueItems.find(r => r.id === item.linkedRevenueId);
      if (linkedRevenue) {
        const revenueAmount = calculateTaxableIncome(linkedRevenue);
        return revenueAmount * (item.percentage / 100);
      }
    }
    return item.directAmount || 0;
  }

  /**
   * 计算总成本
   */
  const calculateTotalCost = (): number => {
    return costItems.reduce((sum, item) => sum + calculateCostAmount(item), 0);
  }

  /**
   * 渲染表单字段
   */
  const renderFormFields = () => {
    // 计算关联收入的成本金额
    const calculateLinkedCost = () => {
      if (!formData.linkedRevenueId || !formData.percentage) return 0;
      const linkedRevenue = revenueItems.find(r => r.id === formData.linkedRevenueId);
      if (!linkedRevenue) return 0;
      const revenueAmount = calculateTaxableIncome(linkedRevenue);
      return revenueAmount * (formData.percentage / 100);
    };

    const linkedCostAmount = calculateLinkedCost();

    return (
      <Stack gap="md">
        <TextInput
          label="成本项名称"
          placeholder="请输入成本项名称"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        
        <Select
          label="关联收入项（可选）"
          placeholder="选择收入项自动计算成本"
          data={[
            { value: '', label: '不关联收入，手动输入金额' },
            ...revenueItems.map(item => ({
              value: item.id,
              label: item.name,
            }))
          ]}
          value={formData.linkedRevenueId || ''}
          onChange={(value) => setFormData({ 
            ...formData, 
            linkedRevenueId: value || undefined,
            directAmount: value ? 0 : formData.directAmount 
          })}
          clearable
          searchable
        />
        
        {formData.linkedRevenueId ? (
          <>
            <NumberInput
              label="百分比（%）"
              placeholder="请输入百分比"
              description="例如：2 表示占该收入的 2%"
              value={formData.percentage || 0}
              onChange={(value) => setFormData({ ...formData, percentage: Number(value) })}
              min={0}
              max={100}
              decimalScale={2}
              required
            />
            
            {formData.percentage && formData.percentage > 0 && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#F0F9FF',
                borderRadius: '6px',
                border: '1px solid #BAE6FD',
              }}>
                <Text size="sm" c="#0C4A6E" fw={500}>
                  💡 外购原材料费为：{linkedCostAmount.toFixed(2)} 万元/年
                </Text>
              </div>
            )}
          </>
        ) : (
          <NumberInput
            label="金额（万元）"
            placeholder="请输入金额"
            value={formData.directAmount || 0}
            onChange={(value) => setFormData({ ...formData, directAmount: Number(value) })}
            min={0}
            decimalScale={2}
            required
          />
        )}
        
        <Stack gap={0}>
          <Text size="sm" fw={500} mb={4}>
            货币单位
          </Text>
          <SegmentedControl
            radius="md"
            size="sm"
            data={['元', '万元']}
            value={'万元'}
            styles={{
              root: {
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
              },
              indicator: {
                backgroundColor: '#165DFF',
              },
              label: {
                color: '#000000',
                '&[data-active]': {
                  color: '#ffffff',
                },
              },
            }}
          />
        </Stack>
      </Stack>
    );
  }
  
  return (
    <>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text size="md" fw={600} c="#1D2129">
            营业成本配置
          </Text>
          <Group gap="xs">
            <Tooltip label="新增成本项">
              <ActionIcon
                variant="filled"
                color="blue"
                size="lg"
                onClick={handleAdd}
              >
                <IconPackage size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {(() => {
          if (!context) return <Text c="red">项目上下文未加载</Text>

          const operationYears = context.operationYears
          const years = Array.from({ length: operationYears }, (_, i) => i + 1)

          return (
            <div style={{ overflowX: 'auto' }}>
              <Table striped withTableBorder style={{ fontSize: '11px' }}>
                <Table.Thead>
                  <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
                    <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>序号</Table.Th>
                    <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>成本项目</Table.Th>
                    <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>合计</Table.Th>
                    <Table.Th colSpan={operationYears} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>运营期</Table.Th>
                    <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>操作</Table.Th>
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
                  {/* 1. 营业成本 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>营业成本</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {costItems.reduce((sum, item) => sum + (item.directAmount || 0), 0).toFixed(2)}
                    </Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {costItems.reduce((sum, item) => sum + (item.directAmount || 0), 0).toFixed(2)}
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <Group gap={4} justify="center">
                        <Tooltip label="编辑">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 1.1 外购原材料费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.1</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>外购原材料费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <Group gap={4} justify="center">
                        <Tooltip label="编辑">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 1.2 外购燃料及动力费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.2</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>外购燃料及动力费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <Group gap={4} justify="center">
                        <Tooltip label="编辑">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 1.3 工资及福利费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.3</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>工资及福利费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <Group gap={4} justify="center">
                        <Tooltip label="编辑">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 1.4 修理费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.4</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>修理费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <Group gap={4} justify="center">
                        <Tooltip label="编辑">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 1.5 其他费用 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.5</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>其他费用</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <Group gap={4} justify="center">
                        <Tooltip label="编辑">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 2. 管理费用 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>2</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>管理费用</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  
                  {/* 3. 财务费用 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>3</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>财务费用</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  
                  {/* 3.1 利息支出 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>3.1</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>利息支出</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  
                  {/* 4. 折旧费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>4</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>折旧费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  
                  {/* 5. 摊销费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>5</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>摊销费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  
                  {/* 6. 开发成本 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>6</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>开发成本</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  
                  {/* 7. 总成本费用合计 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>7</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>总成本费用合计</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </div>
          )
        })()}
        
        {/* 总成本显示标签 */}
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#F0F9FF',
          borderRadius: '6px',
          border: '1px solid #BAE6FD',
          marginTop: '16px'
        }}>
          <Text size="md" c="#0C4A6E" fw={600}>
            💰 外购原材料费总成本：{calculateTotalCost().toFixed(2)} 万元/年
          </Text>
        </div>
      </Stack>

      {/* 编辑对话框 */}
      <Modal
        opened={showModal}
        onClose={() => setShowModal(false)}
        title={
          <Text size="lg" fw={600}>{isNewItem ? '新增成本项' : '编辑成本项'}</Text>
        }
        size="md"
      >
        {renderFormFields()}
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => setShowModal(false)}>
            取消
          </Button>
          <Button onClick={handleSave} style={{ backgroundColor: '#165DFF', color: '#FFFFFF' }}>
            保存
          </Button>
        </Group>
      </Modal>
    </>
  )
}

export default DynamicCostTable
