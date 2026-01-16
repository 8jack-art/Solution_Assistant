/**
 * 测试加载报告API
 * 运行方式: node test_load_reports.js
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// 测试配置
const TEST_PROJECT_ID = '27819b4e-4170-4623-b975-ecc2c99d3cbe'; // 请替换为实际项目ID

// 获取token (从localStorage或登录获取)
function getToken() {
  // 请替换为有效的token
  return localStorage.getItem('token') || 'YOUR_TOKEN_HERE';
}

async function testGetRecentCompletedReports() {
  console.log('='.repeat(60));
  console.log('测试获取最近已完成报告列表');
  console.log('='.repeat(60));
  
  try {
    const response = await axios.get(
      `${API_BASE_URL}/reports/project/${TEST_PROJECT_ID}/recent-completed`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      }
    );
    
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('\n✅ 测试成功！找到', response.data.reports?.length || 0, '个报告');
    } else {
      console.log('\n❌ 测试失败:', response.data.error);
    }
  } catch (error) {
    console.error('请求失败:');
    if (error.response) {
      console.error('  状态码:', error.response.status);
      console.error('  响应数据:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('  未收到响应');
    } else {
      console.error('  错误信息:', error.message);
    }
  }
}

async function testGetReportById(reportId) {
  console.log('\n' + '='.repeat(60));
  console.log('测试获取报告详情, reportId:', reportId);
  console.log('='.repeat(60));
  
  try {
    const response = await axios.get(
      `${API_BASE_URL}/reports/${reportId}`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      }
    );
    
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('\n✅ 测试成功！');
      console.log('报告标题:', response.data.report?.report_title);
      console.log('生成状态:', response.data.report?.generation_status);
    } else {
      console.log('\n❌ 测试失败:', response.data.error);
    }
  } catch (error) {
    console.error('请求失败:');
    if (error.response) {
      console.error('  状态码:', error.response.status);
      console.error('  响应数据:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('  未收到响应');
    } else {
      console.error('  错误信息:', error.message);
    }
  }
}

async function testDeleteReport(reportId) {
  console.log('\n' + '='.repeat(60));
  console.log('测试删除报告, reportId:', reportId);
  console.log('='.repeat(60));
  
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/reports/${reportId}`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      }
    );
    
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('\n✅ 删除成功！');
    } else {
      console.log('\n❌ 删除失败:', response.data.error);
    }
  } catch (error) {
    console.error('请求失败:');
    if (error.response) {
      console.error('  状态码:', error.response.status);
      console.error('  响应数据:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('  未收到响应');
    } else {
      console.error('  错误信息:', error.message);
    }
  }
}

// 主测试函数
async function runTests() {
  console.log('开始测试加载报告API...\n');
  
  // 测试1: 获取最近已完成报告列表
  await testGetRecentCompletedReports();
  
  // 如果需要测试单个报告，可以取消注释以下行并传入reportId
  // await testGetReportById('REPORT_ID_HERE');
  // await testDeleteReport('REPORT_ID_HERE');
}

runTests().catch(console.error);
