import React from 'react'
import { Button as MantineButton, ButtonProps as MantineButtonProps } from '@mantine/core'

export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'

export interface UnifiedButtonProps extends Omit<MantineButtonProps, 'size' | 'variant'> {
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const UnifiedButton: React.FC<UnifiedButtonProps> = ({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className,
  ...props
}) => {
  const getVariantStyles = (): { bg: string; color: string; border?: string } => {
    switch (variant) {
      case 'primary':
        return { bg: '#1E6FFF', color: '#FFFFFF' }
      case 'secondary':
        return { bg: '#F5F7FA', color: '#1D2129' }
      case 'outline':
        return { bg: 'transparent', color: '#1E6FFF', border: '1px solid #1E6FFF' }
      case 'ghost':
        return { bg: 'transparent', color: '#1D2129' }
      case 'danger':
        return { bg: '#F5455C', color: '#FFFFFF' }
      default:
        return { bg: '#1E6FFF', color: '#FFFFFF' }
    }
  }

  const getSizeStyles = (): { height: string; padding: string; fontSize: string } => {
    switch (size) {
      case 'sm':
        return { height: '32px', padding: '0 12px', fontSize: '13px' }
      case 'md':
        return { height: '36px', padding: '0 16px', fontSize: '14px' }
      case 'lg':
        return { height: '44px', padding: '0 24px', fontSize: '15px' }
      default:
        return { height: '36px', padding: '0 16px', fontSize: '14px' }
    }
  }

  const variantStyles = getVariantStyles()
  const sizeStyles = getSizeStyles()

  return (
    <MantineButton
      {...props}
      className={className}
      style={{
        backgroundColor: variantStyles.bg,
        color: variantStyles.color,
        border: variantStyles.border,
        height: sizeStyles.height,
        padding: sizeStyles.padding,
        fontSize: sizeStyles.fontSize,
        fontWeight: 500,
        borderRadius: '4px',
        width: fullWidth ? '100%' : 'auto',
        transition: 'all 150ms ease-in-out',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        ...props.style
      }}
      styles={{
        root: {
          '&:hover:not(:disabled)': {
            backgroundColor: variant === 'primary' ? '#1864E6' :
                            variant === 'danger' ? '#C4161C' :
                            variant === 'secondary' ? '#E5E6EB' :
                            variant === 'outline' ? '#E7F5FF' :
                            'rgba(29, 33, 41, 0.05)',
            borderColor: variant === 'outline' ? '#1864E6' : undefined,
          },
          '&:active:not(:disabled)': {
            transform: 'scale(0.98)',
          },
          '&:disabled': {
            opacity: 0.6,
            cursor: 'not-allowed',
          },
        },
      }}
      leftSection={leftIcon}
      rightSection={rightIcon}
    >
      {children}
    </MantineButton>
  )
}

export default UnifiedButton
