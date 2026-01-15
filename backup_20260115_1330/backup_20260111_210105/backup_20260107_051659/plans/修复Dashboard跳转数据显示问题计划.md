# Dashboard跳转后数据显示问题修复计划

## 问题描述
从 Dashboard 页面点击项目的"估算"按钮进入投资估算简表模块时，页面显示"正在加载"状态，但数据库中已有投资估算数据。

## 问题根因分析

### 1. 路由跳转状态传递问题

在 Dashboard 页面中，跳转代码：
```typescript
// Dashboard.tsx
navigate(`/investment/${project.id}`)
```

问题：`navigate()` 没有传递 `state` 参数，导致 `InvestmentSummary.tsx` 中：
```typescript
const locationState = (location.state as { autoGenerate?: boolean } | null) || null
const autoGenerateRequested = Boolean(locationState?.autoGenerate)  // 始终为 false
```

### 2. 数据加载逻辑分支问题

在 `loadProjectAndEstimate` 函数中（第968-1032行）：

```typescript
// 检查是否需要自动生成
const shouldAutoGenerate = autoGenerateRequested &&
                          !autoGenerateHandled &&
                          (!estimateData ||
                           !estimateData.partA ||
                           !estimateData.partG ||
                           !estimateData.partA.children ||
                           estimateData.partA.children.length === 0)

if (shouldAutoGenerate) {
  // 自动生成逻辑
  ...
} else if (autoGenerateRequested && !autoGenerateHandled) {
  console.log(`[数据加载] 已有完整估算数据，跳过自动生成`)
  setAutoGenerateHandled(true)
}

// 问题：即使 estimateData 完整，这里没有确保 setEstimate 被调用
```

关键问题：当 `autoGenerateRequested = false` 且 `estimateData` 有完整数据时：
- 代码不会进入 `shouldAutoGenerate` 分支
- 不会进入 `else if` 分支（因为 `autoGenerateRequested` 为 false）
- **不会调用 `setEstimate(estimateData)`**

### 3. 缓存机制问题

在 `api.ts` 的 `getByProjectId` 函数中：
```typescript
if (options?.useCache !== false) {
  const cachedData = dataCache.get(cacheKey)
  if (cachedData) {
    return Promise.resolve(cachedData)
  }
}
```

从缓存返回时，可能返回旧数据或结构不一致的数据。

## 修复方案

### 修复1：修改Dashboard跳转代码

修改 Dashboard 页面的跳转逻辑，传递 `autoGenerate` 状态：

```typescript
// Dashboard.tsx - 跳转到投资估算页面时
const handleEstimateClick = (project: any) => {
  navigate(`/investment/${project.id}`, {
    state: { autoGenerate: false }  // 传递状态，告诉页面不要自动生成
  })
}
```

### 修复2：确保数据加载后正确设置estimate状态

修改 `loadProjectAndEstimate` 函数，确保无论 `autoGenerateRequested` 值如何，只要数据完整就设置 `estimate`：

```typescript
// 第968行附近 - 修改检查逻辑
const hasCompleteData = estimateData &&
                        estimateData.partA &&
                        estimateData.partG &&
                        estimateData.partA.children &&
                        estimateData.partA.children.length > 0

// 无论是否 autoGenerateRequested，只要有完整数据就设置 estimate
if (hasCompleteData) {
  console.log(`[数据加载] 已加载完整估算数据，设置到组件状态`)
  setTimeout(() => setEstimate(estimateData), 0)
  return  // 直接返回，不再检查 autoGenerateRequested
}

// 如果没有完整数据，才考虑自动生成
if (autoGenerateRequested && !autoGenerateHandled) {
  setAutoGenerateHandled(true)
  await generateEstimate(false, projectData)
}
```

### 修复3：改进缓存机制

修改 `api.ts` 的 `getByProjectId` 函数，在使用缓存时添加日志并确保数据新鲜度：

```typescript
getByProjectId: (projectId: string, options?: { signal?: AbortSignal; useCache?: boolean }) => {
  const cacheKey = `investment:${projectId}`
  
  // 尝试从缓存获取
  if (options?.useCache !== false) {
    const cachedData = dataCache.get(cacheKey)
    if (cachedData) {
      console.log(`[API] 使用缓存数据: ${cacheKey}`)
      
      // 检查缓存数据是否有效（不是空对象）
      if (cachedData.success && cachedData.data?.estimate?.estimate_data) {
        return Promise.resolve(cachedData)
      } else {
        console.log(`[API] 缓存数据无效，忽略缓存: ${cacheKey}`)
        dataCache.invalidate(cacheKey)  // 删除无效缓存
      }
    }
  }
  
  // 从服务器获取
  return retryRequest(async () => {
    ...
  })
}
```

## 实施步骤

### 步骤1：修改Dashboard跳转代码
- 文件：`client/src/pages/Dashboard.tsx`
- 修改：`handleEstimateClick` 或相关跳转逻辑

### 步骤2：修改InvestmentSummary数据加载逻辑
- 文件：`client/src/pages/InvestmentSummary.tsx`
- 修改：`loadProjectAndEstimate` 函数，确保数据完整时设置estimate

### 步骤3：改进缓存机制
- 文件：`client/src/lib/api.ts`
- 修改：`getByProjectId` 函数，添加缓存有效性检查

### 步骤4：测试验证
1. 从Dashboard进入有数据的项目，验证数据正确显示
2. 从Dashboard进入无数据的项目，验证自动生成功能正常
3. 刷新页面，验证缓存正常工作

## 预期效果
- 从Dashboard跳转后，页面能正确显示已有的投资估算数据
- 无数据时能正常触发自动生成
- 缓存机制更加健壮
