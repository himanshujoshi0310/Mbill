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

interface Supplier {
  id: string
  name: string
  address: string
  phone1: string
}

export default function SpecialPurchaseEntryPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0])
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [supplierAddress, setSupplierAddress] = useState('')
  const [supplierContact, setSupplierContact] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [noOfBags, setNoOfBags] = useState('')
  const [weight, setWeight] = useState('')
  const [rate, setRate] = useState('')
  const [netAmount, setNetAmount] = useState('')
  const [otherAmount, setOtherAmount] = useState('')
  const [grossAmount, setGrossAmount] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [balance, setBalance] = useState('')

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
      const productsRes = await fetch(`/api/products?companyId=${companyId}`)
      const productsData = await productsRes.json()
      setProducts(productsData)

      // Fetch suppliers
      const suppliersRes = await fetch(`/api/suppliers?companyId=${companyId}`)
      const suppliersData = await suppliersRes.json()
      setSuppliers(suppliersData)

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  // Calculate net amount when weight or rate changes
  useEffect(() => {
    if (weight && rate) {
      const w = parseFloat(weight) || 0
      const r = parseFloat(rate) || 0
      setNetAmount((w * r).toString())
    } else {
      setNetAmount('')
    }
  }, [weight, rate])

  // Calculate gross amount when net amount or other amount changes
  useEffect(() => {
    if (netAmount && otherAmount) {
      const net = parseFloat(netAmount) || 0
      const other = parseFloat(otherAmount) || 0
      setGrossAmount((net + other).toString())
    } else if (netAmount) {
      setGrossAmount(netAmount)
    } else {
      setGrossAmount('')
    }
  }, [netAmount, otherAmount])

  // Calculate balance when gross or paid changes
  useEffect(() => {
    if (grossAmount && paidAmount) {
      const gross = parseFloat(grossAmount) || 0
      const paid = parseFloat(paidAmount) || 0
      setBalance((gross - paid).toString())
    } else {
      setBalance('')
    }
  }, [grossAmount, paidAmount])

  // Handle supplier selection
  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplier(supplierId)
    const supplier = suppliers.find(s => s.id === supplierId)
    if (supplier) {
      setSupplierName(supplier.name)
      setSupplierAddress(supplier.address || '')
      setSupplierContact(supplier.phone1 || '')
    } else {
      setSupplierName('')
      setSupplierAddress('')
      setSupplierContact('')
    }
  }

  // Handle new supplier addition
  const handleAddNewSupplier = async () => {
    if (!supplierName) {
      alert('Please enter supplier name')
      return
    }

    try {
      const urlParams = new URLSearchParams(window.location.search)
      const companyId = urlParams.get('companyId')

      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          name: supplierName,
          address: supplierAddress,
          phone1: supplierContact,
        }),
      })

      if (response.ok) {
        const newSupplier = await response.json()
        setSuppliers([...suppliers, newSupplier])
        setSelectedSupplier(newSupplier.id)
        alert('Supplier added successfully!')
      } else {
        const error = await response.json()
        alert('Error adding supplier: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error adding supplier: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validation
    if (!supplierInvoiceNo || !supplierName || !selectedProduct || !weight || !rate) {
      alert('Please fill all required fields')
      return
    }

    // Payment validation
    const gross = parseFloat(grossAmount) || 0
    const paid = parseFloat(paidAmount) || 0

    // Check if paid amount exceeds gross amount
    if (paid > gross) {
      alert('Paid amount cannot be more than gross amount!')
      return
    }

    // Determine payment status
    let paymentStatus = 'unpaid'
    if (paid > 0) {
      if (paid === gross) {
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
        supplierInvoiceNo,
        billDate,
        supplierName,
        supplierAddress,
        supplierContact,
        productId: selectedProduct,
        noOfBags: parseFloat(noOfBags) || 0,
        weight: parseFloat(weight),
        rate: parseFloat(rate),
        netAmount: parseFloat(netAmount),
        otherAmount: parseFloat(otherAmount) || 0,
        grossAmount: parseFloat(grossAmount),
        paidAmount: parseFloat(paidAmount) || 0,
        balance: parseFloat(balance) || 0,
        paymentStatus,
      }

      console.log('Sending special purchase request data:', requestData)

      const response = await fetch('/api/special-purchase-bills', {
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
        alert('Special purchase bill created successfully!')
        router.push('/dashboard?companyId=' + companyId)
      } else {
        alert('Error creating special purchase bill: ' + (responseData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error creating special purchase bill: ' + (error instanceof Error ? error.message : 'Unknown error'))
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
              <CardTitle className="text-2xl font-bold">Special Purchase Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Supplier Invoice No */}
                  <div>
                    <Label htmlFor="supplierInvoiceNo">Supplier Invoice No.</Label>
                    <Input
                      id="supplierInvoiceNo"
                      value={supplierInvoiceNo}
                      onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                      placeholder="Enter supplier invoice number"
                      required
                    />
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

                  {/* Supplier Selection */}
                  <div>
                    <Label htmlFor="supplier">Supplier</Label>
                    <div className="flex gap-2">
                      <Select value={selectedSupplier} onValueChange={handleSupplierChange}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select Supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" onClick={() => setSelectedSupplier('')}>
                        New
                      </Button>
                    </div>
                  </div>

                  {/* Supplier Name */}
                  <div>
                    <Label htmlFor="supplierName">Supplier Name</Label>
                    <Input
                      id="supplierName"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="Enter supplier name"
                      required
                      disabled={selectedSupplier !== ''}
                    />
                  </div>

                  {/* Supplier Address */}
                  <div>
                    <Label htmlFor="supplierAddress">Supplier Address</Label>
                    <Input
                      id="supplierAddress"
                      value={supplierAddress}
                      onChange={(e) => setSupplierAddress(e.target.value)}
                      placeholder="Enter supplier address"
                      disabled={selectedSupplier !== ''}
                    />
                  </div>

                  {/* Supplier Contact */}
                  <div>
                    <Label htmlFor="supplierContact">Supplier Contact No.</Label>
                    <Input
                      id="supplierContact"
                      value={supplierContact}
                      onChange={(e) => setSupplierContact(e.target.value)}
                      placeholder="Enter supplier contact"
                      disabled={selectedSupplier !== ''}
                    />
                  </div>

                  {/* Add New Supplier Button */}
                  {!selectedSupplier && supplierName && (
                    <div className="flex items-end">
                      <Button type="button" variant="outline" onClick={handleAddNewSupplier}>
                        Add Supplier
                      </Button>
                    </div>
                  )}

                  {/* Product */}
                  <div>
                    <Label htmlFor="product">Product</Label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
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

                  {/* Net Amount */}
                  <div>
                    <Label htmlFor="netAmount">Net Amount</Label>
                    <Input
                      id="netAmount"
                      value={netAmount}
                      readOnly
                      className="bg-gray-100"
                      placeholder="Calculated automatically"
                    />
                  </div>

                  {/* Other Amount */}
                  <div>
                    <Label htmlFor="otherAmount">Other Amount</Label>
                    <Input
                      id="otherAmount"
                      type="number"
                      step="0.01"
                      value={otherAmount}
                      onChange={(e) => setOtherAmount(e.target.value)}
                      placeholder="Enter other amount"
                    />
                  </div>

                  {/* Gross Amount */}
                  <div>
                    <Label htmlFor="grossAmount">Gross Amount</Label>
                    <Input
                      id="grossAmount"
                      value={grossAmount}
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
                  <Button type="submit">Save Special Purchase Bill</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
