'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DashboardLayout from '@/app/components/DashboardLayout'
import { Download, FileText, Calendar, TrendingUp } from 'lucide-react'

interface ReportData {
  purchaseTotal: number
  salesTotal: number
  profit: number
  totalTransactions: number
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReportsPageContent />
    </Suspense>
  )
}

function ReportsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const companyId = searchParams.get('companyId') || ''
  
  const [reportType, setReportType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)

  const generateReport = async () => {
    if (!reportType || !dateFrom || !dateTo) {
      alert('Please select report type and date range')
      return
    }

    setLoading(true)
    try {
      // Mock report generation - in real app, call appropriate API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setReportData({
        purchaseTotal: 150000,
        salesTotal: 200000,
        profit: 50000,
        totalTransactions: 45
      })
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

  return (
    <DashboardLayout companyId={companyId}>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Reports</h1>
            <Button variant="outline" onClick={() => router.push('/main/dashboard?companyId=' + companyId)}>
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
                      <SelectItem value="purchase">Purchase Report</SelectItem>
                      <SelectItem value="sales">Sales Report</SelectItem>
                      <SelectItem value="stock">Stock Report</SelectItem>
                      <SelectItem value="financial">Financial Report</SelectItem>
                      <SelectItem value="profit-loss">Profit & Loss</SelectItem>
                      <SelectItem value="party-wise">Party-wise Report</SelectItem>
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
                  <Button onClick={generateReport} disabled={loading}>
                    {loading ? 'Generating...' : 'Generate Report'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Results */}
          {reportData && (
            <div className="space-y-6">
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
                    <p className="text-sm text-gray-600">Profit</p>
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

              {/* Report Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Report Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Report Type</Label>
                        <p className="font-medium">{reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</p>
                      </div>
                      <div>
                        <Label>Period</Label>
                        <p className="font-medium">{dateFrom} to {dateTo}</p>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-2">Summary</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Purchase Amount:</span>
                          <span className="font-medium">₹{reportData.purchaseTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Sales Amount:</span>
                          <span className="font-medium">₹{reportData.salesTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gross Profit:</span>
                          <span className="font-medium text-green-600">₹{reportData.profit.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Transactions:</span>
                          <span className="font-medium">{reportData.totalTransactions}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Report Cards */}
          {!reportData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Purchase Report</h3>
                    <p className="text-sm text-gray-600 mb-4">View all purchase transactions and supplier-wise analysis</p>
                    <Button variant="outline" size="sm">Generate</Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Sales Report</h3>
                    <p className="text-sm text-gray-600 mb-4">View sales performance and party-wise analysis</p>
                    <Button variant="outline" size="sm">Generate</Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Financial Report</h3>
                    <p className="text-sm text-gray-600 mb-4">Complete financial overview with profit analysis</p>
                    <Button variant="outline" size="sm">Generate</Button>
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
