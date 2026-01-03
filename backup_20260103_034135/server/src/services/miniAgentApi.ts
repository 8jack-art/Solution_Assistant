/**
 * MiniMax 智能体 API 服务
 * 通过 HTTP 接口调用 Mini-Agent 核心功能
 */

import { Router, Request, Response } from 'express'
import { spawn } from 'child_process'
import { promisify } from 'util'
import { exec } from 'child_process'
import path from 'path'

const router = Router()
const execAsync = promisify(exec)

// Mini-Agent 配置
const MINI_AGENT_PATH = '/home/clp2001/.local/bin/mini-agent'
const WORKSPACE_DIR = '/opt/Solution_Assistant'
const API_KEY = 'sk-cp-OfN7NNx7bjKIVvx3ybaR6ayKFu7cTSZ5fKRWEDEkmMxo3DJlRpnAaHReg_oHftkKwh7Q0H94Bry21pkx8kfNLPW_XnqkwFvq2ykHbYZhvUWlXOFz0jWvDd0'

interface AgentTaskRequest {
  task: string
  timeout?: number // 超时时间（秒），默认 120
}

interface AgentTaskResponse {
  success: boolean
  result?: string
  error?: string
  execution_time?: number
}

/**
 * POST /api/agent/run-task
 * 执行智能体任务
 */
router.post('/run-task', async (req: Request, res: Response) => {
  try {
    const { task, timeout = 120 }: AgentTaskRequest = req.body

    if (!task) {
      return res.status(400).json({
        success: false,
        error: '任务描述不能为空'
      } as AgentTaskResponse)
    }

    console.log('🤖 [MiniAgent] 开始执行任务:', task.substring(0, 100) + '...')

    const startTime = Date.now()

    // 设置环境变量
    const env = {
      ...process.env,
      PATH: '/home/clp2001/.local/bin:/usr/local/bin:/usr/bin:/bin',
      MINIMAX_API_KEY: API_KEY,
      MINIMAX_API_BASE: 'https://api.minimaxi.com',
      MINIMAX_MODEL: 'MiniMax-M2'
    }

    // 构建任务提示词
    const systemPrompt = `你是一个专业的代码审查和开发助手。你的任务是帮助用户完成开发任务。
请按照以下格式返回结果：
## 任务结果
[简要描述完成情况]

## 详细输出
[详细的执行结果]

请直接执行任务，不要询问额外问题。`

    // 构建输入命令
    const command = `cd ${WORKSPACE_DIR} && echo -e "${systemPrompt}\n\n任务：${task}\n\n请直接开始执行并返回结果。" | timeout ${timeout} ${MINI_AGENT_PATH} --workspace ${WORKSPACE_DIR} 2>&1 || echo "执行超时或出错"`

    // 执行命令（使用 bash）
    const { stdout, stderr } = await execAsync(command, {
      env,
      timeout: timeout * 1000 + 5000,
      maxBuffer: 10 * 1024 * 1024 // 10MB
    })

    const executionTime = Date.now() - startTime

    console.log(`✅ [MiniAgent] 任务完成，耗时: ${executionTime}ms`)

    // 清理输出（移除 ANSI 颜色码）
    const cleanOutput = stdout.replace(/\x1b\[[0-9;]*m/g, '').trim()

    res.json({
      success: true,
      result: cleanOutput,
      execution_time: executionTime
    } as AgentTaskResponse)

  } catch (error: any) {
    console.error('❌ [MiniAgent] 执行失败:', error)

    const errorMessage = error.message || '未知错误'

    // 处理超时
    if (error.message?.includes('Command timed out')) {
      return res.status(408).json({
        success: false,
        error: '任务执行超时',
        result: '任务执行时间超过限制，请尝试简化任务或减少范围'
      } as AgentTaskResponse)
    }

    res.status(500).json({
      success: false,
      error: errorMessage
    } as AgentTaskResponse)
  }
})

/**
 * POST /api/agent/code-review
 * 代码审查任务
 */
router.post('/code-review', async (req: Request, res: Response) => {
  try {
    const { filePath, focus }: { filePath?: string; focus?: string[] } = req.body

    const task = filePath
      ? `请审查文件 "${filePath}"，重点关注：${focus?.join(', ') || '代码质量、性能问题、潜在 Bug'}`
      : `请审查整个项目 /opt/Solution_Assistant，识别代码质量问题、性能优化点、潜在 Bug`

    // 使用 run-task 逻辑
    const systemPrompt = `你是一个专业的代码审查专家。任务：
1. 仔细分析代码
2. 识别问题（Bug、性能、安全、可维护性）
3. 提供具体的改进建议
4. 给出修复示例

输出格式：
## 🔍 审查概要
- 文件数量：x
- 发现问题：x 个
  - 严重：x
  - 警告：x
  - 建议：x

## 📋 详细问题列表
### 问题 1: [标题]
- 位置：[文件:行号]
- 级别：[严重/警告/建议]
- 描述：...
- 修复建议：...

## ✅ 修复后的代码
\`\`\`[语言]
[修复后的代码]
\`\`\`` 

    const { stdout, stderr } = await execAsync(
      `cd ${WORKSPACE_DIR} && echo "${task}" | timeout 180 ${MINI_AGENT_PATH} --workspace ${WORKSPACE_DIR} 2>&1`,
      {
        env: {
          ...process.env,
          PATH: '/home/clp2001/.local/bin:/usr/local/bin:/usr/bin:/bin',
          MINIMAX_API_KEY: API_KEY,
          MINIMAX_API_BASE: 'https://api.minimaxi.com',
          MINIMAX_MODEL: 'MiniMax-M2'
        },
        timeout: 185000
      }
    )

    const cleanOutput = stdout.replace(/\x1b\[[0-9;]*m/g, '').trim()

    res.json({
      success: true,
      result: cleanOutput
    })

  } catch (error: any) {
    console.error('❌ [MiniAgent] 代码审查失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '审查失败'
    })
  }
})

/**
 * POST /api/agent/generate-tests
 * 生成测试用例
 */
router.post('/generate-tests', async (req: Request, res: Response) => {
  try {
    const { filePath, testFramework = 'jest' }: { filePath: string; testFramework?: string } = req.body

    const task = `请为文件 "${filePath}" 生成完整的测试用例。
使用测试框架：${testFramework}
要求：
1. 覆盖所有公开函数和方法
2. 包含正常情况和边界情况
3. 使用有意义的测试描述
4. 遵循测试最佳实践`

    const { stdout } = await execAsync(
      `cd ${WORKSPACE_DIR} && echo "${task}" | timeout 180 ${MINI_AGENT_PATH} --workspace ${WORKSPACE_DIR} 2>&1`,
      {
        env: {
          ...process.env,
          PATH: '/home/clp2001/.local/bin:/usr/local/bin:/usr/bin:/bin',
          MINIMAX_API_KEY: API_KEY,
          MINIMAX_API_BASE: 'https://api.minimaxi.com',
          MINIMAX_MODEL: 'MiniMax-M2'
        },
        timeout: 185000
      }
    )

    const cleanOutput = stdout.replace(/\x1b\[[0-9;]*m/g, '').trim()

    res.json({
      success: true,
      result: cleanOutput,
      filePath: filePath.replace('.ts', `.test.${testFramework === 'jest' ? 'ts' : 'js'}`)
    })

  } catch (error: any) {
    console.error('❌ [MiniAgent] 测试生成失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '测试生成失败'
    })
  }
})

/**
 * GET /api/agent/status
 * 检查服务状态
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // 检查 mini-agent 是否可用
    const { stdout } = await execAsync('which mini-agent', {
      env: { ...process.env, PATH: '/home/clp2001/.local/bin:/usr/local/bin:/usr/bin:/bin' }
    })

    res.json({
      success: true,
      status: 'ready',
      agent_path: stdout.trim(),
      workspace: WORKSPACE_DIR
    })
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'not_ready',
      error: 'Mini-Agent 未正确安装'
    })
  }
})

export default router
