"use client"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuthStore, useSystemStore } from "@/stores"
import {
  Activity,
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  Database,
  Download,
  LogOut,
  RefreshCw,
  Webhook,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar?: string
  }
}) {
  const { isMobile } = useSidebar()
  const { logout } = useAuthStore()
  const { systemInfo, loadSystemInfo, checkForUpdates, installUpdate, isCheckingUpdate, isUpdating } = useSystemStore()
  const navigate = useNavigate()
  const [showUpdateOption, setShowUpdateOption] = useState(false)

  useEffect(() => {
    loadSystemInfo()
  }, [loadSystemInfo])

  useEffect(() => {
    setShowUpdateOption(systemInfo?.isDocker || false)
  }, [systemInfo])

  const handleCheckForUpdates = async () => {
    try {
      const updateInfo = await checkForUpdates()
      if (updateInfo?.updateAvailable) {
        toast.info('Update Available', {
          description: updateInfo?.message || 'A new version is available',
          action: {
            label: 'Update Now',
            onClick: handleInstallUpdate,
          },
        })
      } else {
        toast.success('Up to Date', {
          description: updateInfo?.message || 'You are running the latest version',
        })
      }
    } catch (error) {
      toast.error('Failed to check for updates')
    }
  }

  const handleInstallUpdate = async () => {
    try {
      const currentVersion = systemInfo?.version;
      const result = await installUpdate();
      
      toast.success('Update Started', {
        description: result.message || 'The application will restart in a few moments',
        duration: 60000, // Show for 60 seconds
      });

      // Poll for update completion
      let pollCount = 0;
      const maxPolls = 60; // Poll for up to 60 seconds
      
      const pollInterval = setInterval(async () => {
        pollCount++;
        
        try {
          // Try to reach the health endpoint
          const response = await fetch('/api/system/health');
          
          if (response.ok) {
            const data = await response.json();
            
            // Check if version changed (update completed)
            if (data.version !== currentVersion) {
              clearInterval(pollInterval);
              
              toast.success('Update Complete!', {
                description: `Updated to version ${data.version}. Reloading...`,
                duration: 3000,
              });
              
              // Reload the page after 2 seconds
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            }
          }
        } catch (error) {
          // Server is down (expected during update)
          console.log('[Update] Server unreachable, waiting...');
        }
        
        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          toast.info('Update Taking Longer Than Expected', {
            description: 'Please refresh the page manually in a moment',
            action: {
              label: 'Refresh Now',
              onClick: () => window.location.reload(),
            },
          });
        }
      }, 2000); // Poll every 2 seconds
      
    } catch (error: any) {
      toast.error('Update Failed', {
        description: error.message || 'Failed to install update',
      })
    }
  }
  
  // Get user initials for fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  
  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }
  
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground md:h-8 md:p-0"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate('/executions')}>
                <Activity />
                Executions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/webhook-requests')}>
                <Webhook />
                Webhook Requests
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/custom-nodes')}>
                <Database />
                Custom Nodes
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {showUpdateOption && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCheckForUpdates} disabled={isCheckingUpdate || isUpdating}>
                  {isCheckingUpdate ? (
                    <RefreshCw className="animate-spin" />
                  ) : (
                    <Download />
                  )}
                  <span>Check for Updates</span>
                  {systemInfo?.version && (
                    <span className="ml-auto text-xs text-muted-foreground font-mono">
                      v{systemInfo.version}
                    </span>
                  )}
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
