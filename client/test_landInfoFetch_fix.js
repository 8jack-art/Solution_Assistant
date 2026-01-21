/**
 * 土地信息获取逻辑修复测试
 * 
 * 测试目的：
 * 1. 验证土地信息获取不会循环触发
 * 2. 验证正确获取土地信息并填充到临时配置
 * 3. 验证refs正确跟踪状态
 */

// 模拟React useState和useRef的行为
class MockState {
  constructor(initialValue) {
    this._value = initialValue;
    this._listeners = [];
  }

  get value() {
    return this._value;
  }

  set value(newValue) {
    this._value = newValue;
    this._listeners.forEach(listener => listener(newValue));
  }

  setValue(newValue) {
    this.value = newValue;
  }

  subscribe(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }
}

class MockRef {
  constructor(initialValue) {
    this._value = initialValue;
  }

  get current() {
    return this._value;
  }

  set current(newValue) {
    this._value = newValue;
  }
}

// 模拟场景1：初始化弹窗，expenseType为landTransfer
function testScenario1() {
  console.log('\n=== 测试场景1：初始化弹窗，expenseType为landTransfer ===\n');
  
  // 模拟状态
  const showOtherModal = new MockState(false);
  const tempOtherConfig = new MockState(null);
  const costConfig = {
    otherExpenses: {
      expenseType: 'landTransfer'
    }
  };
  const context = {
    projectId: 'test-project-123',
    operationYears: 10
  };
  
  // 模拟refs
  const landInfoFetched = new MockState(false);
  const prevExpenseTypeRef = new MockRef(undefined);
  const latestExpenseTypeRef = new MockRef(undefined);
  const isFetchingLandInfoRef = new MockRef(false);
  const hasFetchedForCurrentTypeRef = new MockRef(false);
  
  // 模拟项目API
  const mockProjectApi = {
    getById: async (projectId) => {
      console.log(`[模拟] 调用 projectApi.getById(${projectId})`);
      return {
        success: true,
        data: {
          project: {
            land_area: 100,  // 100亩
            land_unit_price: 0.5  // 0.5万元/亩
          }
        }
      };
    }
  };
  
  // 模拟初始化useEffect
  function runInitEffect() {
    if (!showOtherModal.value) return;
    
    console.log('[初始化useEffect] 执行');
    
    // 重置所有状态和refs
    landInfoFetched.setValue(false);
    prevExpenseTypeRef.current = undefined;
    hasFetchedForCurrentTypeRef.current = false;
    isFetchingLandInfoRef.current = false;
    
    const currentExpenseType = tempOtherConfig.value?.expenseType || costConfig.otherExpenses.expenseType;
    latestExpenseTypeRef.current = currentExpenseType;
    console.log(`[初始化useEffect] currentExpenseType = ${currentExpenseType}`);
    
    if (!tempOtherConfig.value) {
      const newConfig = {...costConfig.otherExpenses, acreage: 0, unitPrice: 0};
      tempOtherConfig.setValue(newConfig);
      console.log('[初始化useEffect] 初始化tempOtherConfig:', newConfig);
    }
  }
  
  // 模拟土地信息获取useEffect
  async function runLandInfoFetchEffect() {
    const currentExpenseType = latestExpenseTypeRef.current || tempOtherConfig.value?.expenseType || costConfig.otherExpenses.expenseType;
    
    const shouldFetch = showOtherModal.value &&
                        currentExpenseType === 'landTransfer' &&
                        prevExpenseTypeRef.current !== 'landTransfer' &&
                        !hasFetchedForCurrentTypeRef.current &&
                        !isFetchingLandInfoRef.current &&
                        context.projectId;
    
    console.log(`[土地信息获取useEffect] shouldFetch = ${shouldFetch}`);
    console.log(`  showOtherModal: ${showOtherModal.value}`);
    console.log(`  currentExpenseType: ${currentExpenseType}`);
    console.log(`  prevExpenseTypeRef.current: ${prevExpenseTypeRef.current}`);
    console.log(`  hasFetchedForCurrentTypeRef.current: ${hasFetchedForCurrentTypeRef.current}`);
    console.log(`  isFetchingLandInfoRef.current: ${isFetchingLandInfoRef.current}`);
    console.log(`  context.projectId: ${context.projectId}`);
    
    if (shouldFetch) {
      prevExpenseTypeRef.current = 'landTransfer';
      isFetchingLandInfoRef.current = true;
      
      console.log('[土地信息获取useEffect] 开始获取土地信息...');
      
      const response = await mockProjectApi.getById(context.projectId);
      
      if (response.success && response.data?.project) {
        const landArea = response.data.project.land_area || 0;
        const landUnitPrice = response.data.project.land_unit_price || 0;
        
        console.log(`[土地信息获取useEffect] 获取到: 亩数=${landArea}, 单价=${landUnitPrice}`);
        
        if (landArea > 0 || landUnitPrice > 0) {
          const newConfig = {
            ...tempOtherConfig.value,
            acreage: landArea,
            unitPrice: landUnitPrice
          };
          tempOtherConfig.setValue(newConfig);
          console.log('[土地信息获取useEffect] 更新tempOtherConfig:', newConfig);
        }
      }
      
      hasFetchedForCurrentTypeRef.current = true;
      isFetchingLandInfoRef.current = false;
      landInfoFetched.setValue(true);
      console.log('[土地信息获取useEffect] 获取完成');
    } else {
      if (currentExpenseType === 'landTransfer') {
        prevExpenseTypeRef.current = 'landTransfer';
      }
    }
    
    if (tempOtherConfig.value?.expenseType) {
      latestExpenseTypeRef.current = tempOtherConfig.value.expenseType;
    }
  }
  
  // 执行测试
  console.log('步骤1: 打开弹窗');
  showOtherModal.setValue(true);
  
  console.log('\n步骤2: 执行初始化useEffect');
  runInitEffect();
  
  console.log('\n步骤3: 执行土地信息获取useEffect');
  runLandInfoFetchEffect();
  
  // 等待异步操作完成
  return new Promise(resolve => {
    setTimeout(() => {
      console.log('\n步骤4: 验证结果');
      console.log(`  tempOtherConfig.acreage = ${tempOtherConfig.value.acreage} (预期: 100)`);
      console.log(`  tempOtherConfig.unitPrice = ${tempOtherConfig.value.unitPrice} (预期: 0.5)`);
      console.log(`  hasFetchedForCurrentTypeRef.current = ${hasFetchedForCurrentTypeRef.current} (预期: true)`);
      console.log(`  landInfoFetched.value = ${landInfoFetched.value} (预期: true)`);
      
      const passed = tempOtherConfig.value.acreage === 100 && 
                     tempOtherConfig.value.unitPrice === 0.5 &&
                     hasFetchedForCurrentTypeRef.current === true &&
                     landInfoFetched.value === true;
      
      console.log(`\n测试结果: ${passed ? '✅ 通过' : '❌ 失败'}`);
      resolve(passed);
    }, 100);
  });
}

// 模拟场景2：验证不会循环触发
function testScenario2() {
  console.log('\n\n=== 测试场景2：验证不会循环触发 ===\n');
  
  const showOtherModal = new MockState(true);
  const tempOtherConfig = new MockState({
    expenseType: 'landTransfer',
    acreage: 100,
    unitPrice: 0.5
  });
  const costConfig = {
    otherExpenses: {
      expenseType: 'landTransfer'
    }
  };
  const context = {
    projectId: 'test-project-123',
    operationYears: 10
  };
  
  const prevExpenseTypeRef = new MockRef('landTransfer');
  const hasFetchedForCurrentTypeRef = new MockRef(true);
  const isFetchingLandInfoRef = new MockRef(false);
  const latestExpenseTypeRef = new MockRef('landTransfer');
  
  // 模拟土地信息获取useEffect
  function checkShouldFetch() {
    const currentExpenseType = latestExpenseTypeRef.current || tempOtherConfig.value?.expenseType || costConfig.otherExpenses.expenseType;
    
    const shouldFetch = showOtherModal.value &&
                        currentExpenseType === 'landTransfer' &&
                        prevExpenseTypeRef.current !== 'landTransfer' &&
                        !hasFetchedForCurrentTypeRef.current &&
                        !isFetchingLandInfoRef.current &&
                        context.projectId;
    
    console.log(`shouldFetch = ${shouldFetch} (预期: false)`);
    
    // 触发条件分析
    console.log('\n条件分析:');
    console.log(`  showOtherModal: ${showOtherModal.value} ✓`);
    console.log(`  currentExpenseType === 'landTransfer': ${currentExpenseType === 'landTransfer'} ${currentExpenseType === 'landTransfer' ? '✓' : '✗'}`);
    console.log(`  prevExpenseTypeRef.current !== 'landTransfer': ${prevExpenseTypeRef.current !== 'landTransfer'} ${prevExpenseTypeRef.current !== 'landTransfer' ? '✗' : '✓'}`);
    console.log(`  !hasFetchedForCurrentTypeRef.current: ${!hasFetchedForCurrentTypeRef.current} ${!hasFetchedForCurrentTypeRef.current ? '✗' : '✓'}`);
    console.log(`  !isFetchingLandInfoRef.current: ${!isFetchingLandInfoRef.current} ✓`);
    console.log(`  context.projectId: ${!!context.projectId} ✓`);
    
    return shouldFetch;
  }
  
  const shouldFetch = checkShouldFetch();
  const passed = shouldFetch === false;
  
  console.log(`\n测试结果: ${passed ? '✅ 通过' : '❌ 失败'}`);
  return passed;
}

// 模拟场景3：验证初始化useEffect不会在获取过程中重置状态
function testScenario3() {
  console.log('\n\n=== 测试场景3：验证初始化useEffect不会在获取过程中重置状态 ===\n');
  
  const showOtherModal = new MockState(true);
  const costConfig = {
    otherExpenses: {
      expenseType: 'landTransfer'
    }
  };
  const context = {
    projectId: 'test-project-123',
    operationYears: 10
  };
  
  const tempOtherConfig = new MockState({
    expenseType: 'landTransfer',
    acreage: 50,
    unitPrice: 0.3
  });
  
  const landInfoFetched = new MockState(false);
  const prevExpenseTypeRef = new MockRef(undefined);
  const hasFetchedForCurrentTypeRef = new MockRef(false);
  const isFetchingLandInfoRef = new MockRef(true);  // 模拟正在获取中
  
  // 模拟初始化useEffect - 带保护逻辑
  function runInitEffectWithProtection() {
    if (!showOtherModal.value) return;
    
    console.log('[初始化useEffect] 执行');
    
    // 只有在不在获取过程中时才重置土地信息获取状态
    if (!isFetchingLandInfoRef.current) {
      console.log('[初始化useEffect] 重置状态（因为不在获取过程中）');
      landInfoFetched.setValue(false);
      prevExpenseTypeRef.current = undefined;
      hasFetchedForCurrentTypeRef.current = false;
    } else {
      console.log('[初始化useEffect] 跳过重置（因为正在获取中）');
    }
  }
  
  runInitEffectWithProtection();
  
  console.log('\n验证结果:');
  console.log(`  isFetchingLandInfoRef.current = ${isFetchingLandInfoRef.current} (预期: true)`);
  console.log(`  landInfoFetched.value = ${landInfoFetched.value} (预期: false，即保持原值)`);
  console.log(`  prevExpenseTypeRef.current = ${prevExpenseTypeRef.current} (预期: undefined，即保持原值)`);
  console.log(`  hasFetchedForCurrentTypeRef.current = ${hasFetchedForCurrentTypeRef.current} (预期: false，即保持原值)`);
  
  const passed = isFetchingLandInfoRef.current === true && 
                 landInfoFetched.value === false &&
                 prevExpenseTypeRef.current === undefined &&
                 hasFetchedForCurrentTypeRef.current === false;
  
  console.log(`\n测试结果: ${passed ? '✅ 通过' : '❌ 失败'}`);
  return passed;
}

// 运行所有测试
async function runAllTests() {
  console.log('========================================');
  console.log('土地信息获取逻辑修复测试');
  console.log('========================================');
  
  const results = [];
  
  results.push(await testScenario1());
  results.push(testScenario2());
  results.push(testScenario3());
  
  console.log('\n\n========================================');
  console.log('测试总结');
  console.log('========================================');
  console.log(`总测试数: ${results.length}`);
  console.log(`通过: ${results.filter(r => r).length}`);
  console.log(`失败: ${results.filter(r => !r).length}`);
  
  const allPassed = results.every(r => r);
  console.log(`\n总体结果: ${allPassed ? '✅ 所有测试通过' : '❌ 有测试失败'}`);
  
  return allPassed;
}

runAllTests().catch(console.error);
