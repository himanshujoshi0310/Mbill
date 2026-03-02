import { redirect } from 'next/navigation'

interface DashboardByCompanyPageProps {
  params: Promise<{ companyId: string }>
}

export default async function DashboardByCompanyPage({ params }: DashboardByCompanyPageProps) {
  const { companyId } = await params
  redirect(`/main/dashboard?companyId=${encodeURIComponent(companyId)}&companyIds=${encodeURIComponent(companyId)}`)
}
