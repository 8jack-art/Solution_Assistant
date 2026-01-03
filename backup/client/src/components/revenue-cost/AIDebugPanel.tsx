import React from 'react'
import {
  Card,
  Stack,
  Text,
  Button,
  Group,
  Code,
  Divider,
} from '@mantine/core'
import { IconCopy, IconBug } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

interface DebugInfo {
  timestamp: string
  requestUrl: string
  requestBody: any
  responseStatus?: number
  responseData?: any
  errorMessage?: string
  errorStack?: string
}

interface AIDebugPanelProps {
  debugInfo: DebugInfo | null
  currentStoreData?: any // 当前 store 中的数据
}

/**
 * AI调试面板组件
 */
const AIDebugPanel: React.FC<AIDebugPanelProps> = ({ debugInfo, currentStoreData }) => {
  if (!debugInfo) return null

  /**
   * 复制调试信息到剪贴板
   */
  const copyDebugInfo = () => {
    const debugText = JSON.stringify({
      时间: debugInfo.timestamp,
      请求URL: debugInfo.requestUrl,
      请求体: debugInfo.requestBody,
      响应状态: debugInfo.responseStatus,
      响应数据: debugInfo.responseData,
      错误信息: debugInfo.errorMessage,
      错误堆栈: debugInfo.errorStack,
      当前Store状态: currentStoreData,
    }, null, 2)
    
    navigator.clipboard.writeText(debugText).then(() => {
      notifications.show({
        title: '复制成功',
        message: '调试信息已复制到剪贴板',
        color: 'green',
      })
    })
  }

  return (
    <Card withBorder style={{ 
      backgroundColor: '#FFF7E6', 
      borderColor: '#FFD591',
      marginTop: '16px'
    }}>
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            <IconBug size={20} color="#FF7D00" />
            <Text fw={600} c="#FF7D00">AI分析调试信息</Text>
          </Group>
          <Button
            size="xs"
            leftSection={<IconCopy size={14} />}
            onClick={copyDebugInfo}
            variant="light"
            color="orange"
          >
            复制全部信息
          </Button>
        </Group>

        <Divider />

        {/* 请求信息 */}
        <div>
          <Text size="sm" fw={500} c="#4E5969" mb={4}>📤 请求信息</Text>
          <Text size="xs" c="#86909C" mb={2}>时间: {new Date(debugInfo.timestamp).toLocaleString()}</Text>
          <Text size="xs" c="#86909C" mb={2}>URL: {debugInfo.requestUrl}</Text>
          <Text size="xs" c="#86909C" mb={4}>请求体:</Text>
          <Code block style={{ fontSize: '11px', maxHeight: '150px', overflow: 'auto' }}>
            {JSON.stringify(debugInfo.requestBody, null, 2)}
          </Code>
        </div>

        {/* 响应信息 */}
        {debugInfo.responseStatus && (
          <div>
            <Text size="sm" fw={500} c="#4E5969" mb={4}>📥 响应信息</Text>
            <Text 
              size="xs" 
              c={debugInfo.responseStatus === 200 ? '#00C48C' : '#F53F3F'} 
              fw={600}
              mb={4}
            >
              状态码: {debugInfo.responseStatus}
            </Text>
            {debugInfo.responseData && (
              <>
                <Text size="xs" c="#86909C" mb={4}>响应数据:</Text>
                <Code block style={{ fontSize: '11px', maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(debugInfo.responseData, null, 2)}
                </Code>
              </>
            )}
          </div>
        )}

        {/* 错误信息 */}
        {debugInfo.errorMessage && (
          <div>
            <Text size="sm" fw={500} c="#F53F3F" mb={4}>❌ 错误信息</Text>
            <Text size="xs" c="#F53F3F" mb={4}>
              {debugInfo.errorMessage}
            </Text>
            {debugInfo.errorStack && (
              <>
                <Text size="xs" c="#86909C" mb={4}>错误堆栈:</Text>
                <Code block style={{ fontSize: '10px', maxHeight: '150px', overflow: 'auto' }}>
                  {debugInfo.errorStack}
                </Code>
              </>
            )}
          </div>
        )}

        {/* 提示信息 */}
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#FFFFFF',
          borderRadius: '4px',
          border: '1px solid #FFD591'
        }}>
          <Text size="xs" c="#4E5969">
            💡 <strong>提示:</strong> 点击「复制全部信息」按钮，将调试信息发送给开发人员以快速定位问题。
          </Text>
        </div>
        
        {/* 当前 Store 状态 */}
        {currentStoreData && (
          <div>
            <Text size="sm" fw={500} c="#4E5969" mb={4}>📋 当前Store状态</Text>
            <Code block style={{ fontSize: '11px', maxHeight: '200px', overflow: 'auto' }}>
              {JSON.stringify(currentStoreData, null, 2)}
            </Code>
          </div>
        )}
      </Stack>
    </Card>
  )
}

export default AIDebugPanel
