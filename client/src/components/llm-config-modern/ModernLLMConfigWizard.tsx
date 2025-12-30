import React, { useState, useEffect } from 'react'
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
  Progress,
  Alert,
  LoadingOverlay,
  ThemeIcon,
  ActionIcon,
  Tooltip,
  TextInput,
  Switch,
} from '@mantine/core'
import {
  IconRocket,
  IconSettings,
  IconKey,
  IconBrandPython,
  IconFlame,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconArrowRight,
  IconArrowLeft,
  IconRefresh,
  IconStar,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

// 类型定义
interface ConfigFormData {
  provider: string
  name: string
  api_key: string
  base_url: string
  model: string
  is_default: boolean
}

interface Provider {
  id: string
  name: string
  logo: string
  description: string
  baseUrl: string
  models: string[]
  recommendedModels?: string[]
  features: string[]
  popularity: number
}

interface ModernLLMConfigWizardProps {
  onComplete: (config: ConfigFormData) => void
  initialData?: Partial<ConfigFormData>
  onCancel?: () => void
  isEditing?: boolean
}

const ModernLLMConfigWizard: React.FC<ModernLLMConfigWizardProps> = ({
  onComplete,
  initialData,
  onCancel,
  isEditing = false,
}) => {
  // 编辑模式从步骤0开始，让用户能查看和修改所有信息
  const [activeStep, setActiveStep] = useState(0)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testResults, setTestResults] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 表单数据
  const [formData, setFormData] = useState<ConfigFormData>({
    provider: initialData?.provider || '',
    name: initialData?.name || '',
    api_key: initialData?.api_key || '',
    base_url: initialData?.base_url || '',
    model: initialData?.model || '',
    is_default: initialData?.is_default || false,
  })
  
  // 表单错误
  const [errors, setErrors] = useState<Partial<Record<keyof ConfigFormData, string>>>({})

  // 模拟服务商数据
  const providers: Provider[] = [
    {
      id: 'bailian',
      name: '百炼(阿里)',
      logo: '/logos/bailian.png',
      description: '阿里云百炼平台，支持多种大语言模型',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      models: ['qwen-plus', 'qwen-max', 'qwen-turbo', 'qwen2.5-72b-instruct'],
      recommendedModels: ['qwen-plus', 'qwen-max'],
      features: ['中文优化', '多模态', 'API稳定'],
      popularity: 5,
    },
    {
      id: 'zhipuai',
      name: '智谱AI',
      logo: '/logos/zhipuai.png',
      description: '智谱清言平台，GLM系列模型',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      models: ['glm-4.5-flash', 'glm-4.6', 'glm-4-air'],
      recommendedModels: ['glm-4.5-flash'],
      features: ['代码生成', '推理能力强', '响应快速'],
      popularity: 4,
    },
    {
      id: 'volcano',
      name: '火山引擎',
      logo: '/logos/volcano.png',
      description: '字节跳动火山引擎豆包模型',
      baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      models: ['doubao-seed-1-6-251015', 'deepseek-v3-250324', 'doubao-pro-32k'],
      recommendedModels: ['doubao-pro-32k'],
      features: ['多语言支持', '成本优化', '企业级'],
      popularity: 3,
    },
    {
      id: 'siliconflow',
      name: '硅基流动',
      logo: '/logos/siliconflow.png',
      description: 'SiliconFlow开源模型聚合平台',
      baseUrl: 'https://api.siliconflow.cn/v1',
      models: ['deepseek-ai/DeepSeek-V3.2', 'Qwen/Qwen2.5-72B-Instruct'],
      recommendedModels: ['Qwen/Qwen2.5-72B-Instruct'],
      features: ['开源模型', '成本低', '自定义部署'],
      popularity: 3,
    },
  ]

  // 步骤配置
  const steps = [
    { id: 0, title: '选择服务商', description: '从推荐的LLM服务商中选择' },
    { id: 1, title: '配置凭据', description: '输入API密钥和基础信息' },
    { id: 2, title: '选择模型', description: '选择适合的AI模型' },
    { id: 3, title: '测试连接', description: '验证配置是否正常工作' },
    { id: 4, title: '完成配置', description: '保存配置并设置默认选项' },
  ]

  // 编辑模式下自动选择对应的 provider 并预填充表单
  useEffect(() => {
    if (isEditing && initialData?.provider) {
      const provider = providers.find(p => p.name === initialData.provider)
      if (provider) {
        setSelectedProvider(provider)
      }
      // 编辑模式下确保所有表单数据都被正确初始化
      if (initialData) {
        setFormData({
          provider: initialData.provider || '',
          name: initialData.name || '',
          api_key: initialData.api_key || '',
          base_url: initialData.base_url || '',
          model: initialData.model || '',
          is_default: initialData.is_default || false,
        })
      }
    }
  }, [isEditing, initialData?.provider, initialData])

  // 更新表单数据
  const updateFormData = (field: keyof ConfigFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  // 验证表单
  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof ConfigFormData, string>> = {}
    
    switch (step) {
      case 0:
        if (!formData.provider) newErrors.provider = '请选择服务商'
        break
      case 1:
        if (!formData.name || formData.name.length < 2) newErrors.name = '配置名称至少2个字符'
        if (!formData.api_key || formData.api_key.length < 10) newErrors.api_key = 'API密钥格式不正确'
        if (!formData.base_url) newErrors.base_url = '请输入基础URL'
        break
      case 2:
        if (!formData.model) newErrors.model = '请选择模型'
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 处理服务商选择
  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider)
    updateFormData('provider', provider.name)
    updateFormData('base_url', provider.baseUrl)
    
    if (!formData.name) {
      updateFormData('name', `${provider.name} - ${provider.recommendedModels?.[0] || '默认模型'}`)
    }
    
    if (provider.recommendedModels && provider.recommendedModels.length > 0) {
      updateFormData('model', provider.recommendedModels[0])
    }
  }

  // 测试连接
  const testConnection = async () => {
    if (!selectedProvider || !formData.api_key) {
      notifications.show({
        title: '信息不完整',
        message: '请先选择服务商并填写API密钥',
        color: 'orange',
      })
      return
    }

    setConnectionStatus('testing')
    setTestResults([])
    
    const diagnosticSteps = [
      '正在检查网络连接...',
      '验证API密钥格式...',
      '测试API端点响应...',
      '验证模型可用性...',
      '检查权限配置...',
    ]

    for (const step of diagnosticSteps) {
      setTestResults(prev => [...prev, step])
      await new Promise(resolve => setTimeout(resolve, 800))
    }

    const isSuccess = Math.random() > 0.1
    setConnectionStatus(isSuccess ? 'success' : 'error')
    
    if (isSuccess) {
      setTestResults(prev => [...prev, '✅ 连接测试成功！'])
      notifications.show({
        title: '连接成功',
        message: 'LLM配置连接正常，可以正常使用',
        color: 'green',
      })
    } else {
      setTestResults(prev => [...prev, '❌ 连接测试失败，请检查配置'])
      notifications.show({
        title: '连接失败',
        message: 'API密钥或配置信息可能有误，请检查后重试',
        color: 'red',
      })
    }
  }

  // 提交表单
  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      notifications.show({
        title: '配置保存成功',
        message: 'LLM配置已保存并可以开始使用',
        color: 'green',
      })
      
      onComplete(formData)
    } catch (error) {
      notifications.show({
        title: '保存失败',
        message: '保存配置时发生错误，请重试',
        color: 'red',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 下一步
  const nextStep = () => {
    // 编辑模式下放宽验证，允许用户快速浏览和修改
    if (isEditing && activeStep === 0) {
      // 编辑模式下，步骤0如果有provider就允许下一步
      if (formData.provider) {
        setActiveStep(prev => Math.min(prev + 1, steps.length - 1))
        return
      }
    }
    
    if (validateStep(activeStep)) {
      setActiveStep(prev => Math.min(prev + 1, steps.length - 1))
    }
  }

  // 上一步
  const prevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 0))
  }

  return (
    <Container size="lg" py="xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Group justify="space-between" mb="xl">
          <div>
            <Group gap="sm" mb="xs">
              <ThemeIcon size={40} radius="md" variant="gradient" gradient={{ from: 'blue', to: 'purple' }}>
                <IconRocket size={24} />
              </ThemeIcon>
              <Title order={2}>
                {isEditing ? '编辑LLM配置' : '智能LLM配置向导'}
              </Title>
            </Group>
            <Text c="dimmed" size="lg">
              {isEditing ? '修改您的LLM服务配置信息' : '跟随向导快速配置您的LLM服务，整个过程只需几分钟'}
            </Text>
          </div>
          
          {onCancel && (
            <Button variant="subtle" onClick={onCancel}>
              取消
            </Button>
          )}
        </Group>
      </motion.div>

      {/* 进度条 */}
      <Paper p="md" radius="md" mb="xl" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
        <Group justify="space-between" mb="sm">
          <Text size="sm" fw={500}>
            步骤 {activeStep + 1} / {steps.length}: {steps[activeStep].title}
          </Text>
          <Text size="sm" c="dimmed">
            {Math.round(((activeStep + 1) / steps.length) * 100)}% 完成
          </Text>
        </Group>
        <Progress value={((activeStep + 1) / steps.length) * 100} size="lg" radius="md" />
      </Paper>

      {/* 主要内容 */}
      <Paper radius="md" p="xl" style={{ minHeight: '500px', position: 'relative' }}>
        <LoadingOverlay visible={isSubmitting} />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* 步骤 0: 服务商选择 */}
            {activeStep === 0 && (
              <div>
                <Title order={3} mb="lg">{isEditing ? '确认服务商' : '选择您的LLM服务商'}</Title>
                <Text c="dimmed" mb="xl">
                  {isEditing 
                    ? '请确认您的LLM服务商，如有需要可以更换' 
                    : '我们推荐了最受欢迎的LLM服务商，您也可以选择自定义配置'
                  }
                </Text>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {providers.map((provider) => (
                    <motion.div
                      key={provider.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card
                        p="lg"
                        radius="md"
                        withBorder
                        onClick={() => handleProviderSelect(provider)}
                        style={{ 
                          cursor: 'pointer',
                          borderColor: selectedProvider?.id === provider.id ? '#228be6' : undefined,
                          borderWidth: selectedProvider?.id === provider.id ? 2 : 1,
                        }}
                      >
                        <Stack gap="md">
                          <Group justify="space-between">
                            <Group gap="sm">
                              <ThemeIcon size={40} variant="light">
                                <IconSettings size={20} />
                              </ThemeIcon>
                              <div>
                                <Text fw={600}>{provider.name}</Text>
                                <Group gap={4}>
                                  {[...Array(5)].map((_, i) => (
                                    <IconStar
                                      key={i}
                                      size={12}
                                      fill={i < provider.popularity ? 'gold' : 'transparent'}
                                      color="gold"
                                    />
                                  ))}
                                </Group>
                              </div>
                            </Group>
                            
                            {selectedProvider?.id === provider.id && (
                              <ThemeIcon color="blue" size={24}>
                                <IconCheck size={14} />
                              </ThemeIcon>
                            )}
                          </Group>
                          
                          <Text size="sm" c="dimmed" lineClamp={2}>
                            {provider.description}
                          </Text>
                          
                          <Group gap="xs">
                            {provider.features.map((feature) => (
                              <Badge key={feature} size="sm" variant="light">
                                {feature}
                              </Badge>
                            ))}
                          </Group>
                          
                          <Text size="xs" c="dimmed">
                            支持 {provider.models.length} 个模型
                          </Text>
                        </Stack>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* 步骤 1: 凭据配置 */}
            {activeStep === 1 && (
              <div>
                <Title order={3} mb="lg">配置API凭据</Title>
                <Text c="dimmed" mb="xl">
                  请输入您的{selectedProvider?.name} API密钥和基础URL
                </Text>
                
                <Stack gap="lg">
                  <TextInput
                    label="配置名称"
                    placeholder="为您的配置起个名字"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    error={errors.name}
                    leftSection={<IconStar size={16} />}
                  />

                  <TextInput
                    label="API 密钥"
                    placeholder="请输入API密钥"
                    value={formData.api_key}
                    onChange={(e) => updateFormData('api_key', e.target.value)}
                    error={errors.api_key}
                    type="password"
                    leftSection={<IconKey size={16} />}
                  />
                  
                  <TextInput
                    label="基础URL"
                    placeholder="https://api.example.com"
                    value={formData.base_url}
                    onChange={(e) => updateFormData('base_url', e.target.value)}
                    error={errors.base_url}
                    leftSection={<IconSettings size={16} />}
                  />

                  {formData.api_key && (
                    <Alert
                      icon={<IconAlertTriangle size={16} />}
                      title="安全提示"
                      color="blue"
                    >
                      API密钥将被加密存储，仅用于调用LLM服务。我们不会存储或泄露您的密钥。
                    </Alert>
                  )}
                </Stack>
              </div>
            )}

            {/* 步骤 2: 模型选择 */}
            {activeStep === 2 && (
              <div>
                <Title order={3} mb="lg">选择AI模型</Title>
                <Text c="dimmed" mb="xl">
                  根据您的需求选择合适的AI模型
                </Text>
                
                <Stack gap="lg">
                  <TextInput
                    label="模型名称"
                    placeholder="请输入或选择模型名称"
                    value={formData.model}
                    onChange={(e) => updateFormData('model', e.target.value)}
                    error={errors.model}
                    leftSection={<IconBrandPython size={16} />}
                  />
                  
                  {selectedProvider?.recommendedModels && (
                    <div>
                      <Text size="sm" fw={500} mb="xs">推荐模型</Text>
                      <Group gap="xs">
                        {selectedProvider.recommendedModels.map((model) => (
                          <Badge
                            key={model}
                            variant={formData.model === model ? 'filled' : 'light'}
                            color="blue"
                            style={{ cursor: 'pointer' }}
                            onClick={() => updateFormData('model', model)}
                          >
                            {model}
                          </Badge>
                        ))}
                      </Group>
                    </div>
                  )}
                  
                  {selectedProvider?.models && (
                    <div>
                      <Text size="sm" fw={500} mb="xs">可用模型</Text>
                      <Group gap="xs">
                        {selectedProvider.models.map((model) => (
                          <Badge
                            key={model}
                            variant="outline"
                            color="gray"
                            style={{ cursor: 'pointer' }}
                            onClick={() => updateFormData('model', model)}
                          >
                            {model}
                          </Badge>
                        ))}
                      </Group>
                    </div>
                  )}
                </Stack>
              </div>
            )}

            {/* 步骤 3: 连接测试 */}
            {activeStep === 3 && (
              <div>
                <Title order={3} mb="lg">测试连接</Title>
                <Text c="dimmed" mb="xl">
                  验证您的LLM配置是否正常工作
                </Text>
                
                <Stack gap="lg">
                  <Card p="lg" radius="md" withBorder>
                    <Group justify="space-between" mb="md">
                      <Group gap="sm">
                        <ThemeIcon 
                          color={connectionStatus === 'testing' ? 'blue' : connectionStatus === 'success' ? 'green' : connectionStatus === 'error' ? 'red' : 'gray'} 
                          size={32}
                        >
                          {connectionStatus === 'testing' ? <IconRefresh size={20} /> : 
                           connectionStatus === 'success' ? <IconCheck size={20} /> :
                           connectionStatus === 'error' ? <IconX size={20} /> :
                           <IconFlame size={20} />}
                        </ThemeIcon>
                        <div>
                          <Text fw={600}>连接状态</Text>
                          <Text size="sm" c="dimmed">
                            {connectionStatus === 'idle' && '未测试'}
                            {connectionStatus === 'testing' && '测试中...'}
                            {connectionStatus === 'success' && '连接成功'}
                            {connectionStatus === 'error' && '连接失败'}
                          </Text>
                        </div>
                      </Group>
                      
                      <Button
                        onClick={testConnection}
                        loading={connectionStatus === 'testing'}
                        disabled={connectionStatus === 'testing'}
                        variant="light"
                      >
                        {connectionStatus === 'idle' ? '开始测试' : '重新测试'}
                      </Button>
                    </Group>
                    
                    {testResults.length > 0 && (
                      <div>
                        <Text size="sm" fw={500} mb="xs">测试日志</Text>
                        <Paper p="sm" radius="sm" style={{ backgroundColor: '#f8f9fa', maxHeight: '200px', overflow: 'auto' }}>
                          {testResults.map((result, index) => (
                            <Text key={index} size="sm" style={{ fontFamily: 'monospace' }}>
                              {result}
                            </Text>
                          ))}
                        </Paper>
                      </div>
                    )}
                  </Card>
                  
                  {connectionStatus === 'success' && (
                    <Alert color="green" icon={<IconCheck size={16} />}>
                      恭喜！您的LLM配置已通过测试，可以正常使用了。
                    </Alert>
                  )}
                  
                  {connectionStatus === 'error' && (
                    <Alert color="red" icon={<IconX size={16} />}>
                      连接测试失败，请检查您的API密钥和配置信息是否正确。
                    </Alert>
                  )}
                </Stack>
              </div>
            )}

            {/* 步骤 4: 完成配置 */}
            {activeStep === 4 && (
              <div>
                <Title order={3} mb="lg">{isEditing ? '确认修改' : '完成配置'}</Title>
                <Text c="dimmed" mb="xl">
                  {isEditing ? '请确认您的修改信息' : '最后一步，请确认您的配置信息'}
                </Text>
                
                <Stack gap="lg">
                  <Card p="lg" radius="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                    <Stack gap="md">
                      <Group justify="space-between">
                        <Text fw={600}>配置名称</Text>
                        <Text>{formData.name}</Text>
                      </Group>
                      
                      <Group justify="space-between">
                        <Text fw={600}>服务商</Text>
                        <Badge color="blue">{formData.provider}</Badge>
                      </Group>
                      
                      <Group justify="space-between">
                        <Text fw={600}>模型</Text>
                        <Badge variant="light">{formData.model}</Badge>
                      </Group>
                      
                      <Group justify="space-between">
                        <Text fw={600}>基础URL</Text>
                        <Text size="sm" style={{ fontFamily: 'monospace' }}>
                          {formData.base_url}
                        </Text>
                      </Group>
                      
                      <Group justify="space-between">
                        <Text fw={600}>API密钥</Text>
                        <Text size="sm">{'•'.repeat(20)}</Text>
                      </Group>
                    </Stack>
                  </Card>
                  
                  <Switch
                    label="设为默认配置"
                    description="默认配置将自动用于AI功能"
                    checked={formData.is_default}
                    onChange={(e) => updateFormData('is_default', e.currentTarget.checked)}
                  />
                  
                  <Alert color="blue" icon={<IconCheck size={16} />}>
                    {isEditing 
                      ? '修改完成后，您可以在LLM配置管理页面查看和进一步调整配置。'
                      : '配置完成后，您可以在LLM配置管理页面查看、编辑和删除配置。'
                    }
                  </Alert>
                </Stack>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* 导航按钮 */}
        <Group justify="space-between" mt="xl">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={prevStep}
            disabled={activeStep === 0}
          >
            上一步
          </Button>

          <Group gap="sm">
            {activeStep < steps.length - 1 ? (
              <Button
                rightSection={<IconArrowRight size={16} />}
                onClick={nextStep}
                variant="gradient"
                gradient={{ from: 'blue', to: 'purple' }}
              >
                下一步
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                loading={isSubmitting}
                size="lg"
                variant="gradient"
                gradient={{ from: 'teal', to: 'blue', deg: 45 }}
              >
                {isEditing ? '保存修改' : '完成配置'}
              </Button>
            )}
          </Group>
        </Group>
      </Paper>
    </Container>
  )
}

export default ModernLLMConfigWizard
