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
import { Plus, Edit, Trash2, Users } from 'lucide-react'

interface Party {
  id: string
  type: 'farmer' | 'buyer'
  name: string
  address?: string
  phone1?: string
  phone2?: string
  ifscCode?: string
  bankName?: string
  accountNo?: string
  createdAt: string
  updatedAt: string
}

export default function PartyMasterPage() {
  const router = useRouter()
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingParty, setEditingParty] = useState<Party | null>(null)
  const [searchParams, setSearchParams] = useState<URLSearchParams>()

  // Form state
  const [formData, setFormData] = useState({
    type: 'farmer' as 'farmer' | 'buyer',
    name: '',
    address: '',
    phone1: '',
    phone2: '',
    ifscCode: '',
    bankName: '',
    accountNo: ''
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSearchParams(params)
    const companyId = params.get('companyId')
    
    if (companyId) {
      fetchParties()
    }
  }, [])

  const fetchParties = async () => {
    try {
      const params = new URLSearchParams(window.location.search)
      const companyId = params.get('companyId')
      
      const response = await fetch(`/api/parties?companyId=${companyId}`)
      if (response.ok) {
        const data = await response.json()
        setParties(data)
      }
    } catch (error) {
      console.error('Error fetching parties:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.type) {
      alert('Party name and type are required')
      return
    }

    try {
      const params = new URLSearchParams(window.location.search)
      const companyId = params.get('companyId')
      
      const url = editingParty 
        ? `/api/parties?id=${editingParty.id}&companyId=${companyId}`
        : `/api/parties?companyId=${companyId}`
      
      const method = editingParty ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert(editingParty ? 'Party updated successfully!' : 'Party created successfully!')
        resetForm()
        fetchParties()
      } else {
        const error = await response.json()
        alert(error.error || 'Operation failed')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Operation failed')
    }
  }

  const handleEdit = (party: Party) => {
    setEditingParty(party)
    setFormData({
      type: party.type,
      name: party.name,
      address: party.address || '',
      phone1: party.phone1 || '',
      phone2: party.phone2 || '',
      ifscCode: party.ifscCode || '',
      bankName: party.bankName || '',
      accountNo: party.accountNo || ''
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this party? This may affect existing transactions.')) return

    try {
      const params = new URLSearchParams(window.location.search)
      const companyId = params.get('companyId')
      
      const response = await fetch(`/api/parties?id=${id}&companyId=${companyId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Party deleted successfully!')
        fetchParties()
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
    setFormData({
      type: 'farmer',
      name: '',
      address: '',
      phone1: '',
      phone2: '',
      ifscCode: '',
      bankName: '',
      accountNo: ''
    })
    setEditingParty(null)
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
              <Users className="h-8 w-8 text-purple-600" />
              <h1 className="text-3xl font-bold">Party Master</h1>
            </div>
            <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Party
            </Button>
          </div>

          {/* Form */}
          {isFormOpen && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingParty ? 'Edit Party' : 'Add New Party'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="type">Party Type *</Label>
                      <Select value={formData.type} onValueChange={(value: 'farmer' | 'buyer') => setFormData({ ...formData, type: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="farmer">Farmer</SelectItem>
                          <SelectItem value="buyer">Buyer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="name">Party Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter party name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Enter address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone1">Primary Phone</Label>
                      <Input
                        id="phone1"
                        value={formData.phone1}
                        onChange={(e) => setFormData({ ...formData, phone1: e.target.value })}
                        placeholder="Enter primary phone"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone2">Secondary Phone</Label>
                      <Input
                        id="phone2"
                        value={formData.phone2}
                        onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                        placeholder="Enter secondary phone"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        placeholder="Enter bank name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="accountNo">Account Number</Label>
                      <Input
                        id="accountNo"
                        value={formData.accountNo}
                        onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })}
                        placeholder="Enter account number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ifscCode">IFSC Code</Label>
                      <Input
                        id="ifscCode"
                        value={formData.ifscCode}
                        onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                        placeholder="Enter IFSC code"
                        maxLength={11}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingParty ? 'Update' : 'Save'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Party List</CardTitle>
            </CardHeader>
            <CardContent>
              {parties.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No parties found. Add your first party to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Party Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Bank Details</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parties.map((party) => (
                      <TableRow key={party.id}>
                        <TableCell className="font-medium">{party.name}</TableCell>
                        <TableCell>
                          <Badge variant={party.type === 'farmer' ? 'default' : 'secondary'}>
                            {party.type === 'farmer' ? '🌾 Farmer' : '🛒 Buyer'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            {party.phone1 && <div>{party.phone1}</div>}
                            {party.phone2 && <div className="text-sm text-gray-500">{party.phone2}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {party.bankName ? (
                            <div className="text-sm">
                              <div className="font-medium">{party.bankName}</div>
                              {party.accountNo && <div className="text-gray-500">{party.accountNo}</div>}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(party.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(party)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(party.id)}
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
