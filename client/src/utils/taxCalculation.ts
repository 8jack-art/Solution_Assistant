/**
 * 税费计算配置接口
 */
export interface TaxConfig {
  urbanConstructionTaxRate: number;  // 城市建设维护税率 (0.07 或 0.05)
  educationSurtaxRate: number;       // 教育费附加率 (0.03)
  localEducationSurtaxRate: number;  // 地方教育费附加率 (0.02)
}

/**
 * 税费计算结果接口
 */
export interface TaxCalculationResult {
  vatAmount: number;                 // 增值税额
  urbanConstructionTax: number;       // 城市建设维护税
  educationSurtax: number;            // 教育费附加
  localEducationSurtax: number;       // 地方教育费附加
  totalAdditionalTaxes: number;       // 其他税费及附加总计
}

/**
 * 默认税费配置
 */
export const DEFAULT_TAX_CONFIG: TaxConfig = {
  urbanConstructionTaxRate: 0.07,  // 默认市区7%
  educationSurtaxRate: 0.03,       // 固定3%
  localEducationSurtaxRate: 0.02   // 固定2%
};

/**
 * 计算城市建设维护税
 * 公式：增值税 × 城市建设维护税率
 * 
 * @param vatAmount 增值税额
 * @param taxRate 城市建设维护税率
 * @returns 城市建设维护税金额
 */
export function calculateUrbanConstructionTax(vatAmount: number, taxRate: number): number {
  return vatAmount * taxRate;
}

/**
 * 计算教育费附加
 * 公式：增值税 × 教育费附加税率
 * 
 * @param vatAmount 增值税额
 * @param taxRate 教育费附加税率
 * @returns 教育费附加金额
 */
export function calculateEducationSurtax(vatAmount: number, taxRate: number): number {
  return vatAmount * taxRate;
}

/**
 * 计算地方教育费附加
 * 公式：增值税 × 地方教育费附加税率
 * 
 * @param vatAmount 增值税额
 * @param taxRate 地方教育费附加税率
 * @returns 地方教育费附加金额
 */
export function calculateLocalEducationSurtax(vatAmount: number, taxRate: number): number {
  return vatAmount * taxRate;
}

/**
 * 计算其他税费及附加总计
 * 公式：城市建设维护税 + 教育费附加 + 地方教育费附加
 * 
 * @param urbanConstructionTax 城市建设维护税
 * @param educationSurtax 教育费附加
 * @param localEducationSurtax 地方教育费附加
 * @returns 其他税费及附加总计
 */
export function calculateTotalAdditionalTaxes(
  urbanConstructionTax: number,
  educationSurtax: number,
  localEducationSurtax: number
): number {
  return urbanConstructionTax + educationSurtax + localEducationSurtax;
}

/**
 * 综合税费计算函数
 * 根据增值税额和税率配置计算所有税费
 * 
 * @param vatAmount 增值税额
 * @param taxConfig 税费配置
 * @returns 完整的税费计算结果
 */
export function calculateAllTaxes(vatAmount: number, taxConfig: TaxConfig): TaxCalculationResult {
  const urbanConstructionTax = calculateUrbanConstructionTax(vatAmount, taxConfig.urbanConstructionTaxRate);
  const educationSurtax = calculateEducationSurtax(vatAmount, taxConfig.educationSurtaxRate);
  const localEducationSurtax = calculateLocalEducationSurtax(vatAmount, taxConfig.localEducationSurtaxRate);
  const totalAdditionalTaxes = calculateTotalAdditionalTaxes(
    urbanConstructionTax,
    educationSurtax,
    localEducationSurtax
  );

  return {
    vatAmount,
    urbanConstructionTax,
    educationSurtax,
    localEducationSurtax,
    totalAdditionalTaxes
  };
}

/**
 * 格式化税率为百分比字符串
 * 
 * @param taxRate 税率（小数形式，如0.07）
 * @returns 百分比字符串（如"7%"）
 */
export function formatTaxRate(taxRate: number): string {
  return `${(taxRate * 100).toFixed(0)}%`;
}

/**
 * 验证税费配置的有效性
 * 
 * @param taxConfig 税费配置
 * @returns 验证结果
 */
export function validateTaxConfig(taxConfig: TaxConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (taxConfig.urbanConstructionTaxRate < 0 || taxConfig.urbanConstructionTaxRate > 1) {
    errors.push('城市建设维护税率必须在0-100%之间');
  }

  if (taxConfig.educationSurtaxRate < 0 || taxConfig.educationSurtaxRate > 1) {
    errors.push('教育费附加率必须在0-100%之间');
  }

  if (taxConfig.localEducationSurtaxRate < 0 || taxConfig.localEducationSurtaxRate > 1) {
    errors.push('地方教育费附加率必须在0-100%之间');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
