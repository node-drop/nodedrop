import { NewWorkflowModal } from '@/components/workflow'
import { workflowService } from '@/services'
import { CreateWorkflowRequest } from '@/services/workflow'
import { useAuthStore } from '@/stores'
import { Filter, Info, Plus, Search } from 'lucide-react'
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export const WorkflowsPage: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [showNewWorkflowModal, setShowNewWorkflowModal] = useState(false)

  const handleCreateWorkflow = async (data: CreateWorkflowRequest) => {
    try {
      const workflow = await workflowService.createWorkflow(data)
      navigate(`/workflows/${workflow.id}`)
    } catch (error) {
      console.error('Failed to create workflow:', error)
      // You could show a toast notification here
    }
  }
  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 min-h-full">
      {/* Guest Welcome Banner */}
      {user?.id === 'guest' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900">Welcome, Guest!</h3>
              <p className="text-sm text-blue-700 mt-1">
                You're currently using guest mode. Your workflows won't be saved permanently.{' '}
                <Link to="/login" className="font-medium underline hover:no-underline">
                  Sign in or create an account
                </Link>{' '}
                to save your work.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-600">Manage and create your automation workflows</p>
        </div>
        <button 
          onClick={() => setShowNewWorkflowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Workflow</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search workflows..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </button>
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder workflow cards */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Sample Workflow {i}</h3>
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                Active
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              A sample workflow for demonstration purposes
            </p>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Last run: 2 hours ago</span>
              <span>5 nodes</span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Plus className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows yet</h3>
        <p className="text-gray-600 mb-4">Get started by creating your first workflow</p>
        <button 
          onClick={() => setShowNewWorkflowModal(true)}
          className="btn-primary"
        >
          Create Workflow
        </button>
      </div>

      {/* New Workflow Modal */}
      <NewWorkflowModal
        isOpen={showNewWorkflowModal}
        onClose={() => setShowNewWorkflowModal(false)}
        onCreateWorkflow={handleCreateWorkflow}
      />
    </div>
  )
}
