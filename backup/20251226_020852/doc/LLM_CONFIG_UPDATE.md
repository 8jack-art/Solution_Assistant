# LLM 配置管理更新说明

## 🆕 新增功能

### 1. 主流服务商支持
添加了以下主流 LLM 服务商预设：

- **百炼** (阿里云)
  - 基础 URL: `https://dashscope.aliyuncs.com/api/v1`
  - 默认模型: `qwen-turbo`
  - 支持模型: qwen-turbo, qwen-plus, qwen-max, qwen2-7b-instruct, qwen2-72b-instruct

- **智谱AI**
  - 基础 URL: `https://open.bigmodel.cn/api/paas/v4`
  - 默认模型: `glm-4`
  - 支持模型: glm-3-turbo, glm-4, glm-4v, glm-4-plus, glm-4-air, glm-4-airx, glm-4-flash

- **火山方舟**
  - 基础 URL: `https://ark.cn-beijing.volces.com/api/v3`
  - 默认模型: `doubao-pro-4k`
  - 支持模型: doubao-pro-4k, doubao-pro-32k, doubao-pro-128k, doubao-lite-4k, doubao-lite-32k

- **硅基流动**
  - 基础 URL: `https://api.siliconflow.cn/v1`
  - 默认模型: `Qwen/Qwen2.5-7B-Instruct`
  - 支持模型: 多种 Qwen、DeepSeek、Llama 模型

- **自定义服务商**
  - 支持用户自定义服务商和模型

### 2. 智能自动填充
- 选择服务商后自动填充基础 URL
- 自动选择默认模型
- 自动生成配置名称（格式：服务商名 - 模型名）

### 3. 模型选择下拉列表
- 预设服务商显示模型下拉列表
- 自定义服务商支持手动输入模型名
- 模型列表从后端 API 动态获取

### 4. 明文密码输入
- API 密钥改为明文输入（非密码类型）
- 方便用户查看和编辑密钥

## 🔧 技术实现

### 后端更新
- 新增 `/api/llm/providers` 接口（无需认证）
- 添加 `llmProviders.ts` 配置文件
- 支持动态服务商配置管理

### 前端更新
- 新增 `Select` UI 组件
- 优化服务商选择体验
- 实现自动填充逻辑
- 响应式设计支持

## 🚀 使用说明

1. **选择服务商**: 从下拉列表选择主流服务商或"自定义服务商"
2. **自动填充**: 选择后自动填充 URL 和默认模型
3. **选择模型**: 从模型列表中选择或手动输入
4. **输入密钥**: 输入对应的 API 密钥
5. **测试连接**: 验证配置是否正确
6. **保存配置**: 创建或更新 LLM 配置

## 📱 用户体验优化

- **简化操作**: 减少手动输入
- **智能提示**: 自动完成配置信息
- **错误预防**: 预设正确的 API 地址
- **灵活选择**: 支持主流和自定义服务商

这些更新大大提升了 LLM 配置的易用性和用户体验！