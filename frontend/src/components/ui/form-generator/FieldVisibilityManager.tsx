import { FormFieldConfig } from './types'

export class FieldVisibilityManager {
  /**
   * Get visible fields based on current values and display options
   */
  static getVisibleFields(fields: FormFieldConfig[], values: Record<string, any>): FormFieldConfig[] {
    return fields.filter(field => this.shouldShowField(field, values, fields))
  }

  /**
   * Check if a field should be visible based on display options
   */
  static shouldShowField(
    field: FormFieldConfig,
    values: Record<string, any>,
    allFields: FormFieldConfig[]
  ): boolean {
    // If no display options, field is always visible
    if (!field.displayOptions) {
      return true
    }

    // Handle show conditions
    if (field.displayOptions.show) {
      return this.evaluateConditions(field.displayOptions.show, values)
    }

    // Handle hide conditions
    if (field.displayOptions.hide) {
      return !this.evaluateConditions(field.displayOptions.hide, values)
    }

    // Default to visible
    return true
  }

  /**
   * Get fields that depend on a specific field
   */
  static getDependentFields(fieldName: string, fields: FormFieldConfig[]): FormFieldConfig[] {
    return fields.filter(field => {
      if (!field.displayOptions) return false

      const conditions = field.displayOptions.show || field.displayOptions.hide
      if (!conditions) return false

      return Object.keys(conditions).includes(fieldName)
    })
  }

  /**
   * Evaluate display condition rules
   */
  private static evaluateConditions(
    conditions: Record<string, any>,
    values: Record<string, any>
  ): boolean {
    return Object.entries(conditions).every(([fieldName, condition]) => {
      const fieldValue = values[fieldName]
      
      // Handle array of values (OR condition)
      if (Array.isArray(condition)) {
        return condition.some(value => this.evaluateCondition(fieldValue, value))
      }
      
      // Handle single condition
      return this.evaluateCondition(fieldValue, condition)
    })
  }

  /**
   * Evaluate a single condition
   */
  private static evaluateCondition(fieldValue: any, condition: any): boolean {
    // Handle string conditions with operators
    if (typeof condition === 'string') {
      // Not equal operator
      if (condition.startsWith('!=')) {
        const value = condition.slice(2).trim()
        return fieldValue !== this.parseValue(value)
      }
      
      // Greater than operator
      if (condition.startsWith('>')) {
        const value = condition.slice(1).trim()
        return Number(fieldValue) > Number(this.parseValue(value))
      }
      
      // Less than operator
      if (condition.startsWith('<')) {
        const value = condition.slice(1).trim()
        return Number(fieldValue) < Number(this.parseValue(value))
      }
      
      // Greater than or equal operator
      if (condition.startsWith('>=')) {
        const value = condition.slice(2).trim()
        return Number(fieldValue) >= Number(this.parseValue(value))
      }
      
      // Less than or equal operator
      if (condition.startsWith('<=')) {
        const value = condition.slice(2).trim()
        return Number(fieldValue) <= Number(this.parseValue(value))
      }
      
      // Equals operator (default)
      return fieldValue === this.parseValue(condition)
    }
    
    // Handle boolean conditions
    if (typeof condition === 'boolean') {
      return fieldValue === condition
    }
    
    // Handle number conditions
    if (typeof condition === 'number') {
      return fieldValue === condition
    }
    
    // Default equality check
    return fieldValue === condition
  }

  /**
   * Parse string values to appropriate types
   */
  private static parseValue(value: string): any {
    // Handle quoted strings
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1)
    }
    
    // Handle empty string
    if (value === '' || value === '""' || value === "''") {
      return ''
    }
    
    // Handle booleans
    if (value === 'true') return true
    if (value === 'false') return false
    
    // Handle null/undefined
    if (value === 'null') return null
    if (value === 'undefined') return undefined
    
    // Handle numbers
    if (!isNaN(Number(value)) && value !== '') {
      return Number(value)
    }
    
    // Return as string
    return value
  }
}
