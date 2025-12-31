import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Card,
  Group,
  Stack,
  LoadingOverlay,
  Divider,
  Grid,
  Select,
  TextInput,
  ActionIcon,
  Tooltip,
  Progress,
  Alert,
  Modal,
} from '@mantine/core'
import { 
  IconFileText, 
  IconArrowLeft, 
  IconEdit, 
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerStop,
  IconDownload,
  IconEye,
  IconTemplate,
  IconDeviceFloppy,
  IconRefresh,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { projectApi, reportApi, investmentApi } from '@/lib/api'
import PromptEditor from '@/components/report/PromptEditor'
import EnhancedStreamingOutput from '@/components/report/EnhancedStreamingOutput'
import WordPreview from '@/components/report/WordPreview'

interface ReportTemplate {
  id: string
  name: string
  description?: string
  prompt_template: string
  is_default: boolean
  is_system: boolean
}

interface Report {
  id: string
  project_id: string
  template_id?: string
  user_id: string
  report_title: string
  report_content?: string
  generation_status: 'generating' | 'completed' | 'failed' | 'paused'
  created_at: string
  updated_at: string
}

// 投资估算数据结构（与InvestmentSummary.tsx保持一致）
interface InvestmentItem {
  id: string
  序号: string
  工程或费用名称: string
  建设工程费?: number
  设备购置费?: number
  安装工程费?: number
  其它费用?: number
  合计: number
  占总投资比例?: number
  备注?: string
  children?: InvestmentItem[]
  [key: string]: any
}

interface InvestmentEstimateData {
  partA: InvestmentItem
  partB: InvestmentItem
  partC: InvestmentItem
  partD: InvestmentItem
  partE: InvestmentItem
  partF: {
    贷款总额: number
    年利率: number
    建设期年限: number
    分年利息: Array<{
      年份: number
      期初本金累计: number
      当期借款金额: number
      当期利息: number
    }>
    合计: number
    占总投资比例: number
  }
  partG: InvestmentItem
  iterationCount: number
  gapRate: number
}

interface InvestmentEstimateFull {
  id: string
  project_id: string
  estimate_data: InvestmentEstimateData
  construction_cost: number
  equipment_cost: number
  installation_cost: number
  other_cost: number
  land_cost: number
  basic_reserve: number
  price_reserve: number
  construction_interest: number
  final_total: number
  loan_amount: number
  created_at: string
  updated_at: string
}

/**
 * 投资方案报告生成页面
 */
const InvestmentReport: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  // 状态管理
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<any>(null)
  const [investmentEstimate, setInvestmentEstimate] = useState<InvestmentEstimateFull | null>(null)
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [currentTemplate, setCurrentTemplate] = useState<ReportTemplate | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [reportTitle, setReportTitle] = useState('')
  const [currentReport, setCurrentReport] = useState<Report | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [reportContent, setReportContent] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [templateModalOpened, setTemplateModalOpened] = useState(false)

  // 引用
  const eventSourceRef = useRef<EventSource | null>(null)

  // 加载项目数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // 获取项目信息
        const projectResponse = await projectApi.getById(id!)
        if (projectResponse.success && projectResponse.data) {
          setProject(projectResponse.data.project)
          setReportTitle(`${projectResponse.data.project.project_name}投资方案报告`)
        } else {
          notifications.show({
            title: '错误',
            message: '加载项目数据失败',
            color: 'red',
          })
          navigate('/dashboard')
          return
        }

        // 获取投资估算数据
        try {
          const estimateResponse = await investmentApi.getByProjectId(id!)
          if (estimateResponse.success && estimateResponse.data?.estimate) {
            setInvestmentEstimate(estimateResponse.data.estimate as InvestmentEstimateFull)
          }
        } catch (error) {
          console.warn('加载投资估算数据失败:', error)
        }

        // 获取报告模板
        const templatesResponse = await reportApi.getTemplates()
        if (templatesResponse.success && templatesResponse.data) {
          setTemplates(templatesResponse.data.templates)
          
          // 设置默认模板
          const defaultTemplate = templatesResponse.data.templates.find((t: ReportTemplate) => t.is_default)
          if (defaultTemplate) {
            setCurrentTemplate(defaultTemplate)
            setCustomPrompt(defaultTemplate.prompt_template)
          }
        }

        // 获取最新的报告
        const reportsResponse = await reportApi.getByProjectId(id!)
        if (reportsResponse.success && reportsResponse.data?.reports && reportsResponse.data.reports.length > 0) {
          const latestReport = reportsResponse.data.reports[0]
          setCurrentReport(latestReport)
          if (latestReport.report_content) {
            setReportContent(latestReport.report_content)
          }
        }
      } catch (error) {
        console.error('加载数据失败:', error)
        notifications.show({
          title: '错误',
          message: '加载数据时发生错误',
          color: 'red',
        })
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadData()
    }
  }, [id, navigate])

  // 清理EventSource
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [])

  // 生成报告
  const handleGenerate = async () => {
    if (!project) {
      notifications.show({
        title: '错误',
        message: '项目数据未加载',
        color: 'red',
      })
      return
    }

    try {
      setIsGenerating(true)
      setGenerationProgress(0)
      setReportContent('')

      const generateData = {
        project_id: id!,
        template_id: currentTemplate?.id,
        custom_prompt: currentTemplate?.is_system || !currentTemplate ? customPrompt : undefined,
        report_title: reportTitle,
        use_default_config: true,
      }

      const response = await reportApi.generate(generateData)
      
      if (response.success && response.data?.report_id) {
        const reportId = response.data.report_id
        
        // 建立SSE连接
        startStreaming(reportId)
        
        notifications.show({
          title: '开始生成',
          message: '报告生成已开始，请等待...',
          color: 'blue',
        })
      } else {
        throw new Error(response.error || '生成失败')
      }
    } catch (error: any) {
      console.error('生成报告失败:', error)
      setIsGenerating(false)
      notifications.show({
        title: '生成失败',
        message: error.response?.data?.error || error.message || '生成报告时发生错误',
        color: 'red',
      })
    }
  }

  // 开始流式接收
  const startStreaming = (reportId: string) => {
    console.log(`[SSE] 开始流式连接，报告ID: ${reportId}`)
    
    // 清理之前的连接
    if (eventSourceRef.current) {
      console.log('[SSE] 关闭之前的连接')
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    try {
      const eventSource = new EventSource(`http://localhost:3001/api/report/stream/${reportId}`, {
        withCredentials: true
      })
      eventSourceRef.current = eventSource

      console.log('[SSE] EventSource 创建成功，URL:', `http://localhost:3001/api/report/stream/${reportId}`)

      eventSource.onopen = () => {
        console.log('[SSE] 连接已建立')
      }

      eventSource.onmessage = (event) => {
        try {
          console.log('[SSE] 收到消息:', event.data)
          const data = JSON.parse(event.data)
          console.log('[SSE] 解析后的数据:', data)
          
          switch (data.type) {
            case 'status':
              console.log('[SSE] 状态更新:', data.status)
              if (data.status === 'failed') {
                setIsGenerating(false)
                notifications.show({
                  title: '生成失败',
                  message: '报告生成失败',
                  color: 'red',
                })
              }
              break
              
            case 'content':
              console.log('[SSE] 内容更新，长度:', data.content?.length || 0)
              console.log('[SSE] 进度:', data.progress || 0)
              setReportContent(data.content || '')
              setGenerationProgress(data.progress || 0)
              break
              
            case 'completed':
              console.log('[SSE] 生成完成')
              setReportContent(data.content || '')
              setGenerationProgress(100)
              setIsGenerating(false)
              notifications.show({
                title: '✅ 生成完成',
                message: '报告生成已完成',
                color: 'green',
                autoClose: 4000,
              })
              break
              
            case 'error':
              console.error('[SSE] 生成错误:', data.error)
              setIsGenerating(false)
              notifications.show({
                title: '❌ 生成失败',
                message: data.error || '生成过程中发生错误',
                color: 'red',
                autoClose: 6000,
              })
              break
              
            default:
              console.log('[SSE] 未知消息类型:', data.type)
          }
        } catch (error) {
          console.error('[SSE] 解析数据失败:', error)
          console.error('[SSE] 原始数据:', event.data)
        }
      }

      eventSource.onerror = (error) => {
        console.error('[SSE] 连接错误:', error)
        setIsGenerating(false)
        
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
          eventSourceRef.current = null
        }
        
        notifications.show({
          title: '🔌 连接断开',
          message: '与服务器的连接已断开，请检查网络连接',
          color: 'orange',
          autoClose: 5000,
        })
      }

    } catch (error) {
      console.error('[SSE] 创建连接失败:', error)
      setIsGenerating(false)
      notifications.show({
        title: '❌ 连接失败',
        message: '无法建立与服务器的连接',
        color: 'red',
        autoClose: 6000,
      })
    }
  }

  // 暂停生成
  const handlePause = async () => {
    if (!currentReport?.id) return
    
    try {
      await reportApi.pauseGeneration(currentReport.id)
      setIsGenerating(false)
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      
      notifications.show({
        title: '已暂停',
        message: '报告生成已暂停',
        color: 'yellow',
      })
    } catch (error: any) {
      console.error('暂停失败:', error)
      notifications.show({
        title: '暂停失败',
        message: error.response?.data?.error || '暂停时发生错误',
        color: 'red',
      })
    }
  }

  // 继续生成
  const handleResume = async () => {
    if (!currentReport?.id) return
    
    try {
      await reportApi.resumeGeneration(currentReport.id)
      setIsGenerating(true)
      startStreaming(currentReport.id)
      
      notifications.show({
        title: '已继续',
        message: '报告生成已继续',
        color: 'blue',
      })
    } catch (error: any) {
      console.error('继续失败:', error)
      notifications.show({
        title: '继续失败',
        message: error.response?.data?.error || '继续时发生错误',
        color: 'red',
      })
    }
  }

  // 停止生成
  const handleStop = async () => {
    if (!currentReport?.id) return
    
    try {
      await reportApi.stopGeneration(currentReport.id)
      setIsGenerating(false)
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      
      notifications.show({
        title: '已停止',
        message: '报告生成已停止',
        color: 'orange',
      })
    } catch (error: any) {
      console.error('停止失败:', error)
      notifications.show({
        title: '停止失败',
        message: error.response?.data?.error || '停止时发生错误',
        color: 'red',
      })
    }
  }

  // 导出Word文档
  const handleExport = async () => {
    if (!currentReport?.id || !reportContent) {
      notifications.show({
        title: '错误',
        message: '没有可导出的报告内容',
        color: 'red',
      })
      return
    }

    try {
      const response = await reportApi.export({
        report_id: currentReport.id,
        format: 'docx',
        title: reportTitle,
      })

      // 创建下载链接
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${reportTitle}.docx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      notifications.show({
        title: '导出成功',
        message: 'Word文档已导出',
        color: 'green',
      })
    } catch (error: any) {
      console.error('导出失败:', error)
      notifications.show({
        title: '导出失败',
        message: error.response?.data?.error || error.message || '导出时发生错误',
        color: 'red',
      })
    }
  }

  // 保存模板
  const handleSaveTemplate = async () => {
    if (!customPrompt.trim()) {
      notifications.show({
        title: '错误',
        message: '提示词不能为空',
        color: 'red',
      })
      return
    }

    try {
      const templateData = {
        name: `${project?.project_name}自定义模板`,
        description: '基于项目自定义的报告模板',
        prompt_template: customPrompt,
        is_default: false,
      }

      const response = await reportApi.createTemplate(templateData)
      
      if (response.success) {
        notifications.show({
          title: '保存成功',
          message: '模板已保存',
          color: 'green',
        })
        
        // 刷新模板列表
        const templatesResponse = await reportApi.getTemplates()
        if (templatesResponse.success && templatesResponse.data) {
          setTemplates(templatesResponse.data.templates)
        }
      } else {
        throw new Error(response.error || '保存失败')
      }
    } catch (error: any) {
      console.error('保存模板失败:', error)
      notifications.show({
        title: '保存失败',
        message: error.response?.data?.error || '保存模板时发生错误',
        color: 'red',
      })
    }
  }

  // 切换模板
  const handleTemplateChange = (templateId: string | null) => {
    if (!templateId) return
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setCurrentTemplate(template)
      setCustomPrompt(template.prompt_template)
    }
  }

  if (loading) {
    return (
      <Container size="xl" style={{ position: 'relative', minHeight: '100vh' }}>
        <LoadingOverlay visible={true} />
      </Container>
    )
  }

  return (
    <Container size="xl" style={{ minHeight: '100vh', padding: 0 }}>
      {/* Header */}
      <Paper shadow="none" p="0" style={{ 
        height: '50px', 
        borderBottom: '1px solid #E5E6EB', 
        backgroundColor: '#FFFFFF',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0 16px' 
        }}>
          <Group gap="md">
            <IconFileText size={24} color="#165DFF" />
            <Title order={3} c="#1D2129" style={{ fontSize: '20px', fontWeight: 600 }}>
              投资方案报告生成
            </Title>
          </Group>
          <Button
            leftSection={<IconArrowLeft size={16} />}
            variant="subtle"
            size="sm"
            onClick={() => navigate(`/revenue-cost/${id}`)}
            style={{ height: '32px', padding: '4px 12px', color: '#1D2129' }}
          >
            返回收入成本
          </Button>
        </div>
      </Paper>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        <Stack gap="xl">
          {/* 项目信息卡片 */}
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB' }}>
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="#86909C" mb={4}>项目名称</Text>
                <Text size="md" fw={600} c="#1D2129">{project?.project_name}</Text>
              </div>
              <Group gap="xl">
                <div>
                  <Text size="xs" c="#86909C" mb={4}>项目总资金</Text>
                  <Text size="md" fw={600} c="#165DFF">
                    {(investmentEstimate?.estimate_data?.partG?.合计 ?? investmentEstimate?.final_total ?? project?.total_investment ?? 0).toFixed(2)} 万元
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="#86909C" mb={4}>建设期</Text>
                  <Text size="md" fw={600} c="#1D2129">
                    {project?.construction_years} 年
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="#86909C" mb={4}>运营期</Text>
                  <Text size="md" fw={600} c="#1D2129">
                    {project?.operation_years} 年
                  </Text>
                </div>
              </Group>
            </Group>
          </Card>

          {/* 控制面板 */}
          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB' }}>
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Title order={4} c="#1D2129">报告配置</Title>
                <Group gap="xs">
                  <Tooltip label="模板管理">
                    <ActionIcon
                      variant="light"
                      color="blue"
                      size="lg"
                      onClick={() => setTemplateModalOpened(true)}
                    >
                      <IconTemplate size={20} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="保存为模板">
                    <ActionIcon
                      variant="light"
                      color="green"
                      size="lg"
                      onClick={handleSaveTemplate}
                      disabled={!customPrompt.trim()}
                    >
                      <IconDeviceFloppy size={20} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>

              {/* 报告标题 */}
              <TextInput
                label="报告标题"
                placeholder="请输入报告标题"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                styles={{
                  input: {
                    fontSize: '16px',
                    fontWeight: 500,
                  }
                }}
              />

              {/* 模板选择 */}
              <Select
                label="报告模板"
                placeholder="选择报告模板"
                data={templates.map(t => ({
                  value: t.id,
                  label: `${t.name}${t.is_system ? ' (系统)' : ''}${t.is_default ? ' (默认)' : ''}`
                }))}
                value={currentTemplate?.id}
                onChange={handleTemplateChange}
                clearable
                searchable
              />

              {/* 提示词编辑器 */}
              <PromptEditor
                value={customPrompt}
                onChange={setCustomPrompt}
                placeholder="请输入报告生成的提示词..."
                minHeight={300}
              />

              {/* 控制按钮 */}
              <Group justify="space-between">
                <Group gap="md">
                  {!isGenerating ? (
                    <Button
                      leftSection={<IconPlayerPlay size={16} />}
                      onClick={handleGenerate}
                      style={{
                        height: '40px',
                        backgroundColor: '#165DFF',
                        color: '#FFFFFF'
                      }}
                      disabled={!customPrompt.trim() || !reportTitle.trim()}
                    >
                      生成报告
                    </Button>
                  ) : (
                    <>
                      <Button
                        leftSection={<IconPlayerPause size={16} />}
                        onClick={handlePause}
                        variant="outline"
                        color="yellow"
                        style={{ height: '40px' }}
                      >
                        暂停
                      </Button>
                      <Button
                        leftSection={<IconPlayerStop size={16} />}
                        onClick={handleStop}
                        variant="outline"
                        color="red"
                        style={{ height: '40px' }}
                      >
                        停止
                      </Button>
                    </>
                  )}
                </Group>

                <Group gap="md">
                  <Button
                    leftSection={<IconEye size={16} />}
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                    style={{ height: '40px' }}
                  >
                    {showPreview ? '隐藏预览' : '显示预览'}
                  </Button>
                  
                  {reportContent && (
                    <Button
                      leftSection={<IconDownload size={16} />}
                      variant="outline"
                      color="green"
                      onClick={handleExport}
                      style={{ height: '40px' }}
                    >
                      导出Word
                    </Button>
                  )}
                </Group>
              </Group>

              {/* 生成进度 */}
              {isGenerating && (
                <div>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" fw={500}>生成进度</Text>
                    <Text size="sm" c="#86909C">{generationProgress}%</Text>
                  </Group>
                  <Progress 
                    value={generationProgress} 
                    color="blue"
                    size="md"
                  />
                </div>
              )}
            </Stack>
          </Card>

          {/* 内容显示区域 */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: showPreview ? 1 : 2 }}>
              {/* 实时输出 - 使用增强版流式输出组件 */}
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB' }}>
                <Group justify="space-between" align="center" mb="md">
                  <Title order={4} c="#1D2129">生成内容</Title>
                  {isGenerating && (
                    <Group gap="xs">
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#165DFF',
                        animation: 'pulse 1.5s ease-in-out infinite'
                      }} />
                      <Text size="sm" c="#165DFF">生成中...</Text>
                    </Group>
                  )}
                </Group>
                
                <EnhancedStreamingOutput
                  content={reportContent}
                  isGenerating={isGenerating}
                  showTypewriter={true}
                  typewriterSpeed={30}
                  showProgress={true}
                  estimatedTotalChars={8000}
                  onCopy={() => {
                    navigator.clipboard.writeText(reportContent).then(() => {
                      notifications.show({
                        title: '复制成功',
                        message: '内容已复制到剪贴板',
                        color: 'green',
                      })
                    })
                  }}
                  onExport={() => handleExport()}
                />
              </Card>
            </div>

            {showPreview && (
              <div style={{ flex: 1 }}>
                {/* Word预览 */}
                <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB' }}>
                  <Group justify="space-between" align="center" mb="md">
                    <Title order={4} c="#1D2129">Word预览</Title>
                    <Tooltip label="刷新预览">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        size="sm"
                        onClick={() => {
                          // 触发重新渲染
                          setReportContent(reportContent + ' ')
                          setTimeout(() => setReportContent(reportContent.slice(0, -1)), 100)
                        }}
                      >
                        <IconRefresh size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                  
                  <WordPreview
                    content={reportContent}
                    title={reportTitle}
                  />
                </Card>
              </div>
            )}
          </div>

          {/* 历史记录 */}
          {currentReport && (
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB' }}>
              <Title order={4} c="#1D2129" mb="md">生成历史</Title>
              
              <Group gap="md">
                <div>
                  <Text size="xs" c="#86909C">上次生成时间</Text>
                  <Text size="sm" fw={500}>
                    {new Date(currentReport.updated_at).toLocaleString()}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="#86909C">生成状态</Text>
                  <Text 
                    size="sm" 
                    fw={500}
                    c={
                      currentReport.generation_status === 'completed' ? '#00C48C' :
                      currentReport.generation_status === 'failed' ? '#FF7D00' :
                      currentReport.generation_status === 'generating' ? '#165DFF' :
                      '#86909C'
                    }
                  >
                    {
                      currentReport.generation_status === 'completed' ? '已完成' :
                      currentReport.generation_status === 'failed' ? '失败' :
                      currentReport.generation_status === 'generating' ? '生成中' :
                      '已暂停'
                    }
                  </Text>
                </div>
                {currentReport.generation_status === 'paused' && (
                  <Button
                    leftSection={<IconPlayerPlay size={16} />}
                    onClick={handleResume}
                    variant="outline"
                    color="blue"
                    size="sm"
                  >
                    继续生成
                  </Button>
                )}
              </Group>
            </Card>
          )}
        </Stack>
      </div>

      {/* 模板管理弹窗 */}
      <Modal
        opened={templateModalOpened}
        onClose={() => setTemplateModalOpened(false)}
        title={
          <Group gap="xs">
            <IconTemplate size={20} color="#165DFF" />
            <Text fw={600} c="#1D2129">模板管理</Text>
          </Group>
        }
        size="800px"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="#86909C">
            选择一个模板来快速开始，或者创建自定义模板
          </Text>
          
          {templates.map((template) => (
            <Card 
              key={template.id} 
              padding="md" 
              radius="md" 
              withBorder
              style={{
                cursor: 'pointer',
                backgroundColor: currentTemplate?.id === template.id ? '#F0F9FF' : '#FFFFFF',
                borderColor: currentTemplate?.id === template.id ? '#165DFF' : '#E5E6EB'
              }}
              onClick={() => {
                handleTemplateChange(template.id)
                setTemplateModalOpened(false)
              }}
            >
              <Group justify="space-between" align="start">
                <div style={{ flex: 1 }}>
                  <Group gap="xs" mb="xs">
                    <Text size="sm" fw={600}>{template.name}</Text>
                    {template.is_system && (
                      <Text size="xs" c="#165DFF" bg="#E6F7FF" px="xs" py="2" style={{ borderRadius: '4px' }}>
                        系统
                      </Text>
                    )}
                    {template.is_default && (
                      <Text size="xs" c="#00C48C" bg="#E6FBE8" px="xs" py="2" style={{ borderRadius: '4px' }}>
                        默认
                      </Text>
                    )}
                  </Group>
                  {template.description && (
                    <Text size="xs" c="#86909C">{template.description}</Text>
                  )}
                </div>
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleTemplateChange(template.id)
                    setTemplateModalOpened(false)
                  }}
                >
                  <IconEdit size={16} />
                </ActionIcon>
              </Group>
            </Card>
          ))}
        </Stack>
      </Modal>
    </Container>
  )
}

export default InvestmentReport
