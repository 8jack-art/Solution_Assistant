import React from 'react'
import {
  Card,
  Stack,
  Text,
  Table,
  Group,
  Badge,
} from '@mantine/core'
import { IconCalendar } from '@tabler/icons-react'
import { useRevenueCostStore } from '@/stores/revenueCostStore'

/**
 * 计算期确认组件
 */
const PeriodConfirmation: React.FC = () => {
  const { context, calculationPeriod, baseYear } = useRevenueCostStore()

  if (!context) {
    return (
      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <Text c="dimmed">未找到项目上下文</Text>
      </Card>
    )
  }

  return (
    <Card shadow="sm" padding="xl" radius="md" withBorder>
      <Stack gap="lg">
        <div>
          <Group gap="xs" mb="xs">
            <IconCalendar size={24} color="#165DFF" />
            <Text size="lg" fw={600} c="#1D2129">
              计算期确认
            </Text>
          </Group>
          <Text size="sm" c="#86909C">
            确认项目的建设期和运营期，设置预测的时间范围
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
              <Table.Th>参数</Table.Th>
              <Table.Th>数值</Table.Th>
              <Table.Th>说明</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>
                <Text fw={500}>建设期</Text>
              </Table.Td>
              <Table.Td>
                <Badge color="blue" variant="light" size="lg">
                  {context.constructionYears} 年
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="#86909C">从项目基本信息自动获取</Text>
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>
                <Text fw={500}>运营期</Text>
              </Table.Td>
              <Table.Td>
                <Badge color="green" variant="light" size="lg">
                  {context.operationYears} 年
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="#86909C">从项目基本信息自动获取</Text>
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>
                <Text fw={500}>计算期总计</Text>
              </Table.Td>
              <Table.Td>
                <Badge color="orange" variant="filled" size="lg">
                  {calculationPeriod} 年
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="#86909C">建设期 + 运营期</Text>
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>
                <Text fw={500}>生产启动年</Text>
              </Table.Td>
              <Table.Td>
                <Badge color="violet" variant="light" size="lg">
                  第 {baseYear} 年
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="#86909C">建设期结束后的第一年</Text>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>

        <div style={{
          padding: '12px 16px',
          backgroundColor: '#F2F8FF',
          borderRadius: '8px',
          border: '1px solid #B5D6FF'
        }}>
          <Text size="sm" c="#165DFF">
            ℹ️ 以上计算期参数将用于后续的收入成本预测和财务评价
          </Text>
        </div>
      </Stack>
    </Card>
  )
}

export default PeriodConfirmation
