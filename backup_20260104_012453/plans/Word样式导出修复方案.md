# Word 样式导出修复方案

## 需求变更

在原有修复方案基础上，新增以下需求：

1. **添加首行缩进设置** - 段落首行缩进2字符
2. **样式保存到数据库** - 用户设置的样式可以保存，下次自动加载

## 问题描述

前端已实现样式设置功能，但导出 Word 时样式没有被应用。

## 修改方案

### 1. 添加首行缩进设置

**文件**: `client/src/types/report.ts`

在 `ReportStyleConfig.paragraph` 中添加 `firstLineIndent` 字段：

```typescript
paragraph: {
  lineSpacing: number | 'fixed'
  lineSpacingValue?: number
  spaceBefore: number
  spaceAfter: number
  firstLineIndent: number  // 新增：首行缩进（字符数），默认2
}
```

### 2. 修改样式设置面板

**文件**: `client/src/components/report/StyleSettingsPanel.tsx`

在"段落设置"部分添加首行缩进选项：

```typescript
// 首行缩进选项
const firstLineIndentOptions = [
  { value: 0, label: '无缩进' },
  { value: 2, label: '2字符（标准）' },
  { value: 4, label: '4字符' }
]
```

### 3. 修改后端样式应用

**文件**: `server/src/services/reportService.ts`

在 `createStyledParagraph` 方法中应用首行缩进：

```typescript
return new Paragraph({
  children: [...],
  heading: isHeading ? headingLevel : undefined,
  alignment: alignment,
  indent: {
    firstLine: (styleConfig.paragraph.firstLineIndent || 0) * 200 // 1字符约200twip
  },
  spacing: {...}
})
```

### 4. 样式保存到数据库

#### 4.1 创建数据库表

```sql
CREATE TABLE report_style_configs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) DEFAULT '默认样式',
  config_data JSON NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 4.2 添加后端 API

**文件**: `server/src/routes/report.ts`

```typescript
// 保存样式配置
router.post('/style-configs', authenticate, reportController.saveStyleConfig)

// 获取样式配置列表
router.get('/style-configs', authenticate, reportController.getStyleConfigs)

// 获取默认样式配置
router.get('/style-configs/default', authenticate, reportController.getDefaultStyleConfig)

// 删除样式配置
router.delete('/style-configs/:id', authenticate, reportController.deleteStyleConfig)
```

#### 4.3 添加后端 Controller 方法

**文件**: `server/src/controllers/reportController.ts`

```typescript
static async saveStyleConfig(req: Request, res: Response): Promise<void> {
  const { name, config, isDefault } = req.body
  const userId = ReportController.getUserId(req)
  
  // 保存到数据库...
}

static async getStyleConfigs(req: Request, res: Response): Promise<void> {
  // 查询用户的样式配置列表...
}
```

#### 4.4 添加前端 API 和 Store

**文件**: `client/src/services/reportApi.ts`

```typescript
// 保存样式配置
async saveStyleConfig(data: { name: string; config: ReportStyleConfig; isDefault?: boolean }) {
  const response = await api.post('/report/style-configs', data)
  return response
}

// 获取样式配置列表
async getStyleConfigs() {
  const response = await api.get('/report/style-configs')
  return response
}
```

**文件**: `client/src/stores/reportStore.ts`

添加样式保存/加载方法：

```typescript
// 样式配置保存/加载
saveStyleConfig: async (name: string) => {...},
loadStyleConfigs: async () => {...},
applyStyleConfig: (config: ReportStyleConfig) => {...}
```

#### 4.5 修改样式设置面板

添加"保存样式"和"加载样式"功能：

```typescript
// 在 StyleSettingsPanel 中添加
const [savedConfigs, setSavedConfigs] = useState<StyleConfigSummary[]>([])

const handleSave = async () => {
  const name = await prompt('请输入样式名称')
  await store.saveStyleConfig(name, styleConfig)
}

const handleLoad = (config: ReportStyleConfig) => {
  store.updateStyleConfig(config)
}
```

## 修改清单

| 序号 | 文件 | 修改内容 |
|------|------|----------|
| 1 | `client/src/types/report.ts` | 添加 `firstLineIndent` 字段 |
| 2 | `client/src/components/report/StyleSettingsPanel.tsx` | 添加首行缩进选项、保存/加载功能 |
| 3 | `server/src/services/reportService.ts` | 应用首行缩进样式 |
| 4 | `server/src/db/migrations/xxx.sql` | 创建 `report_style_configs` 表 |
| 5 | `server/src/routes/report.ts` | 添加样式配置 API 路由 |
| 6 | `server/src/controllers/reportController.ts` | 添加样式配置 CRUD 方法 |
| 7 | `client/src/services/reportApi.ts` | 添加样式配置 API 调用 |
| 8 | `client/src/stores/reportStore.ts` | 添加样式保存/加载方法 |

## 验证步骤

1. 修改代码后启动前后端服务
2. 在"报告生成"页面点击"样式设置"按钮
3. 验证首行缩进选项是否存在
4. 设置样式后点击"保存"，验证保存成功
5. 重新打开样式设置，点击"加载"验证样式恢复
6. 导出 Word 文档，验证样式生效
