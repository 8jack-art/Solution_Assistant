import React from 'react'
import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredAdmin?: boolean
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredAdmin = false 
}) => {
  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user')
  
  if (!token || !userStr) {
    return <Navigate to="/login" replace />
  }

  try {
    const user = JSON.parse(userStr)
    if (requiredAdmin && !user.is_admin) {
      return <Navigate to="/dashboard" replace />
    }
  } catch (error) {
    console.error('Failed to parse user data:', error)
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute