import { createField, FormFieldConfig, FormGenerator } from '@/components/ui/form-generator'
import { NodeProperty } from '@/types'
import { NodeValidator, ValidationError } from '@/utils/nodeValidation'

interface PropertyFieldProps {
  property: NodeProperty
  value: any
  parameters: Record<string, any>
  nodeTypeProperties: NodeProperty[]
  validationErrors: ValidationError[]
  onChange: (propertyName: string, value: any) => void
}

export function PropertyField({
  property,
  value,
  parameters,
  validationErrors,
  onChange
}: PropertyFieldProps) {
  // Convert NodeProperty to FormFieldConfig
  const formField: FormFieldConfig = createField({
    name: property.name,
    displayName: property.displayName,
    type: property.type as FormFieldConfig['type'],
    required: property.required,
    default: property.default,
    description: property.description,
    placeholder: property.placeholder,
    options: property.options,
    displayOptions: property.displayOptions,
  })

  // Get error for this field
  const error = NodeValidator.getFieldError(validationErrors, property.name)
  const errors = error ? { [property.name]: error } : {}

  // Use parameters as the values source for visibility logic
  const values = { ...parameters, [property.name]: value }

  // Handle change
  const handleChange = (fieldName: string, newValue: any) => {
    if (fieldName === property.name) {
      onChange(fieldName, newValue)
    }
  }

  return (
    <FormGenerator
      fields={[formField]}
      values={values}
      errors={errors}
      onChange={handleChange}
      showRequiredIndicator={true}
    />
  )
}
