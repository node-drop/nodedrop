/**
 * Unit tests for error handling utilities
 */

import { vi } from 'vitest'
import {
  ErrorCodes,
  createOperationError,
  extractErrorDetails,
  getUserFriendlyErrorMessage,
  isRecoverableError,
  getRecoverySuggestions,
  validateTitle,
  validateImportFile,
  retryOperation,
  createAsyncErrorHandler
} from '@/utils/errorHandling'

describe('Error Handling Utilities', () => {
  describe('createOperationError', () => {
    it('should create an operation error with all properties', () => {
      const error = createOperationError(
        ErrorCodes.TITLE_EMPTY,
        'Title is empty',
        'Additional details',
        { userId: '123' },
        true
      )

      expect(error).toBeInstanceOf(Error)
      expect(error.code).toBe(ErrorCodes.TITLE_EMPTY)
      expect(error.message).toBe('Title is empty')
      expect(error.details).toBe('Additional details')
      expect(error.context).toEqual({ userId: '123' })
      expect(error.recoverable).toBe(true)
    })

    it('should create an operation error with minimal properties', () => {
      const error = createOperationError(ErrorCodes.UNKNOWN_ERROR, 'Unknown error')

      expect(error.code).toBe(ErrorCodes.UNKNOWN_ERROR)
      expect(error.message).toBe('Unknown error')
      expect(error.details).toBeUndefined()
      expect(error.context).toBeUndefined()
      expect(error.recoverable).toBe(false)
    })
  })

  describe('extractErrorDetails', () => {
    it('should extract details from OperationError', () => {
      const error = createOperationError(
        ErrorCodes.EXPORT_FAILED,
        'Export failed',
        'Network timeout',
        { workflowId: 'wf-123' }
      )

      const details = extractErrorDetails(error)

      expect(details.code).toBe(ErrorCodes.EXPORT_FAILED)
      expect(details.message).toBe('Export failed')
      expect(details.details).toBe('Network timeout')
      expect(details.context).toEqual({ workflowId: 'wf-123' })
      expect(details.timestamp).toBeGreaterThan(0)
    })

    it('should extract details from regular Error', () => {
      const error = new Error('Regular error')
      const details = extractErrorDetails(error)

      expect(details.code).toBe(ErrorCodes.UNKNOWN_ERROR)
      expect(details.message).toBe('Regular error')
      expect(details.details).toBe(error.stack)
      expect(details.timestamp).toBeGreaterThan(0)
    })

    it('should handle network errors', () => {
      const error = new Error('Network request failed')
      const details = extractErrorDetails(error)

      expect(details.code).toBe(ErrorCodes.NETWORK_ERROR)
    })

    it('should handle timeout errors', () => {
      const error = new Error('Request timeout')
      const details = extractErrorDetails(error)

      expect(details.code).toBe(ErrorCodes.TIMEOUT_ERROR)
    })

    it('should handle string errors', () => {
      const details = extractErrorDetails('String error')

      expect(details.code).toBe(ErrorCodes.UNKNOWN_ERROR)
      expect(details.message).toBe('String error')
    })

    it('should handle unknown error types', () => {
      const details = extractErrorDetails({ unknown: 'object' })

      expect(details.code).toBe(ErrorCodes.UNKNOWN_ERROR)
      expect(details.message).toBe('An unknown error occurred')
    })
  })

  describe('getUserFriendlyErrorMessage', () => {
    it('should return user-friendly messages for known error codes', () => {
      const testCases = [
        { code: ErrorCodes.TITLE_EMPTY, expected: 'Workflow title cannot be empty' },
        { code: ErrorCodes.FILE_TOO_LARGE, expected: 'File is too large (maximum 50MB)' },
        { code: ErrorCodes.NETWORK_ERROR, expected: 'Network error. Please check your connection and try again' },
        { code: ErrorCodes.EXECUTION_FAILED, expected: 'Workflow execution failed' }
      ]

      testCases.forEach(({ code, expected }) => {
        const error = createOperationError(code, 'Technical message')
        const message = getUserFriendlyErrorMessage(error)
        expect(message).toBe(expected)
      })
    })

    it('should return original message for unknown error codes', () => {
      const error = new Error('Custom error message')
      const message = getUserFriendlyErrorMessage(error)
      expect(message).toBe('Custom error message')
    })
  })

  describe('isRecoverableError', () => {
    it('should identify recoverable errors', () => {
      const recoverableError = createOperationError(
        ErrorCodes.NETWORK_ERROR,
        'Network error',
        undefined,
        undefined,
        true
      )
      expect(isRecoverableError(recoverableError)).toBe(true)
    })

    it('should identify non-recoverable errors', () => {
      const nonRecoverableError = createOperationError(
        ErrorCodes.TITLE_INVALID_CHARS,
        'Invalid characters',
        undefined,
        undefined,
        false
      )
      expect(isRecoverableError(nonRecoverableError)).toBe(false)
    })

    it('should identify network errors as recoverable', () => {
      const networkError = new Error('Network request failed')
      expect(isRecoverableError(networkError)).toBe(true)
    })
  })

  describe('getRecoverySuggestions', () => {
    it('should provide suggestions for title errors', () => {
      const error = createOperationError(ErrorCodes.TITLE_EMPTY, 'Title empty')
      const suggestions = getRecoverySuggestions(error)
      expect(suggestions).toContain('Enter a title for your workflow')
    })

    it('should provide suggestions for file errors', () => {
      const error = createOperationError(ErrorCodes.FILE_TOO_LARGE, 'File too large')
      const suggestions = getRecoverySuggestions(error)
      expect(suggestions).toContain('Select a smaller file (under 50MB)')
    })

    it('should provide generic suggestions for unknown errors', () => {
      const error = new Error('Unknown error')
      const suggestions = getRecoverySuggestions(error)
      expect(suggestions).toContain('Try again')
    })
  })

  describe('validateTitle', () => {
    it('should validate empty title', () => {
      const errors = validateTitle('')
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe(ErrorCodes.TITLE_EMPTY)
    })

    it('should validate whitespace-only title', () => {
      const errors = validateTitle('   ')
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe(ErrorCodes.TITLE_EMPTY)
    })

    it('should validate title length', () => {
      const longTitle = 'a'.repeat(101)
      const errors = validateTitle(longTitle)
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe(ErrorCodes.TITLE_TOO_LONG)
    })

    it('should validate invalid characters', () => {
      const errors = validateTitle('Title<>:"/\\|?*')
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe(ErrorCodes.TITLE_INVALID_CHARS)
    })

    it('should pass valid title', () => {
      const errors = validateTitle('Valid Workflow Title')
      expect(errors).toHaveLength(0)
    })
  })

  describe('validateImportFile', () => {
    it('should validate file size', () => {
      const largeFile = new File([''], 'test.json', { type: 'application/json' })
      Object.defineProperty(largeFile, 'size', { value: 60 * 1024 * 1024 }) // 60MB

      const errors = validateImportFile(largeFile)
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe(ErrorCodes.FILE_TOO_LARGE)
    })

    it('should validate file extension', () => {
      const invalidFile = new File([''], 'test.txt', { type: 'text/plain' })
      const errors = validateImportFile(invalidFile)
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe(ErrorCodes.FILE_INVALID_EXTENSION)
    })

    it('should pass valid JSON file', () => {
      const validFile = new File(['{}'], 'workflow.json', { type: 'application/json' })
      const errors = validateImportFile(validFile)
      expect(errors).toHaveLength(0)
    })

    it('should pass valid workflow file', () => {
      const validFile = new File(['{}'], 'workflow.workflow', { type: 'application/json' })
      const errors = validateImportFile(validFile)
      expect(errors).toHaveLength(0)
    })
  })

  describe('createAsyncErrorHandler', () => {
    it('should handle successful operations', async () => {
      const operation = vi.fn().mockResolvedValue('success')
      const handler = createAsyncErrorHandler(operation, { context: 'test' })

      const result = await handler('arg1', 'arg2')
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledWith('arg1', 'arg2')
    })

    it('should handle and re-throw errors', async () => {
      const error = new Error('Operation failed')
      const operation = vi.fn().mockRejectedValue(error)
      const handler = createAsyncErrorHandler(operation, { context: 'test' })

      await expect(handler('arg1')).rejects.toThrow('Operation failed')
    })
  })

  describe('retryOperation', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success')
      const result = await retryOperation(operation, 3, 100)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry recoverable errors', async () => {
      const networkError = createOperationError(ErrorCodes.NETWORK_ERROR, 'Network error', undefined, undefined, true)
      const operation = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success')

      const result = await retryOperation(operation, 3, 10)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should not retry non-recoverable errors', async () => {
      const validationError = createOperationError(ErrorCodes.TITLE_EMPTY, 'Title empty', undefined, undefined, false)
      const operation = vi.fn().mockRejectedValue(validationError)

      await expect(retryOperation(operation, 3, 10)).rejects.toThrow('Title empty')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should fail after max retries', async () => {
      const networkError = createOperationError(ErrorCodes.NETWORK_ERROR, 'Network error', undefined, undefined, true)
      const operation = vi.fn().mockRejectedValue(networkError)

      await expect(retryOperation(operation, 2, 10)).rejects.toThrow('Network error')
      expect(operation).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })
  })
})
