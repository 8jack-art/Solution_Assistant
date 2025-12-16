import React, { useState } from 'react'
import {
  Card,
  Stack,
  Text,
  Table,
  Group,
  NumberInput,
  Button,
  ActionIcon,
  Tooltip,
} from '@mantine/core'
import { IconTrendingUp, IconEdit, IconCheck, IconX } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useRevenueCostStore, ProductionRateConfig } from '@/stores/revenueCostStore'

/**
 * 达产率配置组件
 */
const ProductionRateModel: React.FC = () => {
  const { context, productionRates, updateProductionRate, setProductionRates } = useRevenueCostStore()
  const [editingYear, setEditingYear] = useState<number | null>(null)
  const [tempRate, setTempRate] = useState<number>(0)

  if (!context) {
    return (
      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <Text c="dimmed">未找到项目上下文</Text>
      </Card>
    )
  }

  // 开始编辑
  const startEdit = (yearIndex: number, currentRate: number) => {
    setEditingYear(yearIndex)
    setTempRate(currentRate * 100) // 转换为百分比
  }

  // 保存编辑
  const saveEdit = () => {
    if (editingYear !== null) {
      updateProductionRate(editingYear, tempRate / 100)
      setEditingYear(null)
      notifications.show({
        title: '成功',
        message: '达产率已更新',
        color: 'green',
      })
    }
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingYear(null)
  }

  // 应用默认曲线
  const applyDefaultCurve = () => {
    const newRates: ProductionRateConfig[] = productionRates.map((item, index) => {
      let rate = 1.0
      if (index === 0) rate = 0.5  // 第1年50%
      else if (index === 1) rate = 0.75  // 第2年75%
      else rate = 1.0  // 第3年及以后100%
      
      return { yearIndex: item.yearIndex, rate }
    })
    
    setProductionRates(newRates)
    notifications.show({
      title: '成功',
      message: '已应用默认达产率曲线',
      color: 'blue',
    })
  }

  return (
    <Card shadow="sm" padding="xl" radius="md" withBorder>
      <Stack gap="lg">
        <div>
          <Group gap="xs" mb="xs" justify="space-between">
            <Group gap="xs">
              <IconTrendingUp size={24} color="#00C48C" />
              <Text size="lg" fw={600} c="#1D2129">
                达产率配置
              </Text>
            </Group>
            <Button
              size="sm"
              variant="light"
              onClick={applyDefaultCurve}
            >
              应用默认曲线
            </Button>
          </Group>
          <Text size="sm" c="#86909C">
            配置各运营年份的达产率（第1年50%，第2年75%，第3年及以后100%）
          </Text>
        </div>

        <Table
          striped
          withTableBorder
          styles={{
            th: {
              backgroundColor: '#F7F8FA',
              color: '#1D2129',
              fontWeight: 600,
            },
          }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>运营年份</Table.Th>
              <Table.Th>达产率</Table.Th>
              <Table.Th w={80}>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {productionRates.map((item) => (
              <Table.Tr key={item.yearIndex}>
                <Table.Td>
                  <Text fw={500}>第 {item.yearIndex} 年</Text>
                </Table.Td>
                <Table.Td>
                  {editingYear === item.yearIndex ? (
                    <NumberInput
                      value={tempRate}
                      onChange={(val) => setTempRate(Number(val))}
                      min={0}
                      max={100}
                      decimalScale={1}
                      suffix="%"
                      style={{ width: 120 }}
                      autoFocus
                    />
                  ) : (
                    <Text 
                      fw={600} 
                      c={item.rate >= 1 ? '#00C48C' : item.rate >= 0.75 ? '#F7BA1E' : '#165DFF'}
                      size="md"
                    >
                      {(item.rate * 100).toFixed(1)}%
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  {editingYear === item.yearIndex ? (
                    <Group gap="xs">
                      <Tooltip label="保存">
                        <ActionIcon
                          color="green"
                          variant="light"
                          onClick={saveEdit}
                        >
                          <IconCheck size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="取消">
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={cancelEdit}
                        >
                          <IconX size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  ) : (
                    <Tooltip label="编辑">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => startEdit(item.yearIndex, item.rate)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <div style={{
          padding: '12px 16px',
          backgroundColor: '#FFF7E6',
          borderRadius: '8px',
          border: '1px solid #FFD591'
        }}>
          <Text size="sm" c="#FF7D00">
            💡 提示：达产率影响收入和成本的计算，建议根据项目实际情况设置
          </Text>
        </div>
      </Stack>
    </Card>
  )
}

export default ProductionRateModel
