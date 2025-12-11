import * as React from "react"
import { AlertCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useTeamStore } from "@/stores/team"
import { useWorkspace } from "@/contexts/WorkspaceContext"
import { toast } from "sonner"

interface CreateTeamModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (teamId: string) => void
}

const TEAM_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Orange", value: "#f59e0b" },
  { name: "Pink", value: "#ec4899" },
  { name: "Red", value: "#ef4444" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Indigo", value: "#6366f1" },
]

export function CreateTeamModal({ open, onOpenChange, onSuccess }: CreateTeamModalProps) {
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [selectedColor, setSelectedColor] = React.useState(TEAM_COLORS[0].value)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const { createTeam } = useTeamStore()
  const { currentWorkspace } = useWorkspace()

  const isFreePlan = currentWorkspace?.plan === "free"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Please enter a team name")
      return
    }

    setIsSubmitting(true)

    try {
      const team = await createTeam({
        name: name.trim(),
        description: description.trim() || undefined,
        color: selectedColor,
      })

      toast.success("Team created successfully!")
      onOpenChange(false)
      onSuccess?.(team.id)

      // Reset form
      setName("")
      setDescription("")
      setSelectedColor(TEAM_COLORS[0].value)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create team")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    // Reset form
    setName("")
    setDescription("")
    setSelectedColor(TEAM_COLORS[0].value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {isFreePlan ? (
          <>
            <DialogHeader>
              <DialogTitle>Teams - Pro Feature</DialogTitle>
              <DialogDescription>
                Teams allow you to collaborate with others on workflows and credentials.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Upgrade required</AlertTitle>
                <AlertDescription>
                  Teams are available on Pro and Enterprise plans. Upgrade to create teams and collaborate with your colleagues.
                </AlertDescription>
              </Alert>

              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  Upgrade to Pro
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Create unlimited teams</li>
                  <li>• Invite up to 10 workspace members</li>
                  <li>• Share credentials securely</li>
                  <li>• Collaborate on workflows</li>
                </ul>
                <Button variant="default" size="sm" className="w-full" disabled>
                  Coming Soon
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a team to collaborate with others on workflows and credentials.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Team Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Team Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Engineering Team"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  {name.length}/50 characters
                </p>
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="What is this team for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={200}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/200 characters
                </p>
              </div>

              {/* Color Picker */}
              <div className="grid gap-2">
                <Label>Team Color</Label>
                <div className="flex flex-wrap gap-2">
                  {TEAM_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        selectedColor === color.value
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setSelectedColor(color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !name.trim()}>
                {isSubmitting ? "Creating..." : "Create Team"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
