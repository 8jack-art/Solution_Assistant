/**
 * 自定义变量替换逻辑测试
 * 用于验证 {{zhengce}} 等自定义变量是否能正确被替换
 */

// 模拟自定义变量数据（从后端返回的数据结构）
const customVariables = {
  '{{zhengce}}': '根据国家发展改革委关于投资项目相关政策文件要求...',
  '{{another_var}}': '另一个变量的值'
}

// 模拟提示词模板
const promptTemplate = `
请根据以下信息编写项目报告：

项目政策依据：
{{zhengce}}

其他信息：
{{another_var}}

项目名称：{{project_name}}
`

// 模拟 startGeneration 中的变量替换逻辑
function replaceCustomVariables(template, variables) {
  let result = template
  
  for (const [fullKey, value] of Object.entries(variables)) {
    // 去掉 key 两侧的 {{ 和 }}
    const key = fullKey.replace(/^\{\{|\}\}$/g, '')
    console.log(`替换变量: ${fullKey} -> ${key}`)
    console.log(`  匹配正则: \\{\\{${key}\\}\\}`)
    
    const variablePattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    const before = result
    result = result.replace(variablePattern, String(value))
    console.log(`  替换结果: "${before.substring(0, 50)}..." -> "${result.substring(0, 50)}..."`)
  }
  
  return result
}

// 运行测试
console.log('='.repeat(60))
console.log('自定义变量替换测试')
console.log('='.repeat(60))

console.log('\n原始提示词:')
console.log(promptTemplate)

console.log('\n自定义变量:')
console.log(JSON.stringify(customVariables, null, 2))

console.log('\n开始替换...')
const result = replaceCustomVariables(promptTemplate, customVariables)

console.log('\n' + '='.repeat(60))
console.log('替换后的提示词:')
console.log('='.repeat(60))
console.log(result)

// 验证结果
console.log('\n' + '='.repeat(60))
console.log('验证结果:')
console.log('='.repeat(60))

const tests = [
  {
    name: '{{zhengce}} 被替换',
    pass: !result.includes('{{zhengce}}'),
    expected: '不存在 {{zhengce}}'
  },
  {
    name: '{{another_var}} 被替换',
    pass: !result.includes('{{another_var}}'),
    expected: '不存在 {{another_var}}'
  },
  {
    name: '{{zhengce}} 替换为正确的值',
    pass: result.includes('根据国家发展改革委'),
    expected: '包含变量值内容'
  },
  {
    name: '{{project_name}} 未被替换（不是自定义变量）',
    pass: result.includes('{{project_name}}'),
    expected: '仍然存在 {{project_name}}'
  }
]

let allPassed = true
for (const test of tests) {
  const status = test.pass ? '✅' : '❌'
  console.log(`${status} ${test.name}`)
  console.log(`   预期: ${test.expected}`)
  if (!test.pass) {
    allPassed = false
  }
}

console.log('\n' + '='.repeat(60))
if (allPassed) {
  console.log('🎉 所有测试通过！')
} else {
  console.log('❌ 部分测试失败')
  process.exit(1)
}
