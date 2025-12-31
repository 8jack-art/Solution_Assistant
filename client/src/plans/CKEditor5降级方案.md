# CKEditor5降级方案技术路线

## 1. 问题背景

### 当前状态
- **问题版本**: CKEditor5 v44.3.0 + @ckeditor/ckeditor5-react v9.3.1
- **症状**: 
  ```
  TypeError: this.props.editor.EditorWatchdog is not a constructor
  Failed prop type: Invalid prop `editor` of type `object` supplied to `CKEditor`, expected `function`.
  ```
- **影响**: 富文本编辑器无法正常加载，回退到基础textarea

### 根本原因
CKEditor5 v41+预构建版本与@ckeditor/ckeditor5-react v9存在严重的API兼容性问题：
- 预构建版本使用IIFE格式导出，导致`EditorWatchdog`等关键类无法正确暴露
- React集成库期望接收编辑器类构造函数，但实际收到的是IIFE模块对象

## 2. 降级目标

### 版本选择策略
根据CKEditor5版本历史分析，选择**v40.5.0**作为目标版本：
- ✅ 与@ckeditor/ckeditor5-react v6.x完全兼容
- ✅ 预构建版本功能完整
- ✅ API稳定性经过充分验证
- ✅ 包含所有必要的功能（表格、图片、格式工具）

### 目标版本矩阵
| 包名 | 当前版本 | 目标版本 | 降级幅度 |
|------|----------|----------|----------|
| @ckeditor/ckeditor5-build-classic | 44.3.0 | 40.5.0 | -4个次版本 |
| @ckeditor/ckeditor5-react | 9.3.1 | 6.2.0 | -3个主版本 |
| @ckeditor/ckeditor5-build-inline | 44.3.0 | 40.5.0 | -4个次版本 |

## 3. 技术架构

### 依赖关系图
```
@ckeditor/ckeditor5-react@6.2.0
    ↓
@ckeditor/ckeditor5-build-classic@40.5.0
    ↓
CKEditor5 Core Engine v40.5.0
    ↓
EditorBase, PluginSystem, DataProcessing
```

### 组件交互流程
```
CKEditor5Input.tsx
    │
    ├── @ckeditor/ckeditor5-react (CKEditor组件)
    │       │
    │       └── @ckeditor/ckeditor5-build-classic
    │               │
    │               └── ClassicEditor.create()
    │                       │
    │                       └── DOM元素绑定
    │
    └── 模板系统 + 工具栏集成
```

## 4. 实施步骤

### Phase 1: 依赖降级（30分钟）

#### 4.1.1 更新package.json
```json
{
  "dependencies": {
    "@ckeditor/ckeditor5-build-classic": "40.5.0",
    "@ckeditor/ckeditor5-build-inline": "40.5.0",
    "@ckeditor/ckeditor5-react": "6.2.0"
  }
}
```

#### 4.1.2 重新安装依赖
```bash
cd client
rm -rf node_modules
npm install
```

#### 4.1.3 验证安装
```bash
npm list @ckeditor/ckeditor5-build-classic @ckeditor/ckeditor5-react
# 应显示：
# ├── @ckeditor/ckeditor5-build-classic@40.5.0
# └── @ckeditor/ckeditor5-react@6.2.0
```

### Phase 2: 组件重构（2小时）

#### 4.2.1 恢复CKEditor5Input组件
**文件**: `client/src/components/report/CKEditor5Input.tsx`

**关键代码结构**:
```typescript
import React, { useState, useEffect, useRef } from 'react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'

const CKEditor5Input: React.FC<CKEditor5InputProps> = ({ value, onChange }) => {
  const [editor, setEditor] = useState<any>(null)

  return (
    <CKEditor
      editor={ClassicEditor}
      data={value}
      onChange={(_, editor) => {
        onChange(editor.getData())
      }}
      onReady={(editor: any) => {
        setEditor(editor)
        console.log('CKEditor5富文本编辑器已就绪')
      }}
      config={{
        language: 'zh-cn',
        toolbar: [
          'undo', 'redo',
          '|', 'bold', 'italic', 'underline',
          '|', 'bulletedList', 'numberedList',
          '|', 'heading',
          '|', 'link', 'blockQuote',
          '|', 'codeBlock'
        ],
        heading: {
          options: [
            { model: 'paragraph', title: 'Paragraph' },
            { model: 'heading1', view: 'h1', title: 'Heading 1' },
            { model: 'heading2', view: 'h2', title: 'Heading 2' },
            { model: 'heading3', view: 'h3', title: 'Heading 3' }
          ]
        }
      }}
    />
  )
}
```

#### 4.2.2 增强模板系统
```typescript
// 模板配置与CKEditor5集成
const handleTemplateInsert = (template: string) => {
  if (editor) {
    // 在CKEditor5中插入模板内容
    const selection = editor.model.document.selection
    editor.model.change((writer: any) => {
      const insertPosition = selection.getFirstPosition()
      writer.insertText(template, insertPosition)
    })
  }
}
```

### Phase 3: 样式和配置（1小时）

#### 4.3.1 更新CKEditor5样式
**文件**: `client/src/styles/ckeditor.css`

```css
/* CKEditor5 v40.x 样式兼容 */
.ck-editor {
  border: 1px solid #E5E6EB !important;
  border-radius: 8px;
  overflow: hidden;
}

.ck-editor__editable {
  min-height: 300px;
  padding: 12px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
}

.ck-toolbar {
  background-color: #F8F9FA !important;
  border-bottom: 1px solid #E5E6EB !important;
}

.ck-button {
  border-radius: 4px !important;
}
```

#### 4.3.2 配置文件更新
**文件**: `client/src/config/ckeditor.ts`

```typescript
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'

export const CKEditor5Config = {
  editor: ClassicEditor,
  config: {
    language: 'zh-cn',
    toolbar: {
      items: [
        'undo', 'redo',
        '|', 'bold', 'italic', 'underline',
        '|', 'bulletedList', 'numberedList',
        '|', 'heading',
        '|', 'link', 'blockQuote',
        '|', 'codeBlock'
      ]
    },
    heading: {
      options: [
        { model: 'paragraph', title: 'Paragraph' },
        { model: 'heading1', view: 'h1', title: 'Heading 1' },
        { model: 'heading2', view: 'h2', title: 'Heading 2' },
        { model: 'heading3', view: 'h3', title: 'Heading 3' }
      ]
    },
    placeholder: '请输入报告生成的提示词...',
    codeBlock: {
      languages: [
        { language: 'plaintext', label: 'Plain text' },
        { language: 'javascript', label: 'JavaScript' },
        { language: 'css', label: 'CSS' },
        { language: 'sql', label: 'SQL' }
      ]
    }
  }
}
```

### Phase 4: 测试验证（2小时）

#### 4.4.1 单元测试
```typescript
// __tests__/CKEditor5Input.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import CKEditor5Input from '@/components/report/CKEditor5Input'

describe('CKEditor5Input', () => {
  it('应该正确渲染CKEditor5编辑器', () => {
    render(<CKEditor5Input value="" onChange={() => {}} />)
    // 验证编辑器容器存在
  })

  it('应该响应内容变化', () => {
    const onChange = jest.fn()
    render(<CKEditor5Input value="测试" onChange={onChange} />)
    // 验证onChange被调用
  })
})
```

#### 4.4.2 集成测试
1. **富文本功能测试**
   - 格式化工具（加粗、斜体、下划线）
   - 列表功能（有序、无序列表）
   - 标题功能（H1-H3）
   - 代码块功能

2. **模板系统测试**
   - 模板插入功能
   - 光标定位
   - 内容追加

3. **数据持久化测试**
   - 内容保存
   - 恢复编辑

## 5. 风险评估

### 高风险项
| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| API不兼容 | 中 | 高 | 准备降级到v39.x |
| 样式冲突 | 低 | 中 | 重写CSS覆盖 |
| 性能下降 | 低 | 低 | 性能监控 |

### 回滚策略
```bash
# 快速回滚命令
git checkout HEAD~1 package.json
npm install
npm run dev
```

## 6. 时间规划

### 总工时: 6.5小时
- Phase 1: 30分钟
- Phase 2: 2小时
- Phase 3: 1小时
- Phase 4: 2小时
- Buffer: 1小时

## 7. 验收标准

### 功能验收
- [ ] CKEditor5富文本编辑器正常加载
- [ ] 所有格式化工具可用
- [ ] 模板插入功能正常
- [ ] 字数统计准确
- [ ] 数据保存恢复正常

### 性能验收
- [ ] 页面加载时间 < 3秒
- [ ] 编辑器初始化 < 2秒
- [ ] 模板插入响应 < 100ms

### 兼容性验收
- [ ] Chrome最新版本
- [ ] Firefox最新版本
- [ ] Safari最新版本
- [ ] Edge最新版本

## 8. 后续优化

### 短期优化（1周内）
- 性能监控集成
- 错误追踪完善
- 用户反馈收集

### 长期规划（1个月内）
- 自定义构建评估
- 插件扩展规划
- 多语言支持增强

## 9. 依赖版本锁定

### package.json依赖锁定
```json
{
  "dependencies": {
    "@ckeditor/ckeditor5-build-classic": "40.5.0",
    "@ckeditor/ckeditor5-build-inline": "40.5.0",
    "@ckeditor/ckeditor5-react": "6.2.0"
  },
  "overrides": {
    "@ckeditor/*": "40.5.0"
  }
}
```

### npm配置
```bash
# 锁定依赖版本
npm config set save-exact true

# 或使用package-lock.json确保一致性
```

## 10. 监控和告警

### 监控指标
1. **错误率**: CKEditor5加载失败次数
2. **性能**: 编辑器初始化时间
3. **功能使用**: 模板使用率、格式化工具使用率

### 告警阈值
- 错误率 > 1%: 触发告警
- 初始化时间 > 3s: 触发告警
- 模板使用率 < 10%: 触发评估

## 11. 文档更新

### 需要更新的文档
- [ ] `client/src/plans/CKEditor5替换方案.md`
- [ ] `client/CKEditor5修复总结.md`
- [ ] `client/README.md`（如果存在）
- [ ] 开发文档

### 更新内容
- 降级原因和决策过程
- 版本选择依据
- 实施步骤和注意事项
- 故障排除指南
