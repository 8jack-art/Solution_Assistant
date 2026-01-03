import React, { useState, useMemo } from 'react'
import { Text, Group, Menu, Badge, Box, TextInput, Stack } from '@mantine/core'
import { 
  Folder, DollarSign, TrendingUp, Search, 
  ChevronRight, FileText 
} from 'lucide-react'
import { useReportStore } from '../../stores/reportStore'

interface VariableMenuProps {
  editor: any
  position: { x: number; y: number }
  onClose: () => void
}

// 变量分组配置
const variableGroups = [
  {
    label: '项目信息',
    icon: <Folder size={14} />,
    color: 'blue',
    filterKeys: ['{{project_name}}', '{{project_type}}', '{{location}}']
  },
  {
    label: '投资数据',
    icon: <DollarSign size={14} />,
    color: 'green',
    filterKeys: ['{{total_investment}}', '{{construction_years}}', '{{operation_years}}']
  },
  {
    label: '财务指标',
    icon: <TrendingUp size={14} />,
    color: 'orange',
    filterKeys: ['{{roi}}', '{{irr}}', '{{npv}}']
  },
  {
    label: '其他变量',
    icon: <FileText size={14} />,
    color: 'gray',
    filterKeys: []
  }
]

// 变量详情配置
const variableDetails: Record<string, { label: string; description: string }> = {
  '{{project_name}}': { label: '项目名称', description: '项目的名称' },
  '{{project_type}}': { label: '项目类型', description: '项目类型（如：农业种植、农产品加工等）' },
  '{{location}}': { label: '项目地点', description: '项目建设的地理位置' },
  '{{total_investment}}': { label: '总投资额', description: '项目总投资金额（万元）' },
  '{{construction_years}}': { label: '建设期', description: '项目建设周期（年）' },
  '{{operation_years}}': { label: '运营期', description: '项目运营周期（年）' },
  '{{roi}}': { label: '投资回报率', description: '投资回报率（%）' },
  '{{irr}}': { label: '内部收益率', description: '内部收益率（%）' },
  '{{npv}}': { label: '净现值', description: '净现值（万元）' },
}

export function VariableMenu({ editor, position, onClose }: VariableMenuProps) {
  const { availableVariables } = useReportStore()
  const [searchQuery, setSearchQuery] = useState('')

  // 根据搜索过滤变量
  const filteredVariables = useMemo(() => {
    if (!searchQuery.trim()) return availableVariables
    
    const query = searchQuery.toLowerCase()
    return availableVariables.filter(v => 
      v.label.toLowerCase().includes(query) || 
      v.key.toLowerCase().includes(query) ||
      variableDetails[v.key]?.description?.toLowerCase().includes(query)
    )
  }, [availableVariables, searchQuery])

  // 按分组整理变量
  const groupedVariables = useMemo(() => {
    const groups: Record<string, typeof availableVariables> = {}
    
    // 初始化分组
    variableGroups.forEach(g => {
      groups[g.label] = []
    })
    
    // 分配变量到分组
    filteredVariables.forEach(v => {
      let assigned = false
      for (const group of variableGroups) {
        if (group.filterKeys.includes(v.key)) {
          groups[group.label].push(v)
          assigned = true
          break
        }
      }
      if (!assigned) {
        groups['其他变量'].push(v)
      }
    })
    
    return groups
  }, [filteredVariables])

  // 插入变量
  const insertVariable = (variableKey: string) => {
    // 删除刚才输入的 "/"
    const { from } = editor.state.selection
    editor.chain().focus().deleteRange({ from: from - 1, to: from }).run()
    
    // 插入变量
    editor.commands.insertContent(variableKey)
    onClose()
  }

  // 获取分组颜色
  const getGroupColor = (groupLabel: string) => {
    return variableGroups.find(g => g.label === groupLabel)?.color || 'gray'
  }

  // 获取分组图标
  const getGroupIcon = (groupLabel: string) => {
    return variableGroups.find(g => g.label === groupLabel)?.icon || <FileText size={14} />
  }

  return (
    <Box
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        minWidth: '280px',
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Menu
        opened={true}
        onClose={onClose}
        width={280}
        shadow="md"
        radius="md"
        closeOnItemClick={true}
        withinPortal={false}
      >
        <Menu.Dropdown 
          style={{ 
            maxHeight: '350px', 
            overflowY: 'auto',
            padding: '8px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 搜索框 */}
          <Box mb="xs" px="xs">
            <TextInput
              placeholder="搜索变量..."
              leftSection={<Search size={14} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onClose()
                }
              }}
            />
          </Box>
          
          {/* 分组显示 */}
          {variableGroups.map(group => {
            const variables = groupedVariables[group.label]
            if (variables.length === 0) return null
            
            return (
              <Box key={group.label} mb="xs">
                {/* 分组标题 */}
                <Group gap={4} px="xs" mb={4}>
                  <Text 
                    size="xs" 
                    fw={500} 
                    c={`${group.color}.7`}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {group.icon}
                    {group.label}
                  </Text>
                </Group>
                
                {/* 变量列表 */}
                {variables.map(variable => {
                  const details = variableDetails[variable.key] || { label: variable.label, description: '' }
                  return (
                    <Menu.Item
                      key={variable.key}
                      onClick={() => insertVariable(variable.key)}
                      style={{ padding: '8px 12px' }}
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="xs" wrap="nowrap" style={{ flex: 1, overflow: 'hidden' }}>
                          <Badge 
                            size="xs" 
                            variant="light" 
                            color={group.color}
                            style={{ flexShrink: 0 }}
                          >
                            {details.label}
                          </Badge>
                          <Text 
                            size="xs" 
                            c="dimmed"
                            style={{ 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis' 
                            }}
                          >
                            {variable.key}
                          </Text>
                        </Group>
                      </Group>
                      {details.description && (
                        <Text size="xs" c="dimmed" mt={2}>
                          {details.description}
                        </Text>
                      )}
                    </Menu.Item>
                  )
                })}
              </Box>
            )
          })}
          
          {filteredVariables.length === 0 && (
            <Text size="xs" c="dimmed" ta="center" py="md">
              未找到匹配的变量
            </Text>
          )}
        </Menu.Dropdown>
      </Menu>
    </Box>
  )
}

export default VariableMenu
