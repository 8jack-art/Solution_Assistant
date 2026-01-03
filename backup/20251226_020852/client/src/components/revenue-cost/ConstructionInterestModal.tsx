import React from 'react'
import {
  Modal,
  Title,
  Text,
  Table,
  Group,
  Button,
} from '@mantine/core'

interface ConstructionInterestModalProps {
  opened: boolean
  onClose: () => void
  estimate?: any
}

const ConstructionInterestModal: React.FC<ConstructionInterestModalProps> = ({
  opened,
  onClose,
  estimate
}) => {
  // 计算建设期年限
  const constructionYears = estimate?.partF?.建设期年限 || 0
  
  // 生成年度列
  const yearColumns = Array.from({ length: constructionYears }, (_, i) => i + 1)
  
  // 格式化数字显示
  const formatNumber = (value: number | string): string => {
    // 处理空字符串或非数字值
    if (value === '' || value === null || value === undefined) return ''
    
    // 转换为数字
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    
    // 检查是否为有效数字
    if (isNaN(numValue) || numValue === 0) return ''
    
    return numValue.toFixed(2)
  }

  // 获取分年利息数据
  const yearlyInterestData = estimate?.partF?.分年利息 || []
  
  // 计算各年期末借款余额
  const calculateEndOfYearBalance = (yearIndex: number): number => {
    let balance = 0
    for (let i = 0; i <= yearIndex; i++) {
      if (yearlyInterestData[i]) {
        balance += yearlyInterestData[i].当期借款金额
      }
    }
    return balance
  }

  // 准备表格数据
  const tableData = [
    // 1 人民币借款
    {
      序号: '1',
      项目: '人民币借款',
      isMainCategory: true,
      children: [
        {
          序号: '1.1',
          项目: '建设期利息',
          isSubCategory: true,
          children: [
            {
              序号: '1.1.1',
              项目: '期初借款余额',
              getData: (yearIndex: number) => yearIndex === 0 ? 0 : calculateEndOfYearBalance(yearIndex - 1)
            },
            {
              序号: '1.1.2',
              项目: '当期借款',
              getData: (yearIndex: number) => yearlyInterestData[yearIndex]?.当期借款金额 || 0
            },
            {
              序号: '1.1.3',
              项目: '当期应计利息',
              getData: (yearIndex: number) => yearlyInterestData[yearIndex]?.当期利息 || 0
            },
            {
              序号: '1.1.4',
              项目: '期末借款余额',
              getData: (yearIndex: number) => calculateEndOfYearBalance(yearIndex)
            }
          ]
        },
        { 序号: '1.2', 项目: '其他融资费用', getData: () => 0 },
        {
          序号: '1.3',
          项目: '小计(1.1+1.2)',
          isSubTotal: true,
          getData: (yearIndex: number) => {
            // 小计 = 当期应计利息 + 其他融资费用
            return (yearlyInterestData[yearIndex]?.当期利息 || 0) + 0
          }
        }
      ]
    },
    // 2 债券
    {
      序号: '2',
      项目: '债券',
      isMainCategory: true,
      children: [
        {
          序号: '2.1',
          项目: '建设期利息',
          isSubCategory: true,
          children: [
            { 序号: '2.1.1', 项目: '期初债务余额', getData: () => 0 },
            { 序号: '2.1.2', 项目: '当期债务金额', getData: () => 0 },
            { 序号: '2.1.3', 项目: '当期应计利息', getData: () => 0 },
            { 序号: '2.1.4', 项目: '期末债务余额', getData: () => 0 }
          ]
        },
        { 序号: '2.2', 项目: '其他融资费用', getData: () => 0 },
        { 序号: '2.3', 项目: '小计(2.1+2.2)', isSubTotal: true, getData: () => 0 }
      ]
    },
    // 3 合计
    {
      序号: '3',
      项目: '合计',
      isMainCategory: true,
      children: [
        {
          序号: '3.1',
          项目: '建设期利息合计（1.1+2.1）',
          isSubTotal: true,
          getData: (yearIndex: number) => yearlyInterestData[yearIndex]?.当期利息 || 0
        },
        { 序号: '3.2', 项目: '其他融资费用合计（1.2+2.2）', isSubTotal: true, getData: () => 0 }
      ]
    }
  ]

  // 渲染表格行
  const renderTableRow = (item: any, level: number = 0) => {
    const paddingLeft = level * 20
    
    // 检查序号是否为自然数（1, 2, 3等）
    const isNaturalNumber = /^[1-9]\d*$/.test(item.序号.toString())
    
    // 计算合计列的值
    const calculateTotal = () => {
      if (!item.getData) return 0
      
      // 期初借款余额、期末借款余额的合计数值留空
      if (item.序号 === '1.1.1' || item.序号 === '1.1.4' ||
          item.序号 === '2.1.1' || item.序号 === '2.1.4') {
        return ''
      }
      
      let total = 0
      for (let i = 0; i < constructionYears; i++) {
        total += item.getData(i)
      }
      return total
    }
    
    // 判断是否需要居中显示
    const shouldCenter = isNaturalNumber || item.isSubTotal
    
    return (
      <Table.Tr
        key={item.序号}
        style={{
          backgroundColor: isNaturalNumber ? (item.isMainCategory ? '#F2F8FF' :
                         item.isSubTotal ? '#E6F7FF' : '#FFFFFF') : '#FFFFFF',
          fontWeight: item.isMainCategory || item.isSubTotal ? 600 : 400
        }}
      >
        <Table.Td style={{
          paddingLeft: `${paddingLeft}px`,
          width: '150px',
          textAlign: isNaturalNumber ? 'center' : 'left'
        }}>
          {item.序号}
        </Table.Td>
        <Table.Td style={{
          paddingLeft: `${paddingLeft}px`,
          width: '180px',
          textAlign: isNaturalNumber ? 'center' : 'left'
        }}>
          {item.项目}
        </Table.Td>
        <Table.Td style={{
          textAlign: shouldCenter ? 'center' : 'right',
          width: '100px',
          fontWeight: item.isSubTotal ? 600 : 400
        }}>
          {formatNumber(calculateTotal())}
        </Table.Td>
        {yearColumns.map((year) => (
          <Table.Td key={year} style={{
            textAlign: shouldCenter ? 'center' : 'right',
            width: '100px'
          }}>
            {formatNumber(item.getData ? item.getData(year - 1) : 0)}
          </Table.Td>
        ))}
      </Table.Tr>
    )
  }

  // 递归渲染所有行
  const renderAllRows = (items: any[], level: number = 0) => {
    return items.flatMap(item => {
      const rows = [renderTableRow(item, level)]
      if (item.children) {
        rows.push(...renderAllRows(item.children, level + 1))
      }
      return rows
    })
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      title={<Title order={5} c="#1D2129">建设期利息详情</Title>}
      styles={{
        body: {
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
        },
      }}
    >
      <div style={{ padding: '20px' }}>
        <Table
          striped
          withTableBorder
          withColumnBorders
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
              border: '1px solid #E5E6EB'
            }
          }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th rowSpan={2} style={{ width: '150px', verticalAlign: 'middle', textAlign: 'center' }}>序号</Table.Th>
              <Table.Th rowSpan={2} style={{ width: '180px', verticalAlign: 'middle', textAlign: 'center' }}>项目</Table.Th>
              <Table.Th rowSpan={2} style={{ width: '100px', verticalAlign: 'middle', textAlign: 'center' }}>合计</Table.Th>
              <Table.Th colSpan={constructionYears} style={{ borderBottom: '1px solid #E5E6EB' }}>
                建设期（年）
              </Table.Th>
            </Table.Tr>
            <Table.Tr>
              {yearColumns.map((year) => (
                <Table.Th key={year} style={{ width: '100px' }}>
                  {year}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {renderAllRows(tableData)}
          </Table.Tbody>
        </Table>
        
      </div>
    </Modal>
  )
}

export default ConstructionInterestModal