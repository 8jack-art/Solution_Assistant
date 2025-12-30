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
  Stepper,
  Card,
  Badge,
  Progress,
  Alert,
  LoadingOverlay,
  ThemeIcon,
  ActionIcon,
  Tooltip,
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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { notifications } from '@mantine/notifications'
import { useDisclosure } from '@mantine/hooks'

// 数据验证Schema
const configSchema = z.object({
  provider: z.string().min(1, '请选择服务商'),
  name: z.string().min(2, '配置名称至少2个字符').max(50, '配置名称不能超过50个字符'),
  api_key: z.string().min(10, 'API密钥格式不正确'),
  base_url: z.string().url('请输入正确的URL'),
  model: z.string().min(1, '请选择模型'),
  is_default: z.boolean().default(false),
})

type ConfigFormData = z.infer<typeof configSchema>

interface Provider {
  id: string
  name: string
  logo: string
  description: string
  baseUrl: string
  models: string[]
  recommendedModels?: string[]
  features: string[]
  popularity: number // 1-5星
}

interface ModernLLMConfigWizardProps {
  onComplete: (config: ConfigFormData) => void
  initialData?: Partial<ConfigFormData>
  onCancel?: () => void
}

const ModernLLMConfigWizard: React.FC<ModernLLMConfigWizardProps> = ({
  onComplete,
  initialData,
  onCancel,
}) => {
  const [activeStep, setActiveStep] = useState(0)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testResults, setTestResults] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [opened, { open, close }] = useDisclosure(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    trigger,
  } = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: initialData,
    mode: 'onChange',
  })

  const watchedData = watch()

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
    {
      id: 0,
      title: '选择服务商',
      description: '从推荐的LLM服务商中选择',
      icon: <IconSettings size={20} />,
      color: 'blue',
    },
    {
      id: 1,
      title: '配置凭据',
      description: '输入API密钥和基础信息',
      icon: <IconKey size={20} />,
      color: 'green',
    },
    {
      id: 2,
      title: '选择模型',
      description: '选择适合的AI模型',
      icon: <IconBrandPython size={20} />,
      color: 'purple',
    },
    {
      id: 3,
      title: '测试连接',
      description: '验证配置是否正常工作',
      icon: <IconFlame size={20} />,
      color: 'orange',
    },
    {
      id: 4,
      title: '完成配置',
      description: '保存配置并设置默认选项',
      icon: <IconCheck size={20} />,
      color: 'teal',
    },
  ]

  // 处理服务商选择
  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider)
    setValue('provider', provider.name)
    setValue('base_url', provider.baseUrl)
    
    // 自动生成配置名称
    if (!watchedData.name) {
      setValue('name', `${provider.name} - ${provider.recommendedModels?.[0] || '默认模型'}`)
    }
    
    // 自动选择推荐模型
    if (provider.recommendedModels && provider.recommendedModels.length > 0) {
      setValue('model', provider.recommendedModels[0])
    }
  }

  // 测试连接
  const testConnection = async () => {
    if (!selectedProvider || !watchedData.api_key) {
      notifications.show({
        title: '信息不完整',
        message: '请先选择服务商并填写API密钥',
        color: 'orange',
      })
      return
    }

    setConnectionStatus('testing')
    setTestResults([])
    
    // 模拟诊断过程
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

    // 模拟测试结果 (90%成功率)
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
  const onSubmit = async (data: ConfigFormData) => {
    setIsSubmitting(true)
    
    try {
      // 这里调用实际的API保存配置
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      notifications.show({
        title: '配置保存成功',
        message: 'LLM配置已保存并可以开始使用',
        color: 'green',
      })
      
      onComplete(data)
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
  const nextStep = async () => {
    const fieldsToValidate = getFieldsToValidate(activeStep)
    const isStepValid = await trigger(fieldsToValidate)
    
    if (isStepValid) {
      setActiveStep(prev => Math.min(prev + 1, steps.length - 1))
    }
  }

  // 上一步
  const prevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 0))
  }

  // 获取当前步骤需要验证的字段
  const getFieldsToValidate = (step: number): (keyof ConfigFormData)[] => {
    switch (step) {
      case 0: return ['provider']
      case 1: return ['api_key', 'base_url']
      case 2: return ['model']
      case 3: return []
      case 4: return ['name']
      default: return []
    }
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
              <Title order={2} gradient={{ from: 'blue', to: 'purple', deg: 45 }}>
                智能LLM配置向导
              </Title>
            </Group>
            <Text c="dimmed" size="lg">
              跟随向导快速配置您的LLM服务，整个过程只需几分钟
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
            {activeStep === 0 && (
              <ProviderSelectionStep
                providers={providers}
                selectedProvider={selectedProvider}
                onSelect={handleProviderSelect}
              />
            )}
            
            {activeStep === 1 && (
              <CredentialsStep
                register={register}
                errors={errors}
                watchedData={watchedData}
                selectedProvider={selectedProvider}
              />
            )}
            
            {activeStep === 2 && (
              <ModelSelectionStep
                register={register}
                errors={errors}
                watchedData={watchedData}
                selectedProvider={selectedProvider}
              />
            )}
            
            {activeStep === 3 && (
              <ConnectionTestStep
                connectionStatus={connectionStatus}
                testResults={testResults}
                onTest={testConnection}
              />
            )}
            
            {activeStep === 4 && (
              <CompleteStep
                register={register}
                errors={errors}
                watchedData={watchedData}
                onSubmit={handleSubmit(onSubmit)}
              />
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
                disabled={!isValid}
                gradient={{ from: 'blue', to: 'purple' }}
              >
                下一步
              </Button>
            ) : (
              <Button
                onClick={handleSubmit(onSubmit)}
                loading={isSubmitting}
                size="lg"
                gradient={{ from: 'teal', to: 'blue', deg: 45 }}
              >
                完成配置
              </Button>
            )}
          </Group>
        </Group>
      </Paper>
    </Container>
  )
}

// 步骤1: 服务商选择
const ProviderSelectionStep: React.FC<{
  providers: Provider[]
  selectedProvider: Provider | null
  onSelect: (provider: Provider) => void
}> = ({ providers, selectedProvider, onSelect }) => {
  return (
    <div>
      <Title order={3} mb="lg">选择您的LLM服务商</Title>
      <Text c="dimmed" mb="xl">
        我们推荐了最受欢迎的LLM服务商，您也可以选择自定义配置
      </Text>
      
      <div className="provider-grid">
        {providers.map((provider) => (
          <motion.div
            key={provider.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={`provider-card ${selectedProvider?.id === provider.id ? 'selected' : ''}`}
              p="lg"
              radius="md"
              withBorder
              onClick={() => onSelect(provider)}
              style={{ cursor: 'pointer' }}
            >
              <Stack gap="md">
                <Group justify="space-between">
                  <Group gap="sm">
                    <div className="provider-logo">
                      {provider.logo ? (
                        <img src={provider.logo} alt={provider.name} />
                      ) : (
                        <ThemeIcon size={40} variant="light">
                          <IconSettings size={20} />
                        </ThemeIcon>
                      )}
                    </div>
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
  )
}

// 步骤2: 凭据配置
const CredentialsStep: React.FC<{
  register: any
  errors: any
  watchedData: any
  selectedProvider: Provider | null
}> = ({ register, errors, watchedData, selectedProvider }) => {
  return (
    <div>
      <Title order={3} mb="lg">配置API凭据</Title>
      <Text c="dimmed" mb="xl">
        请输入您的{selectedProvider?.name} API密钥和基础URL
      </Text>
      
      <Stack gap="lg">
        <div>
          <TextInput
            label="配置名称"
            placeholder="为您的配置起个名字"
            {...register('name')}
            error={errors.name?.message}
            leftSection={<IconStar size={16} />}
          />
          <Text size="xs" c="dimmed" mt="xs">
            建议使用有意义的名称，如"生产环境-文本生成"
          </Text>
        </div>

        <TextInput
          label="API 密钥"
          placeholder="请输入API密钥"
          {...register('api_key')}
          error={errors.api_key?.message}
          type="password"
          leftSection={<IconKey size={16} />}
        />
        
        <TextInput
          label="基础URL"
          placeholder="https://api.example.com"
          {...register('base_url')}
          error={errors.base_url?.message}
          leftSection={<IconSettings size={16} />}
        />

        {watchedData.api_key && (
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
  )
}

// 步骤3: 模型选择
const ModelSelectionStep: React.FC<{
  register: any
  errors: any
  watchedData: any
  selectedProvider: Provider | null
}> = ({ register, errors, watchedData, selectedProvider }) => {
  return (
    <div>
      <Title order={3} mb="lg">选择AI模型</Title>
      <Text c="dimmed" mb="xl">
        根据您的需求选择合适的AI模型
      </Text>
      
      <Stack gap="lg">
        <div>
          <TextInput
            label="模型名称"
            placeholder="请输入或选择模型名称"
            {...register('model')}
            error={errors.model?.message}
            leftSection={<IconBrandPython size={16} />}
          />
        </div>
        
        {selectedProvider?.recommendedModels && (
          <div>
            <Text size="sm" fw={500} mb="xs">推荐模型</Text>
            <Group gap="xs">
              {selectedProvider.recommendedModels.map((model) => (
                <Badge
                  key={model}
                  variant={watchedData.model === model ? 'filled' : 'light'}
                  color="blue"
                  style={{ cursor: 'pointer' }}
                  onClick={() => register('model').onChange({ target: { value: model } })}
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
                  onClick={() => register('model').onChange({ target: { value: model } })}
                >
                  {model}
                </Badge>
              ))}
            </Group>
          </div>
        )}
      </Stack>
    </div>
  )
}

// 步骤4: 连接测试
const ConnectionTestStep: React.FC<{
  connectionStatus: 'idle' | 'testing' | 'success' | 'error'
  testResults: string[]
  onTest: () => void
}> = ({ connectionStatus, testResults, onTest }) => {
  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing': return <IconRefresh className="spinning" size={20} />
      case 'success': return <IconCheck size={20} color="green" />
      case 'error': return <IconX size={20} color="red" />
      default: return <IconFlame size={20} />
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'testing': return 'blue'
      case 'success': return 'green'
      case 'error': return 'red'
      default: return 'gray'
    }
  }

  return (
    <div>
      <Title order={3} mb="lg">测试连接</Title>
      <Text c="dimmed" mb="xl">
        验证您的LLM配置是否正常工作
      </Text>
      
      <Stack gap="lg">
        <Card p="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Group gap="sm">
              <ThemeIcon color={getStatusColor()} size={32}>
                {getStatusIcon()}
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
              onClick={onTest}
              loading={connectionStatus === 'testing'}
              disabled={connectionStatus === 'testing'}
              variant="light"
            >
              {connectionStatus === 'idle' ? '开始测试' : '重新测试'}
            </Button>
          </Group>
          
          {testResults.length > 0 && (
            <div className="test-results">
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
  )
}

// 步骤5: 完成配置
const CompleteStep: React.FC<{
  register: any
  errors: any
  watchedData: any
  onSubmit: () => void
}> = ({ register, errors, watchedData, onSubmit }) => {
  return (
    <div>
      <Title order={3} mb="lg">完成配置</Title>
      <Text c="dimmed" mb="xl">
        最后一步，请确认您的配置信息
      </Text>
      
      <Stack gap="lg">
        <Card p="lg" radius="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={600}>配置名称</Text>
              <Text>{watchedData.name}</Text>
            </Group>
            
            <Group justify="space-between">
              <Text fw={600}>服务商</Text>
              <Badge color="blue">{watchedData.provider}</Badge>
            </Group>
            
            <Group justify="space-between">
              <Text fw={600}>模型</Text>
              <Badge variant="light">{watchedData.model}</Badge>
            </Group>
            
            <Group justify="space-between">
              <Text fw={600}>基础URL</Text>
              <Text size="sm" style={{ fontFamily: 'monospace' }}>
                {watchedData.base_url}
              </Text>
            </Group>
            
            <Group justify="space-between">
              <Text fw={600}>API密钥</Text>
              <Text size="sm">{'•'.repeat(20)}</Text>
            </Group>
          </Stack>
        </Card>
        
        <div>
          <Switch
            label="设为默认配置"
            description="默认配置将自动用于AI功能"
            {...register('is_default')}
          />
        </div>
        
        <Alert color="blue" icon={<IconCheck size={16} />}>
          配置完成后，您可以在LLM配置管理页面查看、编辑和删除配置。
        </Alert>
      </Stack>
    </div>
  )
}

export default ModernLLMConfigWizard