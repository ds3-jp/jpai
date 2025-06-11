// middleware.ts
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { hasAccessToRoute, getRedirectPath } from "@/lib/auth/roles"
import { UserRole } from "@/app/types/auth"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Allow access to auth pages, API routes, and static files
    if (
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/favicon.ico') ||
      pathname === '/logoipsum-363.svg'
    ) {
      return NextResponse.next()
    }

    // If no token, let NextAuth handle the redirect
    if (!token) {
      return NextResponse.next()
    }

    const userRoles = (token.roles as UserRole[]) || []

    // Check if user has access to the route
    if (!hasAccessToRoute(userRoles, pathname)) {
      const redirectPath = getRedirectPath(userRoles)
      return NextResponse.redirect(new URL(redirectPath, req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Always allow auth pages and API routes
        if (
          pathname.startsWith('/auth/') ||
          pathname.startsWith('/api/auth/') ||
          pathname.startsWith('/_next/') ||
          pathname.startsWith('/favicon.ico') ||
          pathname === '/logoipsum-363.svg'
        ) {
          return true
        }

        // For protected routes, require authentication
        return !!token
      },
    },
  }
)

// Configure which routes to protect
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
}