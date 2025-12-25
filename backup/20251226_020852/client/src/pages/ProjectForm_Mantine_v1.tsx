import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  NumberInput,
  Textarea,
  Button,
  Group,
  Stack,
  Grid,
  Card,
  Select,
  Loader,
  Center,
  Divider,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import { projectApi, llmConfigApi } from '@/lib/api'
import { InvestmentProject } from '@/types'

const ProjectForm: React.FC = () => {
  const [formData, setFormData] = useState({
    project_name: '',
    total_investment: 0,
    project_info: '',
    construction_years: 3,
    operation_years: 17,
    loan_ratio: 70,
    loan_interest_rate: 4.9,
    land_mode: 'A' as 'A' | 'B' | 'C' | 'D',
    land_area: 0,
    land_unit_price: 0,
    land_cost: 0,
    land_remark: '',
    land_lease_area: 0,
    land_lease_unit_price: 0,
    land_purchase_area: 0,
    land_purchase_unit_price: 0,
    seedling_compensation: 0,
  })
  
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [landModeAnalyzing, setLandModeAnalyzing] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [project, setProject] = useState<InvestmentProject | null>(null)
  
  const { id } = useParams()
  const navigate = useNavigate()

  // 计算土地费用
  const calculateLandCost = (data: typeof formData) => {
    let cost = 0
    let remark = ''

    switch (data.land_mode) {
      case 'A':
        const landCostA = data.land_area * data.land_unit_price
        const seedlingCostA = data.land_area * (data.seedling_compensation || 0)
        cost = landCostA + seedlingCostA
        if (data.seedling_compensation && data.seedling_compensation > 0) {
          remark = `按一次性征地模式。征地费：${data.land_area}亩×${data.land_unit_price}万元/亩=${landCostA.toFixed(2)}万元。青苗补偿费：${data.land_area}亩×${data.seedling_compensation}万元/亩=${seedlingCostA.toFixed(2)}万元。`
        } else {
          remark = `按一次性征地模式，${data.land_area}亩×${data.land_unit_price}万元/亩估算。`
        }
        break
      case 'B':
        cost = data.construction_years * data.land_unit_price * data.land_area
        remark = `按租地模式估算，计入建设期${data.construction_years}年租金，${data.land_area}亩×${data.land_unit_price}万元/亩/年。`
        break
      case 'C':
        cost = 0
        remark = '纯软件类项目，无土地需求。'
        break
      case 'D':
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

  // 监听土地相关字段变化
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
          loan_ratio: projectData.loan_ratio * 100,
          loan_interest_rate: projectData.loan_interest_rate * 100,
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
          title: '加载失败',
          message: response.error || '加载项目失败',
          color: 'red',
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '加载失败',
        message: error.response?.data?.error || '加载项目失败',
        color: 'red',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const submitData = {
        ...formData,
        loan_ratio: formData.loan_ratio / 100,
        loan_interest_rate: formData.loan_interest_rate / 100,
      }
      
      let response
      if (isEdit && id) {
        response = await projectApi.update(id, submitData)
      } else {
        response = await projectApi.create(submitData)
      }

      if (response.success) {
        notifications.show({
          title: '操作成功',
          message: isEdit ? '项目已更新' : '项目已创建',
          color: 'green',
        })
        setTimeout(() => navigate('/dashboard'), 1000)
      } else {
        notifications.show({
          title: '操作失败',
          message: response.error || '保存项目失败',
          color: 'red',
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '操作失败',
        message: error.response?.data?.error || '保存项目失败',
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
        color: 'orange',
      })
      return
    }

    setAnalyzing(true)
    try {
      const response = await llmConfigApi.analyzeProject({ project_info: formData.project_info })
      
      if (response.success && response.data) {
        const analysis = response.data.analysis
        setFormData(prev => ({
          ...prev,
          total_investment: analysis.total_investment || prev.total_investment,
          construction_years: analysis.construction_years || prev.construction_years,
          operation_years: analysis.operation_years || prev.operation_years,
          loan_ratio: analysis.loan_ratio ? analysis.loan_ratio * 100 : prev.loan_ratio,
          loan_interest_rate: analysis.loan_interest_rate ? analysis.loan_interest_rate * 100 : prev.loan_interest_rate,
        }))
        
        notifications.show({
          title: '分析完成',
          message: 'AI已成功分析项目信息',
          color: 'green',
        })
      } else {
        notifications.show({
          title: '分析失败',
          message: response.error || 'AI分析失败',
          color: 'red',
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '分析失败',
        message: error.response?.data?.error || 'AI分析失败',
        color: 'red',
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleLandModeAnalyze = async (mode: string) => {
    if (mode === 'C') {
      // C模式直接清空
      setFormData(prev => ({
        ...prev,
        land_area: 0,
        land_unit_price: 0,
        land_cost: 0,
        land_remark: '纯软件类项目，无土地需求。',
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
        color: 'orange',
      })
      return
    }

    setLandModeAnalyzing(true)
    try {
      const response = await llmConfigApi.analyzeLandInfo({ 
        project_info: formData.project_info,
        land_mode: mode as any
      })
      
      if (response.success && response.data) {
        const land = response.data.land_info
        setFormData(prev => ({
          ...prev,
          land_area: land.land_area || 0,
          land_unit_price: land.land_unit_price || 0,
          land_lease_area: land.land_lease_area || 0,
          land_lease_unit_price: land.land_lease_unit_price || 0,
          land_purchase_area: land.land_purchase_area || 0,
          land_purchase_unit_price: land.land_purchase_unit_price || 0,
        }))
        
        notifications.show({
          title: '分析完成',
          message: 'AI已成功分析用地信息',
          color: 'green',
        })
      } else {
        notifications.show({
          title: '分析失败',
          message: response.error || 'AI分析失败',
          color: 'red',
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '分析失败',
        message: error.response?.data?.error || 'AI分析失败',
        color: 'red',
      })
    } finally {
      setLandModeAnalyzing(false)
    }
  }

  const handleLock = async () => {
    try {
      const response = await projectApi.lock(id!)
      if (response.success) {
        notifications.show({
          title: '项目已锁定',
          message: '项目已成功锁定',
          color: 'green',
        })
        loadProject()
      } else {
        notifications.show({
          title: '锁定失败',
          message: response.error || '操作失败',
          color: 'red',
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '锁定失败',
        message: error.response?.data?.error || '操作失败',
        color: 'red',
      })
    }
  }

  const handleUnlock = async () => {
    try {
      const response = await projectApi.unlock(id!)
      if (response.success) {
        notifications.show({
          title: '项目已解锁',
          message: '项目已成功解锁',
          color: 'green',
        })
        loadProject()
      } else {
        notifications.show({
          title: '解锁失败',
          message: response.error || '操作失败',
          color: 'red',
        })
      }
    } catch (error: any) {
      notifications.show({
        title: '解锁失败',
        message: error.response?.data?.error || '操作失败',
        color: 'red',
      })
    }
  }

  const handleDelete = () => {
    modals.openConfirmModal({
      title: '确认删除',
      children: <Text size="sm">确定要删除这个项目吗？此操作不可恢复。</Text>,
      labels: { confirm: '确认删除', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const response = await projectApi.delete(id!)
          if (response.success) {
            notifications.show({
              title: '项目已删除',
              message: '项目已成功删除',
              color: 'green',
            })
            navigate('/dashboard')
          } else {
            notifications.show({
              title: '删除失败',
              message: response.error || '操作失败',
              color: 'red',
            })
          }
        } catch (error: any) {
          notifications.show({
            title: '删除失败',
            message: error.response?.data?.error || '操作失败',
            color: 'red',
          })
        }
      },
    })
  }

  const renderLandModeFields = () => {
    switch (formData.land_mode) {
      case 'A':
        return (
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="土地面积（亩）"
                value={formData.land_area}
                onChange={(val) => setFormData({ ...formData, land_area: val as number })}
                min={0}
                decimalScale={2}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="土地单价（万元/亩）"
                value={formData.land_unit_price}
                onChange={(val) => setFormData({ ...formData, land_unit_price: val as number })}
                min={0}
                decimalScale={2}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <NumberInput
                label="青苗补偿费（万元/亩）"
                description="默认为0，需要手动填写"
                value={formData.seedling_compensation}
                onChange={(val) => setFormData({ ...formData, seedling_compensation: val as number })}
                min={0}
                decimalScale={2}
              />
            </Grid.Col>
          </Grid>
        )
      case 'B':
        return (
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="土地面积（亩）"
                value={formData.land_area}
                onChange={(val) => setFormData({ ...formData, land_area: val as number })}
                min={0}
                decimalScale={2}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="年租金（万元/亩/年）"
                value={formData.land_unit_price}
                onChange={(val) => setFormData({ ...formData, land_unit_price: val as number })}
                min={0}
                decimalScale={2}
              />
            </Grid.Col>
          </Grid>
        )
      case 'C':
        return (
          <Text size="sm" c="#86909C">无土地需求，土地费用为0</Text>
        )
      case 'D':
        return (
          <Grid>
            <Grid.Col span={12}>
              <Title order={6} c="#1D2129">租赁部分</Title>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="租赁面积（亩）"
                value={formData.land_lease_area}
                onChange={(val) => setFormData({ ...formData, land_lease_area: val as number })}
                min={0}
                decimalScale={2}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="租赁单价（万元/亩/年）"
                value={formData.land_lease_unit_price}
                onChange={(val) => setFormData({ ...formData, land_lease_unit_price: val as number })}
                min={0}
                decimalScale={2}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Title order={6} c="#1D2129">征地部分</Title>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="征地面积（亩）"
                value={formData.land_purchase_area}
                onChange={(val) => setFormData({ ...formData, land_purchase_area: val as number })}
                min={0}
                decimalScale={2}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="征地单价（万元/亩）"
                value={formData.land_purchase_unit_price}
                onChange={(val) => setFormData({ ...formData, land_purchase_unit_price: val as number })}
                min={0}
                decimalScale={2}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <NumberInput
                label="青苗补偿费（万元/亩）"
                description="默认为0，需要手动填写"
                value={formData.seedling_compensation}
                onChange={(val) => setFormData({ ...formData, seedling_compensation: val as number })}
                min={0}
                decimalScale={2}
              />
            </Grid.Col>
          </Grid>
        )
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F7FA' }}>
      <Paper shadow="xs" p="md" style={{ borderBottom: '1px solid #E5E6EB' }}>
        <Container size="xl">
          <Group justify="space-between">
            <Title order={3} c="#1D2129">
              {isEdit ? '编辑项目' : '新建项目'}
            </Title>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              返回
            </Button>
          </Group>
        </Container>
      </Paper>

      <Container size="xl" py="lg">
        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            {/* 操作按钮 */}
            <Card shadow="sm" padding="md" radius="sm" withBorder>
              <Group justify="flex-end" gap="xs">
                {isEdit && project && (
                  <>
                    {project.is_locked ? (
                      <Button variant="light" color="orange" onClick={handleUnlock}>
                        解锁
                      </Button>
                    ) : (
                      <Button variant="light" color="blue" onClick={handleLock}>
                        锁定
                      </Button>
                    )}
                    <Button variant="light" color="red" onClick={handleDelete}>
                      删除
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  取消
                </Button>
                <Button type="submit" loading={loading} disabled={isEdit && project?.is_locked}>
                  {isEdit ? '更新项目' : '创建项目'}
                </Button>
              </Group>
            </Card>

            <Grid gutter="lg">
              {/* 项目基本信息 */}
              <Grid.Col span={{ base: 12, lg: 6 }}>
                <Card shadow="sm" padding="md" radius="sm" withBorder>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Title order={4} c="#1D2129">项目基本信息</Title>
                      <Button
                        variant="light"
                        size="xs"
                        onClick={handleAnalyze}
                        loading={analyzing}
                      >
                        智能分析
                      </Button>
                    </Group>

                    <TextInput
                      label="项目名称"
                      placeholder="请输入项目名称"
                      value={formData.project_name}
                      onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                      required
                    />

                    <Textarea
                      label="项目信息"
                      placeholder="请详细描述项目情况..."
                      value={formData.project_info}
                      onChange={(e) => setFormData({ ...formData, project_info: e.target.value })}
                      minRows={4}
                      required
                    />

                    <NumberInput
                      label="总投资（万元）"
                      value={formData.total_investment}
                      onChange={(val) => setFormData({ ...formData, total_investment: val as number })}
                      min={0}
                      decimalScale={2}
                      required
                    />

                    <Grid>
                      <Grid.Col span={6}>
                        <NumberInput
                          label="建设期（年）"
                          value={formData.construction_years}
                          onChange={(val) => setFormData({ ...formData, construction_years: val as number })}
                          min={1}
                          max={20}
                        />
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <NumberInput
                          label="运营期（年）"
                          value={formData.operation_years}
                          onChange={(val) => setFormData({ ...formData, operation_years: val as number })}
                          min={1}
                          max={50}
                        />
                      </Grid.Col>
                    </Grid>

                    <Grid>
                      <Grid.Col span={6}>
                        <NumberInput
                          label="贷款比例（%）"
                          value={formData.loan_ratio}
                          onChange={(val) => setFormData({ ...formData, loan_ratio: val as number })}
                          min={0}
                          max={100}
                          decimalScale={1}
                        />
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <NumberInput
                          label="贷款利率（%）"
                          value={formData.loan_interest_rate}
                          onChange={(val) => setFormData({ ...formData, loan_interest_rate: val as number })}
                          min={0}
                          max={20}
                          decimalScale={2}
                        />
                      </Grid.Col>
                    </Grid>
                  </Stack>
                </Card>
              </Grid.Col>

              {/* 用地信息 */}
              <Grid.Col span={{ base: 12, lg: 6 }}>
                <Card shadow="sm" padding="md" radius="sm" withBorder style={{ backgroundColor: '#F0F7FF' }}>
                  <Stack gap="md">
                    <Title order={4} c="#1D2129">用地信息</Title>

                    <Select
                      label="用地模式"
                      value={formData.land_mode}
                      onChange={(val) => {
                        const newMode = val as any
                        setFormData({ ...formData, land_mode: newMode })
                        handleLandModeAnalyze(newMode)
                      }}
                      data={[
                        { value: 'A', label: 'A. 一次性征地' },
                        { value: 'B', label: 'B. 长期租赁' },
                        { value: 'C', label: 'C. 无土地需求' },
                        { value: 'D', label: 'D. 混合用地（租赁+征地）' },
                      ]}
                      disabled={landModeAnalyzing}
                    />

                    {renderLandModeFields()}

                    <NumberInput
                      label="土地费用（万元）"
                      description="自动计算"
                      value={formData.land_cost}
                      readOnly
                      styles={{ input: { backgroundColor: '#f5f5f5' } }}
                    />

                    <Textarea
                      label="征地部分信息备注"
                      description="自动生成"
                      value={formData.land_remark}
                      readOnly
                      minRows={3}
                      styles={{ input: { backgroundColor: '#f5f5f5' } }}
                    />
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>
          </Stack>
        </form>
      </Container>
    </div>
  )
}

export default ProjectForm
