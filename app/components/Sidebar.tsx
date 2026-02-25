'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, LayoutDashboard, ShoppingCart, TrendingUp, Menu, X, Package, CreditCard, FileText, Settings } from 'lucide-react'
import { useState } from 'react'

const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    children: [],
  },
  {
    title: 'Master',
    icon: Settings,
    children: [
      { title: 'Product', href: '/master/product' },
      { title: 'Sales Item', href: '/master/sales-item' },
      { title: 'Marka', href: '/master/marka' },
      { title: 'Party', href: '/master/party' },
      { title: 'Transport', href: '/master/transport' },
      { title: 'Unit', href: '/master/unit' },
      { title: 'Payment Mode', href: '/master/payment-mode' },
      { title: 'Bank', href: '/master/bank' },
    ],
  },
  {
    title: 'Purchase',
    icon: ShoppingCart,
    children: [
      { title: 'Purchase Entry', href: '/purchase/entry' },
      { title: 'Special Purchase', href: '/purchase/special-entry' },
      { title: 'Purchase List', href: '/purchase/list' },
    ],
  },
  {
    title: 'Sales',
    icon: TrendingUp,
    children: [
      { title: 'Sales Entry', href: '/sales/entry' },
      { title: 'Sales List', href: '/sales/list' },
    ],
  },
  {
    title: 'Stock Management',
    icon: Package,
    children: [
      { title: 'Stock Adjustment', href: '/stock/adjustment' },
      { title: 'Stock Dashboard', href: '/stock/dashboard' },
    ],
  },
  {
    title: 'Payment',
    icon: CreditCard,
    children: [
      { title: 'Record Purchase Payment', href: '/payment/purchase/entry' },
      { title: 'Record Sales Receipt', href: '/payment/sales/entry' },
      { title: 'Payment History', href: '/payment/dashboard' },
    ],
  },
  {
    title: 'Reports',
    icon: FileText,
    children: [
      { title: 'Report Dashboard', href: '/reports/main' },
      { title: 'Purchase Report', href: '/reports/main?reportType=purchase' },
      { title: 'Sales Report', href: '/reports/main?reportType=sales' },
      { title: 'Stock Report', href: '/reports/main?reportType=stock' },
    ],
  },
]

interface SidebarProps {
  companyId: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export default function Sidebar({ companyId, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const [openItems, setOpenItems] = useState<string[]>([])

  const toggleItem = (title: string) => {
    setOpenItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  const isActive = (href: string) => {
    return pathname === href + `?companyId=${companyId}`
  }

  const isParentActive = (item: any) => {
    if (item.href && isActive(item.href)) return true
    return item.children?.some((child: any) => isActive(child.href))
  }

  return (
    <div className={cn(
      "bg-white border-r border-gray-200 h-full transition-all duration-300 ease-in-out flex flex-col",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4 flex items-center justify-between flex-shrink-0">
        {!isCollapsed && <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="p-1 h-8 w-8"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>
      <nav className="px-2 flex-1 overflow-y-auto">
        {menuItems.map((item) => {
          const hasChildren = item.children && item.children.length > 0
          const isOpen = openItems.includes(item.title)
          const active = isParentActive(item)

          if (!hasChildren) {
            return (
              <Link key={item.title} href={`${item.href}?companyId=${companyId}`}>
                <Button
                  variant={active ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start mb-1',
                    active && 'bg-gray-100',
                    isCollapsed && 'px-2'
                  )}
                >
                  {item.icon && <item.icon className={cn("h-4 w-4", isCollapsed ? "" : "mr-2")} />}
                  {!isCollapsed && item.title}
                </Button>
              </Link>
            )
          }

          return (
            <Collapsible key={item.title} open={isOpen} onOpenChange={() => toggleItem(item.title)}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-between mb-1',
                    active && 'bg-gray-100',
                    isCollapsed && 'px-2'
                  )}
                >
                  <div className="flex items-center">
                    {item.icon && <item.icon className={cn("h-4 w-4", isCollapsed ? "" : "mr-2")} />}
                    {!isCollapsed && item.title}
                  </div>
                  {!isCollapsed && (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                </Button>
              </CollapsibleTrigger>
              {!isCollapsed && (
                <CollapsibleContent className="pl-4">
                  {item.children.map((child) => (
                    <Link key={child.title} href={`${child.href}?companyId=${companyId}`}>
                      <Button
                        variant={isActive(child.href) ? 'secondary' : 'ghost'}
                        size="sm"
                        className={cn(
                          'w-full justify-start mb-1',
                          isActive(child.href) && 'bg-gray-100'
                        )}
                      >
                        {child.title}
                      </Button>
                    </Link>
                  ))}
                </CollapsibleContent>
              )}
            </Collapsible>
          )
        })}
      </nav>
    </div>
  )
}