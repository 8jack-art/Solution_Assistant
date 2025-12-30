import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AppShell,
  Text,
  Button,
  Group,
  Stack,
  Badge,
  UnstyledButton,
  ScrollArea,
  ThemeIcon,
  ActionIcon,
  Tooltip,
  LoadingOverlay,
  Paper,
} from '@mantine/core'
import {
  IconSettings,
  IconPlus,
  IconRefresh,
  IconChevronRight,
  IconCheck,
  IconTrendingUp,
  IconArrowLeft,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import '@/styles/llm-config-modern.css'

// 导入现代化组件
import ModernLLMConfigWizard from './ModernLLMConfigWizard'
import ModernConfigList from './ModernConfigList'

// 类型定义
interface LLMConfig {
  id: string
  name: string
  provider: string
  model: string
  base_url: string
  api_key: string
  is_default: boolean
  is_admin: boolean
  user_id: string
  status: 'active' | 'inactive' | 'testing' | 'error'
  last_tested?: string
  created_at: string
  usage_count: number
}

interface SystemStats {
  totalConfigs: number
  activeConfigs: number
  defaultConfigs: number
  providersCount: number
  recentTests: number
  successRate: number
}

// 导航项类型
interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  badge?: string | number
  color: string
  action: () => void
}

// 主要组件
const ModernLLMConfigSystem: React.FC = () => {
  const navigate = useNavigate()
  const [currentView, setCurrentView] = useState<'list' | 'wizard' | 'analytics'>('list')
  const [configs, setConfigs] = useState<LLMConfig[]>([])
  const [stats, setStats] = useState<SystemStats>({
    totalConfigs: 0,
    activeConfigs: 0,
    defaultConfigs: 0,
    providersCount: 0,
    recentTests: 0,
    successRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // 模拟数据加载
  useEffect(() => {
    loadConfigs()
  }, [])

  useEffect(() => {
    loadStats()
  }, [configs])

  const loadConfigs = async () => {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockConfigs: LLMConfig[] = [
        {
          id: '1',
          name: '生产环境-文本生成',
          provider: '百炼(阿里)',
          model: 'qwen-plus',
          base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          api_key: 'sk-***',
          is_default: true,
          is_admin: false,
          user_id: 'user1',
          status: 'active',
          last_tested: '2024-01-15T10:30:00Z',
          created_at: '2024-01-10T09:00:00Z',
          usage_count: 156,
        },
        {
          id: '2',
          name: '开发环境-代码生成',
          provider: '智谱AI',
          model: 'glm-4.5-flash',
          base_url: 'https://open.bigmodel.cn/api/paas/v4',
          api_key: '***',
          is_default: false,
          is_admin: false,
          user_id: 'user1',
          status: 'testing',
          last_tested: '2024-01-15T11:15:00Z',
          created_at: '2024-01-12T14:30:00Z',
          usage_count: 23,
        },
        {
          id: '3',
          name: '实验模型-多语言',
          provider: '硅基流动',
          model: 'Qwen/Qwen2.5-72B-Instruct',
          base_url: 'https://api.siliconflow.cn/v1',
          api_key: '***',
          is_default: false,
          is_admin: false,
          user_id: 'user1',
          status: 'active',
          last_tested: '2024-01-14T16:45:00Z',
          created_at: '2024-01-08T11:20:00Z',
          usage_count: 89,
        },
      ]
      
      setConfigs(mockConfigs)
    } catch (error) {
      notifications.show({
        title: '加载失败',
        message: '无法加载配置列表，请重试',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = () => {
    const totalConfigs = configs.length
    const activeConfigs = configs.filter(c => c.status === 'active').length
    const defaultConfigs = configs.filter(c => c.is_default).length
    const providersCount = new Set(configs.map(c => c.provider)).size
    
    setStats({
      totalConfigs,
      activeConfigs,
      defaultConfigs,
      providersCount,
      recentTests: 12,
      successRate: 92.5,
    })
  }

  // 刷新数据
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadConfigs()
    setRefreshing(false)
    
    notifications.show({
      title: '刷新完成',
      message: '数据已更新',
      color: 'green',
      icon: <IconCheck size={16} />,
    })
  }

  // 配置操作处理
  const handleConfigComplete = async (configData: any) => {
    try {
      const newConfig: LLMConfig = {
        id: Date.now().toString(),
        ...configData,
        status: 'active',
        created_at: new Date().toISOString(),
        usage_count: 0,
        is_admin: false,
        user_id: 'user1',
      }
      
      setConfigs(prev => [...prev, newConfig])
      setCurrentView('list')
      
      notifications.show({
        title: '配置创建成功',
        message: 'LLM配置已成功创建并可以开始使用',
        color: 'green',
      })
    } catch (error) {
      notifications.show({
        title: '创建失败',
        message: '创建配置时发生错误，请重试',
        color: 'red',
      })
    }
  }

  const handleEdit = (config: LLMConfig) => {
    notifications.show({
      title: '编辑配置',
      message: `编辑配置: ${config.name}`,
      color: 'blue',
    })
  }

  const handleDelete = (config: LLMConfig) => {
    setConfigs(prev => prev.filter(c => c.id !== config.id))
    notifications.show({
      title: '配置已删除',
      message: `配置 "${config.name}" 已成功删除`,
      color: 'green',
    })
  }

  const handleSetDefault = (config: LLMConfig) => {
    setConfigs(prev => prev.map(c => ({
      ...c,
      is_default: c.id === config.id
    })))
    notifications.show({
      title: '默认配置已设置',
      message: `"${config.name}" 已被设为默认配置`,
      color: 'green',
    })
  }

  const handleTest = (config: LLMConfig) => {
    setConfigs(prev => prev.map(c => 
      c.id === config.id ? { ...c, status: 'testing' as const } : c
    ))
    
    setTimeout(() => {
      const success = Math.random() > 0.2
      setConfigs(prev => prev.map(c => 
        c.id === config.id ? { 
          ...c, 
          status: success ? 'active' as const : 'error' as const,
          last_tested: new Date().toISOString()
        } : c
      ))
      
      notifications.show({
        title: success ? '测试成功' : '测试失败',
        message: success 
          ? `配置 "${config.name}" 连接正常`
          : `配置 "${config.name}" 连接失败，请检查设置`,
        color: success ? 'green' : 'red',
      })
    }, 3000)
  }

  // 导航项配置
  const navItems: NavItem[] = [
    {
      id: 'list',
      label: '配置列表',
      icon: <IconSettings size={20} />,
      badge: configs.length.toString(),
      color: 'blue',
      action: () => setCurrentView('list'),
    },
    {
      id: 'wizard',
      label: '新建配置',
      icon: <IconPlus size={20} />,
      color: 'green',
      action: () => setCurrentView('wizard'),
    },
    {
      id: 'analytics',
      label: '使用统计',
      icon: <IconTrendingUp size={20} />,
      color: 'purple',
      action: () => setCurrentView('analytics'),
    },
  ]

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{ width: 280, breakpoint: 'sm' }}
      padding="md"
      className="modern-llm-system"
    >
      {/* Header */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Tooltip label="返回主界面">
              <ActionIcon
                variant="light"
                size="lg"
                onClick={() => navigate('/dashboard')}
              >
                <IconArrowLeft size={18} />
              </ActionIcon>
            </Tooltip>
            <ThemeIcon size="xl" radius="md" variant="gradient" gradient={{ from: 'blue', to: 'purple' }}>
              <IconSettings size={24} />
            </ThemeIcon>
            <div>
              <Text size="xl" fw={700}>
                LLM配置中心
              </Text>
              <Text size="sm" c="dimmed">
                现代化AI模型配置管理平台
              </Text>
            </div>
          </Group>
          
          <Group>
            <Tooltip label="刷新数据">
              <ActionIcon
                variant="light"
                size="lg"
                onClick={handleRefresh}
                loading={refreshing}
              >
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      {/* Sidebar */}
      <AppShell.Navbar p="md">
        <AppShell.Section grow my="md" component={ScrollArea}>
          <Stack gap="xs">
            {navItems.map((item) => (
              <UnstyledButton
                key={item.id}
                onClick={item.action}
                p="md"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  borderRadius: '8px',
                  backgroundColor: currentView === item.id ? `var(--mantine-color-${item.color}-0)` : 'transparent',
                  color: currentView === item.id ? `var(--mantine-color-${item.color}-6)` : 'var(--mantine-color-gray-7)',
                }}
              >
                <Group justify="space-between" style={{ width: '100%' }}>
                  <Group gap="sm">
                    <ThemeIcon
                      size="md"
                      variant={currentView === item.id ? 'filled' : 'light'}
                      color={item.color}
                    >
                      {item.icon}
                    </ThemeIcon>
                    <Text fw={500}>{item.label}</Text>
                  </Group>
                  
                  <Group gap="xs">
                    {item.badge && (
                      <Badge
                        size="sm"
                        variant="filled"
                        color={currentView === item.id ? item.color : 'gray'}
                      >
                        {item.badge}
                      </Badge>
                    )}
                    <IconChevronRight size={14} />
                  </Group>
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        </AppShell.Section>

        {/* 快速统计 */}
        <AppShell.Section>
          <Paper p="md" radius="md" withBorder>
            <Text size="sm" fw={600} mb="sm">
              快速概览
            </Text>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="xs" c="dimmed">总配置</Text>
                <Text size="sm" fw={600}>{stats.totalConfigs}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">活跃</Text>
                <Badge size="xs" color="green" variant="light">
                  {stats.activeConfigs}
                </Badge>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">成功率</Text>
                <Text size="sm" fw={600}>{stats.successRate}%</Text>
              </Group>
            </Stack>
          </Paper>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* Main Content */}
      <AppShell.Main>
        <LoadingOverlay visible={loading} />
        
        <AnimatePresence mode="wait">
          {currentView === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ModernConfigList
                configs={configs}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
                onTest={handleTest}
                onCreateNew={() => setCurrentView('wizard')}
                loading={loading}
              />
            </motion.div>
          )}

          {currentView === 'wizard' && (
            <motion.div
              key="wizard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ModernLLMConfigWizard
                onComplete={handleConfigComplete}
                onCancel={() => setCurrentView('list')}
              />
            </motion.div>
          )}

          {currentView === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <AnalyticsView stats={stats} configs={configs} />
            </motion.div>
          )}
        </AnimatePresence>
      </AppShell.Main>
    </AppShell>
  )
}

// 分析视图组件
const AnalyticsView: React.FC<{ stats: SystemStats; configs: LLMConfig[] }> = ({
  stats,
  configs,
}) => {
  return (
    <div style={{ padding: '24px' }}>
      <Group justify="space-between" mb="xl">
        <div>
          <Text size="xl" fw={700} mb="xs">
            使用统计
          </Text>
          <Text c="dimmed">
            查看LLM配置的使用情况和性能指标
          </Text>
        </div>
      </Group>

      <Stack gap="lg">
        {/* 统计卡片 */}
        <Group grow>
          <Paper p="lg" radius="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">总配置数</Text>
                <Text size="2xl" fw={700}>{stats.totalConfigs}</Text>
              </div>
              <ThemeIcon size="xl" variant="light" color="blue">
                <IconSettings size={24} />
              </ThemeIcon>
            </Group>
          </Paper>

          <Paper p="lg" radius="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">活跃配置</Text>
                <Text size="2xl" fw={700} c="green">{stats.activeConfigs}</Text>
              </div>
              <ThemeIcon size="xl" variant="light" color="green">
                <IconCheck size={24} />
              </ThemeIcon>
            </Group>
          </Paper>

          <Paper p="lg" radius="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">成功率</Text>
                <Text size="2xl" fw={700} c="blue">{stats.successRate}%</Text>
              </div>
              <ThemeIcon size="xl" variant="light" color="blue">
                <IconTrendingUp size={24} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Group>

        {/* 配置详情列表 */}
        <Paper p="lg" radius="md" withBorder>
          <Text size="lg" fw={600} mb="md">配置详情</Text>
          <Stack gap="sm">
            {configs.map((config) => (
              <Group key={config.id} justify="space-between" p="sm" style={{ borderRadius: 8, backgroundColor: '#f8f9fa' }}>
                <Group>
                  <ThemeIcon size="sm" variant="light" color="blue">
                    <IconSettings size={14} />
                  </ThemeIcon>
                  <div>
                    <Text fw={500}>{config.name}</Text>
                    <Text size="sm" c="dimmed">{config.provider} • {config.model}</Text>
                  </div>
                </Group>
                <Group>
                  <Badge
                    size="sm"
                    color={config.status === 'active' ? 'green' : config.status === 'testing' ? 'blue' : 'red'}
                    variant="light"
                  >
                    {config.status === 'active' ? '活跃' : config.status === 'testing' ? '测试中' : '错误'}
                  </Badge>
                  <Text size="sm" c="dimmed">
                    使用 {config.usage_count} 次
                  </Text>
                </Group>
              </Group>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </div>
  )
}

export default ModernLLMConfigSystem
