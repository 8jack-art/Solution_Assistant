import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import ProjectForm from '@/pages/ProjectForm'
import InvestmentSummary from '@/pages/InvestmentSummary'
import LLMConfigsManagement from '@/pages/LLMConfigsManagement'
import LLMConfigsDebug from '@/pages/LLMConfigsDebug'
import RevenueCostModeling from '@/pages/RevenueCostModeling'
import InvestmentReport from '@/pages/InvestmentReport'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

const AppRoutes: React.FC = () => {
  return (
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
      <Route path="/report/:id" element={
        <ProtectedRoute>
          <InvestmentReport />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default AppRoutes