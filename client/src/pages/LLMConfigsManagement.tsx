import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { llmConfigApi } from '@/lib/api'
import { LLMConfig } from '@/types'
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  TextInput,
  PasswordInput,
  Select,
  Card,
  Group,
  Stack,
  Badge,
  Grid,
  Switch,
  Autocomplete,
  Modal,
  LoadingOverlay,
  Divider,
  ThemeIcon,
  Tooltip,
  ActionIcon,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useDisclosure } from '@mantine/hooks'
import {
  IconPlus,
  IconRefresh,
  IconCheck,
  IconX,
  IconTrash,
  IconEdit,
  IconSettings,
  IconApi,
  IconKey,
  IconLink,
  IconStar,
  IconCopy,
  IconAlertCircle,
  IconBrandPython,
  IconFlame,
} from '@tabler/icons-react'

interface LLMProvider {
  id: string
  name: string
  baseUrl: string
  defaultModel: string
  models: string[]
  recommendedModels?: string[]
}

interface FormErrors {
  name?: string
  provider?: string
  api_key?: string
  base_url?: string
  model?: string
}

const LLMConfigsManagement: React.FC = () => {
  const [configs, setConfigs] = useState<LLMConfig[]>([])
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    api_key: '',
    base_url: '',
    model: '',
    is_default: false,
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | null>(null)
  const [llmProviders, setLlmProviders] = useState<LLMProvider[]>([])
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false)
  const [deletingConfigId, setDeletingConfigId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: unknown } | null>(null)
  const navigate = useNavigate()
  
  // 获取当前用户信息
  const getCurrentUser = () => {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }
  const currentUser = getCurrentUser()

  // 加载服务商列表和配置
  useEffect(() => {
    loadProviders()
    loadConfigs()
  }, [])

  // 验证单个字段
  const validateField = useCallback((name: string, value: string): string => {
    switch (name) {
      case 'name':
        if (!value.trim()) return '配置名称不能为空'
        if (value.length < 2) return '配置名称至少2个字符'
        if (value.length > 50) return '配置名称不能超过50个字符'
        return ''
      case 'api_key':
        if (!value.trim()) return 'API密钥不能为空'
        if (value.length < 10) return 'API密钥格式不正确'
        return ''
      case 'base_url':
        if (!value.trim()) return '基础URL不能为空'
        try {
          new URL(value)
          return ''
        } catch {
          return '基础URL格式不正确'
        }
      case 'model':
        if (!value.trim()) return '模型名称不能为空'
        return ''
      default:
        return ''
    }
  }, [])

  // 检查重复配置
  const checkDuplicateConfig = useCallback((): boolean => {
    return configs.some(config => 
      config.provider === formData.provider &&
      config.base_url === formData.base_url &&
      config.model === formData.model &&
      config.id !== editingId
    )
  }, [configs, formData, editingId])

  // 加载服务商列表
  const loadProviders = async () => {
    setLoadingProviders(true)
    try {
      const response = await llmConfigApi.getProviders()
      if (response.success && response.data?.providers) {
        const providers = response.data.providers.map((provider: LLMProvider) => ({
          ...provider,
          recommendedModels: getRecommendedModels(provider.id)
        }))
        setLlmProviders([
          ...providers,
          {
            id: 'custom',
            name: '自定义服务商',
            baseUrl: '',
            defaultModel: '',
            models: [],
            recommendedModels: []
          }
        ])
      } else {
        console.error('加载服务商列表失败:', response.error)
      }
    } catch (error) {
      console.error('加载服务商列表失败:', error)
    } finally {
      setLoadingProviders(false)
    }
  }

  // 获取推荐模型列表
  const getRecommendedModels = (providerId: string): string[] => {
    const recommendedMap: Record<string, string[]> = {
      'bailian': ['qwen-plus', 'qwen-max', 'qwen-turbo', 'qwen2.5-72b-instruct'],
      'zhipuai': ['glm-4.5-flash', 'glm-4.6', 'glm-4-air'],
      'volcano': ['doubao-seed-1-6-251015', 'deepseek-v3-250324', 'doubao-pro-32k'],
      'siliconflow': ['deepseek-ai/DeepSeek-V3.2', 'Qwen/Qwen2.5-72B-Instruct'],
      'custom': []
    }
    return recommendedMap[providerId] || []
  }

  // 加载配置列表
  const loadConfigs = async () => {
    try {
      const response = await llmConfigApi.getByUserId()
      if (response.success && response.data?.configs) {
        setConfigs(response.data.configs)
      } else {
        notifications.show({
          title: '加载失败',
          message: response.error || '加载配置失败',
          color: 'red',
          icon: <IconX size={16} />,
        })
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '加载配置失败'
      notifications.show({
        title: '加载失败',
        message: errorMessage,
        color: 'red',
        icon: <IconX size={16} />,
      })
    }
  }

  // 表单字段变更处理
  const handleFieldChange = (name: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // 实时验证
    if (typeof value === 'string') {
      const error = validateField(name, value)
      setFormErrors(prev => ({ ...prev, [name]: error }))
    }
  }

  // 服务商变更处理
  const handleProviderChange = (providerId: string) => {
    const provider = llmProviders.find(p => p.id === providerId)
    setSelectedProvider(provider || null)
    
    if (provider) {
      // 配置名称格式：供应商 + 模型名称
      const autoName = provider.id === 'custom' ? '' : `${provider.name} - ${provider.defaultModel}`
      setFormData({
        ...formData,
        provider: provider.name,
        base_url: provider.baseUrl,
        model: provider.defaultModel,
        name: editingId ? formData.name : autoName,
      })
      
      // 清除相关字段错误
      setFormErrors(prev => ({
        ...prev,
        provider: undefined,
        base_url: undefined,
        model: undefined,
      }))
    }
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 验证所有字段
    const errors: FormErrors = {}
    let hasError = false
    
    Object.keys(formData).forEach(key => {
      if (key !== 'is_default') {
        const error = validateField(key, formData[key as keyof typeof formData] as string)
        if (error) {
          errors[key as keyof FormErrors] = error
          hasError = true
        }
      }
    })
    
    if (hasError) {
      setFormErrors(errors)
      notifications.show({
        title: '验证失败',
        message: '请检查表单中的错误信息',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      })
      return
    }

    // 检查重复配置
    if (checkDuplicateConfig()) {
      notifications.show({
        title: '配置重复',
        message: '已存在相同的配置（相同的服务商、URL和模型），请使用现有配置或修改后创建',
        color: 'yellow',
        icon: <IconAlertCircle size={16} />,
      })
      return
    }

    setLoading(true)

    try {
      let response
      if (editingId) {
        response = await llmConfigApi.update(editingId, formData)
      } else {
        response = await llmConfigApi.create(formData)
      }

      if (response.success) {
        notifications.show({
          title: editingId ? '配置更新成功' : '配置创建成功',
          message: editingId ? 'LLM配置已更新' : 'LLM配置已保存',
          color: 'green',
          icon: <IconCheck size={16} />,
        })
        resetForm()
        loadConfigs()
      } else {
        notifications.show({
          title: '保存失败',
          message: response.error || '保存配置失败',
          color: 'red',
          icon: <IconX size={16} />,
        })
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '保存配置失败'
      notifications.show({
        title: '保存失败',
        message: errorMessage,
        color: 'red',
        icon: <IconX size={16} />,
      })
    } finally {
      setLoading(false)
    }
  }

  // 测试连接
  const handleTest = async (config?: LLMConfig) => {
    setTestLoading(true)
    setTestResult(null)

    try {
      const testData = config || formData
      const response = await llmConfigApi.testConnection(testData)
      
      if (response.success) {
        setTestResult({
          success: true,
          message: '连接测试成功',
          details: response.data
        })
        notifications.show({
          title: '✅ 连接测试成功',
          message: (
            <div>
              <Text size="sm" mt="xs">LLM服务连接正常</Text>
              <Text size="xs" c="dimmed" mt={4}>
                服务商: {testData.provider} | 模型: {testData.model}
              </Text>
            </div>
          ),
          color: 'green',
          icon: <IconCheck size={16} />,
          autoClose: 5000,
        })
      } else {
        setTestResult({
          success: false,
          message: response.error || '连接测试失败',
          details: response.data
        })
        notifications.show({
          title: '❌ 连接测试失败',
          message: (
            <div>
              <Text size="sm" mt="xs">{response.error || '连接测试失败'}</Text>
            </div>
          ),
          color: 'red',
          icon: <IconX size={16} />,
          autoClose: false,
        })
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '测试失败'
      setTestResult({
        success: false,
        message: errorMessage,
      })
      notifications.show({
        title: '连接测试失败',
        message: errorMessage,
        color: 'red',
        icon: <IconX size={16} />,
      })
    } finally {
      setTestLoading(false)
    }
  }

  // 编辑配置
  const handleEdit = (config: LLMConfig) => {
    // 检查权限
    if (config.is_admin && !currentUser?.is_admin) {
      notifications.show({
        title: '无法编辑',
        message: '普通用户不能编辑管理员的配置',
        color: 'red',
        icon: <IconX size={16} />,
      })
      return
    }
    
    if (config.user_id !== currentUser?.id && !currentUser?.is_admin) {
      notifications.show({
        title: '无法编辑',
        message: '不能编辑其他用户的配置',
        color: 'red',
        icon: <IconX size={16} />,
      })
      return
    }
    
    setFormData({
      name: config.name,
      provider: config.provider,
      api_key: config.api_key,
      base_url: config.base_url,
      model: config.model,
      is_default: config.is_default,
    })
    
    // 查找匹配的服务商
    const provider = llmProviders.find(p => 
      config.provider.toLowerCase().includes(p.id) || 
      p.name === config.provider ||
      (config.provider === 'custom' && p.id === 'custom')
    )
    setSelectedProvider(provider || llmProviders[llmProviders.length - 1])
    
    // 清除错误状态
    setFormErrors({})
    setEditingId(config.id)
    
    // 滚动到表单区域
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 设置默认配置
  const handleSetDefault = async (configId: string) => {
    const config = configs.find(c => c.id === configId)
    
    if (config?.is_admin && !currentUser?.is_admin) {
      notifications.show({
        title: '无法设置',
        message: '不能设置管理员的配置为默认，请创建自己的配置',
        color: 'red',
        icon: <IconX size={16} />,
      })
      return
    }
    
    try {
      const response = await llmConfigApi.setDefault(configId)
      if (response.success) {
        notifications.show({
          title: '默认配置设置成功',
          message: '已设为默认LLM配置',
          color: 'green',
          icon: <IconCheck size={16} />,
        })
        loadConfigs()
      } else {
        notifications.show({
          title: '设置失败',
          message: response.error || '设置默认配置失败',
          color: 'red',
          icon: <IconX size={16} />,
        })
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '设置默认配置失败'
      notifications.show({
        title: '设置失败',
        message: errorMessage,
        color: 'red',
        icon: <IconX size={16} />,
      })
    }
  }

  // 打开删除确认弹窗
  const handleDeleteClick = (configId: string) => {
    setDeletingConfigId(configId)
    openDeleteModal()
  }

  // 确认删除
  const confirmDelete = async () => {
    if (!deletingConfigId) return
    
    const config = configs.find(c => c.id === deletingConfigId)
    
    if (config?.is_admin && !currentUser?.is_admin) {
      notifications.show({
        title: '无法删除',
        message: '普通用户不能删除管理员的配置',
        color: 'red',
        icon: <IconX size={16} />,
      })
      closeDeleteModal()
      return
    }
    
    if (config && config.user_id !== currentUser?.id && !currentUser?.is_admin) {
      notifications.show({
        title: '无法删除',
        message: '不能删除其他用户的配置',
        color: 'red',
        icon: <IconX size={16} />,
      })
      closeDeleteModal()
      return
    }

    try {
      const response = await llmConfigApi.delete(deletingConfigId)
      if (response.success) {
        notifications.show({
          title: '配置删除成功',
          message: 'LLM配置已删除',
          color: 'green',
          icon: <IconCheck size={16} />,
        })
        loadConfigs()
      } else {
        notifications.show({
          title: '删除失败',
          message: response.error || '删除配置失败',
          color: 'red',
          icon: <IconX size={16} />,
        })
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '删除配置失败'
      notifications.show({
        title: '删除失败',
        message: errorMessage,
        color: 'red',
        icon: <IconX size={16} />,
      })
    } finally {
      closeDeleteModal()
      setDeletingConfigId(null)
    }
  }

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      provider: '',
      api_key: '',
      base_url: '',
      model: '',
      is_default: false,
    })
    setFormErrors({})
    setSelectedProvider(null)
    setEditingId(null)
    setTestResult(null)
  }

  // 复制配置（快速创建）
  const handleCopyConfig = (config: LLMConfig) => {
    setFormData({
      name: `${config.name} (副本)`,
      provider: config.provider,
      api_key: '',
      base_url: config.base_url,
      model: config.model,
      is_default: false,
    })
    setSelectedProvider(llmProviders.find(p => p.name === config.provider) || null)
    setFormErrors({})
    setEditingId(null)
    setTestResult(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    notifications.show({
      title: '已复制配置',
      message: '请填写新的API密钥后保存',
      color: 'blue',
      icon: <IconCopy size={16} />,
    })
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F7FA' }}>
      {/* Header */}
      <Paper 
        shadow="sm" 
        p={0} 
        style={{ 
          height: '56px', 
          borderBottom: '1px solid #E5E6EB', 
          backgroundColor: '#FFFFFF',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Container size="xl" px="lg" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Group gap="sm">
            <ThemeIcon size={32} radius="md" variant="light" color="blue">
              <IconApi size={20} />
            </ThemeIcon>
            <Title order={3} c="#1D2129" style={{ fontSize: '20px', fontWeight: 600 }}>
              LLM 配置管理
            </Title>
          </Group>
          <Button 
            variant="subtle" 
            size="sm"
            onClick={() => navigate('/dashboard')}
            leftSection={<IconRefresh size={16} />}
            style={{ height: '32px' }}
          >
            返回首页
          </Button>
        </Container>
      </Paper>

      <Container size="xl" py="lg" px="lg" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <Grid gutter="lg">
          {/* 表单区域 */}
          <Grid.Col span={5}>
            <Card 
              shadow="sm" 
              padding="lg" 
              radius="sm" 
              withBorder 
              style={{ 
                borderColor: '#E5E6EB', 
                borderRadius: '8px',
                position: 'relative',
              }}
            >
              <LoadingOverlay visible={loadingProviders} />
              
              <Stack gap="lg">
                {/* 标题区域 */}
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Group gap="xs" mb={4}>
                      <ThemeIcon size={24} radius="md" variant="light" color={editingId ? 'orange' : 'blue'}>
                        {editingId ? <IconEdit size={14} /> : <IconPlus size={14} />}
                      </ThemeIcon>
                      <Title order={4} c="#1D2129" style={{ fontSize: '16px', fontWeight: 600 }}>
                        {editingId ? '编辑配置' : '新建配置'}
                      </Title>
                    </Group>
                    <Text size="sm" c="#86909C" style={{ fontSize: '12px', marginLeft: '32px' }}>
                      配置 LLM API 连接信息
                    </Text>
                  </div>
                  
                  {editingId && (
                    <Button 
                      variant="light" 
                      color="gray" 
                      size="xs"
                      onClick={resetForm}
                      leftSection={<IconX size={14} />}
                    >
                      取消编辑
                    </Button>
                  )}
                </Group>

                <Divider />

                <form onSubmit={handleSubmit}>
                  <Stack gap="md">
                    {/* 服务商选择 */}
                    <Select
                      label="服务提供商"
                      placeholder="请选择服务商"
                      value={selectedProvider?.id || ''}
                      onChange={(val) => handleProviderChange(val || '')}
                      required
                      disabled={loadingProviders}
                      size="md"
                      data={[
                        { value: '', label: '请选择服务商', disabled: true },
                        ...llmProviders.map((provider) => ({
                          value: provider.id,
                          label: provider.name,
                        }))
                      ]}
                      leftSection={<IconSettings size={16} />}
                      error={formErrors.provider}
                    />

                    {/* 配置名称 */}
                    <TextInput
                      label="配置名称"
                      placeholder="为您的配置起个名字"
                      value={formData.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      required
                      size="md"
                      leftSection={<IconStar size={16} />}
                      error={formErrors.name}
                    />

                    {/* API密钥 - 使用PasswordInput实现脱敏 */}
                    <PasswordInput
                      label="API 密钥"
                      placeholder="请输入 API 密钥"
                      value={formData.api_key}
                      onChange={(e) => handleFieldChange('api_key', e.target.value)}
                      required
                      size="md"
                      leftSection={<IconKey size={16} />}
                      error={formErrors.api_key}
                      description={editingId ? '留空则保留原密钥' : ''}
                    />

                    {/* 基础URL */}
                    <TextInput
                      label="基础 URL"
                      placeholder="https://api.example.com"
                      value={formData.base_url}
                      onChange={(e) => handleFieldChange('base_url', e.target.value)}
                      required
                      size="md"
                      leftSection={<IconLink size={16} />}
                      error={formErrors.base_url}
                    />

                    {/* 模型选择 */}
                    <Autocomplete
                      label="模型名称"
                      placeholder="请输入或选择模型名称"
                      value={formData.model}
                      onChange={(val) => handleFieldChange('model', val)}
                      data={selectedProvider?.models || []}
                      size="md"
                      leftSection={<IconBrandPython size={16} />}
                      error={formErrors.model}
                    />

                    {/* 推荐模型 */}
                    {selectedProvider && selectedProvider.recommendedModels && selectedProvider.recommendedModels.length > 0 && (
                      <div>
                        <Text size="sm" fw={500} mb="xs" c="#1D2129">推荐模型</Text>
                        <Group gap="xs">
                          {selectedProvider.recommendedModels.map((model) => (
                            <Tooltip key={model} label={model}>
                              <Button
                                type="button"
                                variant={formData.model === model ? 'filled' : 'light'}
                                size="xs"
                                onClick={() => handleFieldChange('model', model)}
                                style={{
                                  height: '28px',
                                  backgroundColor: formData.model === model ? '#1E6FFF' : undefined,
                                  color: formData.model === model ? '#FFFFFF' : '#1D2129',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  padding: '0 8px',
                                  maxWidth: '120px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {model}
                              </Button>
                            </Tooltip>
                          ))}
                        </Group>
                      </div>
                    )}

                    {/* 设为默认 */}
                    <Switch
                      label="设为默认配置"
                      description="默认配置将自动用于AI功能"
                      checked={formData.is_default}
                      onChange={(e) => setFormData({ ...formData, is_default: e.currentTarget.checked })}
                      size="md"
                    />

                    {/* 操作按钮 */}
                    <Group gap="sm" mt="md">
                      <Button 
                        type="submit" 
                        loading={loading}
                        size="md"
                        style={{ 
                          height: '40px',
                          backgroundColor: '#1E6FFF',
                        }}
                        leftSection={editingId ? <IconCheck size={16} /> : <IconPlus size={16} />}
                      >
                        {loading ? '保存中...' : (editingId ? '更新配置' : '创建配置')}
                      </Button>
                      
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => handleTest()}
                        loading={testLoading}
                        disabled={!formData.provider || !formData.base_url || !formData.model}
                        size="md"
                        style={{ 
                          height: '40px',
                          borderColor: '#E5E6EB',
                        }}
                        leftSection={<IconFlame size={16} />}
                      >
                        测试连接
                      </Button>
                    </Group>
                  </Stack>
                </form>
              </Stack>
            </Card>
          </Grid.Col>

          {/* 配置列表区域 */}
          <Grid.Col span={{ base: 12, lg: 7 }}>
            <Card 
              shadow="sm" 
              padding="lg" 
              radius="sm" 
              withBorder 
              style={{ 
                borderColor: '#E5E6EB', 
                borderRadius: '8px',
              }}
            >
              <Stack gap="lg">
                {/* 标题区域 */}
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Group gap="xs" mb={4}>
                      <ThemeIcon size={24} radius="md" variant="light" color="green">
                        <IconSettings size={14} />
                      </ThemeIcon>
                      <Title order={4} c="#1D2129" style={{ fontSize: '16px', fontWeight: 600 }}>
                        配置列表
                      </Title>
                    </Group>
                    <Text size="sm" c="#86909C" style={{ fontSize: '12px', marginLeft: '32px' }}>
                      已配置的 LLM 服务 ({configs.length} 个)
                    </Text>
                  </div>
                  
                  <Button 
                    variant="light" 
                    size="xs"
                    onClick={() => { loadProviders(); loadConfigs(); }}
                    leftSection={<IconRefresh size={14} />}
                  >
                    刷新
                  </Button>
                </Group>

                <Divider />

                {configs.length === 0 ? (
                  <Paper 
                    p="xl" 
                    radius="sm" 
                    style={{ 
                      backgroundColor: '#F5F7FA',
                      textAlign: 'center',
                    }}
                  >
                    <ThemeIcon size={48} radius="xl" variant="light" color="gray" mx="auto" mb="md">
                      <IconApi size={24} />
                    </ThemeIcon>
                    <Text c="dimmed" mb="sm">暂无配置</Text>
                    <Text size="sm" c="dimmed" mb="md">请在左侧创建您的第一个 LLM 配置</Text>
                  </Paper>
                ) : (
                  <Stack gap="md">
                    {configs.map((config) => {
                      const isAdminConfig = config.is_admin
                      const isOwnConfig = config.user_id === currentUser?.id
                      const canEdit = isOwnConfig || (currentUser?.is_admin && !isAdminConfig)
                      const canDelete = isOwnConfig || currentUser?.is_admin
                      const canSetDefault = isOwnConfig || !isAdminConfig
                      
                      return (
                        <Card 
                          key={config.id} 
                          shadow="xs" 
                          padding="md" 
                          radius="sm" 
                          withBorder
                          style={{ 
                            backgroundColor: 'white',
                            borderColor: config.is_default ? '#1E6FFF' : '#E5E6EB',
                            borderWidth: config.is_default ? '2px' : '1px',
                          }}
                        >
                          <Stack gap="sm">
                            {/* 头部信息 */}
                            <Group justify="space-between" align="flex-start">
                              <Group gap="xs" wrap="nowrap">
                                <Text fw={600} c="#1D2129" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {config.name}
                                </Text>
                                <Group gap={4}>
                                  {config.is_default && (
                                    <Badge color="blue" size="sm" variant="filled">默认</Badge>
                                  )}
                                  {isAdminConfig && (
                                    <Badge color="violet" size="sm" variant="light">管理员</Badge>
                                  )}
                                  {!isOwnConfig && !isAdminConfig && (
                                    <Badge color="gray" size="sm" variant="outline">共享</Badge>
                                  )}
                                </Group>
                              </Group>
                              
                              <Group gap={4}>
                                <Tooltip label="复制配置">
                                  <ActionIcon 
                                    variant="light" 
                                    color="blue"
                                    size="sm"
                                    onClick={() => handleCopyConfig(config)}
                                  >
                                    <IconCopy size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            </Group>

                            {/* 配置详情 */}
                            <Grid gutter="sm">
                              <Grid.Col span={4}>
                                <Group gap={4}>
                                  <ThemeIcon size={16} radius="xs" variant="light" color="blue">
                                    <IconApi size={10} />
                                  </ThemeIcon>
                                  <div>
                                    <Text size="xs" c="dimmed">提供商</Text>
                                    <Text size="sm" fw={500} lineClamp={1}>{config.provider}</Text>
                                  </div>
                                </Group>
                              </Grid.Col>
                              <Grid.Col span={5}>
                                <Group gap={4}>
                                  <ThemeIcon size={16} radius="xs" variant="light" color="green">
                                    <IconBrandPython size={10} />
                                  </ThemeIcon>
                                  <div>
                                    <Text size="xs" c="dimmed">模型</Text>
                                    <Text 
                                      size="sm" 
                                      fw={500} 
                                      lineClamp={1}
                                      style={{ 
                                        fontFamily: 'monospace',
                                        fontSize: '11px',
                                        backgroundColor: '#F5F7FA',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                      }}
                                    >
                                      {config.model}
                                    </Text>
                                  </div>
                                </Group>
                              </Grid.Col>
                              <Grid.Col span={3}>
                                <Group gap={4}>
                                  <ThemeIcon size={16} radius="xs" variant="light" color={config.is_default ? 'blue' : 'gray'}>
                                    <IconStar size={10} />
                                  </ThemeIcon>
                                  <div>
                                    <Text size="xs" c="dimmed">状态</Text>
                                    <Badge 
                                      color={config.is_default ? 'blue' : 'green'} 
                                      size="sm" 
                                      variant={config.is_default ? 'filled' : 'light'}
                                    >
                                      {config.is_default ? '默认' : '已配置'}
                                    </Badge>
                                  </div>
                                </Group>
                              </Grid.Col>
                            </Grid>

                            {/* 操作按钮 */}
                            <Group gap="xs" mt="xs">
                              <Button 
                                variant="light"
                                size="xs"
                                onClick={() => handleTest(config)}
                                disabled={testLoading}
                                leftSection={<IconFlame size={12} />}
                              >
                                测试
                              </Button>
                              
                              <Button 
                                variant="light"
                                size="xs"
                                onClick={() => handleEdit(config)}
                                disabled={!canEdit}
                                leftSection={<IconEdit size={12} />}
                                style={{ 
                                  height: '28px',
                                  color: canEdit ? '#1E6FFF' : undefined,
                                }}
                              >
                                编辑
                              </Button>
                              
                              <Button 
                                variant="subtle"
                                size="xs"
                                onClick={() => handleSetDefault(config.id)}
                                disabled={config.is_default || !canSetDefault}
                                leftSection={<IconStar size={12} />}
                                style={{ 
                                  height: '28px',
                                  color: (config.is_default || !canSetDefault) ? '#C9CDD4' : '#1D2129',
                                }}
                              >
                                设为默认
                              </Button>
                              
                              <Button 
                                variant="subtle"
                                color="red"
                                size="xs"
                                onClick={() => handleDeleteClick(config.id)}
                                disabled={!canDelete}
                                leftSection={<IconTrash size={12} />}
                                style={{ 
                                  height: '28px',
                                }}
                              >
                                删除
                              </Button>
                            </Group>
                          </Stack>
                        </Card>
                      )
                    })}
                  </Stack>
                )}
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      </Container>

      {/* 删除确认弹窗 */}
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title={
          <Group gap="xs">
            <ThemeIcon size={24} radius="md" variant="light" color="red">
              <IconTrash size={14} />
            </ThemeIcon>
            <Text fw={600}>确认删除</Text>
          </Group>
        }
        centered
        size="sm"
      >
        <Text size="sm" mb="lg">
          确定要删除此 LLM 配置吗？此操作不可恢复。
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" color="gray" onClick={closeDeleteModal}>
            取消
          </Button>
          <Button color="red" onClick={confirmDelete} leftSection={<IconTrash size={14} />}>
            删除
          </Button>
        </Group>
      </Modal>
    </div>
  )
}

export default LLMConfigsManagement
