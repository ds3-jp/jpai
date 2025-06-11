'use client'

import { useEffect, useState } from 'react'
import { signIn, getSession, useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Shield } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  // Check if user is already authenticated
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push(callbackUrl)
    }
  }, [session, status, router, callbackUrl])

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      const result = await signIn('keycloak', { 
        callbackUrl,
        redirect: false 
      })
      
      if (result?.error) {
        console.error('Sign in error:', result.error)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setIsLoading(false)
    }
  }

  // Show loading if checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-lg">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src="/logoipsum-363.svg" alt="logo" width={40} height={40} />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to access the Nextweb Call Management System
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleSignIn} 
            className="w-full" 
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Sign in with Keycloak
              </>
            )}
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>Protected by Keycloak Authentication</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}