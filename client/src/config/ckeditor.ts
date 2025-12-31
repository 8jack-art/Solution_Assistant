/**
 * CKEditor 5 配置文件
 * 使用 Classic Editor 构建，提供完整的富文本编辑功能
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
    readOnly: isReadOnly
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
      '|', 'link', 'blockQuote'
    ],
    heading: {
      options: headingOptions
    },
    placeholder: '请输入提示词...',
    readOnly: false
  }
}

export { ClassicEditor }
