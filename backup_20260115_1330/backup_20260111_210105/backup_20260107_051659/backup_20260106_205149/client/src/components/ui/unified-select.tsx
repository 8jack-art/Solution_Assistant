import React, { forwardRef } from 'react'
import { Select as MantineSelect, SelectProps as MantineSelectProps } from '@mantine/core'

export interface UnifiedSelectProps extends Omit<MantineSelectProps, 'size'> {
  size?: 'sm' | 'md' | 'lg'
  error?: string
  helperText?: string
  fullWidth?: boolean
}

const UnifiedSelect = forwardRef<HTMLInputElement, UnifiedSelectProps>(
  ({ size = 'md', error, helperText, fullWidth = false, className, ...props }, ref) => {
    const getSizeStyles = () => {
      switch (size) {
        case 'sm':
          return { height: '32px', fontSize: '13px', padding: '0 8px' }
        case 'md':
          return { height: '36px', fontSize: '14px', padding: '0 12px' }
        case 'lg':
          return { height: '44px', fontSize: '15px', padding: '0 16px' }
        default:
          return { height: '36px', fontSize: '14px', padding: '0 12px' }
      }
    }

    const sizeStyles = getSizeStyles()

    return (
      <div className={fullWidth ? 'w-full' : ''} style={{ width: fullWidth ? '100%' : 'auto' }}>
        <MantineSelect
          {...props}
          ref={ref}
          size={size}
          error={error}
          className={className}
          styles={{
            input: {
              height: sizeStyles.height,
              fontSize: sizeStyles.fontSize,
              padding: sizeStyles.padding,
              borderColor: '#E5E6EB',
              borderRadius: '4px',
              transition: 'border-color 150ms ease-in-out, box-shadow 150ms ease-in-out',
              '&:focus': {
                borderColor: '#1E6FFF',
                borderWidth: '2px',
                padding: `0 ${parseInt(sizeStyles.padding) - 2}px`,
              },
              '&::placeholder': {
                color: '#C9CDD4',
              },
              '&:disabled': {
                backgroundColor: '#F5F7FA',
                color: '#C9CDD4',
              },
            },
            label: {
              fontSize: '14px',
              fontWeight: 500,
              color: '#1D2129',
              marginBottom: '6px',
            },
            error: {
              fontSize: '12px',
              color: '#F5455C',
              marginTop: '4px',
            },
            description: {
              fontSize: '12px',
              color: '#86909C',
              marginTop: '4px',
            },
            option: {
              fontSize: '14px',
              padding: '8px 12px',
              '&[data-selected]': {
                backgroundColor: '#E7F5FF',
                color: '#1E6FFF',
              },
              '&[data-hovered]': {
                backgroundColor: '#F5F7FA',
              },
            },
            dropdown: {
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
              border: '1px solid #E5E6EB',
            },
          }}
        />
        {helperText && !error && (
          <p style={{
            fontSize: '12px',
            color: '#86909C',
            marginTop: '4px',
            marginLeft: '2px'
          }}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

UnifiedSelect.displayName = 'UnifiedSelect'

export default UnifiedSelect
