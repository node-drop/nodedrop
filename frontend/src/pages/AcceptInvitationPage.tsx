import * as React from "react"
import { useNavigate, useParams } from "react-router"
import { Building2, CheckCircle, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { workspaceService } from "@/services/workspace"
import { useWorkspaceStore } from "@/stores/workspace"

type Status = "loading" | "success" | "error"

export function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { fetchWorkspaces, setCurrentWorkspace } = useWorkspaceStore()
  
  const [status, setStatus] = React.useState<Status>("loading")
  const [errorMessage, setErrorMessage] = React.useState<string>("")

  React.useEffect(() => {
    const acceptInvitation = async () => {
      if (!token) {
        setStatus("error")
        setErrorMessage("Invalid invitation link")
        return
      }

      try {
        const member = await workspaceService.acceptInvitation(token)
        
        // Refresh workspaces list
        await fetchWorkspaces()
        
        // Set the new workspace as current
        if (member.workspaceId) {
          setCurrentWorkspace(member.workspaceId)
        }

        setStatus("success")
        
        toast.success("Invitation accepted!", {
          description: "You've joined the workspace successfully.",
        })
      } catch (error: any) {
        setStatus("error")
        setErrorMessage(error.message || "Failed to accept invitation")
      }
    }

    acceptInvitation()
  }, [token, fetchWorkspaces, setCurrentWorkspace])

  const handleGoToWorkspace = () => {
    navigate("/workflows")
  }

  const handleGoHome = () => {
    navigate("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            {status === "loading" && (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            )}
            {status === "success" && (
              <CheckCircle className="h-8 w-8 text-green-500" />
            )}
            {status === "error" && (
              <XCircle className="h-8 w-8 text-destructive" />
            )}
          </div>
          <CardTitle>
            {status === "loading" && "Accepting Invitation..."}
            {status === "success" && "Welcome to the Workspace!"}
            {status === "error" && "Invitation Failed"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait while we process your invitation."}
            {status === "success" && "You've successfully joined the workspace."}
            {status === "error" && errorMessage}
          </CardDescription>
        </CardHeader>

        {status === "success" && (
          <CardContent className="text-center">
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-muted">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">You're now a member</span>
            </div>
          </CardContent>
        )}

        <CardFooter className="flex justify-center gap-2">
          {status === "success" && (
            <Button onClick={handleGoToWorkspace}>
              Go to Workspace
            </Button>
          )}
          {status === "error" && (
            <Button variant="outline" onClick={handleGoHome}>
              Go to Home
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
