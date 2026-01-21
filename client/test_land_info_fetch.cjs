/**
 * 测试文件：验证从项目信息获取亩数和单价数据的逻辑
 * 
 * 运行方式: node client/test_land_info_fetch.cjs
 * 
 * 注意：土地数据 (land_area, land_unit_price) 存储在 investment_projects 表中，
 * 应该通过 projectApi.getById 获取，而不是 investmentApi.getByProjectId
 */

// 模拟 projectApi.getById 的响应数据结构
const mockApiResponses = [
  {
    // 场景1: 项目信息中有土地数据
    success: true,
    data: {
      project: {
        id: '123',
        project_name: '测试项目',
        land_area: 500,
        land_unit_price: 0.8
      }
    }
  },
  {
    // 场景2: 项目信息中土地数据为0
    success: true,
    data: {
      project: {
        id: '456',
        project_name: '空土地项目',
        land_area: 0,
        land_unit_price: 0
      }
    }
  },
  {
    // 场景3: 项目信息中缺少土地字段
    success: true,
    data: {
      project: {
        id: '789',
        project_name: '无土地字段项目'
      }
    }
  },
  {
    // 场景4: API失败
    success: false,
    error: '项目不存在',
    data: null
  }
];

// 模拟从项目信息中提取土地数据的函数（与组件中的逻辑一致）
function extractLandInfoFromProject(project) {
  if (!project) {
    console.log('  ❌ project 参数为空');
    return { landArea: 0, landUnitPrice: 0 };
  }

  // 从项目信息中获取土地数据
  const landArea = project.land_area || 0;
  const landUnitPrice = project.land_unit_price || 0;
  
  return { landArea, landUnitPrice };
}

// 模拟 useEffect 的条件判断逻辑
function shouldFetchLandInfo(config, landInfoFetched, projectId) {
  return {
    currentExpenseType: config?.expenseType,
    prevExpenseType: 'directAmount',
    showOtherModal: true,
    hasProjectId: !!projectId,
    shouldFetch: true && 
                config?.expenseType === 'landTransfer' && 
                'directAmount' !== 'landTransfer' && 
                !landInfoFetched && 
                !!projectId
  };
}

// 测试函数
function runTests() {
  console.log('🧪 开始测试从项目信息获取亩数和单价数据的逻辑');
  console.log('📝 数据来源: investment_projects 表 (land_area, land_unit_price 字段)');
  console.log('📡 API调用: projectApi.getById');
  console.log('');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  mockApiResponses.forEach((response, index) => {
    console.log(`\n📋 测试场景 ${index + 1}:`);
    console.log('-'.repeat(40));
    
    const { landArea, landUnitPrice } = extractLandInfoFromProject(response.data?.project);
    
    console.log(`  API响应: ${response.success ? '✅ 成功' : '❌ 失败'}`);
    if (response.error) {
      console.log(`  错误信息: ${response.error}`);
    }
    console.log(`  提取的亩数 (land_area): ${landArea}`);
    console.log(`  提取的单价 (land_unit_price): ${landUnitPrice}`);
    
    let testPassed = false;
    let expectedArea = 0;
    let expectedPrice = 0;
    
    switch (index) {
      case 0:
        expectedArea = 500;
        expectedPrice = 0.8;
        testPassed = landArea === expectedArea && landUnitPrice === expectedPrice;
        break;
      case 1:
        testPassed = landArea === 0 && landUnitPrice === 0;
        break;
      case 2:
        testPassed = landArea === 0 && landUnitPrice === 0;
        break;
      case 3:
        testPassed = landArea === 0 && landUnitPrice === 0;
        break;
    }
    
    if (testPassed) {
      console.log(`  ✅ 测试通过 (期望: 亩数=${expectedArea}, 单价=${expectedPrice})`);
      passed++;
    } else {
      console.log(`  ❌ 测试失败 (期望: 亩数=${expectedArea}, 单价=${expectedPrice})`);
      failed++;
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 数据提取测试结果: ${passed} 通过, ${failed} 失败`);
  
  console.log('\n\n🔍 测试 useEffect 条件判断逻辑:');
  console.log('-'.repeat(40));
  
  let conditionTestsPassed = 0;
  let conditionTestsFailed = 0;
  
  const testCases = [
    { expenseType: 'landTransfer', landInfoFetched: false, projectId: '123', expected: true, desc: '切换到土地流转费且未获取过' },
    { expenseType: 'landTransfer', landInfoFetched: true, projectId: '123', expected: false, desc: '土地流转费但已获取过' },
    { expenseType: 'directAmount', landInfoFetched: false, projectId: '123', expected: false, desc: '直接填金额类型' },
    { expenseType: 'landTransfer', landInfoFetched: false, projectId: null, expected: false, desc: '缺少项目ID' }
  ];
  
  testCases.forEach((tc, i) => {
    const config = { expenseType: tc.expenseType };
    const result = shouldFetchLandInfo(config, tc.landInfoFetched, tc.projectId);
    const actualShouldFetch = result.shouldFetch;
    const testPassed = actualShouldFetch === tc.expected;
    
    console.log(`\n  测试 ${i + 1}: ${tc.desc}`);
    console.log(`    费用类型: ${tc.expenseType}, 已获取: ${tc.landInfoFetched}, 有项目ID: ${!!tc.projectId}`);
    console.log(`    期望触发: ${tc.expected}, 实际: ${actualShouldFetch}`);
    console.log(`    ${testPassed ? '✅ 通过' : '❌ 失败'}`);
    
    if (testPassed) conditionTestsPassed++; else conditionTestsFailed++;
  });
  
  console.log('\n' + '='.repeat(60));
  passed += conditionTestsPassed;
  failed += conditionTestsFailed;
  
  console.log(`\n🎯 最终测试结果: ${passed} 通过, ${failed} 失败`);
  
  if (failed === 0) {
    console.log('\n🎉 所有测试通过！');
    console.log('\n💡 使用说明:');
    console.log('   1. 确保在"项目信息"模块中填写了土地数据');
    console.log('   2. 土地数据存储在 investment_projects 表');
    console.log('   3. 打开"其他费用配置"弹窗，切换为"土地流转费"');
    console.log('   4. 系统自动从项目信息获取亩数和单价并填充');
  } else {
    console.log('\n⚠️  部分测试失败');
  }
  
  return failed === 0;
}

module.exports = { extractLandInfoFromProject, shouldFetchLandInfo, runTests };

if (require.main === module) {
  runTests();
}
