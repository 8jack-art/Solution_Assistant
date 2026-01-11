# 预览样式设置与Word样式设置分离实施计划

## 需求概述

将报告配置中的"样式设置"功能拆分为两个独立的配置：
1. **预览样式设置** - 控制编辑器内预览的显示样式
2. **Word样式设置** - 控制导出Word文档的样式

两个配置独立保存，使用不同颜色按钮区分。

## 实施详情

### 1. store层修改

**文件**: `client/src/stores/reportStore.ts`

**新增内容**:
- `wordStyleConfig` 状态 - Word导出专用样式配置
- `updateWordStyleConfig()` - 更新Word样式方法
- `resetWordStyleConfig()` - 重置Word样式方法
- `saveWordStyleConfig()` - 保存Word样式方法
- `loadDefaultWordStyleConfig()` - 加载默认Word样式方法
- `applyWordStyleConfig()` - 应用Word样式方法
- `_init()` 方法 - 同时加载预览和Word两种默认样式

### 2. API层修改

**文件**: `client/src/services/reportApi.ts`

**修改内容**:
- `getDefaultStyleConfig(configType?: 'preview' | 'word')` - 支持按类型获取默认样式
- `saveStyleConfig()` - 新增 `configType` 参数支持

### 3. 新增组件

**文件**: `client/src/components/report/WordStyleSettingsPanel.tsx`

**功能**:
- Word导出专用样式设置面板
- 与预览样式设置面板结构相同
- 使用紫色渐变主题区分（与预览样式的蓝色主题区分）
- 自动保存到 `wordStyleConfig`

### 4. 修改预览样式面板

**文件**: `client/src/components/report/StyleSettingsPanel.tsx`

**修改内容**:
- 标题改为"预览样式设置"
- 各节标题添加"（预览）"标识

### 5. 修改主页面

**文件**: `client/src/pages/ReportGeneration.tsx`

**修改内容**:
- 导入 `WordStyleSettingsPanel` 组件
- 新增 `showWordStylePanel` 状态
- 按钮修改：
  - "预览样式设置" - `variant="light" color="blue"` (浅蓝色)
  - "Word样式设置" - `variant="filled" color="green"` (绿色填充)
- 新增Word样式设置弹窗
- "导出Word"按钮颜色改为 `color="green"`

## 按钮颜色方案

| 按钮 | 颜色 | 说明 |
|------|------|------|
| 预览样式设置 | `blue` + `light` | 浅蓝色边框，预览标识 |
| Word样式设置 | `green` + `filled` | 绿色填充，导出标识 |
| 导出Word | `green` + `light` | 浅绿色，与Word样式设置呼应 |

## 数据存储

- 预览样式: `configType = 'preview'`
- Word样式: `configType = 'word'`

两种样式独立存储在 `report_styles` 表中，通过 `config_type` 字段区分。

## 使用流程

1. 用户点击"预览样式设置" → 打开蓝色主题面板 → 保存后影响编辑器内预览
2. 用户点击"Word样式设置" → 打开绿色主题面板 → 保存后影响导出Word文档
3. 用户点击"导出Word" → 使用 `wordStyleConfig` 生成Word文档

## 验证要点

- [ ] 两个按钮使用不同颜色区分
- [ ] 预览样式设置不影响Word导出
- [ ] Word样式设置不影响预览显示
- [ ] 样式配置独立保存和加载
- [ ] 导出Word时使用正确的Word样式配置
