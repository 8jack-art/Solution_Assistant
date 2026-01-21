/**
 * 备份 DynamicRevenueTable.tsx - 原始版本
 * 备份时间: 2026-01-18T11:00
 * 
 * 此文件包含原始的 handleExportRevenueTable 函数实现
 * 原文件路径: client/src/components/revenue-cost/DynamicRevenueTable.tsx
 */

// 原始的 handleExportRevenueTable 函数 (第942-1113行)
const handleExportRevenueTable = () => {
  if (!context) {
    notifications.show({
      title: '导出失败',
      message: '项目上下文未加载',
      color: 'red',
    });
    return;
  }

  const operationYears = context.operationYears;
  const years = Array.from({ length: operationYears }, (_, i) => i + 1);

  // 准备Excel数据
  const excelData: any[] = [];
  
  // 添加表头
  const headerRow: any = { '序号': '', '收入项目': '', '合计': '' };
  years.forEach((year) => {
    headerRow[year.toString()] = year;
  });
  excelData.push(headerRow);

  // 1. 营业收入
  const row1: any = { '序号': '1', '收入项目': '营业收入' };
  let totalRow1 = 0;
  years.forEach((year) => {
    const yearTotal = revenueItems.reduce((sum, item) => {
      const productionRate = getProductionRateForYear(useRevenueCostStore.getState().productionRates, year)
      return sum + calculateYearlyRevenue(item, year, productionRate)
    }, 0);
    row1[year.toString()] = yearTotal;
    totalRow1 += yearTotal;
  });
  row1['合计'] = totalRow1;
  excelData.push(row1);

  // 1.1, 1.2, 1.3... 收入项
  revenueItems.forEach((item, idx) => {
    const row: any = { '序号': `1.${idx + 1}`, '收入项目': `${item.name}（${(item.vatRate * 100).toFixed(0)}%）` };
    let total = 0;
    years.forEach((year) => {
      const productionRate = getProductionRateForYear(useRevenueCostStore.getState().productionRates, year)
      const revenue = calculateYearlyRevenue(item, year, productionRate);
      row[year.toString()] = revenue;
      total += revenue;
    });
    row['合计'] = total;
    excelData.push(row);
  });

  // ... 其他代码省略 ...

  // 创建工作簿和工作表
  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '营业收入、营业税金及附加和增值税估算表');

  // 导出文件
  XLSX.writeFile(wb, `营业收入、营业税金及附加和增值税估算表_${context.projectName || '项目'}.xlsx`);

  notifications.show({
    title: '导出成功',
    message: '营业收入、营业税金及附加和增值税估算表已导出为Excel文件',
    color: 'green',
  });
};
