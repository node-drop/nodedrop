import { lazy, Suspense, useEffect, useState } from 'react'
import { Layout, ProtectedRoute } from '@/components'
import { GlobalToastProvider } from '@/components/providers/GlobalToastProvider'
import { Toaster } from '@/components/ui/sonner'
import { initializeEdition } from '@/config/edition'

import { AuthProvider, SidebarContextProvider, TeamProvider, ThemeProvider, WorkspaceProvider } from '@/contexts'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router'
import { Loader2 } from 'lucide-react'

// Lazy load pages for better initial bundle size
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then(m => ({ default: m.RegisterPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const PublicFormPage = lazy(() => import('@/pages/PublicFormPage').then(m => ({ default: m.PublicFormPage })))
const OAuthCallback = lazy(() => import('@/pages/OAuthCallback').then(m => ({ default: m.OAuthCallback })))
const AcceptInvitationPage = lazy(() => import('@/pages/AcceptInvitationPage').then(m => ({ default: m.AcceptInvitationPage })))
const WorkflowEditorPage = lazy(() => import('@/pages/WorkflowEditorPage').then(m => ({ default: m.WorkflowEditorPage })))
const WorkflowEditorLayout = lazy(() => import('@/components/layouts/WorkflowEditorLayout').then(m => ({ default: m.WorkflowEditorLayout })))
const WorkspacePage = lazy(() => import('@/pages/WorkspacePage').then(m => ({ default: m.WorkspacePage })))
const ExecutionsPage = lazy(() => import('@/pages/ExecutionsPage').then(m => ({ default: m.ExecutionsPage })))
const BackupPage = lazy(() => import('@/pages/BackupPage').then(m => ({ default: m.BackupPage })))
const WebhookRequestsPage = lazy(() => import('@/pages/WebhookRequestsPage').then(m => ({ default: m.WebhookRequestsPage })))
const CustomNodesPage = lazy(() => import('@/pages/CustomNodesPage').then(m => ({ default: m.CustomNodesPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })))

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen w-full bg-background">
      <div className="flex items-center space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-muted-foreground">Loading...</span>
      </div>
    </div>
  )
}

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
              <Suspense fallback={<PageLoader />}>
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
                    <Route path="backup" element={<BackupPage />} />
                    <Route path="webhook-requests" element={<WebhookRequestsPage />} />
                    <Route path="custom-nodes" element={<CustomNodesPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                  </Route>

                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </Suspense>
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
