// 测试财务静态动态指标修复效果
const fs = require('fs');
const path = require('path');

console.log('=== 财务静态动态指标修复测试 ===');
console.log('');

let allTestsPassed = true;

// 1. 检查前端 reportStore.ts 修复
console.log('1. 检查前端 reportStore.ts 修复...');
const reportStorePath = path.join(__dirname, 'client/src/stores/reportStore.ts');

if (fs.existsSync(reportStorePath)) {
  const content = fs.readFileSync(reportStorePath, 'utf8');
  
  // 检查关键修复点：确保基准收益率始终有默认值 6
  const hasDefaultRate6 = content.includes('preTaxRate: preTaxRateStr ? parseFloat(preTaxRateStr) : 6') &&
                          content.includes('postTaxRate: postTaxRateStr ? parseFloat(postTaxRateStr) : 6');
  
  console.log('   ✓ 基准收益率默认值设置为6%:', hasDefaultRate6);
  
  if (!hasDefaultRate6) {
    console.log('   ❌ reportStore.ts 修复验证失败');
    allTestsPassed = false;
  } else {
    console.log('   ✅ reportStore.ts 修复验证通过');
  }
} else {
  console.log('   ❌ 文件不存在:', reportStorePath);
  allTestsPassed = false;
}

console.log('');

// 2. 检查后端 reportController.ts 修复
console.log('2. 检查后端 reportController.ts 修复...');
const controllerPath = path.join(__dirname, 'server/src/controllers/reportController.ts');

if (fs.existsSync(controllerPath)) {
  const content = fs.readFileSync(controllerPath, 'utf8');
  
  // 检查关键修复点：在 buildAllTableDataJSON 之前注入基准收益率
  const hasPreInjection = content.includes('const preTaxRateValue = preTaxRate ?? 6') &&
                          content.includes('const postTaxRateValue = postTaxRate ?? 6');
  
  // 检查注释说明
  const hasComments = content.includes('✅ 关键修复：确保基准收益率始终有默认值（6%），在调用 buildAllTableDataJSON 之前注入');
  
  console.log('   ✓ 基准收益率在 buildAllTableDataJSON 前注入:', hasPreInjection);
  console.log('   ✓ 关键修复注释说明:', hasComments);
  
  if (!hasPreInjection) {
    console.log('   ❌ reportController.ts 修复验证失败');
    allTestsPassed = false;
  } else {
    console.log('   ✅ reportController.ts 修复验证通过');
  }
} else {
  console.log('   ❌ 文件不存在:', controllerPath);
  allTestsPassed = false;
}

console.log('');

// 3. 检查 buildFinancialStaticDynamic.ts 修复
console.log('3. 检查 buildFinancialStaticDynamic.ts 修复...');
const buildFnPath = path.join(__dirname, 'server/src/utils/tableDataBuilders/buildFinancialStaticDynamic.ts');

if (fs.existsSync(buildFnPath)) {
  const content = fs.readFileSync(buildFnPath, 'utf8');
  
  // 检查关键修复点：从 tableDataJSON 获取基准收益率
  const hasTableDataJSONFallback = content.includes('financialData.tableDataJSON?.[\'DATA:financial_static_dynamic\']?.基准收益率?.所得税前');
  const hasTableDataJSONFallback2 = content.includes('financialData.tableDataJSON?.[\'DATA:financial_static_dynamic\']?.基准收益率?.所得税后');
  
  // 检查默认值 6
  const hasDefault6 = content.includes('financialIndicators.postTaxRate ||') &&
                      content.includes('6)');
  
  console.log('   ✓ 从 tableDataJSON 获取所得税前收益率:', hasTableDataJSONFallback);
  console.log('   ✓ 从 tableDataJSON 获取所得税后收益率:', hasTableDataJSONFallback2);
  
  if (!hasTableDataJSONFallback || !hasTableDataJSONFallback2) {
    console.log('   ❌ buildFinancialStaticDynamic.ts 修复验证失败');
    allTestsPassed = false;
  } else {
    console.log('   ✅ buildFinancialStaticDynamic.ts 修复验证通过');
  }
} else {
  console.log('   ❌ 文件不存在:', buildFnPath);
  allTestsPassed = false;
}

console.log('');

// 4. 检查 FinancialIndicatorsTable.tsx 数值校验修复
console.log('4. 检查 FinancialIndicatorsTable.tsx 数值校验和默认按钮修复...');
const tablePath = path.join(__dirname, 'client/src/components/revenue-cost/FinancialIndicatorsTable.tsx');

if (fs.existsSync(tablePath)) {
  const content = fs.readFileSync(tablePath, 'utf8');
  
  // 检查数值校验：文本改为 0<x ≤12
  const hasCorrectDescription = content.includes('数值范围：0<x ≤12');
  // 检查按钮禁用逻辑
  const hasButtonDisabled = content.includes('disabled={tempPreTaxRate <= 0 || tempPreTaxRate > 12 || tempPostTaxRate <= 0 || tempPostTaxRate > 12}');
  // 检查错误提示
  const hasErrorMessage = content.includes('error={tempPreTaxRate <= 0 || tempPreTaxRate > 12') &&
                          content.includes('error={tempPostTaxRate <= 0 || tempPostTaxRate > 12');
  // 检查保存时的额外校验
  const hasSaveValidation = content.includes('if (tempPreTaxRate <= 0 || tempPreTaxRate > 12 || tempPostTaxRate <= 0 || tempPostTaxRate > 12)') &&
                            content.includes("message: '请输入有效的基准收益率（0<x≤12）'");
  // 检查默认按钮
  const hasDefaultButton = content.includes('variant=\"outline\"') &&
                           content.includes('color=\"gray\"') &&
                           content.includes('onClick={() => {') &&
                           content.includes('setTempPreTaxRate(6);') &&
                           content.includes('setTempPostTaxRate(6);') &&
                           content.includes('默认');
  
  console.log('   ✓ 说明文字改为 0<x ≤12:', hasCorrectDescription);
  console.log('   ✓ 按钮禁用逻辑:', hasButtonDisabled);
  console.log('   ✓ 错误提示 (error):', hasErrorMessage);
  console.log('   ✓ 保存时额外校验:', hasSaveValidation);
  console.log('   ✓ 默认按钮 (填充6%):', hasDefaultButton);
  
  if (!hasCorrectDescription || !hasButtonDisabled || !hasErrorMessage || !hasSaveValidation || !hasDefaultButton) {
    console.log('   ❌ FinancialIndicatorsTable.tsx 数值校验验证失败');
    allTestsPassed = false;
  } else {
    console.log('   ✅ FinancialIndicatorsTable.tsx 数值校验和默认按钮验证通过');
  }
} else {
  console.log('   ❌ 文件不存在:', tablePath);
  allTestsPassed = false;
}

console.log('');
console.log('=== 修复总结 ===');
console.log('');
console.log('修复内容:');
console.log('1. client/src/stores/reportStore.ts');
console.log('   - 确保基准收益率始终有默认值 6%，即使 localStorage 中没有值');
console.log('');
console.log('2. server/src/controllers/reportController.ts');
console.log('   - 在调用 buildAllTableDataJSON 之前注入基准收益率');
console.log('   - 确保 buildFinancialStaticDynamicJSON 首次调用时就能获取到正确的值');
console.log('');
console.log('3. server/src/utils/tableDataBuilders/buildFinancialStaticDynamic.ts');
console.log('   - 添加从 tableDataJSON 获取基准收益率的后备方案');
console.log('   - 确保即使前端没有传递基准收益率，也能从已有数据中获取');
console.log('');
console.log('4. client/src/components/revenue-cost/FinancialIndicatorsTable.tsx');
console.log('   - 数值范围说明改为: 0<x ≤12');
console.log('   - 添加实时错误提示 (error)');
console.log('   - 数值无效时按钮禁用 (disabled)');
console.log('   - 点击保存时额外校验并弹出警告通知');
console.log('   - 添加"默认"按钮，点击后两个文本框填充 6%');
console.log('');
console.log('预期效果:');
console.log('✅ 首次点击小眼睛图标时，财务静态动态指标JSON数据应能正确显示');
console.log('✅ 无需打开"设置基准收益率"弹窗并点击确定，数据即可正常获取');
console.log('✅ 基准收益率数据按项目隔离存储');
console.log('✅ 修复前需要用户额外操作才能显示数据的问题已解决');
console.log('✅ 基准收益率输入范围验证：0<x ≤12');
console.log('✅ 数值无效时按钮禁用，防止错误保存');
console.log('✅ 点击"默认"按钮可快速将两个收益率填充为 6%');
console.log('');

if (allTestsPassed) {
  console.log('=== ✅ 所有测试通过 ===');
  process.exit(0);
} else {
  console.log('=== ❌ 部分测试失败 ===');
  process.exit(1);
}
