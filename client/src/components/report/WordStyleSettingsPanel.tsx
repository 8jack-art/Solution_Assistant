import React, { useCallback, useMemo, useState } from 'react'
import { useReportStore } from '../../stores/reportStore'
import type { ReportStyleConfig } from '../../types/report'

// 默认样式配置
const defaultStyleConfig: ReportStyleConfig = {
  fonts: {
    body: '宋体',
    heading: '黑体',
    number: 'Times New Roman'
  },
  fontSizes: {
    title: 32,
    body: 16,
    tableTitle: 18,
    tableHeader: 14,
    tableBody: 14
  },
  paragraph: {
    lineSpacing: 1.5,
    spaceBefore: 0,
    spaceAfter: 0,
    firstLineIndent: 2,
    headingIndent: 0
  },
  heading1: {
    font: '黑体',
    fontSize: 22,
    bold: true,
    lineSpacing: 1.5,
    spaceBefore: 0,
    spaceAfter: 6,
    firstLineIndent: 0
  },
  heading2: {
    font: '黑体',
    fontSize: 16,
    bold: true,
    lineSpacing: 1.5,
    spaceBefore: 6,
    spaceAfter: 6,
    firstLineIndent: 0
  },
  body: {
    font: '宋体',
    fontSize: 12,
    bold: false,
    lineSpacing: 1.5,
    spaceBefore: 0,
    spaceAfter: 0,
    firstLineIndent: 2
  },
  page: {
    margin: {
      top: 2.54,
      bottom: 2.54,
      left: 3.17,
      right: 3.17
    },
    orientation: 'portrait'
  },
  table: {
    headerBg: 'EEEEEE',
    border: 'single',
    zebraStripe: true,
    alignment: 'left'
  }
}

// 可用字体列表
const fontOptions = [
  { value: '宋体', label: '宋体' },
  { value: '仿宋_GB2312', label: '仿宋_GB2312' },
  { value: '黑体', label: '黑体' },
  { value: '微软雅黑', label: '微软雅黑' },
  { value: '楷体', label: '楷体' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Calibri', label: 'Calibri' }
]

// 可用字号列表
const fontSizeOptions = [
  { value: 10.5, label: '五号 10.5pt' },
  { value: 12, label: '小四 12pt' },
  { value: 14, label: '四号 14pt' },
  { value: 15, label: '小三 15pt' },
  { value: 16, label: '三号 16pt' },
  { value: 18, label: '小二 18pt' },
  { value: 22, label: '二号 22pt' },
  { value: 24, label: '小一 24pt' },
  { value: 28, label: '一号 28pt' },
  { value: 36, label: '初号 36pt' }
]

// 行间距选项
const lineSpacingOptions = [
  { value: 1, label: '单倍行距' },
  { value: 1.5, label: '1.5倍行距' },
  { value: 2, label: '双倍行距' },
  { value: 'fixed', label: '固定值' }
]

// 首行缩进选项
const firstLineIndentOptions = [
  { value: 0, label: '无缩进' },
  { value: 2, label: '2字符（标准）' },
  { value: 4, label: '4字符' },
  { value: 6, label: '6字符' }
]

// 边距选项（cm）
const marginOptions = [
  { value: 1.5, label: '1.5cm' },
  { value: 2, label: '2cm' },
  { value: 2.2, label: '2.2cm' },
  { value: 2.5, label: '2.5cm' },
  { value: 3.17, label: '3.17cm（默认）' }
]

// 表头背景色选项
const headerBgOptions = [
  { value: '', label: '无' },
  { value: 'EEEEEE', label: '浅灰色' },
  { value: 'E0E0E0', label: '中灰色' },
  { value: 'D9E2F3', label: '淡蓝色' },
  { value: 'FFF2CC', label: '淡黄色' },
  { value: 'E2EFDA', label: '淡绿色' },
  { value: 'FCE4D6', label: '淡橙色' }
]

interface WordStyleSettingsPanelProps {
  onClose?: () => void
}

export const WordStyleSettingsPanel: React.FC<WordStyleSettingsPanelProps> = ({ onClose }) => {
  const { wordStyleConfig, updateWordStyleConfig, saveWordStyleConfig } = useReportStore()
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedConfig, setLastSavedConfig] = useState<ReportStyleConfig | null>(null)

  // 计算样式预览
  const previewStyle = useMemo(() => ({
    fontFamily: wordStyleConfig?.body?.font || defaultStyleConfig.body.font,
    fontSize: `${(wordStyleConfig?.body?.fontSize || defaultStyleConfig.body.fontSize)}px`,
    fontWeight: (wordStyleConfig?.body?.bold || defaultStyleConfig.body.bold) ? 'bold' : 'normal',
    lineHeight: String(wordStyleConfig?.body?.lineSpacing || 1.5)
  }), [wordStyleConfig])

  // 自动保存样式配置到数据库
  const autoSave = useCallback(async (config: ReportStyleConfig) => {
    if (isSaving) return
    
    if (lastSavedConfig && JSON.stringify(config) === JSON.stringify(lastSavedConfig)) {
      return
    }

    setIsSaving(true)
    try {
      console.log('[WordStyleSettingsPanel] 开始保存Word样式配置...')
      await saveWordStyleConfig()
      setLastSavedConfig(config)
      console.log('[WordStyleSettingsPanel] Word样式配置已保存')
    } catch (error: any) {
      console.error('自动保存Word样式失败:', error)
    } finally {
      setIsSaving(false)
    }
  }, [saveWordStyleConfig, isSaving, lastSavedConfig])

  // 处理表格样式变更
  const handleTableStyleChange = useCallback((field: string, value: any) => {
    const newConfig = {
      table: {
        ...wordStyleConfig?.table,
        [field]: value
      }
    }
    updateWordStyleConfig(newConfig)
    autoSave({ ...wordStyleConfig, ...newConfig })
  }, [wordStyleConfig, updateWordStyleConfig, autoSave])

  // 处理页面边距变更
  const handleMarginChange = useCallback((field: string, value: number) => {
    const newConfig = {
      page: {
        ...wordStyleConfig?.page,
        margin: {
          ...wordStyleConfig?.page?.margin,
          [field]: value
        }
      }
    }
    updateWordStyleConfig(newConfig)
    autoSave({ ...wordStyleConfig, ...newConfig })
  }, [wordStyleConfig, updateWordStyleConfig, autoSave])

  // 处理标题1样式变更
  const handleHeading1Change = useCallback((field: string, value: any) => {
    const newConfig = {
      heading1: {
        ...wordStyleConfig?.heading1,
        [field]: value
      }
    }
    updateWordStyleConfig(newConfig)
    autoSave({ ...wordStyleConfig, ...newConfig })
  }, [wordStyleConfig, updateWordStyleConfig, autoSave])

  // 处理标题2样式变更
  const handleHeading2Change = useCallback((field: string, value: any) => {
    const newConfig = {
      heading2: {
        ...wordStyleConfig?.heading2,
        [field]: value
      }
    }
    updateWordStyleConfig(newConfig)
    autoSave({ ...wordStyleConfig, ...newConfig })
  }, [wordStyleConfig, updateWordStyleConfig, autoSave])

  // 处理正文样式变更
  const handleBodyChange = useCallback((field: string, value: any) => {
    const newConfig = {
      body: {
        ...wordStyleConfig?.body,
        [field]: value
      }
    }
    updateWordStyleConfig(newConfig)
    autoSave({ ...wordStyleConfig, ...newConfig })
  }, [wordStyleConfig, updateWordStyleConfig, autoSave])

  return (
    <div className="word-style-settings-panel">
      <div className="panel-header">
        <h3>Word 导出样式设置</h3>
        {isSaving && <span className="saving-indicator">保存中...</span>}
        {!isSaving && lastSavedConfig && <span className="saved-indicator">已保存</span>}
      </div>
      
      <div className="panel-content">
        {/* 标题1样式设置 */}
        <section className="settings-section">
          <h4>标题1样式（Word导出）</h4>
          <div className="settings-grid">
            <div className="setting-item">
              <label>字体</label>
              <select
                value={wordStyleConfig?.heading1?.font || defaultStyleConfig.heading1.font}
                onChange={(e) => handleHeading1Change('font', e.target.value)}
              >
                {fontOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>字号</label>
              <select
                value={wordStyleConfig?.heading1?.fontSize || defaultStyleConfig.heading1.fontSize}
                onChange={(e) => handleHeading1Change('fontSize', Number(e.target.value))}
              >
                {fontSizeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>行间距</label>
              <select
                value={wordStyleConfig?.heading1?.lineSpacing || defaultStyleConfig.heading1.lineSpacing}
                onChange={(e) => handleHeading1Change('lineSpacing', e.target.value === 'fixed' ? 'fixed' : Number(e.target.value))}
              >
                {lineSpacingOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item checkbox-item">
              <label>
                <input
                  type="checkbox"
                  checked={wordStyleConfig?.heading1?.bold ?? defaultStyleConfig.heading1.bold}
                  onChange={(e) => handleHeading1Change('bold', e.target.checked)}
                />
                加粗
              </label>
            </div>
          </div>
        </section>

        {/* 标题2样式设置 */}
        <section className="settings-section">
          <h4>标题2样式（Word导出）</h4>
          <div className="settings-grid">
            <div className="setting-item">
              <label>字体</label>
              <select
                value={wordStyleConfig?.heading2?.font || defaultStyleConfig.heading2.font}
                onChange={(e) => handleHeading2Change('font', e.target.value)}
              >
                {fontOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>字号</label>
              <select
                value={wordStyleConfig?.heading2?.fontSize || defaultStyleConfig.heading2.fontSize}
                onChange={(e) => handleHeading2Change('fontSize', Number(e.target.value))}
              >
                {fontSizeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>行间距</label>
              <select
                value={wordStyleConfig?.heading2?.lineSpacing || defaultStyleConfig.heading2.lineSpacing}
                onChange={(e) => handleHeading2Change('lineSpacing', e.target.value === 'fixed' ? 'fixed' : Number(e.target.value))}
              >
                {lineSpacingOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item checkbox-item">
              <label>
                <input
                  type="checkbox"
                  checked={wordStyleConfig?.heading2?.bold ?? defaultStyleConfig.heading2.bold}
                  onChange={(e) => handleHeading2Change('bold', e.target.checked)}
                />
                加粗
              </label>
            </div>
          </div>
        </section>

        {/* 正文样式设置 */}
        <section className="settings-section">
          <h4>正文样式（Word导出）</h4>
          <div className="settings-grid">
            <div className="setting-item">
              <label>字体</label>
              <select
                value={wordStyleConfig?.body?.font || defaultStyleConfig.body.font}
                onChange={(e) => handleBodyChange('font', e.target.value)}
              >
                {fontOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>字号</label>
              <select
                value={wordStyleConfig?.body?.fontSize || defaultStyleConfig.body.fontSize}
                onChange={(e) => handleBodyChange('fontSize', Number(e.target.value))}
              >
                {fontSizeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>行间距</label>
              <select
                value={wordStyleConfig?.body?.lineSpacing || defaultStyleConfig.body.lineSpacing}
                onChange={(e) => handleBodyChange('lineSpacing', e.target.value === 'fixed' ? 'fixed' : Number(e.target.value))}
              >
                {lineSpacingOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>首行缩进</label>
              <select
                value={wordStyleConfig?.body?.firstLineIndent ?? defaultStyleConfig.body.firstLineIndent}
                onChange={(e) => handleBodyChange('firstLineIndent', Number(e.target.value))}
              >
                {firstLineIndentOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 页面设置 */}
        <section className="settings-section">
          <h4>页面边距（Word导出）</h4>
          <div className="settings-grid">
            <div className="setting-item">
              <label>上边距</label>
              <select
                value={wordStyleConfig?.page?.margin?.top || defaultStyleConfig.page.margin.top}
                onChange={(e) => handleMarginChange('top', Number(e.target.value))}
              >
                {marginOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>下边距</label>
              <select
                value={wordStyleConfig?.page?.margin?.bottom || defaultStyleConfig.page.margin.bottom}
                onChange={(e) => handleMarginChange('bottom', Number(e.target.value))}
              >
                {marginOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>左边距</label>
              <select
                value={wordStyleConfig?.page?.margin?.left || defaultStyleConfig.page.margin.left}
                onChange={(e) => handleMarginChange('left', Number(e.target.value))}
              >
                {marginOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>右边距</label>
              <select
                value={wordStyleConfig?.page?.margin?.right || defaultStyleConfig.page.margin.right}
                onChange={(e) => handleMarginChange('right', Number(e.target.value))}
              >
                {marginOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 表格样式设置 */}
        <section className="settings-section">
          <h4>表格样式（Word导出）</h4>
          <div className="settings-grid">
            <div className="setting-item">
              <label>表头背景色</label>
              <select
                value={wordStyleConfig?.table?.headerBg || defaultStyleConfig.table.headerBg}
                onChange={(e) => handleTableStyleChange('headerBg', e.target.value)}
              >
                {headerBgOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item checkbox-item">
              <label>
                <input
                  type="checkbox"
                  checked={wordStyleConfig?.table?.zebraStripe ?? defaultStyleConfig.table.zebraStripe}
                  onChange={(e) => handleTableStyleChange('zebraStripe', e.target.checked)}
                />
                斑马纹
              </label>
            </div>
            <div className="setting-item">
              <label>单元格对齐</label>
              <select
                value={wordStyleConfig?.table?.alignment || defaultStyleConfig.table.alignment}
                onChange={(e) => handleTableStyleChange('alignment', e.target.value)}
              >
                <option value="left">左对齐</option>
                <option value="center">居中</option>
                <option value="right">右对齐</option>
              </select>
            </div>
          </div>
        </section>

        {/* 样式预览 */}
        <section className="settings-section">
          <h4>Word导出样式预览</h4>
          <div className="style-preview" style={previewStyle}>
            <p>这是Word导出时正文字体的预览文本，用于查看当前设置的显示效果。</p>
            <p style={{ 
              fontWeight: (wordStyleConfig?.heading1?.bold ?? defaultStyleConfig.heading1.bold) ? 'bold' : 'normal', 
              fontFamily: wordStyleConfig?.heading1?.font || defaultStyleConfig.heading1.font, 
              fontSize: `${(wordStyleConfig?.heading1?.fontSize || defaultStyleConfig.heading1.fontSize) * 1.2}px` 
            }}>这是标题1预览（Word导出）</p>
            <p style={{ 
              fontWeight: (wordStyleConfig?.heading2?.bold ?? defaultStyleConfig.heading2.bold) ? 'bold' : 'normal', 
              fontFamily: wordStyleConfig?.heading2?.font || defaultStyleConfig.heading2.font, 
              fontSize: `${(wordStyleConfig?.heading2?.fontSize || defaultStyleConfig.heading2.fontSize) * 1.2}px` 
            }}>这是标题2预览（Word导出）</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: (wordStyleConfig?.table?.headerBg || defaultStyleConfig.table.headerBg) || 'transparent' }}>
                  <th style={{ padding: '8px', border: '1px solid #000' }}>表头1</th>
                  <th style={{ padding: '8px', border: '1px solid #000' }}>表头2</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ backgroundColor: (wordStyleConfig?.table?.zebraStripe ?? defaultStyleConfig.table.zebraStripe) ? '#F5F5F5' : 'transparent' }}>
                  <td style={{ padding: '8px', border: '1px solid #000' }}>数据1</td>
                  <td style={{ padding: '8px', border: '1px solid #000' }}>数据2</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', border: '1px solid #000' }}>数据3</td>
                  <td style={{ padding: '8px', border: '1px solid #000' }}>数据4</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="panel-footer">
        <button className="btn btn-primary" onClick={onClose}>
          完成
        </button>
      </div>

      <style>{`
        .word-style-settings-panel {
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          max-width: 600px;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e8e8e8;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .panel-header h3 {
          margin: 0;
          font-size: 16px;
          color: #fff;
        }

        .saving-indicator {
          font-size: 12px;
          color: #ffd700;
        }

        .saved-indicator {
          font-size: 12px;
          color: #90EE90;
        }

        .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
        }

        .settings-section {
          margin-bottom: 24px;
        }

        .settings-section h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #667eea;
          border-bottom: 2px solid #667eea;
          padding-bottom: 8px;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .setting-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .setting-item.checkbox-item {
          flex-direction: row;
          align-items: center;
        }
        
        .setting-item.checkbox-item label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        
        .setting-item.checkbox-item input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .setting-item label {
          font-size: 12px;
          color: #666;
        }

        .setting-item select {
          padding: 8px 12px;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          font-size: 14px;
          background: #fff;
          cursor: pointer;
          min-height: 40px;
          line-height: 1.5;
        }

        .setting-item select option {
          padding: 8px 12px;
          min-height: 36px;
        }

        .setting-item select:hover {
          border-color: #667eea;
        }

        .style-preview {
          padding: 16px;
          background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
          border-radius: 4px;
          font-size: 14px;
        }

        .panel-footer {
          display: flex;
          justify-content: flex-end;
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%);
        }
      `}</style>
    </div>
  )
}

export default WordStyleSettingsPanel
