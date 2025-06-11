// components/auth/RoleGuard.tsx
'use client'

import { useSession } from 'next-auth/react'
import { ReactNode } from 'react'
import { UserRole } from '@/app/types/auth'
import { hasRole } from '@/lib/auth/roles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield } from 'lucide-react'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: UserRole[]
  fallback?: ReactNode
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { data: session, status } = useSession()

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show unauthorized if no session
  if (!session) {
    return fallback || <UnauthorizedAccess />
  }

  const userRoles = session.user.roles || []
  const hasAccess = allowedRoles.some(role => hasRole(userRoles, role))

  if (!hasAccess) {
    return fallback || <UnauthorizedAccess />
  }

  return <>{children}</>
}

function UnauthorizedAccess() {
  return (
    <div className="flex items-center justify-center h-64">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 dark:bg-red-900 p-3">
              <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to view this content.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}