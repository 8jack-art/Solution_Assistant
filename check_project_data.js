/**
 * 查询项目投资估算数据
 * 运行方式: node check_project_data.js <project_id>
 * 或者修改下面的 projectId 变量直接查询
 */

import mysql from 'mysql2/promise'

// 配置数据库连接
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'investment_db'
}

// 要查询的项目ID（修改这里）
const projectId = process.argv[2] || 'your_project_id_here'

async function queryProjectData() {
  let connection
  try {
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ 数据库连接成功\n')

    // 查询投资估算数据
    const [rows] = await connection.execute(
      `SELECT
        id,
        project_id,
        total_investment,
        construction_cost,
        equipment_cost,
        installation_cost,
        other_cost,
        land_cost,
        basic_reserve,
        final_total,
        iteration_count,
        gap_rate,
        created_at,
        updated_at
      FROM investment_estimates
      WHERE project_id = ?
      ORDER BY updated_at DESC
      LIMIT 1`,
      [projectId]
    )

    if (rows.length === 0) {
      console.log(`❌ 未找到项目 ${projectId} 的投资估算数据`)
      return
    }

    const data = rows[0]

    // 计算 partATotal
    const partATotal = (data.construction_cost || 0) +
                       (data.equipment_cost || 0) +
                       (data.installation_cost || 0) +
                       (data.other_cost || 0)

    console.log('=== 投资估算数据 ===\n')
    console.log(`项目ID: ${data.project_id}`)
    console.log(`估算ID: ${data.id}`)
    console.log(`总投资: ${data.total_investment?.toFixed(2) || 0} 万元`)
    console.log(`项目总资金: ${data.final_total?.toFixed(2) || 0} 万元`)
    console.log(`迭代次数: ${data.iteration_count}`)
    console.log(`差距率: ${data.gap_rate?.toFixed(4) || 0}\n`)

    console.log('=== A部分费用明细 ===')
    console.log(`建设工程费: ${data.construction_cost?.toFixed(2) || 0} 万元`)
    console.log(`设备购置费: ${data.equipment_cost?.toFixed(2) || 0} 万元`)
    console.log(`安装工程费: ${data.installation_cost?.toFixed(2) || 0} 万元`)
    console.log(`其它费用: ${data.other_cost?.toFixed(2) || 0} 万元`)
    console.log(`-------------------`)
    console.log(`partATotal (合计): ${partATotal.toFixed(2)} 万元`)
    console.log(`土地费用: ${data.land_cost?.toFixed(2) || 0} 万元`)
    console.log(`基本预备费: ${data.basic_reserve?.toFixed(2) || 0} 万元`)

    console.log('\n=== 问题诊断 ===')
    if (partATotal > 30000) {
      console.log(`⚠️ partATotal = ${partATotal.toFixed(2)} 万元`)
      console.log(`这会导致勘察设计费约 ${calculateSurveyDesignFee(partATotal).toFixed(2)} 万元`)
      console.log(`（预期应约为 853 万元）`)
    } else if (partATotal > 20000 && partATotal < 30000) {
      console.log(`⚠️ partATotal = ${partATotal.toFixed(2)} 万元（落在 [20000, 30000] 区间）`)
      console.log(`这会导致勘察设计费超过 1000 万元`)
    } else if (partATotal > 10000 && partATotal < 20000) {
      console.log(`✅ partATotal = ${partATotal.toFixed(2)} 万元（落在 [10000, 20000] 区间）`)
      console.log(`勘察设计费应约为 ${calculateSurveyDesignFee(partATotal).toFixed(2)} 万元`)
    }

  } catch (error) {
    console.error('❌ 查询失败:', error.message)
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔒 数据库连接已关闭')
    }
  }
}

// 勘察设计费计算函数
function calculateSurveyDesignFee(engineeringCost) {
  if (engineeringCost <= 0) return 0

  const SURVEY_DESIGN_BRACKETS = [
    { threshold: 200, base: 8.10 },
    { threshold: 500, base: 18.81 },
    { threshold: 1000, base: 34.92 },
    { threshold: 3000, base: 93.42 },
    { threshold: 5000, base: 147.51 },
    { threshold: 8000, base: 224.64 },
    { threshold: 10000, base: 274.32 },
    { threshold: 20000, base: 510.12 },
    { threshold: 40000, base: 948.60 },
    { threshold: 60000, base: 1363.68 },
    { threshold: 80000, base: 1764.09 },
    { threshold: 100000, base: 2154.06 },
    { threshold: 200000, base: 4005.72 },
    { threshold: 400000, base: 7449.03 },
    { threshold: 600000, base: 10707.75 },
    { threshold: 800000, base: 13852.26 },
    { threshold: 1000000, base: 16914.42 },
    { threshold: 2000000, base: 31454.01 },
  ]

  // 分档内插
  function calculateByBracketInterpolation(value, brackets) {
    if (value <= 0) return 0

    let lowerIndex = -1
    let upperIndex = -1

    for (let i = 0; i < brackets.length - 1; i++) {
      if (value >= brackets[i].threshold && value <= brackets[i + 1].threshold) {
        lowerIndex = i
        upperIndex = i + 1
        break
      }
    }

    if (lowerIndex === -1) {
      if (value < brackets[0].threshold) {
        return brackets[0].base * (value / brackets[0].threshold)
      } else {
        const lastBracket = brackets[brackets.length - 1]
        const secondLastBracket = brackets[brackets.length - 2]
        const rate = (lastBracket.base - secondLastBracket.base) / (lastBracket.threshold - secondLastBracket.threshold)
        return lastBracket.base + (value - lastBracket.threshold) * rate
      }
    }

    const lowerBracket = brackets[lowerIndex]
    const upperBracket = brackets[upperIndex]
    const rate = (upperBracket.base - lowerBracket.base) / (upperBracket.threshold - lowerBracket.threshold)
    return lowerBracket.base + (value - lowerBracket.threshold) * rate
  }

  const preliminarySurveyFee = engineeringCost * 0.003
  const constructionSurveyFee = engineeringCost * 0.012
  const surveyFee = preliminarySurveyFee + constructionSurveyFee

  const baseDesignFee = calculateByBracketInterpolation(engineeringCost, SURVEY_DESIGN_BRACKETS)
  const adjustedBaseDesignFee = baseDesignFee * 1.0 * 1.10
  const asBuiltDrawingFee = adjustedBaseDesignFee * 0.08
  const designFee = adjustedBaseDesignFee + asBuiltDrawingFee

  return surveyFee + designFee
}

queryProjectData()
