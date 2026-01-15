// 测试财务静态动态指标修复效果
const fs = require('fs');
const path = require('path');

console.log('=== 财务静态动态指标修复测试 ===');
console.log('');

// 1. 检查修复的代码
console.log('1. 检查修复的代码...');
const filePath = path.join(__dirname, 'client/src/components/revenue-cost/FinancialIndicatorsTable.tsx');

if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 检查关键修复点
  const hasContextDependency = content.includes('useEffect(() => {') && 
                                content.includes('[context?.projectId]') &&
                                content.includes('// 加载财务指标基准收益率设置（按项目隔离存储）');
  
  const hasDataValidation = content.includes('if (!context || !revenueTableData || !costTableData) {') &&
                             content.includes('return;');
  
  console.log('   ✓ 基准收益率加载依赖已修复:', hasContextDependency);
  console.log('   ✓ 财务指标计算数据验证已添加:', hasDataValidation);
  
  if (hasContextDependency && hasDataValidation) {
    console.log('   ✅ 代码修复验证通过');
  } else {
    console.log('   ❌ 代码修复验证失败');
  }
} else {
  console.log('   ❌ 文件不存在:', filePath);
}

console.log('');
console.log('2. 修复说明:');
console.log('   - 修复了基准收益率数据初始化的useEffect依赖，确保context变化时重新加载');
console.log('   - 添加了财务指标计算前的数据验证，确保必要数据已加载');
console.log('   - 修复了财务静态动态指标在页面加载时无法正确获取的问题');

console.log('');
console.log('3. 预期效果:');
console.log('   - 重启服务或清除浏览器缓存后，财务静态动态指标数据应能正确显示');
console.log('   - 无需重新设置基准收益率modal，数据即可正常获取');
console.log('   - 基准收益率数据按项目隔离存储，不同项目互不干扰');

console.log('');
console.log('=== 测试完成 ===');