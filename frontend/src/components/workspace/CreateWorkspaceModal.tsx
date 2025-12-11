import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Building2, Loader2, AlertCircle, Sparkles } from "lucide-react"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useWorkspaceStore, WorkspaceLimitInfo } from "@/stores/workspace"

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

interface CreateWorkspaceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (workspaceId: string) => void
}

export function CreateWorkspaceModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateWorkspaceModalProps) {
  const { createWorkspace, checkCanCreateWorkspace, isLoading } = useWorkspaceStore()
  const [limitInfo, setLimitInfo] = React.useState<WorkspaceLimitInfo | null>(null)
  const [isCheckingLimit, setIsCheckingLimit] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  // Check workspace limit when modal opens
  React.useEffect(() => {
    if (open) {
      setIsCheckingLimit(true)
      checkCanCreateWorkspace()
        .then(setLimitInfo)
        .finally(() => setIsCheckingLimit(false))
    } else {
      setLimitInfo(null)
      form.reset()
    }
  }, [open, checkCanCreateWorkspace, form])

  const onSubmit = async (values: FormValues) => {
    try {
      const workspace = await createWorkspace(values.name, values.description)
      toast.success("Workspace created", {
        description: `"${workspace.name}" has been created successfully.`,
      })
      form.reset()
      onOpenChange(false)
      onSuccess?.(workspace.id)
    } catch (error: any) {
      toast.error("Failed to create workspace", {
        description: error.message || "Please try again.",
      })
    }
  }

  const canCreate = limitInfo?.allowed ?? false
  const showLimitReached = limitInfo && !limitInfo.allowed

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create Workspace
          </DialogTitle>
          <DialogDescription>
            Create a new workspace to organize your workflows and collaborate with your team.
          </DialogDescription>
        </DialogHeader>

        {isCheckingLimit ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : showLimitReached ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Workspace limit reached</AlertTitle>
              <AlertDescription>
                {limitInfo.reason}
              </AlertDescription>
            </Alert>
            
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                Upgrade to Pro
              </div>
              <p className="text-sm text-muted-foreground">
                Get up to 5 workspaces, 50 workflows per workspace, and 10,000 monthly executions.
              </p>
              <Button variant="default" size="sm" className="w-full" disabled>
                Coming Soon
              </Button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {limitInfo && limitInfo.maxAllowed !== -1 && (
                <p className="text-xs text-muted-foreground">
                  {limitInfo.currentCount} of {limitInfo.maxAllowed} workspace{limitInfo.maxAllowed !== 1 ? 's' : ''} used
                </p>
              )}
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Workspace" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is the display name for your workspace.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A brief description of this workspace..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !canCreate}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Workspace
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
