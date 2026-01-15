/**
 * 构建投资估算简表 JSON 数据
 */
import { formatString, formatNumber2 } from './shared.js'

export function buildInvestmentEstimateJSON(estimateData: any): string {
  if (!estimateData) return '{}'
  
  // 获取三级子项数据
  const thirdLevelItems = estimateData.thirdLevelItems || estimateData.partA?.thirdLevelItems || {}
  
  // 计算partA各费用合计
  const partAChildren = estimateData.partA?.children || []
  const partAConstructionTotal = partAChildren.reduce((sum: number, item: any) => 
    sum + formatNumber2(item['建设工程费（万元）'] || item.建设工程费), 0
  ) || 0
  const partAEquipTotal = partAChildren.reduce((sum: number, item: any) => 
    sum + formatNumber2(item['设备购置费（万元）'] || item.设备购置费), 0
  ) || 0
  const partAInstallTotal = partAChildren.reduce((sum: number, item: any) => 
    sum + formatNumber2(item['安装工程费（万元）'] || item.安装工程费), 0
  ) || 0
  const partAOtherTotal = partAChildren.reduce((sum: number, item: any) => 
    sum + formatNumber2(item['其它费用（万元）'] || item.其它费用), 0
  ) || 0
  
  // 计算partB各费用合计
  const partBChildren = estimateData.partB?.children || []
  const partBOtherTotal = partBChildren.reduce((sum: number, item: any) => 
    sum + formatNumber2(item['其它费用（万元）'] || item.其它费用 || item.合计), 0
  ) || 0
  
  // 构建partA的children
  const buildPartAChildren = (): any[] => {
    return (estimateData.partA?.children || []).map((item: any, parentIndex: number) => {
      const thirdItems = thirdLevelItems[parentIndex] || []
      
      const baseItem: any = {
        序号: formatString(item.序号),
        工程或费用名称: formatString(item.工程或费用名称),
        建设工程费: formatNumber2(item['建设工程费（万元）'] || item.建设工程费),
        设备购置费: formatNumber2(item['设备购置费（万元）'] || item.设备购置费),
        安装工程费: formatNumber2(item['安装工程费（万元）'] || item.安装工程费),
        其它费用: formatNumber2(item['其它费用（万元）'] || item.其它费用),
        合计: formatNumber2(item['合计（万元）'] || item.合计),
        备注: formatString(item.备注)
      }
      
      if (thirdItems.length > 0) {
        baseItem.children = thirdItems.map((subItem: any, subIndex: number) => {
          const totalPrice = (subItem.quantity * subItem.unit_price) / 10000
          const constructionCost = totalPrice * (subItem.construction_ratio || 0)
          const equipmentCost = totalPrice * (subItem.equipment_ratio || 0)
          const installationCost = totalPrice * (subItem.installation_ratio || 0)
          const otherCost = totalPrice * (subItem.other_ratio || 0)
          
          return {
            序号: subIndex + 1,
            名称: subItem.name || '',
            单位: subItem.unit || '',
            数量: formatNumber2(subItem.quantity),
            单价: formatNumber2(subItem.unit_price),
            单价万元: formatNumber2(subItem.unit_price / 10000),
            工程总价: formatNumber2(totalPrice),
            建设工程费: formatNumber2(constructionCost),
            设备购置费: formatNumber2(equipmentCost),
            安装工程费: formatNumber2(installationCost),
            其它费用: formatNumber2(otherCost),
            占总价比例: subItem.construction_ratio 
              ? `${(subItem.construction_ratio * 100).toFixed(1)}%` : ''
          }
        })
      }
      
      return baseItem
    })
  }
  
  const jsonData: any = {
    title: '投资估算简表',
    summary: {
      totalInvestment: formatNumber2(estimateData.partG?.合计),
      constructionInvestment: formatNumber2(estimateData.partE?.合计),
      interestDuringConstruction: formatNumber2(estimateData.partF?.合计),
      contingency: formatNumber2(estimateData.partD?.合计)
    },
    partA: {
      name: '第一部分 工程费用',
      total: formatNumber2(estimateData.partA?.合计),
      建设工程费: partAConstructionTotal,
      设备购置费: partAEquipTotal,
      安装工程费: partAInstallTotal,
      其它费用: partAOtherTotal,
      备注: formatString(estimateData.partA?.备注),
      children: buildPartAChildren()
    },
    partB: {
      name: '第二部分 工程其它费用',
      total: formatNumber2(estimateData.partB?.合计),
      建设工程费: 0,
      设备购置费: 0,
      安装工程费: 0,
      其它费用: partBOtherTotal,
      备注: formatString(estimateData.partB?.备注),
      children: (estimateData.partB?.children || []).map((item: any) => ({
        序号: formatString(item.序号),
        工程或费用名称: formatString(item.工程或费用名称),
        其它费用: formatNumber2(item['其它费用（万元）'] || item.其它费用 || item.合计),
        合计: formatNumber2(item['合计（万元）'] || item.合计),
        备注: formatString(item.备注)
      }))
    },
    partC: {
      name: '第一、二部分合计',
      total: formatNumber2(estimateData.partC?.合计),
      建设工程费: partAConstructionTotal,
      设备购置费: partAEquipTotal,
      安装工程费: partAInstallTotal,
      其它费用: partAOtherTotal + partBOtherTotal,
      备注: 'C=A+B'
    },
    partD: {
      total: formatNumber2(estimateData.partD?.合计),
      备注: formatString(estimateData.partD?.备注)
    },
    partE: {
      total: formatNumber2(estimateData.partE?.合计),
      贷款总额: formatNumber2(estimateData.partE?.贷款总额 || estimateData.partF?.贷款总额),
      年利率: formatNumber2((estimateData.partE?.年利率 || estimateData.partF?.年利率 || 0) * 100),
      建设期年限: estimateData.partE?.建设期年限 || estimateData.partF?.建设期年限 || '',
      备注: formatString(estimateData.partE?.备注)
    },
    partF: {
      total: formatNumber2(estimateData.partF?.合计),
      贷款总额: formatNumber2(estimateData.partF?.贷款总额),
      年利率: formatNumber2((estimateData.partF?.年利率 || 0) * 100),
      建设期年限: estimateData.partF?.建设期年限 || '',
      备注: formatString(estimateData.partF?.备注)
    },
    partG: {
      total: formatNumber2(estimateData.partG?.合计),
      备注: formatString(estimateData.partG?.备注)
    }
  }
  
  return JSON.stringify(jsonData, null, 2)
}
