'use client'

import { useState, useEffect, Suspense, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DashboardLayout from '@/app/components/DashboardLayout'
import { resolveCompanyId, stripCompanyParamsFromUrl } from '@/lib/company-context'
import { Trash2 } from 'lucide-react'

interface Product {
  id: string
  name: string
}

interface SalesItemRow {
  id: string
  productId: string
  product?: {
    id: string
    name: string
  }
  bags?: number | null
  qty?: number
  weight?: number
  rate: number
  amount: number
}

interface TransportBill {
  id: string
  transportName?: string | null
  lorryNo?: string | null
  freightPerQt?: number | null
  freightAmount?: number | null
  advance?: number | null
  toPay?: number | null
}

interface SalesBill {
  id: string
  billNo: string
  billDate: string
  party: {
    id: string
    name: string
    address: string
    phone1: string
  }
  salesItems: SalesItemRow[]
  transportBills?: TransportBill[]
  totalAmount: number
  receivedAmount: number
  balanceAmount: number
  status: string
}

interface EditableSalesItem {
  id: string
  productId: string
  bags: number
  weight: number
  rate: number
  amount: number
}

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, parsed)
}

function toDateInputValue(value: unknown) {
  if (!value) return new Date().toISOString().split('T')[0]
  const parsed = new Date(String(value))
  if (!Number.isFinite(parsed.getTime())) {
    return new Date().toISOString().split('T')[0]
  }
  return parsed.toISOString().split('T')[0]
}

async function parseApiJson<T>(response: Response, fallback: T): Promise<T> {
  const raw = await response.text()
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export default function SalesEditPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SalesEditPageContent />
    </Suspense>
  )
}

function SalesEditPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const billId = searchParams.get('billId')

  const [companyId, setCompanyId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [salesBill, setSalesBill] = useState<SalesBill | null>(null)
  const [loading, setLoading] = useState(true)

  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [partyId, setPartyId] = useState('')
  const [partyName, setPartyName] = useState('')
  const [partyAddress, setPartyAddress] = useState('')
  const [partyContact, setPartyContact] = useState('')

  const [transportName, setTransportName] = useState('')
  const [lorryNo, setLorryNo] = useState('')
  const [freightPerQt, setFreightPerQt] = useState('')
  const [freightAmount, setFreightAmount] = useState('')
  const [advance, setAdvance] = useState('')
  const [toPay, setToPay] = useState('')

  const [items, setItems] = useState<EditableSalesItem[]>([])
  const [itemDraft, setItemDraft] = useState({
    productId: '',
    bags: '',
    weight: '',
    rate: ''
  })

  const [receivedAmount, setReceivedAmount] = useState('0')
  const [balance, setBalance] = useState('0')

  const itemsTotal = useMemo(
    () => items.reduce((sum, item) => sum + toNumber(item.amount), 0),
    [items]
  )

  const totalBags = useMemo(
    () => items.reduce((sum, item) => sum + Math.floor(toNumber(item.bags)), 0),
    [items]
  )

  const totalWeight = useMemo(
    () => items.reduce((sum, item) => sum + toNumber(item.weight), 0),
    [items]
  )

  useEffect(() => {
    const freight = toNumber(freightAmount)
    const adv = toNumber(advance)
    setToPay(Math.max(0, freight - adv).toFixed(2))
  }, [freightAmount, advance])

  useEffect(() => {
    const received = toNumber(receivedAmount)
    const safeReceived = Math.min(received, itemsTotal)
    if (safeReceived !== received) {
      setReceivedAmount(safeReceived.toFixed(2))
      return
    }
    setBalance(Math.max(0, itemsTotal - safeReceived).toFixed(2))
  }, [itemsTotal, receivedAmount])

  const fetchData = useCallback(async (targetCompanyId: string, isCancelled: () => boolean = () => false) => {
    try {
      const [productsRes, billRes] = await Promise.all([
        fetch(`/api/products?companyId=${targetCompanyId}`),
        fetch(`/api/sales-bills?companyId=${targetCompanyId}&billId=${billId}`)
      ])

      if (!productsRes.ok || !billRes.ok) {
        throw new Error('Failed to load sales edit data')
      }

      const [productsData, billPayload] = await Promise.all([
        parseApiJson<Product[]>(productsRes, []),
        parseApiJson<SalesBill | SalesBill[] | null>(billRes, null)
      ])

      if (isCancelled()) return

      const billData = (Array.isArray(billPayload) ? billPayload[0] : billPayload) as SalesBill | null
      if (!billData?.id) {
        throw new Error('Sales bill not found')
      }

      setProducts(Array.isArray(productsData) ? productsData : [])
      setSalesBill(billData)

      setInvoiceNo(String(billData.billNo || '1'))
      setInvoiceDate(toDateInputValue(billData.billDate))
      setPartyId(String(billData.party?.id || ''))
      setPartyName(String(billData.party?.name || ''))
      setPartyAddress(String(billData.party?.address || ''))
      setPartyContact(String(billData.party?.phone1 || ''))

      const firstTransport = Array.isArray(billData.transportBills) ? billData.transportBills[0] : undefined
      setTransportName(String(firstTransport?.transportName || ''))
      setLorryNo(String(firstTransport?.lorryNo || ''))
      setFreightPerQt(String(toNumber(firstTransport?.freightPerQt)))
      setFreightAmount(String(toNumber(firstTransport?.freightAmount)))
      setAdvance(String(toNumber(firstTransport?.advance)))
      setToPay(String(toNumber(firstTransport?.toPay)))

      const loadedItems = (billData.salesItems || []).map((item) => {
        const weight = toNumber(item.weight ?? item.qty ?? 0)
        const rate = toNumber(item.rate)
        return {
          id: item.id,
          productId: item.productId,
          bags: Math.floor(toNumber(item.bags ?? 0)),
          weight,
          rate,
          amount: toNumber(item.amount) || weight * rate
        }
      })
      setItems(loadedItems)
      setReceivedAmount(toNumber(billData.receivedAmount).toFixed(2))

      setLoading(false)
    } catch (error) {
      if (isCancelled()) return
      console.error('Error fetching data:', error)
      setLoading(false)
      alert('Error loading sales bill')
      router.back()
    }
  }, [billId, router])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!billId) {
        setLoading(false)
        alert('Missing bill ID')
        router.back()
        return
      }

      const resolvedCompanyId = await resolveCompanyId(window.location.search)
      if (cancelled) return

      if (!resolvedCompanyId) {
        setLoading(false)
        alert('Company not selected')
        router.push('/company/select')
        return
      }

      setCompanyId(resolvedCompanyId)
      stripCompanyParamsFromUrl()
      await fetchData(resolvedCompanyId, () => cancelled)
    })()

    return () => {
      cancelled = true
    }
  }, [billId, fetchData, router])

  const calculateDraftAmount = () => {
    const weight = toNumber(itemDraft.weight)
    const rate = toNumber(itemDraft.rate)
    return weight * rate
  }

  const updateItem = (id: string, patch: Partial<EditableSalesItem>) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row
        const next = { ...row, ...patch }
        const nextWeight = toNumber(next.weight)
        const nextRate = toNumber(next.rate)
        return {
          ...next,
          bags: Math.floor(toNumber(next.bags)),
          weight: nextWeight,
          rate: nextRate,
          amount: Number((nextWeight * nextRate).toFixed(2))
        }
      })
    )
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((row) => row.id !== id))
  }

  const addItem = () => {
    if (!itemDraft.productId) {
      alert('Please select product')
      return
    }

    const weight = toNumber(itemDraft.weight)
    const rate = toNumber(itemDraft.rate)
    const bags = Math.floor(toNumber(itemDraft.bags))

    if (weight <= 0) {
      alert('Weight must be greater than 0')
      return
    }

    if (rate <= 0) {
      alert('Rate must be greater than 0')
      return
    }

    setItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        productId: itemDraft.productId,
        bags,
        weight,
        rate,
        amount: Number((weight * rate).toFixed(2))
      }
    ])

    setItemDraft({ productId: '', bags: '', weight: '', rate: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!salesBill) {
      alert('Sales bill data not loaded')
      return
    }

    if (!partyId) {
      alert('Party is required')
      return
    }

    if (items.length === 0) {
      alert('At least one sales item is required')
      return
    }

    const safeReceived = toNumber(receivedAmount)
    if (safeReceived > itemsTotal) {
      alert(`Received amount cannot exceed total amount ₹${itemsTotal.toFixed(2)}`)
      return
    }

    const safeBalance = Math.max(0, itemsTotal - safeReceived)

    try {
      const requestData = {
        id: salesBill.id,
        companyId,
        invoiceNo: invoiceNo.trim() || salesBill.billNo,
        invoiceDate,
        partyName: partyId,
        partyAddress,
        partyContact,
        salesItems: items.map((item) => ({
          productId: item.productId,
          bags: Math.floor(toNumber(item.bags)),
          weight: toNumber(item.weight),
          totalWeight: toNumber(item.weight),
          rate: toNumber(item.rate),
          amount: Number((toNumber(item.weight) * toNumber(item.rate)).toFixed(2))
        })),
        transportBill: {
          transportName: transportName.trim() || null,
          lorryNo: lorryNo.trim() || null,
          freightPerQt: toNumber(freightPerQt),
          freightAmount: toNumber(freightAmount),
          advance: toNumber(advance),
          toPay: toNumber(toPay)
        },
        totalAmount: Number(itemsTotal.toFixed(2)),
        receivedAmount: Number(safeReceived.toFixed(2)),
        balanceAmount: Number(safeBalance.toFixed(2)),
        status: safeBalance === 0 ? 'paid' : safeReceived > 0 ? 'partial' : 'unpaid'
      }

      const response = await fetch('/api/sales-bills', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      const responseText = await response.text()
      let responseData: { error?: string } = {}
      try {
        responseData = responseText ? (JSON.parse(responseText) as { error?: string }) : {}
      } catch {
        responseData = { error: 'Invalid server response' }
      }

      if (response.ok) {
        alert('Sales bill updated successfully!')
        router.push('/sales/list')
      } else {
        alert(`Error updating sales bill: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error updating sales bill: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  if (loading) {
    return (
      <DashboardLayout companyId={companyId || ''}>
        <div className="flex justify-center items-center h-screen">Loading...</div>
      </DashboardLayout>
    )
  }

  if (!salesBill) {
    return (
      <DashboardLayout companyId={companyId || ''}>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Sales Bill Not Found</h2>
            <Button onClick={() => router.back()}>Go Back</Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout companyId={companyId || ''}>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Edit Sales Bill</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 pb-2 border-b">1. Basic Info (Party Locked)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="invoiceNo">Invoice Number</Label>
                      <Input
                        id="invoiceNo"
                        value={invoiceNo}
                        onChange={(e) => setInvoiceNo(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="invoiceDate">Invoice Date</Label>
                      <Input
                        id="invoiceDate"
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="partyLocked">Party Name (Locked)</Label>
                      <Input id="partyLocked" value={partyName} readOnly className="bg-gray-100" />
                    </div>

                    <div>
                      <Label htmlFor="partyAddress">Party Address</Label>
                      <Input id="partyAddress" value={partyAddress} readOnly className="bg-gray-100" />
                    </div>

                    <div>
                      <Label htmlFor="partyContact">Party Contact</Label>
                      <Input id="partyContact" value={partyContact} readOnly className="bg-gray-100" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 pb-2 border-b">2. Transport Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="transportName">Transport Name</Label>
                      <Input
                        id="transportName"
                        value={transportName}
                        onChange={(e) => setTransportName(e.target.value)}
                        placeholder="Enter transport name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lorryNo">Lorry Number</Label>
                      <Input
                        id="lorryNo"
                        value={lorryNo}
                        onChange={(e) => setLorryNo(e.target.value)}
                        placeholder="Enter lorry number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="freightPerQt">Freight Per Qt.</Label>
                      <Input
                        id="freightPerQt"
                        type="number"
                        min="0"
                        step="0.01"
                        value={freightPerQt}
                        onChange={(e) => setFreightPerQt(e.target.value)}
                        placeholder="Enter freight per quantity"
                      />
                    </div>
                    <div>
                      <Label htmlFor="freightAmount">Freight Amount</Label>
                      <Input
                        id="freightAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={freightAmount}
                        onChange={(e) => setFreightAmount(e.target.value)}
                        placeholder="Enter freight amount"
                      />
                    </div>
                    <div>
                      <Label htmlFor="advance">Advance</Label>
                      <Input
                        id="advance"
                        type="number"
                        min="0"
                        step="0.01"
                        value={advance}
                        onChange={(e) => setAdvance(e.target.value)}
                        placeholder="Enter advance amount"
                      />
                    </div>
                    <div>
                      <Label htmlFor="toPay">To Pay</Label>
                      <Input id="toPay" value={toPay} readOnly className="bg-gray-100" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 pb-2 border-b">3. Items</h3>

                  <div className="border rounded-lg p-4 mb-4">
                    <h4 className="font-semibold mb-3">Add Item</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                      <div className="lg:col-span-2">
                        <Label>Product</Label>
                        <Select
                          value={itemDraft.productId}
                          onValueChange={(value) => setItemDraft((prev) => ({ ...prev, productId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>No. of Bags</Label>
                        <Input
                          type="number"
                          min="0"
                          value={itemDraft.bags}
                          onChange={(e) => setItemDraft((prev) => ({ ...prev, bags: e.target.value }))}
                          placeholder="Bags"
                        />
                      </div>
                      <div>
                        <Label>Weight (Qt.)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={itemDraft.weight}
                          onChange={(e) => setItemDraft((prev) => ({ ...prev, weight: e.target.value }))}
                          placeholder="Weight"
                        />
                      </div>
                      <div>
                        <Label>Rate / Qt</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={itemDraft.rate}
                          onChange={(e) => setItemDraft((prev) => ({ ...prev, rate: e.target.value }))}
                          placeholder="Rate"
                        />
                      </div>
                      <div>
                        <Label>Amount</Label>
                        <Input value={calculateDraftAmount().toFixed(2)} readOnly className="bg-gray-100" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button type="button" onClick={addItem}>Add Item</Button>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Editable Items</h4>
                    {items.length === 0 ? (
                      <p className="text-sm text-gray-500">No items. Add at least one item.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Product</th>
                              <th className="text-right p-2">Bags</th>
                              <th className="text-right p-2">Weight (Qt.)</th>
                              <th className="text-right p-2">Rate / Qt</th>
                              <th className="text-right p-2">Amount</th>
                              <th className="text-center p-2">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((row) => (
                              <tr key={row.id} className="border-b">
                                <td className="p-2 min-w-[220px]">
                                  <Select
                                    value={row.productId}
                                    onValueChange={(value) => updateItem(row.id, { productId: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select Product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {products.map((product) => (
                                        <SelectItem key={product.id} value={product.id}>
                                          {product.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="p-2 text-right">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={row.bags}
                                    onChange={(e) => updateItem(row.id, { bags: Math.floor(toNumber(e.target.value)) })}
                                    className="text-right"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={row.weight}
                                    onChange={(e) => updateItem(row.id, { weight: toNumber(e.target.value) })}
                                    className="text-right"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={row.rate}
                                    onChange={(e) => updateItem(row.id, { rate: toNumber(e.target.value) })}
                                    className="text-right"
                                  />
                                </td>
                                <td className="p-2 text-right">₹{row.amount.toFixed(2)}</td>
                                <td className="p-2 text-center">
                                  <Button type="button" variant="outline" size="sm" onClick={() => removeItem(row.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 pb-2 border-b">4. Totals</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label>Total Items</Label>
                      <Input value={String(items.length)} readOnly className="bg-gray-100" />
                    </div>
                    <div>
                      <Label>Total Bags</Label>
                      <Input value={String(totalBags)} readOnly className="bg-gray-100" />
                    </div>
                    <div>
                      <Label>Total Weight (Qt.)</Label>
                      <Input value={totalWeight.toFixed(2)} readOnly className="bg-gray-100" />
                    </div>
                    <div>
                      <Label>Total Amount</Label>
                      <Input value={itemsTotal.toFixed(2)} readOnly className="bg-gray-100" />
                    </div>
                    <div>
                      <Label htmlFor="receivedAmount">Received Amount</Label>
                      <Input
                        id="receivedAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="balance">Balance</Label>
                      <Input id="balance" value={balance} readOnly className="bg-gray-100" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                  </Button>
                  <Button type="submit">Update Sales Bill</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
