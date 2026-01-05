import React from 'react'
import { Container as MantineContainer, ContainerProps as MantineContainerProps } from '@mantine/core'

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

export interface UnifiedContainerProps extends Omit<MantineContainerProps, 'size'> {
  size?: ContainerSize
  centerContent?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const UnifiedContainer: React.FC<UnifiedContainerProps> = ({
  size = 'lg',
  centerContent = false,
  padding = 'md',
  children,
  className,
  ...props
}) => {
  const getSizeValue = () => {
    switch (size) {
      case 'sm':
        return 640
      case 'md':
        return 768
      case 'lg':
        return 1024
      case 'xl':
        return 1280
      case 'full':
        return '100%'
      default:
        return 1024
    }
  }

  const getPaddingValue = () => {
    switch (padding) {
      case 'none':
        return 0
      case 'sm':
        return '16px'
      case 'md':
        return '24px'
      case 'lg':
        return '32px'
      default:
        return '24px'
    }
  }

  return (
    <MantineContainer
      {...props}
      size={getSizeValue()}
      className={className}
      style={{
        padding: getPaddingValue(),
        display: centerContent ? 'flex' : 'block',
        flexDirection: centerContent ? 'column' : undefined,
        alignItems: centerContent ? 'center' : undefined,
        justifyContent: centerContent ? 'center' : undefined,
        ...props.style
      }}
    >
      {children}
    </MantineContainer>
  )
}

export default UnifiedContainer
