'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import DashboardLayout from '@/app/components/DashboardLayout'
import { CreditCard, Plus, Eye, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { isAbortError } from '@/lib/http'

interface PurchaseBill {
  id: string
  billNo: string
  billDate: string
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  status: string
  farmer?: {
    name: string
    address: string
    krashakAnubandhNumber: string
  } | null
  supplier?: {
    name: string
    address: string
    krashakAnubandhNumber: string
  } | null
}

interface SalesBill {
  id: string
  billNo: string
  billDate: string
  totalAmount: number
  receivedAmount: number
  balanceAmount: number
  status: string
  party: {
    name: string
    address: string
    phone1: string
  }
}

interface Payment {
  id: string
  billType: 'purchase' | 'sales'
  billId: string
  billNo: string
  partyName: string
  payDate: string
  amount: number
  mode: 'cash' | 'online' | 'bank'
  txnRef?: string
  note?: string
  createdAt: string
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentPageContent />
    </Suspense>
  )
}

function PaymentPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const companyId = searchParams.get('companyId') || ''
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'purchase' | 'sales'>('purchase')
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([])
  const [salesBills, setSalesBills] = useState<SalesBill[]>([])
  const [payments, setPayments] = useState<Payment[]>([])

  // Filter states
  const [filterBillType, setFilterBillType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    if (!companyId) return
    const controller = new AbortController()
    void fetchPaymentData(controller.signal)
    return () => controller.abort()
  }, [companyId])

  const fetchPaymentData = async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      
      // Fetch all data
      const [purchaseRes, salesRes, paymentsRes] = await Promise.all([
        fetch(`/api/purchase-bills?companyId=${companyId}`, { signal }),
        fetch(`/api/sales-bills?companyId=${companyId}`, { signal }),
        fetch(`/api/payments?companyId=${companyId}`, { signal })
      ])
      if (signal?.aborted) return

      if ([purchaseRes.status, salesRes.status, paymentsRes.status].includes(403)) {
        setPurchaseBills([])
        setSalesBills([])
        setPayments([])
        setLoading(false)
        return
      }
      
      const purchaseData = await purchaseRes.json()
      const salesData = await salesRes.json()
      const paymentsData = await paymentsRes.json()
      
      setPurchaseBills(Array.isArray(purchaseData) ? purchaseData : [])
      setSalesBills(Array.isArray(salesData) ? salesData : [])
      setPayments(Array.isArray(paymentsData) ? paymentsData : [])
      
      setLoading(false)
    } catch (error) {
      if (isAbortError(error)) return
      console.error('Error fetching payment data:', error)
      setPurchaseBills([])
      setSalesBills([])
      setPayments([])
      setLoading(false)
    }
  }

  const getPurchasePartyName = (bill: PurchaseBill) => {
    return bill.supplier?.name || bill.farmer?.name || 'Unknown'
  }

  const getFilteredPayments = () => {
    let filtered = payments

    if (filterBillType) {
      filtered = filtered.filter(payment => payment.billType === filterBillType)
    }

    if (dateFrom) {
      filtered = filtered.filter(payment => new Date(payment.payDate) >= new Date(dateFrom))
    }

    if (dateTo) {
      filtered = filtered.filter(payment => new Date(payment.payDate) <= new Date(dateTo))
    }

    return filtered.sort((a, b) => new Date(b.payDate).getTime() - new Date(a.payDate).getTime())
  }

  const getPurchaseStats = () => ({
    total: purchaseBills.reduce((sum, bill) => sum + bill.totalAmount, 0),
    paid: purchaseBills.reduce((sum, bill) => sum + bill.paidAmount, 0),
    pending: purchaseBills.reduce((sum, bill) => sum + bill.balanceAmount, 0),
    count: purchaseBills.length
  })

  const getSalesStats = () => ({
    total: salesBills.reduce((sum, bill) => sum + bill.totalAmount, 0),
    received: salesBills.reduce((sum, bill) => sum + bill.receivedAmount, 0),
    pending: salesBills.reduce((sum, bill) => sum + bill.balanceAmount, 0),
    count: salesBills.length
  })

  const getPaymentStats = () => ({
    totalPayments: payments.reduce((sum, payment) => sum + payment.amount, 0),
    purchasePayments: payments.filter(p => p.billType === 'purchase').reduce((sum, p) => sum + p.amount, 0),
    salesReceipts: payments.filter(p => p.billType === 'sales').reduce((sum, p) => sum + p.amount, 0),
    count: payments.length
  })

  const handleMakePayment = (billId: string, billType: 'purchase' | 'sales') => {
    router.push(`/payment/dashboard?companyId=${companyId}&billId=${billId}&billType=${billType}`)
  }

  const handleViewBill = (billId: string, billType: 'purchase' | 'sales') => {
    router.push(`/${billType}/view?billId=${billId}&companyId=${companyId}`)
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
            <h1 className="text-3xl font-bold">Payment Management</h1>
            <div className="flex gap-2">
              <Button onClick={() => router.push(`/payment/dashboard?companyId=${companyId}`)}>
                <Plus className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
              <Button variant="outline" onClick={() => router.push('/main/dashboard?companyId=' + companyId)}>
                Back to Dashboard
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Payments</p>
                  <p className="text-2xl font-bold text-blue-600">₹{getPaymentStats().totalPayments.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Purchase Payments</p>
                  <p className="text-2xl font-bold text-red-600">₹{getPaymentStats().purchasePayments.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Sales Receipts</p>
                  <p className="text-2xl font-bold text-green-600">₹{getPaymentStats().salesReceipts.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Transactions</p>
                  <p className="text-2xl font-bold text-purple-600">{getPaymentStats().count}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 border-b">
            <button
              onClick={() => setActiveTab('purchase')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'purchase'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Purchase Payments
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'sales'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sales Receipts
            </button>
          </div>

          {/* Bills Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {activeTab === 'purchase' ? 'Purchase Bills' : 'Sales Bills'} - Pending Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>{activeTab === 'purchase' ? 'Supplier' : 'Party'}</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>{activeTab === 'purchase' ? 'Paid' : 'Received'}</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(activeTab === 'purchase' ? purchaseBills : salesBills).map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell>{bill.billNo}</TableCell>
                        <TableCell>{new Date(bill.billDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {activeTab === 'purchase' 
                            ? getPurchasePartyName(bill as PurchaseBill)
                            : (bill as SalesBill).party.name
                          }
                        </TableCell>
                        <TableCell>₹{bill.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          ₹{(activeTab === 'purchase' 
                            ? (bill as PurchaseBill).paidAmount 
                            : (bill as SalesBill).receivedAmount
                          ).toFixed(2)}
                        </TableCell>
                        <TableCell>₹{bill.balanceAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            bill.status === 'paid' ? 'default' :
                            bill.status === 'partial' ? 'secondary' : 'destructive'
                          }>
                            {bill.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleMakePayment(bill.id, activeTab)}
                              disabled={bill.balanceAmount === 0}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Pay
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewBill(bill.id, activeTab)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label htmlFor="filterBillType">Bill Type</Label>
                  <Select value={filterBillType} onValueChange={setFilterBillType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
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
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Bill No</TableHead>
                      <TableHead>{activeTab === 'purchase' ? 'Supplier' : 'Party'}</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Transaction Ref</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredPayments().map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{new Date(payment.payDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {payment.billType === 'purchase' ? 'Purchase' : 'Sales'}
                          </Badge>
                        </TableCell>
                        <TableCell>{payment.billNo}</TableCell>
                        <TableCell>{payment.partyName}</TableCell>
                        <TableCell>₹{payment.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.mode}</Badge>
                        </TableCell>
                        <TableCell>{payment.txnRef || '-'}</TableCell>
                        <TableCell>{payment.note || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
