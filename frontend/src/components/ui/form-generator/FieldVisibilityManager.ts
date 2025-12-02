import { FieldVisibilityOptions, FormFieldConfig } from "./types";

export class FieldVisibilityManager {
  /**
   * Determines if a field should be shown based on its display options
   */
  static shouldShowField(
    field: FormFieldConfig,
    allValues: Record<string, any>,
    allFields: FormFieldConfig[]
  ): boolean {
    return (
      this.shouldShow(field.displayOptions, allValues, allFields) &&
      !this.shouldHide(field.displayOptions, allValues, allFields)
    );
  }

  /**
   * Checks if field should be shown based on "show" conditions
   */
  private static shouldShow(
    displayOptions: FieldVisibilityOptions | undefined,
    allValues: Record<string, any>,
    allFields: FormFieldConfig[]
  ): boolean {
    if (!displayOptions?.show) return true;

    return Object.entries(displayOptions.show).every(
      ([dependentFieldName, expectedValues]) => {
        // Get current value for the dependent field
        let currentValue = allValues[dependentFieldName];

        // If value is undefined, try to get the default value from field definition
        if (currentValue === undefined) {
          const dependentField = allFields.find(
            (f) => f.name === dependentFieldName
          );
          currentValue = dependentField?.default;
        }

        // Check if current value matches any of the expected values
        return (
          currentValue !== undefined && expectedValues.includes(currentValue)
        );
      }
    );
  }

  /**
   * Checks if field should be hidden based on "hide" conditions
   */
  private static shouldHide(
    displayOptions: FieldVisibilityOptions | undefined,
    allValues: Record<string, any>,
    allFields: FormFieldConfig[]
  ): boolean {
    if (!displayOptions?.hide) return false;

    return Object.entries(displayOptions.hide).some(
      ([dependentFieldName, expectedValues]) => {
        // Get current value for the dependent field
        let currentValue = allValues[dependentFieldName];

        // If value is undefined, try to get the default value from field definition
        if (currentValue === undefined) {
          const dependentField = allFields.find(
            (f) => f.name === dependentFieldName
          );
          currentValue = dependentField?.default;
        }

        // Check if current value matches any of the values that should hide this field
        return (
          currentValue !== undefined && expectedValues.includes(currentValue)
        );
      }
    );
  }

  /**
   * Gets all fields that should be visible based on current form values
   */
  static getVisibleFields(
    fields: FormFieldConfig[],
    values: Record<string, any>
  ): FormFieldConfig[] {
    return fields.filter((field) =>
      this.shouldShowField(field, values, fields)
    );
  }

  /**
   * Gets all field names that a given field depends on for visibility
   */
  static getFieldDependencies(field: FormFieldConfig): string[] {
    const dependencies: string[] = [];

    if (field.displayOptions?.show) {
      dependencies.push(...Object.keys(field.displayOptions.show));
    }

    if (field.displayOptions?.hide) {
      dependencies.push(...Object.keys(field.displayOptions.hide));
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Gets all fields that depend on a given field for their visibility
   */
  static getDependentFields(
    targetFieldName: string,
    allFields: FormFieldConfig[]
  ): FormFieldConfig[] {
    return allFields.filter((field) => {
      const dependencies = this.getFieldDependencies(field);
      return dependencies.includes(targetFieldName);
    });
  }
}
