import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Building2, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useWorkspaceStore } from "@/stores/workspace"
import { Workspace } from "@/types/workspace"

const formSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  description: z
    .string()
    .max(200, "Description must be less than 200 characters")
    .optional(),
})

type FormValues = z.infer<typeof formSchema>

interface WorkspaceSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspace: Workspace
  onSuccess?: () => void
  onDelete?: () => void
}

export function WorkspaceSettingsModal({
  open,
  onOpenChange,
  workspace,
  onSuccess,
  onDelete,
}: WorkspaceSettingsModalProps) {
  const { updateWorkspace, deleteWorkspace, isLoading } = useWorkspaceStore()
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: workspace.name,
      description: workspace.description || "",
    },
  })

  // Reset form when workspace changes
  React.useEffect(() => {
    form.reset({
      name: workspace.name,
      description: workspace.description || "",
    })
  }, [workspace, form])

  const onSubmit = async (values: FormValues) => {
    try {
      await updateWorkspace(workspace.id, values)
      toast.success("Workspace updated", {
        description: "Your workspace settings have been saved.",
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast.error("Failed to update workspace", {
        description: error.message || "Please try again.",
      })
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteWorkspace(workspace.id)
      toast.success("Workspace deleted", {
        description: `"${workspace.name}" has been deleted.`,
      })
      setShowDeleteDialog(false)
      onOpenChange(false)
      onDelete?.()
    } catch (error: any) {
      toast.error("Failed to delete workspace", {
        description: error.message || "Please try again.",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const isOwner = workspace.userRole === "OWNER"

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Workspace Settings
            </DialogTitle>
            <DialogDescription>
              Update your workspace settings. Only owners can modify these settings.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="My Workspace" 
                        disabled={!isOwner}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A brief description..."
                        className="resize-none"
                        disabled={!isOwner}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-2 space-y-2">
                <FormLabel>Plan</FormLabel>
                <div className="text-sm text-muted-foreground capitalize">
                  {workspace.plan} Plan
                </div>
                <FormDescription>
                  Contact support to upgrade your plan.
                </FormDescription>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {isOwner && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                )}
                <div className="flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                {isOwner && (
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{workspace.name}"? This action cannot be undone.
              All workflows, credentials, and data in this workspace will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
