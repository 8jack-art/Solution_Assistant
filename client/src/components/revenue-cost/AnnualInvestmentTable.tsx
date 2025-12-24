import React, { useState, useMemo } from 'react'
import {
  Card,
  Stack,
  Text,
  Button,
  Group,
  Table,
  Modal,
  ActionIcon,
  Tooltip,
} from '@mantine/core'
import {
  IconBuilding,
  IconDownload,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { InvestmentEstimate } from '@/types'
import * as XLSX from 'xlsx'

// 格式化数字显示为2位小数，不四舍五入，无千分号（不修改实际值，只用于显示）
const formatNumberNoRounding = (value: number): string => {
  // 处理负数
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  // 将数字乘以100，截断整数部分，再除以100，实现不四舍五入保留2位小数
  const truncated = Math.trunc(absValue * 100) / 100;
  
  // 转换为字符串，确保有2位小数
  let result = truncated.toString();
  
  // 如果没有小数点或只有1位小数，补齐到2位
  if (!result.includes('.')) {
    result += '.00';
  } else {
    const decimalPart = result.split('.')[1];
    if (decimalPart.length === 1) {
      result += '0';
    } else if (decimalPart.length > 2) {
      result = result.split('.')[0] + '.' + decimalPart.substring(0, 2);
    }
  }
  
  // 添加负号
  if (isNegative) {
    result = '-' + result;
  }
  
  return result;
}

// 格式化数字显示，若为0则显示空白
const formatNumberWithZeroBlank = (value: number): string => {
  if (value === 0) {
    return '';
  }
  return formatNumberNoRounding(value);
}

/**
 * 分年度投资估算表组件
 */
interface AnnualInvestmentTableProps {
  investmentEstimate?: InvestmentEstimate | null
  constructionYears?: number
}

const AnnualInvestmentTable: React.FC<AnnualInvestmentTableProps> = ({
  investmentEstimate,
  constructionYears = 0
}) => {
  const [showModal, setShowModal] = useState(false)

  // 计算各年度投资分配
  const annualInvestmentData = useMemo(() => {
    if (!investmentEstimate || constructionYears === 0) {
      return null
    }

    // 从投资估算中提取各项费用
    const constructionCost = Number(investmentEstimate.construction_cost) || 0  // 建安费
    const equipmentCost = Number(investmentEstimate.equipment_cost) || 0        // 设备购置费
    const installationCost = Number(investmentEstimate.installation_cost) || 0  // 安装工程费
    const otherCost = Number(investmentEstimate.other_cost) || 0              // 其他费用
    const landCost = Number(investmentEstimate.land_cost) || 0                // 土地费用（无形资产）
    const basicReserve = Number(investmentEstimate.basic_reserve) || 0        // 基本预备费
    const priceReserve = Number(investmentEstimate.price_reserve) || 0        // 涨价预备费

    // 计算各项合计
    const buildingInstallationFee = constructionCost + installationCost  // 建筑安装工程费 = 建安费 + 安装工程费
    const engineeringOtherFees = otherCost  // 工程其他费用
    const intangibleAssetFees = landCost    // 无形资产费用（土地费用）
    const reserveFees = basicReserve + priceReserve  // 预备费 = 基本预备费 + 涨价预备费
    const totalConstructionInvestment = buildingInstallationFee + equipmentCost + engineeringOtherFees + intangibleAssetFees + reserveFees  // 建设投资合计

    // 计算年度分配比例（简单按年数平均分配，实际可根据项目特点调整）
    const years = Array.from({ length: constructionYears }, (_, i) => i + 1)
    
    // 年度分配函数：逐年递增（符合工程实际建设规律）
    const distributeByIncreasing = (total: number, yearCount: number): number[] => {
      if (yearCount === 1) return [total]
      if (yearCount === 2) return [total * 0.4, total * 0.6]
      if (yearCount === 3) return [total * 0.25, total * 0.5, total * 0.25]
      if (yearCount === 4) return [total * 0.2, total * 0.3, total * 0.3, total * 0.2]
      if (yearCount === 5) return [total * 0.15, total * 0.25, total * 0.3, total * 0.2, total * 0.1]
      // 默认平均分配
      return years.map(() => total / yearCount)
    }

    // 构建表格数据
    const data = [
      {
        序号: '一',
        项目: '工程费用',
        合计: buildingInstallationFee + equipmentCost,
        分年数据: distributeByIncreasing(buildingInstallationFee + equipmentCost, constructionYears),
        isSubTotal: true
      },
      {
        序号: '1.1',
        项目: '建筑安装工程费',
        合计: buildingInstallationFee,
        分年数据: distributeByIncreasing(buildingInstallationFee, constructionYears),
        isSubItem: true
      },
      {
        序号: '1.2',
        项目: '设备购置费',
        合计: equipmentCost,
        分年数据: distributeByIncreasing(equipmentCost, constructionYears),
        isSubItem: true
      },
      {
        序号: '二',
        项目: '工程其他费用',
        合计: engineeringOtherFees,
        分年数据: distributeByIncreasing(engineeringOtherFees, constructionYears),
      },
      {
        序号: '三',
        项目: '无形资产费用',
        合计: intangibleAssetFees,
        分年数据: distributeByIncreasing(intangibleAssetFees, constructionYears),
      },
      {
        序号: '四',
        项目: '预备费',
        合计: reserveFees,
        分年数据: distributeByIncreasing(reserveFees, constructionYears),
      },
      {
        序号: '五',
        项目: '建设投资合计',
        合计: totalConstructionInvestment,
        分年数据: distributeByIncreasing(totalConstructionInvestment, constructionYears),
        isTotal: true
      }
    ]

    return { years, data }
  }, [investmentEstimate, constructionYears])

  // 导出Excel
  const handleExportExcel = () => {
    if (!annualInvestmentData) {
      notifications.show({
        title: '导出失败',
        message: '暂无数据可导出',
        color: 'red',
      })
      return
    }

    const { years, data } = annualInvestmentData

    // 准备Excel数据
    const excelData: any[] = []
    
    // 添加表头
    const headerRow: any = { '序号': '', '项目': '', '合计（万元）': '' }
    years.forEach((year) => {
      headerRow[`第${year}年`] = year
    })
    excelData.push(headerRow)

    // 添加数据行
    data.forEach((row) => {
      const dataRow: any = {
        '序号': row.序号,
        '项目': row.项目,
        '合计（万元）': row.合计
      }
      row.分年数据.forEach((value, idx) => {
        dataRow[`第${idx + 1}年`] = value
      })
      excelData.push(dataRow)
    })

    // 创建工作簿和工作表
    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '分年度投资估算表')

    // 导出文件
    XLSX.writeFile(wb, `分年度投资估算表.xlsx`)

    notifications.show({
      title: '导出成功',
      message: '分年度投资估算表已导出为Excel文件',
      color: 'green',
    })
  }

  return (
    <>
      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" mb="md">
          <Text size="lg" fw={600}>分年度投资估算表</Text>
          <Group gap="xs">
            <Tooltip label="查看详情">
              <ActionIcon
                variant="light"
                color="blue"
                size="lg"
                onClick={() => setShowModal(true)}
                disabled={!annualInvestmentData}
              >
                <IconBuilding size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="导出Excel">
              <ActionIcon
                variant="light"
                color="green"
                size="lg"
                onClick={handleExportExcel}
                disabled={!annualInvestmentData}
              >
                <IconDownload size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {!annualInvestmentData ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#F7F8FA',
            borderRadius: '8px',
            border: '1px dashed #E5E6EB'
          }}>
            <Text size="sm" c="#86909C">
              暂无投资估算数据，请先完成投资估算
            </Text>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table
              striped
              withTableBorder
              styles={{
                th: {
                  backgroundColor: '#F7F8FA',
                  color: '#1D2129',
                  fontWeight: 600,
                  fontSize: '13px',
                  textAlign: 'center',
                  border: '1px solid #E5E6EB'
                },
                td: {
                  fontSize: '13px',
                  textAlign: 'center',
                  border: '1px solid #E5E6EB'
                }
              }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '60px' }}>序号</Table.Th>
                  <Table.Th style={{ width: '180px', textAlign: 'left' }}>项目</Table.Th>
                  <Table.Th style={{ width: '120px' }}>合计（万元）</Table.Th>
                  <Table.Th colSpan={constructionYears} style={{ borderBottom: '1px solid #E5E6EB' }}>
                    建设期（年）
                  </Table.Th>
                </Table.Tr>
                <Table.Tr>
                  {annualInvestmentData.years.map((year) => (
                    <Table.Th key={year} style={{ width: '80px' }}>
                      {year}
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {annualInvestmentData.data.map((row, idx) => (
                  <Table.Tr
                    key={idx}
                    style={{
                      backgroundColor: row.isTotal ? '#E6F7FF' : (row.isSubTotal ? '#F2F8FF' : undefined),
                      fontWeight: row.isTotal ? 700 : (row.isSubTotal ? 600 : undefined)
                    }}
                  >
                    <Table.Td>
                      <Text fw={row.isSubItem ? 400 : 600}>{row.序号}</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'left' }}>
                      <Text style={{ marginLeft: row.isSubItem ? '20px' : '0' }}>
                        {row.项目}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600} c={row.isTotal ? '#165DFF' : '#1D2129'}>
                        {formatNumberNoRounding(row.合计)}
                      </Text>
                    </Table.Td>
                    {row.分年数据.map((value, yearIdx) => (
                      <Table.Td key={yearIdx}>
                        {formatNumberWithZeroBlank(value)}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        )}
      </Card>

      {/* 详情弹窗 */}
      <Modal
        opened={showModal}
        onClose={() => setShowModal(false)}
        title={
          <Group justify="space-between" w="100%">
            <Text size="md">
              📊 分年度投资估算表详情
            </Text>
            <Tooltip label="导出Excel">
              <ActionIcon
                variant="light"
                color="green"
                size={16}
                onClick={handleExportExcel}
              >
                <IconDownload size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        }
        size="calc(100vw - 100px)"
        styles={{
          body: {
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
          },
        }}
      >
        {!annualInvestmentData ? (
          <Text c="red">暂无数据</Text>
        ) : (
          <Stack gap="md">
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#F0F5FF',
              borderRadius: '8px',
              border: '1px solid #ADC6FF'
            }}>
              <Text size="sm" c="#165DFF" fw={500} mb={4}>
                📋 说明
              </Text>
              <Text size="xs" c="#4E5969">
                • 分年度投资估算表展示了建设期各年度的投资分配情况<br />
                • 建设期共 {constructionYears} 年<br />
                • 投资分配采用逐年递增模式，符合工程实际建设规律
              </Text>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <Table
                striped
                withTableBorder
                styles={{
                  th: {
                    backgroundColor: '#F7F8FA',
                    color: '#1D2129',
                    fontWeight: 600,
                    fontSize: '13px',
                    textAlign: 'center',
                    border: '1px solid #E5E6EB'
                  },
                  td: {
                    fontSize: '13px',
                    textAlign: 'center',
                    border: '1px solid #E5E6EB'
                  }
                }}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th rowSpan={2} style={{ width: '60px', verticalAlign: 'middle' }}>序号</Table.Th>
                    <Table.Th rowSpan={2} style={{ width: '180px', textAlign: 'left', verticalAlign: 'middle' }}>项目</Table.Th>
                    <Table.Th rowSpan={2} style={{ width: '120px', verticalAlign: 'middle' }}>合计（万元）</Table.Th>
                    <Table.Th colSpan={constructionYears} style={{ borderBottom: '1px solid #E5E6EB' }}>
                      建设期（年）
                    </Table.Th>
                  </Table.Tr>
                  <Table.Tr>
                    {annualInvestmentData.years.map((year) => (
                      <Table.Th key={year} style={{ width: '80px' }}>
                        {year}
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {annualInvestmentData.data.map((row, idx) => (
                    <Table.Tr
                      key={idx}
                      style={{
                        backgroundColor: row.isTotal ? '#E6F7FF' : (row.isSubTotal ? '#F2F8FF' : undefined),
                        fontWeight: row.isTotal ? 700 : (row.isSubTotal ? 600 : undefined)
                      }}
                    >
                      <Table.Td>
                        <Text fw={row.isSubItem ? 400 : 600}>{row.序号}</Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'left' }}>
                        <Text style={{ marginLeft: row.isSubItem ? '20px' : '0' }}>
                          {row.项目}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={600} c={row.isTotal ? '#165DFF' : '#1D2129'}>
                          {formatNumberNoRounding(row.合计)}
                        </Text>
                      </Table.Td>
                      {row.分年数据.map((value, yearIdx) => (
                        <Table.Td key={yearIdx}>
                          {formatNumberWithZeroBlank(value)}
                        </Table.Td>
                      ))}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>

            <Group justify="flex-end">
              <Button
                onClick={() => setShowModal(false)}
                style={{
                  height: '36px',
                  backgroundColor: '#165DFF'
                }}
              >
                关闭
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  )
}

export default AnnualInvestmentTable
