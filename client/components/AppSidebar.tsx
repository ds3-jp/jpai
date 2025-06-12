"use client";

import React from 'react'
import  {LayoutDashboard, PhoneForwarded, History, Settings, User2, ChevronUp, LogOut} from 'lucide-react'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from './ui/sidebar'
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { isAdmin } from '@/lib/auth/roles';

const AppSidebar = () => {
    const pathname = usePathname()
    const { data: session } = useSession()
    
    // Menu items (only show to admin users)
    const items = [
      {
        title: "Dashboard",
        url: "/",
        icon: LayoutDashboard,
      },
      {
        title: "Batch Calling",
        url: "/batch-calling",
        icon: PhoneForwarded,
      },
      {
        title: "Call History",
        url: "/call-history",
        icon: History,
      },
      {
        title: "Settings",
        url: "#",
        icon: Settings,
      },
    ]

    const handleSignOut = async () => {
      await signOut({ 
        callbackUrl: '/auth/signin',
        redirect: true 
      })
    }

    // Don't show sidebar for non-admin users
    const userRoles = session?.user?.roles || []
    if (!isAdmin(userRoles)) {
      return null
    }

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader className='py-4'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/">
                <img src="\logoipsum-363.svg" alt="logo" height={20} width={20}/>
                <span className='font-semibold'>AKAD Agent</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item)=>(
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon/>
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>)
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User2/> {session?.user?.name || 'User'} <ChevronUp className='ml-auto'/>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem variant='destructive' onClick={handleSignOut}>
                  <LogOut/>
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>  
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar