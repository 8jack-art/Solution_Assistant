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
} from '@mantine/core'
import { IconPlus, IconTrash, IconEdit } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

// 成本配置接口定义
interface CostConfig {
  wages: {
    employees: number
    salaryPerEmployee: number
    items?: WageItem[] // 新增：存储详细的工资项数据
  }
}

interface WageItem {
  id: string
  name: string
  employees: number
  salaryPerEmployee: number // 万元/年
  welfareRate: number // 福利费率 %
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

  // 当弹窗打开时，初始化编辑数据
  useEffect(() => {
    if (opened) {
      // 从costConfig中提取工资数据，优先使用保存的详细数据
      if (costConfig.wages) {
        // 如果有保存的详细工资项数据，直接使用
        if (costConfig.wages.items && costConfig.wages.items.length > 0) {
          setWageItems(costConfig.wages.items)
        } else {
          // 如果没有详细数据，但只有汇总数据，创建一个默认项
          const defaultWageItem: WageItem = {
            id: '1',
            name: '员工工资',
            employees: costConfig.wages.employees || 10,
            salaryPerEmployee: costConfig.wages.salaryPerEmployee || 5,
            welfareRate: 20 // 默认福利费率20%
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
            welfareRate: 20
          },
          {
            id: '2',
            name: '生产人员',
            employees: 15,
            salaryPerEmployee: 6,
            welfareRate: 20
          },
          {
            id: '3',
            name: '销售人员',
            employees: 3,
            salaryPerEmployee: 7,
            welfareRate: 20
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
      welfareRate: 20
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

  const grandTotal = wageItems.reduce((sum, item) => sum + calculateTotal(item), 0)

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text size="lg" fw={600} c="#1D2129">
          💼 工资及福利费估算表
        </Text>
      }
      size="xl"
      centered
    >
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="sm" c="#86909C">
            配置各岗位人员数量、工资标准及福利费率，系统将自动计算工资及福利费总额。
          </Text>
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={handleAdd}
            variant="light"
            color="blue"
          >
            添加项目
          </Button>
        </Group>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={40}>序号</Table.Th>
              <Table.Th w={150}>岗位名称</Table.Th>
              <Table.Th w={100}>人数(人)</Table.Th>
              <Table.Th w={120}>人年工资(万元)</Table.Th>
              <Table.Th w={120}>工资小计(万元)</Table.Th>
              <Table.Th w={100}>福利费率(%)</Table.Th>
              <Table.Th w={120}>福利费(万元)</Table.Th>
              <Table.Th w={120}>合计(万元)</Table.Th>
              <Table.Th w={60}>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {wageItems.map((item, index) => (
              <Table.Tr key={item.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {index + 1}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <TextInput
                    value={item.name}
                    onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                    size="sm"
                    variant="unstyled"
                    styles={{
                      input: {
                        fontWeight: 500,
                        color: '#1D2129',
                      }
                    }}
                  />
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    value={item.employees}
                    onChange={(val) => handleItemChange(item.id, 'employees', val)}
                    min={0}
                    size="sm"
                    variant="unstyled"
                    styles={{
                      input: {
                        textAlign: 'right',
                        fontWeight: 500,
                        color: '#1D2129',
                      }
                    }}
                  />
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    value={item.salaryPerEmployee}
                    onChange={(val) => handleItemChange(item.id, 'salaryPerEmployee', val)}
                    min={0}
                    step={0.1}
                    size="sm"
                    variant="unstyled"
                    styles={{
                      input: {
                        textAlign: 'right',
                        fontWeight: 500,
                        color: '#1D2129',
                      }
                    }}
                  />
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ta="right" fw={500}>
                    {calculateSubtotal(item).toFixed(2)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    value={item.welfareRate}
                    onChange={(val) => handleItemChange(item.id, 'welfareRate', val)}
                    min={0}
                    max={100}
                    size="sm"
                    variant="unstyled"
                    styles={{
                      input: {
                        textAlign: 'right',
                        fontWeight: 500,
                        color: '#1D2129',
                      }
                    }}
                  />
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ta="right" fw={500}>
                    {calculateWelfare(item).toFixed(2)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ta="right" fw={600} c="#165DFF">
                    {calculateTotal(item).toFixed(2)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Tooltip label="删除">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            ))}
            <Table.Tr>
              <Table.Td colSpan={4}>
                <Text size="sm" fw={600}>合计</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" ta="right" fw={600}>
                  {wageItems.reduce((sum, item) => sum + calculateSubtotal(item), 0).toFixed(2)}
                </Text>
              </Table.Td>
              <Table.Td></Table.Td>
              <Table.Td>
                <Text size="sm" ta="right" fw={600}>
                  {wageItems.reduce((sum, item) => sum + calculateWelfare(item), 0).toFixed(2)}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" ta="right" fw={700} c="#F53F3F">
                  {grandTotal.toFixed(2)}
                </Text>
              </Table.Td>
              <Table.Td></Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>

        {/* 说明信息 */}
        <Text size="xs" c="#86909C">
          💡 福利费通常包括社保、公积金、工会经费、职工教育经费等，一般为工资总额的20-30%。系统将自动计算各项小计和总计。
        </Text>

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

export default WagesModal