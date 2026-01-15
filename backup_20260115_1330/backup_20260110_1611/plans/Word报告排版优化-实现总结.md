# Word报告排版优化 - 技术实现总结

## 已完成工作

### 1. 类型定义扩展

创建了新的类型文件 `client/src/types/report.ts`，包含：

- **ReportStyleConfig**：样式配置接口
  - 字体设置（正文、标题、数字字体）
  - 字号设置（标题、正文、表格等）
  - 段落设置（行间距、段前段后间距）
  - 页面设置（边距、纸张方向）
  - 表格样式（表头背景、边框、斑马纹、对齐）

- **ReportSections**：章节配置接口
  - CoverSection：封面配置（标题、副标题、项目名称、编制单位、编制人、日期、Logo）
  - TableOfContentsSection：目录配置（启用、标题、页码、深度）
  - BodySection：正文章节（标题、内容、级别）
  - AppendixSection：附录（标题、内容）

- **ResourceMap**：资源映射
  - TableResource：表格资源（ID、标题、列、数据、样式）
  - ChartResource：图表资源（ID、类型、标题、图片数据）

### 2. Store状态管理

更新了 `client/src/stores/reportStore.ts`，新增：

- **styleConfig**：样式配置状态
- **sections**：章节配置状态
- **resources**：表格和图表资源状态
- **updateStyleConfig()**：更新样式配置
- **resetStyleConfig()**：重置样式配置
- **updateSections()**：更新章节配置
- **resetSections()**：重置章节配置
- **updateResources()**：更新资源

### 3. API接口扩展

更新了 `client/src/services/reportApi.ts`，新增：

- **exportWord()**：支持导出时传递章节、样式和资源配置

### 4. 后端服务扩展

更新了 `server/src/services/reportService.ts`，新增：

- **样式应用函数**
  - `createStyledParagraph()`：创建带样式的段落
  - `createStyledTable()`：创建带样式的Word表格
  - `createChartImage()`：创建图表图片段落

- **章节生成函数**
  - `createCoverPage()`：创建封面页
  - `createTableOfContents()`：创建目录页
  - `createSectionContent()`：创建章节内容（支持资源标记）
  - `parseContentToWordWithResources()`：解析内容为Word元素（支持资源标记）

- **Word文档组装函数**
  - `createCompleteDocument()`：创建完整Word文档（包含所有章节）
  - `generateWordDocument()`：生成Word文档（扩展版本，支持章节和资源配置）

### 5. 后端API接口更新

在 `server/src/controllers/reportController.ts` 中添加：

- **exportWithConfig()**：支持直接传递章节、样式和资源配置生成Word文档

### 6. 后端路由配置

在 `server/src/routes/report.ts` 中添加新路由：

- `POST /export-with-config` - 支持配置导出的路由

### 7. 前端组件开发

新建以下组件：

- ✅ **StyleSettingsPanel.tsx** - 样式设置面板
  - 字体设置（正文、标题、数字字体选择）
  - 字号设置（标题、正文、表格字号）
  - 段落设置（行间距）
  - 页面设置（边距）
  - 表格样式（表头背景色、斑马纹、对齐）
  - 实时样式预览

- ✅ **SectionConfigPanel.tsx** - 章节配置面板
  - 封面设置（标题、副标题、项目名称、编制单位、编制人、日期）
  - 目录设置（启用/禁用、标题、深度）
  - 正文章节管理（添加、删除、编辑章节标题和内容）
  - 附录管理（添加、删除、编辑附录标题和内容）
  - 支持Markdown内容编辑

- ✅ **ReportPreview.tsx** - 报告预览组件（更新）
  - 解析并渲染封面
  - 自动生成目录
  - 解析并渲染正文章节
  - 解析并渲染附录
  - 应用样式配置到预览
  - 解析 `{{TABLE:xxx}}` 并渲染HTML表格
  - 解析 `{{CHART:xxx}}` 并渲染图表占位符

- ✅ **ReportGeneration.tsx** - 页面集成
  - 添加样式设置按钮和弹窗
  - 添加章节配置按钮和弹窗
  - 集成现有功能（提示词编辑、变量选择、预览）
  - 统一管理报告生成流程

---

## 文件清单

### 已创建/修改

- ✅ `client/src/types/report.ts` - 新建
- ✅ `client/src/stores/reportStore.ts` - 更新
- ✅ `client/src/services/reportApi.ts` - 更新
- ✅ `server/src/services/reportService.ts` - 已更新
- ✅ `server/src/controllers/reportController.ts` - 已更新
- ✅ `server/src/routes/report.ts` - 已更新
- ✅ `client/src/components/report/StyleSettingsPanel.tsx` - 新建
- ✅ `client/src/components/report/SectionConfigPanel.tsx` - 新建
- ✅ `client/src/components/report/ReportPreview.tsx` - 更新
- ✅ `client/src/pages/ReportGeneration.tsx` - 更新

---

## 技术要点

### 样式转换规则

**docx库单位转换**：
- 字号：pt（point）→ docx使用双倍值（如12pt = 24）
- 行间距：倍数→ docx使用twip（1.5倍 = 360 twip）
- 边距：cm→ docx使用twip（1cm = 567 twip）

### 表格生成规则

- 使用 `Table`、`TableRow`、`TableCell` 创建表格
- 表头行设置 `tableHeader: true` 以支持跨页重复
- 使用 `WidthType.PERCENTAGE` 设置表格宽度
- 使用 `BorderStyle.SINGLE` 设置边框样式
- 使用 `ShadingType` 设置表头背景色

### 图片嵌入规则

- 使用 `ImageRun` 嵌入图片
- 图片类型：'png'
- 支持自定义宽高
- 支持居中对齐

### 章节组织规则

- 封面：独立section，使用分页符
- 目录：独立section，自动提取标题
- 正文：多个section，每个section包含标题和内容
- 附录：多个section

---

## 使用方法

### 1. 配置样式

点击"样式设置"按钮，弹出样式设置面板，可以配置：

- 正文字体、标题字体、数字字体
- 标题字号、正文字号、表头字号、表体字号
- 行间距
- 页面边距
- 表格样式（表头背景色、斑马纹、对齐）

### 2. 配置章节

点击"章节配置"按钮，弹出章节配置面板，可以配置：

- **封面**：报告标题、副标题、项目名称、编制单位、编制人、编制日期
- **目录**：启用/禁用、目录标题、包含页码、目录深度
- **正文**：添加/删除/编辑章节，支持Markdown内容编辑
- **附录**：添加/删除/编辑附录

### 3. 在内容中插入表格和图表

在章节内容中使用以下标记：

- `{{TABLE:表格ID}}` - 插入表格
- `{{CHART:图表ID}}` - 插入图表

### 4. 导出Word文档

点击"导出Word"按钮，使用配置的样式和章节生成Word文档。

---

## 后续建议

1. **测试覆盖**：对已实现功能进行单元测试和集成测试
2. **表格图表资源生成**：实现从业务数据自动生成表格和图表资源
3. **样式持久化**：将样式配置保存到本地存储或后端
4. **章节模板保存**：支持保存和加载章节模板
5. **高级功能**：页眉页脚支持、封面Logo图片上传、目录自动页码更新
