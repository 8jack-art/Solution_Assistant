import React, { useState, useEffect } from 'react'
import {
  Modal,
  Stack,
  Table,
  NumberInput,
  Button,
  Group,
  Text,
  ActionIcon,
  Tooltip,
} from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useRevenueCostStore, ProductionRateConfig } from '@/stores/revenueCostStore'

interface ProductionRateModalProps {
  opened: boolean
  onClose: () => void
}

/**
 * 获取需要显示的达产率配置（只显示变化的前面几年）
 * 规则：从第1年开始，连续显示直到遇到100%达产率，之后不再显示
 */
const getDisplayRates = (rates: ProductionRateConfig[]): ProductionRateConfig[] => {
  if (rates.length === 0) return []
  
  // 按年份排序
  const sortedRates = [...rates].sort((a, b) => a.yearIndex - b.yearIndex)
  
  // 找到第一个100%达产率的年份
  const firstFullProductionIndex = sortedRates.findIndex(rate => rate.rate >= 1.0)
  
  if (firstFullProductionIndex === -1) {
    // 没有达到100%，显示所有配置
    return sortedRates
  } else {
    // 显示到第一个100%达产率为止（包括该年）
    return sortedRates.slice(0, firstFullProductionIndex + 1)
  }
}

/**
 * 达产率配置弹窗（重写版）
 */
const ProductionRateModal: React.FC<ProductionRateModalProps> = ({ opened, onClose }) => {
  const { productionRates, setProductionRates } = useRevenueCostStore()
  const [editedRates, setEditedRates] = useState<ProductionRateConfig[]>([])

  // 当弹窗打开时，初始化编辑数据
  useEffect(() => {
    if (opened) {
      if (productionRates.length > 0) {
        setEditedRates([...productionRates])
      } else {
        // 默认3年达产率配置
        const defaultRates = [
          { yearIndex: 1, rate: 0.75 }, // 75%
          { yearIndex: 2, rate: 0.85 }, // 85%
          { yearIndex: 3, rate: 1.0 },  // 100%
        ]
        setEditedRates(defaultRates)
      }
    }
  }, [opened, productionRates])

  /**
   * 更新达产率
   */
  const handleRateChange = (yearIndex: number, value: number | string) => {
    const rate = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(rate)) return

    setEditedRates(prev =>
      prev.map(item =>
        item.yearIndex === yearIndex
          ? { ...item, rate: rate / 100 } // 转为0-1小数
          : item
      )
    )
  }

  /**
   * 增加年份
   */
  const handleAdd = () => {
    const maxYear = editedRates.length > 0 
      ? Math.max(...editedRates.map(r => r.yearIndex)) 
      : 0

    if (maxYear >= 5) {
      notifications.show({
        title: '无法增加',
        message: '达产率最多配置到第5年',
        color: 'orange',
      })
      return
    }

    setEditedRates(prev => [
      ...prev,
      { yearIndex: maxYear + 1, rate: 1.0 }
    ])
  }

  /**
   * 删除年份
   */
  const handleDelete = (yearIndex: number) => {
    if (editedRates.length <= 1) {
      notifications.show({
        title: '无法删除',
        message: '至少要保留一年的达产率配置',
        color: 'orange',
      })
      return
    }
    
    // 检查是否要删除的是最后一个100%达产率年份
    const displayRates = getDisplayRates(editedRates)
    const isLastFullProduction = displayRates[displayRates.length - 1]?.yearIndex === yearIndex && 
                                 displayRates[displayRates.length - 1]?.rate >= 1.0
    
    if (isLastFullProduction && editedRates.some(r => r.yearIndex > yearIndex)) {
      notifications.show({
        title: '无法删除',
        message: '不能删除100%达产率年份，后面还有依赖此配置的年份',
        color: 'orange',
      })
      return
    }
    
    setEditedRates(prev => prev.filter(r => r.yearIndex !== yearIndex))
  }

  /**
   * 应用配置
   */
  const handleApply = () => {
    setProductionRates(editedRates)
    notifications.show({
      title: '应用成功',
      message: '达产率配置已更新',
      color: 'green',
    })
    onClose()
  }

  const maxYear = editedRates.length > 0 ? Math.max(...editedRates.map(r => r.yearIndex)) : 0

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text size="lg" fw={600} c="#1D2129">
          📈 达产率配置
        </Text>
      }
      size="md"
      centered
    >
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="sm" c="#86909C">
            设置项目运营期前几年的达产率变化。只显示达产率逐步提升的年份，达到100%后的年份无需配置（自动按100%计算）。
          </Text>
          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              color="orange"
              onClick={() => {
                const defaultRates = [
                  { yearIndex: 1, rate: 0.75 }, // 75%
                  { yearIndex: 2, rate: 0.85 }, // 85%
                  { yearIndex: 3, rate: 1.0 },  // 100%
                ]
                setEditedRates(defaultRates)
              }}
            >
              重置默认
            </Button>
            <Button
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={handleAdd}
              disabled={maxYear >= 5}
              variant="light"
              color="blue"
            >
              增加
            </Button>
          </Group>
        </Group>

        {editedRates.length > 0 ? (
          <>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>年份</Table.Th>
                  <Table.Th>达产率 (%)</Table.Th>
                  <Table.Th>说明</Table.Th>
                  <Table.Th w={60}>操作</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {getDisplayRates(editedRates).map((item) => (
                  <Table.Tr key={item.yearIndex}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {item.yearIndex}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        value={item.rate * 100}
                        onChange={(val) => handleRateChange(item.yearIndex, val)}
                        min={0}
                        max={100}
                        step={5}
                        suffix="%"
                        size="sm"
                        styles={{
                          input: {
                            width: '120px',
                            fontWeight: 600,
                            color: '#165DFF',
                          },
                        }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="#86909C">
                        {item.rate < 0.5 ? '逐步建设' : item.rate < 1 ? '逐步达产' : '满产运营'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label="删除">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => handleDelete(item.yearIndex)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            
            {editedRates.length > getDisplayRates(editedRates).length && (
              <Text size="xs" c="#86909C" style={{ marginTop: '8px' }}>
                💡 {getDisplayRates(editedRates).length + 1}及以后年份自动按100%达产率计算，无需手动配置
              </Text>
            )}
          </>
        ) : (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: '#F7F8FA',
              borderRadius: '8px',
            }}
          >
            <Text size="sm" c="#86909C">
              暂无配置，点击"增加"按钮添加
            </Text>
          </div>
        )}

        {/* 操作按钮 */}
        <Group justify="flex-end" gap="md">
          <Button variant="default" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={handleApply}
            style={{
              backgroundColor: '#165DFF',
              color: '#FFFFFF',
            }}
          >
            应用
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

export default ProductionRateModal
