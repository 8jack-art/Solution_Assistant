import React, { forwardRef } from 'react'
import { Card as MantineCard, CardProps as MantineCardProps } from '@mantine/core'

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat'
export type CardPadding = 'sm' | 'md' | 'lg'

export interface UnifiedCardProps extends Omit<MantineCardProps, 'padding' | 'shadow'> {
  variant?: CardVariant
  padding?: CardPadding
  hoverable?: boolean
  fullWidth?: boolean
}

const UnifiedCard = forwardRef<HTMLDivElement, UnifiedCardProps>(
  ({ 
    variant = 'default', 
    padding = 'md', 
    hoverable = false, 
    fullWidth = false,
    children,
    className,
    ...props 
  }, ref) => {
    const getVariantStyles = () => {
      switch (variant) {
        case 'elevated':
          return { 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
            border: 'none'
          }
        case 'outlined':
          return { 
            boxShadow: 'none',
            border: '1px solid #E5E6EB'
          }
        case 'flat':
          return { 
            boxShadow: 'none',
            border: 'none',
            backgroundColor: '#F5F7FA'
          }
        default:
          return { 
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E6EB'
          }
      }
    }

    const getPaddingStyles = () => {
      switch (padding) {
        case 'sm':
          return '16px'
        case 'md':
          return '20px'
        case 'lg':
          return '24px'
        default:
          return '20px'
      }
    }

    const variantStyles = getVariantStyles()
    const paddingValue = getPaddingStyles()

    return (
      <MantineCard
        {...props}
        ref={ref}
        className={className}
        padding={paddingValue}
        radius="md"
        withBorder={variant !== 'flat'}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          transition: hoverable ? 'box-shadow 200ms ease-in-out, transform 200ms ease-in-out' : 'none',
          cursor: hoverable ? 'pointer' : 'default',
          ...variantStyles,
          ...(hoverable && {
            '&:hover': {
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
              transform: 'translateY(-2px)',
            }
          }),
          width: fullWidth ? '100%' : 'auto',
          ...props.style
        }}
      >
        {children}
      </MantineCard>
    )
  }
)

UnifiedCard.displayName = 'UnifiedCard'

export default UnifiedCard
