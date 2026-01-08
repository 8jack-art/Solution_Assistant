import React, { useCallback, useState, useMemo } from 'react'
import { useReportStore } from '../../stores/reportStore'
import type { 
  CoverSection, 
  TableOfContentsSection, 
  BodySection, 
  AppendixSection,
  ReportSections 
} from '../../types/report'

// 默认封面配置
const defaultCover: CoverSection = {
  enabled: true,
  title: '投资方案报告',
  subtitle: '',
  projectName: '',
  companyName: '',
  author: '',
  date: new Date().toISOString().split('T')[0],
  logo: undefined
}

// 默认目录配置
const defaultTOC: TableOfContentsSection = {
  enabled: true,
  title: '目录',
  includePageNumbers: true,
  depth: 3
}

// 默认正文和附录
const defaultBodySection: BodySection = {
  id: 'main',
  title: '项目概述',
  content: '',
  level: 1
}

const defaultAppendixSection: AppendixSection = {
  id: 'appendix-1',
  title: '附录',
  content: ''
}

interface SectionConfigPanelProps {
  onClose?: () => void
}

export const SectionConfigPanel: React.FC<SectionConfigPanelProps> = ({ onClose }) => {
  const { sections, updateSections, resetSections } = useReportStore()
  
  // 当前编辑状态
  const [activeTab, setActiveTab] = useState<'cover' | 'toc' | 'body' | 'appendix'>('cover')
  const [editingBodyId, setEditingBodyId] = useState<string | null>(null)
  const [editingAppendixId, setEditingAppendixId] = useState<string | null>(null)

  // 当前sections数据（使用默认值填充）
  const currentSections = useMemo((): ReportSections => ({
    cover: sections?.cover || defaultCover,
    toc: sections?.toc || defaultTOC,
    body: sections?.body || [defaultBodySection],
    appendix: sections?.appendix || [defaultAppendixSection]
  }), [sections])

  // 处理封面变更
  const handleCoverChange = useCallback((field: keyof CoverSection, value: any) => {
    updateSections({
      cover: {
        ...currentSections.cover,
        [field]: value
      }
    })
  }, [currentSections.cover, updateSections])

  // 处理目录变更
  const handleTOCChange = useCallback((field: keyof TableOfContentsSection, value: any) => {
    updateSections({
      toc: {
        ...currentSections.toc,
        [field]: value
      }
    })
  }, [currentSections.toc, updateSections])

  // 添加正文章节
  const handleAddBodySection = useCallback(() => {
    const newSection: BodySection = {
      id: `body-${Date.now()}`,
      title: `章节 ${(currentSections.body?.length || 0) + 1}`,
      content: '',
      level: 1
    }
    updateSections({
      body: [...(currentSections.body || []), newSection]
    })
    setEditingBodyId(newSection.id)
  }, [currentSections.body, updateSections])

  // 更新正文章节
  const handleUpdateBodySection = useCallback((id: string, field: keyof BodySection, value: any) => {
    updateSections({
      body: (currentSections.body || []).map(section =>
        section.id === id ? { ...section, [field]: value } : section
      )
    })
  }, [currentSections.body, updateSections])

  // 删除正文章节
  const handleDeleteBodySection = useCallback((id: string) => {
    const bodySections = (currentSections.body || []).filter(s => s.id !== id)
    updateSections({ body: bodySections.length > 0 ? bodySections : [defaultBodySection] })
    setEditingBodyId(null)
  }, [currentSections.body, updateSections])

  // 添加附录章节
  const handleAddAppendixSection = useCallback(() => {
    const newSection: AppendixSection = {
      id: `appendix-${Date.now()}`,
      title: `附录 ${(currentSections.appendix?.length || 0) + 1}`,
      content: ''
    }
    updateSections({
      appendix: [...(currentSections.appendix || []), newSection]
    })
    setEditingAppendixId(newSection.id)
  }, [currentSections.appendix, updateSections])

  // 更新附录章节
  const handleUpdateAppendixSection = useCallback((id: string, field: keyof AppendixSection, value: any) => {
    updateSections({
      appendix: (currentSections.appendix || []).map(section =>
        section.id === id ? { ...section, [field]: value } : section
      )
    })
  }, [currentSections.appendix, updateSections])

  // 删除附录章节
  const handleDeleteAppendixSection = useCallback((id: string) => {
    const appendixSections = (currentSections.appendix || []).filter(s => s.id !== id)
    updateSections({ appendix: appendixSections.length > 0 ? appendixSections : [defaultAppendixSection] })
    setEditingAppendixId(null)
  }, [currentSections.appendix, updateSections])

  // 处理重置
  const handleReset = useCallback(() => {
    resetSections()
  }, [resetSections])

  return (
    <div className="section-config-panel">
      <div className="panel-header">
        <h3>章节配置</h3>
        {onClose && (
          <button className="close-btn" onClick={onClose}>×</button>
        )}
      </div>

      <div className="panel-tabs">
        <button 
          className={`tab ${activeTab === 'cover' ? 'active' : ''}`}
          onClick={() => setActiveTab('cover')}
        >
          封面
        </button>
        <button 
          className={`tab ${activeTab === 'toc' ? 'active' : ''}`}
          onClick={() => setActiveTab('toc')}
        >
          目录
        </button>
        <button 
          className={`tab ${activeTab === 'body' ? 'active' : ''}`}
          onClick={() => setActiveTab('body')}
        >
          正文
        </button>
        <button 
          className={`tab ${activeTab === 'appendix' ? 'active' : ''}`}
          onClick={() => setActiveTab('appendix')}
        >
          附录
        </button>
      </div>

      <div className="panel-content">
        {/* 封面配置 */}
        {activeTab === 'cover' && (
          <div className="tab-content">
            <section className="settings-section">
              <h4>封面设置</h4>
              <div className="settings-grid">
                <div className="setting-item">
                  <label>启用封面</label>
                  <select
                    value={currentSections.cover.enabled ? 'true' : 'false'}
                    onChange={(e) => handleCoverChange('enabled', e.target.value === 'true')}
                  >
                    <option value="true">启用</option>
                    <option value="false">禁用</option>
                  </select>
                </div>
                <div className="setting-item">
                  <label>报告标题</label>
                  <input
                    type="text"
                    value={currentSections.cover.title || ''}
                    onChange={(e) => handleCoverChange('title', e.target.value)}
                    placeholder="输入报告标题"
                  />
                </div>
                <div className="setting-item">
                  <label>副标题</label>
                  <input
                    type="text"
                    value={currentSections.cover.subtitle || ''}
                    onChange={(e) => handleCoverChange('subtitle', e.target.value)}
                    placeholder="输入副标题（可选）"
                  />
                </div>
                <div className="setting-item">
                  <label>项目名称</label>
                  <input
                    type="text"
                    value={currentSections.cover.projectName || ''}
                    onChange={(e) => handleCoverChange('projectName', e.target.value)}
                    placeholder="输入项目名称"
                  />
                </div>
                <div className="setting-item">
                  <label>编制单位</label>
                  <input
                    type="text"
                    value={currentSections.cover.companyName || ''}
                    onChange={(e) => handleCoverChange('companyName', e.target.value)}
                    placeholder="输入编制单位（可选）"
                  />
                </div>
                <div className="setting-item">
                  <label>编制人</label>
                  <input
                    type="text"
                    value={currentSections.cover.author || ''}
                    onChange={(e) => handleCoverChange('author', e.target.value)}
                    placeholder="输入编制人（可选）"
                  />
                </div>
                <div className="setting-item">
                  <label>编制日期</label>
                  <input
                    type="date"
                    value={currentSections.cover.date || ''}
                    onChange={(e) => handleCoverChange('date', e.target.value)}
                  />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 目录配置 */}
        {activeTab === 'toc' && (
          <div className="tab-content">
            <section className="settings-section">
              <h4>目录设置</h4>
              <div className="settings-grid">
                <div className="setting-item">
                  <label>启用目录</label>
                  <select
                    value={currentSections.toc.enabled ? 'true' : 'false'}
                    onChange={(e) => handleTOCChange('enabled', e.target.value === 'true')}
                  >
                    <option value="true">启用</option>
                    <option value="false">禁用</option>
                  </select>
                </div>
                <div className="setting-item">
                  <label>目录标题</label>
                  <input
                    type="text"
                    value={currentSections.toc.title || ''}
                    onChange={(e) => handleTOCChange('title', e.target.value)}
                    placeholder="输入目录标题"
                  />
                </div>
                <div className="setting-item">
                  <label>包含页码</label>
                  <select
                    value={currentSections.toc.includePageNumbers ? 'true' : 'false'}
                    onChange={(e) => handleTOCChange('includePageNumbers', e.target.value === 'true')}
                  >
                    <option value="true">是</option>
                    <option value="false">否</option>
                  </select>
                </div>
                <div className="setting-item">
                  <label>目录深度</label>
                  <select
                    value={currentSections.toc.depth || 3}
                    onChange={(e) => handleTOCChange('depth', Number(e.target.value))}
                  >
                    <option value={1}>1级标题</option>
                    <option value={2}>2级标题</option>
                    <option value={3}>3级标题</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 正文配置 */}
        {activeTab === 'body' && (
          <div className="tab-content">
            <section className="settings-section">
              <div className="section-header">
                <h4>正文章节</h4>
                <button className="btn-add" onClick={handleAddBodySection}>
                  + 添加章节
                </button>
              </div>
              <div className="section-list">
                {(currentSections.body || []).map((section, index) => (
                  <div 
                    key={section.id} 
                    className={`section-item ${editingBodyId === section.id ? 'editing' : ''}`}
                  >
                    <div className="section-header-item">
                      <span className="section-number">{index + 1}</span>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => handleUpdateBodySection(section.id, 'title', e.target.value)}
                        className="section-title-input"
                        placeholder="章节标题"
                      />
                      <select
                        value={section.level}
                        onChange={(e) => handleUpdateBodySection(section.id, 'level', Number(e.target.value))}
                        className="section-level-select"
                      >
                        <option value={1}>一级标题</option>
                        <option value={2}>二级标题</option>
                        <option value={3}>三级标题</option>
                      </select>
                      <button 
                        className="btn-delete"
                        onClick={() => handleDeleteBodySection(section.id)}
                        disabled={(currentSections.body || []).length <= 1}
                      >
                        删除
                      </button>
                    </div>
                    <textarea
                      value={section.content}
                      onChange={(e) => handleUpdateBodySection(section.id, 'content', e.target.value)}
                      className="section-content-input"
                      placeholder="输入章节内容（支持Markdown格式，可使用 {{TABLE:xxx}} 和 {{CHART:xxx}} 插入表格和图表）"
                      rows={4}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* 附录配置 */}
        {activeTab === 'appendix' && (
          <div className="tab-content">
            <section className="settings-section">
              <div className="section-header">
                <h4>附录章节</h4>
                <button className="btn-add" onClick={handleAddAppendixSection}>
                  + 添加附录
                </button>
              </div>
              <div className="section-list">
                {(currentSections.appendix || []).map((section, index) => (
                  <div 
                    key={section.id} 
                    className={`section-item ${editingAppendixId === section.id ? 'editing' : ''}`}
                  >
                    <div className="section-header-item">
                      <span className="section-number">附录 {index + 1}</span>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => handleUpdateAppendixSection(section.id, 'title', e.target.value)}
                        className="section-title-input"
                        placeholder="附录标题"
                      />
                      <button 
                        className="btn-delete"
                        onClick={() => handleDeleteAppendixSection(section.id)}
                        disabled={(currentSections.appendix || []).length <= 1}
                      >
                        删除
                      </button>
                    </div>
                    <textarea
                      value={section.content}
                      onChange={(e) => handleUpdateAppendixSection(section.id, 'content', e.target.value)}
                      className="section-content-input"
                      placeholder="输入附录内容（支持Markdown格式）"
                      rows={4}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      <div className="panel-footer">
        <button className="btn btn-secondary" onClick={handleReset}>
          重置为默认
        </button>
        <button className="btn btn-primary" onClick={onClose}>
          完成
        </button>
      </div>
    </div>
  )
}

export default SectionConfigPanel
