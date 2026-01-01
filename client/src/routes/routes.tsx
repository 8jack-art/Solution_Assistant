import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Center, Loader, Text } from '@mantine/core'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const ProjectForm = lazy(() => import('@/pages/ProjectForm'))
const InvestmentSummary = lazy(() => import('@/pages/InvestmentSummary'))
const LLMConfigsManagement = lazy(() => import('@/pages/LLMConfigsManagement'))
const LLMConfigsDebug = lazy(() => import('@/pages/LLMConfigsDebug'))
const RevenueCostModeling = lazy(() => import('@/pages/RevenueCostModeling'))

const PageLoader: React.FC = () => (
  <Center style={{ height: '100vh', flexDirection: 'column' }}>
    <Loader size="lg" color="#667eea" />
    <Text mt="md" c="#86909C" size="sm">加载中...</Text>
  </Center>
)

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/project/new" element={
          <ProtectedRoute>
            <ProjectForm />
          </ProtectedRoute>
        } />
        <Route path="/project/:id" element={
          <ProtectedRoute>
            <ProjectForm />
          </ProtectedRoute>
        } />
        <Route path="/investment/:id" element={
          <ProtectedRoute>
            <InvestmentSummary />
          </ProtectedRoute>
        } />
        <Route path="/llm-configs" element={
          <ProtectedRoute>
            <LLMConfigsManagement />
          </ProtectedRoute>
        } />
        <Route path="/llm-debug" element={
          <ProtectedRoute>
            <LLMConfigsDebug />
          </ProtectedRoute>
        } />
        <Route path="/revenue-cost/:id" element={
          <ProtectedRoute>
            <RevenueCostModeling />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes