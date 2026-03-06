'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DashboardLayout from '@/app/components/DashboardLayout'
import { Download, FileText, Calendar, TrendingUp, BarChart3, PieChart, Target, Package, DollarSign } from 'lucide-react'

interface ReportData {
  purchaseTotal: number
  salesTotal: number
  profit: number
  totalTransactions: number
  purchaseCount: number
  salesCount: number
  stockValue: number
  lowStockItems: number
}

export default function ReportsMainPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReportsMainPageContent />
    </Suspense>
  )
}

function ReportsMainPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const companyId = searchParams.get('companyId') || ''
  
  const [reportType, setReportType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)

  const reportTypes = [
    { value: 'purchase', label: 'Purchase Report', icon: <TrendingUp className="w-5 h-5" />, color: 'text-red-600' },
    { value: 'sales', label: 'Sales Report', icon: <BarChart3 className="w-5 h-5" />, color: 'text-green-600' },
    { value: 'stock', label: 'Stock Report', icon: <Package className="w-5 h-5" />, color: 'text-blue-600' },
    { value: 'financial', label: 'Financial Report', icon: <DollarSign className="w-5 h-5" />, color: 'text-purple-600' },
    { value: 'profit-loss', label: 'Profit & Loss', icon: <Target className="w-5 h-5" />, color: 'text-orange-600' },
    { value: 'party-wise', label: 'Party-wise Report', icon: <PieChart className="w-5 h-5" />, color: 'text-indigo-600' }
  ]

  const generateReport = async () => {
    if (!reportType || !dateFrom || !dateTo) {
      alert('Please select report type and date range')
      return
    }

    setLoading(true)
    try {
      // Mock report generation - in real app, call appropriate API
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock data based on report type
      const mockData: ReportData = {
        purchaseTotal: Math.floor(Math.random() * 200000) + 50000,
        salesTotal: Math.floor(Math.random() * 300000) + 100000,
        profit: Math.floor(Math.random() * 100000) + 10000,
        totalTransactions: Math.floor(Math.random() * 100) + 20,
        purchaseCount: Math.floor(Math.random() * 50) + 10,
        salesCount: Math.floor(Math.random() * 60) + 15,
        stockValue: Math.floor(Math.random() * 500000) + 100000,
        lowStockItems: Math.floor(Math.random() * 10) + 1
      }
      
      setReportData(mockData)
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Error generating report')
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = () => {
    alert('Excel export functionality coming soon!')
  }

  const exportToPDF = () => {
    alert('PDF export functionality coming soon!')
  }

  const printReport = () => {
    window.print()
  }

  const getReportIcon = (type: string) => {
    const report = reportTypes.find(r => r.value === type)
    return report ? report.icon : <FileText className="w-5 h-5" />
  }

  const getReportColor = (type: string) => {
    const report = reportTypes.find(r => r.value === type)
    return report ? report.color : 'text-gray-600'
  }

  if (!companyId) {
    return (
      <DashboardLayout companyId="">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Company not selected</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout companyId={companyId}>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Reports</h1>
            <Button variant="outline" onClick={() => router.push('/main/dashboard')}>
              Back to Dashboard
            </Button>
          </div>

          {/* Report Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Generate Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="reportType">Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Report Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            {type.icon}
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dateFrom">Date From</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="dateTo">Date To</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={generateReport} disabled={loading} className="w-full">
                    {loading ? 'Generating...' : 'Generate Report'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Report Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {reportTypes.map((type) => (
              <Card 
                key={type.value}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setReportType(type.value)}
              >
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className={`${type.color} mx-auto mb-4`}>
                      {type.icon}
                    </div>
                    <h3 className="font-semibold mb-2">{type.label}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {type.value === 'purchase' && 'View all purchase transactions and supplier-wise analysis'}
                      {type.value === 'sales' && 'View sales performance and party-wise analysis'}
                      {type.value === 'stock' && 'Monitor inventory levels and stock movements'}
                      {type.value === 'financial' && 'Complete financial overview with cash flow'}
                      {type.value === 'profit-loss' && 'Detailed profit and loss analysis'}
                      {type.value === 'party-wise' && 'Party-wise transaction history and balances'}
                    </p>
                    <Button variant="outline" size="sm">
                      Generate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Report Results */}
          {reportData && (
            <div className="space-y-6">
              {/* Report Header */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getReportIcon(reportType)}
                    {reportTypes.find(r => r.value === reportType)?.label} Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Report Type</Label>
                      <p className="font-medium">{reportTypes.find(r => r.value === reportType)?.label}</p>
                    </div>
                    <div>
                      <Label>Period</Label>
                      <p className="font-medium">{dateFrom} to {dateTo}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-gray-600">Purchase Total</p>
                    <p className="text-2xl font-bold text-red-600">₹{reportData.purchaseTotal.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-gray-600">Sales Total</p>
                    <p className="text-2xl font-bold text-green-600">₹{reportData.salesTotal.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-gray-600">Gross Profit</p>
                    <p className="text-2xl font-bold text-blue-600">₹{reportData.profit.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-gray-600">Transactions</p>
                    <p className="text-2xl font-bold text-purple-600">{reportData.totalTransactions}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Purchase Summary</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Purchase Amount:</span>
                          <span className="font-medium">₹{reportData.purchaseTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Number of Purchase Bills:</span>
                          <span className="font-medium">{reportData.purchaseCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Purchase Value:</span>
                          <span className="font-medium">₹{(reportData.purchaseTotal / reportData.purchaseCount).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Sales Summary</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Sales Amount:</span>
                          <span className="font-medium">₹{reportData.salesTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Number of Sales Bills:</span>
                          <span className="font-medium">{reportData.salesCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Sales Value:</span>
                          <span className="font-medium">₹{(reportData.salesTotal / reportData.salesCount).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t mt-6 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <Label>Profit Margin</Label>
                        <p className="text-2xl font-bold text-green-600">
                          {((reportData.profit / reportData.salesTotal) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <Label>Current Stock Value</Label>
                        <p className="text-2xl font-bold text-blue-600">₹{reportData.stockValue.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <Label>Low Stock Items</Label>
                        <p className="text-2xl font-bold text-red-600">{reportData.lowStockItems}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Export Options */}
              <Card>
                <CardHeader>
                  <CardTitle>Export Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={exportToExcel}>
                      <Download className="w-4 h-4 mr-2" />
                      Export to Excel
                    </Button>
                    <Button variant="outline" onClick={exportToPDF}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export to PDF
                    </Button>
                    <Button variant="outline" onClick={printReport}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Print Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
