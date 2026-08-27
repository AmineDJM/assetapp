import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseAnonKey, getSupabaseUrl } from './env'
import { isSupabaseConfigured } from '@/lib/config'

const PUBLIC_PATHS = ['/login', '/auth']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}

/**
 * Rafraîchit la session à chaque requête et refuse l'accès aux routes
 * applicatives sans utilisateur connecté.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request })

  // Sans configuration Supabase, il n'y a pas de session à rafraîchir et
  // aucune redirection ne serait utile : on laisse la page rendre l'écran
  // d'installation plutôt que de renvoyer une 500 sur toutes les routes.
  if (!isSupabaseConfigured()) return response

  return withSession(request, response)
}

async function withSession(
  request: NextRequest,
  initialResponse: NextResponse,
): Promise<NextResponse> {
  let response = initialResponse

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // `getUser()` et non `getSession()` : seul `getUser()` revalide le jeton
  // auprès de Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Les routes API répondent elles-mêmes par un statut : rediriger un appel
  // programmatique vers une page de connexion HTML n'aurait aucun sens.
  if (pathname.startsWith('/api/')) return response

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    if (pathname !== '/') loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user && pathname === '/login') {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    dashboardUrl.search = ''
    return NextResponse.redirect(dashboardUrl)
  }

  return response
}
