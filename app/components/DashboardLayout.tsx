'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Sidebar from './Sidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
  companyId: string
}

export default function DashboardLayout({ children, companyId }: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check authentication status via API call
    const checkAuth = async () => {
      try {
        const token = document.cookie.replace(/(?:(?:^|.*;\s*)auth-token\s*\=\s*([^;]*).*$)|^.*$/, '$1');
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          setCurrentUser(data.userId)
        } else {
          router.push('/login')
        }
      } catch (error) {
        router.push('/login')
      }
    }
    
    checkAuth()
  }, [])

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  const handleLogout = async () => {
    try {
      const token = document.cookie.replace(/(?:(?:^|.*;\s*)auth-token\s*\=\s*([^;]*).*$)|^.*$/, '$1');
      await fetch('/api/auth/logout', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    } catch (error) {
      // Even if API call fails, redirect to login
    }
    setCurrentUser(null)
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        companyId={companyId}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Navigation Bar */}
        <div className="bg-white shadow-sm border-b px-6 py-3">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
              <span className="text-sm text-gray-500">Company: {companyId}</span>
            </div>
            {currentUser && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Logged in as:</span>
                <span className="font-medium text-blue-600">{currentUser}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}