# LLM连接Debug工具设计方案

## 问题背景

百炼(Qwen)可以正常使用，但智谱AI、火山引擎、硅基流动无法使用。

## Debug工具设计

### 1. Server端Debug API

创建 `server/src/controllers/debugController.ts`：

```typescript
// 测试各提供商的连接，返回详细诊断信息
static async testProviderConnection(req, res) {
  const { provider, api_key, base_url, model } = req.body

  // 详细记录请求信息
  console.log('=== LLM连接诊断 ===')
  console.log('Provider:', provider)
  console.log('Base URL:', base_url)
  console.log('Model:', model)
  console.log('API Key长度:', api_key?.length)

  // 构建API路径
  let apiUrl = base_url
  if (!baseUrl.includes('/chat/completions')) {
    apiUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  }

  // 尝试不同的请求格式
  const testCases = [
    { name: '标准OpenAI格式', body: { model, messages: [...], max_tokens: 10, temperature: 0.1 } },
    { name: '不含temperature', body: { model, messages: [...], max_tokens: 10 } },
    { name: '不含max_tokens', body: { model, messages: [...], temperature: 0.1 } },
  ]

  for (const test of testCases) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api_key}`,
          // 尝试不同的Header
          ...(provider === 'zhipuai' && { 'Request-Id': generateUUID() }),
        },
        body: JSON.stringify(test.body),
      })

      const result = {
        testCase: test.name,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text(),
      }

      // 判断是否成功
      if (response.ok) {
        return res.json({ success: true, data: result })
      }
    } catch (error) {
      // 继续尝试下一个测试用例
    }
  }

  // 所有测试都失败
  return res.status(400).json({
    success: false,
    error: '所有请求格式都失败',
    diagnostic: { apiUrl, provider, model }
  })
}
```

### 2. Client端Debug页面

创建 `client/src/pages/LLMConfigsDebug.tsx`：

```typescript
// 显示详细的诊断信息
- 显示每个提供商的配置
- 提供"详细测试"按钮
- 显示完整的请求/响应日志
- 提供"一键修复"建议
```

### 3. 增强LLMService日志

在 `server/src/lib/llm.ts` 中添加详细日志：

```typescript
static async testConnection(config) {
  console.log('=== LLM连接测试开始 ===')
  console.log('Provider:', config.provider)
  console.log('Base URL:', config.base_url)
  console.log('Model:', config.model)
  console.log('API Key:', config.api_key?.substring(0, 8) + '...')

  // 尝试构建API URL
  let apiUrl = config.base_url
  if (!apiUrl.includes('/chat/completions')) {
    apiUrl = `${apiUrl.replace(/\/$/, '')}/chat/completions`
  }
  console.log('最终API URL:', apiUrl)

  // ... 执行请求
}
```

## 已知的提供商差异

### 智谱AI (Zhipu)
- Base URL: `https://open.bigmodel.cn/api/paas/v4`
- 可能需要 `Request-Id` header
- 模型名称可能需要特定格式

### 火山引擎
- Base URL: `https://ark.cn-beijing.volces.com/api/v3`
- 可能需要不同的认证方式
- 模型ID可能有特定格式

### 硅基流动
- Base URL: `https://api.siliconflow.cn/v1`
- 模型名称需要完整的owner/model格式
- 如 `deepseek-ai/DeepSeek-V3.2`

## 实现步骤

1. 创建 debugController.ts
2. 添加调试路由
3. 创建 client 调试页面
4. 增强 llm.ts 日志
5. 测试并修复
