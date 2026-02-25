'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

export default function PurchaseEntryPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0])
  const [farmerName, setFarmerName] = useState('')
  const [farmerAddress, setFarmerAddress] = useState('')
  const [farmerContact, setFarmerContact] = useState('')
  const [krashakAnubandhNumber, setKrashakAnubandhNumber] = useState('')
  const [markaNumber, setMarkaNumber] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [noOfBags, setNoOfBags] = useState('')
  const [hammali, setHammali] = useState('')
  const [weight, setWeight] = useState('')
  const [rate, setRate] = useState('')
  const [payableAmount, setPayableAmount] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [balance, setBalance] = useState('')
  const [billNumber, setBillNumber] = useState('')
  const [lastBillNumber, setLastBillNumber] = useState(0)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Get companyId from URL or context
      const urlParams = new URLSearchParams(window.location.search)
      const companyId = urlParams.get('companyId')

      if (!companyId) {
        alert('Company not selected')
        router.push('/company/select')
        return
      }

      // Fetch products
      const token = document.cookie.replace(/(?:(?:^|.*;\s*)auth-token\s*\=\s*([^;]*).*$)|^.*$/, '$1');
      const productsRes = await fetch(`/api/products?companyId=${companyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const productsData = await productsRes.json()
      
      // Ensure products is always an array
      if (Array.isArray(productsData)) {
        setProducts(productsData)
      } else {
        console.error('Products API returned non-array data:', productsData)
        setProducts([])
      }

      // Generate next bill number
      console.log('Fetching last bill number for company:', companyId)
      const billsRes = await fetch(`/api/purchase-bills?companyId=${companyId}&last=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      console.log('Bills response status:', billsRes.status)
      const billsData = await billsRes.json()
      console.log('Bills data:', billsData)
      const lastBillNum = billsData.lastBillNumber || 0
      setLastBillNumber(lastBillNum)
      const nextBillNumber = lastBillNum + 1
      console.log('Next bill number:', nextBillNumber)
      setBillNumber(nextBillNumber.toString())

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  // Calculate hammali when noOfBags changes
  useEffect(() => {
    if (noOfBags) {
      const bags = parseFloat(noOfBags) || 0
      setHammali((bags * 7).toString())
    } else {
      setHammali('')
    }
  }, [noOfBags])

  // Calculate payable amount when weight or rate changes
  useEffect(() => {
    if (weight && rate) {
      const w = parseFloat(weight) || 0
      const r = parseFloat(rate) || 0
      const h = parseFloat(hammali) || 0
      setPayableAmount(((w * r) - h).toString())
    } else {
      setPayableAmount('')
    }
  }, [weight, rate, hammali])

  // Calculate balance when payable or paid changes
  useEffect(() => {
    if (payableAmount && paidAmount) {
      const payable = parseFloat(payableAmount) || 0
      const paid = parseFloat(paidAmount) || 0
      setBalance((payable - paid).toString())
    } else {
      setBalance('')
    }
  }, [payableAmount, paidAmount])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validation
    if (!farmerName || !selectedProduct || !weight || !rate || !billNumber) {
      alert('Please fill all required fields and wait for bill number to load')
      return
    }

    // Payment validation
    const payable = parseFloat(payableAmount) || 0
    const paid = parseFloat(paidAmount) || 0

    // Check if paid amount exceeds payable amount
    if (paid > payable) {
      alert('Paid amount cannot be more than payable amount!')
      return
    }

    // Determine payment status
    let paymentStatus = 'unpaid'
    if (paid > 0) {
      if (paid === payable) {
        paymentStatus = 'paid'
      } else {
        paymentStatus = 'partially_paid'
      }
    }

    try {
      const urlParams = new URLSearchParams(window.location.search)
      const companyId = urlParams.get('companyId')

      const requestData = {
        companyId,
        billNumber,
        billDate,
        farmerName,
        farmerAddress,
        farmerContact,
        krashakAnubandhNumber,
        markaNumber,
        productId: selectedProduct,
        noOfBags: parseFloat(noOfBags) || 0,
        hammali: parseFloat(hammali) || 0,
        weight: parseFloat(weight),
        rate: parseFloat(rate),
        payableAmount: parseFloat(payableAmount),
        paidAmount: parseFloat(paidAmount) || 0,
        balance: parseFloat(balance) || 0,
        paymentStatus,
      }

      console.log('Sending request data:', requestData)

      const response = await fetch('/api/purchase-bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      console.log('Response status:', response.status)
      const responseData = await response.json()
      console.log('Response data:', responseData)

      if (response.ok) {
        alert('Purchase bill created successfully!')
        router.push('/dashboard?companyId=' + companyId)
      } else {
        alert('Error creating purchase bill: ' + (responseData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error creating purchase bill: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  if (loading) {
    return (
      <DashboardLayout companyId="">
        <div className="flex justify-center items-center h-screen">Loading...</div>
      </DashboardLayout>
    )
  }

  const urlParams = new URLSearchParams(window.location.search)
  const companyId = urlParams.get('companyId') || ''

  return (
    <DashboardLayout companyId={companyId}>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Purchase Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Bill Number */}
                  <div>
                    <Label htmlFor="billNumber">Bill Number</Label>
                    <Input id="billNumber" value={billNumber} readOnly className="bg-gray-100" />
                    <p className="text-sm text-gray-500 mt-1">
                      Last bill: {lastBillNumber} | Next: {billNumber}
                    </p>
                  </div>

                  {/* Bill Date */}
                  <div>
                    <Label htmlFor="billDate">Bill Date</Label>
                    <Input
                      id="billDate"
                      type="date"
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      required
                    />
                  </div>

                  {/* Farmer Name */}
                  <div>
                    <Label htmlFor="farmerName">Farmer Name</Label>
                    <Input
                      id="farmerName"
                      value={farmerName}
                      onChange={(e) => setFarmerName(e.target.value)}
                      placeholder="Enter farmer name"
                      required
                    />
                  </div>

                  {/* Farmer Address */}
                  <div>
                    <Label htmlFor="farmerAddress">Farmer Address</Label>
                    <Input
                      id="farmerAddress"
                      value={farmerAddress}
                      onChange={(e) => setFarmerAddress(e.target.value)}
                      placeholder="Enter farmer address"
                    />
                  </div>

                  {/* Farmer Contact */}
                  <div>
                    <Label htmlFor="farmerContact">Farmer Contact</Label>
                    <Input
                      id="farmerContact"
                      value={farmerContact}
                      onChange={(e) => setFarmerContact(e.target.value)}
                      placeholder="Enter farmer contact"
                    />
                  </div>

                  {/* Krashak Anubandh Number */}
                  <div>
                    <Label htmlFor="krashakAnubandhNumber">Krashak Anubandh Number</Label>
                    <Input
                      id="krashakAnubandhNumber"
                      value={krashakAnubandhNumber}
                      onChange={(e) => setKrashakAnubandhNumber(e.target.value)}
                      placeholder="Enter Krashak Anubandh Number"
                    />
                  </div>

                  {/* Marka Number */}
                  <div>
                    <Label htmlFor="markaNumber">Marka No.</Label>
                    <Input
                      id="markaNumber"
                      value={markaNumber}
                      onChange={(e) => setMarkaNumber(e.target.value)}
                      placeholder="Enter Marka Number"
                    />
                  </div>

                  {/* Product */}
                  <div>
                    <Label htmlFor="product">Purchase Product</Label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(products) && products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* No. of Bags */}
                  <div>
                    <Label htmlFor="noOfBags">No. of Bags</Label>
                    <Input
                      id="noOfBags"
                      type="number"
                      value={noOfBags}
                      onChange={(e) => setNoOfBags(e.target.value)}
                      placeholder="Enter number of bags"
                    />
                  </div>

                  {/* Hammali */}
                  <div>
                    <Label htmlFor="hammali">Hammali</Label>
                    <Input
                      id="hammali"
                      value={hammali}
                      readOnly
                      className="bg-gray-100"
                      placeholder="Calculated automatically"
                    />
                  </div>

                  {/* Weight */}
                  <div>
                    <Label htmlFor="weight">Weight</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.01"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="Enter weight"
                      required
                    />
                  </div>

                  {/* Rate */}
                  <div>
                    <Label htmlFor="rate">Rate</Label>
                    <Input
                      id="rate"
                      type="number"
                      step="0.01"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      placeholder="Enter rate"
                      required
                    />
                  </div>

                  {/* Payable Amount */}
                  <div>
                    <Label htmlFor="payableAmount">Payable Amount</Label>
                    <Input
                      id="payableAmount"
                      value={payableAmount}
                      readOnly
                      className="bg-gray-100"
                      placeholder="Calculated automatically"
                    />
                  </div>

                  {/* Paid Amount */}
                  <div>
                    <Label htmlFor="paidAmount">Paid Amount</Label>
                    <Input
                      id="paidAmount"
                      type="number"
                      step="0.01"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="Enter paid amount"
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

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Purchase Bill</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
