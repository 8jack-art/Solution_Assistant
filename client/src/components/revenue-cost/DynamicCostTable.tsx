import React, { useState, useMemo, useCallback } from 'react'
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
  TextInput,
  Select,
  Checkbox,
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
  IconEdit,
  IconTrash,
  IconClearAll
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useRevenueCostStore, calculateTaxableIncome, calculateNonTaxIncome, type RevenueItem } from '@/stores/revenueCostStore'
import { revenueCostApi } from '@/lib/api'
import WagesModal from './WagesModal'

// 类型定义
interface WageItem {
  id: string
  name: string
  employees: number
  salaryPerEmployee: number // 万元/年
  welfareRate: number // 福利费率 %
}
interface CostItem {
  id: number;
  name: string;
  sourceType: 'percentage' | 'quantityPrice' | 'directAmount';
  linkedRevenueId?: string;
  percentage?: number;
  quantity?: number;
  unitPrice?: number;
  directAmount?: number;
  taxRate?: number;
}

interface FuelPowerItem {
  id: number;
  name: string;
  type: 'water' | 'electricity' | 'gasoline' | 'diesel' | 'naturalGas';
  quantity?: number;
  unitPrice?: number;
  taxRate?: number;
}

export interface CostConfig {
  rawMaterials: {
    applyProductionRate: boolean;
    items: CostItem[];
  };
  auxiliaryMaterials: {
    type: 'percentage' | 'directAmount';
    percentage?: number;
    directAmount?: number;
    applyProductionRate: boolean;
    taxRate?: number;
  };
  fuelPower: {
    applyProductionRate: boolean;
    items?: FuelPowerItem[];
  };
  wages: {
    employees: number;
    salaryPerEmployee: number;
    directAmount: number;
    taxRate?: number;
    items?: WageItem[];
  };
  repair: {
    type: 'percentage' | 'directAmount';
    percentageOfFixedAssets?: number;
    directAmount?: number;
    taxRate?: number;
    applyProductionRate?: boolean;
  };
  otherExpenses: {
    type: 'percentage' | 'directAmount';
    percentage?: number;
    directAmount?: number;
    taxRate?: number;
    applyProductionRate?: boolean;
  };
}

// 常量定义
const PERCENTAGE_MULTIPLIER = 100;
const FUEL_CONVERSION_FACTOR = 10000;
const DEFAULT_TAX_RATE = 13;

// 工具函数
const validateNumberInput = (value: unknown, min: number = 0, max: number = Infinity): number => {
  const num = Number(value);
  if (isNaN(num) || num < min || num > max) {
    return min; // 返回最小值作为默认值
  }
  return num;
};

const safeLocalStorageGet = (key: string): unknown | null => {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;
    return JSON.parse(value);
  } catch (error) {
    console.error(`Failed to parse localStorage item ${key}:`, error);
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: unknown): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to set localStorage item ${key}:`, error);
    return false;
  }
};

// 计算工具函数
const calculateBaseAmount = (
  item: CostItem, 
  revenueItems: any[]
): number => {
  switch (item.sourceType) {
    case 'percentage':
      let revenueBase = 0;
      if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
        // 使用calculateTaxableIncome来获得所有收入项的含税收入总和
        revenueBase = revenueItems.reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
      } else {
        const linkedRevenue = revenueItems.find(r => r.id === item.linkedRevenueId);
        if (linkedRevenue) {
          // 使用calculateTaxableIncome来获得特定收入项的含税收入
          revenueBase = calculateTaxableIncome(linkedRevenue);
        }
      }
      return revenueBase * (item.percentage || 0) / PERCENTAGE_MULTIPLIER;
    case 'quantityPrice':
      return (item.quantity || 0) * (item.unitPrice || 0);
    case 'directAmount':
      return item.directAmount || 0;
    default:
      return 0;
  }
};

const calculateWithTax = (
  baseAmount: number, 
  taxRate: number, 
  productionRate: number = 1
): { withTax: number; inputTax: number; excludingTax: number } => {
  // baseAmount 是不含税金额
  const validTaxRate = validateNumberInput(taxRate, 0, 100);
  const taxRateDecimal = validTaxRate / PERCENTAGE_MULTIPLIER;
  
  // 正确的计算公式：
  // 含税金额 = 不含税金额 × (1 + 税率)
  const withTax = baseAmount * productionRate * (1 + taxRateDecimal);
  // 进项税额 = 不含税金额 × 税率
  const inputTax = baseAmount * productionRate * taxRateDecimal;
  // 不含税金额 = 含税金额 - 进项税额
  const excludingTax = baseAmount * productionRate;
  
  return {
    withTax,
    inputTax,
    excludingTax
  };
};

const handleApiError = (error: unknown, operation: string) => {
  console.error(`${operation} failed:`, error);
  const message = error instanceof Error ? error.message : '未知错误';
  notifications.show({
    title: `${operation}失败`,
    message: `${message}，请稍后重试`,
    color: 'red',
  });
};

/**
 * 动态成本表格组件
 */
interface DynamicCostTableProps {
  repaymentTableData?: Array<{
    序号: string
    项目: string
    合计: number | null
    分年数据: number[]
  }>
  depreciationData?: Array<{
    序号: string
    资产类别: string
    原值: number
    年折旧摊销额: number
    分年数据: number[]
  }>
}

const DynamicCostTable: React.FC<DynamicCostTableProps> = ({ 
  repaymentTableData = [], 
  depreciationData = [] 
}) => {
  const { context, revenueItems, productionRates } = useRevenueCostStore()
  
  const [showCostDetailModal, setShowCostDetailModal] = useState(false)
  
  // 外购原材料费估算表弹窗状态
  const [showRawMaterialsModal, setShowRawMaterialsModal] = useState(false)

  // 辅助材料费用估算表弹窗状态
  const [showAuxiliaryMaterialsModal, setShowAuxiliaryMaterialsModal] = useState(false)
  // 外购燃料及动力费估算表弹窗状态
  const [showFuelPowerModal, setShowFuelPowerModal] = useState(false)
  // 修理费配置弹窗状态
  const [showRepairModal, setShowRepairModal] = useState(false)
  // 其他费用配置弹窗状态
  const [showOtherModal, setShowOtherModal] = useState(false)
  
  // 工资及福利费配置弹窗状态
  const [showWagesModal, setShowWagesModal] = useState(false)
  
  // 原材料编辑弹窗状态
  const [showRawMaterialEditModal, setShowRawMaterialEditModal] = useState(false)
  const [currentRawMaterial, setCurrentRawMaterial] = useState<any>(null)
  const [rawMaterialIndex, setRawMaterialIndex] = useState<number | null>(null)
  
  // 燃料及动力费编辑弹窗状态
  const [showFuelPowerEditModal, setShowFuelPowerEditModal] = useState(false)
  const [currentFuelPowerItem, setCurrentFuelPowerItem] = useState<any>(null)
  const [fuelPowerItemIndex, setFuelPowerItemIndex] = useState<number | null>(null)
  
  // 获取默认成本配置
  const getDefaultCostConfig = (): CostConfig => ({
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
      applyProductionRate: true, // 是否应用达产率
      items: [
        { id: 1, name: '水费', type: 'water', quantity: 0, unitPrice: 2.99, taxRate: 9 },
        { id: 2, name: '电费', type: 'electricity', quantity: 0, unitPrice: 0.65, taxRate: 13 },
        { id: 3, name: '汽油', type: 'gasoline', quantity: 1000, unitPrice: 9453, taxRate: 13 },
        { id: 4, name: '柴油', type: 'diesel', quantity: 1000, unitPrice: 7783, taxRate: 13 },
        { id: 5, name: '天然气', type: 'naturalGas', quantity: 0, unitPrice: 3.75, taxRate: 9 },
      ]
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
  });

  // 尝试从localStorage加载配置
  const loadConfigFromStorage = (): CostConfig => {
    const savedConfig = safeLocalStorageGet('costConfig');
    if (savedConfig && typeof savedConfig === 'object') {
      return { ...getDefaultCostConfig(), ...savedConfig };
    }
    return getDefaultCostConfig();
  };

  // 成本配置参数状态 - 从store加载或使用默认值
  const [costConfig, setCostConfig] = useState<CostConfig>(loadConfigFromStorage);

  // 计算外购原材料（除税）
  const calculateRawMaterialsExcludingTax = useMemo(() => {
    // 如果没有项目上下文，返回0
    if (!context) return 0;
    
    const operationYears = context.operationYears;
    const years = Array.from({ length: operationYears }, (_, i) => i + 1);
    
    // 合计列 = 运营期各年数值的总和
    let totalSum = 0;
    
    // 遍历运营期各年
    years.forEach((year) => {
      const productionRate = costConfig.rawMaterials.applyProductionRate 
        ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
        : 1;
      
      // 计算该年的外购原材料（含税）总额
      let yearTotalWithTax = 0;
      // 计算该年的进项税额总额
      let yearTotalInputTax = 0;
      
      costConfig.rawMaterials.items.forEach((item: CostItem) => {
        const baseAmount = calculateBaseAmount(item, revenueItems || []);
        
        // 根据用户反馈：外购原材料表中序号1、2、3、4的金额均为含税收入
        // baseAmount 现在是含税金额
        const taxRate = Number(item.taxRate) || 0;
        const taxRateDecimal = taxRate / 100;
        
        // 计算该年的含税金额（应用达产率）
        const yearWithTax = baseAmount * productionRate;
        yearTotalWithTax += yearWithTax;
        
        // 计算该年的进项税额（应用达产率）- 正确公式：含税金额 / (1 + 税率) × 税率
        const yearInputTax = baseAmount * productionRate * taxRateDecimal / (1 + taxRateDecimal);
        yearTotalInputTax += yearInputTax;
      });
      
      // 该年的外购原材料（除税） = 含税金额 - 进项税额
      const yearExcludingTax = yearTotalWithTax - yearTotalInputTax;
      
      // 累加到总合计
      totalSum += yearExcludingTax;
    });
    
    return totalSum;
  }, [context, costConfig.rawMaterials, productionRates, revenueItems]);

  // 计算总收入（用于多处复用）
  const totalRevenue = useMemo(() => {
    return (revenueItems || []).reduce((sum, item) => sum + calculateTaxableIncome(item), 0);
  }, [revenueItems]);

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
            required
            withAsterisk
            error={!currentRawMaterial.name.trim() ? "请输入原材料名称" : undefined}
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
                    label: `整个项目年收入 (${totalRevenue.toFixed(2)}万元)`
                  },
                  ...(revenueItems || []).map((item: RevenueItem) => ({
                    value: item.id,
                    label: `${item.name} (年收入: ${calculateTaxableIncome(item).toFixed(2)}万元)`
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
          
          {/* 计算说明和金额显示 - 移动到进项税后方 */}
          {currentRawMaterial.sourceType === 'percentage' && (
            <>
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
                        : (revenueItems || []).find((item: RevenueItem) => item.id === currentRawMaterial.linkedRevenueId)
                      
                      if (selectedRevenue) {
                        const revenueAmount = calculateTaxableIncome(selectedRevenue).toFixed(2)
                        const materialAmount = (parseFloat(revenueAmount) * currentRawMaterial.percentage / 100).toFixed(2)
                        return `选择"${selectedRevenue.name}"作为基数（${revenueAmount}万元）× ${currentRawMaterial.percentage}% = ${materialAmount}万元`
                      }
                      const totalRevenueValue = totalRevenue.toFixed(2)
                        const totalMaterialAmount = (totalRevenue * currentRawMaterial.percentage / 100).toFixed(2)
                        return `选择整个项目年收入作为基数（${totalRevenueValue}万元）× ${currentRawMaterial.percentage}% = ${totalMaterialAmount}万元`
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
                      totalRevenue = totalRevenue;
                    } else {
                      // 特定收入项
                      const selectedItem = (revenueItems || []).find((item: RevenueItem) => item.id === currentRawMaterial.linkedRevenueId);
                      if (selectedItem) {
                        totalRevenue = calculateTaxableIncome(selectedItem);
                        unit = '万元';
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
                    // 计算金额 = 数量 × 单价
                    const amount = currentRawMaterial.quantity * currentRawMaterial.unitPrice;
                    return `${amount.toFixed(2)}万元`;
                  })()}
                </Text>
              </div>
            </>
          )}
          
          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => setShowRawMaterialEditModal(false)}>
              取消
            </Button>
            <Button 
              onClick={async () => {
                // 表单验证
                if (!currentRawMaterial.name.trim()) {
                  notifications.show({
                    title: '验证失败',
                    message: '请输入原材料名称',
                    color: 'red',
                  });
                  return;
                }
                
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
                    }
                  } catch (error) {
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
                const newItem: CostItem = {
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
                      // 序号1合计列 = 运营期各年数值的总和
                      let totalSum = 0;
                      
                      // 遍历运营期各年
                      years.forEach((year) => {
                        const productionRate = costConfig.rawMaterials.applyProductionRate 
                          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                          : 1;
                        
                        // 计算该年的外购原材料总额
                        let yearTotal = 0;
                        costConfig.rawMaterials.items.forEach((item: CostItem) => {
                          if (item.sourceType === 'percentage') {
                            // 根据收入百分比计算
                            let revenueBase = 0;
                            if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
                              // 整个项目收入
                              revenueBase = (revenueItems || []).reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
                            } else {
                              // 特定收入项
                              const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
                              if (revItem) {
                                revenueBase = calculateTaxableIncome(revItem);
                              }
                            }
                            yearTotal += revenueBase * (item.percentage || 0) / 100 * productionRate;
                          } else if (item.sourceType === 'quantityPrice') {
                            // 数量×单价
                            yearTotal += (item.quantity || 0) * (item.unitPrice || 0) * productionRate;
                          } else if (item.sourceType === 'directAmount') {
                            // 直接金额
                            yearTotal += (item.directAmount || 0) * productionRate;
                          }
                        });
                        
                        // 累加到总合计
                        totalSum += yearTotal;
                      });
                      
                      return totalSum.toFixed(2);
                    })()}
                  </Table.Td>
                  {years.map((year) => {
                    const productionRate = costConfig.rawMaterials.applyProductionRate 
                      ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                      : 1;
                    
                    // 序号1 = 合计其下辖子项（1.1, 1.2, 1.3...）该年的值
                    let yearTotal = 0;
                    costConfig.rawMaterials.items.forEach((item: CostItem) => {
                      if (item.sourceType === 'percentage') {
                        // 根据收入百分比计算
                        let revenueBase = 0;
                        if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
                          // 整个项目收入
                          revenueBase = (revenueItems || []).reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
                        } else {
                          // 特定收入项
                          const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
                          if (revItem) {
                            revenueBase = calculateTaxableIncome(revItem);
                          }
                        }
                        yearTotal += revenueBase * (item.percentage || 0) / 100 * productionRate;
                      } else if (item.sourceType === 'quantityPrice') {
                        // 数量×单价
                        yearTotal += (item.quantity || 0) * (item.unitPrice || 0) * productionRate;
                      } else if (item.sourceType === 'directAmount') {
                        // 直接金额
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
                    {/* 序号为1的行不允许编辑 */}
                  </Table.Td>
                </Table.Tr>
                
                {/* 1.1, 1.2, 1.3... 原材料项 */}
                {costConfig.rawMaterials.items.map((item: CostItem, idx: number) => (
                  <Table.Tr key={item.id}>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.{idx + 1}</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>
                      {item.name}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 该原材料项目合计列 = 运营期各年数值的总和
                        let totalSum = 0;
                        
                        // 遍历运营期各年
                        years.forEach((year) => {
                          const productionRate = costConfig.rawMaterials.applyProductionRate 
                            ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                            : 1;
                          
                          // 计算该年的原材料项目金额
                          let yearAmount = 0;
                          if (item.sourceType === 'percentage') {
                            // 根据收入百分比计算
                            let revenueBase = 0;
                            if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
                              // 整个项目收入
                              revenueBase = (revenueItems || []).reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
                            } else {
                              // 特定收入项
                              const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
                              if (revItem) {
                                revenueBase = calculateTaxableIncome(revItem);
                              }
                            }
                            yearAmount = revenueBase * (item.percentage || 0) / 100 * productionRate;
                          } else if (item.sourceType === 'quantityPrice') {
                            // 数量×单价
                            yearAmount = (item.quantity || 0) * (item.unitPrice || 0) * productionRate;
                          } else if (item.sourceType === 'directAmount') {
                            // 直接金额
                            yearAmount = (item.directAmount || 0) * productionRate;
                          }
                          
                          // 累加到总合计
                          totalSum += yearAmount;
                        });
                        
                        return totalSum.toFixed(2);
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
                            revenueBase = (revenueItems || []).reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
                          } else {
                          // 特定收入项
                          const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
                          if (revItem) {
                            revenueBase = calculateTaxableIncome(revItem);
                          }
                        }
                        yearTotal += revenueBase * (item.percentage || 0) / 100 * productionRate;
                      } else if (item.sourceType === 'quantityPrice') {
                        // 数量×单价
                        yearTotal += (item.quantity || 0) * (item.unitPrice || 0) * productionRate;
                      } else if (item.sourceType === 'directAmount') {
                        // 直接金额
                        yearTotal += (item.directAmount || 0) * productionRate;
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
                              const newItems = costConfig.rawMaterials.items.filter((_: CostItem, i: number) => i !== idx);
                              setCostConfig({
                                ...costConfig,
                                rawMaterials: {
                                  ...costConfig.rawMaterials,
                                  items: newItems
                                }
                              });
                            }}
                          >
                            <IconTrash size={16} />
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
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                    {(() => {
                      // 辅助材料费用合计列 = 运营期各年数值的总和
                      let totalSum = 0;
                      
                      // 遍历运营期各年
                      years.forEach(() => {
                        // 当前辅助材料费用各年都是0.00
                        totalSum += 0.00;
                      });
                      
                      return totalSum.toFixed(2);
                    })()}
                  </Table.Td>
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
                      // 其他费用合计列 = 运营期各年数值的总和
                      let totalSum = 0;
                      
                      // 遍历运营期各年
                      years.forEach(() => {
                        // 当前其他费用各年都是0.00
                        totalSum += 0.00;
                      });
                      
                      return totalSum.toFixed(2);
                    })()}
                  </Table.Td>
                  {years.map((year) => (
                    <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>0.00</Table.Td>
                  ))}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {/* 序号3的行不允许编辑 */}
                  </Table.Td>
                </Table.Tr>
                
                {/* 4. 进项税额 */}
                <Table.Tr>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>4</Table.Td>
                  <Table.Td style={{ border: '1px solid #dee2e6' }}>进项税额</Table.Td>
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                    {(() => {
                      // 进项税额合计列 = 运营期各年数值的总和
                      let totalSum = 0;
                      
                      // 遍历运营期各年
                      years.forEach((year) => {
                        // 计算该年的进项税总额
                        let yearInputTax = 0;
                        costConfig.rawMaterials.items.forEach((item: CostItem) => {
                          const baseAmount = calculateBaseAmount(item, revenueItems || []);
                          // 应用达产率
                          const productionRate = costConfig.rawMaterials.applyProductionRate 
                            ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                            : 1;
                          // 正确的进项税计算公式：含税金额 / (1 + 税率) × 税率
                          const taxRate = Number(item.taxRate) || 0;
                          const taxRateDecimal = taxRate / 100;
                          yearInputTax += baseAmount * productionRate * taxRateDecimal / (1 + taxRateDecimal);
                        });
                        
                        // 累加到总合计
                        totalSum += yearInputTax;
                      });
                      
                      return totalSum.toFixed(2);
                    })()}
                  </Table.Td>
                  {years.map((year) => {
                    // 计算该年的进项税总额
                    let yearInputTax = 0;
                    costConfig.rawMaterials.items.forEach((item: CostItem) => {
                      const baseAmount = calculateBaseAmount(item, revenueItems || []);
                      // 应用达产率
                      const productionRate = costConfig.rawMaterials.applyProductionRate 
                        ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                        : 1;
                      // 正确的进项税计算公式：含税金额 / (1 + 税率) × 税率
                      const taxRate = Number(item.taxRate) || 0;
                      const taxRateDecimal = taxRate / 100;
                      yearInputTax += baseAmount * productionRate * taxRateDecimal / (1 + taxRateDecimal);
                    });
                    
                    return (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {yearInputTax.toFixed(2)}
                      </Table.Td>
                    );
                  })}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {/* 序号为3的行不允许编辑 */}
                  </Table.Td>
                </Table.Tr>
                
                {/* 5. 外购原材料（除税） */}
                <Table.Tr>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>5</Table.Td>
                  <Table.Td style={{ border: '1px solid #dee2e6' }}>外购原材料（除税）</Table.Td>
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
{calculateRawMaterialsExcludingTax.toFixed(2)}
                  </Table.Td>
                  {years.map((year) => {
                    // 计算该年的外购原材料（除税）
                    const productionRate = costConfig.rawMaterials.applyProductionRate 
                      ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                      : 1;
                    
                    // 外购原材料（含税）
                    let totalWithTax = 0;
                    costConfig.rawMaterials.items.forEach((item: CostItem) => {
                      const baseAmount = calculateBaseAmount(item, revenueItems || []);
                      const taxRate = Number(item.taxRate) || 0;
                      const taxRateDecimal = taxRate / 100;
                      // 根据用户反馈：baseAmount是含税金额
                      totalWithTax += baseAmount * productionRate;
                    });
                    
                    // 进项税额
                    let totalInputTax = 0;
                    costConfig.rawMaterials.items.forEach((item: CostItem) => {
                      const baseAmount = calculateBaseAmount(item, revenueItems || []);
                      const taxRate = Number(item.taxRate) || 0;
                      const taxRateDecimal = taxRate / 100;
                      // 正确的进项税额计算公式：含税金额 / (1 + 税率) × 税率
                      totalInputTax += baseAmount * productionRate * taxRateDecimal / (1 + taxRateDecimal);
                    });
                    
                    // 外购原材料（除税） = 外购原材料（含税） - 进项税额
                    const excludingTax = totalWithTax - totalInputTax;
                    
                    return (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {excludingTax.toFixed(2)}
                      </Table.Td>
                    );
                  })}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {/* 序号为5的行不允许编辑 */}
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

  // 根据费用项目名称获取数量标签
  const getQuantityLabel = (itemName: string) => {
    const labelMap: { [key: string]: string } = {
      '水费': '数量（万m³）',
      '电费': '数量（万kWh）',
      '汽油': '数量（吨）',
      '柴油': '数量（吨）',
      '天然气': '数量（万m³）'
    };
    
    return labelMap[itemName] || '数量';
  };

  // 燃料及动力费编辑保存处理函数
  const handleFuelPowerSave = async () => {
    if (fuelPowerItemIndex !== null) {
      const newItems = [...(costConfig.fuelPower.items || [])];
      newItems[fuelPowerItemIndex] = currentFuelPowerItem;
      setCostConfig({
        ...costConfig,
        fuelPower: {
          ...costConfig.fuelPower,
          items: newItems
        }
      });
      
      // 保存到localStorage
      localStorage.setItem('costConfig', JSON.stringify({
        ...costConfig,
        fuelPower: {
          ...costConfig.fuelPower,
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
              fuelPower: {
                ...costConfig.fuelPower,
                items: newItems
              }
            },
            workflow_step: state.currentStep
          };
          
          await revenueCostApi.save({
            project_id: state.context.projectId,
            model_data: currentModelData
          });
        }
      } catch (error) {
        notifications.show({
          title: '保存失败',
          message: '数据未保存到数据库，请稍后重试',
          color: 'red',
        });
      }
    }
    setShowFuelPowerEditModal(false);
  };

  // 计算外购燃料及动力（除税）的函数
  const calculateFuelPowerExcludingTax = useCallback((targetYear?: number, yearsArray?: number[]) => {
    if (targetYear !== undefined) {
      // 计算指定年份的外购燃料及动力（除税）
      const productionRate = costConfig.fuelPower.applyProductionRate 
        ? (productionRates?.find(p => p.yearIndex === targetYear)?.rate || 1)
        : 1;
      
      let yearFuelPowerTotal = 0;  // 燃料、动力费总额
      let yearInputTaxTotal = 0;   // 进项税额总额
      
      (costConfig.fuelPower.items || []).forEach((item: FuelPowerItem) => {
        let quantity = item.quantity || 0;
        let amount = 0;
        // 对汽油和柴油进行特殊处理：单价×数量/10000
        if (['汽油', '柴油'].includes(item.name)) {
          amount = (item.unitPrice || 0) * quantity / 10000 * productionRate;
        } else {
          amount = quantity * (item.unitPrice || 0) * productionRate;
        }
        yearFuelPowerTotal += amount;
        
        // 计算进项税额：含税金额 / (1 + 税率) × 税率
        const taxRate = (item.taxRate || 13) / 100;
        yearInputTaxTotal += amount * taxRate / (1 + taxRate);
      });
      
      // 外购燃料及动力（除税）= 燃料、动力费 - 进项税额
      return yearFuelPowerTotal - yearInputTaxTotal;
    } else {
      // 计算所有年份的外购燃料及动力（除税）合计
      if (!yearsArray) return 0;
      let totalSum = 0;
      yearsArray.forEach((year: number) => {
        totalSum += calculateFuelPowerExcludingTax(year, yearsArray);
      });
      return totalSum;
    }
  }, [costConfig.fuelPower, productionRates]);

  // 渲染燃料及动力费编辑弹窗
  const renderFuelPowerEditModal = () => (
    <Modal
      opened={showFuelPowerEditModal}
      onClose={() => setShowFuelPowerEditModal(false)}
      title="编辑燃料及动力费项目"
      size="md"
    >
      {currentFuelPowerItem && (
        <Stack gap="md">
          <TextInput
            label="费用项目名称"
            value={currentFuelPowerItem.name}
            disabled
            styles={{
              input: { backgroundColor: '#f8f9fa' }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleFuelPowerSave();
              }
            }}
          />
          
          <NumberInput
            label={getQuantityLabel(currentFuelPowerItem.name)}
            value={currentFuelPowerItem.quantity || 0}
            onChange={(value) => setCurrentFuelPowerItem({...currentFuelPowerItem, quantity: Number(value)})}
            min={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleFuelPowerSave();
              }
            }}
          />
          
          <NumberInput
            label="单价（元）"
            value={currentFuelPowerItem.unitPrice || 0}
            onChange={(value) => setCurrentFuelPowerItem({...currentFuelPowerItem, unitPrice: Number(value)})}
            min={0}
            decimalScale={4}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleFuelPowerSave();
              }
            }}
          />
          
          <NumberInput
            label="进项税率 (%)"
            value={currentFuelPowerItem.taxRate || 13}
            disabled
            styles={{
              input: { backgroundColor: '#f8f9fa' }
            }}
            min={0}
            max={100}
            decimalScale={2}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleFuelPowerSave();
              }
            }}
          />
          
          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => setShowFuelPowerEditModal(false)}>
              取消
            </Button>
            <Button 
              onClick={handleFuelPowerSave}
              style={{ backgroundColor: '#165DFF', color: '#FFFFFF' }}
            >
              保存
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );

  // 渲染外购燃料及动力费估算表
  const renderFuelPowerModal = () => (
    <Modal
      opened={showFuelPowerModal}
      onClose={() => setShowFuelPowerModal(false)}
      title={
        <Text size="md">
          📊 外购燃料和动力费估算表
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
                {/* 1. 燃料、动力费 */}
                <Table.Tr>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1</Table.Td>
                  <Table.Td style={{ border: '1px solid #dee2e6' }}>燃料、动力费</Table.Td>
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                    {(() => {
                      // 序号1合计列 = 运营期各年数值的总和
                      let totalSum = 0;
                      years.forEach((year) => {
                        const productionRate = costConfig.fuelPower.applyProductionRate 
                          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                          : 1;
                        
                        let yearTotal = 0;
                        (costConfig.fuelPower.items || []).forEach((item: FuelPowerItem) => {
                          let quantity = item.quantity || 0;
                          // 对汽油和柴油进行特殊处理：单价×数量/10000
                          if (['汽油', '柴油'].includes(item.name)) {
                            yearTotal += (item.unitPrice || 0) * quantity / 10000 * productionRate;
                          } else {
                            yearTotal += quantity * (item.unitPrice || 0) * productionRate;
                          }
                        });
                        
                        totalSum += yearTotal;
                      });
                      
                      return totalSum.toFixed(2);
                    })()}
                  </Table.Td>
                  {years.map((year) => {
                    const yearProductionRate = costConfig.fuelPower.applyProductionRate 
                          ? (productionRates?.find(p => p.yearIndex === year)?.rate || 1)
                          : 1;
                    
                    let yearTotal = 0;
                    (costConfig.fuelPower.items || []).forEach((item: FuelPowerItem) => {
                      let quantity = item.quantity || 0;
                      // 对汽油和柴油进行特殊处理：单价×数量/10000
                      if (['汽油', '柴油'].includes(item.name)) {
                        yearTotal += (item.unitPrice || 0) * quantity / 10000 * yearProductionRate;
                      } else {
                        yearTotal += quantity * (item.unitPrice || 0) * yearProductionRate;
                      }
                      // 汽油/柴油已处理，跳过本轮循环剩余逻辑
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
                
                {/* 1.1, 1.2, 1.3... 燃料及动力费项目 */}
                {(costConfig.fuelPower.items || []).map((item: FuelPowerItem, idx: number) => (
                  <Table.Tr key={item.id}>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.{idx + 1}</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>
                      {item.name}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 该燃料项目合计列 = 运营期各年数值的总和
                        let totalSum = 0;
                        
                        years.forEach((year) => {
                          const productionRate = costConfig.fuelPower.applyProductionRate 
                            ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                            : 1;
                          
                          // 对汽油和柴油进行特殊处理：单价×数量/10000
                          if (['汽油', '柴油'].includes(item.name)) {
                            totalSum += (item.unitPrice || 0) * (item.quantity || 0) / 10000 * productionRate;
                          } else {
                            totalSum += (item.quantity || 0) * (item.unitPrice || 0) * productionRate;
                          }
                        });
                        
                        return totalSum.toFixed(2);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      const productionRate = costConfig.fuelPower.applyProductionRate 
                          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                          : 1;
                      
                      // 对汽油和柴油进行特殊处理：单价×数量/10000
                      let yearTotal = 0;
                      if (['汽油', '柴油'].includes(item.name)) {
                        yearTotal = (item.unitPrice || 0) * (item.quantity || 0) / 10000 * productionRate;
                      } else {
                        yearTotal = (item.quantity || 0) * (item.unitPrice || 0) * productionRate;
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
                              setCurrentFuelPowerItem({...item});
                              setFuelPowerItemIndex(idx);
                              setShowFuelPowerEditModal(true);
                            }}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="清空数量">
                          <ActionIcon
                            variant="light"
                            color="orange"
                            size="sm"
                            onClick={() => {
                              const updatedItems = [...(costConfig.fuelPower.items || [])];
                              updatedItems[idx] = {...item, quantity: 0};
                              setCostConfig({
                                ...costConfig,
                                fuelPower: {
                                  ...costConfig.fuelPower,
                                  items: updatedItems
                                }
                              });
                            }}
                          >
                            <IconClearAll size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
                
                {/* 2. 进项税额 */}
                <Table.Tr>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>2</Table.Td>
                  <Table.Td style={{ border: '1px solid #dee2e6' }}>进项税额</Table.Td>
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                    {(() => {
                      // 进项税额合计列 = 运营期各年数值的总和
                      let totalSum = 0;
                      years.forEach((year) => {
                        const productionRate = costConfig.fuelPower.applyProductionRate 
                          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                          : 1;
                        
                        let yearInputTax = 0;
                        (costConfig.fuelPower.items || []).forEach((item: FuelPowerItem) => {
                          let quantity = item.quantity || 0;
                          let amount = 0;
                          // 对汽油和柴油进行特殊处理：单价×数量/10000
                          if (['汽油', '柴油'].includes(item.name)) {
                            amount = (item.unitPrice || 0) * quantity / 10000 * productionRate;
                          } else {
                            amount = quantity * (item.unitPrice || 0) * productionRate;
                          }
                          const taxRate = (item.taxRate || 13) / 100;
                          // 根据用户反馈：燃料动力费金额均为含税收入，使用正确公式：含税金额 / (1 + 税率) × 税率
                          yearInputTax += amount * taxRate / (1 + taxRate);
                        });
                        
                        totalSum += yearInputTax;
                      });
                      
                      return totalSum.toFixed(2);
                    })()}
                  </Table.Td>
                  {years.map((year) => {
                    const yearProductionRate = costConfig.fuelPower.applyProductionRate 
                          ? (productionRates?.find(p => p.yearIndex === year)?.rate || 1)
                          : 1;
                    
                    let yearInputTax = 0;
                    (costConfig.fuelPower.items || []).forEach((item: FuelPowerItem) => {
                      let quantity = item.quantity || 0;
                      let amount = 0;
                      // 对汽油和柴油进行特殊处理：单价×数量/10000
                      if (['汽油', '柴油'].includes(item.name)) {
                        amount = (item.unitPrice || 0) * quantity / 10000 * yearProductionRate;
                      } else {
                        amount = quantity * (item.unitPrice || 0) * yearProductionRate;
                      }
                      const taxRate = (item.taxRate || 13) / 100;
                      // 根据用户反馈：燃料动力费金额均为含税收入，使用正确公式：含税金额 / (1 + 税率) × 税率
                      yearInputTax += amount * taxRate / (1 + taxRate);
                    });
                    
                    return (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {yearInputTax.toFixed(2)}
                      </Table.Td>
                    );
                  })}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {/* 序号为2的行不允许编辑 */}
                  </Table.Td>
                </Table.Tr>
                
                
                
                {/* 3. 外购燃料及动力（除税） */}
                <Table.Tr>
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>3</Table.Td>
                  <Table.Td style={{ border: '1px solid #dee2e6' }}>外购燃料及动力（除税）</Table.Td>
                  <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                    {(() => {
                      // 外购燃料及动力（除税）合计列 = 运营期各年数值的总和
                      let totalSum = 0;
                      years.forEach((year) => {
                        const productionRate = costConfig.fuelPower.applyProductionRate 
                          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                          : 1;
                        
                        let yearFuelPowerTotal = 0;  // 燃料、动力费总额
                        let yearInputTaxTotal = 0;   // 进项税额总额
                        
                        (costConfig.fuelPower.items || []).forEach((item: FuelPowerItem) => {
                          let quantity = item.quantity || 0;
                          let amount = 0;
                          // 对汽油和柴油进行特殊处理：单价×数量/10000
                          if (['汽油', '柴油'].includes(item.name)) {
                            amount = (item.unitPrice || 0) * quantity / 10000 * productionRate;
                          } else {
                            amount = quantity * (item.unitPrice || 0) * productionRate;
                          }
                          yearFuelPowerTotal += amount;
                          
                          // 计算进项税额：含税金额 / (1 + 税率) × 税率
                          const taxRate = (item.taxRate || 13) / 100;
                          yearInputTaxTotal += amount * taxRate / (1 + taxRate);
                        });
                        
                        // 外购燃料及动力（除税）= 燃料、动力费 - 进项税额
                        totalSum += (yearFuelPowerTotal - yearInputTaxTotal);
                      });
                      
                      return totalSum.toFixed(2);
                    })()}
                  </Table.Td>
                  {years.map((year) => {
                    const productionRate = costConfig.fuelPower.applyProductionRate 
                          ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                          : 1;
                    
                    let yearFuelPowerTotal = 0;  // 燃料、动力费总额
                    let yearInputTaxTotal = 0;   // 进项税额总额
                    
                    (costConfig.fuelPower.items || []).forEach((item: FuelPowerItem) => {
                      let quantity = item.quantity || 0;
                      let amount = 0;
                      // 对汽油和柴油进行特殊处理：单价×数量/10000
                      if (['汽油', '柴油'].includes(item.name)) {
                        amount = (item.unitPrice || 0) * quantity / 10000 * productionRate;
                      } else {
                        amount = quantity * (item.unitPrice || 0) * productionRate;
                      }
                      yearFuelPowerTotal += amount;
                      
                      // 计算进项税额：含税金额 / (1 + 税率) × 税率
                      const taxRate = (item.taxRate || 13) / 100;
                      yearInputTaxTotal += amount * taxRate / (1 + taxRate);
                    });
                    
                    // 外购燃料及动力（除税）= 燃料、动力费 - 进项税额
                    const yearTotal = yearFuelPowerTotal - yearInputTaxTotal;
                    
                    return (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {yearTotal.toFixed(2)}
                      </Table.Td>
                    );
                  })}
                  <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                    {/* 序号为4的行不允许编辑 */}
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
            
            <Group justify="flex-end" mt="md">
              <Checkbox
                label="应用达产率"
                checked={costConfig.fuelPower.applyProductionRate}
                onChange={(event) => setCostConfig({
                  ...costConfig,
                  fuelPower: { 
                    ...costConfig.fuelPower, 
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
                  {costItemsData.map((item) => (
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
                      {(() => {
                        // 计算营业成本合计（所有运营期各年的总和）
                        let total = 0;
                        
                        years.forEach((year) => {
                          // 计算达产率
                          const productionRate = costConfig.rawMaterials.applyProductionRate || costConfig.fuelPower.applyProductionRate || costConfig.repair.applyProductionRate || costConfig.otherExpenses.applyProductionRate
                            ? (Number(productionRates.find(p => p.yearIndex === year)?.rate) || 1)
                            : 1;
                          
                          // 1.1 外购原材料费（使用除税金额）
                          let yearRawMaterialsWithTax = 0;
                          let yearRawMaterialsInputTax = 0;
                          costConfig.rawMaterials.items.forEach((item: CostItem) => {
                            const baseAmount = calculateBaseAmount(item, revenueItems || []);
                            // 确保税率是有效数字，避免NaN
                            const taxRate = Number(item.taxRate) || 0;
                            const taxRateDecimal = taxRate / PERCENTAGE_MULTIPLIER;
                            
                            // 正确的计算公式：
                            // 含税金额 = 不含税金额 × (1 + 税率)
                            yearRawMaterialsWithTax += baseAmount * productionRate * (1 + taxRateDecimal);
                            // 进项税额 = 不含税金额 × 税率
                            yearRawMaterialsInputTax += baseAmount * productionRate * taxRateDecimal;
                          });
                          total += yearRawMaterialsWithTax - yearRawMaterialsInputTax;
                          
                          // 1.2 外购燃料及动力费
                          let yearFuelPower = 0;
                          (costConfig.fuelPower.items || []).forEach((item: FuelPowerItem) => {
                            const quantity = Number(item.quantity) || 0;
                            const unitPrice = Number(item.unitPrice) || 0;
                            // 对汽油和柴油进行特殊处理：单价×数量/10000
                            if (['汽油', '柴油'].includes(item.name)) {
                              yearFuelPower += (unitPrice * quantity / 10000) * productionRate;
                            } else {
                              yearFuelPower += quantity * unitPrice * productionRate;
                            }
                          });
                          total += yearFuelPower;
                          
                          // 1.3 工资及福利费
                          let yearWages = 0;
                          yearWages += (costConfig.wages.employees || 0) * (costConfig.wages.salaryPerEmployee || 0);
                          total += yearWages; // 工资通常不受达产率影响
                          
                          // 1.4 修理费
                          let yearRepair = 0;
                          if (costConfig.repair.type === 'percentage') {
                            // 确保百分比是有效数字，避免NaN
                            const repairPercentage = Number(costConfig.repair.percentageOfFixedAssets) || 0;
                            yearRepair += (context?.totalInvestment || 0) * repairPercentage / 100;
                          } else {
                            yearRepair += costConfig.repair.directAmount || 0;
                          }
                          // 应用修理费的达产率
                          if (costConfig.repair.applyProductionRate) {
                            yearRepair *= productionRate;
                          }
                          total += yearRepair;
                          
                          // 1.5 其他费用
                          let yearOtherExpenses = 0;
                          if (costConfig.otherExpenses.type === 'percentage') {
                            const revenueBase = (revenueItems || []).reduce((sum, revItem) => {
                              const income = calculateTaxableIncome(revItem);

                              return sum + income;
                            }, 0);
                            // 确保百分比是有效数字，避免NaN
                            const otherPercentage = Number(costConfig.otherExpenses.percentage) || 0;
                            yearOtherExpenses += revenueBase * otherPercentage / 100 * productionRate;
                          } else {
                            yearOtherExpenses += (costConfig.otherExpenses.directAmount || 0) * productionRate;
                          }
                          total += yearOtherExpenses;
                        });
                        
                        // 调试：检查NaN值
                      if (isNaN(total)) {
                        console.log('营业成本 NaN detected:', { 
                          years,
                          total, 
                          revenueItems,
                          context
                        });
                      }
                      return total.toFixed(2);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      const productionRate = costConfig.rawMaterials.applyProductionRate 
                        ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                        : 1;
                                        
                      // 计算营业成本合计
                      let total = 0;
                                        
                      // 1.1 外购原材料费（使用除税金额）
                      // 计算该年的外购原材料（除税）
                      let yearTotalWithTax = 0;
                      costConfig.rawMaterials.items.forEach((item: CostItem) => {
                        if (item.sourceType === 'percentage') {
                          let revenueBase = 0;
                          if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
                            revenueBase = (revenueItems || []).reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
                          } else {
                            const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
                            if (revItem) {
                              revenueBase = calculateTaxableIncome(revItem);
                            }
                          }
                          yearTotalWithTax += revenueBase * (item.percentage || 0) / 100 * productionRate;
                        } else if (item.sourceType === 'quantityPrice') {
                          yearTotalWithTax += (item.quantity || 0) * (item.unitPrice || 0) * productionRate;
                        } else if (item.sourceType === 'directAmount') {
                          yearTotalWithTax += (item.directAmount || 0) * productionRate;
                        }
                      });
                      
                      // 计算该年的进项税额
                      let yearInputTax = 0;
                      costConfig.rawMaterials.items.forEach((item: CostItem) => {
                        const baseAmount = calculateBaseAmount(item, revenueItems || []);
                        // 根据用户反馈：外购原材料表中序号1、2、3、4的金额均为含税收入
                        // 正确的进项税计算：进项税 = 含税金额 / (1 + 税率) × 税率
                        const taxRate = Number(item.taxRate) || 0;
                        const taxRateDecimal = taxRate / PERCENTAGE_MULTIPLIER;
                        yearInputTax += baseAmount * productionRate * taxRateDecimal / (1 + taxRateDecimal);
                      });
                      
                      // 外购原材料（除税） = 外购原材料（含税） - 进项税额
                      total += yearTotalWithTax - yearInputTax;
                                        

                                        
                      // 1.2 外购燃料及动力费
                      let fuelPowerTotal = 0;
                      (costConfig.fuelPower.items || []).forEach((item: FuelPowerItem) => {
                        const quantity = Number(item.quantity) || 0;
                        const unitPrice = Number(item.unitPrice) || 0;
                        // 对汽油和柴油进行特殊处理：单价×数量/10000
                        if (['汽油', '柴油'].includes(item.name)) {
                          fuelPowerTotal += (unitPrice * quantity / 10000) * productionRate;
                        } else {
                          fuelPowerTotal += quantity * unitPrice * productionRate;
                        }
                      });
                      total += fuelPowerTotal;
                                        
                      // 1.3 工资及福利费
                      let wagesTotal = 0;
                      wagesTotal += (costConfig.wages.employees || 0) * (costConfig.wages.salaryPerEmployee || 0);
                      total += wagesTotal; // 工资通常不受达产率影响
                                        
                      // 1.4 修理费
                      let repairTotal = 0;
                      if (costConfig.repair.type === 'percentage') {
                        repairTotal += (context?.totalInvestment || 0) * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
                      } else {
                        repairTotal += costConfig.repair.directAmount || 0;
                      }
                      total += repairTotal; // 修理费通常不受达产率影响
                                        
                      // 1.5 其他费用
                      let otherExpensesTotal = 0;
                      if (costConfig.otherExpenses.type === 'percentage') {
                        const revenueBase = (revenueItems || []).reduce((sum, revItem) => {
                          const income = calculateTaxableIncome(revItem);
                          return sum + income;
                        }, 0);
                        otherExpensesTotal += revenueBase * (costConfig.otherExpenses.percentage || 0) / 100 * productionRate;
                      } else {
                        otherExpensesTotal += (costConfig.otherExpenses.directAmount || 0) * productionRate;
                      }
                      total += otherExpensesTotal;
                                        
                      return (
                        <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                          {total.toFixed(2)}
                        </Table.Td>
                      );
                    })}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>
                      {/* 序号1行无操作图标 */}
                    </Table.Td>
                  </Table.Tr>
                  
                  {/* 1.1 外购原材料费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.1</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>外购原材料费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 计算外购原材料费（除税）合计
                        let totalExcludingTax = 0;
                        const years = Array.from({ length: context?.operationYears || 0 }, (_, i) => i + 1);
                        years.forEach((year) => {
                          const productionRate = costConfig.rawMaterials.applyProductionRate
                            ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                            : 1;
                          // 计算该年含税总额
                          let yearWithTax = 0;
                          costConfig.rawMaterials.items.forEach((item: CostItem) => {
                            const base = calculateBaseAmount(item, revenueItems || []);
                            yearWithTax += base * productionRate;
                          });
                          // 计算该年进项税额
                          let yearInputTax = 0;
                          costConfig.rawMaterials.items.forEach((item: CostItem) => {
                            const base = calculateBaseAmount(item, revenueItems || []);
                            const taxRate = Number(item.taxRate) || 0;
                            const taxRateDecimal = taxRate / PERCENTAGE_MULTIPLIER;
                            // 正确的进项税计算公式：进项税 = 不含税金额 × 税率
                            yearInputTax += base * productionRate * taxRateDecimal;
                          });
                          totalExcludingTax += yearWithTax - yearInputTax;
                        });
                        return totalExcludingTax.toFixed(2);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      const productionRate = costConfig.rawMaterials.applyProductionRate 
                        ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                        : 1;
                      
                      // 计算该年的外购原材料（除税）
                      // 外购原材料（含税）
                      let totalWithTax = 0;
                      costConfig.rawMaterials.items.forEach((item: CostItem) => {
                        if (item.sourceType === 'percentage') {
                          let revenueBase = 0;
                          if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
                            revenueBase = (revenueItems || []).reduce((sum, revItem) => sum + calculateTaxableIncome(revItem), 0);
                          } else {
                            const revItem = revenueItems.find(r => r.id === item.linkedRevenueId);
                            if (revItem) {
                              revenueBase = calculateTaxableIncome(revItem);
                            }
                          }
                          totalWithTax += revenueBase * (item.percentage || 0) / 100 * productionRate;
                        } else if (item.sourceType === 'quantityPrice') {
                          totalWithTax += (item.quantity || 0) * (item.unitPrice || 0) * productionRate;
                        } else if (item.sourceType === 'directAmount') {
                          totalWithTax += (item.directAmount || 0) * productionRate;
                        }
                      });
                      
                      // 进项税额
                      let totalInputTax = 0;
                      costConfig.rawMaterials.items.forEach((item: CostItem) => {
                        const baseAmount = calculateBaseAmount(item, revenueItems || []);
                        const taxRate = Number(item.taxRate) || 0;
                        const taxRateDecimal = taxRate / PERCENTAGE_MULTIPLIER;
                        // 根据用户反馈：外购原材料表中序号1、2、3、4的金额均为含税收入
                        // 正确的进项税计算公式：进项税 = 含税金额 / (1 + 税率) × 税率
                        totalInputTax += baseAmount * productionRate * taxRateDecimal / (1 + taxRateDecimal);
                      });
                      
                      // 外购原材料（除税） = 外购原材料（含税） - 进项税额
                      const excludingTax = totalWithTax - totalInputTax;
                      
                      return (
                        <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                          {excludingTax.toFixed(2)}
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
                            <IconEdit size={16} />
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
                        // 外购燃料及动力费合计列引用外购燃料及动力（除税）的合计
                        return calculateFuelPowerExcludingTax(undefined, years).toFixed(2);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      // 外购燃料及动力费运营期列引用外购燃料及动力（除税）的对应年份数据
                      const yearTotal = calculateFuelPowerExcludingTax(year, years);
                      
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
                            <IconEdit size={16} />
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
                        // 工资及福利费合计 = 员工人数 × 人年工资 × 运营期年数（通常不受达产率影响）
                        const yearlyWages = (costConfig.wages.employees || 0) * (costConfig.wages.salaryPerEmployee || 0);
                        const totalWages = yearlyWages * years.length;
                        return totalWages.toFixed(2);
                      })()}
                    </Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {(() => {
                          // 工资及福利费 = 员工人数 × 人年工资（通常不受达产率影响）
                          const wages = (costConfig.wages.employees || 0) * (costConfig.wages.salaryPerEmployee || 0);
                          return wages.toFixed(2);
                        })()}
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  
                  {/* 1.4 修理费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>1.4</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>修理费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 修理费合计列 = 运营期各年数值的总和
                        let total = 0;
                        years.forEach((year) => {
                          const productionRate = costConfig.repair.applyProductionRate 
                            ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                            : 1;
                          
                          let yearTotal = 0;
                          if (costConfig.repair.type === 'percentage') {
                            yearTotal += (context?.totalInvestment || 0) * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
                          } else {
                            yearTotal += costConfig.repair.directAmount || 0;
                          }
                          // 应用修理费的达产率
                          if (costConfig.repair.applyProductionRate) {
                            yearTotal *= productionRate;
                          }
                          total += yearTotal;
                        });
                        return total.toFixed(2);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      const productionRate = costConfig.repair.applyProductionRate 
                        ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                        : 1;
                      
                      let yearTotal = 0;
                      if (costConfig.repair.type === 'percentage') {
                        yearTotal += (context?.totalInvestment || 0) * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
                      } else {
                        yearTotal += costConfig.repair.directAmount || 0;
                      }
                      // 应用修理费的达产率
                      if (costConfig.repair.applyProductionRate) {
                        yearTotal *= productionRate;
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
                            onClick={() => setShowRepairModal(true)}
                          >
                            <IconEdit size={16} />
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
                        // 其他费用合计列 = 运营期各年数值的总和
                        let total = 0;
                        years.forEach((year) => {
                          const productionRate = costConfig.otherExpenses.applyProductionRate 
                            ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                            : 1;
                          
                          let yearTotal = 0;
                          if (costConfig.otherExpenses.type === 'percentage') {
                            const revenueBase = (revenueItems || []).reduce((sum, revItem) => {
                              const income = calculateTaxableIncome(revItem);
                              return sum + income;
                            }, 0);
                            yearTotal += revenueBase * (costConfig.otherExpenses.percentage || 0) / 100 * productionRate;
                          } else {
                            yearTotal += (costConfig.otherExpenses.directAmount || 0) * productionRate;
                          }
                          total += yearTotal;
                        });
                        return total.toFixed(2);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      const productionRate = costConfig.otherExpenses.applyProductionRate 
                        ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                        : 1;
                      
                      let yearTotal = 0;
                      if (costConfig.otherExpenses.type === 'percentage') {
                        const revenueBase = (revenueItems || []).reduce((sum, revItem) => {
                          const income = calculateTaxableIncome(revItem);
                          return sum + income;
                        }, 0);
                        yearTotal += revenueBase * (costConfig.otherExpenses.percentage || 0) / 100 * productionRate;
                      } else {
                        yearTotal += (costConfig.otherExpenses.directAmount || 0) * productionRate;
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
                            onClick={() => setShowOtherModal(true)}
                          >
                            <IconEdit size={16} />
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
                  
                  {/* 3. 利息支出 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>3</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>利息支出</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 利息支出 = 利息支出（引用还本付息计划表序号2.2的付息行）
                        let totalInterest = 0;
                        years.forEach((year) => {
                          // 获取还本付息计划表中序号2.2（付息）行的数据
                          const interestRow = repaymentTableData.find(row => row.序号 === '2.2');
                          if (interestRow && interestRow.分年数据 && interestRow.分年数据[year - 1] !== undefined) {
                            totalInterest += interestRow.分年数据[year - 1];
                          }
                        });
                        return totalInterest.toFixed(2);
                      })()}
                    </Table.Td>
                    {years.map((year) => (
                      <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                        {(() => {
                          // 利息支出 = 利息支出（引用还本付息计划表序号2.2的付息行）
                          let yearInterest = 0;
                          
                          // 获取还本付息计划表中序号2.2（付息）行的数据
                          const interestRow = repaymentTableData.find(row => row.序号 === '2.2');
                          if (interestRow && interestRow.分年数据 && interestRow.分年数据[year - 1] !== undefined) {
                            yearInterest = interestRow.分年数据[year - 1];
                          }
                          
                          return yearInterest.toFixed(2);
                        })()}
                      </Table.Td>
                    ))}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  

                  
                  {/* 4. 折旧费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>4</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>折旧费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 折旧费合计列 = 运营期各年折旧费的总和
                        let totalDepreciation = 0;
                        years.forEach((year) => {
                          const yearIndex = year - 1; // 转换为0-based索引
                          // 引用折旧与摊销估算表中序号A和D的当年值之和
                          const rowA = depreciationData.find(row => row.序号 === 'A');
                          const rowD = depreciationData.find(row => row.序号 === 'D');
                          const yearDepreciation = (rowA?.分年数据[yearIndex] || 0) + (rowD?.分年数据[yearIndex] || 0);
                          totalDepreciation += yearDepreciation;
                        });
                        return totalDepreciation.toFixed(2);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      const yearIndex = year - 1; // 转换为0-based索引
                      return (
                        <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                          {(() => {
                            // 引用折旧与摊销估算表中序号A和D的当年值之和
                            const rowA = depreciationData.find(row => row.序号 === 'A');
                            const rowD = depreciationData.find(row => row.序号 === 'D');
                            const yearDepreciation = (rowA?.分年数据[yearIndex] || 0) + (rowD?.分年数据[yearIndex] || 0);
                            return yearDepreciation.toFixed(2);
                          })()}
                        </Table.Td>
                      );
                    })}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                  
                  {/* 5. 摊销费 */}
                  <Table.Tr>
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}>5</Table.Td>
                    <Table.Td style={{ border: '1px solid #dee2e6' }}>摊销费</Table.Td>
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 摊销费合计列 = 运营期各年摊销费的总和
                        let totalAmortization = 0;
                        years.forEach((year) => {
                          const yearIndex = year - 1; // 转换为0-based索引
                          // 引用折旧与摊销估算表中序号E的当年值
                          const rowE = depreciationData.find(row => row.序号 === 'E');
                          const yearAmortization = rowE?.分年数据[yearIndex] || 0;
                          totalAmortization += yearAmortization;
                        });
                        return totalAmortization.toFixed(2);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      const yearIndex = year - 1; // 转换为0-based索引
                      return (
                        <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                          {(() => {
                            // 引用折旧与摊销估算表中序号E的当年值
                            const rowE = depreciationData.find(row => row.序号 === 'E');
                            return (rowE?.分年数据[yearIndex] || 0).toFixed(2);
                          })()}
                        </Table.Td>
                      );
                    })}
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
                    <Table.Td style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {(() => {
                        // 总成本费用合计列 = 自然数列1到6行的合计列数值的总和
                        let total = 0;
                        
                        // 行1: 营业成本合计列
                        let row1Total = 0;
                        years.forEach((year) => {
                          const productionRate = costConfig.rawMaterials.applyProductionRate || costConfig.fuelPower.applyProductionRate || costConfig.repair.applyProductionRate || costConfig.otherExpenses.applyProductionRate
                            ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                            : 1;
                          
                          // 1.1 外购原材料费（使用除税金额）
                          let yearRawMaterialsWithTax = 0;
                          let yearRawMaterialsInputTax = 0;
                          costConfig.rawMaterials.items.forEach((item: CostItem) => {
                            const baseAmount = calculateBaseAmount(item, revenueItems || []);
                            const taxRate = Number(item.taxRate) || 0;
                            const taxRateDecimal = taxRate / PERCENTAGE_MULTIPLIER;
                            // 正确的计算公式：
                            // 含税金额 = 不含税金额 × (1 + 税率)
                            yearRawMaterialsWithTax += baseAmount * productionRate * (1 + taxRateDecimal);
                            // 进项税额 = 不含税金额 × 税率
                            yearRawMaterialsInputTax += baseAmount * productionRate * taxRateDecimal;
                          });
                          row1Total += yearRawMaterialsWithTax - yearRawMaterialsInputTax;
                          
                          // 1.2 外购燃料及动力费（使用除税金额）
          const yearFuelPower = calculateFuelPowerExcludingTax(year, years);
          row1Total += yearFuelPower;
                          
                          // 1.3 工资及福利费
                          let yearWages = 0;
                          yearWages += (costConfig.wages.employees || 0) * (costConfig.wages.salaryPerEmployee || 0);
                          row1Total += yearWages; // 工资通常不受达产率影响
                          
                          // 1.4 修理费
                          let yearRepair = 0;
                          if (costConfig.repair.type === 'percentage') {
                            yearRepair += (context?.totalInvestment || 0) * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
                          } else {
                            yearRepair += costConfig.repair.directAmount || 0;
                          }
                          // 应用修理费的达产率
                          if (costConfig.repair.applyProductionRate) {
                            yearRepair *= productionRate;
                          }
                          row1Total += yearRepair;
                          
                          // 1.5 其他费用
                          let yearOtherExpenses = 0;
                          if (costConfig.otherExpenses.type === 'percentage') {
                            const revenueBase = (revenueItems || []).reduce((sum, revItem) => {
                              const income = calculateTaxableIncome(revItem);
                              return sum + income;
                            }, 0);
                            yearOtherExpenses += revenueBase * (costConfig.otherExpenses.percentage || 0) / 100 * productionRate;
                          } else {
                            yearOtherExpenses += (costConfig.otherExpenses.directAmount || 0) * productionRate;
                          }
                          // 应用其他费用的达产率
                          if (costConfig.otherExpenses.applyProductionRate) {
                            yearOtherExpenses *= productionRate;
                          }
                          row1Total += yearOtherExpenses;
                        });
                        total += row1Total;
                        
                        // 行2: 管理费用合计列（暂时为0）
                        // 暂时为0，待后续实现
                        
                        // 行3: 利息支出合计列
                        let row3Total = 0;
                        years.forEach((year) => {
                          const interestRow = repaymentTableData.find(row => row.序号 === '2.2');
                          if (interestRow && interestRow.分年数据 && interestRow.分年数据[year - 1] !== undefined) {
                            row3Total += interestRow.分年数据[year - 1];
                          }
                        });
                        total += row3Total;
                        
                        // 行4: 折旧费合计列
                        let row4Total = 0;
                        years.forEach((year) => {
                          const yearIndex = year - 1;
                          const rowA = depreciationData.find(row => row.序号 === 'A');
                          const rowD = depreciationData.find(row => row.序号 === 'D');
                          const yearDepreciation = (rowA?.分年数据[yearIndex] || 0) + (rowD?.分年数据[yearIndex] || 0);
                          row4Total += yearDepreciation;
                        });
                        total += row4Total;
                        
                        // 行5: 摊销费合计列
                        let row5Total = 0;
                        years.forEach((year) => {
                          const yearIndex = year - 1;
                          const rowE = depreciationData.find(row => row.序号 === 'E');
                          const yearAmortization = rowE?.分年数据[yearIndex] || 0;
                          row5Total += yearAmortization;
                        });
                        total += row5Total;
                        
                        // 行6: 开发成本合计列（暂时为0）
                        // 暂时为0，待后续实现
                        
                        return total.toFixed(2);
                      })()}
                    </Table.Td>
                    {years.map((year) => {
                      const yearIndex = year - 1; // 转换为0-based索引
                      return (
                        <Table.Td key={year} style={{ textAlign: 'right', border: '1px solid #dee2e6' }}>
                          {(() => {
                            // 计算总成本费用合计（当年）
                            let yearTotal = 0;
                            
                            // 计算达产率
                            const productionRate = costConfig.rawMaterials.applyProductionRate || costConfig.fuelPower.applyProductionRate || costConfig.repair.applyProductionRate || costConfig.otherExpenses.applyProductionRate
                              ? (productionRates.find(p => p.yearIndex === year)?.rate || 1)
                              : 1;
                            
                            // 行1: 营业成本
                            // 1.1 外购原材料费（使用除税金额）
                            let yearRawMaterialsWithTax = 0;
                            let yearRawMaterialsInputTax = 0;
                            costConfig.rawMaterials.items.forEach((item: CostItem) => {
                              const baseAmount = calculateBaseAmount(item, revenueItems || []);
                              const taxRate = Number(item.taxRate) || 0;
                              const taxRateDecimal = taxRate / PERCENTAGE_MULTIPLIER;
                              // 正确的计算公式：
                              // 含税金额 = 不含税金额 × (1 + 税率)
                              yearRawMaterialsWithTax += baseAmount * productionRate * (1 + taxRateDecimal);
                              // 进项税额 = 不含税金额 × 税率
                              yearRawMaterialsInputTax += baseAmount * productionRate * taxRateDecimal;
                            });
                            yearTotal += yearRawMaterialsWithTax - yearRawMaterialsInputTax;
                            
                            // 1.1.5 辅助材料费用
                            let yearAuxiliaryMaterials = 0;
                            if (costConfig.auxiliaryMaterials.type === 'percentage') {
                              const revenueBase = (revenueItems || []).reduce((sum, revItem) => {
                                const income = calculateTaxableIncome(revItem);
                                return sum + income;
                              }, 0);
                              yearAuxiliaryMaterials += revenueBase * (costConfig.auxiliaryMaterials.percentage || 0) / 100 * productionRate;
                            } else {
                              yearAuxiliaryMaterials += (costConfig.auxiliaryMaterials.directAmount || 0) * productionRate;
                            }
                            yearTotal += yearAuxiliaryMaterials;
                            
                            // 1.2 外购燃料及动力费
                            let yearFuelPower = 0;
                            (costConfig.fuelPower.items || []).forEach((item: FuelPowerItem) => {
                              const quantity = Number(item.quantity) || 0;
                              const unitPrice = Number(item.unitPrice) || 0;
                              // 对汽油和柴油进行特殊处理：单价×数量/10000
                              if (['汽油', '柴油'].includes(item.name)) {
                                yearFuelPower += (unitPrice * quantity / 10000) * productionRate;
                              } else {
                                yearFuelPower += quantity * unitPrice * productionRate;
                              }
                            });
                            yearTotal += yearFuelPower;
                            
                            // 1.3 工资及福利费
                            const yearWages = (costConfig.wages.employees || 0) * (costConfig.wages.salaryPerEmployee || 0);
                            yearTotal += yearWages; // 工资通常不受达产率影响
                            
                            // 1.4 修理费
                            let yearRepair = 0;
                            if (costConfig.repair.type === 'percentage') {
                              yearRepair += (context?.totalInvestment || 0) * (costConfig.repair.percentageOfFixedAssets || 0) / 100;
                            } else {
                              yearRepair += costConfig.repair.directAmount || 0;
                            }
                            // 应用修理费的达产率
                            if (costConfig.repair.applyProductionRate) {
                              yearRepair *= productionRate;
                            }
                            yearTotal += yearRepair;
                            
                            // 1.5 其他费用
                            let yearOtherExpenses = 0;
                            if (costConfig.otherExpenses.type === 'percentage') {
                              const revenueBase = (revenueItems || []).reduce((sum, revItem) => {
                                const income = calculateTaxableIncome(revItem);
                                return sum + income;
                              }, 0);
                              yearOtherExpenses += revenueBase * (costConfig.otherExpenses.percentage || 0) / 100;
                            } else {
                              yearOtherExpenses += costConfig.otherExpenses.directAmount || 0;
                            }
                            // 应用其他费用的达产率
                            if (costConfig.otherExpenses.applyProductionRate) {
                              yearOtherExpenses *= productionRate;
                            }
                            yearTotal += yearOtherExpenses;
                            
                            // 行2: 管理费用
                            // 暂时为0，待后续实现
                            
                            // 行3: 利息支出
                            let yearFinancialCost = 0;
                            // 获取还本付息计划表中序号2.2（付息）行的数据
                            const interestRow = repaymentTableData.find(row => row.序号 === '2.2');
                            if (interestRow && interestRow.分年数据 && interestRow.分年数据[year - 1] !== undefined) {
                              yearFinancialCost = interestRow.分年数据[year - 1];
                            }
                            yearTotal += yearFinancialCost;
                            
                            // 行4: 折旧费
                            const rowA = depreciationData.find(row => row.序号 === 'A');
                            const rowD = depreciationData.find(row => row.序号 === 'D');
                            yearTotal += (rowA?.分年数据[yearIndex] || 0) + (rowD?.分年数据[yearIndex] || 0);
                            
                            // 行5: 摊销费
                            const rowE = depreciationData.find(row => row.序号 === 'E');
                            yearTotal += (rowE?.分年数据[yearIndex] || 0);
                            
                            // 行6: 开发成本
                            // 暂时为0，待后续实现
                            
                            return yearTotal.toFixed(2);
                          })()}
                        </Table.Td>
                      );
                    })}
                    <Table.Td style={{ textAlign: 'center', border: '1px solid #dee2e6' }}></Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
              
              {/* 添加说明文本 */}
              <Text size="sm" c="#666" mt="md">
                💡 进项税额根据各原材料独立税率分别计算后合计，不采用统一税率
              </Text>
            </>
          )
        })()}
      </Modal>
      
      {/* 外购原材料费估算表弹窗 */}
      {renderRawMaterialsModal()}
      
      {/* 外购燃料及动力费估算表弹窗 */}
      {renderFuelPowerModal()}
      
      {/* 辅助材料费用配置弹窗 */}
      {renderAuxiliaryMaterialsModal()}
      
      {/* 原材料编辑弹窗 */}
      {renderRawMaterialEditModal()}
      
      {/* 燃料及动力费编辑弹窗 */}
      {renderFuelPowerEditModal()}
      
      {/* 修理费配置弹窗 */}
      {renderRepairModal()}
      
      {/* 其他费用配置弹窗 */}
      {renderOtherModal()}
      
      {/* 工资及福利费配置弹窗 */}
      <WagesModal 
        opened={showWagesModal}
        onClose={() => setShowWagesModal(false)}
        costConfig={costConfig}
        setCostConfig={setCostConfig}
      />
    </>
  )
}

export default DynamicCostTable
