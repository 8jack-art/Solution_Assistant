import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Grid, Paper, Group, Button, Title, Text, Stack, Alert, Container } from '@mantine/core'
import { useReportStore } from '../stores/reportStore'
import { PromptEditor } from '../components/report/PromptEditor'
import { ReportPreview } from '../components/report/ReportPreview'
import { VariablePicker } from '../components/report/VariablePicker'
import { TemplateSelector } from '../components/report/TemplateSelector'
import { Header } from '../components/common/Header'

export function ReportGeneration() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const store = useReportStore()

  useEffect(() => {
    if (projectId) {
      store.setProjectId(projectId)
      store.loadTemplates()
      store.loadProjectData()
    }
    
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
   </div>
 )
}

export default ReportGeneration
