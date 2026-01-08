# 投资项目方案报告生成模块 `{{project_overview}}` 变量修复方案

## 问题描述

在投资项目方案报告生成模块中，可用变量 `{{project_overview}}` 数据为空，导致生成的报告中项目概况内容缺失。

## 根因分析

后端 `server/src/services/reportService.ts` 的 `buildDataAwarePrompt` 方法只处理了部分变量替换，但**没有处理 `{{project_overview}}` 变量**。

### 问题代码位置

`server/src/services/reportService.ts` 第321-333行：
```typescript
// 替换单个变量
processedPrompt = processedPrompt
  .replace(/\{\{project_name\}\}/g, project.name || '')
  .replace(/\{\{project_description\}\}/g, project.description || '')
  // ... 其他变量
  // ⚠️ 缺少 {{project_overview}} 的处理
```

### 数据流问题

```
用户生成报告
    ↓
前端 loadProjectData() → 加载项目数据
    ↓
前端 loadProjectOverview() → 加载项目概况到 projectOverview 状态
    ↓
发送提示词给后端
    ↓
后端 buildDataAwarePrompt() → ❌ 没有处理 {{project_overview}}
    ↓
报告生成，{{project_overview}} 变为空
```

## 修复方案：后端获取并替换

### 修改1：`collectProjectData` 方法 - 添加项目概况查询

**文件**: `server/src/services/reportService.ts`

**位置**: 第260-278行

**修改内容**:
```typescript
// 提取关键财务指标
const financialIndicators = this.extractFinancialIndicators(revenueCostModelData)
console.log('财务指标提取结果:', Object.keys(financialIndicators))

// 获取项目概况数据（新增）
let projectOverview = ''
try {
  const [overviews] = await (pool as any).execute(
    'SELECT content FROM report_project_overview WHERE project_id = ?',
    [projectId]
  ) as any[]
  
  if (overviews.length > 0 && overviews[0].content) {
    projectOverview = overviews[0].content
    console.log('项目概况数据查询成功')
  } else {
    console.log('未找到项目概况数据')
  }
} catch (e) {
  console.warn('查询项目概况数据失败:', e)
}

const result = {
  project: {
    // ... 现有字段
  },
  investment: investmentData,
  revenueCost: revenueCostModelData,
  financialIndicators,
  projectOverview  // 新增
}
```

### 修改2：`buildDataAwarePrompt` 方法 - 添加 `{{project_overview}}` 替换

**文件**: `server/src/services/reportService.ts`

**位置**: 第304-333行

**修改内容**:
```typescript
static buildDataAwarePrompt(basePrompt: string, projectData: any): string {
  const { project, investment, revenueCost, financialIndicators, projectOverview } = projectData  // 新增 projectOverview
  
  // ... 现有代码 ...
  
  // 替换单个变量（新增 project_overview）
  processedPrompt = processedPrompt
    // ... 现有变量替换 ...
    .replace(/\{\{project_overview\}\}/g, projectOverview || '')  // 新增
    
  return processedPrompt
}
```

## 前端 HTML 转 Markdown 转换

为确保项目概况以 Markdown 格式存储到数据库，在前端进行了以下转换：

### 添加的转换函数

**文件**: `client/src/components/report/ProjectOverviewModal.tsx`

```typescript
// HTML转Markdown转换器
function htmlToMarkdown(html: string): string {
  if (!html) return ''
  
  let markdown = html
    // 替换标题
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    // 替换粗体和斜体
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    // 替换列表
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    // 替换引用
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n')
    // 替换段落
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    // 移除剩余的HTML标签
    .replace(/<[^>]+>/g, '')
    
  return markdown.trim()
}

// Markdown转HTML转换器
function markdownToHtml(markdown: string): string {
  if (!markdown) return ''
  
  let html = markdown
    // 处理粗体
    .replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>')
    // 处理删除线
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    // 处理斜体
    .replace(/\*([^\*]+)\*/g, '<em>$1</em>')
    // 处理标题
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 处理引用
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // 处理无序列表
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // 处理段落
    .replace(/\n\n/g, '</p><p>')
    
  return '<p>' + html + '</p>'
}
```

### 保存逻辑修改

```typescript
// 保存项目概况（将HTML转换为Markdown格式保存）
const handleSave = async () => {
  const htmlContent = editor?.getHTML() || ''
  // 将HTML转换为Markdown格式
  const markdownContent = htmlToMarkdown(htmlContent)
  await saveProjectOverview(markdownContent)  // 保存Markdown
}
```

### 加载逻辑修改

```typescript
// 打开时加载已保存的项目概况（将Markdown转换为HTML显示）
useEffect(() => {
  if (opened && editor && projectOverview) {
    // 将保存的Markdown内容转换为HTML
    const htmlContent = markdownToHtml(projectOverview)
    editor.commands.setContent(htmlContent)
  }
}, [opened, projectOverview, editor])
```

## 数据流程图

```mermaid
flowchart TD
    A[用户点击生成报告] --> B[前端 loadProjectData]
    B --> C[后端 collectProjectData]
    C --> D[查询投资估算数据]
    C --> E[查询收入成本数据]
    C --> F[查询项目基本信息]
    C --> G[查询 report_project_overview 表]
    G --> H{找到记录?}
    H -->|是| I[获取 projectOverview 内容]
    H -->|否| J[projectOverview = '']
    I --> K[返回完整 projectData]
    J --> K
    K --> L[buildDataAwarePrompt]
    L --> M[替换 {{project_overview}} 变量]
    M --> N[调用 LLM 生成报告]
```

## 文件变更清单

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `server/src/services/reportService.ts` | 修改 | `collectProjectData` 添加项目概况查询 |
| `server/src/services/reportService.ts` | 修改 | `buildDataAwarePrompt` 添加 `{{project_overview}}` 替换 |
| `client/src/components/report/ProjectOverviewModal.tsx` | 修改 | 添加 HTML 转 Markdown 转换函数 |
| `client/src/components/report/ProjectOverviewModal.tsx` | 修改 | 保存时将 HTML 转换为 Markdown 格式 |
| `client/src/components/report/ProjectOverviewModal.tsx` | 修改 | 加载时将 Markdown 转换为 HTML 显示 |

## 风险评估

| 风险 | 等级 | 缓解措施 |
|-----|------|---------|
| 数据库查询失败 | 低 | 添加 try-catch 异常处理，记录警告日志 |
| 项目概况为空 | 低 | 正常场景，替换为空字符串 |
| 性能影响 | 低 | 仅增加一次轻量查询 |

## 验证步骤

1. **功能验证**
   - 在前端"可用变量"中确认 `{{project_overview}}` 可用
   - 生成包含 `{{project_overview}}` 的报告
   - 验证报告中是否正确显示项目概况内容

2. **边界测试**
   - 没有项目概况记录时，变量应为空字符串
   - 项目概况内容包含 HTML 标签时，应保持原样输出

## 执行日期

修复日期: 2026-01-07
