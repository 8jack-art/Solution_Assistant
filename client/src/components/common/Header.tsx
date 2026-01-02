import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Box,
  Stack,
} from '@mantine/core'
import { ReactNode } from 'react'

interface HeaderProps {
  title: string
  subtitle?: string
  /** 自定义图标区域（默认显示"投"字Logo） */
  icon?: ReactNode
  /** 图标背景色（默认渐变色） */
  iconBg?: string
  /** Header高度（默认64px） */
  height?: string | number
  showLLMInfo?: boolean
  llmConfig?: {
    provider: string
    model: string
  }
  showBackButton?: boolean
  backTo?: string
  rightContent?: React.ReactNode
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  icon,
  iconBg = 'linear-gradient(135deg, #1E6FFF 0%, #00C48C 100%)',
  height = 64,
  showLLMInfo = false,
  llmConfig,
  showBackButton = true,
  backTo = '/dashboard',
  rightContent
}) => {
  const navigate = useNavigate()
  
  // 根据高度计算合适的图标和字体大小
  const isCompact = typeof height === 'number' ? height <= 50 : parseInt(String(height)) <= 50
  const iconSize = isCompact ? 24 : 32
  const iconFontSize = isCompact ? 12 : 16
  const titleSize = isCompact ? 14 : 16
  const subtitleSize = isCompact ? 10 : 11

  return (
    <Paper
      shadow="sm"
      p="0"
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        borderBottom: '1px solid #E5E6EB',
        backgroundColor: '#FFFFFF',
        position: 'sticky' as const,
        top: 0,
        zIndex: 100
      }}
    >
      <Container size="xl" px="lg" style={{ height: '100%', maxWidth: '1400px', margin: '0 auto' }}>
        <Group justify="space-between" style={{ height: '100%' }}>
          {/* 左侧：图标 + 标题（分行显示） */}
          <Group gap="sm" align="center" style={{ height: '100%' }}>
            <Box
              style={{
                width: `${iconSize}px`,
                height: `${iconSize}px`,
                borderRadius: '4px',
                background: iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: `${iconFontSize}px`,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onClick={() => navigate('/dashboard')}
            >
              {icon || '投'}
            </Box>
            <Stack gap={isCompact ? 0 : 2}>
              <Title
                order={4}
                c="#1D2129"
                style={{ fontSize: `${titleSize}px`, fontWeight: 600, cursor: 'pointer', marginBottom: 0, lineHeight: 1.2 }}
                onClick={() => navigate('/dashboard')}
              >
                {title}
              </Title>
              {subtitle && (
                <Text size="xs" c="#86909C" style={{ fontSize: `${subtitleSize}px`, lineHeight: 1.2 }}>
                  {subtitle}
                </Text>
              )}
            </Stack>
          </Group>

          {/* 右侧：LLM信息 + 返回按钮 + 自定义内容 */}
          <Group gap="md">
            {showLLMInfo && llmConfig && (
              <Group gap="xs" align="center">
                <Text size="sm" c="#86909C">当前LLM:</Text>
                <Text size="sm" c="#1D2129" fw={500}>
                  {llmConfig.provider} - {llmConfig.model}
                </Text>
              </Group>
            )}
            {rightContent}
            {showBackButton && (
              <Button 
                variant="subtle" 
                size="sm"
                onClick={() => navigate(backTo)}
                style={{ height: isCompact ? '28px' : '36px', padding: '4px 12px', color: '#1D2129', backgroundColor: 'transparent' }}
              >
                返回
              </Button>
            )}
          </Group>
        </Group>
      </Container>
    </Paper>
  )
}

export default Header