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
  TextInput,
  Select,
  Card,
  Container,
  SimpleGrid,
  Box,
  ScrollArea,
  useMantineTheme,
  rem,
} from '@mantine/core'
import { IconPlus, IconTrash, IconEdit, IconEye } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { CostConfig } from './DynamicCostTable'
import { useRevenueCostStore } from '@/stores/revenueCostStore'

// 工资项接口定义
interface WageItem {
  id: string
  name: string
  employees: number
  salaryPerEmployee: number // 万元/年
  welfareRate: number // 福利费率 %
  changeInterval: number // 变化（年）- 工资调整的时间间隔
  changePercentage: number // 幅度（%）- 每次调整时工资上涨的百分比
}

interface WagesModalProps {
  opened: boolean
  onClose: () => void
  costConfig: CostConfig
  setCostConfig: React.Dispatch<React.SetStateAction<CostConfig>>
}

/**
 * 工资及福利费估算表弹窗
 */
const WagesModal: React.FC<WagesModalProps> = ({ opened, onClose, costConfig, setCostConfig }) => {
  const [wageItems, setWageItems] = useState<WageItem[]>([])
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  })
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const theme = useMantineTheme()
  const { context } = useRevenueCostStore()

  // 响应式：监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    handleResize() // 初始化
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 当弹窗打开时，初始化编辑数据
  useEffect(() => {
    if (opened) {
      // 从costConfig中提取工资数据，优先使用保存的详细数据
      if (costConfig.wages) {
        // 如果有保存的详细工资项数据，需要补充新属性
        if (costConfig.wages.items && costConfig.wages.items.length > 0) {
          const itemsWithNewProps = costConfig.wages.items.map((item: any) => ({
            ...item,
            changeInterval: item.changeInterval ?? 0,
            changePercentage: item.changePercentage ?? 0
          }))
          setWageItems(itemsWithNewProps)
        } else {
          // 如果没有详细数据，但只有汇总数据，创建一个默认项
          const defaultWageItem: WageItem = {
            id: '1',
            name: '员工工资',
            employees: costConfig.wages.employees || 10,
            salaryPerEmployee: costConfig.wages.salaryPerEmployee || 5,
            welfareRate: 10, // 默认福利费率10%
            changeInterval: 0, // 默认不调整
            changePercentage: 0 // 默认不调整
          }
          setWageItems([defaultWageItem])
        }
      } else {
        // 默认配置
        const defaultItems: WageItem[] = [
          {
            id: '1',
            name: '管理人员',
            employees: 5,
            salaryPerEmployee: 8,
            welfareRate: 10,
            changeInterval: 3, // 每3年调整一次
            changePercentage: 5 // 每次上涨5%
          },
          {
            id: '2',
            name: '生产人员',
            employees: 15,
            salaryPerEmployee: 6,
            welfareRate: 10,
            changeInterval: 2, // 每2年调整一次
            changePercentage: 3 // 每次上涨3%
          },
          {
            id: '3',
            name: '销售人员',
            employees: 3,
            salaryPerEmployee: 7,
            welfareRate: 10,
            changeInterval: 3, // 每3年调整一次
            changePercentage: 5 // 每次上涨5%
          }
        ]
        setWageItems(defaultItems)
      }
    }
  }, [opened, costConfig])

  /**
   * 更新工资项
   */
  const handleItemChange = (id: string, field: keyof WageItem, value: number | string) => {
    setWageItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, [field]: field === 'name' ? value : Number(value) || 0 }
          : item
      )
    )
  }

  /**
   * 增加工资项
   */
  const handleAdd = () => {
    const newItem: WageItem = {
      id: Date.now().toString(),
      name: '新员工类别',
      employees: 1,
      salaryPerEmployee: 5,
      welfareRate: 10,
      changeInterval: 0, // 默认不调整
      changePercentage: 0 // 默认不调整
    }
    setWageItems(prev => [...prev, newItem])
  }

  /**
   * 删除工资项
   */
  const handleDelete = (id: string) => {
    if (wageItems.length <= 1) {
      notifications.show({
        title: '无法删除',
        message: '至少要保留一个工资项',
        color: 'orange',
      })
      return
    }
    
    setWageItems(prev => prev.filter(item => item.id !== id))
  }

  /**
   * 应用配置
   */
  const handleApply = () => {
    // 计算总人数和平均工资
    const totalEmployees = wageItems.reduce((sum, item) => sum + item.employees, 0)
    const totalSalary = wageItems.reduce((sum, item) => sum + (item.employees * item.salaryPerEmployee), 0)
    const averageSalary = totalEmployees > 0 ? totalSalary / totalEmployees : 0

    // 更新costConfig，保存详细的工资项数据
    setCostConfig({
      ...costConfig,
      wages: {
        employees: totalEmployees,
        salaryPerEmployee: averageSalary,
        directAmount: totalSalary, // 添加总金额作为directAmount
        items: wageItems // 保存完整的工资项数据
      }
    })

    notifications.show({
      title: '应用成功',
      message: '工资及福利费配置已更新',
      color: 'green',
    })
    onClose()
  }

  /**
   * 计算各项费用
   */
  const calculateSubtotal = (item: WageItem) => {
    return item.employees * item.salaryPerEmployee
  }

  const calculateWelfare = (item: WageItem) => {
    return calculateSubtotal(item) * (item.welfareRate / 100)
  }

  const calculateTotal = (item: WageItem) => {
    return calculateSubtotal(item) + calculateWelfare(item)
  }

  // 计算多年期的工资调整
  const calculateMultiYearTotal = (item: WageItem, years?: number) => {
    const operationYears = years || context?.operationYears || 10
    if (!item.changeInterval || !item.changePercentage) {
      return calculateTotal(item) * operationYears
    }

    let total = 0
    let currentSalary = item.salaryPerEmployee
    
    for (let year = 0; year < operationYears; year++) {
      // 每年的总成本（包括福利费）
      const yearlySubtotal = item.employees * currentSalary
      const yearlyWelfare = yearlySubtotal * (item.welfareRate / 100)
      const yearlyTotal = yearlySubtotal + yearlyWelfare
      total += yearlyTotal
      
      // 每隔changeInterval年调整一次工资
      if ((year + 1) % item.changeInterval === 0) {
        currentSalary = currentSalary * (1 + item.changePercentage / 100)
      }
    }
    
    return total
  }

  const grandTotal = wageItems.reduce((sum, item) => sum + calculateTotal(item), 0)

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text size="md">
          💼 工资及福利费估算表
        </Text>
      }
      size={windowSize.width < 768 ? '100%' : 'calc(100vw - 100px)'}
      centered
      fullScreen={windowSize.width < 768}
      styles={{
        body: {
          maxHeight: windowSize.width < 768 ? '100vh' : 'calc(100vh - 200px)',
          overflowY: 'auto',
          padding: windowSize.width < 768 ? '10px' : '0',
        },
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" mb="md" wrap="nowrap">
          <Text 
            size="sm" 
            c="#86909C"
            style={{ flex: 1, minWidth: 0 }}
          >
            配置各岗位人员数量、工资标准及福利费率，系统将自动计算工资及福利费总额。
          </Text>
          <Group gap="sm">
            <Tooltip label="查看工资及福利明细">
              <ActionIcon
                variant="light"
                color="blue"
                size={36}
                onClick={() => {
                  setDetailModalOpen(true)
                }}
              >
                <IconEye size={windowSize.width < 768 ? 16 : 18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={windowSize.width < 768 ? '添加' : '添加项目'}>
              <ActionIcon
                variant="light"
                color="blue"
                size={36}
                onClick={handleAdd}
                style={{ marginRight: '8px' }}
              >
                <IconPlus size={windowSize.width < 768 ? 16 : 18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Box style={{ overflowX: 'auto' }}>
          <Table 
            striped 
            withTableBorder 
            style={{ 
              fontSize: windowSize.width < 768 ? '10px' : '11px',
              minWidth: windowSize.width < 768 ? '800px' : 'auto'
            }}
          >
          <Table.Thead>
            <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
              <Table.Th style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: windowSize.width < 768 ? '30px' : '40px' }}>序号</Table.Th>
              <Table.Th style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: windowSize.width < 768 ? '80px' : '120px' }}>岗位名称</Table.Th>
              <Table.Th style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: windowSize.width < 768 ? '60px' : '80px' }}>人数</Table.Th>
              <Table.Th style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: windowSize.width < 768 ? '80px' : '100px' }}>人均年工资（万元）</Table.Th>
              <Table.Th style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: windowSize.width < 768 ? '80px' : '100px' }}>工资小计（万元）</Table.Th>
              <Table.Th style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: windowSize.width < 768 ? '70px' : '80px' }}>福利费率</Table.Th>
              <Table.Th style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: windowSize.width < 768 ? '80px' : '100px' }}>福利费（万元）</Table.Th>
              <Table.Th style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: windowSize.width < 768 ? '80px' : '100px' }}>合计（万元）</Table.Th>
              <Table.Th style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: windowSize.width < 768 ? '70px' : '80px' }}>变化(年)</Table.Th>
              <Table.Th style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: windowSize.width < 768 ? '70px' : '80px' }}>幅度(%)</Table.Th>
              <Table.Th style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: windowSize.width < 768 ? '50px' : '60px' }}>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {wageItems.map((item, index) => (
              <Table.Tr key={item.id}>
                <Table.Td style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>
                  <Text size="sm" fw={500}>
                    {index + 1}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                  <TextInput
                    value={item.name}
                    onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                    size="sm"
                    variant="unstyled"
                    placeholder="岗位名称"
                    styles={{
                      input: {
                        textAlign: 'center',
                        fontWeight: 500,
                        color: '#1D2129',
                        fontSize: rem(windowSize.width < 768 ? 11 : 13),
                      }
                    }}
                  />
                </Table.Td>
                <Table.Td style={{ border: '1px solid #dee2e6' }}>
                  <NumberInput
                    value={item.employees}
                    onChange={(val) => handleItemChange(item.id, 'employees', val)}
                    min={0}
                    size="sm"
                    variant="unstyled"
                    styles={{
                      input: {
                        textAlign: 'center',
                        fontWeight: 500,
                        color: '#1D2129',
                        fontSize: rem(windowSize.width < 768 ? 11 : 13),
                      }
                    }}
                  />
                </Table.Td>
                <Table.Td style={{ border: '1px solid #dee2e6' }}>
                  <NumberInput
                    value={item.salaryPerEmployee}
                    onChange={(val) => handleItemChange(item.id, 'salaryPerEmployee', val)}
                    min={0}
                    step={0.1}
                    size="sm"
                    variant="unstyled"
                    styles={{
                      input: {
                        textAlign: 'center',
                        fontWeight: 500,
                        color: '#1D2129',
                        fontSize: rem(windowSize.width < 768 ? 11 : 13),
                      }
                    }}
                  />
                </Table.Td>
                <Table.Td style={{ border: '1px solid #dee2e6' }}>
                  <Text size="sm" ta="center" fw={500}>
                    {calculateSubtotal(item).toFixed(2)}
                  </Text>
                </Table.Td>
                <Table.Td style={{ border: '1px solid #dee2e6' }}>
                  <NumberInput
                    value={item.welfareRate}
                    onChange={(val) => handleItemChange(item.id, 'welfareRate', val)}
                    min={0}
                    max={100}
                    size="sm"
                    variant="unstyled"
                    styles={{
                      input: {
                        textAlign: 'center',
                        fontWeight: 500,
                        color: '#1D2129',
                        fontSize: rem(windowSize.width < 768 ? 12 : 14),
                      }
                    }}
                  />
                </Table.Td>
                <Table.Td style={{ border: '1px solid #dee2e6' }}>
                  <Text size="sm" ta="center" fw={500}>
                    {calculateWelfare(item).toFixed(2)}
                  </Text>
                </Table.Td>
                <Table.Td style={{ border: '1px solid #dee2e6' }}>
                  <Text size="sm" ta="center" fw={600} c="#165DFF">
                    {calculateTotal(item).toFixed(2)}
                  </Text>
                </Table.Td>
                <Table.Td style={{ border: '1px solid #dee2e6' }}>
                  <NumberInput
                    value={item.changeInterval}
                    onChange={(val) => handleItemChange(item.id, 'changeInterval', val)}
                    min={0}
                    size="sm"
                    variant="unstyled"
                    placeholder="0"
                    styles={{
                      input: {
                        textAlign: 'center',
                        fontWeight: 500,
                        color: '#1D2129',
                        fontSize: rem(windowSize.width < 768 ? 11 : 13),
                      }
                    }}
                  />
                </Table.Td>
                <Table.Td style={{ border: '1px solid #dee2e6' }}>
                  <NumberInput
                    value={item.changePercentage}
                    onChange={(val) => handleItemChange(item.id, 'changePercentage', val)}
                    min={0}
                    step={0.1}
                    size="sm"
                    variant="unstyled"
                    placeholder="0"
                    styles={{
                      input: {
                        textAlign: 'center',
                        fontWeight: 500,
                        color: '#1D2129',
                        fontSize: rem(windowSize.width < 768 ? 11 : 13),
                      }
                    }}
                  />
                </Table.Td>
                <Table.Td style={{ border: '1px solid #dee2e6', textAlign: 'center' }}>
                  <Tooltip label={windowSize.width < 768 ? '' : '删除'}>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => handleDelete(item.id)}
                    >
                      <IconTrash size={windowSize.width < 768 ? 14 : 16} />
                    </ActionIcon>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            ))}
            <Table.Tr>
              <Table.Td colSpan={4} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                <Text size="sm" fw={600}>合计</Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                <Text size="sm" ta="center" fw={600}>
                  {wageItems.reduce((sum, item) => sum + calculateSubtotal(item), 0).toFixed(2)}
                </Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6', verticalAlign: 'middle' }}></Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                <Text size="sm" ta="center" fw={600}>
                  {wageItems.reduce((sum, item) => sum + calculateWelfare(item), 0).toFixed(2)}
                </Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                <Text size="sm" ta="center" fw={700} c="#F53F3F">
                  {grandTotal.toFixed(2)}
                </Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6', verticalAlign: 'middle' }}></Table.Td>
              <Table.Td style={{ textAlign: 'center', verticalAlign: 'middle' }}></Table.Td>
              <Table.Td style={{ textAlign: 'center', verticalAlign: 'middle' }}></Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
        </Box>

        {/* 多年期计算结果展示 */}
        <Card 
          shadow="xs" 
          p={windowSize.width < 768 ? "xs" : "md"} 
          withBorder
        >
          <Text size="xs" fw={600} mb="md" style={{ fontSize: rem(windowSize.width < 768 ? 11 : 13) }}>工资调整多年期计算（{context?.operationYears || 10}年）</Text>
          <Box style={{ overflowX: 'auto' }}>
            <Table 
              striped 
              withTableBorder 
              style={{ 
                fontSize: windowSize.width < 768 ? '10px' : '11px',
                minWidth: windowSize.width < 768 ? '600px' : 'auto'
              }}
            >
            <Table.Thead>
              <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
              <Table.Th style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: windowSize.width < 768 ? '100px' : '120px' }}>岗位名称</Table.Th>
              <Table.Th style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: windowSize.width < 768 ? '100px' : '120px' }}>年度总成本（万元）</Table.Th>
              <Table.Th style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: windowSize.width < 768 ? '100px' : '120px' }}>{context?.operationYears || 10}年总成本（万元）</Table.Th>
              <Table.Th style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: windowSize.width < 768 ? '80px' : '100px' }}>调整规则</Table.Th>
            </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {wageItems.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
              <Text size="xs" truncate ta="center" style={{ fontSize: rem(windowSize.width < 768 ? 11 : 13) }}>
                    {item.name}
                  </Text>
            </Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                  <Text size="xs" style={{ fontSize: rem(windowSize.width < 768 ? 11 : 13) }}>
                    {calculateTotal(item).toFixed(2)}
                  </Text>
                </Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                  <Text size="xs" style={{ fontSize: rem(windowSize.width < 768 ? 11 : 13) }}>
                    {calculateMultiYearTotal(item).toFixed(2)}
                  </Text>
                </Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                  <Text 
                    size="xs"
                    truncate
                    style={{ fontSize: rem(windowSize.width < 768 ? 11 : 13) }}
                  >
                    {item.changeInterval && item.changePercentage 
                      ? `每${item.changeInterval}年+${item.changePercentage}%` 
                      : '不调整'}
                  </Text>
              </Table.Td>
                </Table.Tr>
              ))}
              <Table.Tr>
                <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                  <Text size="xs" fw={600} style={{ fontSize: rem(windowSize.width < 768 ? 12 : 14) }}>总计</Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                  <Text size="xs" fw={600} style={{ fontSize: rem(windowSize.width < 768 ? 12 : 14) }}>
                    {grandTotal.toFixed(2)}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                  <Text size="xs" fw={700} c="#F53F3F" style={{ fontSize: rem(windowSize.width < 768 ? 12 : 14) }}>
                    {wageItems.reduce((sum, item) => sum + calculateMultiYearTotal(item), 0).toFixed(2)}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6', verticalAlign: 'middle' }}></Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
          </Box>
        </Card>

        {/* 说明信息 */}
        <Text size="xs" c="#86909C">
          💡 福利费通常包括社保、公积金、工会经费、职工教育经费等，一般为工资总额的20-30%。
          工资调整规则：设置变化（年）和幅度（%）后，系统将自动计算多年期的工资成本变化。
        </Text>

        {/* 操作按钮 */}
        <Group justify="flex-end" gap="md" style={{ marginTop: '16px', marginBottom: '8px' }}>
          <Button variant="default" onClick={onClose} style={{ marginRight: '8px' }}>
            取消
          </Button>
          <Button
            onClick={handleApply}
            style={{
              backgroundColor: '#165DFF',
              color: '#FFFFFF',
              marginRight: '8px',
            }}
          >
            应用
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

export default WagesModal