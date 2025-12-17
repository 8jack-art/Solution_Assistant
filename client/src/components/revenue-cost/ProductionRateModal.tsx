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
        // 默认3年达产率
        setEditedRates([
          { yearIndex: 1, rate: 0.75 },
          { yearIndex: 2, rate: 0.85 },
          { yearIndex: 3, rate: 1.0 },
        ])
      }
    }
  }, [opened])

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
            设置项目运营期各年份的达产率。默认3年：第1年75%、第2年85%、第3年100%。未配置年份按最后一年执行。
          </Text>
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

        {editedRates.length > 0 ? (
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
              {editedRates.map((item) => (
                <Table.Tr key={item.yearIndex}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      第 {item.yearIndex} 年
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
