import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Avatar, Text, Group, UnstyledButton, rem } from '@mantine/core'
import { IconLogout, IconSettings, IconUser, IconChevronDown } from '@tabler/icons-react'
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
    <Menu
      shadow="md"
      width={240}
      position="bottom-end"
      transitionProps={{ transition: 'pop-top-right' }}
    >
      <Menu.Target>
        <UnstyledButton
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            transition: 'background-color 0.2s',
          }}
          sx={(theme) => ({
            '&:hover': {
              backgroundColor: theme.colors.gray[0],
            },
          })}
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
            <IconChevronDown size={16} style={{ color: '#86909C' }} />
          </Group>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        {/* 用户信息卡片 */}
        <div style={{ padding: '12px 12px 8px 12px' }}>
          <Group>
            <Avatar color={getAvatarColor()} radius="xl" size="lg">
              {getAvatarText()}
            </Avatar>
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={600}>
                {user.username}
              </Text>
              {user.email && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {user.email}
                </Text>
              )}
              {user.is_admin && (
                <Text size="xs" c="blue" fw={500} mt={4}>
                  🔐 系统管理员
                </Text>
              )}
            </div>
          </Group>
        </div>

        <Menu.Divider />

        {/* 菜单项 */}
        <Menu.Item
          leftSection={<IconUser size={16} />}
          onClick={() => {
            notifications.show({
              title: '功能开发中',
              message: '个人信息功能即将上线',
              color: 'blue',
            })
          }}
        >
          个人信息
        </Menu.Item>

        <Menu.Item
          leftSection={<IconSettings size={16} />}
          onClick={() => navigate('/llm-configs')}
        >
          系统设置
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          leftSection={<IconLogout size={16} />}
          color="red"
          onClick={handleLogout}
        >
          退出登录
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}

export default UserProfile
