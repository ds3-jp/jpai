"use client";

import { LogOut, Moon, Sun } from 'lucide-react'
import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from './ui/button'
import { useTheme } from 'next-themes'
import { SidebarTrigger } from './ui/sidebar';
import { useSession, signOut } from 'next-auth/react';
import { Badge } from './ui/badge';

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { isAdmin } from '@/lib/auth/roles';

const Navbar = () => {
    const { theme, setTheme } = useTheme();
    const pathname = usePathname();
    const { data: session, status } = useSession()

    const pageTitle = useMemo(() => {
    if (!pathname || pathname === "/") return "Home";
    const segments = pathname.split('/').filter(Boolean);
    return segments[segments.length - 1]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    }, [pathname]);

    const handleSignOut = async () => {
      await signOut({ 
        callbackUrl: '/auth/signin',
        redirect: true 
      })
    }

    // Get user initials for avatar
    const getUserInitials = (name: string) => {
      return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    const userRoles = session?.user?.roles || []
    const showSidebarTrigger = isAdmin(userRoles)

    return (
        <nav className='sticky top-0 z-50 flex py-4 px-4 bg-background rounded-2xl items-center justify-between'>
            {/* LEFT */}
            <div className='flex items-center gap-4'>
                {showSidebarTrigger && <SidebarTrigger/>}
                <span className="text-lg font-semibold">{pageTitle}</span>
            </div>
            
            {/* RIGHT */}
            <div className='flex items-center gap-4'>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTheme("light")}>
                        Light
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")}>
                        Dark
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("system")}>
                        System
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                
                {session && (
                  <DropdownMenu>
                      <DropdownMenuTrigger>
                          <Avatar>
                              <AvatarImage src="" alt={session.user.name} />
                              <AvatarFallback>
                                {getUserInitials(session.user.name || 'User')}
                              </AvatarFallback>
                          </Avatar>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent sideOffset={10}>
                          <DropdownMenuLabel>
                            <div className="flex flex-col">
                              <span>{session.user.name}</span>
                              <span className="text-xs text-muted-foreground">{session.user.email}</span>
                              <div className="flex gap-1 mt-1">
                                {userRoles.map(role => (
                                  <Badge key={role} variant="secondary" className="text-xs">
                                    {role}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant='destructive' onClick={handleSignOut}>
                              <LogOut className='h-[1.2rem] w-[1.2rem] mr-2'/>
                              Logout
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </div>
        </nav>
    )
}

export default Navbar