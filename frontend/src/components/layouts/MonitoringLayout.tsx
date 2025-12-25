import { cn } from '@/lib/utils'
import { Activity, Database, Webhook, User } from 'lucide-react'
import React from 'react'
import { Link, useLocation } from 'react-router-dom'

interface MonitoringLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
}

const navigationItems = [
  {
    title: 'Executions',
    href: '/executions',
    icon: Activity,
  },
  {
    title: 'Backups',
    href: '/backup',
    icon: Database,
  },
  {
    title: 'Webhook Requests',
    href: '/webhook-requests',
    icon: Webhook,
  },
  {
    title: 'Profile',
    href: '/profile',
    icon: User,
  },
]

export const MonitoringLayout: React.FC<MonitoringLayoutProps> = ({
  children,
  title,
  subtitle,
}) => {
  const location = useLocation()

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Secondary Navigation Sidebar - Fixed */}
      <aside className="w-64 flex-shrink-0 border-r bg-sidebar overflow-y-auto">
        <div className="flex h-full flex-col">
        
          
          <nav className="flex-1 p-2 mt-10">
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.href
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      isActive && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full px-8 py-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
