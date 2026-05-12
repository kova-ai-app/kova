import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { LayoutDashboard, Phone, DollarSign, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/calls', label: 'Calls', icon: Phone },
  { href: '/dashboard/pricebook', label: 'Pricebook', icon: DollarSign, disabled: true },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, disabled: true },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight">Kova</h1>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.disabled ? '#' : item.href}
                className={
                  item.disabled
                    ? 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground cursor-not-allowed opacity-50'
                    : 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground'
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {item.disabled && (
                  <span className="ml-auto text-xs text-muted-foreground">(Soon)</span>
                )}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t">
          <UserButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}
