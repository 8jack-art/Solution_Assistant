import { Response } from 'express'

/**
 * SSE连接管理器
 * 用于管理多个SSE连接，实现真正的实时推送
 */
class SSEManager {
  private connections: Map<string, Response> = new Map()
  private contentBuffer: Map<string, string> = new Map()
  private flushIntervals: Map<string, NodeJS.Timeout> = new Map()

  /**
   * 注册一个新的SSE连接
   */
  register(reportId: string, res: Response): void {
    // 清除现有的连接
    this.unregister(reportId)

    console.log(`[SSE Manager] 注册新连接，报告ID: ${reportId}`)
    this.connections.set(reportId, res)
    this.contentBuffer.set(reportId, '')

    // 发送初始状态
    this.send(reportId, {
      type: 'status',
      status: 'generating',
      content: '',
      progress: 0
    })

    // 设置定时器，每100ms刷新一次内容到前端（实现平滑的流式效果）
    const interval = setInterval(() => {
      this.flushContent(reportId)
    }, 100) as unknown as NodeJS.Timeout

    this.flushIntervals.set(reportId, interval)

    // 设置连接关闭处理
    res.on('close', () => {
      this.unregister(reportId)
    })
  }

  /**
   * 取消注册SSE连接
   */
  unregister(reportId: string): void {
    console.log(`[SSE Manager] 取消连接，报告ID: ${reportId}`)

    // 清除定时器
    const interval = this.flushIntervals.get(reportId)
    if (interval) {
      clearInterval(interval)
      this.flushIntervals.delete(reportId)
    }

    // 刷新剩余内容
    this.flushContent(reportId)

    // 关闭连接
    const res = this.connections.get(reportId)
    if (res) {
      try {
        res.end()
      } catch (e) {
        // 连接可能已关闭
      }
      this.connections.delete(reportId)
    }

    // 清除缓冲区
    this.contentBuffer.delete(reportId)
  }

  /**
   * 发送数据到前端
   */
  send(reportId: string, data: any): void {
    const res = this.connections.get(reportId)
    if (!res || res.writableEnded) {
      return
    }

    try {
      const message = `data: ${JSON.stringify(data)}\n\n`
      res.write(message)
    } catch (e) {
      console.error(`[SSE Manager] 发送数据失败: ${e}`)
      this.unregister(reportId)
    }
  }

  /**
   * 追加内容到缓冲区
   */
  appendContent(reportId: string, content: string): void {
    const buffer = this.contentBuffer.get(reportId)
    if (buffer !== undefined) {
      this.contentBuffer.set(reportId, buffer + content)
    }
  }

  /**
   * 刷新内容到前端
   */
  private flushContent(reportId: string): void {
    const content = this.contentBuffer.get(reportId)
    if (!content) return

    const res = this.connections.get(reportId)
    if (!res || res.writableEnded) {
      return
    }

    // 发送内容更新
    this.send(reportId, {
      type: 'content',
      status: 'generating',
      content: content,
      progress: content.length
    })

    // 清空缓冲区
    this.contentBuffer.set(reportId, '')
  }

  /**
   * 标记报告生成完成
   */
  complete(reportId: string, finalContent: string): void {
    // 刷新最终内容
    this.contentBuffer.set(reportId, finalContent)
    this.flushContent(reportId)

    // 发送完成事件
    this.send(reportId, {
      type: 'completed',
      status: 'completed',
      content: finalContent,
      progress: finalContent.length
    })

    // 清理连接
    setTimeout(() => {
      this.unregister(reportId)
    }, 1000) // 延迟清理，让完成消息能够发送
  }

  /**
   * 标记报告生成失败
   */
  fail(reportId: string, error: string): void {
    this.send(reportId, {
      type: 'error',
      status: 'failed',
      error: error
    })

    // 清理连接
    setTimeout(() => {
      this.unregister(reportId)
    }, 1000)
  }

  /**
   * 获取连接状态
   */
  isConnected(reportId: string): boolean {
    return this.connections.has(reportId)
  }

  /**
   * 获取活跃连接数量
   */
  getConnectionCount(): number {
    return this.connections.size
  }
}

// 导出单例
export const sseManager = new SSEManager()
