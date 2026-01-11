# LLM配置管理页面优化方案

## 1. 问题概述

当前LLM配置管理页面存在以下问题需要优化：

1. **表单验证不完善** - 缺少实时验证和错误提示
2. **安全性不足** - API密钥明文显示和存储
3. **模型验证缺失** - 没有验证模型是否属于该服务商
4. **用户体验待提升** - 测试反馈不够详细
5. **重复配置检测** - 没有检测相同配置是否已存在

## 2. 优化目标

- 提升表单验证的准确性和用户体验
- 增强API密钥处理的安全性
- 完善配置验证逻辑
- 提供更详细的测试反馈
- 防止重复配置

## 3. 优化方案

### 3.1 前端优化 (client/src/pages/LLMConfigsManagement.tsx)

#### 3.1.1 API密钥脱敏显示
```typescript
// 添加可见性切换按钮
const [showApiKey, setShowApiKey] = useState(false)

// 密码输入框组件
<PasswordInput
  label="API 密钥 *"
  value={formData.api_key}
  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
  visibilityToggleLabel={showApiKey ? '隐藏密钥' : '显示密钥'}
/>
```

#### 3.1.2 实时表单验证
```typescript
// 添加验证状态
const [errors, setErrors] = useState({
  name: '',
  api_key: '',
  base_url: '',
  model: ''
})

// 验证函数
const validateField = (name: string, value: string): string => {
  switch (name) {
    case 'name':
      if (!value.trim()) return '配置名称不能为空'
      if (value.length < 2) return '配置名称至少2个字符'
      return ''
    case 'api_key':
      if (!value.trim()) return 'API密钥不能为空'
      if (value.length < 10) return 'API密钥格式不正确'
      return ''
    case 'base_url':
      if (!value.trim()) return '基础URL不能为空'
      try {
        new URL(value)
        return ''
      } catch {
        return '基础URL格式不正确'
      }
    case 'model':
      if (!value.trim()) return '模型名称不能为空'
      return ''
    default:
      return ''
  }
}
```

#### 3.1.3 重复配置检测
```typescript
// 检查是否已存在相同配置
const checkDuplicateConfig = (): boolean => {
  return configs.some(config => 
    config.provider === formData.provider &&
    config.base_url === formData.base_url &&
    config.model === formData.model &&
    config.id !== editingId // 编辑时排除自身
  )
}

// 提交前检测
if (checkDuplicateConfig()) {
  notifications.show({
    title: '配置重复',
    message: '已存在相同的配置，请使用现有配置或修改后创建',
    color: 'yellow',
  })
  return
}
```

#### 3.1.4 模型列表动态加载
```typescript
// 使用后端提供的模型列表
<Autocomplete
  label="模型名称 *"
  value={formData.model}
  onChange={(val) => {
    setFormData({ ...formData, model: val })
    // 触发字段验证
    const error = validateField('model', val)
    setErrors(prev => ({ ...prev, model: error }))
  }}
  data={selectedProvider?.models || []}
  error={errors.model}
  placeholder="请输入或选择模型名称"
  searchable
  creatable={selectedProvider?.id === 'custom'} // 自定义服务商可创建
  getCreateQuery={(query) => query}
/>
```

#### 3.1.5 增强测试反馈
```typescript
// 测试连接时显示更详细的信息
const handleTest = async (config?: LLMConfig) => {
  setTestLoading(true)
  
  try {
    const testData = config || formData
    const response = await llmConfigApi.testConnection(testData)
    
    if (response.success) {
      // 显示详细测试结果
      notifications.show({
        title: '✅ 连接测试成功',
        message: (
          <div className="test-result">
            <p>服务商: {testData.provider}</p>
            <p>模型: {testData.model}</p>
            <p>响应时间: {response.data?.responseTime}ms</p>
            <p>令牌使用: {response.data?.tokensUsed}</p>
          </div>
        ),
        color: 'green',
        autoClose: 8000,
      })
    } else {
      // 显示详细错误信息
      notifications.show({
        title: '❌ 连接测试失败',
        message: (
          <div>
            <p>错误类型: {response.data?.errorType}</p>
            <p>详细信息: {response.error}</p>
            <p>建议: {response.data?.suggestion}</p>
          </div>
        ),
        color: 'red',
        autoClose: false, // 不自动关闭
      })
    }
  } finally {
    setTestLoading(false)
  }
}
```

### 3.2 后端优化 (server/src/controllers/llmController.ts)

#### 3.2.1 增强模型验证
```typescript
// 添加模型验证函数
function validateModelForProvider(provider: string, model: string): boolean {
  const providerConfig = llmProviders.find(p => p.name === provider)
  if (!providerConfig) return provider.toLowerCase() === 'custom'
  return providerConfig.models.includes(model)
}

// 更新验证Schema
const createConfigSchema = z.object({
  name: z.string().min(1, '配置名称不能为空').max(100),
  provider: z.string().min(1, '服务提供商不能为空'),
  api_key: z.string().min(1, 'API密钥不能为空'),
  base_url: z.string().url().min(1, '基础URL不能为空'),
  model: z.string().min(1, '模型名称不能为空'),
  is_default: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // 验证模型是否属于该服务商
  if (!validateModelForProvider(data.provider, data.model)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `模型 ${data.model} 不属于服务商 ${data.provider}`,
      path: ['model'],
    })
  }
})
```

#### 3.2.2 增强测试连接响应
```typescript
static async testConnection(req: any, res: any) {
  try {
    const configData = testConnectionSchema.parse(req.body)
    
    const startTime = Date.now()
    const result = await LLMService.testConnection({...})
    const responseTime = Date.now() - startTime
    
    if (result.success) {
      res.json({
        success: true,
        data: { 
          message: '连接测试成功',
          content: result.content,
          responseTime,
          provider: configData.provider,
          model: configData.model
        }
      })
    } else {
      res.json({
        success: false,
        error: '连接测试失败',
        message: result.error,
        errorType: categorizeError(result.error),
        suggestion: getSuggestion(result.error)
      })
    }
  }
}

// 错误分类和建议
function categorizeError(error: string): string {
  if (error.includes('401')) return '认证错误'
  if (error.includes('403')) return '权限错误'
  if (error.includes('429')) return '速率限制'
  if (error.includes('timeout')) return '超时'
  return '其他错误'
}

function getSuggestion(error: string): string {
  if (error.includes('401')) return '请检查API密钥是否正确'
  if (error.includes('403')) return '请检查API密钥权限'
  if (error.includes('429')) return '请稍后再试或降低请求频率'
  if (error.includes('timeout')) return '请检查网络连接或增加超时时间'
  return '请检查配置信息是否正确'
}
```

#### 3.2.3 重复配置检测
```typescript
static async create(req: any, res: any) {
  const userId = req.user?.userId
  
  // 检查是否已存在相同配置
  const existingConfig = await LLMConfigModel.findByCredentials(
    userId,
    req.body.provider,
    req.body.base_url,
    req.body.model
  )
  
  if (existingConfig) {
    return res.status(409).json({
      success: false,
      error: '配置已存在',
      data: { existing_id: existingConfig.id }
    })
  }
  
  // 继续创建逻辑...
}
```

### 3.3 数据模型优化 (server/src/models/LLMConfig.ts)

#### 3.3.1 添加查询方法
```typescript
static async findByCredentials(
  userId: string, 
  provider: string, 
  baseUrl: string, 
  model: string
): Promise<LLMConfig | null> {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM llm_configs 
       WHERE user_id = ? AND provider = ? AND base_url = ? AND model = ?`,
      [userId, provider, baseUrl, model]
    )
    return rows.length > 0 ? rows[0] : null
  } catch (error) {
    console.error('查找配置失败:', error)
    return null
  }
}

static async findValidConfigs(userId: string): Promise<LLMConfig[]> {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM llm_configs 
       WHERE user_id = ? AND is_active = TRUE
       ORDER BY is_default DESC, updated_at DESC`,
      [userId]
    )
    return rows
  } catch (error) {
    console.error('查找有效配置失败:', error)
    return []
  }
}
```

#### 3.3.2 添加新字段
```sql
-- 数据库迁移脚本
ALTER TABLE llm_configs ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER is_default;
ALTER TABLE llm_configs ADD COLUMN last_used_at TIMESTAMP NULL AFTER updated_at;
ALTER TABLE llm_configs ADD COLUMN response_time_avg DECIMAL(10,2) NULL AFTER last_used_at;
```

### 3.4 安全性增强

#### 3.4.1 API密钥脱敏日志
```typescript
// 在日志输出时脱敏
function sanitizeForLog(config: any): any {
  return {
    ...config,
    api_key: config.api_key ? '***' + config.api_key.slice(-4) : null,
  }
}

// 使用
console.log('配置信息:', sanitizeForLog(config))
```

#### 3.4.2 响应中隐藏敏感信息
```typescript
// 在返回配置列表时隐藏API密钥
function sanitizeConfig(config: LLMConfig): Partial<LLMConfig> {
  const { api_key, ...safeConfig } = config
  return {
    ...safeConfig,
    has_api_key: !!api_key // 只返回是否有密钥的标识
  }
}
```

## 4. 实施计划

### Phase 1: 前端基础优化
1. 添加API密钥脱敏显示
2. 实现实时表单验证
3. 增强测试反馈信息

### Phase 2: 后端逻辑优化
1. 增强模型验证
2. 添加重复配置检测
3. 增强错误响应

### Phase 3: 安全性增强
1. API密钥脱敏日志
2. 响应数据脱敏
3. 数据库字段扩展

## 5. 测试用例

### 5.1 表单验证测试
- [ ] 空配置名称验证
- [ ] 无效URL格式验证
- [ ] 重复配置检测
- [ ] 模型不属于提供商验证

### 5.2 功能测试
- [ ] 创建新配置
- [ ] 编辑配置
- [ ] 删除配置
- [ ] 设置默认配置
- [ ] 测试连接成功
- [ ] 测试连接失败

### 5.3 安全性测试
- [ ] API密钥不显示在日志中
- [ ] API密钥不返回给前端
- [ ] 无权限用户无法操作
