import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, RefreshCw, Search } from 'lucide-react'

interface CredentialsHeaderProps {
  credentialsCount: number
  searchTerm: string
  onSearchChange: (term: string) => void
  onCreateClick: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function CredentialsHeader({ 
  credentialsCount, 
  searchTerm, 
  onSearchChange, 
  onCreateClick,
  onRefresh,
  isRefreshing = false
}: CredentialsHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Credentials ({credentialsCount})
        </span>
        <div className="flex items-center gap-1">
          <Button
            onClick={() => {
              console.log('New button clicked in header')
              onCreateClick()
            }}
            size="sm"
            className="h-7 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            New
          </Button>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search credentials..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    </div>
  )
}
