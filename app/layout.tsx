import type { Metadata, Viewport } from 'next'
import { Toaster } from '@/components/ui/toaster'
import { ServiceWorkerRegistrar } from '@/components/shell/service-worker-registrar'
import { DueNotifier } from '@/components/shell/due-notifier'
import { StoreProvider } from '@/lib/store/provider'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Patrimoine', template: '%s · Patrimoine' },
  description:
    'Biens, véhicules et échéances récurrentes, au même endroit. Données locales, sans serveur.',
  applicationName: 'Patrimoine',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Patrimoine', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#fafafa',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh antialiased">
        <StoreProvider>
          <ServiceWorkerRegistrar />
          <DueNotifier />
          {children}
          <Toaster />
        </StoreProvider>
      </body>
    </html>
  )
}
