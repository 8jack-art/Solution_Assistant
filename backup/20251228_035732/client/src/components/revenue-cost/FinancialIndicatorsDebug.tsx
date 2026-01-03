import React from 'react';
import { 
  Modal, 
  Title, 
  Text, 
  Divider, 
  Table, 
  ScrollArea,
  Stack,
  Paper,
  Code,
  Badge,
  Tabs,
  Alert,
  Group
} from '@mantine/core';
import { IconInfoCircle, IconMathFunction, IconChartLine, IconReceipt, IconTrendingUp } from '@tabler/icons-react';

interface FinancialIndicatorsDebugProps {
  opened: boolean;
  onClose: () => void;
  indicators: {
    // 税前指标
    preTaxIRR: number;
    preTaxNPV: number;
    preTaxStaticPaybackPeriod: number;
    preTaxDynamicPaybackPeriod: number;
    
    // 税后指标
    postTaxIRR: number;
    postTaxNPV: number;
    postTaxStaticPaybackPeriod: number;
    postTaxDynamicPaybackPeriod: number;
  };
  cashFlowData: {
    preTaxData: Array<{
      year: number;
      staticCashFlow: number;
      dynamicCashFlow: number;
      cumulativeStaticCashFlow: number;
      cumulativeDynamicCashFlow: number;
    }>;
    postData: Array<{
      year: number;
      staticCashFlow: number;
      dynamicCashFlow: number;
      cumulativeStaticCashFlow: number;
      cumulativeDynamicCashFlow: number;
    }>;
  };
  preTaxRate?: number; // 税前折现率
  postTaxRate?: number; // 税后折现率
  incomeTaxRate?: number; // 所得税率
}

export function FinancialIndicatorsDebug({ 
  opened, 
  onClose, 
  indicators, 
  cashFlowData,
  preTaxRate = 6,
  postTaxRate = 6,
  incomeTaxRate = 25
}: FinancialIndicatorsDebugProps) {

  // 格式化数字
  const formatNumber = (value: number, decimals: number = 2): string => {
    if (isNaN(value) || !isFinite(value)) return 'N/A';
    return value.toFixed(decimals);
  };

  // 生成IRR计算步骤
  const generateIRRSteps = (isPreTax: boolean) => {
    const irr = isPreTax ? indicators.preTaxIRR : indicators.postTaxIRR;
    const data = isPreTax ? cashFlowData.preTaxData : cashFlowData.postData;
    const label = isPreTax ? '税前' : '税后';
    
    const steps = [
      {
        step: 1,
        description: `${label}内部收益率定义`,
        formula: "NPV(r) = Σ [CFt / (1+r)^t] = 0",
        explanation: "找到使净现值为零的折现率r"
      },
      {
        step: 2,
        description: "使用牛顿-拉夫逊法迭代求解",
        formula: "r_{n+1} = r_n - NPV(r_n) / NPV'(r_n)",
        explanation: "通过迭代逼近使NPV=0的精确解"
      },
      {
        step: 3,
        description: `${label}现金流序列`,
        formula: `CF = [${data.map(cf => formatNumber(cf.staticCashFlow)).join(', ')}]`,
        explanation: "各年净现金流数据"
      },
      {
        step: 4,
        description: `${label}IRR计算结果`,
        formula: `IRR${label} = ${formatNumber(irr)}%`,
        explanation: `${label}内部收益率，反映项目${label}投资回报水平`
      }
    ];
    return steps;
  };

  // 生成NPV计算步骤
  const generateNPVSteps = (isPreTax: boolean) => {
    const npv = isPreTax ? indicators.preTaxNPV : indicators.postTaxNPV;
    const data = isPreTax ? cashFlowData.preTaxData : cashFlowData.postData;
    const rate = isPreTax ? preTaxRate : postTaxRate;
    const label = isPreTax ? '税前' : '税后';
    
    const steps = [
      {
        step: 1,
        description: `${label}净现值计算公式`,
        formula: `NPV${label} = Σ [CFt / (1+r)^t]`,
        explanation: `折现率r = ${rate}%`
      },
      ...data.map((cf, index) => ({
        step: index + 2,
        description: `第${cf.year}年${label}折现现金流`,
        formula: `CF${cf.year}/(1+${rate/100})^${cf.year} = ${formatNumber(cf.staticCashFlow)}/${(1+rate/100).toFixed(3)}^${cf.year} = ${formatNumber(cf.dynamicCashFlow)}`,
        explanation: `第${cf.year}年现金流: ${formatNumber(cf.staticCashFlow)}, 折现后: ${formatNumber(cf.dynamicCashFlow)}`
      })),
      {
        step: data.length + 2,
        description: `${label}NPV总计`,
        formula: `NPV${label} = Σ折现现金流 = ${formatNumber(npv)}`,
        explanation: `${label}所有折现现金流的总和`
      }
    ];
    return steps;
  };

  // 生成静态投资回收期计算步骤
  const generateStaticPaybackSteps = (isPreTax: boolean) => {
    const period = isPreTax ? indicators.preTaxStaticPaybackPeriod : indicators.postTaxStaticPaybackPeriod;
    const data = isPreTax ? cashFlowData.preTaxData : cashFlowData.postData;
    const label = isPreTax ? '税前' : '税后';
    
    const steps = [
      {
        step: 1,
        description: `${label}静态投资回收期定义`,
        formula: "累计现金流 ≥ 0 的年份",
        explanation: "不考虑资金时间价值的投资回收时间"
      },
      ...data.map((cf, index) => ({
        step: index + 2,
        description: `第${cf.year}年${label}累计现金流`,
        formula: `${index === 0 ? formatNumber(cf.staticCashFlow) : `前一年累计 + 本年现金流 = ${formatNumber(cf.cumulativeStaticCashFlow)}`}`,
        explanation: `第${cf.year}年累计${label}现金流: ${formatNumber(cf.cumulativeStaticCashFlow)}`
      })),
      {
        step: data.length + 2,
        description: `${label}静态投资回收期`,
        formula: `${formatNumber(period)} 年`,
        explanation: data.some(cf => cf.cumulativeStaticCashFlow >= 0) 
          ? `累计${label}现金流首次非负的年份`
          : "在计算期内未能收回投资"
      }
    ];
    return steps;
  };

  // 生成动态投资回收期计算步骤
  const generateDynamicPaybackSteps = (isPreTax: boolean) => {
    const period = isPreTax ? indicators.preTaxDynamicPaybackPeriod : indicators.postTaxDynamicPaybackPeriod;
    const data = isPreTax ? cashFlowData.preTaxData : cashFlowData.postData;
    const rate = isPreTax ? preTaxRate : postTaxRate;
    const label = isPreTax ? '税前' : '税后';
    
    const steps = [
      {
        step: 1,
        description: `${label}动态投资回收期定义`,
        formula: "累计折现现金流 ≥ 0 的年份",
        explanation: `考虑资金时间价值的投资回收时间（折现率${rate}%）`
      },
      ...data.map((cf, index) => ({
        step: index + 2,
        description: `第${cf.year}年${label}累计折现现金流`,
        formula: `${index === 0 ? formatNumber(cf.dynamicCashFlow) : `前一年累计 + 本年折现现金流 = ${formatNumber(cf.cumulativeDynamicCashFlow)}`}`,
        explanation: `第${cf.year}年累计折现现金流: ${formatNumber(cf.cumulativeDynamicCashFlow)}`
      })),
      {
        step: data.length + 2,
        description: `${label}动态投资回收期`,
        formula: `${formatNumber(period)} 年`,
        explanation: data.some(cf => cf.cumulativeDynamicCashFlow >= 0) 
          ? `累计${label}折现现金流首次非负的年份`
          : "在计算期内未能收回投资"
      }
    ];
    return steps;
  };

  // 渲染计算步骤表格
  const renderStepsTable = (steps: Array<{
    step: number;
    description: string;
    formula: string;
    explanation: string;
  }>) => {
    const rows = steps.map((step) => (
      <Table.Tr key={step.step}>
        <Table.Td width={60}>{step.step}</Table.Td>
        <Table.Td width={200}>{step.description}</Table.Td>
        <Table.Td>
          <Code block>
            {step.formula}
          </Code>
        </Table.Td>
        <Table.Td width={300}>{step.explanation}</Table.Td>
      </Table.Tr>
    ));

    return (
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>步骤</Table.Th>
            <Table.Th>说明</Table.Th>
            <Table.Th>计算公式</Table.Th>
            <Table.Th>解释</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    );
  };

  // 渲染指标卡片
  const renderIndicatorCard = (title: string, value: number, unit: string, color: string, icon: React.ReactNode) => (
    <Paper shadow="xs" p="md" withBorder>
      <Group justify="space-between" align="center">
        <Group gap="sm">
          {icon}
          <Text size="sm" fw={500}>{title}</Text>
        </Group>
        <Badge color={color} variant="light" size="lg">
          {formatNumber(value)}{unit}
        </Badge>
      </Group>
    </Paper>
  );

  // 渲染现金流数据表格
  const renderCashFlowTable = (data: Array<any>, title: string) => (
    <Paper shadow="xs" p="md" withBorder>
      <Title order={4}>{title}</Title>
      <Table striped highlightOnHover mt="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>年份</Table.Th>
            <Table.Th>静态现金流</Table.Th>
            <Table.Th>动态现金流</Table.Th>
            <Table.Th>累计静态现金流</Table.Th>
            <Table.Th>累计动态现金流</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.map((cf) => (
            <Table.Tr key={cf.year}>
              <Table.Td>{cf.year}</Table.Td>
              <Table.Td>{formatNumber(cf.staticCashFlow)}</Table.Td>
              <Table.Td>{formatNumber(cf.dynamicCashFlow)}</Table.Td>
              <Table.Td>{formatNumber(cf.cumulativeStaticCashFlow)}</Table.Td>
              <Table.Td>{formatNumber(cf.cumulativeDynamicCashFlow)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );

  // 渲染税前指标
  const renderPreTaxIndicators = () => (
    <Stack gap="md">
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
        <Group gap="xl">
          <Text size="sm"><strong>税前折现率:</strong> {preTaxRate}%</Text>
          <Text size="sm"><strong>所得税率:</strong> {incomeTaxRate}%</Text>
        </Group>
      </Alert>

      {/* 税前指标概览 */}
      <Title order={5}>税前指标概览</Title>
      <Group grow>
        {renderIndicatorCard("内部收益率", indicators.preTaxIRR, "%", "green", <IconMathFunction size={16} />)}
        {renderIndicatorCard("净现值", indicators.preTaxNPV, "", "blue", <IconChartLine size={16} />)}
      </Group>
      <Group grow>
        {renderIndicatorCard("静态投资回收期", indicators.preTaxStaticPaybackPeriod, "年", "orange", <IconTrendingUp size={16} />)}
        {renderIndicatorCard("动态投资回收期", indicators.preTaxDynamicPaybackPeriod, "年", "purple", <IconTrendingUp size={16} />)}
      </Group>

      <Divider />

      {/* 税前现金流数据 */}
      {renderCashFlowTable(cashFlowData.preTaxData, "税前现金流数据")}

      <Divider />

      {/* 税前指标计算过程 */}
      <Paper shadow="xs" p="md" withBorder>
        <Title order={5}>
          税前内部收益率(IRR)计算过程
        </Title>
        {renderStepsTable(generateIRRSteps(true))}
      </Paper>

      <Paper shadow="xs" p="md" withBorder>
        <Title order={5}>
          税前净现值(NPV)计算过程
        </Title>
        {renderStepsTable(generateNPVSteps(true))}
      </Paper>

      <Paper shadow="xs" p="md" withBorder>
        <Title order={5}>
          税前静态投资回收期计算过程
        </Title>
        {renderStepsTable(generateStaticPaybackSteps(true))}
      </Paper>

      <Paper shadow="xs" p="md" withBorder>
        <Title order={5}>
          税前动态投资回收期计算过程
        </Title>
        {renderStepsTable(generateDynamicPaybackSteps(true))}
      </Paper>
    </Stack>
  );

  // 渲染税后指标
  const renderPostTaxIndicators = () => (
    <Stack gap="md">
      <Alert icon={<IconReceipt size={16} />} color="orange" variant="light">
        <Group gap="xl">
          <Text size="sm"><strong>税后折现率:</strong> {postTaxRate}%</Text>
          <Text size="sm"><strong>所得税率:</strong> {incomeTaxRate}%</Text>
        </Group>
      </Alert>

      {/* 税后指标概览 */}
      <Title order={5}>税后指标概览</Title>
      <Group grow>
        {renderIndicatorCard("内部收益率", indicators.postTaxIRR, "%", "green", <IconMathFunction size={16} />)}
        {renderIndicatorCard("净现值", indicators.postTaxNPV, "", "blue", <IconChartLine size={16} />)}
      </Group>
      <Group grow>
        {renderIndicatorCard("静态投资回收期", indicators.postTaxStaticPaybackPeriod, "年", "orange", <IconTrendingUp size={16} />)}
        {renderIndicatorCard("动态投资回收期", indicators.postTaxDynamicPaybackPeriod, "年", "purple", <IconTrendingUp size={16} />)}
      </Group>

      <Divider />

      {/* 税后现金流数据 */}
      {renderCashFlowTable(cashFlowData.postData, "税后现金流数据")}

      <Divider />

      {/* 税后指标计算过程 */}
      <Paper shadow="xs" p="md" withBorder>
        <Title order={5}>
          税后内部收益率(IRR)计算过程
        </Title>
        {renderStepsTable(generateIRRSteps(false))}
      </Paper>

      <Paper shadow="xs" p="md" withBorder>
        <Title order={5}>
          税后净现值(NPV)计算过程
        </Title>
        {renderStepsTable(generateNPVSteps(false))}
      </Paper>

      <Paper shadow="xs" p="md" withBorder>
        <Title order={5}>
          税后静态投资回收期计算过程
        </Title>
        {renderStepsTable(generateStaticPaybackSteps(false))}
      </Paper>

      <Paper shadow="xs" p="md" withBorder>
        <Title order={5}>
          税后动态投资回收期计算过程
        </Title>
        {renderStepsTable(generateDynamicPaybackSteps(false))}
      </Paper>
    </Stack>
  );

  // 渲染对比分析
  const renderComparison = () => {
    const comparisons = [
      {
        indicator: "内部收益率",
        preTax: indicators.preTaxIRR,
        postTax: indicators.postTaxIRR,
        unit: "%",
        difference: indicators.preTaxIRR - indicators.postTaxIRR
      },
      {
        indicator: "净现值",
        preTax: indicators.preTaxNPV,
        postTax: indicators.postTaxNPV,
        unit: "",
        difference: indicators.preTaxNPV - indicators.postTaxNPV
      },
      {
        indicator: "静态投资回收期",
        preTax: indicators.preTaxStaticPaybackPeriod,
        postTax: indicators.postTaxStaticPaybackPeriod,
        unit: "年",
        difference: indicators.preTaxStaticPaybackPeriod - indicators.postTaxStaticPaybackPeriod
      },
      {
        indicator: "动态投资回收期",
        preTax: indicators.preTaxDynamicPaybackPeriod,
        postTax: indicators.postTaxDynamicPaybackPeriod,
        unit: "年",
        difference: indicators.preTaxDynamicPaybackPeriod - indicators.postTaxDynamicPaybackPeriod
      }
    ];

    return (
      <Stack gap="md">
        <Title order={5}>税前税后指标对比分析</Title>
        
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>财务指标</Table.Th>
              <Table.Th>税前值</Table.Th>
              <Table.Th>税后值</Table.Th>
              <Table.Th>差异</Table.Th>
              <Table.Th>影响分析</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {comparisons.map((comp) => (
              <Table.Tr key={comp.indicator}>
                <Table.Td fw={500}>{comp.indicator}</Table.Td>
                <Table.Td>{formatNumber(comp.preTax)}{comp.unit}</Table.Td>
                <Table.Td>{formatNumber(comp.postTax)}{comp.unit}</Table.Td>
                <Table.Td>
                  <Badge 
                    color={comp.difference > 0 ? 'red' : comp.difference < 0 ? 'green' : 'gray'}
                    variant="light"
                  >
                    {comp.difference > 0 ? '+' : ''}{formatNumber(comp.difference)}{comp.unit}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {comp.indicator.includes('收益率') || comp.indicator.includes('净现值') 
                      ? comp.difference > 0 ? '所得税降低收益' : comp.difference < 0 ? '所得税影响较小' : '无影响'
                      : comp.indicator.includes('回收期')
                      ? comp.difference > 0 ? '所得税延长回收期' : comp.difference < 0 ? '所得税影响较小' : '无影响'
                      : '无明显影响'
                    }
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            <strong>分析说明：</strong>
            所得税对项目财务指标的影响主要体现在收益类指标（IRR、NPV）的降低，
            以及回收期指标的延长。影响程度取决于项目利润水平和所得税率。
          </Text>
        </Alert>
      </Stack>
    );
  };

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      size="95%" 
      title={
        <Title order={3}>
          财务指标详细计算过程（8个指标）
        </Title>
      }
      styles={{
        body: {
          maxHeight: '85vh',
          overflowY: 'auto',
        },
      }}
    >
      <ScrollArea h="75vh">
        <Stack gap="md">
          <Tabs defaultValue="pretax" variant="outline">
            <Tabs.List>
              <Tabs.Tab value="pretax" leftSection={<IconMathFunction size={16} />}>
                税前指标
              </Tabs.Tab>
              <Tabs.Tab value="posttax" leftSection={<IconReceipt size={16} />}>
                税后指标
              </Tabs.Tab>
              <Tabs.Tab value="comparison" leftSection={<IconChartLine size={16} />}>
                对比分析
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="pretax" pt="md">
              {renderPreTaxIndicators()}
            </Tabs.Panel>

            <Tabs.Panel value="posttax" pt="md">
              {renderPostTaxIndicators()}
            </Tabs.Panel>

            <Tabs.Panel value="comparison" pt="md">
              {renderComparison()}
            </Tabs.Panel>
          </Tabs>

          {/* 计算说明 */}
          <Paper shadow="xs" p="md" withBorder>
            <Title order={4}>计算说明</Title>
            <Stack gap="sm" mt="sm">
              <Text size="sm">
                <strong>内部收益率(IRR):</strong> 使项目净现值为零的折现率，反映项目的盈利能力
              </Text>
              <Text size="sm">
                <strong>净现值(NPV):</strong> 未来现金流按设定折现率折现到现值的总和
              </Text>
              <Text size="sm">
                <strong>静态投资回收期:</strong> 不考虑资金时间价值，累计现金流为正的年份
              </Text>
              <Text size="sm">
                <strong>动态投资回收期:</strong> 考虑资金时间价值，累计折现现金流为正的年份
              </Text>
              <Text size="sm">
                <strong>税前税后差异:</strong> 主要来源于所得税的影响，税后指标 = 税前指标 - 所得税影响
              </Text>
            </Stack>
          </Paper>
        </Stack>
      </ScrollArea>
    </Modal>
  );
}
