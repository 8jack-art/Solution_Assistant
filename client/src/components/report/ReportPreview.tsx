import { Paper, Text, Badge, Loader, Center } from '@mantine/core'
import { useReportStore } from '../../stores/reportStore'

export function ReportPreview() {
  const { reportContent, generationStatus } = useReportStore()

  // 渲染内容
  const renderContent = () => {
    if (!reportContent) {
      return (
        <Center h={400}>
          <Text c="dimmed" ta="center">
            报告预览区域
            <br />
            请先点击"开始生成"按钮
          </Text>
        </Center>
      )
    }

    // 简单的换行处理
    const lines = reportContent.split('\n')
    return (
      <div style={{ lineHeight: '1.8', fontSize: '14px' }}>
        {lines.map((line, index) => {
          // 检测标题
          if (line.startsWith('# ')) {
            return <h1 key={index} style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '16px', marginBottom: '8px' }}>{line.slice(2)}</h1>
          }
          if (line.startsWith('## ')) {
            return <h2 key={index} style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '14px', marginBottom: '6px' }}>{line.slice(3)}</h2>
          }
          if (line.startsWith('### ')) {
            return <h3 key={index} style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '12px', marginBottom: '4px' }}>{line.slice(4)}</h3>
          }
          // 检测列表
          if (line.startsWith('- ')) {
            return <div key={index} style={{ marginLeft: '20px', marginBottom: '4px' }}>{'• '}{line.slice(2)}</div>
          }
          if (line.match(/^\d+\. /)) {
            return <div key={index} style={{ marginLeft: '20px', marginBottom: '4px' }}>{line}</div>
          }
          // 空行
          if (line.trim() === '') {
            return <br key={index} />
          }
          // 普通段落
          return <div key={index} style={{ marginBottom: '4px' }}>{line}</div>
        })}
      </div>
    )
  }

  return (
    <Paper
      shadow="sm"
      p="xl"
      style={{
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        backgroundColor: '#fff'
      }}
    >
      {/* 生成状态指示器 */}
      {generationStatus === 'generating' && (
        <Badge 
          color="blue" 
          variant="light" 
          size="lg"
          mb="md"
        >
          <Loader size="xs" mr="xs" />
          正在生成...
        </Badge>
      )}
      
      {generationStatus === 'paused' && (
        <Badge color="yellow" variant="light" size="lg" mb="md">
          已暂停
        </Badge>
      )}
      
      {generationStatus === 'completed' && (
        <Badge color="green" variant="light" size="lg" mb="md">
          生成完成
        </Badge>
      )}

      {generationStatus === 'failed' && (
        <Badge color="red" variant="light" size="lg" mb="md">
          生成失败
        </Badge>
      )}

      {/* 预览内容 */}
      <div className="preview-content">
        {renderContent()}
      </div>
    </Paper>
  )
}

export default ReportPreview
