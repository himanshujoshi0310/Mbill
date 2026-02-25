import { redirect } from 'next/navigation'
import DashboardLayout from '@/app/components/DashboardLayout'

interface DashboardPageProps {
  searchParams: Promise<{ companyId: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { companyId } = await searchParams

  if (!companyId) {
    redirect('/company/select')
  }

  return (
    <DashboardLayout companyId={companyId}>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="text-gray-600">Company ID: {companyId}</p>
      </div>
    </DashboardLayout>
  )
}
