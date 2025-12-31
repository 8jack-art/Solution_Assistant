/**
 * CKEditor 5 配置文件
 * 提供可编辑和只读两种模式的配置
 */

import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Heading,
  List,
  Link,
  Image,
  ImageUpload,
  ImageResize,
  Table,
  TableToolbar,
  TableProperties,
  TableCellProperties,
  Markdown,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  CodeBlock,
  BlockQuote,
  HorizontalLine,
  Undo,
  Redo
} from 'ckeditor5'

/**
 * 创建编辑器配置
 * @param isReadOnly 是否为只读模式
 * @returns CKEditor 5 配置对象
 */
export function createEditorConfig(isReadOnly = false) {
  return {
    plugins: [
      Essentials,
      Paragraph,
      Heading,
      List,
      Link,
      Image,
      ImageUpload,
      ImageResize,
      Table,
      TableToolbar,
      TableProperties,
      TableCellProperties,
      Markdown,
      Bold,
      Italic,
      Underline,
      Strikethrough,
      Code,
      CodeBlock,
      BlockQuote,
      HorizontalLine,
      Undo,
      Redo
    ],
    toolbar: isReadOnly ? [] : [
      'undo', 'redo',
      '|', 'heading',
      '|', 'bold', 'italic', 'underline', 'strikethrough', 'code',
      '|', 'bulletedList', 'numberedList',
      '|', 'link', 'imageUpload',
      '|', 'insertTable', 'tableColumn', 'tableRow', 'mergeTableCells',
      '|', 'blockQuote', 'codeBlock', 'horizontalLine',
      '|', 'sourceEditing'
    ],
    heading: {
      options: [
        { model: 'paragraph', title: '段落', class: 'ck-heading_paragraph' },
        { model: 'heading1', view: 'h1', title: '标题 1', class: 'ck-heading_heading1' },
        { model: 'heading2', view: 'h2', title: '标题 2', class: 'ck-heading_heading2' },
        { model: 'heading3', view: 'h3', title: '标题 3', class: 'ck-heading_heading3' }
      ]
    },
    list: {
      properties: {
        styles: true,
        startIndex: true,
        reversed: true
      }
    },
    image: {
      toolbar: [
        'imageTextAlternative', '|',
        'imageStyle:full', 'imageStyle:side', '|',
        'imageResize:50%', 'imageResize:75%', 'imageResize:original'
      ],
      styles: [
        'full',
        'side'
      ]
    },
    table: {
      contentToolbar: [
        'tableColumn', 'tableRow', 'mergeTableCells',
        'tableProperties', 'tableCellProperties'
      ],
      tableToolbar: [
        'insertTable',
        'tableColumn',
        'tableRow',
        'mergeTableCells'
      ]
    },
    language: 'zh-cn',
    placeholder: '请输入内容...',
    readOnly: isReadOnly
  }
}

/**
 * 创建简化版编辑器配置（用于提示词输入）
 * @returns CKEditor 5 配置对象
 */
export function createSimpleEditorConfig() {
  return {
    plugins: [
      Essentials,
      Paragraph,
      Heading,
      List,
      Link,
      Bold,
      Italic,
      Underline,
      Code,
      BlockQuote,
      HorizontalLine,
      Undo,
      Redo
    ],
    toolbar: [
      'undo', 'redo',
      '|', 'heading',
      '|', 'bold', 'italic', 'underline', 'code',
      '|', 'bulletedList', 'numberedList',
      '|', 'link',
      '|', 'blockQuote', 'horizontalLine'
    ],
    heading: {
      options: [
        { model: 'paragraph', title: '段落', class: 'ck-heading_paragraph' },
        { model: 'heading1', view: 'h1', title: '标题 1', class: 'ck-heading_heading1' },
        { model: 'heading2', view: 'h2', title: '标题 2', class: 'ck-heading_heading2' },
        { model: 'heading3', view: 'h3', title: '标题 3', class: 'ck-heading_heading3' }
      ]
    },
    language: 'zh-cn',
    placeholder: '请输入提示词...',
    readOnly: false
  }
}

export { ClassicEditor }
