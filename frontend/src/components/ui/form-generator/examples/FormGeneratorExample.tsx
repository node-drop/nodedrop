import {
    createDisplayOptions,
    createField,
    createOptions,
    createValidation,
    FormFieldConfig,
    FormGenerator
} from '@/components/ui/form-generator'
import React, { useState } from 'react'

// Example of how to use the FormGenerator
export function FormGeneratorExample() {
  const [values, setValues] = useState({
    name: '',
    email: '',
    age: 0,
    country: '',
    interests: [],
    isActive: false,
    enableNotifications: false,
    notificationEmail: '',
    bio: '',
    website: '',
    config: {},
    birthday: '',
  })

  // Define form fields with various types and conditional logic
  const fields: FormFieldConfig[] = [
    createField({
      name: 'name',
      displayName: 'Full Name',
      type: 'string',
      required: true,
      placeholder: 'Enter your full name',
      validation: createValidation({
        minLength: 2,
        maxLength: 50,
      }),
    }),

    createField({
      name: 'email',
      displayName: 'Email Address',
      type: 'email',
      required: true,
      placeholder: 'Enter your email',
      description: 'We will use this to contact you',
    }),

    createField({
      name: 'age',
      displayName: 'Age',
      type: 'number',
      required: true,
      validation: createValidation({
        min: 13,
        max: 120,
      }),
    }),

    createField({
      name: 'country',
      displayName: 'Country',
      type: 'options',
      required: true,
      options: createOptions([
        { name: 'United States', value: 'us' },
        { name: 'Canada', value: 'ca' },
        { name: 'United Kingdom', value: 'uk' },
        { name: 'Germany', value: 'de' },
        { name: 'France', value: 'fr' },
        { name: 'Other', value: 'other' },
      ]),
    }),

    createField({
      name: 'interests',
      displayName: 'Interests',
      type: 'multiOptions',
      description: 'Select all that apply',
      options: createOptions([
        { name: 'Technology', value: 'tech', description: 'Programming, AI, etc.' },
        { name: 'Sports', value: 'sports', description: 'Football, basketball, etc.' },
        { name: 'Music', value: 'music', description: 'All genres' },
        { name: 'Travel', value: 'travel', description: 'Exploring new places' },
        { name: 'Reading', value: 'reading', description: 'Books and articles' },
      ]),
    }),

    createField({
      name: 'isActive',
      displayName: 'Active Member',
      type: 'boolean',
      default: false,
      description: 'Are you an active member?',
    }),

    createField({
      name: 'enableNotifications',
      displayName: 'Enable Email Notifications',
      type: 'switch',
      default: false,
      description: 'Receive updates via email',
    }),

    // Conditional field - only show when notifications are enabled
    createField({
      name: 'notificationEmail',
      displayName: 'Notification Email',
      type: 'email',
      placeholder: 'Enter notification email (optional)',
      description: 'Leave blank to use your main email',
      displayOptions: createDisplayOptions({
        show: { enableNotifications: [true] },
      }),
    }),

    createField({
      name: 'bio',
      displayName: 'Biography',
      type: 'textarea',
      placeholder: 'Tell us about yourself...',
      rows: 4,
      validation: createValidation({
        maxLength: 500,
      }),
    }),

    createField({
      name: 'website',
      displayName: 'Website',
      type: 'url',
      placeholder: 'https://example.com',
      description: 'Your personal or professional website',
    }),

    createField({
      name: 'config',
      displayName: 'Configuration',
      type: 'json',
      description: 'Advanced configuration in JSON format',
      default: { theme: 'dark', language: 'en' },
    }),

    createField({
      name: 'birthday',
      displayName: 'Birthday',
      type: 'dateTime',
      description: 'Your date of birth',
    }),
  ]

  const handleChange = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form values:', values)
    alert('Form submitted! Check console for values.')
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">FormGenerator Example</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormGenerator
          fields={fields}
          values={values}
          onChange={handleChange}
          showRequiredIndicator={true}
        />

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Submit
          </button>
          
          <button
            type="button"
            onClick={() => setValues({
              name: '',
              email: '',
              age: 0,
              country: '',
              interests: [],
              isActive: false,
              enableNotifications: false,
              notificationEmail: '',
              bio: '',
              website: '',
              config: {},
              birthday: '',
            })}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Display current values for debugging */}
      <div className="mt-8 p-4 bg-gray-100 rounded-md">
        <h3 className="text-lg font-semibold mb-2">Current Values:</h3>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(values, null, 2)}
        </pre>
      </div>
    </div>
  )
}

// Example of creating a custom field component
export function CustomFieldExample() {
  return (
    <div className="p-4 border border-gray-300 rounded-md">
      <h4 className="font-medium mb-2">Custom Field Component</h4>
      <p className="text-sm text-gray-600">
        This demonstrates how you can create custom field components and integrate them with FormGenerator.
      </p>
    </div>
  )
}
