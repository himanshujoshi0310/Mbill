'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DashboardLayout from '@/app/components/DashboardLayout'
import { ArrowLeft, CreditCard, DollarSign } from 'lucide-react'
import { isAbortError } from '@/lib/http'

interface SalesBill {
  id: string
  billNo: string
  billDate: string
  totalAmount: number
  receivedAmount: number
  balanceAmount: number
  status: string
  party: {
    id: string
    name: string
    address: string
    phone1: string
  }
}

interface Bank {
  id: string
  name: string
  branch?: string
  ifscCode: string
  accountNumber?: string
}

interface PaymentMode {
  id: string
  name: string
  code: string
  isActive: boolean
}

export default function SalesPaymentEntryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SalesPaymentEntryPageContent />
    </Suspense>
  )
}

function SalesPaymentEntryPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const companyId = searchParams.get('companyId') || ''
  const billId = searchParams.get('billId') || ''

  const [loading, setLoading] = useState(true)
  const [salesBills, setSalesBills] = useState<SalesBill[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([])
  const [selectedBill, setSelectedBill] = useState('')

  // Receipt form state
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('')
  const [selectedBank, setSelectedBank] = useState('')
  const [txnRef, setTxnRef] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const toNonNegative = (value: string) => {
    if (value === '') return ''
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return ''
    return String(Math.max(0, parsed))
  }

  useEffect(() => {
    if (!companyId) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    void fetchSalesBills(controller.signal)
    void fetchBanks(controller.signal)
    void fetchPaymentModes(controller.signal)
    return () => controller.abort()
  }, [companyId])

  const fetchBanks = async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/banks?companyId=${companyId}`, { signal })
      if (signal?.aborted) return
      if (response.ok) {
        const data = await response.json()
        setBanks(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      if (isAbortError(error)) return
      console.error('Error fetching banks:', error)
    }
  }

  const fetchPaymentModes = async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/payment-modes?companyId=${companyId}`, { signal })
      if (signal?.aborted) return
      if (response.ok) {
        const data = await response.json()
        const rows = Array.isArray(data) ? data : []
        setPaymentModes(rows.filter((pm: PaymentMode) => pm.isActive))
      }
    } catch (error) {
      if (isAbortError(error)) return
      console.error('Error fetching payment modes:', error)
    }
  }

  useEffect(() => {
    if (billId) {
      setSelectedBill(billId)
    }
  }, [billId])

  const fetchSalesBills = async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/sales-bills?companyId=${companyId}`, { signal })
      if (signal?.aborted) return
      const data = await response.json()
      const rows = Array.isArray(data) ? data : []
      
      // Filter bills that have pending balance
      const pendingBills = rows.filter((bill: SalesBill) => Number(bill?.balanceAmount || 0) > 0)
      setSalesBills(pendingBills)
      setLoading(false)
    } catch (error) {
      if (isAbortError(error)) return
      console.error('Error fetching sales bills:', error)
      setSalesBills([])
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedBill || !amount) {
      alert('Please select a bill and enter amount')
      return
    }

    if (!selectedPaymentMode) {
      alert('Please select payment mode')
      return
    }

    const bill = salesBills.find(b => b.id === selectedBill)
    if (!bill) return

    // Validate amount
    const receiptAmount = parseFloat(amount)
    if (receiptAmount <= 0) {
      alert('Amount must be greater than 0')
      return
    }

    if (receiptAmount > bill.balanceAmount) {
      alert(`Amount cannot exceed balance: ₹${bill.balanceAmount.toFixed(2)}`)
      return
    }

    setSubmitting(true)

    try {
      const receiptData = {
        companyId,
        billType: 'sales',
        billId: selectedBill,
        payDate: receiptDate,
        amount: receiptAmount,
        mode: selectedPaymentMode,
        bankId: selectedBank === 'none' ? null : selectedBank,
        txnRef,
        note
      }

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiptData),
      })

      if (response.ok) {
        alert('Sales receipt recorded successfully!')
        
        // Reset form
        setAmount('')
        setSelectedPaymentMode('')
        setSelectedBank('')
        setTxnRef('')
        setNote('')
        
        // Refresh bills to update balances
        await fetchSalesBills()
      } else {
        const errorData = await response.json().catch(() => ({} as { error?: string; details?: Array<{ message?: string }> }))
        const detail = Array.isArray(errorData.details) && errorData.details.length > 0
          ? errorData.details[0]?.message
          : ''
        alert('Error recording receipt: ' + (detail || errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error recording receipt: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSubmitting(false)
    }
  }

  const selectedBillData = salesBills.find(bill => bill.id === selectedBill)

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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-bold">Record Sales Receipt</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Receipt Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Receipt Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="bill">Select Bill</Label>
                    <Select value={selectedBill} onValueChange={setSelectedBill}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Sales Bill" />
                      </SelectTrigger>
                      <SelectContent>
                        {salesBills.map((bill) => (
                          <SelectItem key={bill.id} value={bill.id}>
                            {bill.billNo} - {bill.party.name} (Balance: ₹{bill.balanceAmount.toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="receiptDate">Receipt Date</Label>
                    <Input
                      id="receiptDate"
                      type="date"
                      value={receiptDate}
                      onChange={(e) => setReceiptDate(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="amount">Receipt Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(toNonNegative(e.target.value))}
                      placeholder="Enter amount"
                      required
                    />
                    {selectedBillData && (
                      <p className="text-sm text-gray-500 mt-1">
                        Max receivable: ₹{selectedBillData.balanceAmount.toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="paymentMode">Payment Mode</Label>
                    <Select value={selectedPaymentMode} onValueChange={setSelectedPaymentMode}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentModes.map((pm) => (
                          <SelectItem key={pm.id} value={pm.code}>
                            {pm.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="bank">Bank (Optional)</Label>
                    <Select value={selectedBank} onValueChange={setSelectedBank}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank (for non-cash payments)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Bank</SelectItem>
                        {banks.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.name} ({bank.branch})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="txnRef">Transaction Reference</Label>
                    <Input
                      id="txnRef"
                      value={txnRef}
                      onChange={(e) => setTxnRef(e.target.value)}
                      placeholder="Enter transaction reference (optional)"
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

                  <div className="flex gap-2">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Recording...' : 'Record Receipt'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Bill Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Bill Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedBillData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Invoice Number</Label>
                        <p className="font-semibold">{selectedBillData.billNo}</p>
                      </div>
                      <div>
                        <Label>Invoice Date</Label>
                        <p className="font-semibold">{new Date(selectedBillData.billDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label>Party Name</Label>
                        <p className="font-semibold">{selectedBillData.party.name}</p>
                      </div>
                      <div>
                        <Label>Party Contact</Label>
                        <p className="font-semibold">{selectedBillData.party.phone1 || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3">Receipt Summary</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Amount:</span>
                          <span className="font-medium">₹{selectedBillData.totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Already Received:</span>
                          <span className="font-medium text-green-600">₹{selectedBillData.receivedAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Balance Amount:</span>
                          <span className="font-medium text-red-600">₹{selectedBillData.balanceAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className={`font-medium px-2 py-1 rounded text-xs ${
                            selectedBillData.status === 'paid' ? 'bg-green-100 text-green-800' :
                            selectedBillData.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {selectedBillData.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p>Select a bill to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
