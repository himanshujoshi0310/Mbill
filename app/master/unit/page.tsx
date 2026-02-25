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
import { Plus, Edit, Trash2, Ruler } from 'lucide-react'

interface Unit {
  id: string
  name: string
  symbol: string
  description?: string
  createdAt: string
  updatedAt: string
}

export default function UnitMasterPage() {
  const router = useRouter()
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [searchParams, setSearchParams] = useState<URLSearchParams>()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: ''
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSearchParams(params)
    const companyId = params.get('companyId')
    
    if (companyId) {
      fetchUnits()
    }
  }, [])

  const fetchUnits = async () => {
    try {
      const params = new URLSearchParams(window.location.search)
      const companyId = params.get('companyId')
      
      if (!companyId) {
        console.error('Company ID is missing from URL')
        setLoading(false)
        return
      }
      
      console.log('Fetching units for company:', companyId)
      const response = await fetch(`/api/units?companyId=${companyId}`)
      console.log('Units response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Units data:', data)
        setUnits(data)
      } else if (response.status === 401) {
        // Token expired or invalid - redirect to login
        console.error('Authentication required - redirecting to login')
        alert('Your session has expired. Please login again.')
        router.push('/login')
        return
      } else {
        const errorText = await response.text()
        console.error('Error fetching units:', errorText)
        alert('Error fetching units: ' + errorText)
      }
    } catch (error) {
      console.error('Error fetching units:', error)
      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes('401')) {
        alert('Your session has expired. Please login again.')
        router.push('/login')
        return
      }
      alert('Error fetching units: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.symbol.trim()) {
      alert('Unit name and symbol are required')
      return
    }

    try {
      const params = new URLSearchParams(window.location.search)
      const companyId = params.get('companyId')
      
      if (!companyId) {
        alert('Company ID is missing. Please refresh the page.')
        return
      }
      
      const url = editingUnit 
        ? `/api/units?id=${editingUnit.id}&companyId=${companyId}`
        : `/api/units?companyId=${companyId}`
      
      const method = editingUnit ? 'PUT' : 'POST'
      
      console.log('=== UNIT SUBMIT DEBUG ===')
      console.log('URL:', url)
      console.log('Method:', method)
      console.log('Form Data:', JSON.stringify(formData, null, 2))
      console.log('Company ID:', companyId)
      console.log('========================')
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      console.log('Response Status:', response.status)
      console.log('Response OK:', response.ok)

      if (response.ok) {
        alert(editingUnit ? 'Unit updated successfully!' : 'Unit created successfully!')
        resetForm()
        fetchUnits()
      } else {
        const errorText = await response.text()
        console.error('Error Response:', errorText)
        let error
        try {
          error = JSON.parse(errorText)
        } catch {
          error = { error: errorText }
        }
        alert(error.error || 'Operation failed')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Operation failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit)
    setFormData({
      name: unit.name,
      symbol: unit.symbol,
      description: unit.description || ''
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this unit? This may affect existing products.')) return

    try {
      const params = new URLSearchParams(window.location.search)
      const companyId = params.get('companyId')
      
      const response = await fetch(`/api/units?id=${id}&companyId=${companyId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Unit deleted successfully!')
        fetchUnits()
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
    setFormData({ name: '', symbol: '', description: '' })
    setEditingUnit(null)
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
              <Ruler className="h-8 w-8 text-orange-600" />
              <h1 className="text-3xl font-bold">Unit Master</h1>
            </div>
            <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Unit
            </Button>
          </div>

          {/* Form */}
          {isFormOpen && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingUnit ? 'Edit Unit' : 'Add New Unit'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="name">Unit Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter unit name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="symbol">Symbol *</Label>
                      <Input
                        id="symbol"
                        value={formData.symbol}
                        onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                        placeholder="Enter symbol"
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
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingUnit ? 'Update' : 'Save'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Unit List</CardTitle>
            </CardHeader>
            <CardContent>
              {units.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No units found. Add your first unit to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit Name</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-medium">{unit.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{unit.symbol}</Badge>
                        </TableCell>
                        <TableCell>{unit.description || '-'}</TableCell>
                        <TableCell>
                          {new Date(unit.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(unit)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(unit.id)}
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
