# ProjectOverviewModal 重构计划

## 一、现状分析

### 1.1 当前代码问题

| 问题分类 | 具体表现 | 影响 |
|---------|---------|------|
| **代码结构** | 组件文件约500行，ToolbarButton、buildPrompt、jsonToHtml 等混在一起 | 可读性差，难以维护 |
| **UI布局** | 大量内联样式，工具栏和按钮组布局复杂 | 样式难以复用和统一 |
| **功能缺失** | 编辑器初始化为只读，无法手动编辑 | 用户体验差 |
| **代码重复** | 与 PromptEditor 的 ToolbarButton 完全重复 | 维护成本高 |
| **错误处理** | 错误提示不够友好，生成状态反馈不明确 | 用户不知道发生了什么 |

### 1.2 当前组件文件结构

```
ProjectOverviewModal.tsx (500行)
├── ToolbarButton 组件 (内联定义)
├── useEditor 配置
├── projectOverviewData 计算逻辑
├── buildPrompt 函数
├── jsonToHtml 函数
├── handleGenerate 函数
├── handleSave 函数
├── handleClear 函数
└── JSX 渲染 (约300行)
```

## 二、重构目标

### 2.1 代码结构目标

```
components/report/
└── ProjectOverviewModal.tsx   # 重构后的主组件（简化到约200行）

hooks/
└── useProjectOverviewData.ts  # 项目数据处理 hook（新增）
```

### 2.2 功能目标

1. **编辑器可编辑** - 生成后用户可以手动修改内容
2. **加载已有数据** - 打开 modal 时自动加载已保存的项目概况
3. **更好的反馈** - 生成进度、错误提示更加清晰

## 三、重构计划

### 步骤1：创建 useProjectOverviewData Hook

**目标**：将项目数据收集和格式化逻辑抽取为自定义 hook

**新建文件**：`client/src/hooks/useProjectOverviewData.ts`

**功能**：
- 从 projectData 中提取项目概况相关数据
- 格式化投资规模、资金来源、建设规模等
- 返回结构化的 ProjectOverviewData

**返回类型**：
```typescript
interface ProjectOverviewData {
  projectName: string
  constructionUnit: string
  constructionSite: string
  constructionScale: string
  investmentScale: string
  fundingSource: string
  constructionPeriod: string
  productsServices: string[]
}
```

### 步骤2：重构 ProjectOverviewModal

**目标**：简化组件结构，优化代码组织

**主要改动**：
1. 使用 useProjectOverviewData hook 抽取数据处理逻辑
2. 简化工具栏 UI（使用 Mantine 组件）
3. 编辑器可编辑（editable: true）
4. 打开时自动加载已保存的项目概况
5. 简化 JSX 结构
6. 优化错误处理和状态反馈

**UI 结构**：
```
Modal
├── Header
│   └── 标题：AI生成项目概况
├── Body
│   ├── 工具栏
│   ├── 富文本编辑器
│   └── 操作按钮组
```

## 四、实施步骤

### Step 1: 创建 useProjectOverviewData Hook
- [ ] 定义 ProjectOverviewData 类型
- [ ] 实现数据提取和格式化逻辑
- [ ] 添加空值处理和类型安全

### Step 2: 重构 ProjectOverviewModal
- [ ] 导入 useProjectOverviewData hook
- [ ] 重写数据处理逻辑
- [ ] 简化工具栏 UI
- [ ] 实现编辑器可编辑
- [ ] 实现加载已保存数据
- [ ] 优化错误处理

### Step 3: 测试验证
- [ ] 测试数据提取准确性
- [ ] 测试 AI 生成功能
- [ ] 测试保存/加载功能
- [ ] 测试错误处理

## 五、文件变更清单

### 新建文件
| 文件 | 说明 |
|-----|------|
| `client/src/hooks/useProjectOverviewData.ts` | 项目数据处理 hook |

### 修改文件
| 文件 | 说明 |
|-----|------|
| `client/src/components/report/ProjectOverviewModal.tsx` | 重构主组件（简化代码、优化UI）|

## 六、验收标准

1. ✅ 代码结构清晰，组件职责单一
2. ✅ ProjectOverviewModal 减少到约200行
3. ✅ 用户可以手动编辑生成的内容
4. ✅ 加载已有项目概况功能正常
5. ✅ 错误提示友好清晰
6. ✅ 所有原有功能正常工作

**注意**：本计划只重构 ProjectOverviewModal，暂不修改 PromptEditor（避免引入过多变更风险）
