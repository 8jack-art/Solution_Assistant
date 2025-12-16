import React, { useState, useEffect } from 'react'
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
  Select,
  Card,
  Group,
  Stack,
  Badge,
  Grid,
  Checkbox,
  Autocomplete,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMediaQuery } from '@mantine/hooks'
import LoadingOverlay from '@/components/LoadingOverlay'

interface LLMProvider {
  id: string
  name: string
  baseUrl: string
  defaultModel: string
  models: string[]
  recommendedModels?: string[]
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | null>(null)
  const [llmProviders, setLlmProviders] = useState<LLMProvider[]>([])
  const [loadingProviders, setLoadingProviders] = useState(false)
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  // 获取当前用户信息
  const getCurrentUser = () => {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }
  const currentUser = getCurrentUser()

  useEffect(() => {
    loadProviders()
    loadConfigs()
  }, [])

  const loadProviders = async () => {
    setLoadingProviders(true)
    try {
      const response = await llmConfigApi.getProviders()
      if (response.success && response.data?.providers) {
        const providers = response.data.providers.map(provider => ({
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

  const getRecommendedModels = (providerId: string): string[] => {
    const recommendedMap: Record<string, string[]> = {
      'bailian': ['qwen-plus', 'qwen-max', 'qwen-turbo'],
      'zhipuai': ['glm-4.5-flash', 'glm-4.6'],
      'volcano': ['doubao-seed-1-6-251015', 'deepseek-v3-250324'],
      'siliconflow': ['zai-org/GLM-4.5-Air', 'deepseek-ai/DeepSeek-V3.2'],
      'custom': []
    }
    return recommendedMap[providerId] || []
  }

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
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '加载失败',
        message: error.response?.data?.error || '加载配置失败',
        color: 'red',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
          message: 'LLM配置已保存',
          color: 'green',
        })
        resetForm()
        loadConfigs()
      } else {
        notifications.show({
          title: '保存失败',
          message: response.error || '保存配置失败',
          color: 'red',
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '保存失败',
        message: error.response?.data?.error || '保存配置失败',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async (config?: LLMConfig) => {
    setTestLoading(true)

    try {
      const testData = config || formData
      const response = await llmConfigApi.testConnection(testData)
      
      if (response.success) {
        notifications.show({
          title: '连接测试成功',
          message: 'LLM服务连接正常',
          color: 'green',
        })
      } else {
        notifications.show({
          title: '连接测试失败',
          message: response.error || '连接测试失败',
          color: 'red',
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '连接测试失败',
        message: error.response?.data?.error || '测试失败',
        color: 'red',
      })
    } finally {
      setTestLoading(false)
    }
  }

  const handleEdit = (config: LLMConfig) => {
    // 检查是否是管理员的配置
    if (config.is_admin && !currentUser?.is_admin) {
      notifications.show({
        title: '无法编辑',
        message: '普通用户不能编辑管理员的配置',
        color: 'red',
      })
      return
    }
    
    // 检查是否是其他用户的配置
    if (config.user_id !== currentUser?.id && !currentUser?.is_admin) {
      notifications.show({
        title: '无法编辑',
        message: '不能编辑其他用户的配置',
        color: 'red',
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
    
    const provider = llmProviders.find(p => 
      config.provider.toLowerCase().includes(p.id) || 
      p.name === config.provider ||
      (config.provider === 'custom' && p.id === 'custom')
    )
    setSelectedProvider(provider || llmProviders[llmProviders.length - 1])
    
    setEditingId(config.id)
  }

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
    }
  }

  const handleSetDefault = async (configId: string) => {
    const config = configs.find(c => c.id === configId)
    
    // 检查是否是管理员的配置
    if (config?.is_admin && !currentUser?.is_admin) {
      notifications.show({
        title: '无法设置',
        message: '不能设置管理员的配置为默认，请创建自己的配置',
        color: 'red',
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
        })
        loadConfigs()
      } else {
        notifications.show({
          title: '设置失败',
          message: response.error || '设置默认配置失败',
          color: 'red',
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '设置失败',
        message: error.response?.data?.error || '设置默认配置失败',
        color: 'red',
      })
    }
  }

  const handleDelete = async (configId: string) => {
    const config = configs.find(c => c.id === configId)
    
    // 检查是否是管理员的配置
    if (config?.is_admin && !currentUser?.is_admin) {
      notifications.show({
        title: '无法删除',
        message: '普通用户不能删除管理员的配置',
        color: 'red',
      })
      return
    }
    
    // 检查是否是其他用户的配置
    if (config && config.user_id !== currentUser?.id && !currentUser?.is_admin) {
      notifications.show({
        title: '无法删除',
        message: '不能删除其他用户的配置',
        color: 'red',
      })
      return
    }
    
    if (!window.confirm('确定要删除此配置吗？')) {
      return
    }

    try {
      const response = await llmConfigApi.delete(configId)
      if (response.success) {
        notifications.show({
          title: '配置删除成功',
          message: 'LLM配置已删除',
          color: 'green',
        })
        loadConfigs()
      } else {
        notifications.show({
          title: '删除失败',
          message: response.error || '删除配置失败',
          color: 'red',
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '删除失败',
        message: error.response?.data?.error || '删除配置失败',
        color: 'red',
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      provider: '',
      api_key: '',
      base_url: '',
      model: '',
      is_default: false,
    })
    setSelectedProvider(null)
    setEditingId(null)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F7FA' }}>
      {/* Header - 符合UI规范：高度50px，白色背景，底部边框#E5E6EB */}
      <Paper shadow="none" p="0" style={{ height: '50px', borderBottom: '1px solid #E5E6EB', backgroundColor: '#FFFFFF' }}>
        <Container size="xl" px={isMobile ? 'sm' : 'lg'} style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title order={isMobile ? 6 : 3} c="#1D2129" style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 600 }}>
            LLM 配置管理
          </Title>
          <Button 
            variant="subtle" 
            size={isMobile ? 'xs' : 'sm'}
            onClick={() => navigate('/dashboard')}
            style={{ height: isMobile ? '28px' : '32px', padding: '4px 8px', color: '#1D2129', backgroundColor: 'transparent' }}
          >
            返回首页
          </Button>
        </Container>
      </Paper>

      <Container size="xl" py={isMobile ? 'md' : 'lg'} px={isMobile ? 'sm' : 'lg'} style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <Grid gutter={isMobile ? 'md' : 'lg'}>
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Card shadow="sm" padding={isMobile ? 'md' : 'lg'} radius="sm" withBorder style={{ borderColor: '#E5E6EB', borderRadius: '4px' }}>
              <Stack gap={isMobile ? 'md' : 'lg'}>
                <div>
                  <Title order={4} c="#1D2129" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{editingId ? '编辑配置' : '新建配置'}</Title>
                  <Text size="sm" c="#86909C" style={{ fontSize: '12px' }}>配置 LLM API 连接信息</Text>
                </div>
              <form onSubmit={handleSubmit}>
                <Stack gap="md">
                  <Select
                    label="服务提供商 *"
                    placeholder="请选择服务商"
                    value={selectedProvider?.id || ''}
                    onChange={(val) => handleProviderChange(val || '')}
                    required
                    disabled={loadingProviders}
                    size={isMobile ? 'sm' : 'md'}
                    data={[
                      { value: '', label: '请选择服务商', disabled: true },
                      ...llmProviders.map((provider) => ({
                        value: provider.id,
                        label: provider.name,
                      }))
                    ]}
                  />

                  <TextInput
                    label="配置名称 *"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="配置名称"
                    required
                    size={isMobile ? 'sm' : 'md'}
                  />
                  <TextInput
                    label="API 密钥 *"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    placeholder="请输入 API 密钥"
                    required
                    size={isMobile ? 'sm' : 'md'}
                  />
                  <TextInput
                    label="基础 URL *"
                    type="url"
                    value={formData.base_url}
                    onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                    placeholder="https://api.example.com"
                    required
                    size={isMobile ? 'sm' : 'md'}
                  />

                  <div>
                    <Text size="sm" fw={500} mb="xs">模型名称 *</Text>
                    <Autocomplete
                      value={formData.model}
                      onChange={(val) => setFormData({ ...formData, model: val })}
                      placeholder="请输入或选择模型名称"
                      data={selectedProvider?.models || []}
                      size={isMobile ? 'sm' : 'md'}
                    />
                  </div>

                  {selectedProvider && selectedProvider.recommendedModels && selectedProvider.recommendedModels.length > 0 && (
                    <div>
                      <Text size="sm" fw={500} mb="xs" style={{ fontSize: '14px', color: '#1D2129' }}>推荐模型</Text>
                      <Group gap="xs">
                        {selectedProvider.recommendedModels.map((model) => (
                          <Button
                            key={model}
                            type="button"
                            variant="filled"
                            size="xs"
                            onClick={() => setFormData({ ...formData, model: model })}
                            style={{
                              height: '28px',
                              backgroundColor: '#1E6FFF',
                              color: '#FFFFFF',
                              borderRadius: '4px',
                              fontSize: '12px',
                              padding: '0 12px'
                            }}
                          >
                            {model}
                          </Button>
                        ))}
                      </Group>
                    </div>
                  )}

                  <Checkbox
                    label="设为默认配置"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.currentTarget.checked })}
                  />

                  <Group gap={isMobile ? 'xs' : 'sm'}>
                    <Button 
                      type="submit" 
                      disabled={loading} 
                      size={isMobile ? 'sm' : 'md'} 
                      style={{ 
                        flex: isMobile ? 1 : 'none',
                        height: '36px',
                        backgroundColor: '#1E6FFF',
                        color: '#FFFFFF',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    >
                      {loading ? '保存中...' : (editingId ? '更新' : '创建')}
                    </Button>
                    <Button 
                      type="button" 
                      variant="filled"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleTest()
                      }}
                      disabled={testLoading}
                      size={isMobile ? 'sm' : 'md'}
                      style={{ 
                        flex: isMobile ? 1 : 'none',
                        height: '36px',
                        backgroundColor: '#00C48C',
                        color: '#FFFFFF',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    >
                      {testLoading ? '测试中...' : '测试连接'}
                    </Button>
                    {editingId && (
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={resetForm}
                        size={isMobile ? 'sm' : 'md'}
                        style={{ 
                          height: '36px',
                          borderRadius: '4px',
                          borderColor: '#E5E6EB',
                          color: '#1D2129',
                          fontSize: '14px'
                        }}
                      >
                        取消
                      </Button>
                    )}
                  </Group>
                </Stack>
              </form>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Card shadow="sm" padding={isMobile ? 'md' : 'lg'} radius="sm" withBorder style={{ borderColor: '#E5E6EB', borderRadius: '4px' }}>
              <Stack gap={isMobile ? 'md' : 'lg'}>
                <div>
                  <Title order={4} c="#1D2129" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>配置列表</Title>
                  <Text size="sm" c="#86909C" style={{ fontSize: '12px' }}>已配置的 LLM 服务列表</Text>
                </div>
              {configs.length === 0 ? (
                <Text ta="center" c="dimmed" py="xl">
                  暂无配置，请先创建一个配置
                </Text>
              ) : (
                <Stack gap="md">
                  {configs.map((config) => {
                    const isAdminConfig = config.is_admin
                    const isOwnConfig = config.user_id === currentUser?.id
                    const canEdit = isOwnConfig || (currentUser?.is_admin && !isAdminConfig)
                    const canDelete = isOwnConfig || currentUser?.is_admin
                    const canSetDefault = isOwnConfig || !isAdminConfig
                    
                    return (
                    <Card key={config.id} shadow="xs" padding="md" radius="sm" withBorder style={{ backgroundColor: 'white' }}>
                      <Stack gap="sm">
                        <Group justify="space-between">
                          <Group gap="xs">
                            <Text fw={600} c="#1D2129">{config.name}</Text>
                            {config.is_default && (
                              <Badge color="blue" size="sm">默认</Badge>
                            )}
                            {isAdminConfig && (
                              <Badge color="violet" size="sm">管理员配置</Badge>
                            )}
                            {!isOwnConfig && !isAdminConfig && (
                              <Badge color="gray" size="sm" variant="outline">共享</Badge>
                            )}
                          </Group>
                        </Group>
                        <Grid gutter="sm">
                          <Grid.Col span={4}>
                            <Text size="xs" c="dimmed">提供商：</Text>
                            <Text size="sm" fw={500}>{config.provider}</Text>
                          </Grid.Col>
                          <Grid.Col span={5}>
                            <Text size="xs" c="dimmed">模型：</Text>
                            <Text size="xs" ff="monospace" style={{ backgroundColor: '#F5F7FA', padding: '2px 6px', borderRadius: '4px' }}>{config.model}</Text>
                          </Grid.Col>
                          <Grid.Col span={3}>
                            <Text size="xs" c="dimmed">状态：</Text>
                            <Badge color="green" size="sm">已配置</Badge>
                          </Grid.Col>
                        </Grid>
                        <Group gap="xs" mt="xs">
                          <Button 
                            variant="filled"
                            size="xs"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleTest(config)
                            }}
                            disabled={testLoading}
                            style={{
                              height: '28px',
                              backgroundColor: '#1E6FFF',
                              color: '#FFFFFF',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          >
                            测试
                          </Button>
                          <Button 
                            variant="filled"
                            size="xs"
                            onClick={() => handleEdit(config)}
                            disabled={!canEdit}
                            style={{
                              height: '28px',
                              backgroundColor: canEdit ? '#1E6FFF' : '#C9CDD4',
                              color: '#FFFFFF',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          >
                            编辑
                          </Button>
                          <Button 
                            variant="outline" 
                            size="xs"
                            onClick={() => handleSetDefault(config.id)}
                            disabled={config.is_default || !canSetDefault}
                            style={{
                              height: '28px',
                              borderRadius: '4px',
                              borderColor: '#E5E6EB',
                              color: (config.is_default || !canSetDefault) ? '#C9CDD4' : '#1D2129',
                              fontSize: '12px'
                            }}
                          >
                            设为默认
                          </Button>
                          <Button 
                            color="red"
                            size="xs"
                            onClick={() => handleDelete(config.id)}
                            disabled={!canDelete}
                            style={{
                              height: '28px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              backgroundColor: canDelete ? undefined : '#C9CDD4'
                            }}
                          >
                            删除
                          </Button>
                        </Group>
                      </Stack>
                    </Card>
                  )})
                }
                </Stack>
              )}
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      </Container>
    </div>
  )
}

export default LLMConfigsManagement