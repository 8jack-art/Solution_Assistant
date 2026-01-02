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
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { projectApi, InvestmentProject } from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import UserProfile from '@/components/UserProfile'
import { Header } from '@/components/common/Header'

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<InvestmentProject[]>([])
  const [loading, setLoading] = useState(true)
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
            <Button
              variant="light"
              onClick={() => navigate('/llm-configs')}
              style={{
                height: '36px',
                borderRadius: '6px',
                color: '#1D2129',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E7F5FF'
                e.currentTarget.style.color = '#1E6FFF'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#1D2129'
              }}
            >
              🤖 LLM配置
            </Button>
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
            <Group justify="space-between">
              <div>
                <Title order={4} c="#1D2129" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>快速操作</Title>
                <Text size="xs" c="#86909C" style={{ fontSize: '12px' }}>常用功能入口</Text>
              </div>
              <Group gap="sm">
                <Button 
                  onClick={() => navigate('/project/new')} 
                  leftSection={<Box style={{ fontSize: '16px' }}>➕</Box>}
                  style={{ 
                    height: '40px', 
                    backgroundColor: '#1E6FFF', 
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    padding: '0 24px',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(30, 111, 255, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  新建项目
                </Button>
              </Group>
            </Group>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: '#E5E6EB', backgroundColor: '#FFFFFF' }}>
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Title order={4} c="#1D2129" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>项目列表</Title>
                  <Text size="xs" c="#86909C" style={{ fontSize: '12px' }}>共 {projects.length} 个项目</Text>
                </div>
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
                          <Table.Th style={{ color: '#1D2129', fontWeight: 600, fontSize: '14px', padding: '16px' }}>总投资</Table.Th>
                          <Table.Th style={{ color: '#1D2129', fontWeight: 600, fontSize: '14px', padding: '16px' }}>用地模式</Table.Th>
                          <Table.Th style={{ color: '#1D2129', fontWeight: 600, fontSize: '14px', padding: '16px' }}>状态</Table.Th>
                          <Table.Th style={{ color: '#1D2129', fontWeight: 600, fontSize: '14px', padding: '16px' }}>创建时间</Table.Th>
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
                            <Table.Td style={{ color: '#1E6FFF', fontWeight: 600, fontSize: '14px', padding: '16px' }}>
                              {formatCurrency(project.total_investment)}
                            </Table.Td>
                            <Table.Td style={{ padding: '16px' }}>
                              <Badge size="sm" radius="sm" color="gray" variant="light">
                                {project.land_mode === 'A' ? '一次性征地' : 
                                 project.land_mode === 'B' ? '长期租赁' :
                                 project.land_mode === 'C' ? '无土地需求' : '混合用地'}
                              </Badge>
                            </Table.Td>
                            <Table.Td style={{ padding: '16px' }}>
                              <Group gap="xs">
                                <Badge
                                  color={project.status === 'completed' ? '#00C48C' : '#FFA940'}
                                  size="sm"
                                  radius="sm"
                                >
                                  {project.status === 'completed' ? '✓ 已完成' : '📝 草稿'}
                                </Badge>
                                {project.is_locked && (
                                  <Badge color="#F5455C" size="sm" radius="sm">🔒 已锁定</Badge>
                                )}
                              </Group>
                            </Table.Td>
                            <Table.Td style={{ color: '#86909C', fontSize: '13px', padding: '16px' }}>
                              {formatDateTime(project.created_at)}
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
    </div>
  )
}

export default Dashboard
