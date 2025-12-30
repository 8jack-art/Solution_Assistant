#  UI设计规范文档

## 1. 整体视觉风格
### 1.1 色彩规范
| 色彩类型       | 色值       | 应用场景                     |
|----------------|------------|------------------------------|
| 主色调（蓝色） | `#1E6FFF`  | 导航栏、主按钮、标题强调     |
| 辅助色（绿色） | `#00C48C`  | AI功能按钮、成功状态提示     |
| 中性色-背景   | `#F5F7FA`  | 卡片/模块背景                |
| 中性色-边框   | `#E5E6EB`  | 所有组件边框、分割线         |
| 中性色-文字主 | `#1D2129`  | 标题、正文核心文字           |
| 中性色-文字次 | `#86909C`  | 辅助说明、占位符、标签文字   |

### 1.2 字体规范
| 文字类型   | 字体            | 字号 | 字重  | 颜色         | 应用场景               |
|------------|-----------------|------|-------|--------------|------------------------|
| 页面标题   | 微软雅黑/思源黑体 | 20px | 600   | `#1D2129`    | 页面顶部主标题         |
| 模块标题   | 微软雅黑/思源黑体 | 16px | 600   | `#1D2129`    | 功能卡片/表单模块标题  |
| 正文       | 微软雅黑/思源黑体 | 14px | 400   | `#1D2129`    | 按钮文字、表单输入文字 |
| 辅助文字   | 微软雅黑/思源黑体 | 12px | 400   | `#86909C`    | 说明文本、标签文字     |

### 1.3 圆角规范
| 组件类型       | 圆角值 | 应用场景                     |
|----------------|--------|------------------------------|
| 卡片/按钮      | 4px    | 功能卡片、操作按钮、弹窗     |
| 输入框/下拉框  | 2px    | 表单输入框、下拉选择框       |

## 2. 核心组件规范
### 2.1 导航栏
.navbar {
  height: 50px;
  background: #FFFFFF;
  border-bottom: 1px solid #E5E6EB;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
}

.navbar-btn {
  padding: 4px 8px;
  border-radius: 4px;
  color: #1D2129;
  background: transparent;
  cursor: pointer;
}

.navbar-btn:hover {
  background: #F5F7FA;
}
- 布局：两端对齐（左侧logo+标题，右侧功能按钮）
- 交互：按钮无默认背景，hover时显示浅灰背景

### 2.2 功能卡片
.function-card {
  width: calc(33.33% - 16px);
  height: 120px;
  background: #FFFFFF;
  border: 1px solid #E5E6EB;
  border-radius: 4px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  margin: 8px;
}

.function-card-icon {
  width: 24px;
  height: 24px;
  margin-bottom: 8px;
}

.function-card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1D2129;
  margin-bottom: 4px;
}

.function-card-desc {
  font-size: 12px;
  color: #86909C;
}
- 布局：一行3列，自适应宽度，内包含图标+标题+描述
- 间距：卡片间距16px，内部元素垂直间距8px/4px

### 2.3 项目列表卡片
.project-card {
  background: #FFFFFF;
  border: 1px solid #E5E6EB;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 16px;
}

.project-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1D2129;
  margin-bottom: 12px;
}

.project-card-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.project-card-label {
  font-size: 12px;
  color: #86909C;
}

.project-card-value {
  font-size: 14px;
  color: #1D2129;
}

.project-card-btn-group {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.project-card-btn {
  padding: 4px 16px;
  height: 32px;
  background: #1E6FFF;
  color: #FFFFFF;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}
- 结构：标题 + 数据项列表 + 操作按钮组
- 交互：按钮组间距8px，按钮hover时透明度0.9

### 2.4 表单及下拉组件
.form-container {
  background: #FFFFFF;
  border: 1px solid #E5E6EB;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 16px;
}

.form-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.form-label {
  width: 120px;
  text-align: right;
  font-size: 14px;
  color: #1D2129;
  margin-right: 12px;
}

.input, .select {
  flex: 1;
  height: 36px;
  border: 1px solid #E5E6EB;
  border-radius: 2px;
  padding: 0 8px;
  font-size: 14px;
  color: #1D2129;
}

.select {
  background: url("arrow-icon.png") no-repeat right 8px center;
  background-size: 16px 16px;
  appearance: none;
}

.select option {
  height: 32px;
  line-height: 32px;
}

.select option:checked {
  background: #F5F7FA;
  color: #1E6FFF;
}

.form-btn-group {
  margin-top: 24px;
  display: flex;
  gap: 12px;
}

.primary-btn {
  height: 36px;
  padding: 0 24px;
  background: #1E6FFF;
  color: #FFFFFF;
  border-radius: 4px;
  border: none;
  font-size: 14px;
  font-weight: 500;
}

.ai-btn {
  height: 36px;
  padding: 0 24px;
  background: #00C48C;
  color: #FFFFFF;
  border-radius: 4px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}
- 输入框/下拉框：高度统一36px，边框样式一致
- 下拉框：自定义箭头图标，选项高度32px，选中态浅灰背景+主色文字
- 按钮：主按钮蓝色，AI按钮绿色，高度统一36px

## 3. 提示弹窗规范
.tooltip {
  background: #FFFFFF;
  border: 1px solid #E5E6EB;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 12px;
  font-size: 12px;
  color: #1D2129;
  position: absolute;
  z-index: 999;
}
- 层级：z-index 999，高于普通组件
- 阴影：轻微模糊阴影，增强层次感