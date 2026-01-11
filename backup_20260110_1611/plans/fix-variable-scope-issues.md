# RevenueCostModeling.tsx 变量作用域问题修复方案

## 问题描述

在 `client/src/pages/RevenueCostModeling.tsx` 文件中存在多个变量作用域问题，导致运行时错误：

1. **主要错误**：第183行 `ReferenceError: projectData is not defined`
2. **潜在问题**：estimateData 和 revenueCostData 变量可能存在类似作用域问题

## 根本原因

变量在条件语句（if 块）内部定义，但在外部使用，导致作用域不匹配。

## 修复方案

### 方案一：变量提升（推荐）

将所有需要在多个条件块中使用的变量提升到函数作用域顶部：

```typescript
const loadProjectData = async () => {
  try {
    setLoading(true)
    
    // 获取store方法
    const { loadFromBackend } = useRevenueCostStore.getState()
    const [projectResponse, estimateResponse, revenueCostResponse] = await Promise.all([
      projectApi.getById(id!),
      investmentApi.getByProjectId(id!),
      revenueCostApi.getByProjectId(id!) // 加载收入成本数据
    ])
    
    // 将变量提升到函数作用域
    let projectData: any = null
    let estimateData: any = null
    let revenueCostData: any = null
    
    if (projectResponse.success && projectResponse.data) {
      projectData = projectResponse.data.project || projectResponse.data
      setProject(projectData)
      
      // 初始化还款期为运营期
      setRepaymentPeriod(projectData.operation_years || 0)
      
      // 初始化Zustand Store上下文
      setContext({
        projectId: projectData.id,
        projectName: projectData.project_name,
        constructionYears: projectData.construction_years,
        operationYears: projectData.operation_years,
        totalInvestment: projectData.total_investment,
      })
    } else {
      notifications.show({
        title: '错误',
        message: '加载项目数据失败',
        color: 'red',
      })
      navigate('/dashboard')
      return // 提前返回，避免后续处理
    }
    
    // 加载投资估算数据
    if (estimateResponse.success && estimateResponse.data?.estimate) {
      estimateData = estimateResponse.data.estimate
      console.log('✅ 成功加载投资估算数据:', estimateData)
      // ... 其他处理
    } else {
      console.warn('⚠️ 投资估算API响应异常:', estimateResponse)
    }
    
    // 现在可以安全地使用这些变量
    if (estimateData && projectData) {
      await saveConstructionInterestDetailsIfNeeded(estimateData, projectData)
    }
    
    // 加载收入成本数据（包括AI分析结果）
    if (revenueCostResponse.success && revenueCostResponse.data?.estimate) {
      revenueCostData = revenueCostResponse.data.estimate
      // ... 其他处理
    }
  } catch (error) {
    // 错误处理
  }
}
```

### 方案二：嵌套条件处理

保持变量在条件块内，但将相关操作也移入同一条件块：

```typescript
if (projectResponse.success && projectResponse.data) {
  const projectData = projectResponse.data.project || projectResponse.data
  setProject(projectData)
  
  if (estimateResponse.success && estimateResponse.data?.estimate) {
    const estimateData = estimateResponse.data.estimate
    // 在这里调用，确保两个变量都在作用域内
    await saveConstructionInterestDetailsIfNeeded(estimateData, projectData)
  }
}
```

## 推荐实施方案

**采用方案一（变量提升）**，原因如下：

1. **清晰性**：所有变量声明在函数顶部，易于理解和维护
2. **灵活性**：变量可以在函数的任何地方使用，不受条件块限制
3. **调试友好**：更容易设置断点和调试
4. **符合最佳实践**：遵循"声明在前，使用在后"的原则

## 其他文件检查

根据搜索结果，以下文件可能存在类似问题，需要检查：

1. `client/src/pages/InvestmentCalculator.backup.tsx`
2. `client/src/pages/InvestmentSummary.tsx`
3. `client/src/pages/InvestmentCalculator.tsx`

## 测试验证

修复后需要测试以下场景：

1. 正常加载项目数据
2. API响应异常情况
3. 部分数据缺失情况
4. 确保建设期利息详情自动保存功能正常工作

## 预防措施

1. **代码审查**：在代码审查中特别注意变量作用域
2. **ESLint规则**：启用相关ESLint规则检测作用域问题
3. **TypeScript严格模式**：使用更严格的TypeScript配置
4. **单元测试**：为关键函数编写单元测试

## 实施步骤

1. 修复 RevenueCostModeling.tsx 中的主要问题
2. 检查其他相关文件的类似问题
3. 运行测试确保功能正常
4. 更新相关文档和最佳实践指南