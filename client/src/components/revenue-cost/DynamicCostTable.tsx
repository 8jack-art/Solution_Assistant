import React, { useState } from 'react'
import {
  Card,
  Stack,
  Text,
  Button,
  Group,
  Table,
  Modal,
  NumberInput,
  ActionIcon,
  Tooltip,
  SegmentedControl,
  TextInput,
  Select,
  Checkbox,
  Divider,
  Box,
  SimpleGrid,
  UnstyledButton,
} from '@mantine/core'
import { 
  IconTable, 
  IconSettings, 
  IconPackage, 
  IconGasStation, 
  IconUserDollar, 
  IconTools, 
  IconDots,
  IconPlus,
  IconEdit
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useRevenueCostStore, CostItem, calculateTaxableIncome } from '@/stores/revenueCostStore'

/**
 * 动态成本表格组件
 */
const DynamicCostTable: React.FC = () => {
  const { context, costItems, revenueItems } = useRevenueCostStore()
  
  const [showCostDetailModal, setShowCostDetailModal] = useState(false)
  
  // 外购原材料费估算表弹窗状态
  const [showRawMaterialsModal, setShowRawMaterialsModal] = useState(false)
  // 外购燃料及动力费估算表弹窗状态
  const [showFuelPowerModal, setShowFuelPowerModal] = useState(false)
  // 工资及福利费估算表弹窗状态
  const [showWagesModal, setShowWagesModal] = useState(false)
  // 修理费配置弹窗状态
  const [showRepairModal, setShowRepairModal] = useState(false)
  // 其他费用配置弹窗状态
  const [showOtherModal, setShowOtherModal] = useState(false)
  
  // 原材料编辑弹窗状态
  const [showRawMaterialEditModal, setShowRawMaterialEditModal] = useState(false)
  const [currentRawMaterial, setCurrentRawMaterial] = useState<any>(null)
  const [rawMaterialIndex, setRawMaterialIndex] = useState<number | null>(null)
  
  // 成本配置参数状态
  const [costConfig, setCostConfig] = useState({
    // 外购原材料费配置
    rawMaterials: {
      applyProductionRate: true, // 是否应用达产率
      items: [
        { id: 1, name: '原材料1', sourceType: 'percentage', percentageOfRevenue: 2, quantity: 0, unitPrice: 0, directAmount: 0, taxRate: 13 },
        { id: 2, name: '原材料2', sourceType: 'quantityPrice', percentageOfRevenue: 0, quantity: 100, unitPrice: 0.5, directAmount: 0, taxRate: 13 },
        { id: 3, name: '原材料3', sourceType: 'directAmount', percentageOfRevenue: 0, quantity: 0, unitPrice: 0, directAmount: 50, taxRate: 13 },
      ]
    },
    // 外购燃料及动力费配置
    fuelPower: {
      type: 'electricity', // electricity, water, gasoline, diesel
      quantity: 0,
      unitPrice: 0,
      directAmount: 0,
      applyProductionRate: true, // 是否应用达产率
      taxRate: 13, // 进项税率
    },
    // 工资及福利费配置
    wages: {
      employees: 10, // 人数
      salaryPerEmployee: 5, // 每人单价(万元)
      directAmount: 0, // 直接金额
      taxRate: 0, // 进项税率
    },
    // 修理费配置
    repair: {
      type: 'percentage', // percentage, directAmount
      percentageOfFixedAssets: 2, // 固定资产投资的百分比
      directAmount: 0, // 直接金额
      taxRate: 13, // 进项税率
    },
    // 其他费用配置
    other: {
      type: 'percentage', // percentage, directAmount
      percentageOfRevenue: 3, // 营业收入的百分比
      directAmount: 0, // 直接金额
      taxRate: 6, // 进项税率
    }
  });

  // Card with actions grid 的数据
  const costItemsData = [
    { 
      title: '外购原材料费', 
      icon: IconPackage, 
      color: 'blue',
      onClick: () => setShowRawMaterialsModal(true)
    },
    { 
      title: '外购燃料及动力费', 
      icon: IconGasStation, 
      color: 'green',
      onClick: () => setShowFuelPowerModal(true)
    },
    { 
      title: '工资及福利费', 
      icon: IconUserDollar, 
      color: 'orange',
      onClick: () => setShowWagesModal(true)
    },
  ];

  // 渲染原材料编辑弹窗
  const renderRawMaterialEditModal = () => (
    <Modal
      opened={showRawMaterialEditModal}
      onClose={() => setShowRawMaterialEditModal(false)}
      title="编辑原材料"
      size="md"
    >
      {currentRawMaterial && (
        <Stack gap="md">
          <TextInput
            label="原材料名称"
            value={currentRawMaterial.name}
            onChange={(e) => setCurrentRawMaterial({...currentRawMaterial, name: e.target.value})}
          />
          
          <Select
            label="费用计算方式"
            data={[
              { value: 'percentage', label: '根据收入的百分比' },
              { value: 'quantityPrice', label: '数量×单价' },
              { value: 'directAmount', label: '直接填金额' },
            ]}
            value={currentRawMaterial.sourceType}
            onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, sourceType: value})}
          />
          
          {currentRawMaterial.sourceType === 'percentage' && (
            <>
              <Select
                label="选择收入项目"
                data={[
                  { value: 'total', label: '整个项目年收入' },
                  ...(revenueItems || []).map((item: any) => ({
                    value: item.id,
                    label: `${item.name} (年收入: ${(calculateTaxableIncome(item) * 10000).toFixed(2)}万元)`
                  }))
                ]}
                placeholder="请选择收入项目"
                value={currentRawMaterial.linkedRevenueId || 'total'}
                onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, linkedRevenueId: value || undefined})}
              />
              <NumberInput
                label="占收入的百分比 (%)"
                value={currentRawMaterial.percentageOfRevenue}
                onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, percentageOfRevenue: Number(value)})}
                min={0}
                max={100}
                decimalScale={2}
              />
            </>
          )}
          
          {currentRawMaterial.sourceType === 'quantityPrice' && (
            <>
              <NumberInput
                label="数量"
                value={currentRawMaterial.quantity}
                onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, quantity: Number(value)})}
                min={0}
              />
              <NumberInput
                label="单价"
                value={currentRawMaterial.unitPrice}
                onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, unitPrice: Number(value)})}
                min={0}
                decimalScale={2}
              />
            </>
          )}
          
          {currentRawMaterial.sourceType === 'directAmount' && (
            <NumberInput
              label="直接金额（万元）"
              value={currentRawMaterial.directAmount}
              onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, directAmount: Number(value)})}
              min={0}
              decimalScale={2}
            />
          )}
          
          <NumberInput
            label="进项税率 (%)"
            value={currentRawMaterial.taxRate}
            onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, taxRate: Number(value)})}
            min={0}
            max={100}
            decimalScale={2}
          />
          
          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => setShowRawMaterialEditModal(false)}>
              取消
            </Button>
            <Button 
              onClick={() => {
                if (rawMaterialIndex !== null) {
                  const newItems = [...costConfig.rawMaterials.items];
                  newItems[rawMaterialIndex] = currentRawMaterial;
                  setCostConfig({
                    ...costConfig,
                    rawMaterials: {
                      ...costConfig.rawMaterials,
                      items: newItems
                    }
                  });
                }
                setShowRawMaterialEditModal(false);
              }} 
              style={{ backgroundColor: '#165DFF', color: '#FFFFFF' }}
            >
              保存
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );

  // 渲染外购原材料费估算表
  const renderRawMaterialsModal = () => (
    <Modal
      opened={showRawMaterialsModal}
      onClose={() => setShowRawMaterialsModal(false)}
      title={
        <Group justify="space-between" w="100%">
          <Text>📊 外购原材料费估算表</Text>
          <Group gap="xs">
            <Checkbox
              label="应用达产率"
              checked={costConfig.rawMaterials.applyProductionRate}
              onChange={(event) => setCostConfig({
                ...costConfig,
                rawMaterials: { 
                  ...costConfig.rawMaterials, 
                  applyProductionRate: event.currentTarget.checked 
                }
              })}
            />
            <Tooltip label="添加原材料">
              <ActionIcon 
                variant="filled" 
                color="blue" 
                onClick={() => {
                  const newItem = {
                    id: Date.now(),
                    name: `原材料${costConfig.rawMaterials.items.length + 1}`,
                    sourceType: 'percentage',
                    percentageOfRevenue: 0,
                    quantity: 0,
                    unitPrice: 0,
                    directAmount: 0,
                    taxRate: 13
                  };
                  setCostConfig({
                    ...costConfig,
                    rawMaterials: {
                      ...costConfig.rawMaterials,
                      items: [...costConfig.rawMaterials.items, newItem]
                    }
                  });
                }}
              >
                <IconPlus size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
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
      {(() => {
        if (!context) return <Text c="red">项目上下文未加载</Text>

        const operationYears = context.operationYears
        const years = Array.from({ length: operationYears }, (_, i) => i + 1)

        return (
          <>
            <Table striped withTableBorder style={{ fontSize: '11px' }}>
              <Table.Thead>
                <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
                  <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>序号</Table.Th>
                  <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>成本项目</Table.Th>
                  <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>合计</Table.Th>
                  <Table.Th colSpan={operationYears} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>运营期</Table.Th>
                  <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>操作</Table.Th>
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
                {/* 1. 外购原材料 */}
                <Table.Tr>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1</Table.Td>
                  <Table.Td style={{ border: '1px solid #dee2e6' }}>外购原材料</Table.Td>
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                  {years.map((year) => (
                    <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      0.00
                    </Table.Td>
                  ))}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    <Group gap={4} justify="center">
                      <Tooltip label="编辑">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          size="sm"
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
                
                {/* 1.1, 1.2, 1.3... 原材料项 */}
                {costConfig.rawMaterials.items.map((item, idx) => (
                  <Table.Tr key={item.id}>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.{idx + 1}</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>
                      {item.name}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <Group gap={4} justify="center">
                        <Tooltip label="编辑">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                            onClick={() => {
                              setCurrentRawMaterial({...item});
                              setRawMaterialIndex(idx);
                              setShowRawMaterialEditModal(true);
                            }}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="删除">
                          <ActionIcon
                            variant="light"
                            color="red"
                            size="sm"
                            onClick={() => {
                              const newItems = costConfig.rawMaterials.items.filter((_, i) => i !== idx);
                              setCostConfig({
                                ...costConfig,
                                rawMaterials: {
                                  ...costConfig.rawMaterials,
                                  items: newItems
                                }
                              });
                            }}
                          >
                            <IconSettings size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
                
                {/* 2. 辅助材料费用 */}
                <Table.Tr>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>2</Table.Td>
                  <Table.Td style={{ border: '1px solid #dee2e6' }}>辅助材料费用</Table.Td>
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                  {years.map((year) => (
                    <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      0.00
                    </Table.Td>
                  ))}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    <Group gap={4} justify="center">
                      <Tooltip label="编辑">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          size="sm"
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
                
                {/* 3. 其他 */}
                <Table.Tr>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>3</Table.Td>
                  <Table.Td style={{ border: '1px solid #dee2e6' }}>其他</Table.Td>
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                  {years.map((year) => (
                    <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      0.00
                    </Table.Td>
                  ))}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    <Group gap={4} justify="center">
                      <Tooltip label="编辑">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          size="sm"
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
                
                {/* 4. 进项税额 */}
                <Table.Tr>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>4</Table.Td>
                  <Table.Td style={{ border: '1px solid #dee2e6' }}>进项税额</Table.Td>
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                  {years.map((year) => (
                    <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      0.00
                    </Table.Td>
                  ))}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    <Group gap={4} justify="center">
                      <Tooltip label="编辑">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          size="sm"
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </>
        )
      })()}
    </Modal>
  );

  // 渲染修理费配置弹窗
  const renderRepairModal = () => (
    <Modal
      opened={showRepairModal}
      onClose={() => setShowRepairModal(false)}
      title="修理费配置"
      size="md"
    >
      <Stack gap="md">
        <Select
          label="费用类型"
          data={[
            { value: 'percentage', label: '按固定资产投资的百分比' },
            { value: 'directAmount', label: '直接填金额' },
          ]}
          value={costConfig.repair.type}
          onChange={(value) => setCostConfig({
            ...costConfig,
            repair: { ...costConfig.repair, type: value as any }
          })}
        />
        
        {costConfig.repair.type === 'percentage' && (
          <NumberInput
            label="固定资产投资的百分比 (%)"
            value={costConfig.repair.percentageOfFixedAssets}
            onChange={(value) => setCostConfig({
              ...costConfig,
              repair: { ...costConfig.repair, percentageOfFixedAssets: Number(value) }
            })}
            min={0}
            max={100}
            decimalScale={2}
          />
        )}
        
        {costConfig.repair.type === 'directAmount' && (
          <NumberInput
            label="直接金额（万元）"
            value={costConfig.repair.directAmount}
            onChange={(value) => setCostConfig({
              ...costConfig,
              repair: { ...costConfig.repair, directAmount: Number(value) }
            })}
            min={0}
            decimalScale={2}
          />
        )}
        
        <NumberInput
          label="进项税率 (%)"
          value={costConfig.repair.taxRate}
          onChange={(value) => setCostConfig({
            ...costConfig,
            repair: { ...costConfig.repair, taxRate: Number(value) }
          })}
          min={0}
          max={100}
          decimalScale={2}
        />
        
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => setShowRepairModal(false)}>
            取消
          </Button>
          <Button onClick={() => setShowRepairModal(false)} style={{ backgroundColor: '#165DFF', color: '#FFFFFF' }}>
            保存
          </Button>
        </Group>
      </Stack>
    </Modal>
  );

  // 渲染其他费用配置弹窗
  const renderOtherModal = () => (
    <Modal
      opened={showOtherModal}
      onClose={() => setShowOtherModal(false)}
      title="其他费用配置"
      size="md"
    >
      <Stack gap="md">
        <Select
          label="费用类型"
          data={[
            { value: 'percentage', label: '按营业收入的百分比' },
            { value: 'directAmount', label: '直接填金额' },
          ]}
          value={costConfig.other.type}
          onChange={(value) => setCostConfig({
            ...costConfig,
            other: { ...costConfig.other, type: value as any }
          })}
        />
        
        {costConfig.other.type === 'percentage' && (
          <>
            <Select
              label="选择收入项目"
              data={[
                { value: 'total', label: '整个项目收入' },
                { value: 'item1', label: '收入项1' },
                { value: 'item2', label: '收入项2' },
              ]}
              placeholder="请选择收入项目"
            />
            <NumberInput
              label="营业收入的百分比 (%)"
              value={costConfig.other.percentageOfRevenue}
              onChange={(value) => setCostConfig({
                ...costConfig,
                other: { ...costConfig.other, percentageOfRevenue: Number(value) }
              })}
              min={0}
              max={100}
              decimalScale={2}
            />
          </>
        )}
        
        {costConfig.other.type === 'directAmount' && (
          <NumberInput
            label="直接金额（万元）"
            value={costConfig.other.directAmount}
            onChange={(value) => setCostConfig({
              ...costConfig,
              other: { ...costConfig.other, directAmount: Number(value) }
            })}
            min={0}
            decimalScale={2}
          />
        )}
        
        <NumberInput
          label="进项税率 (%)"
          value={costConfig.other.taxRate}
          onChange={(value) => setCostConfig({
            ...costConfig,
            other: { ...costConfig.other, taxRate: Number(value) }
          })}
          min={0}
          max={100}
          decimalScale={2}
        />
        
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => setShowOtherModal(false)}>
            取消
          </Button>
          <Button onClick={() => setShowOtherModal(false)} style={{ backgroundColor: '#165DFF', color: '#FFFFFF' }}>
            保存
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
  
  return (
    <>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text size="md" fw={600} c="#1D2129">
            营业成本配置
          </Text>
          <Group gap="xs">
            <Tooltip label="查看成本详表">
              <ActionIcon
                variant="light"
                color="cyan"
                size="lg"
                onClick={() => setShowCostDetailModal(true)}
              >
                <IconTable size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Card with actions grid */}
        <Card withBorder radius="md">
          <Group justify="space-between">
            <Text size="lg" fw={600}>成本配置项</Text>
          </Group>
          <SimpleGrid cols={3} mt="md">
            {costItemsData.map((item, index) => (
              <UnstyledButton 
                key={item.title} 
                onClick={item.onClick}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '16px',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#165DFF'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e9ecef'}
              >
                <item.icon color="#165DFF" size={32} />
                <Text size="xs" mt={7}>
                  {item.title}
                </Text>
              </UnstyledButton>
            ))}
            
            {/* 修理费配置按钮 */}
            <UnstyledButton 
              onClick={() => setShowRepairModal(true)}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '16px',
                border: '1px solid #e9ecef',
                borderRadius: '4px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#165DFF'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e9ecef'}
            >
              <IconTools color="#165DFF" size={32} />
              <Text size="xs" mt={7}>
                修理费
              </Text>
            </UnstyledButton>
            
            {/* 其他费用配置按钮 */}
            <UnstyledButton 
              onClick={() => setShowOtherModal(true)}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '16px',
                border: '1px solid #e9ecef',
                borderRadius: '4px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#165DFF'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e9ecef'}
            >
              <IconDots color="#165DFF" size={32} />
              <Text size="xs" mt={7}>
                其他费用
              </Text>
            </UnstyledButton>
          </SimpleGrid>
        </Card>
      </Stack>
      
      {/* 成本详表弹窗 */}
      <Modal
        opened={showCostDetailModal}
        onClose={() => setShowCostDetailModal(false)}
        title={
          <Text size="md">
            📊 营业成本估算表
          </Text>
        }
        size="calc(100vw - 100px)"
        styles={{
          body: {
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
          },
        }}
      >
        {(() => {
          if (!context) return <Text c="red">项目上下文未加载</Text>

          const operationYears = context.operationYears
          const years = Array.from({ length: operationYears }, (_, i) => i + 1)

          return (
            <>
              <Table striped withTableBorder style={{ fontSize: '11px' }}>
                <Table.Thead>
                  <Table.Tr style={{ backgroundColor: '#F7F8FA' }}>
                    <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>序号</Table.Th>
                    <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>成本项目</Table.Th>
                    <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>合计</Table.Th>
                    <Table.Th colSpan={operationYears} style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>运营期</Table.Th>
                    <Table.Th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #dee2e6' }}>操作</Table.Th>
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
                  {/* 1. 营业成本 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>营业成本</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {costItems.reduce((sum, item) => sum + (item.directAmount || 0), 0).toFixed(2)}
                    </Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {costItems.reduce((sum, item) => sum + (item.directAmount || 0), 0).toFixed(2)}
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <Group gap={4} justify="center">
                        <Tooltip label="编辑">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                          >
                            <IconSettings size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 1.1 外购原材料费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.1</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>外购原材料费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <Group gap={4} justify="center">
                        <Tooltip label="编辑">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                            onClick={() => setShowRawMaterialsModal(true)}
                          >
                            <IconSettings size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 1.2 外购燃料及动力费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.2</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>外购燃料及动力费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <Group gap={4} justify="center">
                        <Tooltip label="编辑">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                            onClick={() => setShowFuelPowerModal(true)}
                          >
                            <IconSettings size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 1.3 工资及福利费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.3</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>工资及福利费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <Group gap={4} justify="center">
                        <Tooltip label="编辑">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                            onClick={() => setShowWagesModal(true)}
                          >
                            <IconSettings size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 1.4 修理费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.4</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>修理费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <Group gap={4} justify="center">
                        <Tooltip label="编辑">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                            onClick={() => setShowRepairModal(true)}
                          >
                            <IconSettings size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 1.5 其他费用 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.5</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>其他费用</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <Group gap={4} justify="center">
                        <Tooltip label="编辑">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                            onClick={() => setShowOtherModal(true)}
                          >
                            <IconSettings size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 2. 管理费用 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>2</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>管理费用</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  
                  {/* 3. 财务费用 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>3</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>财务费用</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  
                  {/* 3.1 利息支出 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>3.1</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>利息支出</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  
                  {/* 4. 折旧费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>4</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>折旧费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  
                  {/* 5. 摊销费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>5</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>摊销费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  
                  {/* 6. 开发成本 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>6</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>开发成本</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  
                  {/* 7. 总成本费用合计 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>7</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>总成本费用合计</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        0.00
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </>
          )
        })()}
      </Modal>
      
      {/* 外购原材料费估算表弹窗 */}
      {renderRawMaterialsModal()}
      
      {/* 原材料编辑弹窗 */}
      {renderRawMaterialEditModal()}
      
      {/* 修理费配置弹窗 */}
      {renderRepairModal()}
      
      {/* 其他费用配置弹窗 */}
      {renderOtherModal()}
    </>
  )
}

export default DynamicCostTable