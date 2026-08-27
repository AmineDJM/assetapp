import { CalendarClock, Building2, History, LayoutDashboard, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** Une entrée par écran, un écran par question. Rien de plus. */
export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assets', label: 'Biens', icon: Building2 },
  { href: '/obligations', label: 'Échéances', icon: CalendarClock },
  { href: '/history', label: 'Historique', icon: History },
  { href: '/settings', label: 'Paramètres', icon: Settings },
]

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
