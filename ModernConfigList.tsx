import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Card,
  Badge,
  ActionIcon,
  Tooltip,
  Menu,
  TextInput,
  Select,
  Grid,
  Avatar,
  ThemeIcon,
  Progress,
  Alert,
  Modal,
  LoadingOverlay,
} from '@mantine/core'
import {
  IconSettings,
  IconFlame,
  IconTrash,
  IconEdit,
  IconStar,
  IconCopy,
  IconDots,
  IconSearch,
  IconFilter,
  IconPlus,
  IconRefresh,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconBrandPython,
  IconApi,
  IconExternalLink,
} from '@tabler/icons-react'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'

interface LLMConfig {
  id: string
  name: string
  provider: string
  model: string
  base_url: string
  is_default: boolean
  is_admin: boolean
  user_id: string
  status: 'active' | 'inactive' | 'testing' | 'error'
  last_tested?: string
  created_at: string
  usage_count: number
  avatar?: string
}

interface ModernConfigListProps {
  configs: LLMConfig[]
  onEdit: (config: LLMConfig) => void
  onDelete: (config: LLMConfig) => void
  onSetDefault: (config: LLMConfig) => void
  onTest: (config: LLMConfig) => void
  onCreateNew: () => void
  loading?: boolean
}

const ModernConfigList: React.FC<ModernConfigListProps> = ({
  configs,
  onEdit,
  onDelete,
  onSetDefault,
  onTest,
  onCreateNew,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterProvider, setFilterProvider] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'usage'>('created')
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false)
  const [deletingConfig, setDeletingConfig] = useState<LLMConfig | null>(null)

  // 获取唯一的服务商列表
  const providers = [...new Set(configs.map(config => config.provider))]

  // 过滤和排序配置
  const filteredConfigs = configs
    .filter(config => {
      const matchesSearch = config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           config.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           config.model.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesProvider = !filterProvider || config.provider === filterProvider
      return matchesSearch && matchesProvider
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'usage':
          return b.usage_count - a.usage_count
        case 'created':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  // 处理删除
  const handleDeleteClick = (config: LLMConfig) => {
    setDeletingConfig(config)
    openDeleteModal()
  }

  const confirmDelete = () => {
    if (deletingConfig) {
      onDelete(deletingConfig)
      closeDeleteModal()
      setDeletingConfig(null)
    }
  }

  return (
    <Container size="xl" py="xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Group justify="space-between" mb="xl">
          <div>
            <Group gap="sm" mb="xs">
              <ThemeIcon size={40} radius="md" variant="gradient" gradient={{ from: 'teal', to: 'blue' }}>
                <IconSettings size={24} />
              </ThemeIcon>
              <Title order={2} gradient={{ from: 'teal', to: 'blue', deg: 45 }}>
                LLM配置管理
              </Title>
            </Group>
            <Text c="dimmed" size="lg">
              管理和监控您的LLM服务配置
            </Text>
          </div>
          
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={onCreateNew}
            size="lg"
            gradient={{ from: 'blue', to: 'purple', deg: 45 }}
          >
            新建配置
          </Button>
        </Group>
      </motion.div>

      {/* 搜索和过滤栏 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Paper p="lg" radius="md" mb="lg" withBorder>
          <Group justify="space-between">
            <Group grow>
              <TextInput
                placeholder="搜索配置名称、服务商或模型..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              
              <Select
                placeholder="筛选服务商"
                leftSection={<IconFilter size={16} />}
                value={filterProvider}
                onChange={setFilterProvider}
                data={[
                  { value: '', label: '所有服务商' },
                  ...providers.map(provider => ({ value: provider, label: provider }))
                ]}
                clearable
                style={{ width: 200 }}
              />
              
              <Select
                placeholder="排序方式"
                value={sortBy}
                onChange={(value) => setSortBy(value as 'name' | 'created' | 'usage')}
                data={[
                  { value: 'created', label: '按创建时间' },
                  { value: 'name', label: '按名称' },
                  { value: 'usage', label: '按使用频率' },
                ]}
                style={{ width: 150 }}
              />
            </Group>
            
            <Tooltip label="刷新列表">
              <ActionIcon variant="light" size="lg">
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Paper>
      </motion.div>

      {/* 配置统计 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Grid mb="lg">
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card p="lg" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    总配置数
                  </Text>
                  <Text size="xl" fw={700}>
                    {configs.length}
                  </Text>
                </div>
                <ThemeIcon size="xl" variant="light" color="blue">
                  <IconSettings size={24} />
                </ThemeIcon>
              </Group>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card p="lg" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    默认配置
                  </Text>
                  <Text size="xl" fw={700}>
                    {configs.filter(c => c.is_default).length}
                  </Text>
                </div>
                <ThemeIcon size="xl" variant="light" color="green">
                  <IconStar size={24} />
                </ThemeIcon>
              </Group>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card p="lg" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    活跃配置
                  </Text>
                  <Text size="xl" fw={700}>
                    {configs.filter(c => c.status === 'active').length}
                  </Text>
                </div>
                <ThemeIcon size="xl" variant="light" color="teal">
                  <IconCheck size={24} />
                </ThemeIcon>
              </Group>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card p="lg" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    服务商数量
                  </Text>
                  <Text size="xl" fw={700}>
                    {providers.length}
                  </Text>
                </div>
                <ThemeIcon size="xl" variant="light" color="purple">
                  <IconBrandPython size={24} />
                </ThemeIcon>
              </Group>
            </Card>
          </Grid.Col>
        </Grid>
      </motion.div>

      {/* 配置列表 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {filteredConfigs.length === 0 ? (
          <Paper p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
            <ThemeIcon size={64} radius="xl" variant="light" color="gray" mx="auto" mb="md">
              <IconSettings size={32} />
            </ThemeIcon>
            <Title order={4} c="dimmed" mb="xs">
              {configs.length === 0 ? '还没有配置' : '没有找到匹配的配置'}
            </Title>
            <Text c="dimmed" mb="lg">
              {configs.length === 0 
                ? '创建您的第一个LLM配置开始使用AI功能'
                : '尝试调整搜索条件或过滤器'
              }
            </Text>
            {configs.length === 0 && (
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={onCreateNew}
                gradient={{ from: 'blue', to: 'purple', deg: 45 }}
              >
                创建第一个配置
              </Button>
            )}
          </Paper>
        ) : (
          <div className="config-grid">
            <AnimatePresence>
              {filteredConfigs.map((config, index) => (
                <ConfigCard
                  key={config.id}
                  config={config}
                  index={index}
                  onEdit={onEdit}
                  onDelete={() => handleDeleteClick(config)}
                  onSetDefault={onSetDefault}
                  onTest={onTest}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* 删除确认弹窗 */}
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="确认删除"
        centered
        size="sm"
      >
        <Stack gap="lg">
          <Alert
            icon={<IconAlertTriangle size={16} />}
            title="此操作不可恢复"
            color="red"
          >
            确定要删除配置 "{deletingConfig?.name}" 吗？此操作将永久删除该配置。
          </Alert>
          
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" onClick={closeDeleteModal}>
              取消
            </Button>
            <Button color="red" onClick={confirmDelete} leftSection={<IconTrash size={16} />}>
              删除
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}

// 配置卡片组件
interface ConfigCardProps {
  config: LLMConfig
  index: number
  onEdit: (config: LLMConfig) => void
  onDelete: () => void
  onSetDefault: (config: LLMConfig) => void
  onTest: (config: LLMConfig) => void
}

const ConfigCard: React.FC<ConfigCardProps> = ({
  config,
  index,
  onEdit,
  onDelete,
  onSetDefault,
  onTest,
}) => {
  const [isHovered, setIsHovered] = useState(false)

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { color: 'green', text: '正常', icon: <IconCheck size={14} /> }
      case 'testing':
        return { color: 'blue', text: '测试中', icon: <IconRefresh className="spinning" size={14} /> }
      case 'error':
        return { color: 'red', text: '错误', icon: <IconX size={14} /> }
      case 'inactive':
      default:
        return { color: 'gray', text: '未激活', icon: <IconX size={14} /> }
    }
  }

  const statusConfig = getStatusConfig(config.status)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card
        className={`config-card ${config.is_default ? 'is-default' : ''} status--${config.status}`}
        p="lg"
        radius="md"
        withBorder
        shadow={isHovered ? 'md' : 'sm'}
        style={{ 
          cursor: 'pointer',
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Stack gap="md">
          {/* 头部 */}
          <Group justify="space-between" align="flex-start">
            <Group gap="sm">
              <Avatar
                size="lg"
                radius="md"
                src={config.avatar}
                alt={config.name}
                gradient={{ from: 'blue', to: 'purple' }}
              >
                {config.name.charAt(0).toUpperCase()}
              </Avatar>
              
              <div>
                <Group gap="xs" mb={4}>
                  <Text fw={600} size="lg" lineClamp={1}>
                    {config.name}
                  </Text>
                  {config.is_default && (
                    <Badge color="blue" size="sm" variant="filled">
                      默认
                    </Badge>
                  )}
                  {config.is_admin && (
                    <Badge color="violet" size="sm" variant="light">
                      管理员
                    </Badge>
                  )}
                </Group>
                
                <Group gap="xs">
                  <Badge
                    color={statusConfig.color}
                    variant="light"
                    size="sm"
                    leftSection={statusConfig.icon}
                  >
                    {statusConfig.text}
                  </Badge>
                  
                  <Text size="xs" c="dimmed">
                    使用 {config.usage_count} 次
                  </Text>
                </Group>
              </div>
            </Group>
            
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDots size={16} />
                </ActionIcon>
              </Menu.Target>
              
              <Menu.Dropdown>
                <Menu.Label>操作</Menu.Label>
                <Menu.Item
                  leftSection={<IconFlame size={14} />}
                  onClick={(e) => {
                    e.stopPropagation()
                    onTest(config)
                  }}
                >
                  测试连接
                </Menu.Item>
                
                <Menu.Item
                  leftSection={<IconEdit size={14} />}
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(config)
                  }}
                >
                  编辑配置
                </Menu.Item>
                
                {!config.is_default && (
                  <Menu.Item
                    leftSection={<IconStar size={14} />}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSetDefault(config)
                    }}
                  >
                    设为默认
                  </Menu.Item>
                )}
                
                <Menu.Divider />
                
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                >
                  删除配置
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>

          {/* 配置详情 */}
          <div className="config-details">
            <Grid gutter="xs">
              <Grid.Col span={6}>
                <div className="detail-item">
                  <Text size="xs" c="dimmed" mb={4}>服务商</Text>
                  <Group gap="xs">
                    <ThemeIcon size={16} variant="light" color="blue">
                      <IconApi size={10} />
                    </ThemeIcon>
                    <Text size="sm" fw={500} lineClamp={1}>
                      {config.provider}
                    </Text>
                  </Group>
                </div>
              </Grid.Col>
              
              <Grid.Col span={6}>
                <div className="detail-item">
                  <Text size="xs" c="dimmed" mb={4}>模型</Text>
                  <Group gap="xs">
                    <ThemeIcon size={16} variant="light" color="purple">
                      <IconBrandPython size={10} />
                    </ThemeIcon>
                    <Text size="sm" fw={500} lineClamp={1} style={{ fontFamily: 'monospace' }}>
                      {config.model}
                    </Text>
                  </Group>
                </div>
              </Grid.Col>
            </Grid>
          </div>

          {/* 底部操作栏 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Group gap="xs" mt="md">
              <Button
                variant="light"
                size="xs"
                leftSection={<IconFlame size={12} />}
                onClick={(e) => {
                  e.stopPropagation()
                  onTest(config)
                }}
                disabled={config.status === 'testing'}
              >
                测试
              </Button>
              
              <Button
                variant="light"
                size="xs"
                leftSection={<IconEdit size={12} />}
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(config)
                }}
              >
                编辑
              </Button>
              
              {!config.is_default && (
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconStar size={12} />}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSetDefault(config)
                  }}
                >
                  默认
                </Button>
              )}
              
              <Button
                variant="subtle"
                color="red"
                size="xs"
                leftSection={<IconTrash size={12} />}
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
              >
                删除
              </Button>
            </Group>
          </motion.div>

          {/* 创建时间 */}
          <Text size="xs" c="dimmed" mt="xs">
            创建于 {new Date(config.created_at).toLocaleDateString()}
          </Text>
        </Stack>
      </Card>
    </motion.div>
  )
}

export default ModernConfigList