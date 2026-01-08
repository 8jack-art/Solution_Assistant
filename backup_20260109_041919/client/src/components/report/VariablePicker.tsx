import { useState } from 'react'
import { useReportStore } from '../../stores/reportStore'
import { Text, Badge, Group, Stack, ActionIcon, Tooltip } from '@mantine/core'
import { Sparkles } from 'lucide-react'
import { ProjectOverviewModal } from './ProjectOverviewModal'

export function VariablePicker() {
  const { projectOverview } = useReportStore()
  const [modalOpened, setModalOpened] = useState(false)

  const handleCopyVariable = (variableKey: string) => {
    navigator.clipboard.writeText(variableKey)
  }

  // 项目概况变量状态：有内容时蓝色可点击，空时灰色不可点击
  const hasProjectOverview = !!projectOverview && projectOverview.trim() !== ''

  return (
    <div className="variable-picker">
      <Group justify="space-between" mb="xs">
        <Text size="sm" fw={500}>可用变量</Text>
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
            
            {/* 其他基本信息 */}
            <Badge
              variant="light"
              color="blue"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{construction_unit}}')}
              title="点击复制"
            >
              建设单位
            </Badge>
            <Badge
              variant="light"
              color="blue"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{total_investment}}')}
              title="点击复制"
            >
              总投资额
            </Badge>
            <Badge
              variant="light"
              color="blue"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{construction_years}}')}
              title="点击复制"
            >
              建设期
            </Badge>
            <Badge
              variant="light"
              color="blue"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCopyVariable('{{operation_years}}')}
              title="点击复制"
            >
              运营期
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
      </Stack>
      
      <Text size="xs" c="dimmed" mt="xs">
        💡 点击变量标签即可复制，粘贴到提示词中使用
      </Text>
      
      {/* 项目概况生成Modal */}
      <ProjectOverviewModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
      />
    </div>
  )
}

export default VariablePicker
