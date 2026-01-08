import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Card,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Title,
  Text,
  Alert,
  Group,
  Center,
  Box,
  Checkbox,
} from '@mantine/core'
import { IconUser, IconLock } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { authApi } from '@/lib/api'

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await authApi.login(formData.username, formData.password)
      
      if (response.success && response.data) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        notifications.show({
          title: '登录成功',
          message: `欢迎回来，${response.data.user.username}`,
          color: 'green',
        })
        navigate('/dashboard')
      } else {
        setError(response.error || '登录失败')
      }
    } catch (error: any) {
      setError(error.response?.data?.error || '登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleTestUserLogin = async (username: string, password: string) => {
    setFormData({ username, password })
    setLoading(true)
    setError('')

    try {
      const response = await authApi.login(username, password)
      
      if (response.success && response.data) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        notifications.show({
          title: '登录成功',
          message: `欢迎回来，${response.data.user.username}`,
          color: 'green',
        })
        navigate('/dashboard')
      } else {
        setError(response.error || '登录失败')
      }
    } catch (error: any) {
      setError(error.response?.data?.error || '登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        backgroundColor: '#F5F7FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px'
      }}
      role="main"
      aria-label="登录页面"
    >
      <Container size="sm" px={0} style={{ maxWidth: '420px', width: '100%' }}>
        <Stack gap="xl">
          {/* 主登录卡片 */}
          <Card 
            shadow="md" 
            padding="xl" 
            radius="md" 
            withBorder 
            style={{ 
              borderColor: '#E5E6EB',
              backgroundColor: '#FFFFFF',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'
            }}
            role="region"
            aria-labelledby="login-title"
          >
            <Stack gap="lg">
              {/* 顶部Logo */}
              <Center>
                <Box 
                  style={{ 
                    width: '72px', 
                    height: '72px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 16px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  <IconLock size={36} color="#FFFFFF" stroke={2} />
                </Box>
              </Center>

              {/* 标题 */}
              <div style={{ textAlign: 'center' }} id="login-title">
                <Title 
                  order={2} 
                  c="#1D2129" 
                  mb={8}
                  style={{ 
                    fontSize: '24px', 
                    fontWeight: 600,
                    letterSpacing: '-0.5px'
                  }}
                >
                  工程投资方案编制工具
                </Title>
                <Text size="sm" c="#86909C" style={{ fontSize: '14px' }}>
                  请输入您的账号密码登录系统
                </Text>
              </div>

              {/* 表单 */}
              <form onSubmit={handleSubmit} style={{ marginTop: '8px' }} role="form" aria-label="登录表单">
                <Stack gap="md">
                  <TextInput
                    id="username"
                    label="用户名"
                    placeholder="请输入用户名"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    size="md"
                    leftSection={<IconUser size={18} color="#86909C" />}
                    aria-label="用户名输入框"
                    aria-required="true"
                    autoComplete="username"
                    styles={{
                      label: { 
                        fontSize: '14px', 
                        fontWeight: 500, 
                        color: '#1D2129',
                        marginBottom: '8px'
                      },
                      input: { 
                        height: '44px', 
                        fontSize: '14px',
                        borderRadius: '6px',
                        borderColor: '#E5E6EB',
                        paddingLeft: '38px',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: '#667eea'
                        },
                        '&:focus': {
                          borderColor: '#667eea',
                          boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.15)'
                        },
                        '&::placeholder': {
                          color: '#C9CDD4'
                        }
                      }
                    }}
                  />
                  
                  <PasswordInput
                    id="password"
                    label="密码"
                    placeholder="请输入密码"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    size="md"
                    leftSection={<IconLock size={18} color="#86909C" />}
                    aria-label="密码输入框"
                    aria-required="true"
                    autoComplete="current-password"
                    styles={{
                      label: { 
                        fontSize: '14px', 
                        fontWeight: 500, 
                        color: '#1D2129',
                        marginBottom: '8px'
                      },
                      input: { 
                        height: '44px', 
                        fontSize: '14px',
                        borderRadius: '6px',
                        borderColor: '#E5E6EB',
                        paddingLeft: '35px',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: '#667eea'
                        },
                        '&:focus': {
                          borderColor: '#667eea',
                          boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.15)'
                        },
                        '&::placeholder': {
                          color: '#C9CDD4'
                        }
                      }
                    }}
                  />

                  <Checkbox
                    id="remember-me"
                    label="记住用户名"
                    aria-label="记住用户名"
                    styles={{
                      label: { fontSize: '13px', color: '#4E5969' }
                    }}
                  />

                  {error && (
                    <Alert 
                      color="red" 
                      title="登录失败" 
                      role="alert"
                      aria-live="polite"
                      styles={{ 
                        message: { fontSize: '13px' },
                        title: { fontSize: '14px' }
                      }}
                    >
                      {error}
                    </Alert>
                  )}
                  
                  <Button 
                    type="submit" 
                    fullWidth 
                    loading={loading} 
                    size="md"
                    aria-label="登录按钮"
                    style={{ 
                      height: '44px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '6px',
                      fontSize: '15px',
                      fontWeight: 500,
                      marginTop: '8px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(102, 126, 234, 0.4)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {loading ? '登录中...' : '登 录'}
                  </Button>
                </Stack>
              </form>
            </Stack>
          </Card>

          {/* 快捷登录卡片 */}
          <Card 
            shadow="sm" 
            padding="lg" 
            radius="md" 
            withBorder 
            style={{ 
              borderColor: '#E5E6EB',
              backgroundColor: '#FFFFFF',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}
            role="region"
            aria-labelledby="quick-login-title"
          >
            <Stack gap="md">
              <div id="quick-login-title">
                <Title 
                  order={4} 
                  c="#1D2129" 
                  mb="xs" 
                  style={{ fontSize: '16px', fontWeight: 600 }}
                >
                  测试账号快捷登录
                </Title>
                <Text size="sm" c="#86909C" style={{ fontSize: '14px' }}>
                  开发测试使用，点击下方按钮快速登录
                </Text>
              </div>
              <Group grow>
                <Button
                  id="admin-login-btn"
                  variant="light"
                  onClick={() => handleTestUserLogin('admin', '123456')}
                  disabled={loading}
                  aria-label="使用管理员账号登录"
                  style={{ 
                    height: '40px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.3)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  管理员账号
                </Button>
                <Button
                  id="user-login-btn"
                  variant="light"
                  onClick={() => handleTestUserLogin('user', '123456')}
                  disabled={loading}
                  aria-label="使用普通用户账号登录"
                  style={{ 
                    height: '40px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.3)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  普通用户
                </Button>
              </Group>
              <Text size="xs" c="#86909C" ta="center" style={{ fontSize: '12px' }} role="note" aria-label="测试账号提示">
                管理员: admin/123456 | 用户: user/123456
              </Text>
            </Stack>
          </Card>
        </Stack>
      </Container>
    </div>
  )
}

export default Login