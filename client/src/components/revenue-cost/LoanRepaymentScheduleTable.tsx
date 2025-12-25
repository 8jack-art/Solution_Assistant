import React, { useState, useMemo, useEffect } from 'react'
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
  NumberInput,
  Select,
  SimpleGrid,
} from '@mantine/core'
import {
  IconDownload,
  IconSettings,
  IconFileText,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useRevenueCostStore, LoanConfig, LoanRepaymentTableData } from '@/stores/revenueCostStore'
import * as XLSX from 'xlsx'

// 格式化数字显示为2位小数，不四舍五入，无千分号
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
 * 借款还本付息计划表组件
 */
interface LoanRepaymentScheduleTableProps {
  showCard?: boolean;
}

const LoanRepaymentScheduleTable: React.FC<LoanRepaymentScheduleTableProps> = ({ showCard = true }) => {
  const {
    context,
    loanConfig,
    profitDistributionTableData,
    setLoanConfig,
    updateLoanConfig,
    setLoanRepaymentTableData
  } = useRevenueCostStore()
  
  const [showModal, setShowModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [tempLoanConfig, setTempLoanConfig] = useState<LoanConfig>(loanConfig)

  // 计算借款还本付息计划表数据
  const calculateLoanRepaymentData = useMemo(() => {
    if (!context) return null;

    const constructionYears = context.constructionYears;
    const operationYears = context.operationYears;
    const totalYears = constructionYears + operationYears;

    // 初始化建设期和运营期数组
    const constructionPeriod = Array(constructionYears).fill(0);
    const operationPeriod = Array(operationYears).fill(0);

    // 计算等额本息还款
    const monthlyRate = loanConfig.interestRate / 100 / 12;
    const totalMonths = loanConfig.loanTerm * 12;
    const monthlyPayment = loanConfig.loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths) / (Math.pow(1 + monthlyRate, totalMonths) - 1);

    // 计算每年的还款额
    const yearlyPrincipal = Array(operationYears).fill(0);
    const yearlyInterest = Array(operationYears).fill(0);
    const yearlyPayment = Array(operationYears).fill(0);

    let remainingPrincipal = loanConfig.loanAmount;
    let currentYear = 1;

    for (let month = 1; month <= totalMonths && currentYear <= operationYears; month++) {
      const interestPayment = remainingPrincipal * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      
      yearlyInterest[currentYear - 1] += interestPayment;
      yearlyPrincipal[currentYear - 1] += principalPayment;
      yearlyPayment[currentYear - 1] += monthlyPayment;
      
      remainingPrincipal -= principalPayment;
      
      // 每12个月进入下一年
      if (month % 12 === 0) {
        currentYear++;
      }
    }

    // 计算期初和期末借款余额
    const beginningBalance = Array(operationYears).fill(0);
    const endingBalance = Array(operationYears).fill(0);
    
    let balance = loanConfig.loanAmount;
    for (let year = 1; year <= operationYears; year++) {
      beginningBalance[year - 1] = balance;
      balance -= yearlyPrincipal[year - 1];
      endingBalance[year - 1] = Math.max(0, balance);
    }

    // 计算还本付息资金来源
    // 2.1 折旧摊销费（暂时使用模拟数据）
    const depreciationAmortization = Array(operationYears).fill(50); // 模拟每年50万元折旧摊销费

    // 2.2 利润（从利润与利润分配表获取）
    const profit = Array(operationYears).fill(0);
    if (profitDistributionTableData && profitDistributionTableData.rows) {
      for (let year = 1; year <= operationYears; year++) {
        const row = profitDistributionTableData.rows.find(r => r.序号 === '9'); // 净利润
        if (row && row.运营期 && row.运营期[year - 1] !== undefined) {
          profit[year - 1] = row.运营期[year - 1];
        }
      }
    }

    // 2.3 息税前利润（从利润与利润分配表获取）
    const ebit = Array(operationYears).fill(0);
    if (profitDistributionTableData && profitDistributionTableData.rows) {
      for (let year = 1; year <= operationYears; year++) {
        const row = profitDistributionTableData.rows.find(r => r.序号 === '19'); // 息税前利润
        if (row && row.运营期 && row.运营期[year - 1] !== undefined) {
          ebit[year - 1] = row.运营期[year - 1];
        }
      }
    }

    // 2.4 其他还利息资金（暂时为0）
    const otherInterestFunds = Array(operationYears).fill(0);

    // 计算指标
    // 3.1 息税折旧摊销前利润
    const ebitda = Array(operationYears).fill(0);
    for (let year = 1; year <= operationYears; year++) {
      ebitda[year - 1] = ebit[year - 1] + depreciationAmortization[year - 1];
    }

    // 3.2 所得税（从利润与利润分配表获取）
    const incomeTax = Array(operationYears).fill(0);
    if (profitDistributionTableData && profitDistributionTableData.rows) {
      for (let year = 1; year <= operationYears; year++) {
        const row = profitDistributionTableData.rows.find(r => r.序号 === '8'); // 所得税
        if (row && row.运营期 && row.运营期[year - 1] !== undefined) {
          incomeTax[year - 1] = row.运营期[year - 1];
        }
      }
    }

    // 3.3 还利息及担保费
    const interestAndGuaranteeFee = yearlyInterest;

    // 3.4 还本金
    const principalRepayment = yearlyPrincipal;

    // 3.5 利息备付率 = 息税前利润 / 还利息及担保费
    const interestCoverageRatio = Array(operationYears).fill(0);
    for (let year = 1; year <= operationYears; year++) {
      if (interestAndGuaranteeFee[year - 1] > 0) {
        interestCoverageRatio[year - 1] = ebit[year - 1] / interestAndGuaranteeFee[year - 1];
      }
    }

    // 3.6 偿债备付率 = (息税折旧摊销前利润 - 所得税) / (还利息及担保费 + 还本金)
    const debtServiceCoverageRatio = Array(operationYears).fill(0);
    for (let year = 1; year <= operationYears; year++) {
      const denominator = interestAndGuaranteeFee[year - 1] + principalRepayment[year - 1];
      if (denominator > 0) {
        debtServiceCoverageRatio[year - 1] = (ebitda[year - 1] - incomeTax[year - 1]) / denominator;
      }
    }

    // 构建表格数据
    const tableData: LoanRepaymentTableData = {
      rows: [
        // 1 借款还本付息计划
        {
          序号: '1',
          项目: '借款还本付息计划',
          合计: null,
          建设期: constructionPeriod,
          运营期: operationPeriod
        },
        // 1.1 期初借款余额
        {
          序号: '1.1',
          项目: '期初借款余额',
          合计: null,
          建设期: constructionPeriod,
          运营期: beginningBalance
        },
        // 1.2 当期还本付息
        {
          序号: '1.2',
          项目: '当期还本付息',
          合计: null,
          建设期: constructionPeriod,
          运营期: yearlyPayment
        },
        // 其中：还本
        {
          序号: '',
          项目: '其中：还本',
          合计: null,
          建设期: constructionPeriod,
          运营期: yearlyPrincipal
        },
        // 付息
        {
          序号: '',
          项目: '付息',
          合计: null,
          建设期: constructionPeriod,
          运营期: yearlyInterest
        },
        // 1.3 期末借款余额
        {
          序号: '1.3',
          项目: '期末借款余额',
          合计: null,
          建设期: constructionPeriod,
          运营期: endingBalance
        },
        // 2 还本付息资金来源
        {
          序号: '2',
          项目: '还本付息资金来源',
          合计: null,
          建设期: constructionPeriod,
          运营期: operationPeriod
        },
        // 2.1 折旧摊销费
        {
          序号: '2.1',
          项目: '折旧摊销费',
          合计: null,
          建设期: constructionPeriod,
          运营期: depreciationAmortization
        },
        // 2.2 利润
        {
          序号: '2.2',
          项目: '利润',
          合计: null,
          建设期: constructionPeriod,
          运营期: profit
        },
        // 2.3 息税前利润
        {
          序号: '2.3',
          项目: '息税前利润',
          合计: null,
          建设期: constructionPeriod,
          运营期: ebit
        },
        // 2.4 其他还利息资金
        {
          序号: '2.4',
          项目: '其他还利息资金',
          合计: null,
          建设期: constructionPeriod,
          运营期: otherInterestFunds
        },
        // 3 计算指标
        {
          序号: '3',
          项目: '计算指标',
          合计: null,
          建设期: constructionPeriod,
          运营期: operationPeriod
        },
        // 3.1 息税折旧摊销前利润
        {
          序号: '3.1',
          项目: '息税折旧摊销前利润',
          合计: null,
          建设期: constructionPeriod,
          运营期: ebitda
        },
        // 3.2 所得税
        {
          序号: '3.2',
          项目: '所得税',
          合计: null,
          建设期: constructionPeriod,
          运营期: incomeTax
        },
        // 3.3 还利息及担保费
        {
          序号: '3.3',
          项目: '还利息及担保费',
          合计: null,
          建设期: constructionPeriod,
          运营期: interestAndGuaranteeFee
        },
        // 3.4 还本金
        {
          序号: '3.4',
          项目: '还本金',
          合计: null,
          建设期: constructionPeriod,
          运营期: principalRepayment
        },
        // 3.5 利息备付率
        {
          序号: '3.5',
          项目: '利息备付率',
          合计: null,
          建设期: constructionPeriod,
          运营期: interestCoverageRatio
        },
        // 3.6 偿债备付率
        {
          序号: '3.6',
          项目: '偿债备付率',
          合计: null,
          建设期: constructionPeriod,
          运营期: debtServiceCoverageRatio
        }
      ],
      updatedAt: new Date().toISOString()
    };

    return tableData;
  }, [context, loanConfig, profitDistributionTableData]);

  // 保存借款还本付息计划表数据
  useEffect(() => {
    if (calculateLoanRepaymentData) {
      setLoanRepaymentTableData(calculateLoanRepaymentData);
    }
  }, [calculateLoanRepaymentData, setLoanRepaymentTableData]);

  // 打开设置弹窗时，将当前配置复制到临时状态
  const openSettingsModal = () => {
    setTempLoanConfig(loanConfig);
    setShowSettingsModal(true);
  };

  // 保存贷款配置
  const saveLoanConfig = () => {
    setLoanConfig(tempLoanConfig);
    setShowSettingsModal(false);
    
    notifications.show({
      title: '保存成功',
      message: '贷款配置已保存，表格已重新计算',
      color: 'green',
    });
  };

  // 导出Excel
  const handleExportExcel = () => {
    if (!context || !calculateLoanRepaymentData) {
      notifications.show({
        title: '导出失败',
        message: '数据未加载完成',
        color: 'red',
      });
      return;
    }

    const constructionYears = context.constructionYears;
    const operationYears = context.operationYears;
    const totalYears = constructionYears + operationYears;

    // 准备Excel数据
    const excelData: any[] = [];
    
    // 添加表头
    const headerRow: any = { '序号': '', '项目': '', '合计': '' };
    for (let i = 1; i <= constructionYears; i++) {
      headerRow[`建设期${i}`] = '';
    }
    for (let i = 1; i <= operationYears; i++) {
      headerRow[`运营期${i}`] = '';
    }
    excelData.push(headerRow);
    
    // 第二行表头
    const headerRow2: any = { '序号': '', '项目': '', '合计': '' };
    for (let i = 1; i <= totalYears; i++) {
      headerRow2[`${i}`] = i;
    }
    excelData.push(headerRow2);

    // 添加数据行
    calculateLoanRepaymentData.rows.forEach((row) => {
      const dataRow: any = { 
        '序号': row.序号, 
        '项目': row.项目,
        '合计': row.合计 || ''
      };
      
      // 添加建设期数据
      row.建设期.forEach((value, index) => {
        dataRow[`建设期${index + 1}`] = formatNumberWithZeroBlank(value);
      });
      
      // 添加运营期数据
      row.运营期.forEach((value, index) => {
        dataRow[`运营期${index + 1}`] = formatNumberWithZeroBlank(value);
      });
      
      excelData.push(dataRow);
    });

    // 创建工作簿和工作表
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '借款还本付息计划表');

    // 导出文件
    XLSX.writeFile(wb, `借款还本付息计划表_${context.projectName || '项目'}.xlsx`);

    notifications.show({
      title: '导出成功',
      message: '借款还本付息计划表已导出为Excel文件',
      color: 'green',
    });
  };

  // 渲染表格内容
  const renderTable = () => {
    if (!context || !calculateLoanRepaymentData) {
      return <Text c="red">项目上下文未加载</Text>;
    }

    const constructionYears = context.constructionYears;
    const operationYears = context.operationYears;
    const totalYears = constructionYears + operationYears;
    const years = Array.from({ length: totalYears }, (_, i) => i + 1);

    return (
      <Table striped withTableBorder style={{ fontSize: '11px' }}>
        <Table.Thead>
          <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
            <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: '40px' }}>序号</Table.Th>
            <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6', width: '220px' }}>项目</Table.Th>
            <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>合计</Table.Th>
            <Table.Th colSpan={constructionYears} style={{ textAlign: 'center', border: '1px solid #dee2e6', width: `${constructionYears * 80}px` }}>建设期</Table.Th>
            <Table.Th colSpan={operationYears} style={{ textAlign: 'center', border: '1px solid #dee2e6', width: `${operationYears * 80}px` }}>运营期</Table.Th>
          </Table.Tr>
          <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
            {years.map((year) => (
              <Table.Th key={year} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {year}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {calculateLoanRepaymentData.rows.map((row, idx) => (
            <Table.Tr key={idx}>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>{row.序号}</Table.Td>
              <Table.Td style={{ border: '1px solid #dee2e6' }}>{row.项目}</Table.Td>
              <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                {row.合计 !== null ? formatNumberNoRounding(row.合计) : ''}
              </Table.Td>
              {row.建设期.map((value, index) => (
                <Table.Td key={`construction-${index}`} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                  {formatNumberWithZeroBlank(value)}
                </Table.Td>
              ))}
              {row.运营期.map((value, index) => (
                <Table.Td key={`operation-${index}`} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                  {formatNumberWithZeroBlank(value)}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    );
  };

  const content = (
    <>
      <Group justify="space-between" align="center" mb="md">
        <Text size="md" fw={600} c="#1D2129">
          借款还本付息计划表
        </Text>
        <Group gap="xs">
          <Tooltip label="贷款设置">
            <ActionIcon
              variant="light"
              color="blue"
              size="lg"
              onClick={openSettingsModal}
            >
              <IconSettings size={20} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="导出Excel">
            <ActionIcon
              variant="light"
              color="green"
              size="lg"
              onClick={handleExportExcel}
            >
              <IconDownload size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {renderTable()}

      {/* 贷款设置弹窗 */}
      <Modal
        opened={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        centered
        title="📊 贷款设置"
        size="500px"
      >
        <Stack gap="md">
          <div>
            <Text size="sm" fw={500} mb="xs">贷款金额（万元）</Text>
            <NumberInput
              value={tempLoanConfig.loanAmount}
              onChange={(value) => setTempLoanConfig(prev => ({ ...prev, loanAmount: typeof value === 'number' ? value : 0 }))}
              min={0}
              step={100}
              placeholder="请输入贷款金额"
            />
          </div>
          
          <div>
            <Text size="sm" fw={500} mb="xs">年利率（%）</Text>
            <NumberInput
              value={tempLoanConfig.interestRate}
              onChange={(value) => setTempLoanConfig(prev => ({ ...prev, interestRate: typeof value === 'number' ? value : 0 }))}
              min={0}
              max={100}
              step={0.1}
              decimalScale={1}
              placeholder="请输入年利率"
            />
          </div>
          
          <div>
            <Text size="sm" fw={500} mb="xs">贷款期限（年）</Text>
            <NumberInput
              value={tempLoanConfig.loanTerm}
              onChange={(value) => setTempLoanConfig(prev => ({ ...prev, loanTerm: typeof value === 'number' ? value : 0 }))}
              min={1}
              step={1}
              placeholder="请输入贷款期限"
            />
          </div>
          
          <div>
            <Text size="sm" fw={500} mb="xs">宽限期（年）</Text>
            <NumberInput
              value={tempLoanConfig.gracePeriod}
              onChange={(value) => setTempLoanConfig(prev => ({ ...prev, gracePeriod: typeof value === 'number' ? value : 0 }))}
              min={0}
              step={1}
              placeholder="请输入宽限期"
            />
          </div>
          
          <div>
            <Text size="sm" fw={500} mb="xs">还款方式</Text>
            <Select
              value={tempLoanConfig.repaymentMethod}
              onChange={(value) =>
                setTempLoanConfig(prev => ({ ...prev, repaymentMethod: value as 'equal-installment' | 'equal-principal' }))
              }
              data={[
                { value: 'equal-installment', label: '等额本息' },
                { value: 'equal-principal', label: '等额本金' }
              ]}
            />
          </div>
          
          <Group justify="flex-end" mt="md">
            <Button
              variant="outline"
              onClick={() => setShowSettingsModal(false)}
            >
              取消
            </Button>
            <Button
              onClick={saveLoanConfig}
            >
              保存
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );

  if (showCard) {
    return (
      <Card withBorder radius="md">
        {content}
      </Card>
    );
  }

  return content;
};

export default LoanRepaymentScheduleTable;