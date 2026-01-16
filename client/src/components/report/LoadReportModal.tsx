import { useEffect, useState, useMemo } from 'react'
import { Modal, Table, Text, Group, Stack, ActionIcon, Tooltip, Button } from '@mantine/core'
import { IconFileText, IconTrash, IconX } from '@tabler/icons-react'
import { reportApi } from '@/lib/api'

interface LoadReportModalProps {
  opened: boolean
  onClose: () => void
  onLoadReport: (reportContent: string, reportId: string) => void
  projectId: string
}

interface ReportItem {
  id: string
  report_title: string
  generation_status: string
  created_at: string
}

export function LoadReportModal({
  opened,
  onClose,
  onLoadReport,
  projectId
}: LoadReportModalProps) {
  const [reports, setReports] = useState<ReportItem[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<ReportItem | null>(null)

  // 加载报告列表
  useEffect(() => {
    if (opened) {
      loadReports()
    }
  }, [opened])

  const loadReports = async () => {
    setLoading(true)
    try {
      const response = await reportApi.getRecentCompletedReports(projectId)
      console.log('[LoadReportModal] API响应:', response)
      const resp = response as any
      if (resp.success) {
        // 后端返回 { success: true, reports: [...] }
        const reportsData = resp.reports || resp.data?.reports || []
        console.log('[LoadReportModal] 加载到报告数量:', reportsData.length)
        setReports(reportsData)
      } else {
        console.log('[LoadReportModal] API返回失败:', resp.error)
        setReports([])
      }
    } catch (error) {
      console.error('加载报告列表失败:', error)
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  // 处理加载报告 - 关闭Modal并加载内容
  const handleLoad = async (report: ReportItem) => {
    console.log('[LoadReportModal] 开始加载报告:', report.id)
    try {
      const response = await reportApi.getById(report.id)
      console.log('[LoadReportModal] API响应类型:', typeof response)
      console.log('[LoadReportModal] API响应:', JSON.stringify(response, null, 2))
      
      const resp = response as any
      console.log('[LoadReportModal] resp.success:', resp.success)
      console.log('[LoadReportModal] resp.report:', resp.report)
      console.log('[LoadReportModal] resp.data:', resp.data)
      
      // 优先使用 resp.report（后端直接返回 report 对象）
      if (resp.success && resp.report) {
        console.log('[LoadReportModal] 使用 resp.report 结构')
        const reportContent = resp.report.report_content
        console.log('[LoadReportModal] 报告内容长度:', reportContent?.length || 0)
        console.log('[LoadReportModal] 报告内容前100字符:', reportContent?.substring(0, 100))
        onClose()
        onLoadReport(reportContent, report.id)
      } 
      // 兼容 resp.data.report 结构
      else if (resp.success && resp.data?.report) {
        console.log('[LoadReportModal] 使用 resp.data.report 结构')
        onClose()
        onLoadReport(resp.data.report.report_content, report.id)
      } else {
        console.error('[LoadReportModal] 加载报告失败:', resp.error)
        alert('加载报告失败: ' + (resp.error || '未知错误'))
      }
    } catch (error) {
      console.error('[LoadReportModal] 加载报告异常:', error)
      alert('加载报告异常: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  // 处理删除报告 - 打开确认弹窗
  const handleDeleteClick = (report: ReportItem) => {
    setReportToDelete(report)
    setDeleteConfirmOpened(true)
  }

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!reportToDelete) return

    try {
      const response = await reportApi.deleteReport(reportToDelete.id)
      if (response.success) {
        // 从列表中移除，使用函数式更新
        setReports(prev => prev.filter(r => r.id !== reportToDelete.id))
      }
    } catch (error) {
      console.error('删除报告失败:', error)
    } finally {
      setDeleteConfirmOpened(false)
      setReportToDelete(null)
    }
  }

  // 使用useMemo缓存表格数据，避免重复计算
  const tableData = useMemo(() => {
    return reports.map((report, index) => ({
      ...report,
      index: index + 1,
      formattedDate: new Date(report.created_at).toLocaleString('zh-CN')
    }))
  }, [reports])

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title="加载历史报告"
        size="lg"
      >
        <Stack gap="md">
          {loading ? (
            <Text>加载中...</Text>
          ) : tableData.length === 0 ? (
            <Text c="dimmed">暂无已完成的报告</Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '60px', textAlign: 'center' }}>序号</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>日期</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>标题</Table.Th>
                  <Table.Th style={{ width: '120px', textAlign: 'center' }}>操作</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {tableData.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td style={{ textAlign: 'center' }}>{item.index}</Table.Td>
                    <Table.Td style={{ textAlign: 'center' }}>{item.formattedDate}</Table.Td>
                    <Table.Td style={{ textAlign: 'center' }}>{item.report_title}</Table.Td>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Group gap="xs" justify="center">
                        {/* 加载按钮 - 关闭Modal并加载报告内容 */}
                        <Tooltip label="加载此报告">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => handleLoad(item)}
                          >
                            <IconFileText size={16} />
                          </ActionIcon>
                        </Tooltip>
                        {/* 删除按钮 */}
                        <Tooltip label="删除报告">
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => handleDeleteClick(item)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        opened={deleteConfirmOpened}
        onClose={() => setDeleteConfirmOpened(false)}
        title="确认删除"
        size="sm"
      >
        <Stack gap="md">
          <Text>确定要删除报告「{reportToDelete?.report_title}」吗？此操作不可撤销。</Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconX size={16} />}
              onClick={() => setDeleteConfirmOpened(false)}
            >
              取消
            </Button>
            <Button
              variant="filled"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={handleConfirmDelete}
            >
              删除
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}

export default LoadReportModal
