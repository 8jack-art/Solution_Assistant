import React from 'react'
import { Badge as MantineBadge, BadgeProps as MantineBadgeProps } from '@mantine/core'

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'
export type BadgeSize = 'sm' | 'md' | 'lg'

export interface UnifiedBadgeProps extends Omit<MantineBadgeProps, 'color' | 'size' | 'variant'> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
}

const UnifiedBadge: React.FC<UnifiedBadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  className,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return { 
          bg: '#E6FCF5', 
          color: '#00C48C',
          dotColor: '#00C48C'
        }
      case 'warning':
        return { 
          bg: '#FFF7E6', 
          color: '#FFA940',
          dotColor: '#FFA940'
        }
      case 'error':
        return { 
          bg: '#FFF0F0', 
          color: '#F5455C',
          dotColor: '#F5455C'
        }
      case 'info':
        return { 
          bg: '#E7F5FF', 
          color: '#1E6FFF',
          dotColor: '#1E6FFF'
        }
      case 'neutral':
      default:
        return { 
          bg: '#F5F7FA', 
          color: '#86909C',
          dotColor: '#86909C'
        }
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { padding: '2px 8px', fontSize: '11px', height: '20px' }
      case 'md':
        return { padding: '4px 10px', fontSize: '12px', height: '24px' }
      case 'lg':
        return { padding: '6px 12px', fontSize: '13px', height: '28px' }
      default:
        return { padding: '4px 10px', fontSize: '12px', height: '24px' }
    }
  }

  const variantStyles = getVariantStyles()
  const sizeStyles = getSizeStyles()

  return (
    <MantineBadge
      {...props}
      className={className}
      style={{
        backgroundColor: variantStyles.bg,
        color: variantStyles.color,
        padding: sizeStyles.padding,
        fontSize: sizeStyles.fontSize,
        height: sizeStyles.height,
        fontWeight: 500,
        borderRadius: '4px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: dot ? '6px' : '0',
        ...props.style
      }}
      leftSection={dot ? (
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: variantStyles.dotColor,
          display: 'inline-block'
        }} />
      ) : undefined}
    >
      {children}
    </MantineBadge>
  )
}

export default UnifiedBadge
