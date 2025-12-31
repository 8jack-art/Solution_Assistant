/**
 * 测试流式输出效果
 * 模拟大模型调用时的流式输出
 */

const testStreamingOutput = () => {
  console.log('=== 测试流式输出效果 ===')
  
  // 模拟不同类型的内容流
  const testCases = [
    {
      name: '标题内容',
      content: '# 投资方案报告\n\n',
      delay: 100
    },
    {
      name: '项目概况',
      content: '## 一、项目概况\n\n本项目为现代化农业产业园建设项目，总投资规模预计达到5000万元人民币。项目建设内容主要包括标准化种植大棚、智能灌溉系统、农产品加工车间及配套设施等。\n\n',
      delay: 50
    },
    {
      name: '投资分析',
      content: '## 二、投资分析\n\n### 2.1 建设投资\n\n建设投资总计3200万元，具体构成如下：\n\n- **建筑工程费**：1800万元\n- **设备购置费**：1000万元  \n- **安装工程费**：250万元\n- **其他费用**：150万元\n\n',
      delay: 30
    },
    {
      name: '技术方案',
      content: '## 三、技术方案\n\n### 3.1 总体设计\n\n项目采用现代化农业技术，集成了物联网监测、智能灌溉、精准施肥等先进技术。设计年产能达到高品质农产品5000吨。\n\n### 3.2 核心技术\n\n1. **智能温室技术**：采用全自动环境控制系统，实现温度、湿度、光照的精确调控\n2. **水肥一体化技术**：通过滴灌系统实现水肥同步供应，提高肥料利用率30%以上\n3. **物联网监测技术**：部署传感器网络，实时监测土壤墒情、作物生长状况\n\n',
      delay: 20
    },
    {
      name: '经济效益',
      content: '## 四、经济效益分析\n\n### 4.1 收入预测\n\n项目达产后，预计年收入情况如下：\n\n- 高品质蔬菜：年产量2000吨，平均单价8元/公斤，年收入1600万元\n- 有机水果：年产量800吨，平均单价12元/公斤，年收入960万元  \n- 农产品加工品：年产量500吨，平均单价20元/公斤，年收入1000万元\n\n**年总收入预测：3560万元**\n\n### 4.2 成本分析\n\n年运营成本主要包括：\n\n- 原材料成本：800万元\n- 人工成本：600万元\n- 能源成本：400万元\n- 维护成本：200万元\n- 销售费用：300万元\n\n**年总成本：2300万元**\n\n### 4.3 盈利能力\n\n- **年净利润**：1260万元\n- **投资回报率**：25.2%\n- **投资回收期**：4.2年（含建设期）\n\n',
      delay: 15
    },
    {
      name: '风险分析',
      content: '## 五、风险分析与对策\n\n### 5.1 主要风险\n\n1. **市场风险**：农产品价格波动较大，可能影响项目收益\n2. **技术风险**：新技术应用可能存在技术不成熟风险\n3. **自然风险**：气候变化对农业生产影响较大\n4. **政策风险**：农业政策调整可能影响项目发展\n\n### 5.2 风险对策\n\n1. **市场多元化**：拓展销售渠道，开发深加工产品，降低市场风险\n2. **技术保障**：与科研院所合作，建立技术支持体系\n3. **保险保障**：购买农业保险，转移自然风险\n4. **政策跟踪**：密切关注政策动向，及时调整经营策略\n\n',
      delay: 25
    },
    {
      name: '结论',
      content: '## 六、投资结论\n\n本项目技术先进、市场前景良好、经济效益显著，具有较强的投资价值。主要优势如下：\n\n✅ **技术优势**：采用现代化农业技术，生产效率高\n✅ **市场优势**：产品品质优良，市场需求旺盛  \n✅ **效益优势**：投资回报率达到25.2%，经济效益显著\n✅ **政策优势**：符合国家农业现代化发展方向\n\n**建议**：项目具备良好的投资价值，建议按计划推进实施。\n\n',
      delay: 40
    }
  ]

  let currentContent = ''
  let totalLength = 0
  let startTime = Date.now()

  // 计算总长度
  testCases.forEach(testCase => {
    totalLength += testCase.content.length
  })

  console.log(`总字符数: ${totalLength}`)
  console.log('开始模拟流式输出...\n')

  // 逐个测试用例输出
  let currentIndex = 0
  const runTestCase = () => {
    if (currentIndex >= testCases.length) {
      console.log('\n=== 流式输出测试完成 ===')
      console.log(`总用时: ${((Date.now() - startTime) / 1000).toFixed(2)}秒`)
      console.log(`平均速度: ${(totalLength / ((Date.now() - startTime) / 1000)).toFixed(1)}字符/秒`)
      return
    }

    const testCase = testCases[currentIndex]
    console.log(`\n--- ${testCase.name} ---`)
    
    // 逐字符输出
    let charIndex = 0
    const outputChar = () => {
      if (charIndex < testCase.content.length) {
        currentContent += testCase.content[charIndex]
        process.stdout.write(testCase.content[charIndex])
        charIndex++
        
        // 模拟流式进度更新
        const progress = ((currentContent.length / totalLength) * 100).toFixed(1)
        const speed = currentContent.length / ((Date.now() - startTime) / 1000)
        
        if (charIndex % 50 === 0) {
          console.log(`\n[进度: ${progress}% | 速度: ${speed.toFixed(1)}字符/秒 | 已输出: ${currentContent.length}/${totalLength}]`)
        }
        
        setTimeout(outputChar, testCase.delay)
      } else {
        currentIndex++
        setTimeout(runTestCase, 200)
      }
    }
    
    outputChar()
  }

  // 开始测试
  runTestCase()
}

// 模拟SSE消息格式
const testSSEMessages = () => {
  console.log('\n=== 测试SSE消息格式 ===')
  
  const messages = [
    { type: 'status', status: 'starting' },
    { type: 'content', content: '# 投资方案报告\n\n## 一、项目概况\n\n', progress: 5 },
    { type: 'content', content: '本项目为现代化农业产业园建设项目，总投资规模预计达到5000万元人民币。\n\n', progress: 10 },
    { type: 'status', status: 'generating' },
    { type: 'content', content: '## 二、投资分析\n\n### 2.1 建设投资\n\n', progress: 20 },
    { type: 'content', content: '建设投资总计3200万元，具体构成如下：\n\n- 建筑工程费：1800万元\n- 设备购置费：1000万元\n', progress: 30 },
    { type: 'content', content: '- 安装工程费：250万元\n- 其他费用：150万元\n\n', progress: 35 },
    { type: 'content', content: '## 三、技术方案\n\n### 3.1 总体设计\n\n项目采用现代化农业技术...\n\n', progress: 50 },
    { type: 'content', content: '## 四、经济效益分析\n\n年总收入预测：3560万元\n年净利润：1260万元\n投资回报率：25.2%\n\n', progress: 80 },
    { type: 'content', content: '## 五、投资结论\n\n本项目技术先进、市场前景良好、经济效益显著，具有较强的投资价值。\n\n建议：项目具备良好的投资价值，建议按计划推进实施。\n', progress: 95 },
    { type: 'completed', content: '完整报告内容...', progress: 100 }
  ]

  messages.forEach((msg, index) => {
    console.log(`SSE消息 ${index + 1}:`)
    console.log('data:', JSON.stringify(msg))
    console.log('---')
  })
}

// 运行测试
if (require.main === module) {
  console.log('开始测试投资方案报告流式输出效果...\n')
  
  // 测试1：流式输出效果
  testStreamingOutput()
  
  // 测试2：SSE消息格式
  setTimeout(() => {
    testSSEMessages()
  }, 3000)
}

module.exports = {
  testStreamingOutput,
  testSSEMessages
}
