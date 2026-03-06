'use client'

import { useState, useEffect, Suspense, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DashboardLayout from '@/app/components/DashboardLayout'
import { ArrowLeft, CreditCard, DollarSign, Search } from 'lucide-react'
import { resolveCompanyId, stripCompanyParamsFromUrl } from '@/lib/company-context'

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

type PartyBillGroup = {
  partyName: string
  bills: PurchaseBill[]
  totalPending: number
}

function getBillPartyName(bill: PurchaseBill): string {
  return bill.supplier?.name || bill.farmer?.name || 'Unknown'
}

function getBillPartyPhone(bill: PurchaseBill): string {
  return bill.supplier?.phone1 || bill.farmer?.phone1 || 'N/A'
}

function formatDateSafe(value: string): string {
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleDateString() : '-'
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
  const billId = searchParams.get('billId') || ''

  const [companyId, setCompanyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([])
  const [selectedBill, setSelectedBill] = useState('')
  const [selectedPartyName, setSelectedPartyName] = useState('')
  const [partySearch, setPartySearch] = useState('')
  const [mergeSamePartyBills, setMergeSamePartyBills] = useState(false)

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

  const pendingBills = useMemo(
    () =>
      purchaseBills
        .slice()
        .sort((a, b) => Number(b.balanceAmount || 0) - Number(a.balanceAmount || 0)),
    [purchaseBills]
  )

  const totalPendingAmount = useMemo(
    () => pendingBills.reduce((sum, bill) => sum + Number(bill.balanceAmount || 0), 0),
    [pendingBills]
  )

  const partyGroups = useMemo<PartyBillGroup[]>(() => {
    const grouped = new Map<string, PartyBillGroup>()
    for (const bill of pendingBills) {
      const partyName = getBillPartyName(bill)
      const existing = grouped.get(partyName)
      if (!existing) {
        grouped.set(partyName, {
          partyName,
          bills: [bill],
          totalPending: Number(bill.balanceAmount || 0)
        })
        continue
      }
      existing.bills.push(bill)
      existing.totalPending += Number(bill.balanceAmount || 0)
    }
    return Array.from(grouped.values()).sort((a, b) => b.totalPending - a.totalPending)
  }, [pendingBills])

  const filteredPartyGroups = useMemo(() => {
    const query = partySearch.trim().toLowerCase()
    if (!query) return partyGroups
    return partyGroups.filter((group) => group.partyName.toLowerCase().includes(query))
  }, [partyGroups, partySearch])

  const selectedPartyBills = useMemo(() => {
    if (!selectedPartyName) return []
    return pendingBills.filter((bill) => getBillPartyName(bill) === selectedPartyName)
  }, [pendingBills, selectedPartyName])

  const selectedPartyPendingTotal = useMemo(
    () => selectedPartyBills.reduce((sum, bill) => sum + Number(bill.balanceAmount || 0), 0),
    [selectedPartyBills]
  )

  const unpaidBillsPanel = (
    <div className="rounded-md border p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">All Unpaid Bills</h3>
        <span className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-700">
          {pendingBills.length}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-2">
        Total pending: ₹{totalPendingAmount.toFixed(2)}
      </p>
      {selectedPartyName && (
        <p className="text-xs text-gray-500 mb-2">
          Selected party: <span className="font-medium">{selectedPartyName}</span>
        </p>
      )}
      {pendingBills.length === 0 ? (
        <p className="text-sm text-gray-500">No unpaid bills found.</p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {(selectedPartyName ? selectedPartyBills : pendingBills).map((bill) => (
            <button
              key={bill.id}
              type="button"
              onClick={() => handleBillSelect(bill)}
              className={`w-full rounded-md border p-2 text-left transition ${
                selectedBill === bill.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {bill.billNo} - {getBillPartyName(bill)}
                  </p>
                  <p className="text-xs text-gray-500">{formatDateSafe(bill.billDate)}</p>
                </div>
                <span className="text-sm font-semibold text-red-600 whitespace-nowrap">
                  ₹{bill.balanceAmount.toFixed(2)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedPartyBills.length > 1 && (
        <div className="mt-3 pt-2 border-t">
          <p className="text-xs text-gray-600">
            Same party pending bills: <span className="font-semibold">{selectedPartyBills.length}</span>
          </p>
        </div>
      )}
    </div>
  )

  useEffect(() => {
    ;(async () => {
      const resolvedCompanyId = await resolveCompanyId(window.location.search)
      if (!resolvedCompanyId) {
        setLoading(false)
        router.push('/company/select')
        return
      }
      setCompanyId(resolvedCompanyId)
      stripCompanyParamsFromUrl()
    })()
  }, [router])

  const fetchPurchaseBills = useCallback(async (targetCompanyId: string) => {
    try {
      let url = `/api/purchase-bills?companyId=${targetCompanyId}`
      
      // Add date filters if provided
      const params = new URLSearchParams()
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)
      
      if (params.toString()) {
        url += `&${params.toString()}`
      }
      
      const response = await fetch(url)

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
      console.error('Error fetching purchase bills:', error)
      setPurchaseBills([])
      setSelectedBillData(null)
      setLoading(false)
    }
  }, [dateFrom, dateTo, router])

  useEffect(() => {
    if (!companyId) return
    setLoading(true)
    void fetchPurchaseBills(companyId)
  }, [companyId, fetchPurchaseBills])

  useEffect(() => {
    if (purchaseBills.length === 0) {
      setSelectedPartyName('')
      setSelectedBill('')
      setSelectedBillData(null)
      setBillSearchTerm('')
      return
    }

    const billFromQuery = billId ? purchaseBills.find((row) => row.id === billId) : undefined
    if (billFromQuery) {
      const party = getBillPartyName(billFromQuery)
      if (selectedPartyName !== party) setSelectedPartyName(party)
      if (selectedBill !== billFromQuery.id) setSelectedBill(billFromQuery.id)
      setSelectedBillData(billFromQuery)
      setBillSearchTerm(`${billFromQuery.billNo} - ${party}`)
      return
    }

    if (selectedPartyName) {
      const partyStillExists = purchaseBills.some((bill) => getBillPartyName(bill) === selectedPartyName)
      if (!partyStillExists) {
        setSelectedPartyName('')
        setSelectedBill('')
        setSelectedBillData(null)
        setBillSearchTerm('')
      }
      return
    }

    if (selectedBill) setSelectedBill('')
    if (selectedBillData) setSelectedBillData(null)
    if (billSearchTerm) setBillSearchTerm('')
  }, [purchaseBills, billId, selectedBill, selectedPartyName, selectedBillData, billSearchTerm])

  useEffect(() => {
    if (!selectedPartyName) return
    if (selectedPartyBills.length === 0) {
      setSelectedBill('')
      setSelectedBillData(null)
      setBillSearchTerm('')
      return
    }

    if (!selectedPartyBills.some((bill) => bill.id === selectedBill)) {
      const next = selectedPartyBills[0]
      setSelectedBill(next.id)
      setSelectedBillData(next)
      setBillSearchTerm(`${next.billNo} - ${getBillPartyName(next)}`)
    }
  }, [selectedPartyName, selectedPartyBills, selectedBill])

  // Handle bill selection
  const handleBillSelect = (bill: PurchaseBill) => {
    setSelectedBill(bill.id)
    setSelectedPartyName(getBillPartyName(bill))
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

  const submitPayment = async (targetBillId: string, targetAmount: number) => {
    const paymentData = {
      companyId,
      billType: 'purchase',
      billId: targetBillId,
      payDate,
      amount: targetAmount,
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

    if (response.ok) return { ok: true as const }

    const errorData = await response.json().catch(() => ({} as { error?: string; details?: Array<{ message?: string }> }))
    const detail = Array.isArray(errorData.details) && errorData.details.length > 0
      ? errorData.details[0]?.message
      : ''

    return {
      ok: false as const,
      error: detail || errorData.error || 'Unknown error'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount) {
      alert('Please enter amount')
      return
    }

    // Validate amount
    const paymentAmount = parseFloat(amount)
    if (paymentAmount <= 0) {
      alert('Amount must be greater than 0')
      return
    }

    setSubmitting(true)

    try {
      if (mergeSamePartyBills) {
        if (!selectedPartyName) {
          alert('Please select a party')
          return
        }
        if (selectedPartyBills.length === 0) {
          alert('No unpaid bills found for selected party')
          return
        }
        if (paymentAmount > selectedPartyPendingTotal) {
          alert(`Amount cannot exceed selected party pending total: ₹${selectedPartyPendingTotal.toFixed(2)}`)
          return
        }

        const sortedBills = selectedPartyBills
          .slice()
          .sort((a, b) => new Date(a.billDate).getTime() - new Date(b.billDate).getTime())

        let remaining = paymentAmount
        let processed = 0

        for (const bill of sortedBills) {
          if (remaining <= 0) break
          const allocation = Math.min(remaining, Number(bill.balanceAmount || 0))
          if (allocation <= 0) continue
          const result = await submitPayment(bill.id, allocation)
          if (!result.ok) {
            throw new Error(`Failed while recording bill ${bill.billNo}: ${result.error || 'Unknown error'}`)
          }
          remaining -= allocation
          processed += 1
        }

        alert(`Payment recorded across ${processed} bill(s) for "${selectedPartyName}".`)
      } else {
        if (!selectedBill) {
          alert('Please select a bill')
          return
        }
        const bill = purchaseBills.find((b) => b.id === selectedBill)
        if (!bill) return

        if (paymentAmount > bill.balanceAmount) {
          alert(`Amount cannot exceed balance: ₹${bill.balanceAmount.toFixed(2)}`)
          return
        }

        const result = await submitPayment(selectedBill, paymentAmount)
        if (!result.ok) {
          throw new Error(result.error || 'Unknown error')
        }
        alert('Purchase payment recorded successfully!')
      }

      // Reset form
      setAmount('')
      setTxnRef('')
      setNote('')
      setMergeSamePartyBills(false)

      // Refresh bills to update balances
      await fetchPurchaseBills(companyId)
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
        <div className="max-w-6xl mx-auto">
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

                  <div className="space-y-2">
                    <Label htmlFor="partySearch">Select Party</Label>
                    <div className="relative">
                      <Input
                        id="partySearch"
                        value={partySearch}
                        onChange={(e) => setPartySearch(e.target.value)}
                        placeholder="Search supplier/farmer..."
                        className="pr-9"
                      />
                      <Search className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50">
                      {filteredPartyGroups.length === 0 ? (
                        <p className="text-sm text-gray-500 col-span-full">No party found.</p>
                      ) : (
                        filteredPartyGroups.map((group) => (
                          <button
                            type="button"
                            key={group.partyName}
                            onClick={() => setSelectedPartyName(group.partyName)}
                            className={`rounded-md border px-3 py-2 text-left transition ${
                              selectedPartyName === group.partyName
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <p className="text-sm font-medium truncate">{group.partyName}</p>
                            <p className="text-xs text-gray-500">
                              {group.bills.length} bill(s) • ₹{group.totalPending.toFixed(2)}
                            </p>
                          </button>
                        ))
                      )}
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
                          {(selectedPartyName ? filteredBills.filter((bill) => getBillPartyName(bill) === selectedPartyName) : filteredBills).length > 0 ? (
                            (selectedPartyName ? filteredBills.filter((bill) => getBillPartyName(bill) === selectedPartyName) : filteredBills).map((bill) => (
                              <div
                                key={bill.id}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onClick={() => handleBillSelect(bill)}
                              >
                                <div className="font-medium">{bill.billNo} - {getBillPartyName(bill)}</div>
                                <div className="text-sm text-gray-500">Balance: ₹{bill.balanceAmount.toFixed(2)} | Date: {formatDateSafe(bill.billDate)}</div>
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
                    {selectedPartyName && (
                      <p className="text-xs text-gray-500 mt-1">
                        Pending for {selectedPartyName}: ₹{selectedPartyPendingTotal.toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 rounded-md border border-dashed p-3 bg-gray-50">
                    <input
                      id="mergeSamePartyBills"
                      type="checkbox"
                      checked={mergeSamePartyBills}
                      onChange={(e) => setMergeSamePartyBills(e.target.checked)}
                    />
                    <Label htmlFor="mergeSamePartyBills" className="cursor-pointer">
                      Merge mode: auto-split payment across all unpaid bills of selected party
                    </Label>
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
                        <p className="font-semibold">{formatDateSafe(selectedBillData.billDate)}</p>
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

                    <div className="border-t pt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
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
                      {unpaidBillsPanel}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 py-2">
                    <div className="text-center text-gray-500">
                      <p>Select a bill to view details</p>
                    </div>
                    {unpaidBillsPanel}
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
