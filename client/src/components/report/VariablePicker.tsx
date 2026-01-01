import { useReportStore } from '../../stores/reportStore'
import { Text, Badge, Group, Stack, Paper } from '@mantine/core'

export function VariablePicker() {
  const { availableVariables } = useReportStore()

  const handleCopyVariable = (variableKey: string) => {
    navigator.clipboard.writeText(variableKey)
  }

  return (
    <div className="variable-picker">
      <Text size="sm" fw={500} mb="xs">可用变量</Text>
      
      {availableVariables.length === 0 ? (
        <Text size="xs" c="dimmed">
          加载项目数据后可用变量会自动显示
        </Text>
      ) : (
        <Stack gap="xs">
          {/* 项目基本信息 */}
          <div>
            <Text size="xs" c="dimmed" mb="xs">基本信息</Text>
            <Group gap={4}>
              {availableVariables
                .filter(v => ['{{project_name}}', '{{total_investment}}', '{{construction_years}}', '{{operation_years}}'].includes(v.key))
                .map((variable) => (
                  <Badge
                    key={variable.key}
                    variant="light"
                    color="blue"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleCopyVariable(variable.key)}
                    title="点击复制"
                  >
                    {variable.label}
                  </Badge>
                ))}
            </Group>
          </div>

          {/* 财务指标 */}
          <div>
            <Text size="xs" c="dimmed" mb="xs">财务指标</Text>
            <Group gap={4}>
              {availableVariables
                .filter(v => ['{{roi}}', '{{irr}}', '{{npv}}'].includes(v.key))
                .map((variable) => (
                  <Badge
                    key={variable.key}
                    variant="light"
                    color="green"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleCopyVariable(variable.key)}
                    title="点击复制"
                  >
                    {variable.label}
                  </Badge>
                ))}
            </Group>
          </div>

          {/* 其他变量 */}
          <div>
            <Text size="xs" c="dimmed" mb="xs">其他</Text>
            <Group gap={4}>
              {availableVariables
                .filter(v => !['{{project_name}}', '{{total_investment}}', '{{construction_years}}', '{{operation_years}}', '{{roi}}', '{{irr}}', '{{npv}}'].includes(v.key))
                .map((variable) => (
                  <Badge
                    key={variable.key}
                    variant="light"
                    color="gray"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleCopyVariable(variable.key)}
                    title="点击复制"
                  >
                    {variable.label}
                  </Badge>
                ))}
            </Group>
          </div>
        </Stack>
      )}
      
      <Text size="xs" c="dimmed" mt="xs">
        点击变量标签即可复制，粘贴到提示词中使用
      </Text>
    </div>
  )
}

export default VariablePicker
