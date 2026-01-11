import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Grid, Paper, Group, Button, Title, Text, Stack, Alert, Container, Modal } from '@mantine/core'
import { useReportStore } from '../stores/reportStore'
import { PromptEditor } from '../components/report/PromptEditor'
import { ReportPreview } from '../components/report/ReportPreview'
import { VariablePicker } from '../components/report/VariablePicker'
import { TemplateSelector } from '../components/report/TemplateSelector'
import { Header } from '../components/common/Header'
import { StyleSettingsPanel } from '../components/report/StyleSettingsPanel'
import { WordStyleSettingsPanel } from '../components/report/WordStyleSettingsPanel'
import { SectionConfigPanel } from '../components/report/SectionConfigPanel'
import { llmConfigApi } from '@/lib/api'

export function ReportGeneration() {
  const { projectId } = useParams()
  const store = useReportStore()
  const [currentLLMConfig, setCurrentLLMConfig] = useState<any>(null)
  const [showStylePanel, setShowStylePanel] = useState(false)
  const [showWordStylePanel, setShowWordStylePanel] = useState(false)
  const [showSectionPanel, setShowSectionPanel] = useState(false)

  // 加载当前LLM配置
  useEffect(() => {
    const loadLLMConfig = async () => {
      try {
        const response = await llmConfigApi.getDefault()
        if (response.success && response.data?.config) {
          setCurrentLLMConfig(response.data.config)
        }
      } catch (error) {
        console.error('加载LLM配置失败:', error)
      }
    }
    loadLLMConfig()
  }, [])

  useEffect(() => {
    if (projectId) {
      store.setProjectId(projectId)
      store.loadTemplates()
      store.loadProjectData()
    }
    // 初始化时加载用户保存的样式配置
    // @ts-ignore - _init 是内部方法
    store._init?.()
    
    return () => {
      store.resetReport()
    }
  }, [projectId])

  const handleGenerate = async () => {
    await store.startGeneration()
  }

  const handlePause = () => {
    if (store.generationStatus === 'generating') {
      store.pauseGeneration()
    } else if (store.generationStatus === 'paused') {
      store.resumeGeneration()
    }
  }

  const handleStop = () => {
    store.stopGeneration()
  }

  const handleExport = () => {
    store.exportToWord()
  }

  return (
    <div className="report-generation-page">
      {/* Header */}
      <Header
        title="投资项目方案报告生成"
        subtitle="Report Generation"
        icon="📄"
        showLLMInfo={true}
        llmConfig={currentLLMConfig}
        showBackButton={true}
        backTo={`/revenue-cost/${projectId}`}
        rightContent={
          <Text size="sm" c="dimmed">
            项目ID: {projectId}
          </Text>
        }
      />

      <Container size="xl" py="lg" px="lg" style={{ maxWidth: '1400px', margin: '0 auto' }}>

      {store.error && (
        <Alert 
          title="错误" 
          color="red" 
          mb="md"
          onClose={() => store.setPromptTemplate('')}
        >
          {store.error}
        </Alert>
      )}

      <Grid>
        {/* 左侧：编辑区域 */}
        <Grid.Col span={4}>
          <Stack gap="md">
            {/* 模板选择器 */}
            <Paper p="md" withBorder radius="md">
              <TemplateSelector />
            </Paper>

            {/* 变量选择器 */}
            <Paper p="md" withBorder radius="md">
              <VariablePicker />
            </Paper>

            {/* 提示词编辑器 */}
            <Paper p="md" withBorder radius="md" style={{ minHeight: '300px' }}>
              <PromptEditor />
            </Paper>

            {/* 配置按钮区域 */}
            <Paper p="md" withBorder radius="md">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={500}>报告配置</Text>
                </Group>
                <Group>
                  {/* 预览样式设置按钮 - 蓝色 */}
                  <Button 
                    variant="light"
                    color="blue"
                    onClick={() => setShowStylePanel(true)}
                    size="sm"
                  >
                    预览样式设置
                  </Button>
                  {/* Word样式设置按钮 - 绿色 */}
                  <Button 
                    variant="filled"
                    color="green"
                    onClick={() => setShowWordStylePanel(true)}
                    size="sm"
                  >
                    Word样式设置
                  </Button>
                </Group>
                <Group>
                  <Button 
                    variant="light"
                    onClick={() => setShowSectionPanel(true)}
                    size="sm"
                  >
                    章节配置
                  </Button>
                </Group>
              </Stack>
            </Paper>

            {/* 控制按钮 */}
            <Paper p="md" withBorder radius="md">
              <Group>
                <Button 
                  onClick={handleGenerate}
                  disabled={store.generationStatus === 'generating'}
                  color="blue"
                >
                  {store.generationStatus === 'idle' ? '开始生成' : '重新生成'}
                </Button>
                
                <Button 
                  onClick={handlePause}
                  disabled={store.generationStatus === 'idle'}
                  variant="light"
                >
                  {store.generationStatus === 'paused' ? '继续' : '暂停'}
                </Button>
                
                <Button 
                  onClick={handleStop}
                  disabled={store.generationStatus === 'idle'}
                  variant="light"
                  color="red"
                >
                  停止
                </Button>
                
                <Button 
                  onClick={handleExport}
                  disabled={!store.reportId}
                  variant="light"
                  color="green"
                >
                  导出Word
                </Button>
              </Group>
            </Paper>
          </Stack>
        </Grid.Col>

        {/* 右侧：预览区域 */}
        <Grid.Col span={8}>
          <div 
            style={{ 
              backgroundColor: '#f0f0f0',
              padding: '20px',
              minHeight: 'calc(100vh - 150px)',
              borderRadius: '8px',
              overflow: 'auto'
            }}
          >
            <ReportPreview />
          </div>
        </Grid.Col>
      </Grid>
     </Container>

      {/* 预览样式设置弹窗 */}
      <Modal
        opened={showStylePanel}
        onClose={() => setShowStylePanel(false)}
        title="预览样式设置"
        size="lg"
      >
        <StyleSettingsPanel onClose={() => setShowStylePanel(false)} />
      </Modal>

      {/* Word样式设置弹窗 */}
      <Modal
        opened={showWordStylePanel}
        onClose={() => setShowWordStylePanel(false)}
        title="Word样式设置"
        size="lg"
      >
        <WordStyleSettingsPanel onClose={() => setShowWordStylePanel(false)} />
      </Modal>

      {/* 章节配置弹窗 */}
      <Modal
        opened={showSectionPanel}
        onClose={() => setShowSectionPanel(false)}
        title="章节配置"
        size="lg"
      >
        <SectionConfigPanel onClose={() => setShowSectionPanel(false)} />
      </Modal>
    </div>
  )
}

export default ReportGeneration
