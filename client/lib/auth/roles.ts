// lib/auth/roles.ts
import { UserRole, RouteAccess } from "@/app/types/auth"

// Define route access permissions
export const ROUTE_PERMISSIONS: RouteAccess[] = [
  // Admin can access all routes
  { path: '/', allowedRoles: ['admin'] },
  { path: '/batch-calling', allowedRoles: ['admin'] },
  { path: '/call-history', allowedRoles: ['admin'] },
  { path: '/settings', allowedRoles: ['admin'] },
  
  // User role routes (currently redirected to wait page)
  { path: '/wait-for-confirmation', allowedRoles: ['user', 'admin'] },
  
  // Auth routes (accessible to all authenticated users)
  { path: '/auth', allowedRoles: ['admin', 'user'] },
]

// Check if user has required role for a specific route
export function hasAccessToRoute(
  userRoles: UserRole[],
  pathname: string
): boolean {
  // Find the most specific route match
  const matchingRoute = ROUTE_PERMISSIONS
    .filter(route => {
      if (route.exact) {
        return pathname === route.path
      }
      return pathname.startsWith(route.path)
    })
    .sort((a, b) => b.path.length - a.path.length)[0] // Most specific first

  if (!matchingRoute) {
    // If no route is defined, deny access by default
    return false
  }

  // Check if user has any of the required roles
  return userRoles.some(role => matchingRoute.allowedRoles.includes(role))
}

// Check if user has specific role
export function hasRole(userRoles: UserRole[], requiredRole: UserRole): boolean {
  return userRoles.includes(requiredRole)
}

// Check if user has admin role
export function isAdmin(userRoles: UserRole[]): boolean {
  return hasRole(userRoles, 'admin')
}

// Get redirect path based on user roles
export function getRedirectPath(userRoles: UserRole[], intendedPath?: string): string {
  if (isAdmin(userRoles)) {
    return intendedPath || '/'
  }
  
  if (hasRole(userRoles, 'user')) {
    return '/wait-for-confirmation'
  }
  
  return '/auth/signin'
}

// Get user's highest privilege role
export function getHighestRole(userRoles: UserRole[]): UserRole | null {
  if (hasRole(userRoles, 'admin')) return 'admin'
  if (hasRole(userRoles, 'user')) return 'user'
  return null
}