// CKEditor 5 动态导入类型声明
// 用于解决动态导入时的类型问题

declare module '@ckeditor/ckeditor5-react' {
  export const CKEditor: any
}

declare module '@ckeditor/ckeditor5-build-classic' {
  const ClassicEditor: any
  export default ClassicEditor
}

declare module '@ckeditor/ckeditor5-build-inline' {
  const InlineEditor: any
  export default InlineEditor
}