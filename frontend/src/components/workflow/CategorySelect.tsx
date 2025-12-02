import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { useGlobalToast } from '@/hooks/useToast'
import { workflowService } from '@/services/workflow'
import { useCategoriesStore } from '@/stores/categories'
import { ChevronDown, FolderOpen, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CreateCategoryModal } from './CreateCategoryModal'

interface CategorySelectProps {
  value: string
  onValueChange: (category: string) => void
  className?: string
  placeholder?: string
  allowCreate?: boolean
  showDeleteOption?: boolean
  variant?: 'dropdown' | 'select'
}

export function CategorySelect({
  value,
  onValueChange,
  className = '',
  placeholder = 'Select a category',
  allowCreate = true,
  showDeleteOption = false,
  variant = 'select'
}: CategorySelectProps) {
  const { categories: availableCategories, isLoading: isLoadingCategories, loadCategories, addCategory, removeCategory } = useCategoriesStore()
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false)
  const [isDeletingCategory, setIsDeletingCategory] = useState(false)
  const { showSuccess, showError } = useGlobalToast()

  // Load available categories on mount
  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const handleCategoryCreated = async (categoryName: string) => {
    try {
      addCategory(categoryName)
      onValueChange(categoryName)
    } catch (error) {
      console.error('Failed to refresh categories:', error)
    }
  }

  const handleDeleteCategory = async (categoryName: string) => {
    try {
      setIsDeletingCategory(true)
      await workflowService.deleteCategory(categoryName)
      
      removeCategory(categoryName)
      
      if (value === categoryName) {
        onValueChange('')
      }

      // Show success toast
      showSuccess('Category deleted successfully', {
        message: `"${categoryName}" category has been removed.`
      })
    } catch (error: any) {
      console.error('Failed to delete category:', error)
      
      // Show error toast
      const errorMessage = error.response?.data?.error?.message || 
        'Failed to delete category. It may be in use by some workflows.'
      
      showError('Failed to delete category', {
        message: errorMessage,
        duration: 8000
      })
    } finally {
      setIsDeletingCategory(false)
    }
  }

  if (variant === 'dropdown') {
    return (
      <>
        <CreateCategoryModal
          isOpen={showCreateCategoryModal}
          onClose={() => setShowCreateCategoryModal(false)}
          onCategoryCreated={handleCategoryCreated}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`justify-between ${className}`}>
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                <span>{value || placeholder}</span>
              </div>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            {isLoadingCategories ? (
              <DropdownMenuItem disabled>Loading categories...</DropdownMenuItem>
            ) : (
              <>
                {allowCreate && (
                  <>
                    <DropdownMenuItem 
                      onClick={() => setShowCreateCategoryModal(true)}
                      className="text-blue-600 font-medium"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add new category
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => onValueChange('')}>
                  <FolderOpen className="w-4 h-4 mr-2" />
                  {placeholder}
                </DropdownMenuItem>
                {availableCategories.map((cat) => (
                  <DropdownMenuItem
                    key={cat}
                    className={`group ${value === cat ? 'bg-accent' : ''}`}
                    onSelect={(e) => showDeleteOption ? e.preventDefault() : undefined}
                  >
                    <div 
                      className="flex items-center flex-1 cursor-pointer"
                      onClick={() => onValueChange(cat)}
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      {cat}
                    </div>
                    {showDeleteOption && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCategory(cat)
                        }}
                        disabled={isDeletingCategory}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive hover:text-destructive-foreground rounded transition-all ml-2"
                        title={`Delete ${cat} category`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    )
  }

  // Default select variant
  return (
    <>
      <CreateCategoryModal
        isOpen={showCreateCategoryModal}
        onClose={() => setShowCreateCategoryModal(false)}
        onCategoryCreated={handleCategoryCreated}
      />
      <div className={`space-y-2 ${className}`}>
        {isLoadingCategories ? (
          <div className="text-sm text-muted-foreground">Loading categories...</div>
        ) : (
          <>
            <select
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{placeholder}</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                  {showDeleteOption && ' (Delete available in dropdown)'}
                </option>
              ))}
            </select>
            {allowCreate && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateCategoryModal(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add new category
              </Button>
            )}
            {showDeleteOption && availableCategories.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Delete Category</Label>
                <div className="flex flex-wrap gap-1">
                  {availableCategories.map((cat) => (
                    <Button
                      key={cat}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCategory(cat)}
                      disabled={isDeletingCategory}
                      className="text-xs h-7 px-2"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
