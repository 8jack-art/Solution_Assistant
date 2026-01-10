import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Popover, 
  Avatar, 
  Text, 
  Group, 
  UnstyledButton, 
  Card, 
  Badge, 
  Box 
} from '@mantine/core'
import { 
  IconLogout, 
  IconSettings, 
  IconUser 
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

interface User {
  id: number
  username: string
  email?: string
  is_admin?: boolean
}

interface UserProfileProps {
  user: User
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    notifications.show({
      title: '已退出登录',
      message: '欢迎下次使用',
      color: 'blue',
    })
    navigate('/login')
  }

  const handleEditProfile = () => {
    notifications.show({
      title: '功能开发中',
      message: '个人信息功能即将上线',
      color: 'blue',
    })
  }

  const handleSettings = () => {
    navigate('/llm-configs')
  }

  // 生成用户头像文字（取用户名首字符）
  const getAvatarText = () => {
    return user.username ? user.username.charAt(0).toUpperCase() : 'U'
  }

  // 生成头像颜色（根据用户名生成固定颜色）
  const getAvatarColor = () => {
    if (!user.username) return 'blue'
    const colors = ['blue', 'cyan', 'teal', 'green', 'lime', 'yellow', 'orange', 'red', 'pink', 'grape', 'violet', 'indigo']
    const charCode = user.username.charCodeAt(0)
    return colors[charCode % colors.length]
  }

  return (
    <Popover
      shadow="md"
      position="bottom-end"
      withArrow
      arrowPosition="center"
      transitionProps={{ transition: 'pop-top-right', duration: 200 }}
    >
      <Popover.Target>
        <UnstyledButton
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            transition: 'background-color 0.2s',
            '&:hover': {
              backgroundColor: '#f8f9fa',
            },
          }}
        >
          <Group gap="sm">
            <Avatar color={getAvatarColor()} radius="xl" size="md">
              {getAvatarText()}
            </Avatar>
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={600} lineClamp={1}>
                {user.username}
              </Text>
              {user.is_admin && (
                <Text size="xs" c="dimmed">
                  管理员
                </Text>
              )}
            </div>
          </Group>
        </UnstyledButton>
      </Popover.Target>

      <Popover.Dropdown 
        style={{ 
          padding: 0, 
          borderRadius: '12px', 
          overflow: 'hidden',
          border: 'none',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
        }}
      >
        <Card 
          withBorder={false} 
          padding={0} 
          radius="md"
          style={{ 
            width: '280px',
            overflow: 'hidden'
          }}
        >
          {/* 顶部装饰区域 */}
          <Box 
            style={{ 
              height: '60px',
              background: 'linear-gradient(135deg, #1E6FFF 0%, #5CC8FF 100%)',
              position: 'relative'
            }}
          />

          {/* 用户头像和信息区域 */}
          <Box style={{ padding: '0 16px 12px', marginTop: '-30px' }}>
            <Group align="flex-end" gap="sm">
              <Avatar 
                color={getAvatarColor()} 
                radius="xl" 
                size="56" 
                style={{ 
                  border: '3px solid white',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}
              >
                {getAvatarText()}
              </Avatar>
              <Box style={{ flex: 1, paddingBottom: '4px' }}>
                <Text 
                  size="md" 
                  fw={700} 
                  style={{ 
                    color: '#1D2129',
                    lineHeight: 1.2
                  }}
                >
                  {user.username}
                </Text>
                {user.email && (
                  <Text 
                    size="xs" 
                    c="dimmed" 
                    lineClamp={1}
                    style={{ marginTop: '2px' }}
                  >
                    {user.email}
                  </Text>
                )}
                {user.is_admin && (
                  <Badge 
                    variant="filled" 
                    color="blue" 
                    size="sm" 
                    radius="sm"
                    mt={4}
                  >
                    🔐 系统管理员
                  </Badge>
                )}
              </Box>
            </Group>
          </Box>

          {/* 分割线 */}
          <Box style={{ 
            height: '1px', 
            backgroundColor: '#F0F0F0',
            margin: '0 16px'
          }} />

          {/* 统计信息区域 */}
          <Box style={{ padding: '16px' }}>
            <Group justify="space-around">
              <Box style={{ textAlign: 'center' }}>
                <Text size="lg" fw={700} c="#1E6FFF">12</Text>
                <Text size="xs" c="dimmed">项目</Text>
              </Box>
              <Box style={{ textAlign: 'center' }}>
                <Text size="lg" fw={700} c="#00C48C">8</Text>
                <Text size="xs" c="dimmed">完成</Text>
              </Box>
              <Box style={{ textAlign: 'center' }}>
                <Text size="lg" fw={700} c="#FFA940">3</Text>
                <Text size="xs" c="dimmed">草稿</Text>
              </Box>
            </Group>
          </Box>

          {/* 分割线 */}
          <Box style={{ 
            height: '1px', 
            backgroundColor: '#F0F0F0',
            margin: '0 16px'
          }} />

          {/* 操作按钮区域 */}
          <Box style={{ padding: '16px' }}>
            <Group gap="xs" justify="center">
              <Badge 
                variant="filled" 
                color="blue" 
                size="lg" 
                radius="md"
                style={{ 
                  cursor: 'pointer',
                  padding: '0 16px',
                  height: '36px',
                }}
                onClick={handleEditProfile}
              >
                <Group gap={4}>
                  <IconUser size={16} />
                  编辑资料
                </Group>
              </Badge>
              
              <Badge 
                variant="filled" 
                color="blue" 
                size="lg" 
                radius="md"
                style={{ 
                  cursor: 'pointer',
                  padding: '0 16px',
                  height: '36px',
                }}
                onClick={handleSettings}
              >
                <Group gap={4}>
                  <IconSettings size={16} />
                  系统设置
                </Group>
              </Badge>
            </Group>
          </Box>

          {/* 底部退出登录 */}
          <Box 
            style={{ 
              padding: '12px 16px',
              backgroundColor: '#F5F7FA',
              borderTop: '1px solid #F0F0F0',
              cursor: 'pointer',
            }}
            onClick={handleLogout}
          >
            <Group gap="xs" justify="center">
              <IconLogout size={16} style={{ color: '#F5455C' }} />
              <Text 
                size="sm" 
                fw={500} 
                style={{ color: '#F5455C' }}
              >
                退出登录
              </Text>
            </Group>
          </Box>
        </Card>
      </Popover.Dropdown>
    </Popover>
  )
}

export default UserProfile
