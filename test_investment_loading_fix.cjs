/**
 * 投资估算简表数据加载Bug修复验证脚本
 * 
 * 测试目标：
 * 1. 验证缓存机制是否正常工作
 * 2. 验证自动生成逻辑是否不会覆盖已有数据
 * 3. 验证数据库查询的稳定性和重试机制
 * 4. 验证请求取消机制是否有效
 * 5. 验证错误处理是否完善
 */

const axios = require('axios');

// 配置
const API_BASE_URL = 'http://localhost:3001';
const TEST_PROJECT_ID = 'test-project-id'; // 替换为实际的项目ID

// 测试结果记录
const testResults = {
  cacheTest: { passed: false, details: [] },
  autoGenerateTest: { passed: false, details: [] },
  databaseStabilityTest: { passed: false, details: [] },
  requestCancellationTest: { passed: false, details: [] },
  errorHandlingTest: { passed: false, details: [] }
};

// 工具函数：记录测试结果
function logResult(testName, passed, message) {
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${testName}: ${message}`);
  if (testResults[testName]) {
    testResults[testName].passed = testResults[testName].passed && passed;
    testResults[testName].details.push({ passed, message });
  }
}

// 工具函数：延迟
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 测试1: 缓存机制验证
async function testCacheMechanism() {
  console.log('\n=== 测试1: 缓存机制验证 ===');
  
  try {
    // 第一次请求 - 应该从数据库获取
    console.log('第一次请求投资估算数据...');
    const startTime1 = Date.now();
    const response1 = await axios.get(`${API_BASE_URL}/investment/project/${TEST_PROJECT_ID}`);
    const duration1 = Date.now() - startTime1;
    
    logResult('cacheTest', response1.status === 200, `第一次请求成功，耗时${duration1}ms`);
    
    // 等待一小段时间
    await delay(100);
    
    // 第二次请求 - 应该从缓存获取
    console.log('第二次请求投资估算数据（预期从缓存获取）...');
    const startTime2 = Date.now();
    const response2 = await axios.get(`${API_BASE_URL}/investment/project/${TEST_PROJECT_ID}`);
    const duration2 = Date.now() - startTime2;
    
    logResult('cacheTest', response2.status === 200, `第二次请求成功，耗时${duration2}ms`);
    
    // 检查缓存是否生效（第二次请求应该更快）
    const cacheEffective = duration2 < duration1 * 0.8; // 第二次请求至少快20%
    logResult('cacheTest', cacheEffective, `缓存机制${cacheEffective ? '生效' : '可能未生效'}（第一次${duration1}ms，第二次${duration2}ms）`);
    
    // 检查数据一致性
    const dataConsistent = JSON.stringify(response1.data) === JSON.stringify(response2.data);
    logResult('cacheTest', dataConsistent, `数据一致性${dataConsistent ? '良好' : '有问题'}`);
    
  } catch (error) {
    logResult('cacheTest', false, `缓存测试失败: ${error.message}`);
  }
}

// 测试2: 自动生成逻辑验证
async function testAutoGenerateLogic() {
  console.log('\n=== 测试2: 自动生成逻辑验证 ===');
  
  try {
    // 创建一个测试项目（如果不存在）
    console.log('检查项目是否存在...');
    let projectResponse;
    try {
      projectResponse = await axios.get(`${API_BASE_URL}/projects/${TEST_PROJECT_ID}`);
      logResult('autoGenerateTest', projectResponse.status === 200, '项目存在');
    } catch (error) {
      logResult('autoGenerateTest', false, `项目不存在或获取失败: ${error.message}`);
      return;
    }
    
    // 检查是否已有投资估算数据
    console.log('检查投资估算数据...');
    const estimateResponse = await axios.get(`${API_BASE_URL}/investment/project/${TEST_PROJECT_ID}`);
    
    if (estimateResponse.data.success && estimateResponse.data.data?.estimate) {
      logResult('autoGenerateTest', true, '项目已有投资估算数据');
      
      // 尝试触发自动生成（应该跳过）
      console.log('尝试触发自动生成（应该跳过已有数据）...');
      const generateResponse = await axios.post(`${API_BASE_URL}/investment/generate/${TEST_PROJECT_ID}`, {
        // 空数据，模拟自动生成场景
      });
      
      // 检查是否真的跳过了自动生成
      if (generateResponse.data.success) {
        // 比较生成前后的数据，应该相同
        const dataUnchanged = JSON.stringify(estimateResponse.data.data.estimate) === 
                            JSON.stringify(generateResponse.data.data.estimate);
        logResult('autoGenerateTest', dataUnchanged, '自动生成正确跳过了已有数据');
      } else {
        logResult('autoGenerateTest', false, '自动生成请求失败');
      }
    } else {
      logResult('autoGenerateTest', true, '项目没有投资估算数据，自动生成应该正常工作');
      
      // 尝试自动生成
      console.log('尝试自动生成新数据...');
      const generateResponse = await axios.post(`${API_BASE_URL}/investment/generate/${TEST_PROJECT_ID}`, {});
      
      logResult('autoGenerateTest', generateResponse.data.success, 
                generateResponse.data.success ? '自动生成成功' : '自动生成失败');
    }
    
  } catch (error) {
    logResult('autoGenerateTest', false, `自动生成测试失败: ${error.message}`);
  }
}

// 测试3: 数据库查询稳定性验证
async function testDatabaseStability() {
  console.log('\n=== 测试3: 数据库查询稳定性验证 ===');
  
  try {
    const concurrentRequests = 5;
    const promises = [];
    
    // 并发发起多个请求，测试数据库连接池和重试机制
    console.log(`发起${concurrentRequests}个并发请求...`);
    
    for (let i = 0; i < concurrentRequests; i++) {
      const promise = axios.get(`${API_BASE_URL}/investment/project/${TEST_PROJECT_ID}`, {
        timeout: 35000 // 35秒超时，比后端的30秒稍长
      }).then(response => {
        return { index: i, success: true, data: response.data, duration: Date.now() };
      }).catch(error => {
        return { index: i, success: false, error: error.message, duration: Date.now() };
      });
      
      promises.push(promise);
    }
    
    const results = await Promise.all(promises);
    
    // 分析结果
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    logResult('databaseStabilityTest', successCount >= concurrentRequests * 0.8, 
              `${successCount}/${concurrentRequests}请求成功，${failureCount}失败`);
    
    // 检查响应时间
    const durations = results.filter(r => r.success).map(r => r.duration);
    if (durations.length > 0) {
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      
      logResult('databaseStabilityTest', avgDuration < 10000, 
                `平均响应时间${avgDuration.toFixed(0)}ms，最大${maxDuration}ms`);
    }
    
    // 检查数据一致性
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length > 1) {
      const firstData = JSON.stringify(successfulResults[0].data);
      const allConsistent = successfulResults.every(r => JSON.stringify(r.data) === firstData);
      logResult('databaseStabilityTest', allConsistent, '并发请求数据一致性良好');
    }
    
  } catch (error) {
    logResult('databaseStabilityTest', false, `数据库稳定性测试失败: ${error.message}`);
  }
}

// 测试4: 请求取消机制验证
async function testRequestCancellation() {
  console.log('\n=== 测试4: 请求取消机制验证 ===');
  
  try {
    // 创建一个可以被取消的请求
    const controller = new AbortController();
    const { signal } = controller;
    
    console.log('发起一个长时间运行的请求...');
    const requestPromise = axios.get(`${API_BASE_URL}/investment/project/${TEST_PROJECT_ID}`, {
      signal,
      timeout: 60000 // 60秒超时
    });
    
    // 等待一小段时间后取消请求
    setTimeout(() => {
      console.log('取消请求...');
      controller.abort();
    }, 100);
    
    try {
      await requestPromise;
      logResult('requestCancellationTest', false, '请求没有被正确取消');
    } catch (error) {
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        logResult('requestCancellationTest', true, '请求被正确取消');
      } else {
        logResult('requestCancellationTest', false, `请求取消失败: ${error.message}`);
      }
    }
    
  } catch (error) {
    logResult('requestCancellationTest', false, `请求取消测试失败: ${error.message}`);
  }
}

// 测试5: 错误处理验证
async function testErrorHandling() {
  console.log('\n=== 测试5: 错误处理验证 ===');
  
  try {
    // 测试无效项目ID
    console.log('测试无效项目ID...');
    try {
      const response = await axios.get(`${API_BASE_URL}/investment/project/invalid-id`);
      logResult('errorHandlingTest', false, '无效项目ID应该返回错误');
    } catch (error) {
      const isHandledGracefully = error.response && 
                             (error.response.status === 404 || error.response.status === 400);
      logResult('errorHandlingTest', isHandledGracefully, 
                `无效项目ID错误处理${isHandledGracefully ? '正确' : '不正确'} (${error.response?.status})`);
    }
    
    // 测试空项目ID
    console.log('测试空项目ID...');
    try {
      const response = await axios.get(`${API_BASE_URL}/investment/project/`);
      logResult('errorHandlingTest', false, '空项目ID应该返回错误');
    } catch (error) {
      const isHandledGracefully = error.response && 
                             (error.response.status === 404 || error.response.status === 400);
      logResult('errorHandlingTest', isHandledGracefully, 
                `空项目ID错误处理${isHandledGracefully ? '正确' : '不正确'} (${error.response?.status})`);
    }
    
    // 测试不存在的项目ID
    console.log('测试不存在的项目ID...');
    try {
      const response = await axios.get(`${API_BASE_URL}/investment/project/non-existent-project-12345`);
      if (response.data.success === false) {
        logResult('errorHandlingTest', true, '不存在的项目ID错误处理正确');
      } else {
        logResult('errorHandlingTest', false, '不存在的项目ID应该返回success: false');
      }
    } catch (error) {
      const isHandledGracefully = error.response && error.response.status === 404;
      logResult('errorHandlingTest', isHandledGracefully, 
                `不存在的项目ID错误处理${isHandledGracefully ? '正确' : '不正确'} (${error.response?.status})`);
    }
    
  } catch (error) {
    logResult('errorHandlingTest', false, `错误处理测试失败: ${error.message}`);
  }
}

// 主测试函数
async function runTests() {
  console.log('开始投资估算简表数据加载Bug修复验证测试...\n');
  
  // 检查服务器是否可用
  try {
    await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ 服务器连接正常\n');
  } catch (error) {
    console.error('❌ 无法连接到服务器，请确保服务器正在运行');
    process.exit(1);
  }
  
  // 运行所有测试
  await testCacheMechanism();
  await testAutoGenerateLogic();
  await testDatabaseStability();
  await testRequestCancellation();
  await testErrorHandling();
  
  // 输出测试总结
  console.log('\n=== 测试总结 ===');
  
  let totalPassed = 0;
  let totalTests = 0;
  
  Object.entries(testResults).forEach(([testName, result]) => {
    const passed = result.passed;
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}`);
    
    if (passed) totalPassed++;
    totalTests++;
    
    // 输出详细信息
    if (result.details && result.details.length > 0) {
      result.details.forEach(detail => {
        const detailStatus = detail.passed ? '  ✓' : '  ✗';
        console.log(`${detailStatus} ${detail.message}`);
      });
    }
  });
  
  console.log(`\n总体结果: ${totalPassed}/${totalTests} 测试通过`);
  
  if (totalPassed === totalTests) {
    console.log('🎉 所有测试通过！投资估算简表数据加载Bug修复成功！');
  } else {
    console.log('⚠️  部分测试失败，需要进一步检查修复效果。');
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testResults
};
