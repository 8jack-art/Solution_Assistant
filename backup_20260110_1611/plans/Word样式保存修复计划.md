# Word样式保存功能修复计划

## 问题描述
用户设置Word导出样式后，样式配置无法持久化保存。刷新页面后，样式恢复到默认值。

## 问题分析

### 当前问题
- `StyleSettingsPanel` 组件只有"重置为默认"和"完成"按钮
- 没有"保存"按钮将样式配置保存到数据库
- 样式只保存在内存中（store），页面刷新后丢失

### 现有功能（已实现）
根据代码分析，项目已有以下功能：
1. `reportStore.saveStyleConfig` - 保存样式配置到数据库
2. `reportApi.saveStyleConfig` - API调用
3. `reportController.saveStyleConfig` - 后端保存接口
4. `report_style_configs` 数据库表

### 当前UI问题
`StyleSettingsPanel` 组件（第434-441行）：
```jsx
<div className="panel-footer">
  <button className="btn btn-secondary" onClick={handleReset}>
    重置为默认
  </button>
  <button className="btn btn-primary" onClick={onClose}>
    完成
  </button>
</div>
```
缺少"保存"按钮！

## 修复方案：方案2（完整方案）

### 功能规划

#### 方案A：简单保存（快速修复）
- 在面板底部添加"保存"按钮
- 点击后将当前样式保存为用户的默认样式

#### 方案B：完整功能（推荐）
在面板底部添加三个按钮：
1. **保存为默认** - 将当前样式保存为用户的默认样式
2. **另存为** - 弹出对话框，输入样式名称，保存为新样式
3. **重置为默认** - 恢复到系统默认样式

### 推荐方案：方案B（完整功能）

#### 按钮设计
```
┌─────────────────────────────────────────────────────────────┐
│  重置为默认    另存为新样式              保存为默认   完成  │
└─────────────────────────────────────────────────────────────┘
```

#### 功能说明

**1. 保存为默认**
- 调用 `reportStore.saveStyleConfig(currentStyleName, true)`
- 将当前样式设置为用户的默认样式
- 页面刷新后自动加载此默认样式

**2. 另存为新样式**
- 弹出对话框，让用户输入样式名称
- 调用 `reportStore.saveStyleConfig(newName, false)`
- 保存为新的命名样式（不设为默认）

**3. 重置为默认**
- 调用 `reportStore.resetStyleConfig()`
- 恢复到系统默认样式

### 实现步骤

#### 步骤1：修改 `StyleSettingsPanel` 组件

**修改文件**: `client/src/components/report/StyleSettingsPanel.tsx`

**新增状态**:
```typescript
const [showSaveDialog, setShowSaveDialog] = useState(false)
const [newStyleName, setNewStyleName] = useState('')
const [isSaving, setIsSaving] = useState(false)
```

**新增处理函数**:
```typescript
// 保存为默认
const handleSaveAsDefault = async () => {
  setIsSaving(true)
  try {
    await saveStyleConfig('默认样式', true)
    showToast('已保存为默认样式', 'success')
  } catch (error) {
    showToast('保存失败', 'error')
  } finally {
    setIsSaving(false)
  }
}

// 另存为
const handleSaveAs = async () => {
  if (!newStyleName.trim()) {
    showToast('请输入样式名称', 'error')
    return
  }
  setIsSaving(true)
  try {
    await saveStyleConfig(newStyleName.trim(), false)
    setShowSaveDialog(false)
    setNewStyleName('')
    showToast('样式已保存', 'success')
  } catch (error) {
    showToast('保存失败', 'error')
  } finally {
    setIsSaving(false)
  }
}
```

**修改底部按钮区域**:
```jsx
<div className="panel-footer">
  <button className="btn btn-secondary" onClick={handleReset}>
    重置为默认
  </button>
  <button className="btn btn-secondary" onClick={() => setShowSaveDialog(true)}>
    另存为
  </button>
  <button 
    className="btn btn-primary" 
    onClick={handleSaveAsDefault}
    disabled={isSaving}
  >
    {isSaving ? '保存中...' : '保存为默认'}
  </button>
  <button className="btn btn-primary" onClick={onClose}>
    完成
  </button>
</div>
```

**添加保存对话框**:
```jsx
{showSaveDialog && (
  <div className="modal-overlay">
    <div className="modal">
      <h4>另存为新样式</h4>
      <input
        type="text"
        value={newStyleName}
        onChange={(e) => setNewStyleName(e.target.value)}
        placeholder="输入样式名称"
        autoFocus
      />
      <div className="modal-actions">
        <button onClick={() => setShowSaveDialog(false)}>取消</button>
        <button 
          onClick={handleSaveAs}
          disabled={isSaving || !newStyleName.trim()}
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  </div>
)}
```

#### 步骤2：修改 `reportStore.ts`

确保 `saveStyleConfig` 方法已实现：
```typescript
saveStyleConfig: async (name: string, isDefault: boolean = false) => {
  const { styleConfig } = get()
  set({ isLoading: true, error: null })
  try {
    const response = await reportApi.saveStyleConfig({
      name,
      config: styleConfig,
      isDefault
    })
    if (!response?.success) {
      throw new Error(response?.error || '保存样式失败')
    }
    await get().loadStyleConfigs()
    set({ isLoading: false })
  } catch (error: any) {
    console.error('保存样式失败:', error)
    set({ error: error.message || '保存样式失败', isLoading: false })
    throw error
  }
},
```

#### 步骤3：添加Toast提示

需要在组件中添加Toast提示功能。可以使用现有的toast系统或添加简单的提示。

### UI样式更新

```css
.panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e8e8e8;
  background: #fafafa;
}

.btn {
  padding: 8px 20px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: #1890ff;
  color: #fff;
}

.btn-primary:hover {
  background: #40a9ff;
}

.btn-secondary {
  background: #fff;
  border: 1px solid #d9d9d9;
  color: #666;
}

.btn-secondary:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  min-width: 300px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.modal h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
}

.modal input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
```

### 验收标准

1. ✅ 用户可以点击"保存为默认"将当前样式保存为默认样式
2. ✅ 用户可以点击"另存为"保存为新的命名样式
3. ✅ 页面刷新后，样式自动加载用户的默认样式
4. ✅ 用户可以切换不同的已保存样式
5. ✅ 重置为默认后恢复到系统默认样式

### 修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `client/src/components/report/StyleSettingsPanel.tsx` | 添加保存按钮、另存为对话框、保存逻辑 |
| `client/src/stores/reportStore.ts` | 确保 `saveStyleConfig` 方法完整（已存在） |

### 风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 用户未保存直接关闭面板 | 低 | 内存中的样式在会话期间有效，下次打开仍可保存 |
| 保存失败 | 低 | 添加错误提示，保留内存中的样式 |
| 样式名称重复 | 低 | 后端应处理重复名称（覆盖或报错） |

### 备选方案：自动保存

如果用户希望更简单的体验，可以采用自动保存方案：

```typescript
// 在 updateStyleConfig 中添加自动保存逻辑
updateStyleConfig: async (config) => {
  set((state) => ({
    styleConfig: { ...state.styleConfig, ...config }
  }))

  // 防抖保存
  clearTimeout(state.saveTimeout)
  const saveTimeout = setTimeout(async () => {
    await get().saveStyleConfig('自动保存', true)
  }, 2000)

  set({ saveTimeout })
}
```

但自动保存可能导致：
- 频繁的API调用
- 网络错误时的数据丢失
- 用户困惑（不知道何时保存）

因此**推荐使用手动保存方案**。
