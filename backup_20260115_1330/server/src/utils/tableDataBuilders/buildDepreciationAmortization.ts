/**
 * 构建折旧与摊销估算表 JSON 数据
 */
export function buildDepreciationAmortizationJSON(depreciationData: any): string {
  if (!depreciationData) return '{}'
  
  const depAmortData = depreciationData.depreciationAmortization || depreciationData
  
  console.log('🔍 buildDepreciationAmortizationJSON 调试信息:', {
    '原始数据keys': Object.keys(depreciationData),
    'depAmortData keys': Object.keys(depAmortData),
  })
  
  const aDepreciation = depAmortData.A_depreciation || []
  const dDepreciation = depAmortData.D_depreciation || []
  const eAmortization = depAmortData.E_amortization || []
  
  const aParams = (depAmortData.A && Object.keys(depAmortData.A).length > 0) 
    ? depAmortData.A 
    : (depreciationData.A || {})
  const dParams = (depAmortData.D && Object.keys(depAmortData.D).length > 0) 
    ? depAmortData.D 
    : (depreciationData.D || {})
  const eParams = (depAmortData.E && Object.keys(depAmortData.E).length > 0) 
    ? depAmortData.E 
    : (depreciationData.E || {})
  
  const jsonData: any = {
    建筑折旧: {
      年限: aParams.折旧年限 || aParams.depreciationYears || 0,
      残值率: aParams.残值率 || aParams.residualRate || 0,
      年均折旧费: aParams.年折旧额 || aParams.annualDepreciation || (aDepreciation[0] || 0)
    },
    机器设备折旧: {
      年限: dParams.折旧年限 || dParams.depreciationYears || 0,
      残值率: dParams.残值率 || dParams.residualRate || 0,
      年均折旧费: dParams.年折旧额 || dParams.annualDepreciation || (dDepreciation[0] || 0)
    },
    无形资产摊销: {
      年限: eParams.摊销年限 || eParams.amortizationYears || 0,
      年摊销费: eParams.年摊销额 || eParams.annualAmortization || (eAmortization[0] || 0)
    }
  }
  
  jsonData.年均折旧费合计 = 
    (jsonData.建筑折旧.年均折旧费 || 0) +
    (jsonData.机器设备折旧.年均折旧费 || 0) +
    (jsonData.无形资产摊销.年摊销费 || 0)
  
  console.log('✅ buildDepreciationAmortizationJSON 输出:', JSON.stringify(jsonData, null, 2))
  
  return JSON.stringify(jsonData, null, 2)
}
