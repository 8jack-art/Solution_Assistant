import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Grid,
  LoadingOverlay,
  Divider,
  ThemeIcon,
  Badge,
  ScrollArea,
  Code,
  Alert,
  Accordion,
  CopyButton,
  ActionIcon,
  Tooltip,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconPlus,
  IconRefresh,
  IconCheck,
  IconX,
  IconApi,
  IconBug,
  IconTerminal,
  IconCopy,
  IconChevronRight,
  IconChevronDown,
} from '@tabler/icons-react'
import { llmConfigApi } from '@/lib/api'

interface ProviderInfo {
  id: string
  name: string
  baseUrl: string
  defaultModel: string
  authType: string
  notes: string
}

const LLMConfigsDebug: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [diagnosing, setDiagnosing] = useState(false)
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  
  // 测试表单
  const [testForm, setTestForm] = useState({
    provider: '',
    api_key: '',
    base_url: '',
    model: '',
  })
  
  // 诊断结果
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])

  // 加载提供商列表
  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    setLoading(true)
    try {
      // 直接使用内置的提供商信息
      setProviders([
        {
          id: 'bailian',
          name: '百炼(阿里)',
          baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          defaultModel: 'qwen-plus',
          authType: 'Bearer',
          notes: '需要阿里云API密钥'
        },
        {
          id: 'zhipuai',
          name: '智谱AI',
          baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
          defaultModel: 'glm-4.5-flash',
          authType: 'Bearer',
          notes: '需要智谱AI API密钥(84b7开头)'
        },
        {
          id: 'volcano',
          name: '火山引擎',
          baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
          defaultModel: 'doubao-seed-1-6-251015',
          authType: 'Bearer',
          notes: '需要火山引擎API密钥'
        },
        {
          id: 'siliconflow',
          name: '硅基流动',
          baseUrl: 'https://api.siliconflow.cn/v1',
          defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
          authType: 'Bearer',
          notes: '需要硅基流动API密钥'
        }
      ])
    } catch (error) {
      console.error('加载提供商列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 选择提供商
  const handleProviderSelect = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId)
    if (provider) {
      setTestForm({
        provider: provider.name,
        api_key: '',
        base_url: provider.baseUrl,
        model: provider.defaultModel,
      })
      setDiagnosticResult(null)
      setLogs([])
    }
  }

  // 添加日志
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().substring(11, 23)
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  // 诊断连接
  const handleDiagnose = async () => {
    if (!testForm.provider || !testForm.api_key || !testForm.base_url || !testForm.model) {
      notifications.show({
        title: '验证失败',
        message: '请填写完整的测试信息',
        color: 'red',
        icon: <IconX size={16} />,
      })
      return
    }

    setDiagnosing(true)
    setDiagnosticResult(null)
    setLogs([])

    addLog('开始诊断LLM连接...')
    addLog(`Provider: ${testForm.provider}`)
    addLog(`Base URL: ${testForm.base_url}`)
    addLog(`Model: ${testForm.model}`)

    try {
      addLog('发送诊断请求到服务器...')
      
      const response = await fetch('/api/debug/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testForm),
      })

      const result = await response.json()
      addLog(`收到响应: ${response.status} ${response.statusText}`)

      if (result.success) {
        addLog('✅ 诊断成功!')
        if (result.data?.summary?.recommendedTestCase) {
          addLog(`推荐配置: ${result.data.summary.recommendedTestCase}`)
        }
      } else {
        addLog('❌ 所有测试都失败')
      }

      setDiagnosticResult(result)
    } catch (error: any) {
      addLog(`❌ 请求失败: ${error.message}`)
      notifications.show({
        title: '诊断失败',
        message: error.message,
        color: 'red',
        icon: <IconX size={16} />,
      })
    } finally {
      setDiagnosing(false)
    }
  }

  // 快速测试
  const handleQuickTest = async (provider: ProviderInfo) => {
    setDiagnosing(true)
    setLogs([])
    
    addLog(`测试 ${provider.name}...`)
    addLog(`Base URL: ${provider.baseUrl}`)
    addLog(`Model: ${provider.defaultModel}`)

    try {
      // 调用实际的测试连接API
      const response = await llmConfigApi.testConnection({
        provider: provider.name,
        base_url: provider.baseUrl,
        model: provider.defaultModel,
        api_key: 'test-api-key-placeholder', // 这个会被替换为实际输入的密钥
      })

      // 如果是401错误，说明密钥验证失败，但API格式是正确的
      if (response.error?.includes('401') || response.error?.includes('unauthorized')) {
        addLog(`⚠️ API格式正确，但密钥验证失败`)
        addLog(`提示: 请检查API密钥是否正确`)
        notifications.show({
          title: `测试 ${provider.name}`,
          message: 'API格式正确，请提供正确的API密钥进行完整测试',
          color: 'yellow',
          icon: <IconCheck size={16} />,
        })
      } else if (response.error) {
        addLog(`❌ 错误: ${response.error}`)
      }
    } catch (error: any) {
      addLog(`❌ 异常: ${error.message}`)
    } finally {
      setDiagnosing(false)
    }
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
            <ThemeIcon size={32} radius="md" variant="light" color="orange">
              <IconBug size={20} />
            </ThemeIcon>
            <Title order={3} c="#1D2129" style={{ fontSize: '20px', fontWeight: 600 }}>
              LLM 连接诊断工具
            </Title>
          </Group>
          <Button 
            variant="subtle" 
            size="sm"
            onClick={() => navigate('/llm-configs')}
            leftSection={<IconRefresh size={16} />}
          >
            返回配置管理
          </Button>
        </Container>
      </Paper>

      <Container size="xl" py="lg" px="lg" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <Grid gutter="lg">
          {/* 左侧：测试表单 */}
          <Grid.Col span={{ base: 12, lg: 5 }}>
            <Card 
              shadow="sm" 
              padding="lg" 
              radius="sm" 
              withBorder 
              style={{ borderColor: '#E5E6EB', borderRadius: '8px' }}
            >
              <Stack gap="lg">
                <div>
                  <Group gap="xs" mb={4}>
                    <ThemeIcon size={24} radius="md" variant="light" color="blue">
                      <IconTerminal size={14} />
                    </ThemeIcon>
                    <Title order={4} c="#1D2129" style={{ fontSize: '16px', fontWeight: 600 }}>
                      手动测试
                    </Title>
                  </Group>
                  <Text size="sm" c="#86909C" style={{ fontSize: '12px', marginLeft: '32px' }}>
                    输入配置信息进行详细诊断
                  </Text>
                </div>

                <Divider />

                {/* 服务商选择 */}
                <Select
                  label="选择服务商"
                  placeholder="请选择要测试的服务商"
                  value={testForm.provider}
                  onChange={(val) => handleProviderSelect(val || '')}
                  size="md"
                  data={providers.map(p => ({
                    value: p.id,
                    label: `${p.name} (${p.baseUrl})`
                  }))}
                />

                {/* API密钥 */}
                <TextInput
                  label="API 密钥"
                  placeholder="请输入 API 密钥"
                  value={testForm.api_key}
                  onChange={(e) => setTestForm({ ...testForm, api_key: e.target.value })}
                  size="md"
                  type="password"
                  description={testForm.provider.includes('智谱') ? '智谱AI密钥通常以84b7开头' : ''}
                />

                {/* Base URL */}
                <TextInput
                  label="Base URL"
                  placeholder="https://api.example.com"
                  value={testForm.base_url}
                  onChange={(e) => setTestForm({ ...testForm, base_url: e.target.value })}
                  size="md"
                />

                {/* 模型名称 */}
                <TextInput
                  label="模型名称"
                  placeholder="请输入模型名称"
                  value={testForm.model}
                  onChange={(e) => setTestForm({ ...testForm, model: e.target.value })}
                  size="md"
                />

                <Divider />

                {/* 操作按钮 */}
                <Group gap="sm">
                  <Button 
                    onClick={handleDiagnose}
                    loading={diagnosing}
                    disabled={!testForm.provider || !testForm.api_key || !testForm.base_url || !testForm.model}
                    size="md"
                    fullWidth
                    style={{ height: '40px' }}
                    leftSection={<IconBug size={16} />}
                  >
                    开始诊断
                  </Button>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>

          {/* 右侧：结果和日志 */}
          <Grid.Col span={{ base: 12, lg: 7 }}>
            <Stack gap="lg">
              {/* 快速测试卡片 */}
              <Card 
                shadow="sm" 
                padding="lg" 
                radius="sm" 
                withBorder 
                style={{ borderColor: '#E5E6EB', borderRadius: '8px' }}
              >
                <Group justify="space-between" mb="md">
                  <div>
                    <Group gap="xs" mb={4}>
                      <ThemeIcon size={24} radius="md" variant="light" color="green">
                        <IconCheck size={14} />
                      </ThemeIcon>
                      <Title order={4} c="#1D2129" style={{ fontSize: '16px', fontWeight: 600 }}>
                        快速测试
                      </Title>
                    </Group>
                    <Text size="sm" c="#86909C" style={{ fontSize: '12px', marginLeft: '32px' }}>
                      点击快速验证各提供商的API格式
                    </Text>
                  </div>
                  <Button 
                    variant="light" 
                    size="xs"
                    onClick={loadProviders}
                    leftSection={<IconRefresh size={14} />}
                  >
                    刷新
                  </Button>
                </Group>

                <ScrollArea h={200}>
                  <Stack gap="sm">
                    {providers.map((provider) => (
                      <Paper 
                        key={provider.id} 
                        p="sm" 
                        radius="sm" 
                        withBorder
                        style={{ backgroundColor: '#F5F7FA' }}
                      >
                        <Group justify="space-between" wrap="nowrap">
                          <div style={{ flex: 1 }}>
                            <Group gap="xs" mb={4}>
                              <Text fw={500} size="sm">{provider.name}</Text>
                              <Badge color="gray" size="xs" variant="light">
                                {provider.authType}
                              </Badge>
                            </Group>
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {provider.baseUrl}
                            </Text>
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              默认模型: {provider.defaultModel}
                            </Text>
                            <Text size="xs" c="blue" mt={4}>
                              {provider.notes}
                            </Text>
                          </div>
                          <Button 
                            variant="light"
                            size="xs"
                            onClick={() => handleQuickTest(provider)}
                            loading={diagnosing}
                          >
                            测试
                          </Button>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </ScrollArea>
              </Card>

              {/* 诊断日志 */}
              <Card 
                shadow="sm" 
                padding="lg" 
                radius="sm" 
                withBorder 
                style={{ borderColor: '#E5E6EB', borderRadius: '8px' }}
              >
                <Group justify="space-between" mb="md">
                  <div>
                    <Group gap="xs" mb={4}>
                      <ThemeIcon size={24} radius="md" variant="light" color="gray">
                        <IconTerminal size={14} />
                      </ThemeIcon>
                      <Title order={4} c="#1D2129" style={{ fontSize: '16px', fontWeight: 600 }}>
                        诊断日志
                      </Title>
                    </Group>
                    <Text size="sm" c="#86909C" style={{ fontSize: '12px', marginLeft: '32px' }}>
                      显示详细的诊断过程
                    </Text>
                  </div>
                  <CopyButton value={logs.join('\n')}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? '已复制' : '复制日志'}>
                        <ActionIcon 
                          variant="light" 
                          color={copied ? 'green' : 'gray'}
                          onClick={copy}
                        >
                          <IconCopy size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>

                <Paper 
                  p="sm" 
                  radius="sm" 
                  withBorder
                  style={{ 
                    backgroundColor: '#1E1E1E',
                    maxHeight: 300,
                    overflow: 'auto'
                  }}
                >
                  <Code block style={{ backgroundColor: 'transparent', color: '#D4D4D4' }}>
                    {logs.length === 0 ? (
                      <Text size="sm" c="#808080">等待诊断开始...</Text>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index}>{log}</div>
                      ))
                    )}
                  </Code>
                </Paper>
              </Card>

              {/* 诊断结果 */}
              {diagnosticResult && (
                <Card 
                  shadow="sm" 
                  padding="lg" 
                  radius="sm" 
                  withBorder 
                  style={{ borderColor: diagnosticResult.success ? '#40C057' : '#FA5252', borderRadius: '8px' }}
                >
                  <Group gap="xs" mb="md">
                    <ThemeIcon 
                      size={24} 
                      radius="md" 
                      variant="light" 
                      color={diagnosticResult.success ? 'green' : 'red'}
                    >
                      {diagnosticResult.success ? <IconCheck size={14} /> : <IconX size={14} />}
                    </ThemeIcon>
                    <Title 
                      order={4} 
                      c={diagnosticResult.success ? '#40C057' : '#FA5252'}
                      style={{ fontSize: '16px', fontWeight: 600 }}
                    >
                      {diagnosticResult.success ? '诊断成功' : '诊断失败'}
                    </Title>
                  </Group>

                  {diagnosticResult.data && (
                    <Stack gap="sm">
                      <div>
                        <Text size="sm" fw={500}>测试摘要</Text>
                        <Text size="xs" c="dimmed">
                          总测试数: {diagnosticResult.data.summary?.totalTests || 0} | 
                          成功: {diagnosticResult.data.summary?.successCount || 0} | 
                          失败: {diagnosticResult.data.summary?.failedCount || 0}
                        </Text>
                      </div>

                      {diagnosticResult.data.summary?.recommendedTestCase && (
                        <Alert color="green" title="推荐配置">
                          <Text size="sm">
                            成功的测试用例: {diagnosticResult.data.summary.recommendedTestCase}
                          </Text>
                        </Alert>
                      )}

                      {diagnosticResult.data.results && diagnosticResult.data.results.length > 0 && (
                        <Accordion>
                          {diagnosticResult.data.results.slice(0, 5).map((result: any, index: number) => (
                            <Accordion.Item key={index} value={`result-${index}`}>
                              <Accordion.Control>
                                <Group gap="xs">
                                  {result.success ? (
                                    <IconCheck size={16} color="#40C057" />
                                  ) : (
                                    <IconX size={16} color="#FA5252" />
                                  )}
                                  <Text size="sm">{result.testCase}</Text>
                                  {result.status && (
                                    <Badge size="xs" color={result.success ? 'green' : 'red'}>
                                      HTTP {result.status}
                                    </Badge>
                                  )}
                                </Group>
                              </Accordion.Control>
                              <Accordion.Panel>
                                <Code block style={{ fontSize: '12px' }}>
                                  {JSON.stringify(result, null, 2)}
                                </Code>
                              </Accordion.Panel>
                            </Accordion.Item>
                          ))}
                        </Accordion>
                      )}
                    </Stack>
                  )}
                </Card>
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      </Container>
    </div>
  )
}

export default LLMConfigsDebug
