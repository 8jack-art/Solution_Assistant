import React from 'react'
import { Loader, Overlay, Stack, Text } from '@mantine/core'

interface LoadingOverlayProps {
  visible: boolean
  message?: string
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, message = '思考中...' }) => {
  if (!visible) return null

  return (
    <Overlay
      color="#000"
      backgroundOpacity={0.35}
      blur={2}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Stack
        align="center"
        gap="md"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '32px 48px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Loader size="lg" color="#1E6FFF" type="dots" />
        <Text size="md" fw={500} c="#1D2129" style={{ fontSize: '16px' }}>
          🤖 {message}
        </Text>
        <Text size="xs" c="#86909C" style={{ fontSize: '12px' }}>
          AI正在分析处理，请稍候...
        </Text>
      </Stack>
    </Overlay>
  )
}

export default LoadingOverlay
