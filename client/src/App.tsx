import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import AppRoutes from '@/routes/routes'
import { theme } from '@/theme'
import '@/styles/globals.css'

const App: React.FC = () => {
  return (
    <MantineProvider theme={theme}>
      <Notifications position="bottom-right" zIndex={1000} autoClose={2000} />
      <BrowserRouter>
        <div className="min-h-screen" style={{ backgroundColor: '#F5F7FA' }}>
          <AppRoutes />
        </div>
      </BrowserRouter>
    </MantineProvider>
  )
}

export default App