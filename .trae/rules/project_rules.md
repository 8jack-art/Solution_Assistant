# 大模型编程规范：避免JSX表格渲染与计算逻辑错误

## 核心原则
1.  **强制分离计算逻辑与渲染逻辑**：所有数据计算、转换、统计操作必须在JSX渲染前完成，禁止在JSX的`{}`表达式、`map()`遍历中直接执行算术运算、`reduce()`统计、数据过滤等逻辑。
2.  **必须缓存复杂计算结果**：涉及数组遍历、多字段运算、统计汇总的逻辑，必须使用`useMemo`（函数组件）或计算属性（类组件）缓存结果，仅依赖原始数据变化时重新计算。
3.  **保证渲染稳定性**：表格行必须使用数据自身唯一标识作为`key`，禁止使用数组索引。

## 具体编码规则
### 规则1：计算逻辑前置化
- **禁止写法**：在JSX中直接嵌入计算表达式
```jsx
{/* ❌ 错误：渲染时重复执行计算，可能导致性能问题和结果错乱 */}
<tr key={index}>
  <td>{item.cost + item.fee + item.tax}</td>
  <td>{(item.fee / item.cost * 100).toFixed(2)}%</td>
</tr>
```
- **强制写法**：渲染前完成所有计算，生成纯渲染数据
```jsx
// ✅ 正确：计算逻辑前置，仅依赖rawData变化执行
const tableData = useMemo(() => {
  return rawData.map(item => {
    const total = (item.cost ?? 0) + (item.fee ?? 0) + (item.tax ?? 0);
    const ratio = item.cost ? (item.fee / item.cost * 100).toFixed(2) + '%' : '0%';
    return { ...item, total, ratio };
  });
}, [rawData]);

// JSX仅做纯渲染
<tr key={item.id}>
  <td>{item.total}</td>
  <td>{item.ratio}</td>
</tr>
```

### 规则2：缓存计算结果，避免重复执行
- **适用场景**：表格数据量大、计算逻辑复杂（如多维度统计、嵌套运算）
- **强制要求**：使用`useMemo`缓存处理后的表格数据和全局统计结果
```jsx
// ✅ 正确：缓存表格行数据和全局合计值
const { rows, totalSum } = useMemo(() => {
  const processedRows = rawData.map(item => ({
    ...item,
    total: (item.a ?? 0) + (item.b ?? 0)
  }));
  const sum = processedRows.reduce((acc, cur) => acc + cur.total, 0);
  return { rows: processedRows, totalSum: sum };
}, [rawData]);
```

### 规则3：表格`key`属性规范
- **禁止写法**：使用数组索引作为`key`
```jsx
{/* ❌ 错误：数据增删/排序时，索引变化导致渲染错乱 */}
{tableData.map((item, index) => <tr key={index}>{/* 内容 */}</tr>)}
```
- **强制写法**：使用数据唯一标识（如`id`、`uuid`）作为`key`
```jsx
{/* ✅ 正确：key与数据一一对应，保证渲染稳定性 */}
{tableData.map(item => <tr key={item.id}>{/* 内容 */}</tr>)}
```

### 规则4：空值与异常数据处理
- **强制要求**：计算前对`undefined`/`null`数据做兜底处理，避免出现`NaN`导致渲染异常
```jsx
// ✅ 正确：空值兜底，防止计算错误
const total = (item.cost ?? 0) + (item.fee ?? 0); // 空值转为0
const ratio = item.cost ? (item.fee / item.cost * 100).toFixed(2) : 0; // 避免除以0
```

### 规则5：禁止修改原始数据
- **强制要求**：遵循React不可变数据原则，计算时生成新数据对象，禁止直接修改原始数据
```jsx
// ❌ 错误：直接修改原始数据，可能引发不可预期的渲染问题
rawData.forEach(item => item.total = item.a + item.b);

// ✅ 正确：生成新数据，不污染原始数据源
const tableData = rawData.map(item => ({ ...item, total: item.a + item.b }));
```

## 代码审查要点
1.  检查JSX中是否存在`+`/`-`/`*`/`/`算术运算、`reduce()`/`filter()`等数组操作；
2.  检查表格行`key`是否使用数据唯一标识，而非索引；
3.  检查复杂计算是否通过`useMemo`缓存，且依赖数组完整；
4.  检查计算逻辑中是否对空值做了兜底处理。
