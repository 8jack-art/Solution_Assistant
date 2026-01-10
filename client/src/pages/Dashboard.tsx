import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Badge,
  Table,
  Card,
  Loader,
  Center,
  Box,
  ScrollArea,
  ThemeIcon,
  SimpleGrid,
  Divider,
  RingProgress,
  ActionIcon,
  Modal,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Trash } from 'lucide-react'
import { projectApi, InvestmentProject } from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { getProjectUpdateTime } from '@/lib/projectUpdateTime'
import UserProfile from '@/components/UserProfile'
import { Header } from '@/components/common/Header'

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<InvestmentProject[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<InvestmentProject | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const response = await projectApi.getByUserId()
      if (response.success && response.data?.projects) {
        setProjects(response.data.projects)
      } else {
        notifications.show({
          title: '加载失败',
          message: response.error || '加载项目列表失败',
          color: 'red',
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '加载失败',
        message: error.response?.data?.error || '加载项目列表失败',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProject = (project: InvestmentProject) => {
    setProjectToDelete(project)
    setDeleteModalOpen(true)
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return
    
    try {
      const response = await projectApi.delete(projectToDelete.id)
      if (response.success) {
        notifications.show({
          title: '删除成功',
          message: `项目 "${projectToDelete.project_name}" 已删除`,
          color: 'green',
        })
        // 从列表中移除该项目
        setProjects(projects.filter(p => p.id !== projectToDelete.id))
        setDeleteModalOpen(false)
        setProjectToDelete(null)
      } else {
        notifications.show({
          title: '删除失败',
          message: response.error || '删除项目失败',
          color: 'red',
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '删除失败',
        message: error.response?.data?.error || '删除项目失败',
        color: 'red',
      })
    }
  }

  const getUser = () => {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }

  const user = getUser()

  const statistics = useMemo(() => {
    const totalProjects = projects.length
    const completedProjects = projects.filter(p => p.status === 'completed').length
    const draftProjects = projects.filter(p => p.status === 'draft').length
    const lockedProjects = projects.filter(p => p.is_locked).length
    const totalInvestment = projects.reduce((sum, p) => sum + (Number(p.total_investment) || 0), 0)
    const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0
    const recentProjects = projects.filter(p => {
      const createdDate = new Date(p.created_at)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return createdDate > thirtyDaysAgo
    }).length

    return {
      totalProjects,
      completedProjects,
      draftProjects,
      lockedProjects,
      totalInvestment,
      completionRate,
      recentProjects
    }
  }, [projects])

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" />
      </Center>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F7FA' }}>
      {/* Header */}
      <Header
        title="投资项目管理系统"
        subtitle="Investment Project Management System"
        icon="🏠"
        showBackButton={false}
        rightContent={
          <Group gap="md">
            {user && <UserProfile user={user} />}
          </Group>
        }
      />

      <Container size="xl" py="xl" px="lg" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <Stack gap="xl">
          <SimpleGrid cols={{ base: 1, md: 4 }} spacing="lg">
            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB', backgroundColor: '#FFFFFF', transition: 'all 0.2s ease', cursor: 'default' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}
            >
              <Group justify="space-between" mb="md">
                <div>
                  <Text size="xs" c="#86909C" style={{ fontSize: '12px', marginBottom: '4px' }}>总项目数</Text>
                  <Text size="xl" fw={700} c="#1D2129" style={{ fontSize: '32px' }}>{statistics.totalProjects}</Text>
                </div>
                <ThemeIcon size={56} radius="md" style={{ backgroundColor: '#EBF4FF' }}>
                  <Box style={{ fontSize: '28px' }}>📊</Box>
                </ThemeIcon>
              </Group>
              <Text size="xs" c="#86909C" style={{ fontSize: '12px' }}>
                <span style={{ color: '#00C48C', fontWeight: 600 }}>+{statistics.recentProjects}</span> 近30天新增
              </Text>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB', backgroundColor: '#FFFFFF', transition: 'all 0.2s ease', cursor: 'default' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}
            >
              <Group justify="space-between" mb="md">
                <div>
                  <Text size="xs" c="#86909C" style={{ fontSize: '12px', marginBottom: '4px' }}>总投资额</Text>
                  <Text size="xl" fw={700} c="#1D2129" style={{ fontSize: '28px' }}>
                    {statistics.totalInvestment >= 10000 ? `${(statistics.totalInvestment / 10000).toFixed(1)}亿` : `${statistics.totalInvestment.toFixed(0)}万`}
                  </Text>
                </div>
                <ThemeIcon size={56} radius="md" style={{ backgroundColor: '#E6FFF9' }}>
                  <Box style={{ fontSize: '28px' }}>💰</Box>
                </ThemeIcon>
              </Group>
              <Text size="xs" c="#86909C" style={{ fontSize: '12px' }}>累计投资金额</Text>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB', backgroundColor: '#FFFFFF', transition: 'all 0.2s ease', cursor: 'default' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}
            >
              <Group justify="space-between" mb="md">
                <div>
                  <Text size="xs" c="#86909C" style={{ fontSize: '12px', marginBottom: '4px' }}>已完成</Text>
                  <Group gap="xs" align="baseline">
                    <Text size="xl" fw={700} c="#00C48C" style={{ fontSize: '32px' }}>{statistics.completedProjects}</Text>
                    <Text size="sm" c="#86909C" style={{ fontSize: '14px' }}>/{statistics.totalProjects}</Text>
                  </Group>
                </div>
                <RingProgress
                  size={56}
                  thickness={6}
                  sections={[{ value: statistics.completionRate, color: '#00C48C' }]}
                  label={
                    <Text size="xs" ta="center" fw={600} c="#00C48C" style={{ fontSize: '12px' }}>
                      {statistics.completionRate}%
                    </Text>
                  }
                />
              </Group>
              <Text size="xs" c="#86909C" style={{ fontSize: '12px' }}>项目完成率 {statistics.completionRate}%</Text>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB', backgroundColor: '#FFFFFF', transition: 'all 0.2s ease', cursor: 'default' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}
            >
              <Group justify="space-between" mb="md">
                <div>
                  <Text size="xs" c="#86909C" style={{ fontSize: '12px', marginBottom: '4px' }}>状态统计</Text>
                  <Group gap="md" mt="xs">
                    <div>
                      <Text size="lg" fw={700} c="#FFA940" style={{ fontSize: '24px' }}>{statistics.draftProjects}</Text>
                      <Text size="xs" c="#86909C" style={{ fontSize: '11px' }}>草稿</Text>
                    </div>
                    <Divider orientation="vertical" />
                    <div>
                      <Text size="lg" fw={700} c="#F5455C" style={{ fontSize: '24px' }}>{statistics.lockedProjects}</Text>
                      <Text size="xs" c="#86909C" style={{ fontSize: '11px' }}>锁定</Text>
                    </div>
                  </Group>
                </div>
                <ThemeIcon size={56} radius="md" style={{ backgroundColor: '#FFF7E6' }}>
                  <Box style={{ fontSize: '28px' }}>📋</Box>
                </ThemeIcon>
              </Group>
            </Card>
          </SimpleGrid>

          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB', backgroundColor: '#FFFFFF' }}>
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Title order={4} c="#1D2129" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>项目列表</Title>
                  <Text size="xs" c="#86909C" style={{ fontSize: '12px' }}>共 {projects.length} 个项目</Text>
                </div>
                <Button 
                  onClick={() => navigate('/project/new')} 
                  style={{ 
                    height: '32px', 
                    backgroundColor: '#1E6FFF', 
                    color: '#FFFFFF',
                    borderRadius: '4px',
                    padding: '0 16px',
                    fontSize: '14px',
                    fontFamily: 'SimHei, sans-serif',
                  }}
                >
                  新建项目
                </Button>
              </Group>

              {projects.length === 0 ? (
                <Stack align="center" gap="xl" py="xl">
                  <Box style={{ fontSize: '64px', opacity: 0.3 }}>📁</Box>
                  <div style={{ textAlign: 'center' }}>
                    <Text c="#1D2129" size="lg" fw={500} mb="xs">还没有项目</Text>
                    <Text c="#86909C" size="sm">开始创建您的第一个投资项目</Text>
                  </div>
                  <Button 
                    onClick={() => navigate('/project/new')} 
                    size="lg"
                    leftSection={<Box style={{ fontSize: '18px' }}>➕</Box>}
                    style={{ 
                      height: '48px', 
                      backgroundColor: '#1E6FFF', 
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      padding: '0 32px',
                      fontSize: '16px'
                    }}
                  >
                    创建第一个项目
                  </Button>
                </Stack>
              ) : (
                <>
                  <ScrollArea>
                    <Table 
                      highlightOnHover 
                      style={{ 
                        minWidth: 800,
                      }}
                    >
                      <Table.Thead style={{ backgroundColor: '#F5F7FA' }}>
                        <Table.Tr>
                          <Table.Th style={{ color: '#1D2129', fontWeight: 600, fontSize: '14px', padding: '16px' }}>项目名称</Table.Th>
                          <Table.Th style={{ color: '#1D2129', fontWeight: 600, fontSize: '14px', padding: '16px', textAlign: 'center' }}>总投资（万元）</Table.Th>
                          <Table.Th style={{ color: '#1D2129', fontWeight: 600, fontSize: '14px', padding: '16px', textAlign: 'center' }}>编制</Table.Th>
                          <Table.Th style={{ color: '#1D2129', fontWeight: 600, fontSize: '14px', padding: '16px', textAlign: 'center' }}>创建时间</Table.Th>
                          <Table.Th style={{ color: '#1D2129', fontWeight: 600, fontSize: '14px', padding: '16px', textAlign: 'center' }}>修改时间</Table.Th>
                          <Table.Th style={{ color: '#1D2129', fontWeight: 600, fontSize: '14px', padding: '16px', textAlign: 'center' }}>操作</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {projects.map((project) => (
                          <Table.Tr 
                            key={project.id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/project/${project.id}`)}
                          >
                            <Table.Td style={{ fontWeight: 500, color: '#1D2129', fontSize: '14px', padding: '16px' }}>
                              {project.project_name}
                            </Table.Td>
                            <Table.Td style={{ color: '#1E6FFF', fontWeight: 600, fontSize: '14px', padding: '16px', textAlign: 'center' }}>
                              {project.total_investment?.toLocaleString() || '0'}
                            </Table.Td>
                            <Table.Td style={{ color: '#1D2129', fontSize: '14px', padding: '16px', textAlign: 'center' }}>
                              {project.user_name || '-'}
                            </Table.Td>
                            <Table.Td style={{ color: '#86909C', fontSize: '13px', padding: '16px', textAlign: 'center' }}>
                              {formatDateTime(project.created_at)}
                            </Table.Td>
                            <Table.Td style={{ color: '#a67fe9ff', fontWeight: 600, fontSize: '13px', padding: '16px', textAlign: 'center' }}>
                              {formatDateTime(getProjectUpdateTime(project.id) || project.updated_at)}
                            </Table.Td>
                            <Table.Td style={{ padding: '16px' }} onClick={(e) => e.stopPropagation()}>
                              <Group gap="xs" justify="center">
                                <Button
                                  variant="light"
                                  size="xs"
                                  onClick={() => navigate(`/project/${project.id}`)}
                                  style={{ height: '32px', borderRadius: '4px', fontSize: '13px', color: '#1E6FFF' }}
                                >
                                  查看
                                </Button>
                                <Button
                                  variant="filled"
                                  size="xs"
                                  onClick={() => navigate(`/investment/${project.id}`, { state: { autoGenerate: false } })}
                                  style={{ height: '32px', borderRadius: '4px', fontSize: '13px', backgroundColor: '#00C48C' }}
                                >
                                  估算
                                </Button>
                                <ActionIcon
                                  variant="light"
                                  color="red"
                                  size="lg"
                                  radius="md"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteProject(project)
                                  }}
                                  style={{
                                    height: '32px',
                                    width: '32px',
                                    borderRadius: '4px',
                                  }}
                                  title="删除项目"
                                >
                                  <Trash size={18} />
                                </ActionIcon>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                </>
              )}

            </Stack>
          </Card>
        </Stack>
      </Container>
      
      {/* 删除确认Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="删除项目"
        centered
        size="md"
      >
        <Text size="sm" mb="lg">
          确定要删除项目 "{projectToDelete?.project_name}" 吗？此操作不可恢复。
        </Text>
        <Group justify="flex-end" mt="md">
          <Button
            variant="outline"
            onClick={() => setDeleteModalOpen(false)}
          >
            取消
          </Button>
          <Button
            color="red"
            onClick={confirmDeleteProject}
          >
            删除
          </Button>
        </Group>
      </Modal>
    </div>
  )
}

export default Dashboard
