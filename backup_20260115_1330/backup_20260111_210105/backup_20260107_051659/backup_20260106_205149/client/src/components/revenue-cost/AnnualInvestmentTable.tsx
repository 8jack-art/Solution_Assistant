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
  // 处理负数和零
  if (value === 0) return '0.00';
  
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  // 使用 toFixed(10) 先获取更多精度，然后再截断
  const str = absValue.toFixed(10);
  
  // 找到小数点位置
  const decimalIndex = str.indexOf('.');
  if (decimalIndex === -1) {
    // 整数情况
    return (isNegative ? '-' : '') + str + '.00';
  }
  
  // 获取整数部分和小数部分
  const integerPart = str.substring(0, decimalIndex);
  const decimalPart = str.substring(decimalIndex + 1);
  
  // 截取前2位小数（不四舍五入）
  const truncatedDecimal = decimalPart.substring(0, 2);
  
  // 如果截取后全为0，需要去除末尾的0但保留至少2位
  let result = (isNegative ? '-' : '') + integerPart + '.' + truncatedDecimal;
  
  // 补齐到2位小数
  if (truncatedDecimal.length < 2) {
    result += '0'.repeat(2 - truncatedDecimal.length);
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
  showCard?: boolean  // 是否显示 Card 包装（modal 中使用时不显示）
}

const AnnualInvestmentTable: React.FC<AnnualInvestmentTableProps> = ({
  investmentEstimate,
  constructionYears = 0,
  showCard = true
}) => {
  const [showModal, setShowModal] = useState(false)

  // 计算各年度投资分配
  const annualInvestmentData = useMemo(() => {
    if (!investmentEstimate || constructionYears === 0) {
      return null
    }

    console.log('🔍 开始计算分年度投资估算表')
    console.log('📋 投资估算原始数据:', investmentEstimate)

    // 从 estimate_data.partA.children 提取第一部分工程费用
    let constructionFee = 0  // 建设工程费
    let equipmentFee = 0     // 设备购置费
    let installationFee = 0   // 安装工程费
    let otherFee = 0         // 其它费用

    if (investmentEstimate.estimate_data?.partA?.children) {
      investmentEstimate.estimate_data.partA.children.forEach((item: any) => {
        constructionFee += Number(item.建设工程费) || 0
        equipmentFee += Number(item.设备购置费) || 0
        installationFee += Number(item.安装工程费) || 0
        otherFee += Number(item.其它费用) || 0
      })
    }

    // 第一部分工程费用合计
    const partATotal = constructionFee + equipmentFee + installationFee + otherFee

    // 从 estimate_data.partB 提取第二部分工程其它费用
    const partBTotal = Number(investmentEstimate.estimate_data?.partB?.合计) || 0
    let landCost = 0  // 土地费用
    if (investmentEstimate.estimate_data?.partB?.children) {
      const landItem = investmentEstimate.estimate_data.partB.children.find(
        (item: any) => item.工程或费用名称 === '土地费用'
      )
      landCost = Number(landItem?.合计) || 0
    }

    // 预备费
    const basicReserve = Number(investmentEstimate.basic_reserve) || 0
    const priceReserve = Number(investmentEstimate.price_reserve) || 0
    const reserveFees = basicReserve + priceReserve

    console.log('📊 提取的数据:', {
      '第一部分-建设工程费': constructionFee,
      '第一部分-设备购置费': equipmentFee,
      '第一部分-安装工程费': installationFee,
      '第一部分-其它费用': otherFee,
      '第一部分合计': partATotal,
      '第二部分合计': partBTotal,
      '土地费用': landCost,
      '基本预备费': basicReserve,
      '涨价预备费': priceReserve,
      '预备费合计': reserveFees
    })

    // 计算各项合计
    // 1. 建筑安装工程费 = (第一部分工程费用合计 - 设备购置费) / 建设期年份
    const buildingInstallationFee = partATotal - equipmentFee

    // 2. 设备购置费 = 第一部分工程费用中的设备购置费，放在建设期最后1年

    // 3. 工程其他费用 = 第二部分工程其它费用合计 - 土地费用，放在建设期第1年
    const engineeringOtherFees = partBTotal - landCost

    // 4. 无形资产费用 = 土地费用，放在建设期第1年
    const intangibleAssetFees = landCost

    // 5. 预备费 = 基本预备费 + 涨价预备费，放在建设期最后1年

    // 6. 建设投资合计 = 序号一、二、三、四的合计
    const totalConstructionInvestment = partATotal + engineeringOtherFees + intangibleAssetFees + reserveFees

    console.log('💰 计算结果:', {
      '工程费用合计': partATotal,
      '建筑安装工程费': buildingInstallationFee,
      '设备购置费': equipmentFee,
      '工程其他费用': engineeringOtherFees,
      '无形资产费用': intangibleAssetFees,
      '预备费': reserveFees,
      '建设投资合计': totalConstructionInvestment
    })

    const years = Array.from({ length: constructionYears }, (_, i) => i + 1)

    // 年度分配函数
    const distributeEvenly = (total: number, yearCount: number): number[] => {
      if (yearCount === 0) return []
      return Array.from({ length: yearCount }, () => total / yearCount)
    }

    const distributeToFirstYear = (total: number, yearCount: number): number[] => {
      if (yearCount === 0) return []
      const result = Array.from({ length: yearCount }, () => 0)
      result[0] = total
      return result
    }

    const distributeToLastYear = (total: number, yearCount: number): number[] => {
      if (yearCount === 0) return []
      const result = Array.from({ length: yearCount }, () => 0)
      result[yearCount - 1] = total
      return result
    }

    // 先计算子项的建设期数据
    const buildingInstallationData = distributeEvenly(buildingInstallationFee, constructionYears)
    const equipmentData = distributeToLastYear(equipmentFee, constructionYears)
    const engineeringOtherData = distributeToFirstYear(engineeringOtherFees, constructionYears)
    const intangibleAssetData = distributeToFirstYear(intangibleAssetFees, constructionYears)
    const reserveData = distributeToLastYear(reserveFees, constructionYears)

    // "一 工程费用"的建设期列 = 合计1.1、1.2的建设期列
    const partAData = buildingInstallationData.map((val, idx) => val + equipmentData[idx])

    // "五 建设投资合计"的建设期列 = 合计一、二、三、四的建设期列
    const totalConstructionData = partAData.map((val, idx) =>
      val + engineeringOtherData[idx] + intangibleAssetData[idx] + reserveData[idx]
    )

    // 构建表格数据
    const data = [
      {
        序号: '一',
        项目: '工程费用',
        合计: partATotal,
        分年数据: partAData,
        isSubTotal: true
      },
      {
        序号: '1.1',
        项目: '建筑安装工程费',
        合计: buildingInstallationFee,
        分年数据: buildingInstallationData,
        isSubItem: true
      },
      {
        序号: '1.2',
        项目: '设备购置费',
        合计: equipmentFee,
        分年数据: equipmentData,
        isSubItem: true
      },
      {
        序号: '二',
        项目: '工程其他费用',
        合计: engineeringOtherFees,
        分年数据: engineeringOtherData,
      },
      {
        序号: '三',
        项目: '无形资产费用',
        合计: intangibleAssetFees,
        分年数据: intangibleAssetData,
      },
      {
        序号: '四',
        项目: '预备费',
        合计: reserveFees,
        分年数据: reserveData,
      },
      {
        序号: '五',
        项目: '建设投资合计',
        合计: totalConstructionInvestment,
        分年数据: totalConstructionData,
        isTotal: true
      }
    ]

    console.log('📋 表格数据:', data)

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

  // 渲染表格内容（可复用于 Card 和 Modal）
  const renderTableContent = () => {
    if (!annualInvestmentData) {
      return (
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
      )
    }

    return (
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
    )
  }

  return (
    <>
      {showCard ? (
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
          {renderTableContent()}
        </Card>
      ) : (
        renderTableContent()
      )}

      {/* 详情弹窗 */}
      <Modal
        opened={showModal}
        onClose={() => setShowModal(false)}
        title={
          <Group justify="space-between" w="100%">
            <Text size="md" fw={600}>📊 分年度投资估算表详情</Text>
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
          {renderTableContent()}
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
      </Modal>
    </>
  )
}

export default AnnualInvestmentTable
