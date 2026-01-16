# 土地流转Badge按钮消失问题修复计划

## 问题描述

投资项目方案报告生成页面中的土地流转功能 `{{land_transfer}}` 对应的"土地流转"badge按钮之前存在但现在不见了。该按钮应该位于"投资项目方案报告生成"页面的可用变量card中"项目信息"类别下。

## 问题分析

### 根本原因

1. **变量分类错误**：
   - 在 [`reportStore.ts:711`](client/src/stores/reportStore.ts:711) 中，`{{land_transfer}}` 变量被错误定义为 `category: 'tableData'`
   - 应该属于"项目信息"类别

2. **UI硬编码**：
   - [`VariablePicker.tsx`](client/src/components/report/VariablePicker.tsx) 中的"项目信息"类别（第209-232行）只有两个变量：
     - `project_type`（项目类型）
     - `location`（项目地点）
   - 没有包含"土地流转"按钮的代码

### 当前代码状态

#### reportStore.ts 中的变量定义（第711行）
```javascript
{ key: '{{land_transfer}}', label: '土地流转信息', category: 'tableData', value: landTransferValue }
```

#### VariablePicker.tsx 中的项目信息类别（第209-232行）
```jsx
<div>
  <Text size="xs" c="dimmed" mb="xs">项目信息</Text>
  <Group gap={4}>
    <Badge variant="light" color="cyan" ...>项目类型</Badge>
    <Badge variant="light" color="cyan" ...>项目地点</Badge>
  </Group>
</div>
```

## 修复方案

### 步骤1：修改 reportStore.ts 中的变量分类

**文件**: `client/src/stores/reportStore.ts`
**行号**: 711

**修改内容**:
将 `{{land_transfer}}` 变量的 `category` 从 `'tableData'` 改为 `'project'`

```javascript
// 修改前
{ key: '{{land_transfer}}', label: '土地流转信息', category: 'tableData', value: landTransferValue }

// 修改后
{ key: '{{land_transfer}}', label: '土地流转信息', category: 'project', value: landTransferValue }
```

**说明**: 使用 `'project'` 类别是因为现有的"项目信息"类别下的变量使用 `color="cyan"` 颜色标识，与 `project_type` 和 `location` 保持一致。

### 步骤2：修改 VariablePicker.tsx 添加土地流转按钮和小眼睛

**文件**: `client/src/components/report/VariablePicker.tsx`
**行号**: 209-232

**修改内容**:
在"项目信息"类别的 Group 中添加"土地流转"badge按钮，并添加小眼睛图标（类似 `{{repair_rate}}` 的实现）

```jsx
{/* 修改前 */}
<div>
  <Text size="xs" c="dimmed" mb="xs">项目信息</Text>
  <Group gap={4}>
    <Badge variant="light" color="cyan" ...>项目类型</Badge>
    <Badge variant="light" color="cyan" ...>项目地点</Badge>
  </Group>
</div>

{/* 修改后 */}
<div>
  <Text size="xs" c="dimmed" mb="xs">项目信息</Text>
  <Group gap={4}>
    <Badge variant="light" color="cyan" ...>项目类型</Badge>
    <Badge variant="light" color="cyan" ...>项目地点</Badge>
    <Badge variant="light" color="cyan" ...>土地流转</Badge>
  </Group>
</div>
```

**完整代码（包含小眼睛功能）**:
```jsx
<div>
  <Text size="xs" c="dimmed" mb="xs">项目信息</Text>
  <Group gap={4}>
    <Badge
      variant="light"
      color="cyan"
      style={{ cursor: 'pointer' }}
      onClick={() => handleCopyVariable('{{project_type}}')}
      title="点击复制"
    >
      项目类型
    </Badge>
    <Badge
      variant="light"
      color="cyan"
      style={{ cursor: 'pointer' }}
      onClick={() => handleCopyVariable('{{location}}')}
      title="点击复制"
    >
      项目地点
    </Badge>
    <Badge
      variant="light"
      color="cyan"
      style={{ cursor: 'pointer' }}
      onClick={() => handleCopyVariable('{{land_transfer}}')}
      title="点击复制"
      rightSection={
        <Tooltip label="查看JSON数据">
          <ActionIcon
            size="xs"
            variant="transparent"
            color="cyan"
            onClick={(e) => {
              e.stopPropagation()
              handleViewJson('{{land_transfer}}', '土地流转信息')
            }}
          >
            <Eye size={12} />
          </ActionIcon>
        </Tooltip>
      }
    >
      土地流转
    </Badge>
  </Group>
</div>
```

**说明**:
- `handleViewJson` 函数已在第39-46行定义，可以直接复用
- 小眼睛图标使用 `Eye` 组件（从 `lucide-react` 导入）
- `onClick={(e) => { e.stopPropagation() }}` 阻止事件冒泡，避免同时触发badge的点击复制功能

## 实施步骤

### 步骤1：备份文件
- 备份 `client/src/stores/reportStore.ts`
- 备份 `client/src/components/report/VariablePicker.tsx`

### 步骤2：修改 reportStore.ts
1. 打开文件，找到第711行
2. 将 `category: 'tableData'` 改为 `category: 'project'`
3. 保存文件

### 步骤3：修改 VariablePicker.tsx
1. 打开文件，找到第209-232行
2. 在项目信息类别的 Group 中添加"土地流转"badge按钮代码
3. 保存文件

### 步骤4：测试验证
1. 启动开发服务器
2. 打开"投资项目方案报告生成"页面
3. 确认"可用变量"card中的"项目信息"类别下显示"土地流转"按钮
4. 点击按钮测试复制功能
5. 验证粘贴到提示词中能正确显示变量

## 风险评估

### 低风险
- 修改简单，只涉及两处代码变更
- 变量已在 store 中正确创建，只需调整分类和显示位置
- 不影响其他功能

### 注意事项
1. 确保变量值 `landTransferValue` 的生成逻辑正确
2. 测试不同项目数据下土地流转信息的显示
3. 验证当没有土地流转数据时的空值处理

## 验收标准

1. [ ] "项目信息"类别下显示"土地流转"badge按钮
2. [ ] 按钮使用 `color="cyan"` 样式，与其他项目信息变量一致
3. [ ] 点击按钮能正确复制 `{{land_transfer}}` 变量
4. [ ] 按钮右侧有小眼睛图标
5. [ ] 点击小眼睛图标能弹出JSON数据查看器，显示土地流转信息
6. [ ] 小眼睛和badge点击事件互不干扰

## 相关文件

| 文件路径 | 修改内容 |
|---------|---------|
| `client/src/stores/reportStore.ts` | 修改变量分类 |
| `client/src/components/report/VariablePicker.tsx` | 添加按钮UI |

## 附录：变量数据来源

`{{land_transfer}}` 变量的数据来源：
- 来源：`projectData.revenueCost?.costConfig?.otherExpenses`
- 检测逻辑：检查 `otherExpenses.name` 是否包含"土地"或"流转"关键词
- 数据结构：
```json
{
  "name": "土地流转费用",
  "remark": "备注信息"
}
```

## 创建时间
2026-01-16

## 预计修复工时
约30分钟（包含测试）
