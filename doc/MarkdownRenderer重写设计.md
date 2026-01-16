# MarkdownRenderer 重写设计

## 概述
重写 MarkdownRenderer 组件，使用新的样式计算工具函数，确保样式配置能够正确应用到预览区。

## 主要改进

1. **使用样式计算工具**：引入 `styleCalculator.ts` 中的函数进行样式计算
2. **统一样式应用**：确保所有元素样式都通过配置计算得出
3. **性能优化**：使用 useMemo 缓存计算结果，避免不必要的重新渲染
4. **修复表格和图表样式**：确保表格和图表也使用配置中的样式

## 组件结构

```typescript
interface MarkdownRendererProps {
  content: string
  config: ReportStyleConfig
  resources: ResourceMap
}

function MarkdownRenderer({ content, config, resources }: MarkdownRendererProps) {
  // 1. 缓存样式计算结果
  const computedStyles = useMemo(() => {
    return {
      heading1: getComputedParagraphStyle(config, 'heading1'),
      heading2: getComputedParagraphStyle(config, 'heading2'),
      heading3: getComputedParagraphStyle(config, 'heading3'),
      body: getComputedParagraphStyle(config, 'body'),
      table: getTableStyles(config)
    }
  }, [config])
  
  // 2. 缓存变量替换结果
  const contentWithVars = useMemo(() => {
    return replaceVariablesInContent(content, resources, config, computedStyles.table)
  }, [content, resources, config, computedStyles.table])
  
  // 3. 渲染逻辑
  // ...
}
```

## 关键实现点

### 1. 样式缓存
使用 useMemo 缓存所有样式计算结果，只在配置变化时重新计算：

```typescript
const computedStyles = useMemo(() => {
  return {
    heading1: getComputedParagraphStyle(config, 'heading1'),
    heading2: getComputedParagraphStyle(config, 'heading2'),
    heading3: getComputedParagraphStyle(config, 'heading3'),
    body: getComputedParagraphStyle(config, 'body'),
    table: getTableStyles(config)
  }
}, [config])
```

### 2. 表格样式应用
重写 replaceVariablesInContent 函数，使用计算后的表格样式：

```typescript
const replaceVariablesInContent = (
  content: string, 
  resources: ResourceMap, 
  config: ReportStyleConfig,
  tableStyles: ReturnType<typeof getTableStyles>
): string => {
  // ...
  
  // 替换表格变量 {{TABLE:tableId}}
  result = result.replace(/\{\{TABLE:(\w+)\}\}/g, (match, tableId) => {
    const tableResource = resources.tables?.[tableId]
    if (tableResource) {
      const columns = tableResource.columns || []
      const data = tableResource.data
      const zebraStripe = config.table?.zebraStripe

      const headerRow = columns.map((col: string) => 
        `<th style="${styleToString(tableStyles.header)}">${col}</th>`
      ).join('')

      const dataRows = data.map((row: any, rowIndex: number) => {
        const rowBg = zebraStripe && rowIndex % 2 === 1 ? 'background-color: #F5F5F5;' : ''
        const cells = columns.map((col: string) => 
          `<td style="${styleToString(tableStyles.cell)} ${rowBg}">${row[col] ?? ''}</td>`
        ).join('')
        return `<tr>${cells}</tr>`
      }).join('')

      return `
        <p style="${styleToString(tableStyles.title)}">${tableResource.title || '表格'}</p>
        <table style="${styleToString(tableStyles.table)}">
          <thead><tr>${headerRow}</tr></thead>
          <tbody>${dataRows}</tbody>
        </table>
      `
    }
    return `[表格 ${tableId} 未找到]`
  })
  
  // ...
}
```

### 3. ReactMarkdown 组件配置
使用计算后的样式配置 ReactMarkdown 组件：

```typescript
<ReactMarkdown
  key={index}
  remarkPlugins={[remarkGfm]}
  components={{
    h1: ({ children }) => (
      <h1 style={computedStyles.heading1}>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 style={computedStyles.heading2}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 style={computedStyles.heading3}>
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p style={computedStyles.body}>
        {children}
      </p>
    ),
    // 其他元素...
  }}
>
  {part}
</ReactMarkdown>
```

### 4. 样式对象转字符串工具
创建工具函数将样式对象转换为 CSS 字符串：

```typescript
const styleToString = (style: React.CSSProperties): string => {
  return Object.entries(style)
    .map(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      return `${cssKey}: ${value}`
    })
    .join('; ')
}
```

## 性能优化

1. **样式缓存**：使用 useMemo 缓存样式计算结果
2. **内容缓存**：缓存变量替换结果
3. **组件拆分**：将复杂的渲染逻辑拆分为更小的组件

## 向后兼容

1. **配置兼容**：支持新旧配置结构
2. **默认值**：为所有样式提供合理的默认值
3. **渐进增强**：新功能不影响现有功能

## 测试要点

1. **样式应用**：验证所有样式配置都能正确应用
2. **动态更新**：验证样式变化时预览区实时更新
3. **性能测试**：验证大量内容时的渲染性能
4. **兼容性测试**：验证新旧配置结构的兼容性

## 预期效果

重写后，MarkdownRenderer 将能够：
- 正确应用所有样式设置，包括行间距和段落缩进
- 支持动态样式更新，实时反映配置变化
- 保持良好的渲染性能
- 提供一致的视觉体验
- 完全兼容新旧配置结构