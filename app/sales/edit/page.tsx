'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DashboardLayout from '@/app/components/DashboardLayout'

interface Product {
  id: string
  name: string
}

interface Party {
  id: string
  name: string
}

interface SalesItem {
  id: string
  productId: string
  productName: string
  totalWeight: number
  rate: number
  amount: number
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
  salesItems: Array<{
    id: string
    productId: string
    product: {
      id: string
      name: string
    }
    qty: number
    rate: number
    amount: number
  }>
  totalAmount: number
  receivedAmount: number
  balanceAmount: number
  status: string
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
  const companyId = searchParams.get('companyId')

  const [products, setProducts] = useState<Product[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [salesBill, setSalesBill] = useState<SalesBill | null>(null)
  const [loading, setLoading] = useState(true)

  // Form state
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [partyName, setPartyName] = useState('')
  const [partyAddress, setPartyAddress] = useState('')
  const [partyContact, setPartyContact] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [receivedAmount, setReceivedAmount] = useState('')
  const [balance, setBalance] = useState('')

  useEffect(() => {
    if (billId && companyId) {
      fetchData()
    } else {
      setLoading(false)
      alert('Missing bill ID or company ID')
      router.back()
    }
  }, [billId, companyId])

  // Calculate balance when total or received changes
  useEffect(() => {
    if (totalAmount && receivedAmount) {
      const total = parseFloat(totalAmount) || 0
      const received = parseFloat(receivedAmount) || 0
      setBalance((total - received).toString())
    } else {
      setBalance('')
    }
  }, [totalAmount, receivedAmount])

  const fetchData = async () => {
    try {
      // Fetch products and parties
      const [productsRes, partiesRes, billRes] = await Promise.all([
        fetch(`/api/products?companyId=${companyId}`),
        fetch(`/api/parties?companyId=${companyId}`),
        fetch(`/api/sales-bills?companyId=${companyId}&billId=${billId}`)
      ])

      const productsData = await productsRes.json()
      const partiesData = await partiesRes.json()
      const billData: SalesBill = await billRes.json()

      setProducts(productsData)
      setParties(partiesData)
      setSalesBill(billData)

      // Populate form with existing data
      setInvoiceNo(billData.billNo)
      setInvoiceDate(new Date(billData.billDate).toISOString().split('T')[0])
      setPartyName(billData.party.id)
      setPartyAddress(billData.party.address || '')
      setPartyContact(billData.party.phone1 || '')
      setTotalAmount(billData.totalAmount.toString())
      setReceivedAmount(billData.receivedAmount.toString())
      setBalance(billData.balanceAmount.toString())

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
      alert('Error loading sales bill')
      router.back()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!salesBill) {
      alert('Sales bill data not loaded')
      return
    }

    // Basic validation
    if (!partyName || !totalAmount) {
      alert('Please fill all required fields')
      return
    }

    try {
      const requestData = {
        id: salesBill.id,
        companyId,
        invoiceNo,
        invoiceDate,
        partyName,
        partyAddress,
        partyContact,
        salesItems: salesBill.salesItems.map(item => ({
          productId: item.productId,
          productName: item.product.name,
          totalWeight: item.qty,
          rate: item.rate,
          amount: item.amount
        })),
        totalAmount: parseFloat(totalAmount) || 0,
        receivedAmount: parseFloat(receivedAmount) || 0,
        balanceAmount: parseFloat(balance) || 0,
        status: (parseFloat(balance) || 0) === 0 ? 'paid' : (parseFloat(balance) || 0) === (parseFloat(totalAmount) || 0) ? 'unpaid' : 'partial',
      }

      console.log('Sending update request data:', requestData)

      const response = await fetch('/api/sales-bills', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      console.log('Response status:', response.status)
      const responseData = await response.json()
      console.log('Response data:', responseData)

      if (response.ok) {
        alert('Sales bill updated successfully!')
        router.push(`/sales/list?companyId=${companyId}`)
      } else {
        alert('Error updating sales bill: ' + (responseData.error || 'Unknown error'))
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
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Invoice Number */}
                  <div>
                    <Label htmlFor="invoiceNo">Invoice Number</Label>
                    <Input id="invoiceNo" value={invoiceNo} readOnly className="bg-gray-100" />
                  </div>

                  {/* Invoice Date */}
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

                  {/* Party Name */}
                  <div>
                    <Label htmlFor="partyName">Party Name</Label>
                    <Select value={partyName} onValueChange={setPartyName}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Party" />
                      </SelectTrigger>
                      <SelectContent>
                        {parties.map((party) => (
                          <SelectItem key={party.id} value={party.id}>
                            {party.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Party Address */}
                  <div>
                    <Label htmlFor="partyAddress">Party Address</Label>
                    <Input
                      id="partyAddress"
                      value={partyAddress}
                      onChange={(e) => setPartyAddress(e.target.value)}
                      placeholder="Enter party address"
                    />
                  </div>

                  {/* Party Contact */}
                  <div>
                    <Label htmlFor="partyContact">Party Contact</Label>
                    <Input
                      id="partyContact"
                      value={partyContact}
                      onChange={(e) => setPartyContact(e.target.value)}
                      placeholder="Enter party contact"
                    />
                  </div>

                  {/* Total Amount */}
                  <div>
                    <Label htmlFor="totalAmount">Total Amount</Label>
                    <Input
                      id="totalAmount"
                      type="number"
                      step="0.01"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="Enter total amount"
                      required
                    />
                  </div>

                  {/* Received Amount */}
                  <div>
                    <Label htmlFor="receivedAmount">Received Amount</Label>
                    <Input
                      id="receivedAmount"
                      type="number"
                      step="0.01"
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      placeholder="Enter received amount"
                    />
                  </div>

                  {/* Balance */}
                  <div>
                    <Label htmlFor="balance">Balance</Label>
                    <Input
                      id="balance"
                      value={balance}
                      readOnly
                      className="bg-gray-100"
                      placeholder="Calculated automatically"
                    />
                  </div>
                </div>

                {/* Sales Items Summary */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-4">Sales Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Product</th>
                          <th className="text-right p-2">Weight</th>
                          <th className="text-right p-2">Rate</th>
                          <th className="text-right p-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesBill.salesItems.map((item) => (
                          <tr key={item.id} className="border-b">
                            <td className="p-2">{item.product.name}</td>
                            <td className="text-right p-2">{item.qty}</td>
                            <td className="text-right p-2">₹{item.rate.toFixed(2)}</td>
                            <td className="text-right p-2">₹{item.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
