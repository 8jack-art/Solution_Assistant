import { 
  RevenueItem, 
  CostItem, 
  ProductionRateConfig, 
  ValidationError,
  calculateTaxableIncome,
  calculateNonTaxIncome
} from '../stores/revenueCostStore'

/**
 * 数据交叉校验服务
 * 功能：
 * 1. 验证收入项数据完整性
 * 2. 验证成本项数据完整性
 * 3. 验证达产率数据
 * 4. 交叉校验数据一致性
 */
export class ValidationService {
  /**
   * 验证收入项
   */
  static validateRevenueItems(items: RevenueItem[]): ValidationError[] {
    const errors: ValidationError[] = []

    if (!items || items.length === 0) {
      errors.push({
        code: 'EMPTY',
        message: '至少需要添加一个收入项'
      })
      return errors
    }

    items.forEach((item, index) => {
      // 验证名称
      if (!item.name || item.name.trim() === '') {
        errors.push({
          code: 'MISSING_FIELD',
          field: 'name',
          rowId: item.id,
          message: `收入项 ${index + 1} 名称不能为空`
        })
      }

      // 验证增值税率
      if (item.vatRate < 0 || item.vatRate > 1) {
        errors.push({
          code: 'INVALID_VAT',
          field: 'vatRate',
          rowId: item.id,
          message: `收入项 ${index + 1} "${item.name}" 增值税率必须在0-100%之间`
        })
      }

      // 根据字段模板验证必填字段
      switch (item.fieldTemplate) {
        case 'quantity-price':
          if (!item.quantity || item.quantity <= 0) {
            errors.push({
              code: 'MISSING_FIELD',
              field: 'quantity',
              rowId: item.id,
              message: `收入项 ${index + 1} "${item.name}" 数量必须大于0`
            })
          }
          if (!item.unitPrice || item.unitPrice <= 0) {
            errors.push({
              code: 'MISSING_FIELD',
              field: 'unitPrice',
              rowId: item.id,
              message: `收入项 ${index + 1} "${item.name}" 单价必须大于0`
            })
          }
          break

        case 'area-yield-price':
          if (!item.area || item.area <= 0) {
            errors.push({
              code: 'MISSING_FIELD',
              field: 'area',
              rowId: item.id,
              message: `收入项 ${index + 1} "${item.name}" 面积必须大于0`
            })
          }
          if (!item.yieldPerArea || item.yieldPerArea <= 0) {
            errors.push({
              code: 'MISSING_FIELD',
              field: 'yieldPerArea',
              rowId: item.id,
              message: `收入项 ${index + 1} "${item.name}" 亩产量必须大于0`
            })
          }
          if (!item.unitPrice || item.unitPrice <= 0) {
            errors.push({
              code: 'MISSING_FIELD',
              field: 'unitPrice',
              rowId: item.id,
              message: `收入项 ${index + 1} "${item.name}" 单价必须大于0`
            })
          }
          break

        case 'capacity-utilization':
          if (!item.capacity || item.capacity <= 0) {
            errors.push({
              code: 'MISSING_FIELD',
              field: 'capacity',
              rowId: item.id,
              message: `收入项 ${index + 1} "${item.name}" 产能必须大于0`
            })
          }
          if (item.utilizationRate === undefined || item.utilizationRate < 0 || item.utilizationRate > 1) {
            errors.push({
              code: 'MISSING_FIELD',
              field: 'utilizationRate',
              rowId: item.id,
              message: `收入项 ${index + 1} "${item.name}" 利用率必须在0-100%之间`
            })
          }
          if (!item.unitPrice || item.unitPrice <= 0) {
            errors.push({
              code: 'MISSING_FIELD',
              field: 'unitPrice',
              rowId: item.id,
              message: `收入项 ${index + 1} "${item.name}" 单价必须大于0`
            })
          }
          break

        case 'subscription':
          if (!item.subscriptions || item.subscriptions <= 0) {
            errors.push({
              code: 'MISSING_FIELD',
              field: 'subscriptions',
              rowId: item.id,
              message: `收入项 ${index + 1} "${item.name}" 订阅数必须大于0`
            })
          }
          if (!item.unitPrice || item.unitPrice <= 0) {
            errors.push({
              code: 'MISSING_FIELD',
              field: 'unitPrice',
              rowId: item.id,
              message: `收入项 ${index + 1} "${item.name}" 单价必须大于0`
            })
          }
          break

        case 'direct-amount':
          if (!item.directAmount || item.directAmount <= 0) {
            errors.push({
              code: 'MISSING_FIELD',
              field: 'directAmount',
              rowId: item.id,
              message: `收入项 ${index + 1} "${item.name}" 金额必须大于0`
            })
          }
          break
      }

      // 验证计算结果
      const taxableIncome = calculateTaxableIncome(item)
      const nonTaxIncome = calculateNonTaxIncome(item)

      if (taxableIncome <= 0) {
        errors.push({
          code: 'INVALID_AMOUNT',
          field: 'taxableIncome',
          rowId: item.id,
          message: `收入项 ${index + 1} "${item.name}" 含税收入计算结果无效`
        })
      }

      if (nonTaxIncome <= 0) {
        errors.push({
          code: 'INVALID_AMOUNT',
          field: 'nonTaxIncome',
          rowId: item.id,
          message: `收入项 ${index + 1} "${item.name}" 不含税收入计算结果无效`
        })
      }
    })

    return errors
  }

  /**
   * 验证成本项
   */
  static validateCostItems(items: CostItem[]): ValidationError[] {
    const errors: ValidationError[] = []

    items.forEach((item, index) => {
      // 验证名称
      if (!item.name || item.name.trim() === '') {
        errors.push({
          code: 'MISSING_FIELD',
          field: 'name',
          rowId: item.id,
          message: `成本项 ${index + 1} 名称不能为空`
        })
      }

      // 根据字段模板验证必填字段
      switch (item.fieldTemplate) {
        case 'quantity-price':
          if (!item.quantity || item.quantity <= 0) {
            errors.push({
              code: 'MISSING_FIELD',
              field: 'quantity',
              rowId: item.id,
              message: `成本项 ${index + 1} "${item.name}" 数量必须大于0`
            })
          }
          if (!item.unitPrice || item.unitPrice <= 0) {
            errors.push({
              code: 'MISSING_FIELD',
              field: 'unitPrice',
              rowId: item.id,
              message: `成本项 ${index + 1} "${item.name}" 单价必须大于0`
            })
          }
          break

        case 'direct-amount':
          if (!item.directAmount || item.directAmount <= 0) {
            errors.push({
              code: 'MISSING_FIELD',
              field: 'directAmount',
              rowId: item.id,
              message: `成本项 ${index + 1} "${item.name}" 金额必须大于0`
            })
          }
          break
      }
    })

    return errors
  }

  /**
   * 验证达产率配置
   */
  static validateProductionRates(rates: ProductionRateConfig[], operationYears: number): ValidationError[] {
    const errors: ValidationError[] = []

    if (!rates || rates.length === 0) {
      errors.push({
        code: 'EMPTY',
        message: '达产率配置不能为空'
      })
      return errors
    }

    // 检查年份数量是否匹配
    if (rates.length !== operationYears) {
      errors.push({
        code: 'NOT_CONVERGED',
        message: `达产率配置年份数量(${rates.length})与运营期(${operationYears})不匹配`
      })
    }

    rates.forEach((rate) => {
      // 验证年份索引
      if (rate.yearIndex < 1 || rate.yearIndex > operationYears) {
        errors.push({
          code: 'INVALID_AMOUNT',
          field: 'yearIndex',
          message: `达产率年份索引 ${rate.yearIndex} 超出运营期范围`
        })
      }

      // 验证达产率值
      if (rate.rate < 0 || rate.rate > 1) {
        errors.push({
          code: 'INVALID_AMOUNT',
          field: 'rate',
          message: `第 ${rate.yearIndex} 年达产率 ${(rate.rate * 100).toFixed(1)}% 必须在0-100%之间`
        })
      }
    })

    // 检查年份是否连续且唯一
    const yearIndexes = rates.map(r => r.yearIndex).sort((a, b) => a - b)
    const uniqueYears = new Set(yearIndexes)
    if (uniqueYears.size !== yearIndexes.length) {
      errors.push({
        code: 'NOT_CONVERGED',
        message: '达产率配置存在重复年份'
      })
    }

    return errors
  }

  /**
   * 交叉验证：收入成本合理性检查
   */
  static crossValidate(
    revenueItems: RevenueItem[],
    costItems: CostItem[],
    productionRates: ProductionRateConfig[]
  ): ValidationError[] {
    const errors: ValidationError[] = []

    // 计算总收入
    const totalRevenue = revenueItems.reduce((sum, item) => {
      return sum + calculateNonTaxIncome(item)
    }, 0)

    // 计算总成本
    const totalCost = costItems.reduce((sum, item) => {
      const amount = item.fieldTemplate === 'direct-amount'
        ? (item.directAmount || 0)
        : (item.quantity || 0) * (item.unitPrice || 0)
      return sum + amount
    }, 0)

    // 检查成本占收入比例是否合理（一般应小于90%）
    if (totalRevenue > 0 && totalCost > 0) {
      const costRatio = totalCost / totalRevenue
      if (costRatio > 0.95) {
        errors.push({
          code: 'NOT_CONVERGED',
          message: `成本占收入比例过高 (${(costRatio * 100).toFixed(1)}%)，建议检查收入和成本配置`
        })
      }
    }

    // 检查达产率是否合理递增
    if (productionRates.length > 1) {
      for (let i = 1; i < productionRates.length; i++) {
        const prevRate = productionRates[i - 1].rate
        const currRate = productionRates[i].rate
        
        // 达产率不应该下降（除非有特殊原因）
        if (currRate < prevRate - 0.05) { // 允许5%的波动
          errors.push({
            code: 'NOT_CONVERGED',
            message: `第 ${productionRates[i].yearIndex} 年达产率 (${(currRate * 100).toFixed(1)}%) 低于上一年 (${(prevRate * 100).toFixed(1)}%)，请确认是否合理`
          })
        }
      }
    }

    return errors
  }

  /**
   * 综合验证
   */
  static validateAll(
    revenueItems: RevenueItem[],
    costItems: CostItem[],
    productionRates: ProductionRateConfig[],
    operationYears: number
  ): {
    isValid: boolean
    errors: ValidationError[]
    warnings: ValidationError[]
  } {
    const allErrors: ValidationError[] = []

    // 验证收入项
    const revenueErrors = this.validateRevenueItems(revenueItems)
    allErrors.push(...revenueErrors)

    // 验证成本项（警告级别，可以为空）
    const costErrors = this.validateCostItems(costItems)
    const costWarnings = costErrors.filter(e => e.code !== 'MISSING_FIELD')
    const costCritical = costErrors.filter(e => e.code === 'MISSING_FIELD')
    allErrors.push(...costCritical)

    // 验证达产率
    const rateErrors = this.validateProductionRates(productionRates, operationYears)
    allErrors.push(...rateErrors)

    // 交叉验证
    const crossErrors = this.crossValidate(revenueItems, costItems, productionRates)
    
    // 交叉验证的错误作为警告
    const warnings = [...costWarnings, ...crossErrors]

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings
    }
  }
}

/**
 * 格式化验证错误消息
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return ''
  
  return errors.map((error, index) => {
    return `${index + 1}. ${error.message}`
  }).join('\n')
}

/**
 * 按字段分组错误
 */
export function groupErrorsByField(errors: ValidationError[]): Record<string, ValidationError[]> {
  const grouped: Record<string, ValidationError[]> = {}
  
  errors.forEach(error => {
    const field = error.field || 'general'
    if (!grouped[field]) {
      grouped[field] = []
    }
    grouped[field].push(error)
  })
  
  return grouped
}
