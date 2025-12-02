import { Component, ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryState {
    hasError: boolean
    error?: Error
    errorInfo?: ErrorInfo
}

interface WorkflowErrorBoundaryProps {
    children: ReactNode
}

export class WorkflowErrorBoundary extends Component<
    WorkflowErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: WorkflowErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('WorkflowEditor Error Boundary caught an error:', error, errorInfo)
        this.setState({ error, errorInfo })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center h-full bg-red-50">
                    <div className="text-center p-8">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">
                            Workflow Editor Error
                        </h2>
                        <p className="text-gray-700 mb-4">
                            Something went wrong with the workflow editor.
                        </p>
                        <details className="text-left bg-white p-4 rounded border">
                            <summary className="cursor-pointer font-semibold">
                                Error Details
                            </summary>
                            <pre className="mt-2 text-sm text-red-600 whitespace-pre-wrap">
                                {this.state.error?.message}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: undefined, errorInfo: undefined })
                                window.location.reload()
                            }}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Reload Editor
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
