import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { projectApi, investmentApi, InvestmentProject, InvestmentEstimate } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

const InvestmentCalculator: React.FC = () => {
  const [project, setProject] = useState<InvestmentProject | null>(null)
  const [estimate, setEstimate] = useState<InvestmentEstimate | null>(null)
  const [formData, setFormData] = useState({
    construction_cost: 0,
    equipment_cost: 0,
    installation_cost: 0,
    other_cost: 0,
    land_cost: 0,
    basic_reserve_rate: 0.05,
    price_reserve_rate: 0.03,
    construction_period: 3,
    loan_rate: 0.049,
    custom_loan_amount: 0,
  })
  const [calculationResult, setCalculationResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    if (id) {
      loadProjectAndEstimate()
    }
  }, [id])

  const loadProjectAndEstimate = async () => {
    try {
      const [projectResponse, estimateResponse] = await Promise.all([
        projectApi.getById(id!),
        investmentApi.getByProjectId(id!)
      ])

      if (projectResponse.success && projectResponse.data?.project) {
        const projectData = projectResponse.data.project
        setProject(projectData)
        setFormData(prev => ({
          ...prev,
          construction_period: projectData.construction_years,
          loan_rate: projectData.loan_interest_rate,
        }))
      }

      if (estimateResponse.success && estimateResponse.data?.estimate) {
        const estimateData = estimateResponse.data.estimate
        setEstimate(estimateData)
        setFormData({
          construction_cost: estimateData.construction_cost,
          equipment_cost: estimateData.equipment_cost,
          installation_cost: estimateData.installation_cost,
          other_cost: estimateData.other_cost,
          land_cost: estimateData.land_cost,
          basic_reserve_rate: 0.05,
          price_reserve_rate: 0.03,
          construction_period: estimateData.construction_period,
          loan_rate: estimateData.loan_rate,
          custom_loan_amount: estimateData.custom_loan_amount || 0,
        })
        setCalculationResult(estimateData.estimate_data)
      }
    } catch (error: any) {
      toast({
        title: '❌ 加载失败',
        description: error.response?.data?.error || '加载数据失败',
        variant: 'destructive'
      })
    }
  }

  const handleCalculate = async () => {
    setLoading(true)

    try {
      const response = await investmentApi.calculate(formData)
      if (response.success && response.data) {
        setCalculationResult(response.data.estimate)
        toast({
          title: '✅ 计算完成',
          description: '投资估算已计算完成',
        })
      } else {
        toast({
          title: '❌ 计算失败',
          description: response.error || '计算失败',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      toast({
        title: '❌ 计算失败',
        description: error.response?.data?.error || '计算失败',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!calculationResult) {
      toast({
        title: '⚠️ 请先计算',
        description: '请先进行投资估算',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      const response = await investmentApi.save({
        project_id: id!,
        ...formData,
      })
      if (response.success && response.data) {
        setEstimate(response.data.estimate)
        toast({
          title: '✅ 保存成功',
          description: '投资估算已保存',
        })
      } else {
        toast({
          title: '❌ 保存失败',
          description: response.error || '保存失败',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      toast({
        title: '❌ 保存失败',
        description: error.response?.data?.error || '保存失败',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold">投资估算</h1>
              <p className="text-sm text-gray-600">项目：{project.project_name}</p>
            </div>
            <div className="flex space-x-4">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/project/${id}`)}
              >
                返回项目
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/dashboard')}
              >
                返回首页
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>基础数据输入</CardTitle>
              <CardDescription>
                请输入工程投资费用项，系统将自动计算预备费和建设期利息
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      建筑工程费 (万元)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.construction_cost}
                      onChange={(e) => setFormData({ ...formData, construction_cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      设备购置费 (万元)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.equipment_cost}
                      onChange={(e) => setFormData({ ...formData, equipment_cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      安装工程费 (万元)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.installation_cost}
                      onChange={(e) => setFormData({ ...formData, installation_cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      其他费用 (万元)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.other_cost}
                      onChange={(e) => setFormData({ ...formData, other_cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    土地费用 (万元)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.land_cost}
                    onChange={(e) => setFormData({ ...formData, land_cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      基本预备费率
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.basic_reserve_rate}
                      onChange={(e) => setFormData({ ...formData, basic_reserve_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      涨价预备费率
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price_reserve_rate}
                      onChange={(e) => setFormData({ ...formData, price_reserve_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      建设周期 (年)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.construction_period}
                      onChange={(e) => setFormData({ ...formData, construction_period: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      贷款利率
                    </label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      max="1"
                      value={formData.loan_rate}
                      onChange={(e) => setFormData({ ...formData, loan_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    自定义贷款金额 (万元，留空则自动计算)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.custom_loan_amount}
                    onChange={(e) => setFormData({ ...formData, custom_loan_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="flex space-x-4">
                  <Button onClick={handleCalculate} disabled={loading}>
                    {loading ? '计算中...' : '计算估算'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleSave}
                    disabled={loading || !calculationResult}
                  >
                    {loading ? '保存中...' : '保存估算'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {calculationResult && (
            <Card>
              <CardHeader>
                <CardTitle>投资估算结果</CardTitle>
                <CardDescription>
                  建设投资明细和最终总投资额
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell>建筑工程费</TableCell>
                      <TableCell className="text-right">{formatCurrency(calculationResult.constructionCost)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>设备购置费</TableCell>
                      <TableCell className="text-right">{formatCurrency(calculationResult.equipmentCost)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>安装工程费</TableCell>
                      <TableCell className="text-right">{formatCurrency(calculationResult.installationCost)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>其他费用</TableCell>
                      <TableCell className="text-right">{formatCurrency(calculationResult.otherCost)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>土地费用</TableCell>
                      <TableCell className="text-right">{formatCurrency(calculationResult.landCost)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>基本预备费</TableCell>
                      <TableCell className="text-right">{formatCurrency(calculationResult.basicReserve)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>涨价预备费</TableCell>
                      <TableCell className="text-right">{formatCurrency(calculationResult.priceReserve)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">建设投资</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(calculationResult.buildingInvestment)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>建设期利息</TableCell>
                      <TableCell className="text-right">{formatCurrency(calculationResult.constructionInterest)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>贷款金额</TableCell>
                      <TableCell className="text-right">{formatCurrency(calculationResult.loanAmount)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-lg">总投资</TableCell>
                      <TableCell className="text-right font-bold text-lg">{formatCurrency(calculationResult.totalInvestment)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                {calculationResult.iterationCount > 0 && (
                  <div className="mt-4 text-sm text-gray-600">
                    迭代次数：{calculationResult.iterationCount}
                    {calculationResult.gapRate !== undefined && (
                      <> | 差距率：{formatNumber(calculationResult.gapRate * 100, 4)}%</>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

export default InvestmentCalculator