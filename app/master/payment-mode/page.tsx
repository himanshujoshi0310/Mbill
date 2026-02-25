'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import DashboardLayout from '@/app/components/DashboardLayout'
import { Plus, Edit, Trash2, CreditCard } from 'lucide-react'

interface PaymentMode {
  id: string
  name: string
  code: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function PaymentModeMasterPage() {
  const router = useRouter()
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPaymentMode, setEditingPaymentMode] = useState<PaymentMode | null>(null)
  const [searchParams, setSearchParams] = useState<URLSearchParams>()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    isActive: true
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSearchParams(params)
    const companyId = params.get('companyId')
    
    if (companyId) {
      fetchPaymentModes()
    }
  }, [])

  const fetchPaymentModes = async () => {
    try {
      const params = new URLSearchParams(window.location.search)
      const companyId = params.get('companyId')
      
      const response = await fetch(`/api/payment-modes?companyId=${companyId}`)
      if (response.ok) {
        const data = await response.json()
        setPaymentModes(data)
      }
    } catch (error) {
      console.error('Error fetching payment modes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.code.trim()) {
      alert('Payment mode name and code are required')
      return
    }

    try {
      const params = new URLSearchParams(window.location.search)
      const companyId = params.get('companyId')
      
      const url = editingPaymentMode 
        ? `/api/payment-modes?id=${editingPaymentMode.id}&companyId=${companyId}`
        : `/api/payment-modes?companyId=${companyId}`
      
      const method = editingPaymentMode ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert(editingPaymentMode ? 'Payment mode updated successfully!' : 'Payment mode created successfully!')
        resetForm()
        fetchPaymentModes()
      } else {
        const error = await response.json()
        alert(error.error || 'Operation failed')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Operation failed')
    }
  }

  const handleEdit = (paymentMode: PaymentMode) => {
    setEditingPaymentMode(paymentMode)
    setFormData({
      name: paymentMode.name,
      code: paymentMode.code,
      description: paymentMode.description || '',
      isActive: paymentMode.isActive
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment mode? This may affect existing transactions.')) return

    try {
      const params = new URLSearchParams(window.location.search)
      const companyId = params.get('companyId')
      
      const response = await fetch(`/api/payment-modes?id=${id}&companyId=${companyId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Payment mode deleted successfully!')
        fetchPaymentModes()
      } else {
        const error = await response.json()
        alert(error.error || 'Delete failed')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Delete failed')
    }
  }

  const resetForm = () => {
    setFormData({ name: '', code: '', description: '', isActive: true })
    setEditingPaymentMode(null)
    setIsFormOpen(false)
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
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold">Payment Mode Master</h1>
            </div>
            <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Payment Mode
            </Button>
          </div>

          {/* Form */}
          {isFormOpen && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingPaymentMode ? 'Edit Payment Mode' : 'Add New Payment Mode'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="name">Payment Mode Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter payment mode name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="code">Code *</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="Enter code"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Enter description"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="isActive">Active</Label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingPaymentMode ? 'Update' : 'Save'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Mode List</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentModes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payment modes found. Add your first payment mode to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentModes.map((paymentMode) => (
                      <TableRow key={paymentMode.id}>
                        <TableCell className="font-medium">{paymentMode.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{paymentMode.code}</Badge>
                        </TableCell>
                        <TableCell>{paymentMode.description || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={paymentMode.isActive ? 'default' : 'secondary'}>
                            {paymentMode.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(paymentMode.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(paymentMode)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(paymentMode.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
