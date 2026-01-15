import { useState } from 'react'
import { useReportStore } from '../../stores/reportStore'
import { Text, Badge, Group, Stack, ActionIcon, Tooltip, Button, Modal, TextInput, Textarea, ScrollArea, Code } from '@mantine/core'
import { Sparkles, Plus, Trash2, Eye } from 'lucide-react'
import { ProjectOverviewModal } from './ProjectOverviewModal'

export function VariablePicker() {
  const { projectOverview, customVariables, addCustomVariable, removeCustomVariable, availableVariables } = useReportStore()
  const [modalOpened, setModalOpened] = useState(false)
  const [newVariableModalOpened, setNewVariableModalOpened] = useState(false)
  const [newVariableKey, setNewVariableKey] = useState('')
  const [newVariableValue, setNewVariableValue] = useState('')
  const [jsonViewerOpened, setJsonViewerOpened] = useState(false)
  const [jsonViewerTitle, setJsonViewerTitle] = useState('')
  const [jsonViewerData, setJsonViewerData] = useState('')

  const handleCopyVariable = (variableKey: string) => {
    navigator.clipboard.writeText(variableKey)
    
    // 在浏览器控制台输出变量值
    const variable = availableVariables.find(v => v.key === variableKey)
    if (variable && variable.value) {
      console.log(`🔍 ${variableKey} 输出:`, variable.value)
    }
  }

  // 打开JSON查看器
  const handleViewJson = (variableKey: string, title: string) => {
    const variable = availableVariables.find(v => v.key === variableKey)
    if (variable && variable.value) {
      setJsonViewerTitle(title)
      setJsonViewerData(variable.value)
      setJsonViewerOpened(true)
    }
  }





  // 项目概况变量状态：有内容时蓝色可点击，空时灰色不可点击
  const hasProjectOverview = !!projectOverview && projectOverview.trim() !== ''

  // 创建自定义变量
  const handleCreateVariable = () => {
    if (newVariableKey.trim()) {
      const key = `{{${newVariableKey.trim()}}}`
      addCustomVariable(key, newVariableValue)
      setNewVariableKey('')
      setNewVariableValue('')
      setNewVariableModalOpened(false)
    }
  }

  // 删除自定义变量
  const handleDeleteVariable = (key: string) => {
    removeCustomVariable(key)
  }

  return (
    <div className="variable-picker">
      <Group justify="space-between" mb="xs">
        <Text size="sm" fw={500}>可用变量</Text>
        <Group gap={4}>
          <Tooltip label="新建变量">
            <ActionIcon
              variant="subtle"
              color="green"
              size="sm"
              onClick={() => setNewVariableModalOpened(true)}
            >
              <Plus size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="AI生成项目概况">
            <ActionIcon
              variant="subtle"
              color="blue"
              size="sm"
              onClick={() => setModalOpened(true)}
            >
              <Sparkles size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
      
      <Stack gap="xs">
        {/* 项目基本信息 */}
        <div>
          <Text size="xs" c="dimmed" mb="xs">基本信息</Text>
          <Group gap={4}>
            {/* 项目名称 */}
            <Badge
              variant="light"
              color="blue"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{project_name}}')}
              title="点击复制"
            >
              项目名称
            </Badge>
            
            {/* 项目概况 - 根据状态显示不同颜色 */}
            <Tooltip label={hasProjectOverview ? '点击复制' : '请先AI生成项目概况'}>
              <Badge
                variant="light"
                color={hasProjectOverview ? 'blue' : 'gray'}
                style={{ 
                  cursor: hasProjectOverview ? 'pointer' : 'not-allowed',
                  opacity: hasProjectOverview ? 1 : 0.5
                }}
                onClick={() => {
                  if (hasProjectOverview) {
                    handleCopyVariable('{{project_overview}}')
                  }
                }}
              >
                项目概况
              </Badge>
            </Tooltip>
            
            {/* 建设单位 */}
            <Badge
              variant="light"
              color="blue"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{construction_unit}}')}
              title="点击复制"
            >
              建设单位
            </Badge>
            
            {/* 运营负荷 - 从达产率配置获取 */}
            <Badge
              variant="light"
              color="blue"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{operation_load}}')}
              title="点击复制"
            >
              运营负荷
            </Badge>
          </Group>
        </div>

        {/* 项目类型和地点 */}
        <div>
          <Text size="xs" c="dimmed" mb="xs">项目信息</Text>
          <Group gap={4}>
            <Badge
              variant="light"
              color="cyan"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{project_type}}')}
              title="点击复制"
            >
              项目类型
            </Badge>
            <Badge
              variant="light"
              color="cyan"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{location}}')}
              title="点击复制"
            >
              项目地点
            </Badge>
          </Group>
        </div>

        {/* 财务指标 */}
        <div>
          <Text size="xs" c="dimmed" mb="xs">财务指标</Text>
          <Group gap={4}>
            <Badge
              variant="light"
              color="green"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{roi}}')}
              title="点击复制"
            >
              投资回报率
            </Badge>
            <Badge
              variant="light"
              color="green"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{irr}}')}
              title="点击复制"
            >
              内部收益率
            </Badge>
            <Badge
              variant="light"
              color="green"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{npv}}')}
              title="点击复制"
            >
              净现值
            </Badge>
            <Badge
              variant="light"
              color="green"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{repair_rate}}')}
              title="点击复制"
              rightSection={
                <Tooltip label="查看JSON数据">
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    color="green"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewJson('{{repair_rate}}', '修理费估算表')
                    }}
                  >
                    <Eye size={12} />
                  </ActionIcon>
                </Tooltip>
              }
            >
              修理费率
            </Badge>
          </Group>
        </div>

        {/* 表格数据 */}
        <div>
          <Text size="xs" c="dimmed" mb="xs">表格数据</Text>
          <Group gap={4}>
            <Badge
              variant="light"
              color="violet"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{DATA:investment_estimate}}')}
              title="点击复制"
              rightSection={
                <Tooltip label="查看JSON数据">
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    color="violet"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewJson('{{DATA:investment_estimate}}', '投资估算简表')
                    }}
                  >
                    <Eye size={12} />
                  </ActionIcon>
                </Tooltip>
              }
            >
              投资估算简表
            </Badge>
            <Badge
              variant="light"
              color="violet"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{DATA:depreciation_amortization}}')}
              title="点击复制"
              rightSection={
                <Tooltip label="查看JSON数据">
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    color="violet"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewJson('{{DATA:depreciation_amortization}}', '折旧与摊销估算表')
                    }}
                  >
                    <Eye size={12} />
                  </ActionIcon>
                </Tooltip>
              }
            >
              折旧与摊销估算表
            </Badge>
            <Badge
              variant="light"
              color="violet"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{DATA:total_cost}}')}
              title="点击复制"
              rightSection={
                <Tooltip label="查看JSON数据">
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    color="violet"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewJson('{{DATA:total_cost}}', '总成本费用估算表')
                    }}
                  >
                    <Eye size={12} />
                  </ActionIcon>
                </Tooltip>
              }
            >
              总成本费用估算表
            </Badge>
            <Badge
              variant="light"
              color="violet"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{DATA:salary_welfare}}')}
              title="点击复制"
              rightSection={
                <Tooltip label="查看JSON数据">
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    color="violet"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewJson('{{DATA:salary_welfare}}', '工资及福利费用估算表')
                    }}
                  >
                    <Eye size={12} />
                  </ActionIcon>
                </Tooltip>
              }
            >
              工资及福利费用估算表
            </Badge>
            <Badge
              variant="light"
              color="violet"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{DATA:revenue_tax}}')}
              title="点击复制"
              rightSection={
                <Tooltip label="查看JSON数据">
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    color="violet"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewJson('{{DATA:revenue_tax}}', '营业收入税金及附加估算表')
                    }}
                  >
                    <Eye size={12} />
                  </ActionIcon>
                </Tooltip>
              }
            >
              营业收入税金及附加估算表
            </Badge>
            <Badge
              variant="light"
              color="violet"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{DATA:raw_materials}}')}
              title="点击复制"
              rightSection={
                <Tooltip label="查看JSON数据">
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    color="violet"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewJson('{{DATA:raw_materials}}', '外购原材料费估算表')
                    }}
                  >
                    <Eye size={12} />
                  </ActionIcon>
                </Tooltip>
              }
            >
              外购原材料费估算表
            </Badge>
            <Badge
              variant="light"
              color="violet"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{DATA:fuel_power}}')}
              title="点击复制"
              rightSection={
                <Tooltip label="查看JSON数据">
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    color="violet"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewJson('{{DATA:fuel_power}}', '外购燃料和动力费估算表')
                    }}
                  >
                    <Eye size={12} />
                  </ActionIcon>
                </Tooltip>
              }
            >
              外购燃料和动力费估算表
            </Badge>
            <Badge
              variant="light"
              color="violet"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{DATA:profit_distribution}}')}
              title="点击复制"
              rightSection={
                <Tooltip label="查看JSON数据">
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    color="violet"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewJson('{{DATA:profit_distribution}}', '利润与利润分配表')
                    }}
                  >
                    <Eye size={12} />
                  </ActionIcon>
                </Tooltip>
              }
            >
              利润与利润分配表
            </Badge>
            <Badge
              variant="light"
              color="violet"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{DATA:project_cash_flow}}')}
              title="点击复制"
              rightSection={
                <Tooltip label="查看JSON数据">
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    color="violet"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewJson('{{DATA:project_cash_flow}}', '项目投资现金流量表')
                    }}
                  >
                    <Eye size={12} />
                  </ActionIcon>
                </Tooltip>
              }
            >
              项目投资现金流量表
            </Badge>
            <Badge
              variant="light"
              color="violet"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{DATA:financial_indicators}}')}
              title="点击复制"
              rightSection={
                <Tooltip label="查看JSON数据">
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    color="violet"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewJson('{{DATA:financial_indicators}}', '财务计算指标表')
                    }}
                  >
                    <Eye size={12} />
                  </ActionIcon>
                </Tooltip>
              }
            >
              财务计算指标表
            </Badge>
            <Badge
              variant="light"
              color="violet"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{DATA:loan_repayment}}')}
              title="点击复制"
              rightSection={
                <Tooltip label="查看JSON数据">
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    color="violet"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewJson('{{DATA:loan_repayment}}', '借款还本付息计划表')
                    }}
                  >
                    <Eye size={12} />
                  </ActionIcon>
                </Tooltip>
              }
            >
              借款还本付息计划表
            </Badge>
            <Badge
              variant="light"
              color="violet"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{DATA:loan_repayment_section12}}')}
              title="点击复制"
              rightSection={
                <Tooltip label="查看JSON数据">
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    color="violet"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewJson('{{DATA:loan_repayment_section12}}', '借款还本付息计划表1.2节')
                    }}
                  >
                    <Eye size={12} />
                  </ActionIcon>
                </Tooltip>
              }
            >
              借款还本付息计划表1.2节
            </Badge>
            <Badge
              variant="light"
              color="violet"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{DATA:financial_static_dynamic}}')}
              title="点击复制"
              rightSection={
                <Tooltip label="查看JSON数据">
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    color="violet"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewJson('{{DATA:financial_static_dynamic}}', '财务静态动态指标')
                    }}
                  >
                    <Eye size={12} />
                  </ActionIcon>
                </Tooltip>
              }
            >
              财务静态动态指标
            </Badge>
          </Group>
        </div>

        {/* 表格资源 */}
        <div>
          <Text size="xs" c="dimmed" mb="xs">表格资源</Text>
          <Group gap={4}>
            <Badge variant="light" color="teal">投资估算简表</Badge>
            <Badge variant="light" color="teal">收入成本明细表</Badge>
            <Badge variant="light" color="teal">财务指标汇总表</Badge>
            <Badge variant="light" color="teal">还款计划表</Badge>
          </Group>
        </div>

        {/* 自定义变量 */}
        {Object.keys(customVariables).length > 0 && (
          <div>
            <Text size="xs" c="dimmed" mb="xs">自定义变量</Text>
            <Group gap={4}>
              {Object.entries(customVariables).map(([key, value]) => (
                <Badge
                  key={key}
                  variant="light"
                  color="violet"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleCopyVariable(key)}
                  title="点击复制"
                  rightSection={
                    <ActionIcon
                      size="xs"
                      variant="transparent"
                      color="gray"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteVariable(key)
                      }}
                    >
                      <Trash2 size={10} />
                    </ActionIcon>
                  }
                >
                  {key.replace('{{', '').replace('}}', '')}
                </Badge>
              ))}
            </Group>
          </div>
        )}
      </Stack>
      
      <Text size="xs" c="dimmed" mt="xs">
        💡 点击变量标签即可复制，粘贴到提示词中使用
      </Text>
      
      {/* 项目概况生成Modal */}
      <ProjectOverviewModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
      />

      {/* 新建变量Modal */}
      <Modal
        opened={newVariableModalOpened}
        onClose={() => {
          setNewVariableModalOpened(false)
          setNewVariableKey('')
          setNewVariableValue('')
        }}
        title="新建变量"
        size="sm"
      >
        <Stack gap="md">
          <TextInput
            label="变量名"
            placeholder="例如: my_variable"
            value={newVariableKey}
            onChange={(e) => setNewVariableKey(e.target.value)}
            description="变量名会自动添加 {{ }} 包裹"
          />
          <Textarea
            label="变量值"
            placeholder="输入变量的值..."
            value={newVariableValue}
            onChange={(e) => setNewVariableValue(e.target.value)}
            minRows={3}
          />
          <Group justify="flex-end" mt="md">
            <Button 
              variant="light" 
              onClick={() => {
                setNewVariableModalOpened(false)
                setNewVariableKey('')
                setNewVariableValue('')
              }}
            >
              取消
            </Button>
            <Button 
              onClick={handleCreateVariable}
              disabled={!newVariableKey.trim()}
            >
              创建
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* JSON查看器Modal */}
      <Modal
        opened={jsonViewerOpened}
        onClose={() => setJsonViewerOpened(false)}
        title={jsonViewerTitle}
        size="lg"
      >
        <ScrollArea h={400}>
          <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {jsonViewerData}
          </Code>
        </ScrollArea>
        <Group justify="flex-end" mt="md">
          <Button 
            variant="light" 
            onClick={() => setJsonViewerOpened(false)}
          >
            关闭
          </Button>
          <Button 
            onClick={() => {
              navigator.clipboard.writeText(jsonViewerData)
            }}
          >
            复制JSON
          </Button>
        </Group>
      </Modal>
    </div>
  )
}

export default VariablePicker
