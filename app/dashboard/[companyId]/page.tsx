'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  ShoppingCart, 
  CreditCard, 
  BarChart3 
} from 'lucide-react'

interface DashboardPageProps {
  params: { companyId: string }
}

export default function MandiDashboard({ params }: DashboardPageProps) {
  // Mock dashboard data - replace with real API calls
  const stats = {
    todayPurchase: 1250000,
    todaySales: 1850000,
    totalStock: 45678,
    pendingPayments: 340000,
    purchaseCount: 45,
    salesCount: 62,
    activeProducts: 28,
    lowStockItems: 5
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mandi Dashboard</h1>
          <p className="text-gray-500">Company ID: {params.companyId}</p>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Purchase</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(stats.todayPurchase / 100000).toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground">
              {stats.purchaseCount} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(stats.todaySales / 100000).toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground">
              {stats.salesCount} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStock.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Quintals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(stats.pendingPayments / 100000).toFixed(1)}L</div>
            <p className="text-xs text-red-600">
              Outstanding
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">New Purchase Entry</span>
              <Badge variant="outline">快捷</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">New Sales Entry</span>
              <Badge variant="outline">快捷</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Stock Adjustment</span>
              <Badge variant="outline">快捷</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Wheat</span>
                <Badge variant="destructive">Low</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Soyabean</span>
                <Badge variant="secondary">Medium</Badge>
              </div>
              <div className="text-sm text-gray-500">
                {stats.lowStockItems} items need attention
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Net Profit</span>
                <span className="text-green-600 font-medium">₹{(stats.todaySales - stats.todayPurchase - stats.pendingPayments).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Active Products</span>
                <span>{stats.activeProducts}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Market Rate</span>
                <span className="text-blue-600">Stable</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
