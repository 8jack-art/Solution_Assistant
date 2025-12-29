import React, { Component, ErrorInfo, ReactNode } from 'react'

interface DataLoadingErrorBoundaryProps {
  children: ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

interface DataLoadingErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * 数据加载错误边界组件
 * 捕获数据加载过程中的错误，提供友好的错误提示和重试功能
 */
export class DataLoadingErrorBoundary extends Component<DataLoadingErrorBoundaryProps, DataLoadingErrorBoundaryState> {
  constructor(props: DataLoadingErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error: Error): DataLoadingErrorBoundaryState {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('数据加载错误:', error, errorInfo)
  }
  
  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }
  
  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} retry={this.handleRetry} />
    }
    
    return this.props.children
  }
}

/**
 * 默认错误回退组件
 */
const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => {
  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#FFF2F0',
      border: '1px solid #FFCCC7',
      borderRadius: '8px',
      textAlign: 'center' as const,
      maxWidth: '600px',
      margin: '40px auto'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
      <h3 style={{ 
        color: '#FF4D4F', 
        marginBottom: '12px',
        fontSize: '18px',
        fontWeight: 600
      }}>
        数据加载失败
      </h3>
      <p style={{ 
        color: '#666666', 
        marginBottom: '20px',
        fontSize: '14px'
      }}>
        {error.message || '未知错误'}
      </p>
      <button
        onClick={retry}
        style={{
          padding: '10px 24px',
          backgroundColor: '#165DFF',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#0E42D2'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#165DFF'
        }}
      >
        重试
      </button>
      <p style={{ 
        color: '#999999', 
        marginTop: '16px',
        fontSize: '12px'
      }}>
        如果问题持续存在，请刷新页面或联系技术支持
      </p>
    </div>
  )
}

export default DataLoadingErrorBoundary
