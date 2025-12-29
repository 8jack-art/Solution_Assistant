import React, { Component, ReactNode } from 'react'
import { Button, Group, Text, Card, Title, Alert } from '@mantine/core'
import { IconAlertTriangle, IconRefresh, IconTrash } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  retryCount: number
}

export class DataLoadingErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[数据加载错误边界] 捕获到错误:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // 调用错误回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // 显示错误通知
    notifications.show({
      title: '❌ 数据加载错误',
      message: '加载投资估算数据时发生错误',
      color: 'red',
      autoClose: 8000,
    })
  }

  handleRetry = () => {
    const { retryCount } = this.state
    
    if (retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1
      })

      notifications.show({
        title: '🔄 重试中',
        message: `正在重新加载数据 (${retryCount + 1}/${this.maxRetries})`,
        color: 'blue',
        autoClose: 3000,
      })
    } else {
      notifications.show({
        title: '⚠️ 重试次数已达上限',
        message: '请尝试刷新页面或联系技术支持',
        color: 'orange',
        autoClose: 5000,
      })
    }
  }

  handleClearCache = () => {
    try {
      // 清除所有投资估算相关的缓存
      if ((window as any).dataCache) {
        (window as any).dataCache.clear()
      }
      
      // 清除localStorage中的缓存
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key && key.startsWith('cache_investment:')) {
          localStorage.removeItem(key)
        }
      }

      notifications.show({
        title: '🗑️ 缓存已清除',
        message: '已清除所有缓存数据，请刷新页面',
        color: 'green',
        autoClose: 3000,
      })

      // 2秒后自动刷新页面
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('清除缓存失败:', error)
      notifications.show({
        title: '❌ 清除缓存失败',
        message: '请手动刷新页面',
        color: 'red',
        autoClose: 5000,
      })
    }
  }

  handleRefresh = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误UI
      return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Alert
              icon={<IconAlertTriangle size={20} />}
              title="数据加载失败"
              color="red"
              mb="md"
            >
              <Text size="sm" mb="md">
                投资估算数据加载过程中发生错误。这可能是由于网络问题、数据格式错误或系统异常导致的。
              </Text>
              
              {this.state.error && (
                <Text size="xs" color="dimmed" mb="sm">
                  错误详情: {this.state.error.message}
                </Text>
              )}
              
              <Text size="xs" color="dimmed" mb="md">
                重试次数: {this.state.retryCount}/{this.maxRetries}
              </Text>
            </Alert>

            <Group gap="sm" mb="md">
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={this.handleRetry}
                disabled={this.state.retryCount >= this.maxRetries}
                variant="filled"
                color="blue"
              >
                {this.state.retryCount >= this.maxRetries ? '已达重试上限' : '重新加载'}
              </Button>
              
              <Button
                leftSection={<IconTrash size={16} />}
                onClick={this.handleClearCache}
                variant="outline"
                color="orange"
              >
                清除缓存
              </Button>
              
              <Button
                onClick={this.handleRefresh}
                variant="subtle"
                color="gray"
              >
                刷新页面
              </Button>
            </Group>

            <Card shadow="xs" padding="sm" radius="sm" withBorder bg="gray.0">
              <Title order={6} mb="sm">故障排除建议:</Title>
              <Text size="sm" color="dimmed">
                1. 检查网络连接是否正常<br />
                2. 尝试清除浏览器缓存<br />
                3. 确认项目数据是否完整<br />
                4. 如问题持续，请联系技术支持
              </Text>
            </Card>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default DataLoadingErrorBoundary
