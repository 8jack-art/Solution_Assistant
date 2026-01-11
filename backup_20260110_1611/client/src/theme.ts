import { createTheme, MantineColorsTuple } from '@mantine/core';

// 根据UI设计规范定义颜色
const primaryBlue: MantineColorsTuple = [
  '#E7F5FF',
  '#D0EBFF',
  '#A5D8FF',
  '#74C0FC',
  '#4DABF7',
  '#1E6FFF', // 主色调
  '#1864E6',
  '#1558CC',
  '#124CB3',
  '#0F4099',
];

const successGreen: MantineColorsTuple = [
  '#E6FCF5',
  '#C3FAE8',
  '#96F2D7',
  '#63E6BE',
  '#38D9A9',
  '#00C48C', // 辅助色
  '#12B886',
  '#0CA678',
  '#099268',
  '#087f5b',
];

export const theme = createTheme({
  // 主色调
  primaryColor: 'primary',
  
  // 自定义颜色
  colors: {
    primary: primaryBlue,
    success: successGreen,
  },
  
  // 字体配置 - 严格按照UI规范
  fontFamily: "'Microsoft YaHei', 'Source Han Sans CN', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontFamilyMonospace: "'Courier New', Courier, monospace",
  
  // 字号配置 - 严格按照UI规范
  fontSizes: {
    xs: '12px',   // 辅助文字
    sm: '14px',   // 正文
    md: '14px',   // 正文
    lg: '16px',   // 模块标题
    xl: '20px',   // 页面标题
  },
  
  // 字重配置
  headings: {
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '20px', fontWeight: '600' }, // 页面标题
      h2: { fontSize: '20px', fontWeight: '600' },
      h3: { fontSize: '20px', fontWeight: '600' },
      h4: { fontSize: '16px', fontWeight: '600' }, // 模块标题
      h5: { fontSize: '16px', fontWeight: '600' },
      h6: { fontSize: '14px', fontWeight: '600' },
    },
  },
  
  // 圆角配置 - 严格按照UI规范
  radius: {
    xs: '4px',   // 输入框/下拉框（加大一倍）
    sm: '4px',   // 卡片/按钮
    md: '4px',
    lg: '8px',
    xl: '12px',
  },
  
  // 间距配置 - 严格按照UI规范
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  
  // 默认圆角
  defaultRadius: 'sm',
  
  // 组件默认配置
  components: {
    Button: {
      defaultProps: {
        size: 'sm',
      },
      styles: {
        root: {
          height: '36px',
          fontSize: '14px',
          fontWeight: 500,
          borderRadius: '4px',
          padding: '0 24px',
        },
      },
    },
    
    TextInput: {
      defaultProps: {
        size: 'sm',
      },
      styles: {
        input: {
          height: '36px',
          fontSize: '14px',
          borderColor: '#E5E6EB',
          borderRadius: '4px',
          padding: '0 8px',
          color: '#1D2129',
          transition: 'border-color 0.2s ease',
          '&:focus': {
            borderColor: '#1E6FFF !important',
            borderWidth: '2px',
          },
        },
        label: {
          fontSize: '14px',
          color: '#1D2129',
          fontWeight: 400,
          marginBottom: '6px',
        },
      },
    },
    
    NumberInput: {
      defaultProps: {
        size: 'sm',
        hideControls: true,
      },
      styles: {
        input: {
          height: '36px',
          fontSize: '14px',
          borderColor: '#E5E6EB',
          borderRadius: '4px',
          padding: '0 8px',
          color: '#1D2129',
          transition: 'border-color 0.2s ease',
          '&:focus': {
            borderColor: '#1E6FFF !important',
            borderWidth: '2px',
          },
        },
        label: {
          fontSize: '14px',
          color: '#1D2129',
          fontWeight: 400,
          marginBottom: '6px',
        },
      },
    },
    
    Select: {
      defaultProps: {
        size: 'sm',
      },
      styles: {
        input: {
          height: '36px',
          fontSize: '14px',
          borderColor: '#E5E6EB',
          borderRadius: '4px',
          padding: '0 8px',
          color: '#1D2129',
          transition: 'border-color 0.2s ease',
          '&:focus': {
            borderColor: '#1E6FFF !important',
            borderWidth: '2px',
          },
        },
        label: {
          fontSize: '14px',
          color: '#1D2129',
          fontWeight: 400,
          marginBottom: '6px',
        },
        option: {
          height: '32px',
          lineHeight: '32px',
          '&[data-combobox-selected]': {
            backgroundColor: '#F5F7FA',
            color: '#1E6FFF',
          },
          '&[data-hovered]': {
            backgroundColor: '#F5F7FA',
          },
        },
      },
    },
    
    Textarea: {
      defaultProps: {
        size: 'sm',
      },
      styles: {
        input: {
          fontSize: '14px',
          borderColor: '#E5E6EB',
          borderRadius: '4px',
          padding: '8px',
          color: '#1D2129',
          transition: 'border-color 0.2s ease',
          '&:focus': {
            borderColor: '#1E6FFF !important',
            borderWidth: '2px',
          },
        },
        label: {
          fontSize: '14px',
          color: '#1D2129',
          fontWeight: 400,
          marginBottom: '6px',
        },
      },
    },
    
    Card: {
      defaultProps: {
        padding: 'lg',
        radius: 'sm',
      },
      styles: {
        root: {
          borderColor: '#E5E6EB',
          borderRadius: '4px',
        },
      },
    },
    
    Paper: {
      styles: {
        root: {
          borderColor: '#E5E6EB',
        },
      },
    },
    
    PasswordInput: {
      defaultProps: {
        size: 'sm',
      },
      styles: {
        input: {
          height: '36px',
          fontSize: '14px',
          borderColor: '#E5E6EB',
          borderRadius: '4px',
          padding: '0 8px',
          color: '#1D2129',
          transition: 'border-color 0.2s ease',
          '&:focus': {
            borderColor: '#1E6FFF !important',
            borderWidth: '2px',
          },
        },
        label: {
          fontSize: '14px',
          color: '#1D2129',
          fontWeight: 400,
          marginBottom: '6px',
        },
      },
    },
    
    Autocomplete: {
      defaultProps: {
        size: 'sm',
      },
      styles: {
        input: {
          height: '36px',
          fontSize: '14px',
          borderColor: '#E5E6EB',
          borderRadius: '4px',
          padding: '0 8px',
          color: '#1D2129',
          transition: 'border-color 0.2s ease',
          '&:focus': {
            borderColor: '#1E6FFF !important',
            borderWidth: '2px',
          },
        },
      },
    },
  },
  
  // 其他配置
  other: {
    colors: {
      bgNeutral: '#F5F7FA',
      borderNeutral: '#E5E6EB',
      textPrimary: '#1D2129',
      textSecondary: '#86909C',
    },
  },
});
