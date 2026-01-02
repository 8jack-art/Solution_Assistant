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
  { value: 'EEEEEE', label: '浅灰色' },
  { value: 'E0E0E0', label: '中灰色' },
  { value: 'D9E2F3', label: '淡蓝色' },
  { value: 'FFF2CC', label: '淡黄色' },
  { value: 'E2EFDA', label: '淡绿色' },
  { value: 'FCE4D6', label: '淡橙色' }
]

interface StyleSettingsPanelProps {
  onClose?: () => void
}

export const StyleSettingsPanel: React.FC<StyleSettingsPanelProps> = ({ onClose }) => {
  const { styleConfig, updateStyleConfig, resetStyleConfig, saveStyleConfig } = useReportStore()
  const [isSaving, setIsSaving] = useState(false)

  // 计算样式预览
  const previewStyle = useMemo(() => ({
    fontFamily: styleConfig?.fonts?.body || defaultStyleConfig.fonts.body,
    fontSize: `${(styleConfig?.fontSizes?.body || defaultStyleConfig.fontSizes.body)}px`,
    lineHeight: styleConfig?.paragraph?.lineSpacing === 'fixed'
      ? '1.5'
      : String(styleConfig?.paragraph?.lineSpacing || 1.5)
  }), [styleConfig])

  // 处理字体变更
  const handleFontChange = useCallback((field: 'body' | 'heading' | 'number', value: string) => {
    updateStyleConfig({
      fonts: {
        ...styleConfig?.fonts,
        [field]: value
      }
    })
  }, [styleConfig, updateStyleConfig])

  // 处理字号变更
  const handleFontSizeChange = useCallback((field: keyof typeof styleConfig.fontSizes, value: number) => {
    updateStyleConfig({
      fontSizes: {
        ...styleConfig?.fontSizes,
        [field]: value
      }
    })
  }, [styleConfig, updateStyleConfig])

  // 处理行间距变更
  const handleLineSpacingChange = useCallback((value: number | 'fixed') => {
    updateStyleConfig({
      paragraph: {
        ...styleConfig?.paragraph,
        lineSpacing: value
      }
    })
  }, [styleConfig, updateStyleConfig])

  // 处理首行缩进变更
  const handleFirstLineIndentChange = useCallback((value: number) => {
    updateStyleConfig({
      paragraph: {
        ...styleConfig?.paragraph,
        firstLineIndent: value
      }
    })
  }, [styleConfig, updateStyleConfig])

  // 处理页面边距变更
  const handleMarginChange = useCallback((field: string, value: number) => {
    updateStyleConfig({
      page: {
        ...styleConfig?.page,
        margin: {
          ...styleConfig?.page?.margin,
          [field]: value
        }
      }
    })
  }, [styleConfig, updateStyleConfig])

  // 处理表格样式变更
  const handleTableStyleChange = useCallback((field: string, value: any) => {
    updateStyleConfig({
      table: {
        ...styleConfig?.table,
        [field]: value
      }
    })
  }, [styleConfig, updateStyleConfig])

  // 处理保存为默认
  const handleSaveAsDefault = useCallback(async () => {
    setIsSaving(true)
    try {
      await saveStyleConfig('默认样式', true)
    } catch (error: any) {
      console.error('保存样式失败:', error)
    } finally {
      setIsSaving(false)
    }
  }, [saveStyleConfig])

  // 处理重置
  const handleReset = useCallback(() => {
    resetStyleConfig()
  }, [resetStyleConfig])

  return (
    <div className="style-settings-panel">
      <div className="panel-header">
        <h3>样式设置</h3>
        {onClose && (
          <button className="close-btn" onClick={onClose}>×</button>
        )}
      </div>

      <div className="panel-content">
        {/* 字体设置 */}
        <section className="settings-section">
          <h4>字体设置</h4>
          <div className="settings-grid">
            <div className="setting-item">
              <label>正文字体</label>
              <select
                value={styleConfig?.fonts?.body || defaultStyleConfig.fonts.body}
                onChange={(e) => handleFontChange('body', e.target.value)}
              >
                {fontOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>标题字体</label>
              <select
                value={styleConfig?.fonts?.heading || defaultStyleConfig.fonts.heading}
                onChange={(e) => handleFontChange('heading', e.target.value)}
              >
                {fontOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>数字字体</label>
              <select
                value={styleConfig?.fonts?.number || defaultStyleConfig.fonts.number}
                onChange={(e) => handleFontChange('number', e.target.value)}
              >
                {fontOptions.filter(f => ['Arial', 'Times New Roman', 'Calibri'].includes(f.value)).map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 字号设置 */}
        <section className="settings-section">
          <h4>字号设置</h4>
          <div className="settings-grid">
            <div className="setting-item">
              <label>标题字号</label>
              <select
                value={styleConfig?.fontSizes?.title || defaultStyleConfig.fontSizes.title}
                onChange={(e) => handleFontSizeChange('title', Number(e.target.value))}
              >
                {fontSizeOptions.filter(s => s.value >= 12).map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>正文字号</label>
              <select
                value={styleConfig?.fontSizes?.body || defaultStyleConfig.fontSizes.body}
                onChange={(e) => handleFontSizeChange('body', Number(e.target.value))}
              >
                {fontSizeOptions.filter(s => s.value <= 18).map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>表头字号</label>
              <select
                value={styleConfig?.fontSizes?.tableHeader || defaultStyleConfig.fontSizes.tableHeader}
                onChange={(e) => handleFontSizeChange('tableHeader', Number(e.target.value))}
              >
                {fontSizeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>表体字号</label>
              <select
                value={styleConfig?.fontSizes?.tableBody || defaultStyleConfig.fontSizes.tableBody}
                onChange={(e) => handleFontSizeChange('tableBody', Number(e.target.value))}
              >
                {fontSizeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 段落设置 */}
        <section className="settings-section">
          <h4>段落设置</h4>
          <div className="settings-grid">
            <div className="setting-item">
              <label>行间距</label>
              <select
                value={styleConfig?.paragraph?.lineSpacing || defaultStyleConfig.paragraph.lineSpacing}
                onChange={(e) => handleLineSpacingChange(e.target.value === 'fixed' ? 'fixed' : Number(e.target.value))}
              >
                {lineSpacingOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>首行缩进</label>
              <select
                value={styleConfig?.paragraph?.firstLineIndent ?? 2}
                onChange={(e) => handleFirstLineIndentChange(Number(e.target.value))}
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
          <h4>页面边距</h4>
          <div className="settings-grid">
            <div className="setting-item">
              <label>上边距</label>
              <select
                value={styleConfig?.page?.margin?.top || defaultStyleConfig.page.margin.top}
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
                value={styleConfig?.page?.margin?.bottom || defaultStyleConfig.page.margin.bottom}
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
                value={styleConfig?.page?.margin?.left || defaultStyleConfig.page.margin.left}
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
                value={styleConfig?.page?.margin?.right || defaultStyleConfig.page.margin.right}
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
          <h4>表格样式</h4>
          <div className="settings-grid">
            <div className="setting-item">
              <label>表头背景色</label>
              <select
                value={styleConfig?.table?.headerBg || defaultStyleConfig.table.headerBg}
                onChange={(e) => handleTableStyleChange('headerBg', e.target.value)}
              >
                {headerBgOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>斑马纹</label>
              <select
                value={styleConfig?.table?.zebraStripe ? 'true' : 'false'}
                onChange={(e) => handleTableStyleChange('zebraStripe', e.target.value === 'true')}
              >
                <option value="true">启用</option>
                <option value="false">禁用</option>
              </select>
            </div>
            <div className="setting-item">
              <label>单元格对齐</label>
              <select
                value={styleConfig?.table?.alignment || defaultStyleConfig.table.alignment}
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
          <h4>样式预览</h4>
          <div className="style-preview" style={previewStyle}>
            <p>这是正文字体的预览文本，用于查看当前设置的显示效果。</p>
            <p><strong>这是标题预览</strong></p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: styleConfig?.table?.headerBg || defaultStyleConfig.table.headerBg }}>
                  <th style={{ padding: '8px', border: '1px solid #000' }}>表头1</th>
                  <th style={{ padding: '8px', border: '1px solid #000' }}>表头2</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ backgroundColor: styleConfig?.table?.zebraStripe ? '#F5F5F5' : 'transparent' }}>
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
        <button className="btn btn-secondary" onClick={handleReset}>
          重置为默认
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

      <style>{`
        .style-settings-panel {
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
          background: #fafafa;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
          padding: 0;
          line-height: 1;
        }

        .close-btn:hover {
          color: #333;
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
          color: #666;
          border-bottom: 1px solid #e8e8e8;
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
          border-color: #1890ff;
        }

        .style-preview {
          padding: 16px;
          background: #f5f5f5;
          border-radius: 4px;
          font-size: 14px;
        }

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

        .btn-secondary {
          background: #fff;
          border: 1px solid #d9d9d9;
          color: #666;
        }

        .btn-secondary:hover {
          border-color: #1890ff;
          color: #1890ff;
        }

        .btn-primary {
          background: #1890ff;
          color: #fff;
        }

        .btn-primary:hover {
          background: #40a9ff;
        }
      `}</style>
    </div>
  )
}

export default StyleSettingsPanel
