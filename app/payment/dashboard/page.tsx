'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import DashboardLayout from '@/app/components/DashboardLayout'
import { Eye, Plus } from 'lucide-react'
import { getClientCache, setClientCache } from '@/lib/client-fetch-cache'
import { resolveCompanyId, stripCompanyParamsFromUrl } from '@/lib/company-context'
import { isAbortError } from '@/lib/http'

interface PurchaseBill {
  id: string
  billNo: string
  billDate: string
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  status: string
  supplier?: {
    name: string
  } | null
  farmer: {
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

const clampNonNegative = (value: number): number => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, parsed)
}

const formatDateSafe = (value: string): string => {
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return '-'
  return parsed.toLocaleDateString()
}

export default function PaymentDashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'purchase' | 'sales'>('purchase')
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([])
  const [salesBills, setSalesBills] = useState<SalesBill[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const companyIdParam = await resolveCompanyId(window.location.search)

      if (!companyIdParam) {
        alert('Company not selected')
        router.push('/company/select')
        return
      }

      setCompanyId(companyIdParam)
      stripCompanyParamsFromUrl()

      const cacheKey = `payments-dashboard:${companyIdParam}:${activeTab}`
      const cached = getClientCache<{
        purchaseBills: PurchaseBill[]
        salesBills: SalesBill[]
        payments: Payment[]
      }>(cacheKey, 10_000)
      if (cached) {
        setPurchaseBills(cached.purchaseBills)
        setSalesBills(cached.salesBills)
        setPayments(cached.payments)
        setLoading(false)
      }

      // Fetch bills based on active tab
      const billsEndpoint = activeTab === 'purchase' ? 'purchase-bills' : 'sales-bills'
      const [billsResponse, paymentsResponse] = await Promise.all([
        fetch(`/api/${billsEndpoint}?companyId=${companyIdParam}`),
        fetch(`/api/payments?companyId=${companyIdParam}&billType=${activeTab}`)
      ])
      if (billsResponse.status === 401 || paymentsResponse.status === 401) {
        setLoading(false)
        router.push('/login')
        return
      }
      if (billsResponse.status === 403 || paymentsResponse.status === 403) {
        setPurchaseBills([])
        setSalesBills([])
        setPayments([])
        setLoading(false)
        return
      }

      const billsRaw = await billsResponse.json().catch(() => [])
      const billsData = Array.isArray(billsRaw) ? billsRaw : []
      const normalizedBills = billsData.map((bill: PurchaseBill | SalesBill) => ({
        ...bill,
        totalAmount: clampNonNegative(bill.totalAmount),
        balanceAmount: clampNonNegative(bill.balanceAmount),
        ...(activeTab === 'purchase'
          ? { paidAmount: clampNonNegative((bill as PurchaseBill).paidAmount) }
          : { receivedAmount: clampNonNegative((bill as SalesBill).receivedAmount) })
      }))

      const nextPurchaseBills = activeTab === 'purchase' ? (normalizedBills as PurchaseBill[]) : []
      const nextSalesBills = activeTab === 'sales' ? (normalizedBills as SalesBill[]) : []
      setPurchaseBills(nextPurchaseBills)
      setSalesBills(nextSalesBills)

      const paymentsRaw = await paymentsResponse.json().catch(() => [])
      const paymentsData = Array.isArray(paymentsRaw) ? paymentsRaw : []
      setPayments(
        paymentsData.map((payment: Payment) => ({
          ...payment,
          amount: clampNonNegative(payment.amount)
        }))
      )
      setClientCache(cacheKey, {
        purchaseBills: nextPurchaseBills,
        salesBills: nextSalesBills,
        payments: paymentsData
      })

      setLoading(false)
    } catch (error) {
      if (isAbortError(error)) return
      console.error('Error fetching data:', error)
      setPurchaseBills([])
      setSalesBills([])
      setPayments([])
      setLoading(false)
    }
  }, [activeTab, router])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (cancelled) return
      await fetchData()
    })()
    return () => {
      cancelled = true
    }
  }, [fetchData])

  const handleMakePayment = (billId: string) => {
    const route = activeTab === 'purchase' ? '/payment/purchase/entry' : '/payment/sales/entry'
    router.push(`${route}?billId=${billId}`)
  }

  const currentBills = useMemo(
    () => (activeTab === 'purchase' ? purchaseBills : salesBills),
    [activeTab, purchaseBills, salesBills]
  )

  const pendingCurrentBills = useMemo(
    () => currentBills.filter((bill) => clampNonNegative(bill.balanceAmount) > 0),
    [currentBills]
  )

  const totalPending = useMemo(
    () => currentBills.reduce((sum, bill) => sum + clampNonNegative(bill.balanceAmount), 0),
    [currentBills]
  )

  const totalPaid = useMemo(() => {
    return currentBills.reduce((sum, bill) => {
      if (activeTab === 'purchase') {
        return sum + clampNonNegative((bill as PurchaseBill).paidAmount)
      } else {
        return sum + clampNonNegative((bill as SalesBill).receivedAmount)
      }
    }, 0)
  }, [activeTab, currentBills])

  const getBillName = (bill: PurchaseBill | SalesBill) => {
    if (activeTab === 'purchase') {
      return (bill as PurchaseBill).supplier?.name || (bill as PurchaseBill).farmer?.name || '-'
    } else {
      return (bill as SalesBill).party?.name || '-'
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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Payment Management</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/main/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total {activeTab === 'purchase' ? 'Purchase' : 'Sales'} Amount</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ₹{currentBills.reduce((sum, bill) => sum + clampNonNegative(bill.totalAmount), 0).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total {activeTab === 'purchase' ? 'Paid' : 'Received'}</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{totalPaid.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Pending</p>
                  <p className="text-2xl font-bold text-red-600">
                    ₹{totalPending.toFixed(2)}
                  </p>
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

          {/* Bills Table */}
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
                    {pendingCurrentBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell>{bill.billNo}</TableCell>
                        <TableCell>{formatDateSafe(bill.billDate)}</TableCell>
                        <TableCell>{getBillName(bill)}</TableCell>
                        <TableCell>₹{clampNonNegative(bill.totalAmount).toFixed(2)}</TableCell>
                        <TableCell>
                          ₹{(activeTab === 'purchase'
                            ? clampNonNegative((bill as PurchaseBill).paidAmount)
                            : clampNonNegative((bill as SalesBill).receivedAmount)).toFixed(2)}
                        </TableCell>
                        <TableCell>₹{clampNonNegative(bill.balanceAmount).toFixed(2)}</TableCell>
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
                              onClick={() => handleMakePayment(bill.id)}
                              disabled={clampNonNegative(bill.balanceAmount) === 0}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Pay
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/${activeTab}/view?billId=${bill.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pendingCurrentBills.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-500">
                          No pending bills found
                        </TableCell>
                      </TableRow>
                    )}
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill No</TableHead>
                      <TableHead>{activeTab === 'purchase' ? 'Supplier' : 'Party'}</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Transaction Ref</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.billNo}</TableCell>
                        <TableCell>{payment.partyName}</TableCell>
                        <TableCell>{formatDateSafe(payment.payDate)}</TableCell>
                        <TableCell>₹{clampNonNegative(payment.amount).toFixed(2)}</TableCell>
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
