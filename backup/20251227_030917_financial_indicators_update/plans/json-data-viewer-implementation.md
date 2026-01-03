# JSON 数据查看器功能实现方案

## 需求概述

在"项目投资现金流量配置"模块中添加一个图标按钮，点击后从后端拉取"营业收入、营业税金及附加和增值税估算表"与"总成本费用估算表"的完整 JSON 数据，并在模态框中以美观的方式展示，支持语法高亮、层级折叠、搜索和复制功能。

## 技术架构

### 1. 前端组件结构

```
client/src/components/revenue-cost/
├── FinancialIndicatorsTable.tsx (修改)
└── JsonDataViewer.tsx (新建)
```

### 2. 数据流

```
用户点击按钮 
  → 调用 revenueCostApi.getByProjectId() 
  → 从后端获取数据 
  → 解析 revenueTableData 和 costTableData 
  → 在 JsonDataViewer 中展示
```

## 详细实现步骤

### 步骤 1: 在 FinancialIndicatorsTable 中添加 JSON 查看按钮

**位置**: [`FinancialIndicatorsTable.tsx`](client/src/components/revenue-cost/FinancialIndicatorsTable.tsx:2126-2142)

**修改内容**:
- 在操作栏中添加一个新的 ActionIcon 按钮
- 使用 `IconCode` 或 `IconDatabase` 图标
- 添加点击事件处理函数
- 添加状态管理（loading, error, jsonData）

**代码示例**:
```typescript
import { IconCode } from '@tabler/icons-react'

// 添加状态
const [showJsonViewer, setShowJsonViewer] = useState(false)
const [jsonLoading, setJsonLoading] = useState(false)
const [jsonError, setJsonError] = useState<string | null>(null)
const [jsonData, setJsonData] = useState<any>(null)

// 添加按钮到操作栏
<ActionIcon
  variant="light"
  color="blue"
  size="lg"
  onClick={handleViewJsonData}
  loading={jsonLoading}
>
  <IconCode size={20} />
</ActionIcon>
```

### 步骤 2: 创建 JsonDataViewer 组件

**新建文件**: [`JsonDataViewer.tsx`](client/src/components/revenue-cost/JsonDataViewer.tsx)

**功能特性**:
1. **语法高亮**: 使用 `react-syntax-highlighter` 库
2. **层级折叠**: 使用 `react-json-tree` 或自定义实现
3. **关键字搜索**: 实时过滤 JSON 数据
4. **一键复制**: 复制 JSON 到剪贴板
5. **加载状态**: 显示加载动画
6. **错误处理**: 显示错误信息

**组件结构**:
```typescript
interface JsonDataViewerProps {
  opened: boolean
  onClose: () => void
  data: any
  loading: boolean
  error: string | null
}

const JsonDataViewer: React.FC<JsonDataViewerProps> = ({
  opened,
  onClose,
  data,
  loading,
  error
}) => {
  // 实现搜索、折叠、复制等功能
}
```

### 步骤 3: 实现数据获取逻辑

**位置**: [`FinancialIndicatorsTable.tsx`](client/src/components/revenue-cost/FinancialIndicatorsTable.tsx)

**函数**: `handleViewJsonData`

**实现逻辑**:
```typescript
const handleViewJsonData = async () => {
  setJsonLoading(true)
  setJsonError(null)
  
  try {
    const projectId = context?.projectId
    if (!projectId) {
      throw new Error('项目ID不存在')
    }
    
    // 从 store 获取数据（如果已加载）
    const { revenueTableData, costTableData } = useRevenueCostStore.getState()
    
    if (revenueTableData && costTableData) {
      setJsonData({
        revenueTable: revenueTableData,
        costTable: costTableData
      })
    } else {
      // 从后端获取
      const response = await revenueCostApi.getByProjectId(projectId)
      if (response.success && response.data?.estimate?.model_data) {
        const modelData = response.data.estimate.model_data
        setJsonData({
          revenueTable: modelData.revenueTableData,
          costTable: modelData.costTableData
        })
      } else {
        throw new Error('获取数据失败')
      }
    }
    
    setShowJsonViewer(true)
  } catch (error: any) {
    setJsonError(error.message || '获取数据失败')
    notifications.show({
      title: '错误',
      message: error.message || '获取数据失败',
      color: 'red'
    })
  } finally {
    setJsonLoading(false)
  }
}
```

### 步骤 4: JsonDataViewer 组件详细设计

#### 4.1 依赖库

需要安装以下库：
```bash
npm install react-syntax-highlighter react-json-tree
npm install --save-dev @types/react-syntax-highlighter
```

#### 4.2 组件功能

**搜索功能**:
- 输入框实时搜索
- 高亮匹配的键和值
- 支持正则表达式

**折叠功能**:
- 默认展开第一层
- 点击可折叠/展开
- 提供"全部展开"和"全部折叠"按钮

**复制功能**:
- 一键复制 JSON 数据
- 复制成功提示

**语法高亮**:
- 使用 `react-syntax-highlighter` 的 JSON 主题
- 自定义颜色方案

#### 4.3 UI 设计

**模态框样式**:
- 宽度: 90vw
- 最大宽度: 1400px
- 高度: 85vh
- 可滚动内容区

**工具栏**:
- 搜索框
- 全部展开/折叠按钮
- 复制按钮
- 关闭按钮

**数据展示区**:
- 分为两个标签页：营业收入表、总成本费用表
- 每个标签页显示对应的 JSON 数据

### 步骤 5: 加载状态和错误处理

**加载状态**:
- 按钮显示 loading 动画
- 模态框显示加载指示器

**错误处理**:
- 显示错误消息
- 提供重试按钮
- 使用 Mantine 的 notifications 显示错误

## 数据结构

### 营业收入表数据结构 (RevenueTableData)

```typescript
interface RevenueTableData {
  urbanTaxRate: number;    // 城市建设维护税税率
  rows: Array<{
    序号: string;
    收入项目: string;
    合计: number;
    运营期: number[];
  }>;
  updatedAt: string;
}
```

### 总成本费用表数据结构 (CostTableData)

```typescript
interface CostTableData {
  rows: Array<{
    序号: string;
    成本项目: string;
    合计: number;
    运营期: number[];
  }>;
  updatedAt: string;
}
```

## API 接口

### 现有接口

**获取收入成本数据**:
- 端点: `GET /api/revenue-cost/project/:projectId`
- 响应:
```json
{
  "success": true,
  "data": {
    "estimate": {
      "model_data": {
        "revenueTableData": { ... },
        "costTableData": { ... }
      }
    }
  }
}
```

### 无需新增接口

使用现有的 `revenueCostApi.getByProjectId()` 方法即可获取所需数据。

## 用户体验优化

### 1. 按钮位置

将 JSON 查看按钮放在操作栏的导出按钮旁边，保持一致性。

### 2. 加载反馈

- 按钮显示 loading 状态
- 模态框显示加载动画
- 防止重复点击

### 3. 错误提示

- 使用 Mantine notifications 显示错误
- 提供清晰的错误信息
- 提供重试选项

### 4. 性能优化

- 使用 React.memo 优化组件渲染
- 虚拟滚动处理大数据量
- 防抖搜索输入

## 测试计划

### 1. 功能测试

- [ ] 点击按钮能正确打开模态框
- [ ] 能正确加载和显示 JSON 数据
- [ ] 搜索功能正常工作
- [ ] 折叠/展开功能正常
- [ ] 复制功能正常
- [ ] 加载状态正确显示
- [ ] 错误处理正确

### 2. 边界测试

- [ ] 数据为空时的显示
- [ ] 数据量很大时的性能
- [ ] 网络错误时的处理
- [ ] 无权限时的处理

### 3. 兼容性测试

- [ ] 不同浏览器兼容性
- [ ] 不同屏幕尺寸的响应式

## 实施顺序

1. ✅ 分析需求并制定技术方案
2. ⏳ 安装必要的依赖库
3. ⏳ 创建 JsonDataViewer 组件
4. ⏳ 在 FinancialIndicatorsTable 中集成按钮和逻辑
5. ⏳ 实现数据获取和状态管理
6. ⏳ 实现搜索、折叠、复制等功能
7. ⏳ 添加加载状态和错误处理
8. ⏳ 测试和优化

## 注意事项

1. **数据来源**: 优先从 store 获取数据，如果不存在则从后端获取
2. **性能考虑**: 大数据量时使用虚拟滚动
3. **用户体验**: 提供清晰的加载和错误反馈
4. **代码复用**: JsonDataViewer 组件设计为可复用
5. **类型安全**: 使用 TypeScript 确保类型正确

## 后续优化

1. 支持导出 JSON 为文件
2. 支持比较不同版本的数据
3. 支持编辑 JSON 数据
4. 添加数据验证功能
5. 支持自定义主题