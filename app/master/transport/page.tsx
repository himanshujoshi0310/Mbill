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
import { Plus, Edit, Trash2, Truck } from 'lucide-react'

interface Transport {
  id: string
  vehicleNumber: string
  transporterName?: string
  driverName?: string
  driverPhone?: string
  vehicleType?: string
  capacity?: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function TransportMasterPage() {
  const router = useRouter()
  const [transports, setTransports] = useState<Transport[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTransport, setEditingTransport] = useState<Transport | null>(null)
  const [searchParams, setSearchParams] = useState<URLSearchParams>()

  // Form state
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    transporterName: '',
    driverName: '',
    driverPhone: '',
    vehicleType: '',
    capacity: '',
    description: '',
    isActive: true
  })

  const vehicleTypes = ['Truck', 'Mini Truck', 'Tempo', 'Auto', 'Bike', 'Van', 'Container']

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSearchParams(params)
    const companyId = params.get('companyId')
    
    if (companyId) {
      fetchTransports()
    }
  }, [])

  const fetchTransports = async () => {
    try {
      const params = new URLSearchParams(window.location.search)
      const companyId = params.get('companyId')
      
      const response = await fetch(`/api/transports?companyId=${companyId}`)
      if (response.ok) {
        const data = await response.json()
        setTransports(data)
      }
    } catch (error) {
      console.error('Error fetching transports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const params = new URLSearchParams(window.location.search)
    const companyId = params.get('companyId')
    
    if (!companyId) {
      alert('Company ID is required. Please access this page through the proper company dashboard.')
      return
    }
    
    if (!formData.transporterName.trim()) {
      alert('Transporter name is required')
      return
    }

    // Check for duplicate transporter name (excluding current one if editing)
    const isDuplicate = transports.some(transport => 
      transport.transporterName?.toLowerCase() === formData.transporterName.toLowerCase() && 
      transport.id !== editingTransport?.id
    )

    if (isDuplicate) {
      alert('This transporter name already exists')
      return
    }

    try {
      const url = editingTransport 
        ? `/api/transports?id=${editingTransport.id}&companyId=${companyId}`
        : `/api/transports?companyId=${companyId}`
      
      const method = editingTransport ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          companyId,
          vehicleNumber: formData.vehicleNumber.trim() || null,
          transporterName: formData.transporterName.trim()
        }),
      })

      if (response.ok) {
        alert(editingTransport ? 'Transport updated successfully!' : 'Transport created successfully!')
        resetForm()
        fetchTransports()
      } else {
        const error = await response.json()
        alert(error.error || 'Operation failed')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Operation failed')
    }
  }

  const handleEdit = (transport: Transport) => {
    setEditingTransport(transport)
    setFormData({
      transporterName: transport.transporterName || '',
      vehicleNumber: transport.vehicleNumber || '',
      driverName: transport.driverName || '',
      driverPhone: transport.driverPhone || '',
      vehicleType: transport.vehicleType || '',
      capacity: transport.capacity || '',
      description: transport.description || '',
      isActive: transport.isActive
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transport? This may affect existing transactions.')) return

    try {
      const params = new URLSearchParams(window.location.search)
      const companyId = params.get('companyId')
      
      if (!companyId) {
        alert('Company ID is required. Please access this page through the proper company dashboard.')
        return
      }
      
      const response = await fetch(`/api/transports?id=${id}&companyId=${companyId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Transport deleted successfully!')
        fetchTransports()
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
      vehicleNumber: '', 
      transporterName: '',
      driverName: '', 
      driverPhone: '', 
      vehicleType: '', 
      capacity: '', 
      description: '', 
      isActive: true 
    })
    setEditingTransport(null)
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
              <Truck className="h-8 w-8 text-yellow-600" />
              <h1 className="text-3xl font-bold">Transport Master</h1>
            </div>
            <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Transport
            </Button>
          </div>

          {/* Form */}
          {isFormOpen && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingTransport ? 'Edit Transport' : 'Add New Transport'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="transporterName">Transporter Name *</Label>
                      <Input
                        id="transporterName"
                        value={formData.transporterName}
                        onChange={(e) => setFormData({ ...formData, transporterName: e.target.value })}
                        placeholder="Enter transporter name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                      <Input
                        id="vehicleNumber"
                        value={formData.vehicleNumber}
                        onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                        placeholder="Enter vehicle number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="driverName">Driver Name</Label>
                      <Input
                        id="driverName"
                        value={formData.driverName}
                        onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                        placeholder="Enter driver name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="driverPhone">Driver Phone</Label>
                      <Input
                        id="driverPhone"
                        value={formData.driverPhone}
                        onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                        placeholder="Enter driver phone"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vehicleType">Vehicle Type</Label>
                      <Input
                        id="vehicleType"
                        value={formData.vehicleType}
                        onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                        placeholder="Enter vehicle type"
                      />
                    </div>
                    <div>
                      <Label htmlFor="capacity">Capacity</Label>
                      <Input
                        id="capacity"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        placeholder="Enter capacity"
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
                      {editingTransport ? 'Update' : 'Save'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Transport List</CardTitle>
            </CardHeader>
            <CardContent>
              {transports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No transport vehicles found. Add your first transport to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle Number</TableHead>
                      <TableHead>Transporter Name</TableHead>
                      <TableHead>Driver Name</TableHead>
                      <TableHead>Driver Phone</TableHead>
                      <TableHead>Vehicle Type</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transports.map((transport) => (
                      <TableRow key={transport.id}>
                        <TableCell className="font-medium">
                          <Badge variant="outline" className="font-mono">
                            {transport.vehicleNumber}
                          </Badge>
                        </TableCell>
                        <TableCell>{transport.transporterName || '-'}</TableCell>
                        <TableCell>{transport.driverName || '-'}</TableCell>
                        <TableCell>{transport.driverPhone || '-'}</TableCell>
                        <TableCell>{transport.vehicleType || '-'}</TableCell>
                        <TableCell>{transport.capacity || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={transport.isActive ? 'default' : 'secondary'}>
                            {transport.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(transport)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(transport.id)}
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
