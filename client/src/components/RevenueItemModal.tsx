import React, { useState, useEffect } from 'react'
import {
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Select,
  Button,
  Group,
  Text,
  SimpleGrid,
  SegmentedControl,
} from '@mantine/core'

interface RevenueItemModalProps {
  opened: boolean
  onClose: () => void
  onSave: (data: any) => void
  initialData?: any
}

export const RevenueItemModal: React.FC<RevenueItemModalProps> = ({
  opened,
  onClose,
  onSave,
  initialData
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'other' as any,
    unit: '',
    quantity: 0,
    unitPrice: 0,
    unitPriceUnit: 'yuan' as 'yuan' | 'wanyuan', // 元或万元
    vatRate: 9,
    priceIncreaseInterval: 0, // 涨价间隔年数
    priceIncreaseRate: 0, // 涨价幅度（%）
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        category: initialData.category || 'other',
        unit: initialData.unit || '',
        quantity: initialData.quantity || 0,
        unitPrice: initialData.unitPrice || 0,
        unitPriceUnit: initialData.unitPriceUnit || 'yuan',
        vatRate: initialData.vatRate || 9,
        priceIncreaseInterval: initialData.priceIncreaseInterval || 0,
        priceIncreaseRate: initialData.priceIncreaseRate || 0,
      })
    } else {
      setFormData({
        name: '',
        category: 'other',
        unit: '',
        quantity: 0,
        unitPrice: 0,
        unitPriceUnit: 'yuan',
        vatRate: 9,
        priceIncreaseInterval: 0,
        priceIncreaseRate: 0,
      })
    }
  }, [initialData, opened])

  const handleSave = () => {
    if (!formData.name || !formData.unit || formData.quantity <= 0 || formData.unitPrice <= 0) {
      return
    }
    onSave(formData)
  }

  const categoryOptions = [
    { value: 'agriculture-crop', label: '🌾 农业种植类' },
    { value: 'agriculture-aquaculture', label: '🐟 水产养殖类' },
    { value: 'digital-platform', label: '💻 数字平台类' },
    { value: 'transaction-hub', label: '💼 交易平台类' },
    { value: 'other', label: '📊 其他' },
  ]
  
  // 计算达产年收入（万元）
  const calculateRevenueWanYuan = () => {
    const { quantity, unitPrice, unitPriceUnit } = formData
    if (unitPriceUnit === 'yuan') {
      // 单价是元：数量 × 单价 ÷ 10000
      return (quantity * unitPrice / 10000).toFixed(2)
    } else {
      // 单价是万元：数量 × 单价
      return (quantity * unitPrice).toFixed(2)
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={600} size="lg">
          {initialData ? '编辑收入项' : '添加收入项'}
        </Text>
      }
      size="lg"
      centered
    >
      <Stack gap="md">
        {/* 两栏布局 */}
        <SimpleGrid cols={2} spacing="md">
          <TextInput
            label="收入项名称"
            placeholder="请输入收入项名称"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Select
            label="收入类别"
            placeholder="选择类别"
            required
            data={categoryOptions}
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value as any })}
          />

          <TextInput
            label="计量单位"
            placeholder="请输入计量单位"
            required
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
          />

          <NumberInput
            label="年产量/规模"
            placeholder="请输入数量"
            required
            min={0}
            decimalScale={2}
            value={formData.quantity}
            onChange={(value) => setFormData({ ...formData, quantity: Number(value) })}
          />

          <div>
            <Text size="sm" fw={500} mb={4}>单价 <span style={{ color: 'red' }}>*</span></Text>
            <Group gap="xs">
              <NumberInput
                placeholder="请输入单价"
                required
                min={0}
                decimalScale={4}
                value={formData.unitPrice}
                onChange={(value) => setFormData({ ...formData, unitPrice: Number(value) })}
                style={{ flex: 1 }}
              />
              <SegmentedControl
                value={formData.unitPriceUnit}
                onChange={(value) => {
                  const newUnit = value as 'yuan' | 'wanyuan'
                  let newPrice = formData.unitPrice
                  
                  // 单位切换时同步数值
                  if (formData.unitPriceUnit === 'yuan' && newUnit === 'wanyuan') {
                    // 元 -> 万元：除以 10000
                    newPrice = formData.unitPrice / 10000
                  } else if (formData.unitPriceUnit === 'wanyuan' && newUnit === 'yuan') {
                    // 万元 -> 元：乘以 10000
                    newPrice = formData.unitPrice * 10000
                  }
                  
                  setFormData({ 
                    ...formData, 
                    unitPriceUnit: newUnit,
                    unitPrice: Number(newPrice.toFixed(4)) // 保留 4 位小数
                  })
                }}
                data={[
                  { label: '元', value: 'yuan' },
                  { label: '万元', value: 'wanyuan' },
                ]}
                styles={{
                  root: {
                    backgroundColor: '#ffffff', // 白色背景
                    border: '0px solid #d1d5db', // 灰色边框
                  },
                  indicator: {
                    backgroundColor: '#d1d5db', // 灰色选中背景
                  },
                  label: {
                    color: '#000000', // 黑色文字
                    '&[data-active]': {
                      color: '#ffffff', // 白色选中文字
                    },
                  },
                }}
              />
            </Group>
          </div>

          <NumberInput
            label="达产年收入（万元）"
            placeholder="自动计算"
            value={calculateRevenueWanYuan()}
            disabled
            styles={{
              input: {
                backgroundColor: '#F7F8FA',
                color: '#00C48C',
                fontWeight: 600
              }
            }}
          />

          <NumberInput
            label="增值税率（%）"
            placeholder="默认9%"
            required
            min={0}
            max={100}
            decimalScale={2}
            value={formData.vatRate}
            onChange={(value) => setFormData({ ...formData, vatRate: Number(value) })}
          />

          <NumberInput
            label="涨价间隔（年）"
            placeholder="每N年涨价，0表示不涨价"
            min={0}
            max={50}
            value={formData.priceIncreaseInterval}
            onChange={(value) => setFormData({ ...formData, priceIncreaseInterval: Number(value) || 0 })}
          />

          <NumberInput
            label="涨价幅度（%）"
            placeholder="涨价百分比"
            min={0}
            max={100}
            decimalScale={2}
            value={formData.priceIncreaseRate}
            onChange={(value) => setFormData({ ...formData, priceIncreaseRate: Number(value) || 0 })}
            disabled={!formData.priceIncreaseInterval || formData.priceIncreaseInterval === 0}
          />
        </SimpleGrid>

        {formData.priceIncreaseInterval > 0 && formData.priceIncreaseRate > 0 && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#FFF7E6',
            borderRadius: '6px',
            borderLeft: '3px solid #FF7D00'
          }}>
            <Text size="xs" c="#FF7D00" fw={500}>
              💡 涨价规则：每{formData.priceIncreaseInterval}年涨价{formData.priceIncreaseRate}%，
              第1-{formData.priceIncreaseInterval}年收入{calculateRevenueWanYuan()}万元，
              第{formData.priceIncreaseInterval + 1}-{formData.priceIncreaseInterval * 2}年收入{(parseFloat(calculateRevenueWanYuan()) * (1 + formData.priceIncreaseRate / 100)).toFixed(2)}万元
            </Text>
          </div>
        )}

        <Group justify="flex-end" gap="md" mt="md">
          <Button variant="default" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            style={{ backgroundColor: '#165DFF' }}
            disabled={!formData.name || !formData.unit || formData.quantity <= 0 || formData.unitPrice <= 0}
          >
            {initialData ? '保存修改' : '添加'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
