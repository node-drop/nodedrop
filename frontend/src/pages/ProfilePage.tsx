/**
 * ProfilePage Component
 * 
 * Displays and allows editing of user profile information.
 * Uses user data from auth context and shows role badge.
 * 
 * Requirements: 3.4 - Session contains required user data (id, email, name, role)
 */
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { userService } from '@/services'
import { Loader2, Save, Shield, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

/**
 * Role badge component that displays the user's role with appropriate styling
 */
const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const isAdmin = role === 'ADMIN'
  
  return (
    <Badge 
      variant={isAdmin ? 'default' : 'secondary'}
      className={isAdmin ? 'bg-primary' : ''}
    >
      {isAdmin && <Shield className="w-3 h-3 mr-1" />}
      {role}
    </Badge>
  )
}

export function ProfilePage() {
  const { user: authUser, refetchSession } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      const profile = await userService.getProfile()
      setFormData({
        name: profile.name || '',
        email: profile.email,
      })
    } catch (error: any) {
      toast.error(error.message || 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    if (!formData.email.trim()) {
      toast.error('Email is required')
      return
    }

    try {
      setIsSaving(true)
      await userService.updateProfile({
        name: formData.name.trim(),
        email: formData.email.trim(),
      })

      // Refresh the session to get updated user data
      await refetchSession()

      toast.success('Profile updated successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading profile...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <User className="h-8 w-8" />
              Profile
            </h1>
            {authUser?.role && <RoleBadge role={authUser.role} />}
          </div>
          <p className="text-muted-foreground mt-2">
            Manage your personal information and account settings
          </p>
        </div>

        <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your name and email address
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Read-only account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>User ID</Label>
                  <div className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                    {authUser?.id}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex items-center gap-2">
                    {authUser?.role && <RoleBadge role={authUser.role} />}
                    <span className="text-sm text-muted-foreground">
                      {authUser?.role === 'ADMIN' 
                        ? 'Full administrative access' 
                        : 'Standard user access'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Account Created</Label>
                  <div className="text-sm text-muted-foreground">
                    {authUser?.createdAt && new Date(authUser.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}
