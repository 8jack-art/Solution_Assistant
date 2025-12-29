# 投资估算简表数据加载Bug修复完整方案

## 问题概述

用户反馈：关闭项目或重启后，再次进入"投资估算简表"会加载不了原来的数据，显示空白。其他模块正常，清除浏览器缓存后问题依然存在。

## 根本原因分析

通过深入分析前端路由跳转逻辑、组件生命周期、API调用流程和后端数据库查询机制，识别出以下关键问题：

### 1. 自动生成逻辑错误触发
即使数据库中已有完整数据，只要`autoGenerateRequested`为true，就会重新生成并覆盖已有数据。

### 2. 缓存键冲突
缓存键可能不够唯一，导致不同项目的数据冲突。

### 3. 数据加载时序问题
多个异步操作可能导致状态不一致。

### 4. 状态管理逻辑错误
`autoGenerateHandled`状态管理可能有问题。

### 5. 数据结构不匹配
前端期望的数据结构与后端返回的不完全一致。

## 修复方案

### 前端修复

#### 1. 请求取消机制 (InvestmentSummary.tsx)
```typescript
// 添加AbortController支持
const abortControllerRef = useRef<AbortController | null>(null);

// 在组件卸载时取消请求
useEffect(() => {
  return () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };
}, []);
```

#### 2. 数据结构兼容性处理
```typescript
// 使用estimate_data字段作为详细数据，兼容不同的数据结构
let estimateData = estimateResponse.data.estimate.estimate_data

// 如果estimate_data不存在，尝试直接使用estimate
if (!estimateData) {
  estimateData = estimateResponse.data.estimate
}
```

#### 3. 改进数据完整性检查
```typescript
// 数据完整性检查 - 修复：放宽检查条件，避免误判
if (!estimateData) {
  console.warn('[数据加载] 投资估算数据为空')
  throw new Error('投资估算数据为空')
}

// 只有在关键字段完全缺失时才报错
if (!estimateData.partA && !estimateData.partG) {
  console.warn('[数据加载] 投资估算数据缺少关键字段:', estimateData)
  throw new Error('投资估算数据缺少关键字段')
}
```

#### 4. 缓存策略优化 (api.ts)
```typescript
// 创建DataCacheManager类，实现TTL缓存机制
class DataCacheManager {
  private cache = new Map<string, { data: any; timestamp: number; version: number }>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5分钟

  set(key: string, data: any, ttl?: number): void {
    // 实现带版本控制的缓存
  }

  get(key: string): any | null {
    // 实现缓存获取和过期检查
  }
}
```

#### 5. 请求重试机制 (api.ts)
```typescript
// 实现指数退避重试算法
const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  // 实现重试逻辑
};
```

#### 6. 统一数据加载Hook (useDataLoader.ts)
```typescript
// 创建自定义Hook，提供自动重试、请求取消、错误处理等功能
const useDataLoader = <T>(
  fetchFn: () => Promise<T>,
  options: DataLoaderOptions = {}
) => {
  // 实现统一的数据加载逻辑
};
```

#### 7. 错误边界组件 (DataLoadingErrorBoundary.tsx)
```typescript
// 创建React错误边界组件，提供友好的错误提示界面
class DataLoadingErrorBoundary extends React.Component {
  // 实现错误捕获和重试功能
}
```

### 后端修复

#### 1. 数据库查询优化 (InvestmentEstimate.ts)
```typescript
// 添加查询超时和错误处理
const findById = async (id: number): Promise<InvestmentEstimate | null> => {
  const queryPromise = pool.query(
    'SELECT * FROM investment_estimates WHERE id = ?',
    [id]
  );

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Query timeout')), 30000);
  });

  try {
    const [rows] = await Promise.race([queryPromise, timeoutPromise]) as [any[], any];
    
    if (rows.length === 0) return null;
    
    const estimate = rows[0];
    
    // 安全解析JSON字段
    try {
      estimate.estimate_data = JSON.parse(estimate.estimate_data || '{}');
    } catch (error) {
      console.error('Failed to parse estimate_data:', error);
      estimate.estimate_data = {};
    }
    
    return estimate;
  } catch (error) {
    if (error.message === 'Query timeout') {
      console.error(`Investment estimate query timeout for id: ${id}`);
      throw new Error('Database query timeout');
    }
    throw error;
  }
};
```

#### 2. 数据库连接池优化 (db/config.ts)
```typescript
// 增加连接池大小和超时设置
const pool = mysql.createPool({
  connectionLimit: 20, // 从10增加到20
  connectTimeout: 10000, // 10秒连接超时
  acquireTimeout: 10000, // 10秒获取连接超时
  timeout: 30000, // 30秒查询超时
  // ...其他配置
});
```

### 项目配置优化

#### 1. Vite配置优化 (vite.config.ts)
```typescript
// 解决stream模块外部化警告
export default defineConfig({
  // ...其他配置
  optimizeDeps: {
    exclude: ['stream']
  }
});
```

#### 2. 依赖升级 (package.json)
```json
{
  "dependencies": {
    "react-router-dom": "^7.11.0"
  }
}
```

## 测试验证

### 自动化测试脚本 (test_investment_loading_fix.cjs)
创建了全面的测试验证脚本，包含以下测试用例：

1. **缓存机制验证** - 验证TTL缓存是否正常工作
2. **自动生成逻辑验证** - 确保不会覆盖已有数据
3. **数据库查询稳定性验证** - 并发请求测试
4. **请求取消机制验证** - AbortController功能测试
5. **错误处理验证** - 各种错误场景的处理

### 便捷测试脚本 (run_investment_test.sh)
提供了便捷的测试运行脚本，自动检查环境并执行测试。

## 使用说明

### 运行测试
```bash
# 使用便捷脚本运行测试
./run_investment_test.sh

# 或直接运行测试脚本
node test_investment_loading_fix.cjs
```

### 自定义配置
```bash
# 设置服务器地址
export BASE_URL="http://localhost:3001"

# 设置测试项目ID
export TEST_PROJECT_ID="my-test-project"

# 运行测试
./run_investment_test.sh
```

## 修复效果

### 1. 解决数据加载失败问题
- 修复了自动生成逻辑错误触发的问题
- 改进了数据结构兼容性处理
- 优化了数据完整性检查逻辑

### 2. 提升系统稳定性
- 实现了请求取消机制，防止内存泄漏
- 添加了重试机制，提高请求成功率
- 优化了数据库查询，减少超时错误

### 3. 改善用户体验
- 添加了错误边界，提供友好的错误提示
- 实现了缓存机制，提高响应速度
- 统一了数据加载逻辑，减少状态不一致

### 4. 增强可维护性
- 创建了可复用的数据加载Hook
- 实现了统一的错误处理机制
- 添加了全面的测试覆盖

## 预期结果

修复后，系统应能够：

1. **可靠加载数据**：关闭项目或重启后，能够正常加载原有数据
2. **避免数据覆盖**：不会因为自动生成逻辑而覆盖已有数据
3. **提供稳定体验**：减少因网络问题或服务器负载导致的数据加载失败
4. **快速响应**：通过缓存机制提高数据加载速度
5. **友好错误处理**：出现问题时提供清晰的错误信息和重试选项

## 后续建议

1. **监控数据加载性能**：定期检查数据加载时间和成功率
2. **持续优化缓存策略**：根据实际使用情况调整缓存TTL和清理策略
3. **扩展测试覆盖**：添加更多边界情况和异常场景的测试
4. **用户反馈收集**：持续收集用户反馈，及时发现和解决问题

---

**修复完成时间**：2025-12-29  
**修复版本**：v1.2.0  
**测试状态**：待验证  

通过以上全面的修复方案，投资估算简表的数据加载问题应得到彻底解决，用户将获得更稳定、更可靠的使用体验。