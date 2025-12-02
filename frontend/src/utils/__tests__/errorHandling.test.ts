import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createNodeExecutionError, logExecutionError } from '../errorHandling'
import type { NodeExecutionError } from '@/components/workflow/types'

describe('Error Handling Utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Mock console.error
        vi.spyOn(console, 'error').mockImplementation(() => { })
    })

    describe('createNodeExecutionError', () => {
        const nodeId = 'test-node'
        const nodeType = 'HTTP Request'

        describe('HTTP Execution Errors', () => {
            it('should handle timeout errors', () => {
                const error = {
                    httpErrorType: 'TIMEOUT',
                    message: 'Request timeout for GET https://api.example.com',
                    isRetryable: true
                }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('timeout')
                expect(result.userFriendlyMessage).toBe('The request timed out. The server may be slow or unavailable.')
                expect(result.isRetryable).toBe(true)
                expect(result.message).toBe(error.message)
            })

            it('should handle DNS resolution errors', () => {
                const error = {
                    httpErrorType: 'DNS_RESOLUTION',
                    message: 'DNS resolution failed for invalid-domain.com',
                    isRetryable: false
                }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('network')
                expect(result.userFriendlyMessage).toBe('Could not resolve the domain name. Please check the URL.')
                expect(result.isRetryable).toBe(false)
            })

            it('should handle connection refused errors', () => {
                const error = {
                    httpErrorType: 'CONNECTION_REFUSED',
                    message: 'Connection refused to https://api.example.com',
                    isRetryable: true
                }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('network')
                expect(result.userFriendlyMessage).toBe('Connection was refused by the server. The service may be down.')
                expect(result.isRetryable).toBe(true)
            })

            it('should handle SSL errors', () => {
                const error = {
                    httpErrorType: 'SSL_ERROR',
                    message: 'SSL/TLS error connecting to https://api.example.com: certificate expired',
                    isRetryable: false
                }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('security')
                expect(result.userFriendlyMessage).toBe('SSL/TLS certificate error. The connection is not secure.')
                expect(result.isRetryable).toBe(false)
            })

            it('should handle HTTP status errors', () => {
                const error = {
                    httpErrorType: 'HTTP_ERROR',
                    statusCode: 404,
                    message: 'HTTP 404 Not Found for GET https://api.example.com/users',
                    isRetryable: false
                }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('server')
                expect(result.userFriendlyMessage).toBe('Resource not found. Please check the URL.')
                expect(result.isRetryable).toBe(false)
            })

            it('should handle 401 authentication errors', () => {
                const error = {
                    httpErrorType: 'HTTP_ERROR',
                    statusCode: 401,
                    message: 'HTTP 401 Unauthorized',
                    isRetryable: false
                }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('server')
                expect(result.userFriendlyMessage).toBe('Authentication required. Please check your credentials.')
                expect(result.isRetryable).toBe(false)
            })

            it('should handle 429 rate limiting with retry-after', () => {
                const error = {
                    httpErrorType: 'HTTP_ERROR',
                    statusCode: 429,
                    message: 'HTTP 429 Too Many Requests',
                    isRetryable: true,
                    retryAfter: 60000 // 60 seconds
                }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('server')
                expect(result.userFriendlyMessage).toBe('Too many requests. Please wait before trying again.')
                expect(result.isRetryable).toBe(true)
                expect(result.retryAfter).toBe(60000)
            })

            it('should handle 500 server errors', () => {
                const error = {
                    httpErrorType: 'HTTP_ERROR',
                    statusCode: 500,
                    message: 'HTTP 500 Internal Server Error',
                    isRetryable: true
                }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('server')
                expect(result.userFriendlyMessage).toBe('Server error occurred. Please try again later.')
                expect(result.isRetryable).toBe(true)
            })

            it('should handle parse errors', () => {
                const error = {
                    httpErrorType: 'PARSE_ERROR',
                    message: 'Response parsing error for https://api.example.com: invalid JSON',
                    isRetryable: false
                }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('validation')
                expect(result.userFriendlyMessage).toBe('Could not parse the server response. The response format may be invalid.')
                expect(result.isRetryable).toBe(false)
            })

            it('should handle security errors', () => {
                const error = {
                    httpErrorType: 'SECURITY_ERROR',
                    message: 'Security validation failed: blocked by security policy',
                    isRetryable: false
                }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('security')
                expect(result.userFriendlyMessage).toBe('Security validation failed. The request was blocked for security reasons.')
                expect(result.isRetryable).toBe(false)
            })

            it('should handle resource limit errors', () => {
                const error = {
                    httpErrorType: 'RESOURCE_LIMIT_ERROR',
                    message: 'Resource limit exceeded: request too large',
                    isRetryable: false
                }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('validation')
                expect(result.userFriendlyMessage).toBe('Resource limit exceeded. The request is too large or uses too many resources.')
                expect(result.isRetryable).toBe(false)
            })

            it('should handle unknown HTTP errors', () => {
                const error = {
                    httpErrorType: 'UNKNOWN_ERROR',
                    message: 'Unknown error occurred',
                    isRetryable: false
                }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('unknown')
                expect(result.userFriendlyMessage).toBe('An unexpected error occurred while making the request.')
                expect(result.isRetryable).toBe(false)
            })
        })

        describe('Structured Errors', () => {
            it('should handle validation errors', () => {
                const error = {
                    type: 'validation',
                    message: 'Required field missing: url'
                }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('validation')
                expect(result.userFriendlyMessage).toBe('Invalid input parameters. Please check your node configuration.')
                expect(result.isRetryable).toBe(false)
            })

            it('should handle timeout errors', () => {
                const error = {
                    type: 'timeout',
                    message: 'Operation timed out after 30 seconds'
                }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('timeout')
                expect(result.userFriendlyMessage).toBe('The operation timed out. Please try again.')
                expect(result.isRetryable).toBe(true)
            })

            it('should handle network errors', () => {
                const error = {
                    type: 'network',
                    message: 'Network connection failed'
                }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('network')
                expect(result.userFriendlyMessage).toBe('Network error occurred. Please check your connection.')
                expect(result.isRetryable).toBe(true)
            })

            it('should handle security errors', () => {
                const error = {
                    type: 'security',
                    message: 'Access denied by security policy'
                }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('security')
                expect(result.userFriendlyMessage).toBe('Security validation failed. The request was blocked.')
                expect(result.isRetryable).toBe(false)
            })

            it('should handle server errors', () => {
                const error = {
                    type: 'server',
                    message: 'Internal server error'
                }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('server')
                expect(result.userFriendlyMessage).toBe('Server error occurred. Please try again later.')
                expect(result.isRetryable).toBe(true)
            })
        })

        describe('Generic Errors', () => {
            it('should handle timeout messages', () => {
                const error = { message: 'Request timed out after 30 seconds' }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('timeout')
                expect(result.userFriendlyMessage).toBe('The operation timed out. Please try again.')
                expect(result.isRetryable).toBe(true)
            })

            it('should handle network messages', () => {
                const error = { message: 'Network connection failed' }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('network')
                expect(result.userFriendlyMessage).toBe('Network error occurred. Please check your connection.')
                expect(result.isRetryable).toBe(true)
            })

            it('should handle validation messages', () => {
                const error = { message: 'Invalid parameter: url is required' }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('validation')
                expect(result.userFriendlyMessage).toBe('Invalid input parameters. Please check your configuration.')
                expect(result.isRetryable).toBe(false)
            })

            it('should handle unauthorized messages', () => {
                const error = { message: 'Unauthorized access to resource' }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('security')
                expect(result.userFriendlyMessage).toBe('Authentication required. Please check your credentials.')
                expect(result.isRetryable).toBe(false)
            })

            it('should handle forbidden messages', () => {
                const error = { message: 'Access forbidden to resource' }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('security')
                expect(result.userFriendlyMessage).toBe('Access forbidden. You do not have permission.')
                expect(result.isRetryable).toBe(false)
            })

            it('should handle not found messages', () => {
                const error = { message: 'Resource not found' }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.userFriendlyMessage).toBe('Resource not found. Please check the URL or configuration.')
                expect(result.isRetryable).toBe(false)
            })

            it('should handle server error messages', () => {
                const error = { message: 'Internal server error occurred' }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('server')
                expect(result.userFriendlyMessage).toBe('Server error occurred. Please try again later.')
                expect(result.isRetryable).toBe(true)
            })

            it('should handle security messages', () => {
                const error = { message: 'Security policy violation detected' }

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('security')
                expect(result.userFriendlyMessage).toBe('Security validation failed. The request was blocked.')
                expect(result.isRetryable).toBe(false)
            })
        })

        describe('String Errors', () => {
            it('should handle string timeout errors', () => {
                const error = 'Request timed out'

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('timeout')
                expect(result.userFriendlyMessage).toBe('The operation timed out. Please try again.')
                expect(result.isRetryable).toBe(true)
                expect(result.message).toBe(error)
            })

            it('should handle string network errors', () => {
                const error = 'Connection failed'

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('network')
                expect(result.userFriendlyMessage).toBe('Network error occurred. Please check your connection.')
                expect(result.isRetryable).toBe(true)
            })

            it('should handle unknown string errors', () => {
                const error = 'Something went wrong'

                const result = createNodeExecutionError(error, nodeId, nodeType)

                expect(result.type).toBe('unknown')
                expect(result.userFriendlyMessage).toBe('Something went wrong.')
                expect(result.isRetryable).toBe(false)
            })
        })

        describe('Edge Cases', () => {
            it('should handle null/undefined errors', () => {
                const result = createNodeExecutionError(null, nodeId, nodeType)

                expect(result.type).toBe('unknown')
                expect(result.userFriendlyMessage).toBe('An unexpected error occurred while executing the node.')
                expect(result.isRetryable).toBe(false)
            })

            it('should handle empty object errors', () => {
                const result = createNodeExecutionError({}, nodeId, nodeType)

                expect(result.type).toBe('unknown')
                expect(result.userFriendlyMessage).toBe('An unexpected error occurred while executing the node.')
                expect(result.isRetryable).toBe(false)
            })

            it('should include timestamp', () => {
                const beforeTime = Date.now()
                const result = createNodeExecutionError('test error', nodeId, nodeType)
                const afterTime = Date.now()

                expect(result.timestamp).toBeGreaterThanOrEqual(beforeTime)
                expect(result.timestamp).toBeLessThanOrEqual(afterTime)
            })

            it('should include original error details', () => {
                const originalError = {
                    message: 'test error',
                    stack: 'Error stack trace',
                    code: 'TEST_ERROR'
                }

                const result = createNodeExecutionError(originalError, nodeId, nodeType)

                expect(result.details).toBe(originalError)
            })
        })
    })

    describe('logExecutionError', () => {
        it('should log error to console', () => {
            const nodeId = 'test-node'
            const nodeType = 'HTTP Request'
            const error: NodeExecutionError = {
                type: 'timeout',
                message: 'Request timed out',
                userFriendlyMessage: 'The request timed out. Please try again.',
                isRetryable: true,
                timestamp: Date.now()
            }
            const originalError = new Error('Original error')

            logExecutionError(nodeId, nodeType, error, originalError)

            expect(console.error).toHaveBeenCalledWith(
                `Node execution error [${nodeId}]:`,
                expect.objectContaining({
                    nodeId,
                    nodeType,
                    errorType: error.type,
                    message: error.message,
                    userFriendlyMessage: error.userFriendlyMessage,
                    isRetryable: error.isRetryable,
                    timestamp: error.timestamp,
                    originalError
                })
            )
        })

        it('should call external logging service if available', () => {
            const mockLogService = {
                error: vi.fn()
            }

            // Mock window.logService
            Object.defineProperty(window, 'logService', {
                value: mockLogService,
                writable: true
            })

            const nodeId = 'test-node'
            const nodeType = 'HTTP Request'
            const error: NodeExecutionError = {
                type: 'network',
                message: 'Network error',
                userFriendlyMessage: 'Network error occurred.',
                isRetryable: true,
                timestamp: Date.now()
            }

            logExecutionError(nodeId, nodeType, error)

            expect(mockLogService.error).toHaveBeenCalledWith(
                'node_execution_error',
                expect.objectContaining({
                    nodeId,
                    nodeType,
                    errorType: error.type
                })
            )

            // Clean up
            Object.defineProperty(window, 'logService', {
                value: undefined,
                writable: true
            })
        })

        it('should handle missing external logging service gracefully', () => {
            const nodeId = 'test-node'
            const nodeType = 'HTTP Request'
            const error: NodeExecutionError = {
                type: 'validation',
                message: 'Validation error',
                userFriendlyMessage: 'Invalid parameters.',
                isRetryable: false,
                timestamp: Date.now()
            }

            // Should not throw even if logService is not available
            expect(() => {
                logExecutionError(nodeId, nodeType, error)
            }).not.toThrow()

            expect(console.error).toHaveBeenCalled()
        })
    })
})
