'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Mail, Phone, LogOut } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { Badge } from '@/components/ui/badge'

export default function WaitForConfirmationPage() {
  const { data: session } = useSession()

  const handleSignOut = async () => {
    await signOut({ 
      callbackUrl: '/auth/signin',
      redirect: true 
    })
  }

  return (
    <div className="flex items-center justify-center bg-background p-4 overflow-hidden h-auto">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-yellow-100 dark:bg-yellow-900 p-3">
              <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Account Pending Approval</CardTitle>
          <CardDescription className="text-lg">
            Your account is waiting for administrator confirmation
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* User Info */}
          {session && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Logged in as:</span>
                <Badge variant="secondary">User</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{session.user.name}</p>
              <p className="text-sm text-muted-foreground">{session.user.email}</p>
            </div>
          )}

          {/* Information */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Administrator Review</h4>
                <p className="text-sm text-muted-foreground">
                  An administrator will review your account and grant appropriate permissions.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Contact Support</h4>
                <p className="text-sm text-muted-foreground">
                  If you need immediate access, please contact your system administrator.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
          
          {/* <div className="text-center text-xs text-muted-foreground">
            <p>You will be notified once your account is approved</p>
          </div> */}
        </CardContent>
      </Card>
    </div>
  )
}