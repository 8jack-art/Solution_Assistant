# Word导出无正文内容修复计划

## 问题描述
导出Word文档时，没有报告正文内容。只有封面和目录，没有LLM生成的报告正文。

## 根因分析

### 问题流程
1. 用户点击"导出Word"按钮
2. 调用 `reportStore.exportToWord()` 方法
3. 传递参数：{ title, sections, styleConfig, resources }
4. **问题**：`sections.body[].content` 是用户在章节配置面板手动输入的内容（默认为空）
5. 服务器调用 `createCompleteDocument(sections, resources, styleConfig)` 生成文档
6. 生成的Word只有封面和目录，缺少正文

### 关键代码位置
- [`client/src/stores/reportStore.ts:488-506`](client/src/stores/reportStore.ts:488) - `exportToWord` 方法
- [`client/src/types/report.ts:150-169`](client/src/types/report.ts:150) - `defaultSections` 配置
- [`server/src/controllers/reportController.ts:442-473`](server/src/controllers/reportController.ts:442) - `exportWithConfig` 方法
- [`server/src/services/reportService.ts:1457-1462`](server/src/services/reportService.ts:1457) - 正文处理逻辑

### 核心问题
- `sections.body[].content` 默认为空字符串
- `exportToWord` 没有使用 `reportContent`（LLM生成的报告内容）
- 数据库中的 `report_content` 字段没有被使用

## 修复方案

### 方案一：修改前端导出逻辑（推荐）
修改 `exportToWord` 方法，将 `reportContent` 作为 `sections.body` 的内容：

```typescript
// 修改 reportStore.ts 中的 exportToWord 方法
exportToWord: async () => {
  const { reportId, reportTitle, sections, styleConfig, resources, reportContent } = get()

  // 构建包含报告内容的sections
  const sectionsWithContent = {
    ...sections,
    body: sections.body?.length > 0
      ? sections.body.map((section, index) =>
          index === 0 ? { ...section, content: reportContent } : section
        )
      : [{ id: 'main', title: '报告正文', content: reportContent, level: 1 }]
  }

  await reportApi.exportWord({
    title: reportTitle,
    sections: sectionsWithContent,
    styleConfig,
    resources
  })
}
```

### 方案二：添加新的导出接口
添加一个新接口 `/report/export-with-content`，从数据库读取 `report_content`：

```typescript
// 修改 exportWithConfig 方法，增加 content 参数支持
static async exportWithContent(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  // 从数据库读取 report_content
  // 生成Word文档时，将 report_content 作为正文
}
```

## 推荐方案：方案一

### 优势
1. 改动最小，只需修改前端代码
2. 保持现有接口不变
3. 可以灵活控制正文章节结构

### 修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `client/src/stores/reportStore.ts` | 修改 `exportToWord` 方法，将 `reportContent` 注入 `sections.body` |

### 详细修改步骤

#### 步骤1: 修改 `exportToWord` 方法
**文件**: `client/src/stores/reportStore.ts`

**修改前**:
```typescript
exportToWord: async () => {
  const { reportId, reportTitle, sections, styleConfig, resources } = get()
  if (!reportId) {
    set({ error: '请先生成报告' })
    return
  }
  
  try {
    await reportApi.exportWord({
      title: reportTitle,
      sections,
      styleConfig,
      resources
    })
  } catch (error: any) {
    console.error('导出失败:', error)
    set({ error: error.message || '导出失败' })
  }
},
```

**修改后**:
```typescript
exportToWord: async () => {
  const { reportId, reportTitle, sections, styleConfig, resources, reportContent } = get()
  if (!reportId) {
    set({ error: '请先生成报告' })
    return
  }

  // 检查报告内容是否为空
  if (!reportContent || reportContent.trim() === '') {
    set({ error: '报告内容为空，请先生成报告' })
    return
  }

  try {
    // 构建包含报告内容的sections
    // 将第一个正文章节的内容替换为LLM生成的报告内容
    const sectionsWithContent = {
      ...sections,
      body: sections.body?.length > 0
        ? sections.body.map((section, index) =>
            index === 0 ? { ...section, content: reportContent } : section
          )
        : [{ id: 'main', title: '报告正文', content: reportContent, level: 1 }]
    }

    await reportApi.exportWord({
      title: reportTitle,
      sections: sectionsWithContent,
      styleConfig,
      resources
    })
  } catch (error: any) {
    console.error('导出失败:', error)
    set({ error: error.message || '导出失败' })
  }
},
```

## 备选方案：方案二（如果方案一不满足需求）

如果用户希望保留手动编辑正文章节的能力，可以采用混合模式：
- 允许用户在章节配置中编辑部分内容
- 提供"使用AI生成内容"按钮，将 `reportContent` 填充到 `sections.body`

## 验证步骤

1. ✅ 生成一篇完整的报告（确保 `reportContent` 不为空）
2. ✅ 导出Word文档
3. ✅ 打开Word文档，检查正文是否包含LLM生成的内容
4. ✅ 验证封面、目录、正文结构完整

## 风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| reportContent为空导致导出失败 | 中 | 添加空值检查和错误提示 |
| 报告内容过长导致导出超时 | 低 | 大报告内容不影响导出逻辑 |
| 样式配置丢失 | 低 | 样式配置作为独立参数传递 |

## 时间线

- 方案一：约1-2小时（前端代码修改 + 测试）
- 方案二：约3-4小时（前端 + 后端代码修改 + 测试）
