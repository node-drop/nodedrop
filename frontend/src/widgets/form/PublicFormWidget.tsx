import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormGenerator } from '@/components/ui/form-generator/FormGenerator'
import { FormFieldConfig, FormGeneratorRef } from '@/components/ui/form-generator/types'
import axios from 'axios'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface FormConfig {
  formTitle: string
  formDescription: string
  formFields: FormFieldConfig[]
  submitButtonText: string
  workflowName?: string
  isActive?: boolean
}

interface FormResponse {
  success: boolean
  form?: FormConfig
  formId?: string
  workflowId?: string
  error?: string
}

interface PublicFormWidgetProps {
  formId: string
  apiUrl?: string
  theme?: 'light' | 'dark' | 'auto'
  onSuccess?: (data: any) => void
  onError?: (error: any) => void
}

export function PublicFormWidget({
  formId,
  apiUrl: customApiUrl,
  theme = 'auto',
  onSuccess,
  onError
}: PublicFormWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null)
  const [workflowId, setWorkflowId] = useState<string>('')
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  
  const formGeneratorRef = useRef<FormGeneratorRef>(null)

  // Get API URL
  const getApiUrl = () => {
    if (customApiUrl) return customApiUrl
    
    // Try to detect from current page
    const currentOrigin = window.location.origin
    const apiUrl = currentOrigin.includes('localhost') 
      ? 'http://localhost:4000/api' 
      : `${currentOrigin}/api`
    
    return apiUrl
  }

  // Fetch form configuration on mount
  useEffect(() => {
    const fetchFormConfig = async () => {
      try {
        const apiUrl = getApiUrl()
        const response = await axios.get<FormResponse>(`${apiUrl}/public/forms/${formId}`)
        
        if (response.data.success && response.data.form) {
          setFormConfig(response.data.form)
          setWorkflowId(response.data.workflowId || '')
        } else {
          const error = response.data.error || 'Form not found'
          setSubmitStatus('error')
          setSubmitMessage(error)
          onError?.(error)
        }
      } catch (error: any) {
        console.error('Error fetching form:', error)
        setSubmitStatus('error')
        const errorMessage = typeof error.response?.data?.error === 'string' 
          ? error.response.data.error 
          : error.message || 'Failed to load form. Please check the URL and try again.'
        setSubmitMessage(errorMessage)
        onError?.(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchFormConfig()
  }, [formId, customApiUrl])

  // Handle field value changes
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [fieldName]: value
    }))
    
    // Clear field error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formConfig || submitting) return

    // Validate form
    const validationErrors = formGeneratorRef.current?.validate()
    if (validationErrors && Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    setSubmitStatus('idle')
    setErrors({})

    try {
      const apiUrl = getApiUrl()
      const response = await axios.post(`${apiUrl}/public/forms/${formId}/submit`, {
        formData: formValues,
        workflowId: workflowId
      })

      if (response.data.success) {
        setSubmitStatus('success')
        const message = response.data.message || 'Form submitted successfully!'
        setSubmitMessage(message)
        
        // Reset form after successful submission
        setFormValues({})
        
        // Call success callback
        onSuccess?.(response.data)
      } else {
        const error = response.data.error || 'Failed to submit form'
        setSubmitStatus('error')
        setSubmitMessage(error)
        onError?.(error)
      }
    } catch (error: any) {
      console.error('Form submission error:', error)
      setSubmitStatus('error')
      const errorMessage = typeof error.response?.data?.error === 'string'
        ? error.response.data.error
        : error.message || 'An error occurred while submitting the form. Please try again.'
      setSubmitMessage(errorMessage)
      onError?.(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      // Auto: detect system preference
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (isDark) {
        document.documentElement.classList.add('dark')
      }
    }
  }, [theme])

  // Loading state
  if (loading) {
    return (
      <div className="w-full p-4">
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading form...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state (form not found)
  if (!formConfig) {
    return (
      <div className="w-full p-4">
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <XCircle className="w-16 h-16 text-destructive mb-4" />
              <h2 className="text-2xl font-bold mb-2">Form Not Found</h2>
              <p className="text-muted-foreground text-center">
                {submitMessage || 'The form you are looking for does not exist or is no longer available.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main form view
  return (
    <div className="w-full p-4">
      {/* Success/Error Alert */}
      {submitStatus === 'success' && (
        <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            {submitMessage}
          </AlertDescription>
        </Alert>
      )}

      {submitStatus === 'error' && (
        <Alert className="mb-6 border-red-200 bg-red-50 dark:bg-red-950" variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {submitMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Form Card */}
      <Card className="shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {formConfig.formTitle}
          </CardTitle>
          {formConfig.formDescription && (
            <CardDescription className="text-base">
              {formConfig.formDescription}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Form Fields */}
            <FormGenerator
              ref={formGeneratorRef}
              fields={formConfig.formFields}
              values={formValues}
              errors={errors}
              onChange={handleFieldChange}
              disabled={submitting}
              disableAutoValidation={true}
              showRequiredIndicator={true}
            />

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={submitting || formConfig.formFields.length === 0}
                className="w-full h-11 text-base"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  formConfig.submitButtonText || 'Submit'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
