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
import { Eye, Edit, Trash2, Printer, FileText, Download, CreditCard } from 'lucide-react'

interface Farmer {
  id: string
  name: string
  address: string
  krashakAnubandhNumber: string
}

interface Supplier {
  id: string
  name: string
  address: string
  gstNumber: string
}

interface PurchaseItem {
  qty: number
  rate: number
  hammali: number
  amount: number
}

interface SpecialPurchaseItem {
  noOfBags: number
  weight: number
  rate: number
  netAmount: number
  otherAmount: number
  grossAmount: number
}

interface RegularPurchaseBill {
  id: string
  billNo: string
  billDate: string
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  status: string
  farmer: Farmer
  purchaseItems: PurchaseItem[]
  type: 'regular'
}

interface SpecialPurchaseBill {
  id: string
  supplierInvoiceNo: string
  billDate: string
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  status: string
  supplier: Supplier
  specialPurchaseItems: SpecialPurchaseItem[]
  type: 'special'
}

type PurchaseBill = RegularPurchaseBill | SpecialPurchaseBill

export default function PurchaseListPage() {
  const router = useRouter()
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([])
  const [filteredBills, setFilteredBills] = useState<PurchaseBill[]>([])
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState('')

  // Filter states
  const [billNumber, setBillNumber] = useState('')
  const [partyName, setPartyName] = useState('')
  const [partyAddress, setPartyAddress] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [weight, setWeight] = useState('')
  const [rate, setRate] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [payable, setPayable] = useState('')
  const [purchaseType, setPurchaseType] = useState<'all' | 'regular' | 'special'>('all')

  useEffect(() => {
    fetchPurchaseBills()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [purchaseBills, billNumber, partyName, partyAddress, dateFrom, dateTo, weight, rate, registrationNumber, payable, purchaseType])

  const fetchPurchaseBills = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const companyIdParam = urlParams.get('companyId')

      if (!companyIdParam) {
        alert('Company not selected')
        router.push('/company/select')
        return
      }

      setCompanyId(companyIdParam)

      // Fetch both regular and special purchase bills
      const [regularResponse, specialResponse] = await Promise.all([
        fetch(`/api/purchase-bills?companyId=${companyIdParam}`),
        fetch(`/api/special-purchase-bills?companyId=${companyIdParam}`)
      ])

      const regularData = await regularResponse.json()
      const specialData = await specialResponse.json()

      // Add type field to distinguish between regular and special purchases
      const regularBills = regularData.map((bill: any) => ({ ...bill, type: 'regular' as const }))
      const specialBills = specialData.map((bill: any) => ({ ...bill, type: 'special' as const }))

      // Combine both arrays and sort by date (newest first)
      const allBills = [...regularBills, ...specialBills].sort((a, b) => 
        new Date(b.billDate).getTime() - new Date(a.billDate).getTime()
      )

      setPurchaseBills(allBills)
      setFilteredBills(allBills)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching purchase bills:', error)
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = purchaseBills

    // Filter by purchase type
    if (purchaseType !== 'all') {
      filtered = filtered.filter(bill => bill.type === purchaseType)
    }

    if (billNumber) {
      filtered = filtered.filter(bill => {
        const billNo = bill.type === 'regular' ? bill.billNo : bill.supplierInvoiceNo
        return billNo.toLowerCase().includes(billNumber.toLowerCase())
      })
    }

    if (partyName) {
      filtered = filtered.filter(bill => {
        const party = bill.type === 'regular' ? bill.farmer : bill.supplier
        return party.name.toLowerCase().includes(partyName.toLowerCase())
      })
    }

    if (partyAddress) {
      filtered = filtered.filter(bill => {
        const party = bill.type === 'regular' ? bill.farmer : bill.supplier
        return party.address?.toLowerCase().includes(partyAddress.toLowerCase())
      })
    }

    if (dateFrom) {
      filtered = filtered.filter(bill => new Date(bill.billDate) >= new Date(dateFrom))
    }

    if (dateTo) {
      filtered = filtered.filter(bill => new Date(bill.billDate) <= new Date(dateTo))
    }

    if (weight) {
      filtered = filtered.filter(bill => {
        if (bill.type === 'regular') {
          return bill.purchaseItems.some(item => item.qty.toString().includes(weight))
        } else {
          return bill.specialPurchaseItems.some(item => item.weight.toString().includes(weight))
        }
      })
    }

    if (rate) {
      filtered = filtered.filter(bill => {
        if (bill.type === 'regular') {
          return bill.purchaseItems.some(item => item.rate.toString().includes(rate))
        } else {
          return bill.specialPurchaseItems.some(item => item.rate.toString().includes(rate))
        }
      })
    }

    if (registrationNumber) {
      filtered = filtered.filter(bill => {
        if (bill.type === 'regular') {
          return bill.farmer.krashakAnubandhNumber?.toLowerCase().includes(registrationNumber.toLowerCase())
        } else {
          return bill.supplier.gstNumber?.toLowerCase().includes(registrationNumber.toLowerCase())
        }
      })
    }

    if (payable) {
      filtered = filtered.filter(bill => bill.totalAmount.toString().includes(payable))
    }

    setFilteredBills(filtered)
  }

  const clearFilters = () => {
    setBillNumber('')
    setPartyName('')
    setPartyAddress('')
    setDateFrom('')
    setDateTo('')
    setWeight('')
    setRate('')
    setRegistrationNumber('')
    setPayable('')
    setPurchaseType('all')
  }

  const handleView = (bill: PurchaseBill) => {
    if (bill.type === 'regular') {
      router.push(`/purchase/view?billId=${bill.id}&companyId=${companyId}`)
    } else {
      router.push(`/purchase/special-view?billId=${bill.id}&companyId=${companyId}`)
    }
  }

  const handleEdit = (bill: PurchaseBill) => {
    if (bill.type === 'regular') {
      router.push(`/purchase/edit?billId=${bill.id}&companyId=${companyId}`)
    } else {
      router.push(`/purchase/special-edit?billId=${bill.id}&companyId=${companyId}`)
    }
  }

  const handlePayment = (bill: PurchaseBill) => {
    router.push(`/payment/purchase/entry?billId=${bill.id}&companyId=${companyId}`)
  }

  const handleDelete = (bill: PurchaseBill) => {
    // Find the bill to check its date
    const billDate = new Date(bill.billDate)
    const currentDate = new Date()
    const daysDifference = Math.floor((currentDate.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDifference > 15) {
      alert(`Cannot delete bill. Bill is older than 15 days. Bill age: ${daysDifference} days. Only bills within 15 days can be deleted.`)
      return
    }

    const billType = bill.type === 'regular' ? 'purchase' : 'special purchase'
    if (confirm(`Are you sure you want to delete this ${billType} bill? This action cannot be undone.`)) {
      deleteBill(bill)
    }
  }

  const deleteBill = async (bill: PurchaseBill) => {
    try {
      const apiUrl = bill.type === 'regular' ? '/api/purchase-bills' : '/api/special-purchase-bills'
      const response = await fetch(`${apiUrl}?billId=${bill.id}&companyId=${companyId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const billType = bill.type === 'regular' ? 'Purchase' : 'Special Purchase'
        alert(`${billType} bill deleted successfully!`)
        fetchPurchaseBills() // Refresh the list
      } else {
        const errorData = await response.json()
        alert('Error deleting bill: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error deleting bill:', error)
      alert('Error deleting bill: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handlePrint = (bill: PurchaseBill) => {
    // TODO: Implement print functionality
    console.log('Print bill:', bill.id)
  }

  const exportToExcel = () => {
    // TODO: Implement Excel export
    console.log('Export to Excel')
  }

  const exportToPdf = () => {
    // TODO: Implement PDF export
    console.log('Export to PDF')
  }

  const getTotalBills = () => filteredBills.length
  const getTotalAmount = () => filteredBills.reduce((sum, bill) => sum + bill.totalAmount, 0)
  const getRegularBillsCount = () => filteredBills.filter(bill => bill.type === 'regular').length
  const getSpecialBillsCount = () => filteredBills.filter(bill => bill.type === 'special').length

  const getTotalWeight = () => {
    return filteredBills.reduce((sum, bill) => {
      if (bill.type === 'regular') {
        return sum + bill.purchaseItems.reduce((itemSum, item) => itemSum + item.qty, 0)
      } else {
        return sum + bill.specialPurchaseItems.reduce((itemSum, item) => itemSum + item.weight, 0)
      }
    }, 0)
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Purchase List</h1>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="purchaseType">Purchase Type</Label>
                <Select value={purchaseType} onValueChange={(value: any) => setPurchaseType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Purchases</SelectItem>
                    <SelectItem value="regular">Regular Purchase (Farmers)</SelectItem>
                    <SelectItem value="special">Special Purchase (Suppliers)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="billNumber">Bill/Invoice Number</Label>
                <Input
                  id="billNumber"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  placeholder="Enter bill or invoice number"
                />
              </div>
              <div>
                <Label htmlFor="partyName">Party Name</Label>
                <Input
                  id="partyName"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="Enter farmer or supplier name"
                />
              </div>
              <div>
                <Label htmlFor="partyAddress">Party Address</Label>
                <Input
                  id="partyAddress"
                  value={partyAddress}
                  onChange={(e) => setPartyAddress(e.target.value)}
                  placeholder="Enter address"
                />
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
              <div>
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Enter weight"
                />
              </div>
              <div>
                <Label htmlFor="rate">Rate</Label>
                <Input
                  id="rate"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="Enter rate"
                />
              </div>
              <div>
                <Label htmlFor="registrationNumber">
                  {purchaseType === 'special' ? 'GST Number' : 'Krashak Anubandh Number'}
                </Label>
                <Input
                  id="registrationNumber"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder={purchaseType === 'special' ? 'Enter GST number' : 'Enter Krashak Anubandh Number'}
                />
              </div>
              <div>
                <Label htmlFor="payable">Payable</Label>
                <Input
                  id="payable"
                  value={payable}
                  onChange={(e) => setPayable(e.target.value)}
                  placeholder="Enter payable amount"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={applyFilters}>Show</Button>
              <Button variant="outline" onClick={clearFilters}>Clear</Button>
              <Button variant="outline" onClick={exportToExcel}>
                <Download className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" onClick={exportToPdf}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Bills Table */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Bill/Invoice No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Party Name</TableHead>
                    <TableHead>Party Address</TableHead>
                    <TableHead>Registration Number</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Payable</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell>
                        <Badge variant={bill.type === 'regular' ? 'default' : 'secondary'}>
                          {bill.type === 'regular' ? 'Farmer' : 'Supplier'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {bill.type === 'regular' ? bill.billNo : bill.supplierInvoiceNo}
                      </TableCell>
                      <TableCell>{new Date(bill.billDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {bill.type === 'regular' ? bill.farmer.name : bill.supplier.name}
                      </TableCell>
                      <TableCell>
                        {bill.type === 'regular' ? bill.farmer.address : bill.supplier.address}
                      </TableCell>
                      <TableCell>
                        {bill.type === 'regular' 
                          ? bill.farmer.krashakAnubandhNumber 
                          : bill.supplier.gstNumber
                        }
                      </TableCell>
                      <TableCell>
                        {bill.type === 'regular' 
                          ? bill.purchaseItems.reduce((sum, item) => sum + item.qty, 0)
                          : bill.specialPurchaseItems.reduce((sum, item) => sum + item.weight, 0)
                        }
                      </TableCell>
                      <TableCell>
                        {bill.type === 'regular' 
                          ? (bill.purchaseItems.length > 0 ? bill.purchaseItems[0].rate : 0)
                          : (bill.specialPurchaseItems.length > 0 ? bill.specialPurchaseItems[0].rate : 0)
                        }
                      </TableCell>
                      <TableCell>₹{bill.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>₹{bill.paidAmount.toFixed(2)}</TableCell>
                      <TableCell>₹{bill.balanceAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          bill.status === 'paid' ? 'default' :
                          bill.status === 'partially_paid' ? 'secondary' : 'destructive'
                        }>
                          {bill.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleView(bill)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(bill)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(bill)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrint(bill)}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          {bill.balanceAmount > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePayment(bill)}
                              title="Record Payment"
                            >
                              <CreditCard className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Footer with totals */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-600">Total Bills</div>
                <div className="text-lg font-semibold">{getTotalBills()}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Regular Purchase</div>
                <div className="text-lg font-semibold">{getRegularBillsCount()}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Special Purchase</div>
                <div className="text-lg font-semibold">{getSpecialBillsCount()}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Total Amount</div>
                <div className="text-lg font-semibold">₹{getTotalAmount().toFixed(2)}</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-sm text-gray-600">Total Weight</div>
                <div className="text-lg font-semibold">{getTotalWeight().toFixed(2)} kg</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
