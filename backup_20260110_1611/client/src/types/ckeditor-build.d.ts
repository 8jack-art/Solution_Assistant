// CKEditor 5 Build 模块类型声明
// 用于解决 @ckeditor/ckeditor5-build-classic 缺少类型声明的问题

declare module '@ckeditor/ckeditor5-build-classic' {
  const ClassicEditor: any
  export default ClassicEditor
}

declare module '@ckeditor/ckeditor5-build-inline' {
  const InlineEditor: any
  export default InlineEditor
}
