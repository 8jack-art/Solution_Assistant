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
import { revenueCostApi } from '@/lib/api'

/**
 * 动态成本表格组件
 */
const DynamicCostTable: React.FC = () => {
  const { context, costItems, revenueItems, productionRates } = useRevenueCostStore()
  
  const [showCostDetailModal, setShowCostDetailModal] = useState(false)
  
  // 外购原材料费估算表弹窗状态
  const [showRawMaterialsModal, setShowRawMaterialsModal] = useState(false)
  // 辅助材料费用估算表弹窗状态
  const [showAuxiliaryMaterialsModal, setShowAuxiliaryMaterialsModal] = useState(false)
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
  
  // 成本配置参数状态 - 从store加载或使用默认值
  const [costConfig, setCostConfig] = useState(() => {
    // 尝试从localStorage加载配置
    const savedConfig = localStorage.getItem('costConfig');
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig);
      } catch (e) {
        console.warn('解析保存的成本配置失败，使用默认配置');
      }
    }
    
    // 默认配置
    return {
      // 外购原材料费配置
      rawMaterials: {
        applyProductionRate: true, // 是否应用达产率
        items: [
          { id: 1, name: '原材料1', sourceType: 'percentage', linkedRevenueId: 'total', percentage: 2, quantity: 0, unitPrice: 0, directAmount: 0, taxRate: 13 },
          { id: 2, name: '原材料2', sourceType: 'quantityPrice', percentage: 0, quantity: 100, unitPrice: 0.5, directAmount: 0, taxRate: 13 },
          { id: 3, name: '原材料3', sourceType: 'directAmount', percentage: 0, quantity: 0, unitPrice: 0, directAmount: 50, taxRate: 13 },
        ]
      },
      // 辅助材料费用配置
      auxiliaryMaterials: {
        type: 'percentage', // percentage, directAmount
        percentage: 1, // 营业收入的百分比
        directAmount: 0, // 直接金额
        applyProductionRate: true, // 是否应用达产率
        taxRate: 13, // 进项税率
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
      otherExpenses: {
        type: 'percentage', // percentage, directAmount
        percentage: 3, // 营业收入的百分比
        directAmount: 0, // 直接金额
        taxRate: 6, // 进项税率
      }
    };
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
                  { 
                    value: 'total', 
                    label: `整个项目年收入 (${revenueItems.reduce((sum, item) => sum + (item.priceUnit === 'yuan' ? calculateTaxableIncome(item) / 10000 : calculateTaxableIncome(item)), 0).toFixed(2)}万元)` 
                  },
                  ...(revenueItems || []).map((item: any) => ({
                    value: item.id,
                    label: `${item.name} (年收入: ${(item.priceUnit === 'yuan' ? calculateTaxableIncome(item) / 10000 : calculateTaxableIncome(item)).toFixed(2)}万元)`
                  }))                ]}
                placeholder="请选择收入项目"
                value={currentRawMaterial.linkedRevenueId || 'total'}
                onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, linkedRevenueId: value || undefined})}
              />
              <NumberInput
                label="占收入的百分比 (%)"
                description="例如：输入1表示1%，输入0.01表示0.01%"
                value={currentRawMaterial.percentage}
                onChange={(value) => setCurrentRawMaterial({...currentRawMaterial, percentage: Number(value)})}
                min={0}
                max={100}
                decimalScale={2}
              />
              {currentRawMaterial.linkedRevenueId && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#E8F7FF',
                  borderRadius: '6px',
                  borderLeft: '3px solid #1E6FFF'
                }}>
                  <Text size="xs" c="#1E6FFF" fw={500}>
                    📄 计算说明：
                    {(() => {
                      const selectedRevenue = currentRawMaterial.linkedRevenueId === 'total' 
                        ? null 
                        : (revenueItems || []).find((item: any) => item.id === currentRawMaterial.linkedRevenueId)
                      
                      if (selectedRevenue) {
                        const revenueAmount = (selectedRevenue.priceUnit === 'yuan' ? calculateTaxableIncome(selectedRevenue) / 10000 : calculateTaxableIncome(selectedRevenue)).toFixed(2)
                        const materialAmount = (parseFloat(revenueAmount) * currentRawMaterial.percentage / 100).toFixed(2)
                        return `选择"${selectedRevenue.name}"作为基数（${revenueAmount}${selectedRevenue.priceUnit === 'yuan' ? '万元' : selectedRevenue.priceUnit}）× ${currentRawMaterial.percentage}% = ${materialAmount}${selectedRevenue.priceUnit === 'yuan' ? '万元' : selectedRevenue.priceUnit}`
                      }
                      const totalRevenue = revenueItems.reduce((sum, item) => sum + (item.priceUnit === 'yuan' ? calculateTaxableIncome(item) / 10000 : calculateTaxableIncome(item)), 0).toFixed(2)
                      const totalMaterialAmount = (parseFloat(totalRevenue) * currentRawMaterial.percentage / 100).toFixed(2)
                      return `选择整个项目年收入作为基数（${totalRevenue}万元）× ${currentRawMaterial.percentage}% = ${totalMaterialAmount}万元`
                    })()}
                  </Text>
                </div>
              )}
              {/* 显示计算后的金额 */}
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#F0F8FF',
                borderRadius: '6px',
                border: '1px solid #B0D4FF',
                marginTop: '8px'
              }}>
                <Text size="sm" c="#1E6FFF" fw={600}>
                  金额：
                  {(() => {
                    // 计算总收入
                    let totalRevenue = 0;
                    let unit = '万元';
                    if (currentRawMaterial.linkedRevenueId === 'total') {
                      // 整个项目收入
                      totalRevenue = revenueItems.reduce((sum, item) => sum + (item.priceUnit === 'yuan' ? calculateTaxableIncome(item) / 10000 : calculateTaxableIncome(item)), 0);
                    } else {
                      // 特定收入项
                      const selectedItem = (revenueItems || []).find((item: any) => item.id === currentRawMaterial.linkedRevenueId);
                      if (selectedItem) {
                        totalRevenue = selectedItem.priceUnit === 'yuan' ? calculateTaxableIncome(selectedItem) / 10000 : calculateTaxableIncome(selectedItem);
                        unit = selectedItem.priceUnit === 'yuan' ? '万元' : selectedItem.priceUnit;
                      }
                    }
                    
                    // 应用百分比和达产率
                    const amount = totalRevenue * currentRawMaterial.percentage / 100;
                    return `${amount.toFixed(2)}${unit}`;
                  })()}
                </Text>
              </div>
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
              onClick={async () => {
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
                  
                  // 保存到localStorage
                  localStorage.setItem('costConfig', JSON.stringify({
                    ...costConfig,
                    rawMaterials: {
                      ...costConfig.rawMaterials,
                      items: newItems
                    }
                  }));
                  
                  // 保存到后端
                  try {
                    const state = useRevenueCostStore.getState();
                    if (state.context?.projectId) {
                      // 获取当前的model_data
                      const currentModelData = {
                        revenueItems: state.revenueItems,
                        costItems: state.costItems,
                        productionRates: state.productionRates,
                        aiAnalysisResult: state.aiAnalysisResult,
                        costConfig: {
                          ...costConfig,
                          rawMaterials: {
                            ...costConfig.rawMaterials,
                            items: newItems
                          }
                        },
                        workflow_step: state.currentStep
                      };
                      
                      await revenueCostApi.save({
                        project_id: state.context.projectId,
                        model_data: currentModelData
                      });
                      console.log('✅ 原材料配置已保存到数据库');
                    }
                  } catch (error) {
                    console.error('❌ 保存到数据库失败:', error);
                    notifications.show({
                      title: '保存失败',
                      message: '数据未保存到数据库，请稍后重试',
                      color: 'red',
                    });
                  }                }
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
          <Tooltip label="添加原材料">
            <ActionIcon 
              variant="filled" 
              color="blue" 
              onClick={() => {
                const newItem = {
                  id: Date.now(),
                  name: `原材料${costConfig.rawMaterials.items.length + 1}`,
                  sourceType: 'percentage',
                  linkedRevenueId: 'total',
                  percentage: 0,
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
        </Group>      }
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
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                    {(() => {
                      // 计算所有原材料的总金额
                      let total = 0;
                      costConfig.rawMaterials.items.forEach(item => {
                        if (item.sourceType === 'percentage') {
                          // 根据收入百分比计算
                          if (item.sourceType === 'percentage') {
                            let revenueBase = 0;
                            if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
                              // 整个项目收入
                              revenueBase = revenueItems.reduce((sum, revItem) => sum + (revItem.priceUnit === 'yuan' ? calculateTaxableIncome(revItem) / 10000 : calculateTaxableIncome(revItem)), 0);
                            } else {
                              // 特定收入项
                              const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
                              if (revItem) {
                                revenueBase = revItem.priceUnit === 'yuan' ? calculateTaxableIncome(revItem) / 10000 : calculateTaxableIncome(revItem);
                              }
                            }
                            total += revenueBase * item.percentage / 100;
                          } else if (item.sourceType === 'quantityPrice') {
                            // 数量×单价
                            total += item.quantity * item.unitPrice;
                          } else if (item.sourceType === 'directAmount') {
                            // 直接金额
                            total += item.directAmount;
                          }
                        } else if (item.sourceType === 'quantityPrice') {
                          // 数量×单价
                          total += item.quantity * item.unitPrice;
                        } else if (item.sourceType === 'directAmount') {
                          // 直接金额
                          total += item.directAmount;
                        }
                      });
                      return total.toFixed(2);
                    })()}
                  </Table.Td>
                  {years.map((year, yearIndex) => {
                    const productionRate = costConfig.rawMaterials.applyProductionRate 
                      ? (useRevenueCostStore.getState().productionRates.find(p => p.yearIndex === year)?.rate || 1)
                      : 1;
                    
                    // 计算该年的金额
                    let yearTotal = 0;
                    costConfig.rawMaterials.items.forEach(item => {
                      if (item.sourceType === 'percentage') {
                        // 根据收入百分比计算
                        if (item.sourceType === 'percentage') {
                          let revenueBase = 0;
                          if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
                            // 整个项目收入
                            revenueBase = revenueItems.reduce((sum, revItem) => sum + (revItem.priceUnit === 'yuan' ? calculateTaxableIncome(revItem) / 10000 : calculateTaxableIncome(revItem)), 0);
                          } else {
                            // 特定收入项
                            const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
                            if (revItem) {
                              revenueBase = revItem.priceUnit === 'yuan' ? calculateTaxableIncome(revItem) / 10000 : calculateTaxableIncome(revItem);
                            }
                          }
                          yearTotal += revenueBase * item.percentage / 100 * productionRate;
                        } else if (item.sourceType === 'quantityPrice') {
                          // 数量×单价
                          yearTotal += item.quantity * item.unitPrice * productionRate;
                        } else if (item.sourceType === 'directAmount') {
                          // 直接金额
                          yearTotal += item.directAmount * productionRate;
                        }
                      } else if (item.sourceType === 'quantityPrice') {
                        // 数量×单价
                        yearTotal += item.quantity * item.unitPrice * productionRate;
                      } else if (item.sourceType === 'directAmount') {
                        // 直接金额
                        yearTotal += item.directAmount * productionRate;
                      }
                    });
                    
                    return (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {yearTotal.toFixed(2)}
                      </Table.Td>
                    );
                  })}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {/* 序号为1的行不允许编辑 */}
                  </Table.Td>
                </Table.Tr>
                
                {/* 1.1, 1.2, 1.3... 原材料项 */}
                {costConfig.rawMaterials.items.map((item, idx) => (
                  <Table.Tr key={item.id}>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.{idx + 1}</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>
                      {item.name}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 计算该原材料项目的总金额
                        let total = 0;
                        if (item.sourceType === 'percentage') {
                          // 根据收入百分比计算
                          let revenueBase = 0;
                          if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
                            // 整个项目收入
                            revenueBase = revenueItems.reduce((sum, revItem) => sum + (revItem.priceUnit === 'yuan' ? calculateTaxableIncome(revItem) / 10000 : calculateTaxableIncome(revItem)), 0);
                          } else {
                            // 特定收入项
                            const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
                            if (revItem) {
                              revenueBase = revItem.priceUnit === 'yuan' ? calculateTaxableIncome(revItem) / 10000 : calculateTaxableIncome(revItem);
                            }
                          }
                          total += revenueBase * item.percentage / 100;
                        } else if (item.sourceType === 'quantityPrice') {
                          // 数量×单价
                          total += item.quantity * item.unitPrice;
                        } else if (item.sourceType === 'directAmount') {
                          // 直接金额
                          total += item.directAmount;
                        }
                        return total.toFixed(2);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      const productionRate = costConfig.rawMaterials.applyProductionRate 
                        ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                        : 1;
                      
                      // 计算该年的金额
                      let yearTotal = 0;
                      if (item.sourceType === 'percentage') {
                        // 根据收入百分比计算
                        let revenueBase = 0;
                        if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
                            // 整个项目收入
                            revenueBase = revenueItems.reduce((sum, revItem) => sum + (revItem.priceUnit === 'yuan' ? calculateTaxableIncome(revItem) / 10000 : calculateTaxableIncome(revItem)), 0);
                          } else {
                          // 特定收入项
                          const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
                          if (revItem) {
                            revenueBase = revItem.priceUnit === 'yuan' ? calculateTaxableIncome(revItem) / 10000 : calculateTaxableIncome(revItem);
                          }
                        }
                        yearTotal += revenueBase * item.percentage / 100 * productionRate;
                      } else if (item.sourceType === 'quantityPrice') {
                        // 数量×单价
                        yearTotal += item.quantity * item.unitPrice * productionRate;
                      } else if (item.sourceType === 'directAmount') {
                        // 直接金额
                        yearTotal += item.directAmount * productionRate;
                      }
                      
                      return (
                        <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                          {yearTotal.toFixed(2)}
                        </Table.Td>
                      );
                    })}
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
                    <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                  ))}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                </Table.Tr>                
                {/* 3. 其他 */}
                <Table.Tr>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>3</Table.Td>
                  <Table.Td style={{ border: '1px solid #dee2e6' }}>其他</Table.Td>
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                    {(() => {
                      let total = 0;
                      if (costConfig.otherExpenses.type === 'percentage') {
                        // 根据总收入计算百分比
                        const totalRevenue = revenueItems.reduce((sum, revItem) => {
                          return sum + (revItem.priceUnit === 'yuan' ? calculateTaxableIncome(revItem) / 10000 : calculateTaxableIncome(revItem));
                        }, 0);
                        total += totalRevenue * costConfig.otherExpenses.percentage / 100;
                      } else if (costConfig.otherExpenses.type === 'directAmount') {
                        total += costConfig.otherExpenses.directAmount;
                      }
                      return total.toFixed(2);
                    })()}
                  </Table.Td>
                  {years.map((year) => {
                    let yearTotal = 0;
                    if (costConfig.otherExpenses.type === 'percentage') {
                      // 根据总收入计算百分比
                      const totalRevenue = revenueItems.reduce((sum, revItem) => {
                        return sum + (revItem.priceUnit === 'yuan' ? calculateTaxableIncome(revItem) / 10000 : calculateTaxableIncome(revItem));
                      }, 0);
                      yearTotal += totalRevenue * costConfig.otherExpenses.percentage / 100;
                    } else if (costConfig.otherExpenses.type === 'directAmount') {
                      yearTotal += costConfig.otherExpenses.directAmount;
                    }
                    
                    return (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {yearTotal.toFixed(2)}
                      </Table.Td>
                    );
                  })}
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
                    {/* 序号为4的行不允许编辑 */}
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
            <Group justify="flex-end" mt="md">
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
            </Group>
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

  // 渲染辅助材料费用配置弹窗
  const renderAuxiliaryMaterialsModal = () => (
    <Modal
      opened={showAuxiliaryMaterialsModal}
      onClose={() => setShowAuxiliaryMaterialsModal(false)}
      title="辅助材料费用配置"
      size="md"
    >
      <Stack gap="md">
        <Select
          label="费用类型"
          data={[
            { value: 'percentage', label: '按营业收入的百分比' },
            { value: 'directAmount', label: '直接填金额' },
          ]}
          value={costConfig.auxiliaryMaterials.type}
          onChange={(value) => setCostConfig({
            ...costConfig,
            auxiliaryMaterials: { ...costConfig.auxiliaryMaterials, type: value as any }
          })}
        />
        
        {costConfig.auxiliaryMaterials.type === 'percentage' && (
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
              value={costConfig.auxiliaryMaterials.percentage}
              onChange={(value) => setCostConfig({
                ...costConfig,
                auxiliaryMaterials: { ...costConfig.auxiliaryMaterials, percentage: Number(value) }
              })}
              min={0}
              max={100}
              decimalScale={2}
            />
          </>
        )}
        
        {costConfig.auxiliaryMaterials.type === 'directAmount' && (
          <NumberInput
            label="直接金额（万元）"
            value={costConfig.auxiliaryMaterials.directAmount}
            onChange={(value) => setCostConfig({
              ...costConfig,
              auxiliaryMaterials: { ...costConfig.auxiliaryMaterials, directAmount: Number(value) }
            })}
            min={0}
            decimalScale={2}
          />
        )}
        
        <NumberInput
          label="进项税率 (%)"
          value={costConfig.auxiliaryMaterials.taxRate}
          onChange={(value) => setCostConfig({
            ...costConfig,
            auxiliaryMaterials: { ...costConfig.auxiliaryMaterials, taxRate: Number(value) }
          })}
          min={0}
          max={100}
          decimalScale={2}
        />
        
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => setShowAuxiliaryMaterialsModal(false)}>
            取消
          </Button>
          <Button onClick={() => setShowAuxiliaryMaterialsModal(false)} style={{ backgroundColor: '#165DFF', color: '#FFFFFF' }}>
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
          value={costConfig.otherExpenses.type}
          onChange={(value) => setCostConfig({
            ...costConfig,
            otherExpenses: { ...costConfig.otherExpenses, type: value as any }
          })}
        />
        
        {costConfig.otherExpenses.type === 'percentage' && (
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
              value={costConfig.otherExpenses.percentage}
              onChange={(value) => setCostConfig({
                ...costConfig,
                otherExpenses: { ...costConfig.otherExpenses, percentage: Number(value) }
              })}
              min={0}
              max={100}
              decimalScale={2}
            />
          </>
        )}
        
        {costConfig.otherExpenses.type === 'directAmount' && (
          <NumberInput
            label="直接金额（万元）"
            value={costConfig.otherExpenses.directAmount}
            onChange={(value) => setCostConfig({
              ...costConfig,
              otherExpenses: { ...costConfig.otherExpenses, directAmount: Number(value) }
            })}
            min={0}
            decimalScale={2}
          />
        )}
        
        <NumberInput
          label="进项税率 (%)"
          value={costConfig.otherExpenses.taxRate}
          onChange={(value) => setCostConfig({
            ...costConfig,
            otherExpenses: { ...costConfig.otherExpenses, taxRate: Number(value) }
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
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        let total = 0;
                        costConfig.rawMaterials.items.forEach(item => {
                          if (item.sourceType === 'percentage') {
                            const revenueBase = revenueItems.reduce((sum, revItem) => {
                              const income = calculateTaxableIncome(revItem);
                              return sum + (revItem.priceUnit === 'yuan' ? income / 10000 : income);
                            }, 0);
                            total += revenueBase * (item.percentage || 0) / 100;
                          } else if (item.sourceType === 'quantityPrice') {
                            total += (item.quantity || 0) * (item.unitPrice || 0);
                          } else if (item.sourceType === 'directAmount') {
                            total += item.directAmount || 0;
                          }
                        });
                        return total.toFixed(2);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      const productionRate = costConfig.rawMaterials.applyProductionRate 
                        ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                        : 1;
                      
                      let yearTotal = 0;
                      costConfig.rawMaterials.items.forEach(item => {
                        if (item.sourceType === 'percentage') {
                          const revenueBase = revenueItems.reduce((sum, revItem) => {
                            const income = calculateTaxableIncome(revItem);
                            return sum + (revItem.priceUnit === 'yuan' ? income / 10000 : income);
                          }, 0);
                          yearTotal += revenueBase * (item.percentage || 0) / 100 * productionRate;
                        } else if (item.sourceType === 'quantityPrice') {
                          yearTotal += (item.quantity || 0) * (item.unitPrice || 0) * productionRate;
                        } else if (item.sourceType === 'directAmount') {
                          yearTotal += (item.directAmount || 0) * productionRate;
                        }
                      });
                      
                      return (
                        <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                          {yearTotal.toFixed(2)}
                        </Table.Td>
                      );
                    })}
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
                  
                  {/* 1.1.5 辅助材料费用 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.1.5</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>辅助材料费用</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        let total = 0;
                        if (costConfig.auxiliaryMaterials.type === 'percentage') {
                          const revenueBase = revenueItems.reduce((sum, revItem) => {
                            const income = calculateTaxableIncome(revItem);
                            return sum + (revItem.priceUnit === 'yuan' ? income / 10000 : income);
                          }, 0);
                          total += revenueBase * costConfig.auxiliaryMaterials.percentage / 100;
                        } else {
                          total += costConfig.auxiliaryMaterials.directAmount;
                        }
                        return total.toFixed(2);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      const productionRate = costConfig.auxiliaryMaterials.applyProductionRate 
                        ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                        : 1;
                      
                      let yearTotal = 0;
                      if (costConfig.auxiliaryMaterials.type === 'percentage') {
                        const revenueBase = revenueItems.reduce((sum, revItem) => {
                          const income = calculateTaxableIncome(revItem);
                          return sum + (revItem.priceUnit === 'yuan' ? income / 10000 : income);
                        }, 0);
                        yearTotal += revenueBase * costConfig.auxiliaryMaterials.percentage / 100 * productionRate;
                      } else {
                        yearTotal += costConfig.auxiliaryMaterials.directAmount * productionRate;
                      }
                      
                      return (
                        <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                          {yearTotal.toFixed(2)}
                        </Table.Td>
                      );
                    })}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <Group gap={4} justify="center">
                        <Tooltip label="编辑">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                            onClick={() => setShowAuxiliaryMaterialsModal(true)}
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
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        let total = 0;
                        if (costConfig.fuelPower.type === 'electricity') {
                          total += costConfig.fuelPower.quantity * costConfig.fuelPower.unitPrice;
                        } else {
                          total += costConfig.fuelPower.directAmount;
                        }
                        return total.toFixed(2);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      const productionRate = costConfig.fuelPower.applyProductionRate 
                        ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                        : 1;
                      
                      let yearTotal = 0;
                      if (costConfig.fuelPower.type === 'electricity') {
                        yearTotal += costConfig.fuelPower.quantity * costConfig.fuelPower.unitPrice * productionRate;
                      } else {
                        yearTotal += costConfig.fuelPower.directAmount * productionRate;
                      }
                      
                      return (
                        <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                          {yearTotal.toFixed(2)}
                        </Table.Td>
                      );
                    })}
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
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        let total = 0;
                        total += costConfig.wages.employees * costConfig.wages.salaryPerEmployee;
                        return total.toFixed(2);
                      })()}
                    </Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {(costConfig.wages.employees * costConfig.wages.salaryPerEmployee).toFixed(2)}
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
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        let total = 0;
                        if (costConfig.repair.type === 'percentage') {
                          total += (context?.totalInvestment || 0) * costConfig.repair.percentageOfFixedAssets / 100;
                        } else {
                          total += costConfig.repair.directAmount;
                        }
                        return total.toFixed(2);
                      })()}
                    </Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {(() => {
                          let yearTotal = 0;
                          if (costConfig.repair.type === 'percentage') {
                            yearTotal += (context?.totalInvestment || 0) * costConfig.repair.percentageOfFixedAssets / 100;
                          } else {
                            yearTotal += costConfig.repair.directAmount;
                          }
                          return yearTotal.toFixed(2);
                        })()}
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
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        let total = 0;
                        if (costConfig.otherExpenses.type === 'percentage') {
                          const revenueBase = revenueItems.reduce((sum, revItem) => {
                            const income = calculateTaxableIncome(revItem);
                            return sum + (revItem.priceUnit === 'yuan' ? income / 10000 : income);
                          }, 0);
                          total += revenueBase * costConfig.otherExpenses.percentage / 100;
                        } else {
                          total += costConfig.otherExpenses.directAmount;
                        }
                        return total.toFixed(2);
                      })()}
                    </Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {(() => {
                          let yearTotal = 0;
                          if (costConfig.otherExpenses.type === 'percentage') {
                            const revenueBase = revenueItems.reduce((sum, revItem) => {
                              const income = calculateTaxableIncome(revItem);
                              return sum + (revItem.priceUnit === 'yuan' ? income / 10000 : income);
                            }, 0);
                            yearTotal += revenueBase * costConfig.otherExpenses.percentage / 100;
                          } else {
                            yearTotal += costConfig.otherExpenses.directAmount;
                          }
                          return yearTotal.toFixed(2);
                        })()}
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
      
      {/* 辅助材料费用配置弹窗 */}
      {renderAuxiliaryMaterialsModal()}
      
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