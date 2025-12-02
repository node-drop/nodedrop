import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Folder, List, RefreshCw, Search } from 'lucide-react'

interface WorkflowsHeaderProps {
  viewMode: 'list' | 'categorized'
  setViewMode: (mode: 'list' | 'categorized') => void
  workflowCount: number
  searchTerm: string
  setSearchTerm: (term: string) => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function WorkflowsHeader({ 
  viewMode, 
  setViewMode, 
  workflowCount,
  searchTerm,
  setSearchTerm,
  onRefresh,
  isRefreshing = false
}: WorkflowsHeaderProps) {
  return (
    <div className="space-y-3">
      {/* Title and view toggles */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Workflows ({workflowCount})
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="h-6 px-2"
            onClick={() => setViewMode('list')}
          >
            <List className="h-3 w-3" />
          </Button>
          <Button
            variant={viewMode === 'categorized' ? 'default' : 'ghost'}
            size="sm"
            className="h-6 px-2"
            onClick={() => setViewMode('categorized')}
          >
            <Folder className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Search input with refresh button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
