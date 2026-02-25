'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Users, Settings, BarChart3, Shield } from 'lucide-react'

export default function SuperAdminDashboard() {
  const modules = [
    {
      title: 'Company Management',
      description: 'Create and manage trading companies',
      icon: Building2,
      href: '/super-admin/companies',
      color: 'bg-blue-500'
    },
    {
      title: 'User Management',
      description: 'Manage users across all companies',
      icon: Users,
      href: '/super-admin/users',
      color: 'bg-green-500'
    },
    {
      title: 'Global Settings',
      description: 'Configure system-wide settings',
      icon: Settings,
      href: '/super-admin/settings',
      color: 'bg-purple-500'
    },
    {
      title: 'Analytics',
      description: 'View platform-wide statistics',
      icon: BarChart3,
      href: '/super-admin/analytics',
      color: 'bg-orange-500'
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-gray-500">Platform Management Console</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {modules.map((module) => (
          <Link key={module.href} href={module.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className={`${module.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <module.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">{module.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{module.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">12</div>
              <div className="text-sm text-gray-500">Total Companies</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">156</div>
              <div className="text-sm text-gray-500">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">₹2.4M</div>
              <div className="text-sm text-gray-500">Daily Volume</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">99.9%</div>
              <div className="text-sm text-gray-500">Uptime</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
