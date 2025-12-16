import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { projectApi, llmConfigApi } from '@/lib/api'
import { InvestmentProject } from '@/types'
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  TextInput,
  Textarea,
  Select,
  Card,
  Group,
  Stack,
  NumberInput,
  Grid,
  Checkbox,
  Alert,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMediaQuery } from '@mantine/hooks'
import LoadingOverlay from '@/components/LoadingOverlay'

const ProjectForm: React.FC = () => {
  const [formData, setFormData] = useState({
    project_name: '',
    total_investment: 0,
    project_info: '',
    construction_years: 3,
    operation_years: 17,
    loan_ratio: 80, // 百分数形式，默认80%
    loan_interest_rate: 4.9, // 百分数形式
    // 用地信息
    land_mode: 'A' as 'A' | 'B' | 'C' | 'D',
    land_area: 0,
    land_unit_price: 0,
    land_cost: 0,
    land_remark: '',
    land_lease_area: 0,
    land_lease_unit_price: 0,
    land_purchase_area: 0,
    land_purchase_unit_price: 0,
    seedling_compensation: 0, // 青苗补偿费
  })
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [landModeAnalyzing, setLandModeAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [isEdit, setIsEdit] = useState(false)
  const [project, setProject] = useState<InvestmentProject | null>(null)
  
  const { id } = useParams()
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')


  // 自动计算土地费用和生成备注
  const calculateLandCost = (data: typeof formData) => {
    let cost = 0
    let remark = ''

    switch (data.land_mode) {
      case 'A': // 一次性征地
        const landCostA = data.land_area * data.land_unit_price
        const seedlingCostA = data.land_area * (data.seedling_compensation || 0)
        cost = landCostA + seedlingCostA
        if (data.seedling_compensation && data.seedling_compensation > 0) {
          remark = `按一次性征地模式。征地费：${data.land_area}亩×${data.land_unit_price}万元/亩=${landCostA.toFixed(2)}万元。青苗补偿费：${data.land_area}亩×${data.seedling_compensation}万元/亩=${seedlingCostA.toFixed(2)}万元。`
        } else {
          remark = `按一次性征地模式，${data.land_area}亩×${data.land_unit_price}万元/亩估算。`
        }
        break
      case 'B': // 长期租赁
        cost = data.construction_years * data.land_unit_price * data.land_area
        remark = `按租地模式估算，计入建设期${data.construction_years}年租金，${data.land_area}亩×${data.land_unit_price}万元/亩/年。`
        break
      case 'C': // 无土地需求
        cost = 0
        remark = '纯软件类项目，无土地需求。'
        break
      case 'D': // 混合用地
        const leaseCost = data.construction_years * data.land_lease_unit_price * data.land_lease_area
        const purchaseLandCost = data.land_purchase_area * data.land_purchase_unit_price
        const seedlingCostD = data.land_purchase_area * (data.seedling_compensation || 0)
        cost = leaseCost + purchaseLandCost + seedlingCostD
        if (data.seedling_compensation && data.seedling_compensation > 0) {
          remark = `混合用地模式。租赁部分：${data.land_lease_area}亩×${data.land_lease_unit_price}万元/亩/年×${data.construction_years}年=${leaseCost.toFixed(2)}万元；征地部分：征地费${data.land_purchase_area}亩×${data.land_purchase_unit_price}万元/亩=${purchaseLandCost.toFixed(2)}万元，青苗补偿费${data.land_purchase_area}亩×${data.seedling_compensation}万元/亩=${seedlingCostD.toFixed(2)}万元。`
        } else {
          remark = `混合用地模式。租赁部分：${data.land_lease_area}亩×${data.land_lease_unit_price}万元/亩/年×${data.construction_years}年=${leaseCost.toFixed(2)}万元；征地部分：${data.land_purchase_area}亩×${data.land_purchase_unit_price}万元/亩=${purchaseLandCost.toFixed(2)}万元。`
        }
        break
    }

    return { cost: Number(cost.toFixed(2)), remark }
  }

  // 监听土地相关字段变化，自动重算
  useEffect(() => {
    const { cost, remark } = calculateLandCost(formData)
    if (cost !== formData.land_cost || remark !== formData.land_remark) {
      setFormData(prev => ({
        ...prev,
        land_cost: cost,
        land_remark: remark
      }))
    }
  }, [
    formData.land_mode,
    formData.land_area,
    formData.land_unit_price,
    formData.construction_years,
    formData.land_lease_area,
    formData.land_lease_unit_price,
    formData.land_purchase_area,
    formData.land_purchase_unit_price,
    formData.seedling_compensation
  ])

  useEffect(() => {
    if (id) {
      setIsEdit(true)
      loadProject()
    }
  }, [id])

  const loadProject = async () => {
    try {
      const response = await projectApi.getById(id!)
      if (response.success && response.data?.project) {
        const projectData = response.data.project
        setProject(projectData)
        setFormData({
          project_name: projectData.project_name,
          total_investment: projectData.total_investment,
          project_info: projectData.project_info || '',
          construction_years: projectData.construction_years,
          operation_years: projectData.operation_years,
          loan_ratio: projectData.loan_ratio * 100, // 转换为百分数
          loan_interest_rate: projectData.loan_interest_rate * 100, // 转换为百分数
          land_mode: projectData.land_mode || 'A',
          land_area: projectData.land_area || 0,
          land_unit_price: projectData.land_unit_price || 0,
          land_cost: projectData.land_cost || 0,
          land_remark: projectData.land_remark || '',
          land_lease_area: projectData.land_lease_area || 0,
          land_lease_unit_price: projectData.land_lease_unit_price || 0,
          land_purchase_area: projectData.land_purchase_area || 0,
          land_purchase_unit_price: projectData.land_purchase_unit_price || 0,
          seedling_compensation: projectData.seedling_compensation || 0,
        })
      } else {
        notifications.show({
          title: '❌ 加载失败',
          message: response.error || '加载项目失败',
          color: 'red',
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '❌ 加载失败',
        message: error.response?.data?.error || '加载项目失败',
        color: 'red',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let response
      // 将百分数转换为小数提交
      const submitData = {
        ...formData,
        loan_ratio: formData.loan_ratio / 100,
        loan_interest_rate: formData.loan_interest_rate / 100,
      }
      if (isEdit && id) {
        response = await projectApi.update(id, submitData)
      } else {
        response = await projectApi.create(submitData)
      }

      if (response.success) {
        notifications.show({
          title: '✅ 操作成功',
          message: isEdit ? '项目已更新' : '项目已创建',
          color: 'green',
        })

        if (isEdit && id) {
          navigate(`/investment/${id}`)
        } else {
          const createdProjectId = response.data?.project?.id
          if (createdProjectId) {
            navigate(`/investment/${createdProjectId}`, {
              state: { autoGenerate: true }
            })
          } else {
            navigate('/dashboard')
          }
        }
      } else {
        notifications.show({
          title: '❌ 操作失败',
          message: response.error || '保存项目失败',
          color: 'red',
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '❌ 操作失败',
        message: error.response?.data?.error || error.response?.data?.message || '保存项目失败',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!formData.project_info.trim()) {
      notifications.show({
        title: '请先填写项目信息',
        message: '需要项目信息才能进行智能分析',
        color: 'red',
      })
      return
    }

    setAnalyzing(true)
    try {
      const response = await llmConfigApi.analyzeProjectInfo(formData.project_info)
      if (response.success && response.data?.analyzed_data) {
        const analyzedData = response.data.analyzed_data
        setFormData(prev => ({
          ...prev,
          project_name: analyzedData.project_name || prev.project_name,
          total_investment: analyzedData.total_investment || prev.total_investment,
          construction_years: analyzedData.construction_years || prev.construction_years,
          operation_years: analyzedData.operation_years || prev.operation_years,
          loan_ratio: analyzedData.loan_ratio || prev.loan_ratio,
          loan_interest_rate: analyzedData.loan_interest_rate || prev.loan_interest_rate,
        }))
        const summary = `项目：${analyzedData.project_name || '未识别'}
投资：${analyzedData.total_investment || 0}万元
建设期：${analyzedData.construction_years || 3}年
运营期：${analyzedData.operation_years || 17}年
贷款比例：${analyzedData.loan_ratio || 70}%
贷款利率：${analyzedData.loan_interest_rate || 4.9}%`
        notifications.show({
          title: '✨ 智能分析完成',
          message: `使用模型：${response.data.config_name}\n\n${summary}`,
          color: 'green',
          autoClose: 5000,
        })
      } else {
        notifications.show({
          title: '分析失败',
          message: response.error || '无法分析项目信息',
          color: 'red',
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '分析失败',
        message: error.response?.data?.error || '请检查LLM配置是否正确',
        color: 'red',
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleLandModeAnalyze = async (mode: 'A' | 'B' | 'C' | 'D') => {
    // C模式直接清空数据，不调用AI
    if (mode === 'C') {
      setFormData(prev => ({
        ...prev,
        land_mode: mode,
        land_area: 0,
        land_unit_price: 0,
        land_lease_area: 0,
        land_lease_unit_price: 0,
        land_purchase_area: 0,
        land_purchase_unit_price: 0,
        seedling_compensation: 0,
      }))
      return
    }

    if (!formData.project_info.trim()) {
      notifications.show({
        title: '请先填写项目信息',
        message: '需要项目信息才能进行用地分析',
        color: 'red',
      })
      // 恢复原来的模式
      setFormData(prev => ({ ...prev, land_mode: prev.land_mode }))
      return
    }

    setLandModeAnalyzing(true)
    try {
      const response = await llmConfigApi.analyzeProjectInfo(formData.project_info)
      if (response.success && response.data?.analyzed_data) {
        const analyzedData = response.data.analyzed_data
        // 填充用地信息，青苗补偿费保持为0
        setFormData(prev => ({
          ...prev,
          land_mode: mode,
          land_area: analyzedData.land_area || 0,
          land_unit_price: analyzedData.land_unit_price || 0,
          land_lease_area: analyzedData.land_lease_area || 0,
          land_lease_unit_price: analyzedData.land_lease_unit_price || 0,
          land_purchase_area: analyzedData.land_purchase_area || 0,
          land_purchase_unit_price: analyzedData.land_purchase_unit_price || 0,
          seedling_compensation: 0, // 默认为0，需用户手动填写
        }))
        
        // 构建大模型决策内容
        const modeNames = {
          'A': '一次性征地',
          'B': '长期租赁',
          'C': '无土地需求',
          'D': '混合用地'
        }
        let decisionDetails = `🤖 大模型决策：${modeNames[mode]}\n\n`
        
        if (mode === 'A') {
          decisionDetails += `用地面积：${analyzedData.land_area || 0}亩\n`
          decisionDetails += `单价：${analyzedData.land_unit_price || 0}万元/亩`
        } else if (mode === 'B') {
          decisionDetails += `租赁面积：${analyzedData.land_area || 0}亩\n`
          decisionDetails += `租金单价：${analyzedData.land_unit_price || 0}万元/亩/年`
        } else if (mode === 'D') {
          decisionDetails += `租赁部分：${analyzedData.land_lease_area || 0}亩 × ${analyzedData.land_lease_unit_price || 0}万元/亩/年\n`
          decisionDetails += `征地部分：${analyzedData.land_purchase_area || 0}亩 × ${analyzedData.land_purchase_unit_price || 0}万元/亩`
        }
        
        notifications.show({
          title: '✨ 用地分析完成',
          message: decisionDetails,
          color: 'green',
        })
      } else {
        notifications.show({
          title: '分析失败',
          message: response.error || '无法分析用地信息',
          color: 'red',
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '分析失败',
        message: error.response?.data?.error || '请检查LLM配置是否正确',
        color: 'red',
      })
    } finally {
      setLandModeAnalyzing(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F7FA' }}>
      {/* 统一Loading动画 */}
      <LoadingOverlay 
        visible={analyzing || landModeAnalyzing} 
        message={analyzing ? '智能分析项目信息' : '分析用地模式'}
      />
      
      {/* Header - 符合UI规范：高度50px，白色背景，底部边框#E5E6EB */}
      <Paper shadow="none" p="0" style={{ height: '50px', borderBottom: '1px solid #E5E6EB', backgroundColor: '#FFFFFF' }}>
        <Container size="xl" px={isMobile ? 'sm' : 'lg'} style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title order={isMobile ? 6 : 3} c="#1D2129" style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 600 }}>
            {isEdit ? '编辑项目' : '新建项目'}
          </Title>
          <Button 
            variant="subtle" 
            size={isMobile ? 'xs' : 'sm'}
            onClick={() => navigate('/dashboard')}
            style={{ height: isMobile ? '28px' : '32px', padding: '4px 8px', color: '#1D2129', backgroundColor: 'transparent' }}
          >
            返回
          </Button>
        </Container>
      </Paper>

      <Container size="xl" py={isMobile ? 'md' : 'lg'} px={isMobile ? 'sm' : 'lg'} style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <Grid gutter={isMobile ? 'md' : 'lg'}>
          {/* 项目基本信息 */}
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Card shadow="sm" padding={isMobile ? 'lg' : 'xl'} radius="sm" withBorder style={{ borderColor: '#E5E6EB', borderRadius: '4px', height: '710px' }}>
              <Stack gap={isMobile ? 'md' : 'lg'}>
                <div>
                  <Title order={4} c="#1D2129" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>项目基本信息</Title>
                  <Text size="xs" c="#86909C" style={{ fontSize: '12px' }}>请填写项目的基本信息和投资参数</Text>
                </div>
              <form onSubmit={handleSubmit}>
                <Stack gap="md">
                  <TextInput
                    label="项目名称 *"
                    value={formData.project_name}
                    onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                    required
                    size="md"
                    styles={{
                      input: { height: '42px', fontSize: '15px' }
                    }}
                  />

                  <Grid gutter="md">
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <NumberInput
                        label="目标总投资 (万元) *"
                        value={formData.total_investment}
                        onChange={(val) => setFormData({ ...formData, total_investment: Number(val) || 0 })}
                        decimalScale={2}
                        required
                        size="md"
                        styles={{
                          input: { height: '42px', fontSize: '15px' }
                        }}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <NumberInput
                        label="建设年限 (年)"
                        value={formData.construction_years}
                        onChange={(val) => setFormData({ ...formData, construction_years: Number(val) || 1 })}
                        min={1}
                        max={10}
                        size="md"
                        styles={{
                          input: { height: '42px', fontSize: '15px' }
                        }}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <NumberInput
                        label="运营年限 (年)"
                        value={formData.operation_years}
                        onChange={(val) => setFormData({ ...formData, operation_years: Number(val) || 17 })}
                        min={1}
                        max={50}
                        size="md"
                        styles={{
                          input: { height: '42px', fontSize: '15px' }
                        }}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <NumberInput
                        label="贷款比例 (%)"
                        value={formData.loan_ratio}
                        onChange={(val) => setFormData({ ...formData, loan_ratio: Number(val) || 0 })}
                        decimalScale={1}
                        min={0}
                        max={100}
                        size="md"
                        styles={{
                          input: { height: '42px', fontSize: '15px' }
                        }}
                      />
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <NumberInput
                        label="贷款利率 (%)"
                        value={formData.loan_interest_rate}
                        onChange={(val) => setFormData({ ...formData, loan_interest_rate: Number(val) || 0 })}
                        decimalScale={2}
                        min={0}
                        max={100}
                        size="md"
                        styles={{
                          input: { height: '42px', fontSize: '15px' }
                        }}
                      />
                    </Grid.Col>
                  </Grid>

                  <div>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" c="#1D2129" style={{ fontSize: '14px', fontWeight: 400 }}>项目信息</Text>
                      <Button 
                        type="button" 
                        variant="filled"
                        size="xs"
                        onClick={handleAnalyze}
                        disabled={analyzing || !formData.project_info.trim()}
                        style={{ 
                          height: '28px', 
                          backgroundColor: '#00C48C', 
                          color: '#FFFFFF',
                          borderRadius: '4px',
                          fontSize: '12px',
                          padding: '0 12px'
                        }}
                      >
                        {analyzing ? '分析中...' : '✨ 智能分析'}
                      </Button>
                    </Group>
                    <Textarea
                      value={formData.project_info}
                      onChange={(e) => setFormData({ ...formData, project_info: e.target.value })}
                      minRows={6}
                      autosize
                      placeholder="请输入项目的详细信息，例如：本项目为XX工程，总投资1000万元，建设周期3年，运营期20年，贷款比例70%，年利率4.9%..."
                      size="md"
                      styles={{
                        input: { 
                          fontSize: '14px',
                          lineHeight: '1.6'
                        }
                      }}
                    />
                    <Text size="xs" c="#86909C" mt="xs" style={{ fontSize: '12px' }}>
                      填写项目信息后，点击“智能分析”按钮可自动提取并填充上方字段
                    </Text>
                  </div>
                </Stack>
              </form>
              </Stack>
            </Card>
          </Grid.Col>

          {/* 用地信息模块 */}
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Card shadow="sm" padding={isMobile ? 'md' : 'lg'} radius="sm" withBorder style={{ borderColor: '#E5E6EB', borderRadius: '4px', height: '710px' }}>
              <Stack gap={isMobile ? 'md' : 'lg'}>
                <div>
                  <Title order={4} c="#1D2129" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>用地信息</Title>
                  <Text size="xs" c="#86909C" style={{ fontSize: '12px' }}>选择用地模式AI将自动分析并填充</Text>
                </div>
              <Stack gap="sm">
                <Select
                  label="用地模式 *"
                  value={formData.land_mode}
                  onChange={(val) => {
                    const newMode = val as 'A' | 'B' | 'C' | 'D'
                    setFormData({ ...formData, land_mode: newMode })
                    // 自动调用AI分析
                    handleLandModeAnalyze(newMode)
                  }}
                  disabled={landModeAnalyzing}
                  data={[
                    { value: 'A', label: 'A - 一次性征地' },
                    { value: 'B', label: 'B - 长期租赁用地' },
                    { value: 'C', label: 'C - 无土地需求' },
                    { value: 'D', label: 'D - 混合用地模式' },
                  ]}
                  required
                />

                {formData.land_mode !== 'C' && formData.land_mode !== 'D' && (
                  <Grid gutter="md">
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <NumberInput
                        label="土地面积 (亩)"
                        value={formData.land_area}
                        onChange={(val) => setFormData({ ...formData, land_area: Number(val) || 0 })}
                        decimalScale={2}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <NumberInput
                        label={formData.land_mode === 'A' ? '征地单价 (万元/亩)' : '年租金单价 (万元/亩/年)'}
                        value={formData.land_unit_price}
                        onChange={(val) => setFormData({ ...formData, land_unit_price: Number(val) || 0 })}
                        decimalScale={2}
                      />
                    </Grid.Col>
                    {formData.land_mode === 'A' && (
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <NumberInput
                          label="青苗补偿费 (万元/亩)"
                          value={formData.seedling_compensation}
                          onChange={(val) => setFormData({ ...formData, seedling_compensation: Number(val) || 0 })}
                          decimalScale={2}
                        />
                      </Grid.Col>
                    )}
                  </Grid>
                )}

                {formData.land_mode === 'D' && (
                  <>
                    <Text size="sm" fw={600} c="#1D2129">租赁部分</Text>
                    <Grid gutter="md">
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <NumberInput
                          label="租赁面积 (亩)"
                          value={formData.land_lease_area}
                          onChange={(val) => setFormData({ ...formData, land_lease_area: Number(val) || 0 })}
                          decimalScale={2}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <NumberInput
                          label="租赁单价 (万元/亩/年)"
                          value={formData.land_lease_unit_price}
                          onChange={(val) => setFormData({ ...formData, land_lease_unit_price: Number(val) || 0 })}
                          decimalScale={2}
                        />
                      </Grid.Col>
                    </Grid>
                    <Text size="sm" fw={600} c="#1D2129" mt="md">征地部分</Text>
                    <Grid gutter="md">
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <NumberInput
                          label="征地面积 (亩)"
                          value={formData.land_purchase_area}
                          onChange={(val) => setFormData({ ...formData, land_purchase_area: Number(val) || 0 })}
                          decimalScale={2}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <NumberInput
                          label="征地单价 (万元/亩)"
                          value={formData.land_purchase_unit_price}
                          onChange={(val) => setFormData({ ...formData, land_purchase_unit_price: Number(val) || 0 })}
                          decimalScale={2}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <NumberInput
                          label="青苗补偿费 (万元/亩)"
                          value={formData.seedling_compensation}
                          onChange={(val) => setFormData({ ...formData, seedling_compensation: Number(val) || 0 })}
                          decimalScale={2}
                        />
                      </Grid.Col>
                    </Grid>
                  </>
                )}

                <NumberInput
                  label={<Text size="sm">用地费用 (万元) <Text span size="xs" c="#86909C">[自动计算]</Text></Text>}
                  value={formData.land_cost}
                  disabled
                  styles={{ input: { backgroundColor: '#F5F7FA', cursor: 'not-allowed' } }}
                  decimalScale={2}
                />
                <Textarea
                  label={<Text size="sm">用地信息备注 <Text span size="xs" c="#86909C">[自动生成]</Text></Text>}
                  value={formData.land_remark}
                  disabled
                  minRows={4}
                  styles={{ input: { backgroundColor: '#F5F7FA', cursor: 'not-allowed' } }}
                />
              </Stack>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* 提交按钮区域 */}
        <Group justify="flex-end" mt={isMobile ? 'md' : 'lg'} gap={isMobile ? 'xs' : 'md'}>
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            size={isMobile ? 'sm' : 'md'}
            style={{ 
              flex: isMobile ? 1 : 'none',
              height: '36px',
              borderRadius: '4px',
              borderColor: '#E5E6EB',
              color: '#1D2129',
              fontSize: '14px'
            }}
          >
            取消
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            size={isMobile ? 'sm' : 'md'}
            style={{ 
              flex: isMobile ? 1 : 'none',
              height: '36px',
              backgroundColor: '#1E6FFF',
              color: '#FFFFFF',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 500,
              padding: '0 24px'
            }}
          >
            {loading ? '保存中...' : (isEdit ? '更新' : '创建')}
          </Button>
        </Group>

        {isEdit && project && (
          <Card shadow="sm" padding={isMobile ? 'md' : 'lg'} radius="sm" withBorder mt="lg" style={{ borderColor: '#E5E6EB', borderRadius: '4px' }}>
            <Stack gap="md">
              <Title order={4} style={{ fontSize: '16px', fontWeight: 600, color: '#1D2129' }}>项目操作</Title>
              <Group gap={isMobile ? 'xs' : 'sm'} wrap={isMobile ? 'wrap' : 'nowrap'}>
                <Button 
                  variant="filled"
                  onClick={() => navigate(`/investment/${project.id}`)}
                  style={{ 
                    flex: isMobile ? 1 : 'none',
                    height: '36px',
                    backgroundColor: '#1E6FFF',
                    color: '#FFFFFF',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  投资估算
                </Button>
                {project.is_locked ? (
                  <Button 
                    variant="outline"
                    onClick={async () => {
                      if (window.confirm('确定要解锁此项目吗？')) {
                        try {
                          const response = await projectApi.unlock(project.id)
                          if (response.success) {
                            notifications.show({ title: '✅ 项目已解锁', message: '', color: 'green' })
                            loadProject()
                          } else {
                            notifications.show({ title: '❌ 解锁失败', message: response.error || '', color: 'red' })
                          }
                        } catch (error: any) {
                          notifications.show({ title: '❌ 解锁失败', message: error.response?.data?.error || '操作失败', color: 'red' })
                        }
                      }
                    }}
                    style={{ 
                      flex: isMobile ? 1 : 'none',
                      height: '36px',
                      borderRadius: '4px',
                      borderColor: '#E5E6EB',
                      color: '#1D2129',
                      fontSize: '14px'
                    }}
                  >
                    解锁项目
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    onClick={async () => {
                      if (window.confirm('确定要锁定此项目吗？锁定后将无法修改。')) {
                        try {
                          const response = await projectApi.lock(project.id)
                          if (response.success) {
                            notifications.show({ title: '✅ 项目已锁定', message: '', color: 'green' })
                            loadProject()
                          } else {
                            notifications.show({ title: '❌ 锁定失败', message: response.error || '', color: 'red' })
                          }
                        } catch (error: any) {
                          notifications.show({ title: '❌ 锁定失败', message: error.response?.data?.error || '操作失败', color: 'red' })
                        }
                      }
                    }}
                    style={{ 
                      flex: isMobile ? 1 : 'none',
                      height: '36px',
                      borderRadius: '4px',
                      borderColor: '#E5E6EB',
                      color: '#1D2129',
                      fontSize: '14px'
                    }}
                  >
                    锁定项目
                  </Button>
                )}
                <Button 
                  color="red"
                  onClick={async () => {
                    if (window.confirm('确定要删除此项目吗？此操作不可恢复。')) {
                      try {
                        const response = await projectApi.delete(project.id)
                        if (response.success) {
                          notifications.show({ title: '✅ 项目已删除', message: '', color: 'green' })
                          setTimeout(() => navigate('/dashboard'), 1000)
                        } else {
                          notifications.show({ title: '❌ 删除失败', message: response.error || '', color: 'red' })
                        }
                      } catch (error: any) {
                        notifications.show({ title: '❌ 删除失败', message: error.response?.data?.error || '操作失败', color: 'red' })
                      }
                    }
                  }}
                  disabled={project.is_locked}
                  style={{ 
                    flex: isMobile ? 1 : 'none',
                    height: '36px',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  删除项目
                </Button>
              </Group>
            </Stack>
          </Card>
        )}
      </Container>
    </div>
  )
}

export default ProjectForm