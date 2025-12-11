import { useEffect, useState } from 'react'
import { Layout, ProtectedRoute, WorkflowEditorLayout } from '@/components'
import { GlobalToastProvider } from '@/components/providers/GlobalToastProvider'
import { Toaster } from '@/components/ui/sonner'
import { initializeEdition } from '@/config/edition'

import { AuthProvider, SidebarContextProvider, TeamProvider, ThemeProvider, WorkspaceProvider } from '@/contexts'
import {
    AcceptInvitationPage,
    CustomNodesPage,
    ExecutionsPage,
    ForgotPasswordPage,
    LoginPage,
    ProfilePage,
    PublicFormPage,
    RegisterPage,
    ResetPasswordPage,
    WebhookRequestsPage,
    WorkflowEditorPage,
    WorkspacePage
} from '@/pages'
import { OAuthCallback } from '@/pages/OAuthCallback'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'

function App() {
  const [editionLoaded, setEditionLoaded] = useState(false)

  // Initialize edition config on app startup
  useEffect(() => {
    initializeEdition().finally(() => setEditionLoaded(true))
  }, [])

  // Show nothing until edition is loaded (very fast, usually instant)
  if (!editionLoaded) {
    return null
  }

  return (
    <>
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <SidebarContextProvider>
              <WorkspaceProvider>
              <TeamProvider>
              <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <ProtectedRoute requireAuth={false}>
                <LoginPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/register"
            element={
              <ProtectedRoute requireAuth={false}>
                <RegisterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <ProtectedRoute requireAuth={false}>
                <ForgotPasswordPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <ProtectedRoute requireAuth={false}>
                <ResetPasswordPage />
              </ProtectedRoute>
            }
          />
          
          {/* Public form route - no authentication required */}
          <Route path="/form/:formId" element={<PublicFormPage />} />

          {/* OAuth callback route - requires auth */}
          <Route
            path="/oauth/callback"
            element={
              <ProtectedRoute>
                <OAuthCallback />
              </ProtectedRoute>
            }
          />

          {/* Workspace invitation acceptance route - requires auth */}
          <Route
            path="/workspaces/invitations/:token/accept"
            element={
              <ProtectedRoute>
                <AcceptInvitationPage />
              </ProtectedRoute>
            }
          />

          {/* Workflow editor routes with persistent layout - must come before main routes */}
          <Route
            path="/workflows/:id/executions/:executionId"
            element={
              <ProtectedRoute>
                <WorkflowEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workflows/:id/*"
            element={
              <ProtectedRoute>
                <WorkflowEditorPage />
              </ProtectedRoute>
            }
          />
          
          {/* Workflow landing page route - without ID shows landing page */}
          <Route
            path="/workflows"
            element={
              <ProtectedRoute>
                <WorkflowEditorLayout />
              </ProtectedRoute>
            }
          />

          {/* Main application routes with layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/workflows" replace />} />
            <Route path="workspace" element={<WorkspacePage />} />
            <Route path="executions" element={<ExecutionsPage />} />
            <Route path="webhook-requests" element={<WebhookRequestsPage />} />
            <Route path="custom-nodes" element={<CustomNodesPage />} />
            <Route path="profile" element={<ProfilePage />} />
          
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
                <Toaster />
                <GlobalToastProvider />
              </TeamProvider>
              </WorkspaceProvider>
            </SidebarContextProvider>
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </>
  )
}

export default App
