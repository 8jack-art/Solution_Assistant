import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectApi, InvestmentProject } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<InvestmentProject[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const response = await projectApi.getByUserId()
      if (response.success && response.data?.projects) {
        setProjects(response.data.projects)
      } else {
        toast({
          title: '❌ 加载失败',
          description: response.error || '加载项目列表失败',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      toast({
        title: '❌ 加载失败',
        description: error.response?.data?.error || '加载项目列表失败',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const getUser = () => {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }

  const user = getUser()

  if (loading) {
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
            <h1 className="text-xl font-semibold">投资项目管理系统</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                欢迎，{user?.username}
                {user?.is_admin && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">管理员</span>}
              </span>
              <Button variant="outline" onClick={handleLogout}>
                退出登录
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">项目列表</h2>
          <Button onClick={() => navigate('/project/new')}>
            新建项目
          </Button>
        </div>

        <div className="grid gap-6">
          {projects.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-gray-500 mb-4">暂无项目</div>
                <Button onClick={() => navigate('/project/new')}>
                  创建第一个项目
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>投资项目列表</CardTitle>
                <CardDescription>
                  共 {projects.length} 个项目
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>项目名称</TableHead>
                      <TableHead>总投资</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.project_name}</TableCell>
                        <TableCell>{formatCurrency(project.total_investment)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded ${
                            project.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {project.status === 'completed' ? '已完成' : '草稿'}
                          </span>
                          {project.is_locked && (
                            <span className="ml-1 px-2 py-1 text-xs rounded bg-red-100 text-red-800">
                              已锁定
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatDateTime(project.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/project/${project.id}`)}
                            >
                              查看
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/investment/${project.id}`)}
                            >
                              投资估算
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>快速操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/project/new')}
              >
                创建新项目
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/llm-configs')}
              >
                LLM 配置管理
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>统计信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>总项目数：</span>
                  <span className="font-semibold">{projects.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>已完成项目：</span>
                  <span className="font-semibold">
                    {projects.filter(p => p.status === 'completed').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>总投资额：</span>
                  <span className="font-semibold">
                    {formatCurrency(projects.reduce((sum, p) => sum + p.total_investment, 0))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default Dashboard