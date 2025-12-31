/**
 * CKEditor 5 配置文件
 * 使用 Classic Editor 构建，提供完整的富文本编辑功能
 * 升级到最新版本API
 */

import ClassicEditor from '@ckeditor/ckeditor5-build-classic'

// Heading 选项配置
const headingOptions: {
  model: string
  view?: string
  title: string
  class: string
}[] = [
  { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
  { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
  { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
  { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' }
]

/**
 * 创建编辑器配置
 * @param isReadOnly 是否为只读模式
 * @returns CKEditor 5 配置对象
 */
export function createEditorConfig(isReadOnly = false): any {
  return {
    language: 'zh-cn',
    toolbar: isReadOnly ? [] : [
      'undo', 'redo',
      '|', 'bold', 'italic', 'underline', 'strikethrough',
      '|', 'bulletedList', 'numberedList',
      '|', 'link', 'imageUpload', 'insertTable',
      '|', 'blockQuote', 'codeBlock', 'horizontalLine',
      '|', 'heading',
      '|', 'sourceEditing'
    ],
    heading: {
      options: headingOptions
    },
    image: {
      toolbar: [
        'imageTextAlternative', '|',
        'imageStyle:full', 'imageStyle:side', '|',
        'imageResize:50%', 'imageResize:75%', 'imageResize:original'
      ]
    },
    table: {
      contentToolbar: [
        'tableColumn', 'tableRow', 'mergeTableCells',
        'tableProperties', 'tableCellProperties'
      ]
    },
    placeholder: isReadOnly ? '生成的内容将显示在这里...' : '请输入内容...',
    readOnly: isReadOnly,
    // 升级配置：添加更多功能
    fontSize: {
      options: [
        'tiny',
        'small',
        'default',
        'big',
        'huge'
      ]
    },
    fontFamily: {
      options: [
        'default',
        'Arial, sans-serif',
        'Times New Roman, serif',
        'Courier New, monospace',
        'Georgia, serif',
        'Verdana, sans-serif'
      ]
    },
    // 文本对齐
    alignment: {
      options: [ 'left', 'right', 'center', 'justify' ]
    },
    // 增强的列表功能
    list: {
      properties: {
        styles: true,
        startIndex: true,
        reversed: true
      }
    },
    // 链接配置
    link: {
      addTargetToExternalLinks: true,
      defaultProtocol: 'https://',
      decorators: [
        {
          mode: 'manual',
          label: 'Open in new tab',
          attributes: {
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        }
      ]
    },
    // 媒体嵌入
    mediaEmbed: {
      previewsInData: true
    },
    // 代码块配置
    codeBlock: {
      languages: [
        { language: 'plaintext', label: 'Plain text' },
        { language: 'javascript', label: 'JavaScript' },
        { language: 'typescript', label: 'TypeScript' },
        { language: 'css', label: 'CSS' },
        { language: 'html', label: 'HTML' },
        { language: 'sql', label: 'SQL' },
        { language: 'json', label: 'JSON' }
      ]
    }
  }
}

/**
 * 创建简化版编辑器配置（用于提示词输入）
 * @returns CKEditor 5 配置对象
 */
export function createSimpleEditorConfig(): any {
  return {
    language: 'zh-cn',
    toolbar: [
      'undo', 'redo',
      '|', 'bold', 'italic', 'underline',
      '|', 'bulletedList', 'numberedList',
      '|', 'heading',
      '|', 'link', 'blockQuote',
      '|', 'codeBlock'
    ],
    heading: {
      options: headingOptions
    },
    placeholder: '请输入提示词...',
    readOnly: false,
    // 简化配置：专注于文本编辑
    fontSize: {
      options: ['default', 'big']
    },
    // 代码块支持
    codeBlock: {
      languages: [
        { language: 'plaintext', label: 'Plain text' },
        { language: 'javascript', label: 'JavaScript' },
        { language: 'css', label: 'CSS' },
        { language: 'sql', label: 'SQL' }
      ]
    }
  }
}

export { ClassicEditor }
