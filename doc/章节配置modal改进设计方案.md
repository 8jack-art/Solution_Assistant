# 章节配置modal改进设计方案

## 当前设计问题

### 问题分析
当前 [`SectionConfigPanel.tsx`](../client/src/components/report/SectionConfigPanel.tsx) 的设计存在以下问题：

1. **字段组织混乱**：所有字段平铺在一个页面，没有逻辑分组
2. **视觉层次不清晰**：难以快速定位相关配置
3. **缺少分组标识**：用户不清楚哪些字段属于同一类别的配置

## 改进方案

### 方案概述
将配置按功能模块分组，使用折叠面板和视觉分隔，提升用户体验。

### 详细设计

#### 1. 封面配置改进

**分组结构**：
```
┌─ 封面设置 ─────────────────────┐
│                                     │
│  【基本设置】                        │
│  ├─ 启用封面                      │
│  └─ 报告标题                     │
│                                     │
│  【项目信息】                        │
│  ├─ 项目名称                     │
│  ├─ 编制单位                     │
│  ├─ 编制人                       │
│  └─ 编制日期                     │
│                                     │
└───────────────────────────────────────┘
```

**改进点**：
- 使用折叠面板（Accordion）分组相关字段
- 添加图标增强视觉识别
- 使用卡片式布局区分不同配置组
- 添加工具提示说明每个字段的用途

#### 2. 目录配置改进

**分组结构**：
```
┌─ 目录设置 ─────────────────────┐
│                                     │
│  ├─ 启用目录                      │
│  ├─ 目录标题                     │
│  ├─ 包含页码                     │
│  └─ 目录深度                     │
│                                     │
└───────────────────────────────────────┘
```

#### 3. 正文配置改进

**分组结构**：
```
┌─ 正文章节 ─────────────────────┐
│                                     │
│  [+ 添加章节]                     │
│                                     │
│  ┌─ 章节列表 ──────────────┐
│  │  章节 1                     │
│  │ ├─ 标题输入框                │
│  │ ├─ 标题级别选择              │
│  │ ├─ 内容编辑器                │
│  │ └─ [删除]                    │
│  │                                 │
│  │ 章节 2                     │
│  │ └─ ...                       │
│  └─────────────────────────────────┘
│                                     │
└───────────────────────────────────────┘
```

#### 4. 附录配置改进

**分组结构**：
```
┌─ 附录章节 ─────────────────────┐
│                                     │
│  [+ 添加附录]                     │
│                                     │
│  ┌─ 附录列表 ──────────────┐
│  │  附录 1                       │
│  │ ├─ 标题输入框                │
│  │ ├─ 内容编辑器                │
│  │ └─ [删除]                    │
│  │                                 │
│  │ 附录 2                       │
│  │ └─ ...                       │
│  └─────────────────────────────────┘
│                                     │
└───────────────────────────────────────┘
```

### CSS样式建议

```css
/* 折叠面板样式 */
.settings-group {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
}

.settings-group-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
}

.settings-content {
  padding: 16px;
}

/* 章节列表样式 */
.section-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-item {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 16px;
  transition: all 0.2s;
}

.section-item:hover {
  background: #f0f0f0;
  border-color: #d0d0d0;
}

.section-item.editing {
  border-color: #4a90e2;
  background: #fff9e6;
}

.section-header-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.section-number {
  background: #e0e0e0;
  color: #fff;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.section-title-input {
  flex: 1;
  font-size: 14px;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.section-level-select {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #fff;
}

.section-content-input {
  flex: 1;
  font-size: 14px;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  min-height: 100px;
  font-family: inherit;
}

.section-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-delete {
  background: #dc3545;
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-delete:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-delete:disabled {
  background: #e0e0e0;
  cursor: not-allowed;
  opacity: 0.5;
}
```

### 实施步骤

#### Step 1: 修改 SectionConfigPanel 组件结构
- [ ] 重构封面配置，使用折叠面板分组
- [ ] 重构目录配置，使用折叠面板分组
- [ ] 重构正文配置，改进列表布局和编辑体验
- [ ] 重构附录配置，改进列表布局和编辑体验

#### Step 2: 添加CSS样式
- [ ] 创建或更新组件样式文件
- [ ] 添加折叠面板、卡片布局等样式

#### Step 3: 测试验证
- [ ] 测试所有配置项是否正常工作
- [ ] 测试折叠/展开功能
- [ ] 测试删除功能
- [ ] 验证样式效果

## 预期效果

1. 配置项按功能模块清晰分组
2. 用户可以快速找到需要的配置项
3. 视觉层次清晰，易于理解
4. 编辑体验流畅，操作直观
