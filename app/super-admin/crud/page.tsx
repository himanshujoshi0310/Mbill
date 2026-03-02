'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import SuperAdminShell from '@/app/super-admin/components/SuperAdminShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Building2, Loader2, Lock, Pencil, Plus, RefreshCw, ShieldCheck, Store, Unlock, Users } from 'lucide-react'

type CrudSection = 'traders' | 'companies' | 'users'

type TraderRow = {
  id: string
  name: string
  locked: boolean
  _count?: {
    companies?: number
    users?: number
  }
}

type CompanyRow = {
  id: string
  name: string
  traderId: string | null
  locked: boolean
  phone?: string | null
  address?: string | null
  trader?: { id: string; name: string } | null
  _count?: {
    users?: number
  }
}

type UserRow = {
  id: string
  userId: string
  traderId: string
  companyId: string | null
  name?: string | null
  role?: string | null
  locked: boolean
  active?: boolean
  trader?: { id: string; name: string } | null
  company?: { id: string; name: string } | null
}

type ModalState = {
  section: CrudSection
  mode: 'create' | 'edit'
  recordId?: string
  form: {
    name?: string
    traderId?: string
    companyId?: string
    userId?: string
    password?: string
    address?: string
    phone?: string
    locked?: boolean
  }
}

const tabs: Array<{ key: CrudSection; label: string; icon: any }> = [
  { key: 'traders', label: 'Traders', icon: Store },
  { key: 'companies', label: 'Companies', icon: Building2 },
  { key: 'users', label: 'Users', icon: Users }
]

export default function SuperAdminCrudPage() {
  const [activeTab, setActiveTab] = useState<CrudSection>('traders')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [saving, setSaving] = useState(false)

  const [traders, setTraders] = useState<TraderRow[]>([])
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])

  const fetchData = useCallback(async () => {
    setError(null)
    setRefreshing(true)
    try {
      const [tradersRes, companiesRes, usersRes] = await Promise.all([
        fetch('/api/super-admin/traders'),
        fetch('/api/super-admin/companies'),
        fetch('/api/super-admin/users')
      ])

      const [tradersPayload, companiesPayload, usersPayload] = await Promise.all([
        tradersRes.json().catch(() => []),
        companiesRes.json().catch(() => []),
        usersRes.json().catch(() => [])
      ])

      if (!tradersRes.ok || !companiesRes.ok || !usersRes.ok) {
        const fallbackError =
          (tradersPayload?.error as string | undefined) ||
          (companiesPayload?.error as string | undefined) ||
          (usersPayload?.error as string | undefined) ||
          'Failed to load super-admin data'
        throw new Error(fallbackError)
      }

      setTraders(Array.isArray(tradersPayload) ? tradersPayload : [])
      setCompanies(Array.isArray(companiesPayload) ? companiesPayload : [])
      setUsers(Array.isArray(usersPayload) ? usersPayload : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const kpis = useMemo(() => {
    const lockedTraders = traders.filter((row) => row.locked).length
    const lockedCompanies = companies.filter((row) => row.locked).length
    const lockedUsers = users.filter((row) => row.locked || row.active === false).length
    return {
      traders: traders.length,
      lockedTraders,
      companies: companies.length,
      lockedCompanies,
      users: users.length,
      lockedUsers
    }
  }, [traders, companies, users])

  const lowerSearch = search.trim().toLowerCase()

  const filteredTraders = useMemo(() => {
    if (!lowerSearch) return traders
    return traders.filter((row) => row.name.toLowerCase().includes(lowerSearch))
  }, [lowerSearch, traders])

  const filteredCompanies = useMemo(() => {
    if (!lowerSearch) return companies
    return companies.filter((row) => {
      const traderName = row.trader?.name || ''
      return (
        row.name.toLowerCase().includes(lowerSearch) ||
        traderName.toLowerCase().includes(lowerSearch) ||
        (row.phone || '').toLowerCase().includes(lowerSearch)
      )
    })
  }, [lowerSearch, companies])

  const filteredUsers = useMemo(() => {
    if (!lowerSearch) return users
    return users.filter((row) => {
      const companyName = row.company?.name || ''
      return (
        row.userId.toLowerCase().includes(lowerSearch) ||
        (row.name || '').toLowerCase().includes(lowerSearch) ||
        row.traderId.toLowerCase().includes(lowerSearch) ||
        companyName.toLowerCase().includes(lowerSearch)
      )
    })
  }, [lowerSearch, users])

  const resetModal = () => setModal(null)

  const openCreateModal = (section: CrudSection) => {
    if (section === 'traders') {
      setModal({
        section,
        mode: 'create',
        form: {
          name: '',
          locked: false
        }
      })
      return
    }

    if (section === 'companies') {
      setModal({
        section,
        mode: 'create',
        form: {
          name: '',
          traderId: '',
          address: '',
          phone: '',
          locked: false
        }
      })
      return
    }

    setModal({
      section,
      mode: 'create',
      form: {
        traderId: '',
        companyId: '',
        userId: '',
        name: '',
        password: '',
        locked: false
      }
    })
  }

  const openEditModal = (section: CrudSection, record: TraderRow | CompanyRow | UserRow) => {
    if (section === 'traders') {
      const row = record as TraderRow
      setModal({
        section,
        mode: 'edit',
        recordId: row.id,
        form: {
          name: row.name,
          locked: row.locked
        }
      })
      return
    }

    if (section === 'companies') {
      const row = record as CompanyRow
      setModal({
        section,
        mode: 'edit',
        recordId: row.id,
        form: {
          name: row.name,
          traderId: row.traderId || '',
          address: row.address || '',
          phone: row.phone || '',
          locked: row.locked
        }
      })
      return
    }

    const row = record as UserRow
    setModal({
      section,
      mode: 'edit',
      recordId: row.id,
      form: {
        traderId: row.traderId,
        companyId: row.companyId || '',
        userId: row.userId,
        name: row.name || '',
        password: '',
        locked: row.locked || row.active === false
      }
    })
  }

  const setModalField = (field: keyof ModalState['form'], value: string | boolean) => {
    setModal((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        form: {
          ...prev.form,
          [field]: value
        }
      }
    })
  }

  const saveModal = async () => {
    if (!modal) return
    setSaving(true)
    setError(null)

    try {
      const { section, mode, recordId, form } = modal

      let url = ''
      let method: 'POST' | 'PUT' = 'POST'
      let payload: Record<string, unknown> = {}

      if (section === 'traders') {
        const name = (form.name || '').trim()
        if (!name) throw new Error('Trader name is required')
        url = mode === 'create' ? '/api/super-admin/traders' : `/api/super-admin/traders/${recordId}`
        method = mode === 'create' ? 'POST' : 'PUT'
        payload = {
          name,
          locked: form.locked === true
        }
      } else if (section === 'companies') {
        const name = (form.name || '').trim()
        if (!name) throw new Error('Company name is required')
        url = mode === 'create' ? '/api/super-admin/companies' : `/api/super-admin/companies/${recordId}`
        method = mode === 'create' ? 'POST' : 'PUT'
        payload = {
          name,
          traderId: form.traderId?.trim() || null,
          address: form.address?.trim() || null,
          phone: form.phone?.trim() || null,
          locked: form.locked === true
        }
      } else {
        const traderId = form.traderId?.trim() || ''
        const companyId = form.companyId?.trim() || ''
        const userId = form.userId?.trim() || ''
        if (!traderId || !companyId || !userId) {
          throw new Error('Trader, company and user ID are required')
        }

        url = mode === 'create' ? '/api/super-admin/users' : `/api/super-admin/users/${recordId}`
        method = mode === 'create' ? 'POST' : 'PUT'
        payload = {
          traderId,
          companyId,
          userId,
          name: form.name?.trim() || null,
          locked: form.locked === true,
          ...(form.password?.trim() ? { password: form.password.trim() } : {})
        }
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const responsePayload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(responsePayload.error || 'Failed to save')
      }

      resetModal()
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const deleteModalRecord = async () => {
    if (!modal || modal.mode !== 'edit' || !modal.recordId) return
    const confirmDelete = window.confirm('Delete this record?')
    if (!confirmDelete) return

    try {
      const endpoint =
        modal.section === 'traders'
          ? `/api/super-admin/traders/${modal.recordId}`
          : modal.section === 'companies'
            ? `/api/super-admin/companies/${modal.recordId}`
            : `/api/super-admin/users/${modal.recordId}`

      const response = await fetch(endpoint, { method: 'DELETE' })
      const responsePayload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(responsePayload.error || 'Failed to delete')
      }

      resetModal()
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const applyOptimisticLock = (section: CrudSection, id: string, locked: boolean) => {
    if (section === 'traders') {
      setTraders((prev) => prev.map((row) => (row.id === id ? { ...row, locked } : row)))
      setCompanies((prev) => prev.map((row) => (row.traderId === id ? { ...row, locked } : row)))
      setUsers((prev) => prev.map((row) => (row.traderId === id ? { ...row, locked, active: !locked } : row)))
      return
    }

    if (section === 'companies') {
      setCompanies((prev) => prev.map((row) => (row.id === id ? { ...row, locked } : row)))
      setUsers((prev) => prev.map((row) => (row.companyId === id ? { ...row, locked, active: !locked } : row)))
      return
    }

    setUsers((prev) => prev.map((row) => (row.id === id ? { ...row, locked, active: !locked } : row)))
  }

  const toggleLock = async (section: CrudSection, id: string, currentlyLocked: boolean) => {
    const nextLocked = !currentlyLocked
    applyOptimisticLock(section, id, nextLocked)

    try {
      const endpoint =
        section === 'traders'
          ? `/api/super-admin/traders/${id}/lock`
          : section === 'companies'
            ? `/api/super-admin/companies/${id}/lock`
            : `/api/super-admin/users/${id}/lock`

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked: nextLocked })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to update status')
      }

      if (section !== 'users') {
        await fetchData()
      }
    } catch (err) {
      applyOptimisticLock(section, id, currentlyLocked)
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  const traderOptions = traders.map((row) => ({ value: row.id, label: row.name }))
  const companyOptions = companies
    .filter((row) => !modal?.form.traderId || row.traderId === modal.form.traderId)
    .map((row) => ({ value: row.id, label: row.name }))

  const activeTabLabel = tabs.find((tab) => tab.key === activeTab)?.label || 'Records'

  return (
    <SuperAdminShell
      title="Control Panel"
      subtitle="Top-level tenant operations with strict server-side control"
    >
      <div className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <Card className="border-slate-200">
          <CardContent className="grid grid-cols-2 gap-3 p-4 md:grid-cols-6">
            <KpiTile label="Total Traders" value={kpis.traders} />
            <KpiTile label="Locked Traders" value={kpis.lockedTraders} danger />
            <KpiTile label="Total Companies" value={kpis.companies} />
            <KpiTile label="Locked Companies" value={kpis.lockedCompanies} danger />
            <KpiTile label="Total Users" value={kpis.users} />
            <KpiTile label="Locked Users" value={kpis.lockedUsers} danger />
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <Button
                    key={tab.key}
                    type="button"
                    size="sm"
                    variant={activeTab === tab.key ? 'default' : 'outline'}
                    onClick={() => setActiveTab(tab.key)}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </Button>
                )
              })}
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${activeTabLabel.toLowerCase()}...`}
                className="md:max-w-sm"
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => fetchData()} disabled={refreshing}>
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </Button>
                <Button type="button" size="sm" onClick={() => openCreateModal(activeTab)}>
                  <Plus className="h-4 w-4" />
                  Add {activeTabLabel.slice(0, -1)}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          </div>
        ) : null}

        {!loading && activeTab === 'traders' ? (
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Traders Table</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Companies</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTraders.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row._count?.companies || 0}</TableCell>
                      <TableCell>{row._count?.users || 0}</TableCell>
                      <TableCell>
                        <Badge variant={row.locked ? 'destructive' : 'default'}>
                          {row.locked ? 'Locked' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => toggleLock('traders', row.id, row.locked)}
                          >
                            {row.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            {row.locked ? 'Unlock' : 'Lock'}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => openEditModal('traders', row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        {!loading && activeTab === 'companies' ? (
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Companies Table</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Trader</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.trader?.name || row.traderId || '-'}</TableCell>
                      <TableCell>{row._count?.users || 0}</TableCell>
                      <TableCell>
                        <Badge variant={row.locked ? 'destructive' : 'default'}>
                          {row.locked ? 'Locked' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => toggleLock('companies', row.id, row.locked)}
                          >
                            {row.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            {row.locked ? 'Unlock' : 'Lock'}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => openEditModal('companies', row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        {!loading && activeTab === 'users' ? (
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Users Table</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Trader</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Privilege</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((row) => {
                    const locked = row.locked || row.active === false
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.userId}</TableCell>
                        <TableCell>{row.name || '-'}</TableCell>
                        <TableCell>{row.trader?.name || row.traderId}</TableCell>
                        <TableCell>{row.company?.name || row.companyId || '-'}</TableCell>
                        <TableCell>{row.role || 'company_user'}</TableCell>
                        <TableCell>
                          <Badge variant={locked ? 'destructive' : 'default'}>
                            {locked ? 'Locked' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/super-admin/users/${row.id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            Matrix
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => toggleLock('users', row.id, locked)}
                            >
                              {locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                              {locked ? 'Unlock' : 'Lock'}
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => openEditModal('users', row)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {modal ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={resetModal} />
          <Card className="fixed inset-0 z-50 m-auto w-full max-w-3xl max-h-[90vh] overflow-auto shadow-xl">
            <CardHeader className="sticky top-0 z-10 border-b bg-white">
              <div className="flex items-center justify-between">
                <CardTitle>
                  {modal.mode === 'create' ? 'Create' : 'Edit'}{' '}
                  {modal.section === 'traders' ? 'Trader' : modal.section === 'companies' ? 'Company' : 'User'}
                </CardTitle>
                <Button type="button" variant="ghost" onClick={resetModal}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {modal.section === 'traders' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label>Trader Name</Label>
                    <Input value={modal.form.name || ''} onChange={(e) => setModalField('name', e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      checked={modal.form.locked === true}
                      onChange={(e) => setModalField('locked', e.target.checked)}
                    />
                    <Label>Locked</Label>
                  </div>
                </div>
              ) : null}

              {modal.section === 'companies' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Company Name</Label>
                    <Input value={modal.form.name || ''} onChange={(e) => setModalField('name', e.target.value)} />
                  </div>
                  <div>
                    <Label>Trader</Label>
                    <Select value={modal.form.traderId || ''} onValueChange={(value) => setModalField('traderId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select trader" />
                      </SelectTrigger>
                      <SelectContent>
                        {traderOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={modal.form.phone || ''}
                      onChange={(e) => setModalField('phone', e.target.value)}
                      placeholder="10 digit phone"
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input value={modal.form.address || ''} onChange={(e) => setModalField('address', e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      checked={modal.form.locked === true}
                      onChange={(e) => setModalField('locked', e.target.checked)}
                    />
                    <Label>Locked</Label>
                  </div>
                </div>
              ) : null}

              {modal.section === 'users' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Trader</Label>
                    <Select
                      value={modal.form.traderId || ''}
                      onValueChange={(value) => {
                        setModal((prev) =>
                          prev
                            ? {
                                ...prev,
                                form: {
                                  ...prev.form,
                                  traderId: value,
                                  companyId: ''
                                }
                              }
                            : prev
                        )
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select trader" />
                      </SelectTrigger>
                      <SelectContent>
                        {traderOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Select value={modal.form.companyId || ''} onValueChange={(value) => setModalField('companyId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>User ID</Label>
                    <Input value={modal.form.userId || ''} onChange={(e) => setModalField('userId', e.target.value)} />
                  </div>
                  <div>
                    <Label>Name</Label>
                    <Input value={modal.form.name || ''} onChange={(e) => setModalField('name', e.target.value)} />
                  </div>
                  <div>
                    <Label>{modal.mode === 'create' ? 'Password' : 'New Password (optional)'}</Label>
                    <Input
                      type="password"
                      value={modal.form.password || ''}
                      onChange={(e) => setModalField('password', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      checked={modal.form.locked === true}
                      onChange={(e) => setModalField('locked', e.target.checked)}
                    />
                    <Label>Locked</Label>
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end gap-2 border-t pt-4">
                {modal.mode === 'edit' ? (
                  <Button type="button" variant="destructive" onClick={deleteModalRecord} disabled={saving}>
                    Delete
                  </Button>
                ) : null}
                <Button type="button" variant="outline" onClick={resetModal} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" onClick={saveModal} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </SuperAdminShell>
  )
}

function KpiTile({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-xl font-semibold ${danger ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}
