import React, { useState, useMemo } from 'react'
import { Text, Group, Menu, Badge, Box, TextInput, Stack } from '@mantine/core'
import { 
  Folder, DollarSign, TrendingUp, Search, 
  ChevronRight, FileText, Table 
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
    filterKeys: ['{{project_name}}', '{{project_description}}', '{{project_type}}', '{{location}}']
  },
  {
    label: '投资数据',
    icon: <DollarSign size={14} />,
    color: 'green',
    filterKeys: ['{{total_investment}}', '{{construction_years}}', '{{operation_years}}', '{{construction_unit}}']
  },
  {
    label: '财务指标',
    icon: <TrendingUp size={14} />,
    color: 'orange',
    filterKeys: ['{{roi}}', '{{irr}}', '{{npv}}']
  },
  {
    label: '表格数据',
    icon: <Table size={14} />,
    color: 'blue',
    filterKeys: [
      '{{DATA:investment_estimate}}',
      '{{DATA:depreciation_amortization}}',
      '{{DATA:revenue_tax}}',
      '{{DATA:raw_materials}}',
      '{{DATA:fuel_power}}',
      '{{DATA:profit_distribution}}',
      '{{DATA:project_cash_flow}}',
      '{{DATA:financial_indicators}}',
      '{{DATA:loan_repayment}}',
      '{{DATA:loan_repayment_section12}}',
      '{{DATA:financial_static_dynamic}}'
    ]
  },
  {
    label: '表格资源',
    icon: <FileText size={14} />,
    color: 'teal',
    filterKeys: ['{{TABLE:investment_estimate}}', '{{TABLE:revenue_cost_detail}}', '{{TABLE:financial_indicators}}', '{{TABLE:loan_repayment}}']
  },
  {
    label: '图表资源',
    icon: <FileText size={14} />,
    color: 'violet',
    filterKeys: ['{{CHART:investment_composition}}', '{{CHART:revenue_trend}}', '{{CHART:cost_trend}}', '{{CHART:cash_flow_trend}}', '{{CHART:profit_analysis}}']
  },
  {
    label: '其他变量',
    icon: <FileText size={14} />,
    color: 'gray',
    filterKeys: ['{{current_date}}']
  }
]

// 变量详情配置
const variableDetails: Record<string, { label: string; description: string }> = {
  '{{project_name}}': { label: '项目名称', description: '项目的名称' },
  '{{project_description}}': { label: '项目描述', description: '项目的详细描述信息' },
  '{{project_type}}': { label: '项目类型', description: '项目类型（如：农业种植、农产品加工等）' },
  '{{location}}': { label: '项目地点', description: '项目建设的地理位置' },
  '{{total_investment}}': { label: '总投资额', description: '项目总投资金额（万元）' },
  '{{construction_years}}': { label: '建设期', description: '项目建设周期（年）' },
  '{{operation_years}}': { label: '运营期', description: '项目运营周期（年）' },
  '{{construction_unit}}': { label: '建设单位', description: '项目承建单位' },
  '{{roi}}': { label: '投资回报率', description: '投资回报率（%）' },
  '{{irr}}': { label: '内部收益率', description: '内部收益率（%）' },
  '{{npv}}': { label: '净现值', description: '净现值（万元）' },
  '{{current_date}}': { label: '当前日期', description: '报告生成日期' },
  // 表格资源
  '{{TABLE:investment_estimate}}': { label: '投资估算简表', description: '包含项目各项投资估算数据的表格' },
  '{{TABLE:revenue_cost_detail}}': { label: '收入成本明细表', description: '包含收入和成本明细数据的表格' },
  '{{TABLE:financial_indicators}}': { label: '财务指标汇总表', description: '包含ROI、IRR、NPV等财务指标的表格' },
  '{{TABLE:loan_repayment}}': { label: '还款计划表', description: '包含贷款还款计划的表格' },
  // 图表资源
  '{{CHART:investment_composition}}': { label: '投资构成图', description: '展示投资构成比例的图表' },
  '{{CHART:revenue_trend}}': { label: '收入趋势图', description: '展示收入变化趋势的图表' },
  '{{CHART:cost_trend}}': { label: '成本趋势图', description: '展示成本变化趋势的图表' },
  '{{CHART:cash_flow_trend}}': { label: '现金流趋势图', description: '展示现金流变化的图表' },
  '{{CHART:profit_analysis}}': { label: '利润分析图', description: '展示利润分析的图表' },
  // 表格数据（JSON格式，用于LLM提示词）
  '{{DATA:investment_estimate}}': { label: '投资估算简表JSON', description: '投资估算简表的完整JSON数据' },
  '{{DATA:depreciation_amortization}}': { label: '折旧与摊销估算表JSON', description: '折旧与摊销估算表的完整JSON数据' },
  '{{DATA:revenue_tax}}': { label: '含税收入估算表JSON', description: '营业收入、营业税金及附加和增值税估算表的JSON数据' },
  '{{DATA:raw_materials}}': { label: '外购原材料费估算表JSON', description: '外购原材料费估算表的完整JSON数据' },
  '{{DATA:fuel_power}}': { label: '外购燃料和动力费估算表JSON', description: '外购燃料和动力费估算表的完整JSON数据' },
  '{{DATA:profit_distribution}}': { label: '利润与利润分配表JSON', description: '利润与利润分配表的完整JSON数据' },
  '{{DATA:project_cash_flow}}': { label: '项目投资现金流量表JSON', description: '项目投资现金流量表的完整JSON数据' },
  '{{DATA:financial_indicators}}': { label: '财务计算指标表JSON', description: '财务计算指标表的完整JSON数据' },
  '{{DATA:loan_repayment}}': { label: '借款还本付息计划表JSON', description: '借款还本付息计划表的完整JSON数据' },
  '{{DATA:loan_repayment_section12}}': { label: '借款还本付息计划表1.2节JSON', description: '借款还本付息计划表中序号1.2当期还本付息及其子项的JSON数据，包含贷款基本信息、section12数据、利息汇总' },
  '{{DATA:financial_static_dynamic}}': { label: '财务静态动态指标JSON', description: '财务静态动态指标的完整JSON数据，包含静态指标和动态指标' },
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
