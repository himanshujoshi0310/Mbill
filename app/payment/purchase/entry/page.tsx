'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DashboardLayout from '@/app/components/DashboardLayout'
import { ArrowLeft, CreditCard, DollarSign, Search } from 'lucide-react'
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
    id: string
    name: string
    address: string
    phone1: string
  } | null
  supplier?: {
    id: string
    name: string
    address: string
    phone1: string
  } | null
}

function getBillPartyName(bill: PurchaseBill): string {
  return bill.supplier?.name || bill.farmer?.name || 'Unknown'
}

function getBillPartyPhone(bill: PurchaseBill): string {
  return bill.supplier?.phone1 || bill.farmer?.phone1 || 'N/A'
}

export default function PurchasePaymentEntryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PurchasePaymentEntryPageContent />
    </Suspense>
  )
}

function PurchasePaymentEntryPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const companyId = searchParams.get('companyId') || ''
  const billId = searchParams.get('billId') || ''

  const [loading, setLoading] = useState(true)
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([])
  const [selectedBill, setSelectedBill] = useState('')

  // Bill search state
  const [billSearchTerm, setBillSearchTerm] = useState('')
  const [showBillDropdown, setShowBillDropdown] = useState(false)
  const [selectedBillData, setSelectedBillData] = useState<PurchaseBill | null>(null)

  // Payment form state
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<'cash' | 'online' | 'bank'>('cash')
  const [txnRef, setTxnRef] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const toNonNegative = (value: string) => {
    if (value === '') return ''
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return ''
    return String(Math.max(0, parsed))
  }

  const filteredBills = useMemo(() => {
    const query = billSearchTerm.trim().toLowerCase()
    if (!query) return purchaseBills
    return purchaseBills.filter(
      (bill) =>
        (bill.billNo || '').toLowerCase().includes(query) ||
        getBillPartyName(bill).toLowerCase().includes(query)
    )
  }, [billSearchTerm, purchaseBills])

  useEffect(() => {
    if (!companyId) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    void fetchPurchaseBills(controller.signal)
    return () => controller.abort()
  }, [companyId, dateFrom, dateTo])

  useEffect(() => {
    if (purchaseBills.length === 0) {
      setSelectedBill('')
      setSelectedBillData(null)
      setBillSearchTerm('')
      return
    }

    let nextId = selectedBill
    if (!nextId || !purchaseBills.some((row) => row.id === nextId)) {
      nextId = billId && purchaseBills.some((row) => row.id === billId) ? billId : purchaseBills[0].id
    }

    const nextSelected = purchaseBills.find((row) => row.id === nextId) || null
    setSelectedBill(nextId)
    setSelectedBillData(nextSelected)
    if (nextSelected) {
      setBillSearchTerm(`${nextSelected.billNo} - ${getBillPartyName(nextSelected)}`)
    }
  }, [purchaseBills, billId, selectedBill])

  // Handle bill selection
  const handleBillSelect = (bill: PurchaseBill) => {
    setSelectedBill(bill.id)
    setSelectedBillData(bill)
    setBillSearchTerm(`${bill.billNo} - ${getBillPartyName(bill)}`)
    setShowBillDropdown(false)
  }

  // Handle bill search
  const handleBillSearch = (term: string) => {
    setBillSearchTerm(term)
    setShowBillDropdown(true)
  }

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.search-dropdown-container')) {
        setShowBillDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchPurchaseBills = async (signal?: AbortSignal) => {
    try {
      let url = `/api/purchase-bills?companyId=${companyId}`
      
      // Add date filters if provided
      const params = new URLSearchParams()
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)
      
      if (params.toString()) {
        url += `&${params.toString()}`
      }
      
      const response = await fetch(url, { signal })
      if (signal?.aborted) return

      if (response.status === 401) {
        setPurchaseBills([])
        setSelectedBillData(null)
        setLoading(false)
        router.push('/login')
        return
      }

      if (response.status === 403) {
        // Locked/out-of-scope should not crash app; keep page stable with empty list.
        setPurchaseBills([])
        setSelectedBillData(null)
        setLoading(false)
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      const rows = Array.isArray(data) ? data : []
      
      // Filter bills that have pending balance (unpaid and partially paid)
      const pendingBills = rows.filter((bill: PurchaseBill) => Number(bill?.balanceAmount || 0) > 0)
      setPurchaseBills(pendingBills)
      setLoading(false)
    } catch (error) {
      if (isAbortError(error)) return
      console.error('Error fetching purchase bills:', error)
      setPurchaseBills([])
      setSelectedBillData(null)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedBill || !amount) {
      alert('Please select a bill and enter amount')
      return
    }

    const bill = purchaseBills.find(b => b.id === selectedBill)
    if (!bill) return

    // Validate amount
    const paymentAmount = parseFloat(amount)
    if (paymentAmount <= 0) {
      alert('Amount must be greater than 0')
      return
    }

    if (paymentAmount > bill.balanceAmount) {
      alert(`Amount cannot exceed balance: ₹${bill.balanceAmount.toFixed(2)}`)
      return
    }

    setSubmitting(true)

    try {
      const paymentData = {
        companyId,
        billType: 'purchase',
        billId: selectedBill,
        payDate,
        amount: paymentAmount,
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
        alert('Purchase payment recorded successfully!')
        
        // Reset form
        setAmount('')
        setTxnRef('')
        setNote('')
        
        // Refresh bills to update balances
        await fetchPurchaseBills()
      } else {
        const errorData = await response.json().catch(() => ({} as { error?: string; details?: Array<{ message?: string }> }))
        const detail = Array.isArray(errorData.details) && errorData.details.length > 0
          ? errorData.details[0]?.message
          : ''
        alert('Error recording payment: ' + (detail || errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error recording payment: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSubmitting(false)
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-bold">Record Purchase Payment</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Date Range Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dateFrom">From Date</Label>
                      <Input
                        id="dateFrom"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        placeholder="Select from date"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dateTo">To Date</Label>
                      <Input
                        id="dateTo"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        placeholder="Select to date"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bill">Select Bill</Label>
                    <div className="relative search-dropdown-container">
                      <Input
                        id="bill"
                        value={billSearchTerm}
                        onChange={(e) => handleBillSearch(e.target.value)}
                        onFocus={() => setShowBillDropdown(true)}
                        placeholder="Type to search bill number or supplier name..."
                        className="pr-10"
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      
                      {showBillDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredBills.length > 0 ? (
                            filteredBills.map((bill) => (
                              <div
                                key={bill.id}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onClick={() => handleBillSelect(bill)}
                              >
                                <div className="font-medium">{bill.billNo} - {getBillPartyName(bill)}</div>
                                <div className="text-sm text-gray-500">Balance: ₹{bill.balanceAmount.toFixed(2)} | Date: {new Date(bill.billDate).toLocaleDateString()}</div>
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-gray-500 text-sm">
                              {billSearchTerm ? 'No bills found matching your search.' : 'No unpaid bills found for selected date range.'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
                    <Label htmlFor="amount">Payment Amount</Label>
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
                        Max payable: ₹{selectedBillData.balanceAmount.toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="mode">Payment Mode</Label>
                    <Select value={mode} onValueChange={(value: 'cash' | 'online' | 'bank') => setMode(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
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
                      {submitting ? 'Recording...' : 'Record Payment'}
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
                        <Label>Bill Number</Label>
                        <p className="font-semibold">{selectedBillData.billNo}</p>
                      </div>
                      <div>
                        <Label>Bill Date</Label>
                        <p className="font-semibold">{new Date(selectedBillData.billDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label>Party Name</Label>
                        <p className="font-semibold">{getBillPartyName(selectedBillData)}</p>
                      </div>
                      <div>
                        <Label>Party Contact</Label>
                        <p className="font-semibold">{getBillPartyPhone(selectedBillData)}</p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3">Payment Summary</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Amount:</span>
                          <span className="font-medium">₹{selectedBillData.totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Already Paid:</span>
                          <span className="font-medium text-green-600">₹{selectedBillData.paidAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Balance Amount:</span>
                          <span className="font-medium text-red-600">₹{selectedBillData.balanceAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className={`font-medium px-2 py-1 rounded text-xs ${
                            selectedBillData.status === 'paid' ? 'bg-green-100 text-green-800' :
                            (selectedBillData.status === 'partial' || selectedBillData.status === 'partially_paid') ? 'bg-yellow-100 text-yellow-800' :
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
