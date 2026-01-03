/**
 * 投资估算简表数据加载Bug修复验证脚本
 * 测试关闭项目或重启后数据加载问题
 */

const axios = require('axios');

// 配置
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const TEST_PROJECT_ID = process.env.TEST_PROJECT_ID || 'test-project-' + Date.now();

// 测试结果记录
const testResults = {
  cacheTest: { passed: false, details: [] },
  autoGenerateTest: { passed: false, details: [] },
  databaseQueryTest: { passed: false, details: [] },
  requestCancelTest: { passed: false, details: [] },
  errorHandlingTest: { passed: false, details: [] }
};

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 1. 测试缓存机制
async function testCacheMechanism() {
  log('\n=== 测试1: 缓存机制验证 ===', 'blue');
  
  try {
    // 第一次请求 - 应该从数据库获取
    log('发送第一次请求...', 'yellow');
    const start1 = Date.now();
    const response1 = await axios.get(`${BASE_URL}/api/investment/estimate/${TEST_PROJECT_ID}`);
    const duration1 = Date.now() - start1;
    
    log(`第一次请求完成，耗时: ${duration1}ms`, 'green');
    testResults.cacheTest.details.push(`第一次请求耗时: ${duration1}ms`);
    
    // 第二次请求 - 应该从缓存获取
    log('发送第二次请求...', 'yellow');
    const start2 = Date.now();
    const response2 = await axios.get(`${BASE_URL}/api/investment/estimate/${TEST_PROJECT_ID}`);
    const duration2 = Date.now() - start2;
    
    log(`第二次请求完成，耗时: ${duration2}ms`, 'green');
    testResults.cacheTest.details.push(`第二次请求耗时: ${duration2}ms`);
    
    // 验证缓存效果
    if (duration2 < duration1 * 0.5) {
      log('✓ 缓存机制工作正常，第二次请求明显更快', 'green');
      testResults.cacheTest.passed = true;
    } else {
      log('✗ 缓存机制可能未生效', 'red');
    }
    
    // 验证数据一致性
    if (JSON.stringify(response1.data) === JSON.stringify(response2.data)) {
      log('✓ 两次请求数据一致', 'green');
      testResults.cacheTest.details.push('数据一致性验证通过');
    } else {
      log('✗ 两次请求数据不一致', 'red');
      testResults.cacheTest.details.push('数据一致性验证失败');
    }
    
  } catch (error) {
    log(`✗ 缓存测试失败: ${error.message}`, 'red');
    testResults.cacheTest.details.push(`错误: ${error.message}`);
  }
}

// 2. 测试自动生成逻辑
async function testAutoGenerateLogic() {
  log('\n=== 测试2: 自动生成逻辑验证 ===', 'blue');
  
  try {
    // 创建一个已有数据的测试项目
    const testData = {
      projectId: TEST_PROJECT_ID,
      estimate: {
        partA: { total: 1000000 },
        partG: { total: 500000 },
        iterationCount: 5
      }
    };
    
    // 保存测试数据
    log('保存测试数据...', 'yellow');
    await axios.post(`${BASE_URL}/api/investment/estimate`, testData);
    log('测试数据保存成功', 'green');
    
    // 等待一秒确保数据保存完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 获取数据，验证是否触发了自动生成
    log('获取数据，检查自动生成逻辑...', 'yellow');
    const response = await axios.get(`${BASE_URL}/api/investment/estimate/${TEST_PROJECT_ID}`);
    
    if (response.data.success && response.data.data) {
      const estimateData = response.data.data.estimate_data || response.data.data;
      
      // 验证数据是否被自动生成覆盖
      if (estimateData.partA && estimateData.partA.total === 1000000) {
        log('✓ 原有数据保持完整，未触发不必要的自动生成', 'green');
        testResults.autoGenerateTest.passed = true;
        testResults.autoGenerateTest.details.push('原有数据保持完整');
      } else {
        log('✗ 数据可能被自动生成覆盖', 'red');
        testResults.autoGenerateTest.details.push('数据被自动生成覆盖');
      }
      
      // 检查autoGenerateRequested状态
      if (response.data.data.autoGenerateRequested === false) {
        log('✓ autoGenerateRequested状态正确', 'green');
        testResults.autoGenerateTest.details.push('autoGenerateRequested状态正确');
      } else {
        log('✗ autoGenerateRequested状态异常', 'red');
        testResults.autoGenerateTest.details.push('autoGenerateRequested状态异常');
      }
    }
    
  } catch (error) {
    log(`✗ 自动生成测试失败: ${error.message}`, 'red');
    testResults.autoGenerateTest.details.push(`错误: ${error.message}`);
  }
}

// 3. 测试数据库查询稳定性
async function testDatabaseQueryStability() {
  log('\n=== 测试3: 数据库查询稳定性验证 ===', 'blue');
  
  try {
    const promises = [];
    const requestCount = 10;
    
    // 并发发送多个请求
    log(`发送${requestCount}个并发请求...`, 'yellow');
    
    for (let i = 0; i < requestCount; i++) {
      promises.push(
        axios.get(`${BASE_URL}/api/investment/estimate/${TEST_PROJECT_ID}`)
          .then(response => ({ success: true, data: response.data, index: i }))
          .catch(error => ({ success: false, error: error.message, index: i }))
      );
    }
    
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    log(`成功请求: ${successCount}/${requestCount}`, 'green');
    log(`失败请求: ${errorCount}/${requestCount}`, errorCount > 0 ? 'red' : 'green');
    
    testResults.databaseQueryTest.details.push(`成功率: ${successCount}/${requestCount}`);
    
    // 检查数据一致性
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length > 1) {
      const firstData = JSON.stringify(successfulResults[0].data);
      const allConsistent = successfulResults.every(r => JSON.stringify(r.data) === firstData);
      
      if (allConsistent) {
        log('✓ 所有成功请求的数据一致', 'green');
        testResults.databaseQueryTest.details.push('数据一致性验证通过');
        testResults.databaseQueryTest.passed = true;
      } else {
        log('✗ 数据存在不一致', 'red');
        testResults.databaseQueryTest.details.push('数据一致性验证失败');
      }
    }
    
    // 检查错误类型
    const errors = results.filter(r => !r.success).map(r => r.error);
    const uniqueErrors = [...new Set(errors)];
    if (uniqueErrors.length > 0) {
      log(`遇到的错误类型: ${uniqueErrors.join(', ')}`, 'yellow');
      testResults.databaseQueryTest.details.push(`错误类型: ${uniqueErrors.join(', ')}`);
    }
    
  } catch (error) {
    log(`✗ 数据库查询测试失败: ${error.message}`, 'red');
    testResults.databaseQueryTest.details.push(`错误: ${error.message}`);
  }
}

// 4. 测试请求取消机制
async function testRequestCancellation() {
  log('\n=== 测试4: 请求取消机制验证 ===', 'blue');
  
  try {
    // 创建一个可以取消的请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 100); // 100ms后取消
    
    log('发送请求并在100ms后取消...', 'yellow');
    
    const startTime = Date.now();
    try {
      await axios.get(`${BASE_URL}/api/investment/estimate/${TEST_PROJECT_ID}`, {
        signal: controller.signal
      });
    } catch (error) {
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        const duration = Date.now() - startTime;
        log(`✓ 请求成功取消，耗时: ${duration}ms`, 'green');
        testResults.requestCancelTest.passed = true;
        testResults.requestCancelTest.details.push(`请求在${duration}ms后被取消`);
      } else {
        log(`✗ 请求取消失败，错误类型: ${error.name}`, 'red');
        testResults.requestCancelTest.details.push(`取消失败: ${error.message}`);
      }
    }
    
    clearTimeout(timeoutId);
    
  } catch (error) {
    log(`✗ 请求取消测试失败: ${error.message}`, 'red');
    testResults.requestCancelTest.details.push(`错误: ${error.message}`);
  }
}

// 5. 测试错误处理
async function testErrorHandling() {
  log('\n=== 测试5: 错误处理验证 ===', 'blue');
  
  try {
    // 测试不存在的项目ID
    log('请求不存在的项目ID...', 'yellow');
    const response = await axios.get(`${BASE_URL}/api/investment/estimate/non-existent-project`)
      .catch(error => error.response);
    
    if (response && response.status === 404) {
      log('✓ 正确处理404错误', 'green');
      testResults.errorHandlingTest.passed = true;
      testResults.errorHandlingTest.details.push('404错误处理正确');
    } else {
      log('✗ 404错误处理异常', 'red');
      testResults.errorHandlingTest.details.push('404错误处理异常');
    }
    
    // 测试错误响应格式
    if (response && response.data && response.data.success === false) {
      log('✓ 错误响应格式正确', 'green');
      testResults.errorHandlingTest.details.push('错误响应格式正确');
    } else {
      log('✗ 错误响应格式异常', 'red');
      testResults.errorHandlingTest.details.push('错误响应格式异常');
    }
    
  } catch (error) {
    log(`✗ 错误处理测试失败: ${error.message}`, 'red');
    testResults.errorHandlingTest.details.push(`错误: ${error.message}`);
  }
}

// 生成测试报告
function generateTestReport() {
  log('\n' + '='.repeat(50), 'blue');
  log('投资估算简表数据加载Bug修复测试报告', 'blue');
  log('='.repeat(50), 'blue');
  
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(test => test.passed).length;
  
  log(`\n总体结果: ${passedTests}/${totalTests} 测试通过`, passedTests === totalTests ? 'green' : 'yellow');
  
  Object.entries(testResults).forEach(([testName, result]) => {
    const status = result.passed ? '✓ 通过' : '✗ 失败';
    const color = result.passed ? 'green' : 'red';
    log(`\n${testName}: ${status}`, color);
    
    if (result.details.length > 0) {
      result.details.forEach(detail => {
        log(`  - ${detail}`, 'reset');
      });
    }
  });
  
  log('\n' + '='.repeat(50), 'blue');
  
  if (passedTests === totalTests) {
    log('🎉 所有测试通过！修复方案验证成功。', 'green');
  } else {
    log('⚠️  部分测试失败，需要进一步检查修复方案。', 'yellow');
  }
}

// 主函数
async function main() {
  log('开始投资估算简表数据加载Bug修复验证测试...', 'blue');
  log(`测试项目ID: ${TEST_PROJECT_ID}`, 'blue');
  log(`服务器地址: ${BASE_URL}`, 'blue');
  
  try {
    // 检查服务器是否可用
    await axios.get(`${BASE_URL}/api/health`).catch(() => {
      throw new Error('服务器不可用，请确保后端服务正在运行');
    });
    
    log('服务器连接正常，开始测试...', 'green');
    
    // 执行所有测试
    await testCacheMechanism();
    await testAutoGenerateLogic();
    await testDatabaseQueryStability();
    await testRequestCancellation();
    await testErrorHandling();
    
    // 生成测试报告
    generateTestReport();
    
  } catch (error) {
    log(`\n测试执行失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testCacheMechanism,
  testAutoGenerateLogic,
  testDatabaseQueryStability,
  testRequestCancellation,
  testErrorHandling,
  testResults
};
