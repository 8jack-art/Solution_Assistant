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
 * 达产率配置弹窗
 */
const ProductionRateModal: React.FC<ProductionRateModalProps> = ({ opened, onClose }) => {
  const { productionRates, setProductionRates } = useRevenueCostStore()
  const [editedRates, setEditedRates] = useState<ProductionRateConfig[]>([])

  // 当弹窗打开时，复制当前数据到编辑状态
  useEffect(() => {
    if (opened && productionRates.length > 0) {
      setEditedRates(JSON.parse(JSON.stringify(productionRates)))
    }
  }, [opened, productionRates])

  /**
   * 更新达产率值
   */
  const handleRateChange = (yearIndex: number, newRate: number | string) => {
    const rate = typeof newRate === 'string' ? parseFloat(newRate) : newRate
    if (isNaN(rate)) return

    setEditedRates(prev =>
      prev.map(item =>
        item.yearIndex === yearIndex
          ? { ...item, rate: Math.min(1, Math.max(0, rate / 100)) } // 转换为0-1之间的小数
          : item
      )
    )
  }

  /**
   * 增加新的达产率配置（最多5年）
   */
  const handleAddRate = () => {
    // 找到当前配置中最大的yearIndex
    const maxYearIndex = Math.max(...editedRates.map(r => r.yearIndex), 0)
    
    // 检查是否已达到5年
    if (maxYearIndex >= 5) {
      notifications.show({
        title: '无法增加',
        message: '达产率配置最多只能设置到第5年',
        color: 'orange',
      })
      return
    }

    // 添加新的达产率配置
    const newRate: ProductionRateConfig = {
      yearIndex: maxYearIndex + 1,
      rate: 0.8, // 默认80%
    }

    setEditedRates(prev => [...prev, newRate].sort((a, b) => a.yearIndex - b.yearIndex))
    
    notifications.show({
      title: '添加成功',
      message: `已添加第 ${maxYearIndex + 1} 年达产率配置`,
      color: 'green',
    })
  }

  /**
   * 删除达产率配置
   */
  const handleDeleteRate = (yearIndex: number) => {
    setEditedRates(prev => prev.filter(item => item.yearIndex !== yearIndex))
  }

  /**
   * 应用修改
   */
  const handleApply = () => {
    // 验证数据
    const invalidRates = editedRates.filter(
      item => item.rate < 0 || item.rate > 1
    )

    if (invalidRates.length > 0) {
      notifications.show({
        title: '验证失败',
        message: '达产率必须在 0% - 100% 之间',
        color: 'red',
      })
      return
    }

    setProductionRates(editedRates)
    notifications.show({
      title: '应用成功',
      message: '达产率配置已更新',
      color: 'green',
    })
    onClose()
  }

  /**
   * 取消修改
   */
  const handleCancel = () => {
    setEditedRates(JSON.parse(JSON.stringify(productionRates)))
    onClose()
  }

  // 只显示达产率有变化的年份（不是100%的年份）
  const displayedRates = editedRates.filter(item => item.rate !== 1)

  return (
    <Modal
      opened={opened}
      onClose={handleCancel}
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
            设置项目运营期各年份的达产率。通常首年50%-80%，第2-3年达到100%满产。
          </Text>
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={handleAddRate}
            disabled={editedRates.length >= 5}
            variant="light"
            color="blue"
          >
            增加
          </Button>
        </Group>

        {displayedRates.length > 0 ? (
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
              {displayedRates.map((item) => (
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
                      {item.rate < 0.5
                        ? '逐步建设'
                        : item.rate < 1
                        ? '逐步达产'
                        : '满产运营'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label="删除">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => handleDeleteRate(item.yearIndex)}
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
              所有年份均为满产运营（100%）
            </Text>
          </div>
        )}

        {/* 操作按钮 */}
        <Group justify="flex-end" gap="md">
          <Button variant="default" onClick={handleCancel}>
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
