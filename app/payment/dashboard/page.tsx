'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DashboardLayout from '@/app/components/DashboardLayout'
import { Eye, Plus, Download, FileText } from 'lucide-react'

interface PurchaseBill {
  id: string
  billNo: string
  billDate: string
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  status: string
  farmer: {
    name: string
    address: string
    krashakAnubandhNumber: string
  }
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

export default function PaymentDashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'purchase' | 'sales'>('purchase')
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([])
  const [salesBills, setSalesBills] = useState<SalesBill[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState('')

  // Payment form state
  const [selectedBill, setSelectedBill] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<'cash' | 'online' | 'bank'>('cash')
  const [txnRef, setTxnRef] = useState('')
  const [note, setNote] = useState('')
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const companyIdParam = urlParams.get('companyId')

      if (!companyIdParam) {
        alert('Company not selected')
        router.push('/company/select')
        return
      }

      setCompanyId(companyIdParam)

      // Fetch bills based on active tab
      const billsEndpoint = activeTab === 'purchase' ? 'purchase-bills' : 'sales-bills'
      const billsResponse = await fetch(`/api/${billsEndpoint}?companyId=${companyIdParam}`)
      const billsData = await billsResponse.json()

      if (activeTab === 'purchase') {
        setPurchaseBills(billsData)
      } else {
        setSalesBills(billsData)
      }

      // Fetch payments
      const paymentsResponse = await fetch(`/api/payments?companyId=${companyIdParam}&billType=${activeTab}`)
      const paymentsData = await paymentsResponse.json()
      setPayments(paymentsData)

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  const handleMakePayment = (billId: string) => {
    setSelectedBill(billId)
    setShowPaymentForm(true)
  }

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedBill || !amount) {
      alert('Please select a bill and enter amount')
      return
    }

    try {
      const paymentData = {
        companyId,
        billType: activeTab,
        billId: selectedBill,
        payDate,
        amount: parseFloat(amount),
        mode,
        txnRef,
        note
      }

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      })

      if (response.ok) {
        alert('Payment recorded successfully!')
        setShowPaymentForm(false)
        setSelectedBill('')
        setAmount('')
        setTxnRef('')
        setNote('')
        fetchData() // Refresh data
      } else {
        alert('Error recording payment')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error recording payment')
    }
  }

  const getCurrentBills = () => activeTab === 'purchase' ? purchaseBills : salesBills
  const getTotalPending = () => {
    return getCurrentBills().reduce((sum, bill) => sum + bill.balanceAmount, 0)
  }

  const getTotalPaid = () => {
    return getCurrentBills().reduce((sum, bill) => {
      if (activeTab === 'purchase') {
        return sum + (bill as PurchaseBill).paidAmount
      } else {
        return sum + (bill as SalesBill).receivedAmount
      }
    }, 0)
  }

  const getBillName = (bill: PurchaseBill | SalesBill) => {
    if (activeTab === 'purchase') {
      return (bill as PurchaseBill).farmer.name
    } else {
      return (bill as SalesBill).party.name
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
              <Button variant="outline" onClick={() => router.push('/dashboard?companyId=' + companyId)}>
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
                    ₹{getCurrentBills().reduce((sum, bill) => sum + bill.totalAmount, 0).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total {activeTab === 'purchase' ? 'Paid' : 'Received'}</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{getTotalPaid().toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Pending</p>
                  <p className="text-2xl font-bold text-red-600">
                    ₹{getTotalPending().toFixed(2)}
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
                    {getCurrentBills().map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell>{bill.billNo}</TableCell>
                        <TableCell>{new Date(bill.billDate).toLocaleDateString()}</TableCell>
                        <TableCell>{getBillName(bill)}</TableCell>
                        <TableCell>₹{bill.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          ₹{(activeTab === 'purchase' ? (bill as PurchaseBill).paidAmount : (bill as SalesBill).receivedAmount).toFixed(2)}
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
                              onClick={() => handleMakePayment(bill.id)}
                              disabled={bill.balanceAmount === 0}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Pay
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/${activeTab}/view?billId=${bill.id}&companyId=${companyId}`)}
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
                        <TableCell>{new Date(payment.payDate).toLocaleDateString()}</TableCell>
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

          {/* Payment Form Modal */}
          {showPaymentForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Record Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitPayment} className="space-y-4">
                    <div>
                      <Label htmlFor="bill">Bill</Label>
                      <Select value={selectedBill} onValueChange={setSelectedBill}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Bill" />
                        </SelectTrigger>
                        <SelectContent>
                          {getCurrentBills().filter(bill => bill.balanceAmount > 0).map((bill) => (
                            <SelectItem key={bill.id} value={bill.id}>
                              {bill.billNo} - {getBillName(bill)} (Balance: ₹{bill.balanceAmount.toFixed(2)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="payDate">Payment Date</Label>
                      <Input
                        id="payDate"
                        type="date"
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="mode">Payment Mode</Label>
                      <Select value={mode} onValueChange={(value: 'cash' | 'online' | 'bank') => setMode(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="bank">Bank</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="txnRef">Transaction Reference</Label>
                      <Input
                        id="txnRef"
                        value={txnRef}
                        onChange={(e) => setTxnRef(e.target.value)}
                        placeholder="Enter transaction reference"
                      />
                    </div>
                    <div>
                      <Label htmlFor="note">Note</Label>
                      <Input
                        id="note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Enter note (optional)"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setShowPaymentForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Record Payment</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
