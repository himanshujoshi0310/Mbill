'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import DashboardLayout from '@/app/components/DashboardLayout'
import { 
  ShoppingCart, 
  Receipt, 
  Package, 
  CreditCard, 
  FileText, 
  Plus, 
  Eye
} from 'lucide-react'
import StockManagementTab from './components/StockManagementTab'
import PaymentTab from './components/PaymentTab'
import ReportsTab from './components/ReportsTab'

type ActiveTab = 'purchase' | 'sales' | 'stock' | 'payment' | 'report'

export default function MainDashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MainDashboardPageContent />
    </Suspense>
  )
}

function MainDashboardPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const companyId = searchParams.get('companyId') || ''
  const [activeTab, setActiveTab] = useState<ActiveTab>('purchase')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) {
      router.push('/company/select')
    } else {
      setLoading(false)
    }
  }, [companyId])

  const handleNavigation = (path: string) => {
    router.push(`${path}?companyId=${companyId}`)
  }

  const getTabIcon = (tab: ActiveTab) => {
    switch (tab) {
      case 'purchase': return <ShoppingCart className="w-4 h-4" />
      case 'sales': return <Receipt className="w-4 h-4" />
      case 'stock': return <Package className="w-4 h-4" />
      case 'payment': return <CreditCard className="w-4 h-4" />
      case 'report': return <FileText className="w-4 h-4" />
    }
  }

  const getTabLabel = (tab: ActiveTab) => {
    switch (tab) {
      case 'purchase': return 'Purchase'
      case 'sales': return 'Sales'
      case 'stock': return 'Stock Management'
      case 'payment': return 'Payment'
      case 'report': return 'Reports'
    }
  }

  if (loading) {
    return (
      <DashboardLayout companyId={companyId}>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout companyId={companyId}>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Billing System Dashboard</h1>
            <Button variant="outline" onClick={() => router.push('/company/select')}>
              Change Company
            </Button>
          </div>

          {/* Parent Tab Navigation */}
          <div className="flex space-x-1 mb-6 border-b">
            {(['purchase', 'sales', 'stock', 'payment', 'report'] as ActiveTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-4 py-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {getTabIcon(tab)}
                {getTabLabel(tab)}
              </button>
            ))}
          </div>

          {/* Purchase Tab */}
          {activeTab === 'purchase' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-gray-600">Total Purchase</p>
                    <p className="text-2xl font-bold text-blue-600">₹0.00</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-gray-600">Paid Amount</p>
                    <p className="text-2xl font-bold text-green-600">₹0.00</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-gray-600">Pending Amount</p>
                    <p className="text-2xl font-bold text-red-600">₹0.00</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-gray-600">Total Bills</p>
                    <p className="text-2xl font-bold text-purple-600">0</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleNavigation('/purchase/entry')}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Purchase Bill
                </Button>
                <Button variant="outline" onClick={() => handleNavigation('/purchase/list')}>
                  <Eye className="w-4 h-4 mr-2" />
                  View All Bills
                </Button>
                <Button variant="outline" onClick={() => handleNavigation('/purchase')}>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Purchase Module
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Purchase Bills</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bill No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500">
                          No purchase bills found
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold text-blue-600">₹0.00</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-gray-600">Received Amount</p>
                    <p className="text-2xl font-bold text-green-600">₹0.00</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-gray-600">Pending Amount</p>
                    <p className="text-2xl font-bold text-red-600">₹0.00</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-gray-600">Total Invoices</p>
                    <p className="text-2xl font-bold text-purple-600">0</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleNavigation('/sales/entry')}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Sales Bill
                </Button>
                <Button variant="outline" onClick={() => handleNavigation('/sales/list')}>
                  <Eye className="w-4 h-4 mr-2" />
                  View All Bills
                </Button>
                <Button variant="outline" onClick={() => handleNavigation('/sales')}>
                  <Receipt className="w-4 h-4 mr-2" />
                  Sales Module
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Sales Bills</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Party</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500">
                          No sales bills found
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Stock Tab */}
          {activeTab === 'stock' && (
            <StockManagementTab companyId={companyId} />
          )}

          {/* Payment Tab */}
          {activeTab === 'payment' && (
            <PaymentTab companyId={companyId} />
          )}

          {/* Reports Tab */}
          {activeTab === 'report' && (
            <ReportsTab companyId={companyId} />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
