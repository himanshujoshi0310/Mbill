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
import { Plus, Edit, Trash2, Hash } from 'lucide-react'

interface Marka {
  id: string
  markaNumber: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function MarkaMasterPage() {
  const router = useRouter()
  const [markas, setMarkas] = useState<Marka[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingMarka, setEditingMarka] = useState<Marka | null>(null)
  const [searchParams, setSearchParams] = useState<URLSearchParams>()

  // Form state
  const [formData, setFormData] = useState({
    markaNumber: '',
    description: '',
    isActive: true
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSearchParams(params)
    const companyId = params.get('companyId')
    
    if (companyId) {
      fetchMarkas()
    }
  }, [])

  const fetchMarkas = async () => {
    try {
      const params = new URLSearchParams(window.location.search)
      const companyId = params.get('companyId')
      
      const response = await fetch(`/api/markas?companyId=${companyId}`)
      if (response.ok) {
        const data = await response.json()
        setMarkas(data)
      }
    } catch (error) {
      console.error('Error fetching markas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.markaNumber.trim()) {
      alert('Marka number is required')
      return
    }

    // Check for duplicate marka number (excluding current one if editing)
    const isDuplicate = markas.some(marka => 
      marka.markaNumber === formData.markaNumber && 
      marka.id !== editingMarka?.id
    )

    if (isDuplicate) {
      alert('This marka number already exists')
      return
    }

    try {
      const params = new URLSearchParams(window.location.search)
      const companyId = params.get('companyId')
      
      const url = editingMarka 
        ? `/api/markas?id=${editingMarka.id}&companyId=${companyId}`
        : `/api/markas?companyId=${companyId}`
      
      const method = editingMarka ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert(editingMarka ? 'Marka updated successfully!' : 'Marka created successfully!')
        resetForm()
        fetchMarkas()
      } else {
        const error = await response.json()
        alert(error.error || 'Operation failed')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Operation failed')
    }
  }

  const handleEdit = (marka: Marka) => {
    setEditingMarka(marka)
    setFormData({
      markaNumber: marka.markaNumber,
      description: marka.description || '',
      isActive: marka.isActive
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this marka? This may affect existing transactions.')) return

    try {
      const params = new URLSearchParams(window.location.search)
      const companyId = params.get('companyId')
      
      const response = await fetch(`/api/markas?id=${id}&companyId=${companyId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Marka deleted successfully!')
        fetchMarkas()
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
    setFormData({ markaNumber: '', description: '', isActive: true })
    setEditingMarka(null)
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
              <Hash className="h-8 w-8 text-indigo-600" />
              <h1 className="text-3xl font-bold">Marka Master</h1>
            </div>
            <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Marka
            </Button>
          </div>

          {/* Form */}
          {isFormOpen && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingMarka ? 'Edit Marka' : 'Add New Marka'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="markaNumber">Marka Number *</Label>
                      <Input
                        id="markaNumber"
                        value={formData.markaNumber}
                        onChange={(e) => setFormData({ ...formData, markaNumber: e.target.value.toUpperCase() })}
                        placeholder="Enter marka number"
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
                      {editingMarka ? 'Update' : 'Save'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Marka List</CardTitle>
            </CardHeader>
            <CardContent>
              {markas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No markas found. Add your first marka to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Marka Number</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {markas.map((marka) => (
                      <TableRow key={marka.id}>
                        <TableCell className="font-medium">
                          <Badge variant="outline" className="font-mono">
                            {marka.markaNumber}
                          </Badge>
                        </TableCell>
                        <TableCell>{marka.description || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={marka.isActive ? 'default' : 'secondary'}>
                            {marka.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(marka.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(marka)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(marka.id)}
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
