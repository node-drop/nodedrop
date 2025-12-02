import { AlertCircle, CheckCircle, Clock, Loader, Pause, Square } from 'lucide-react';
import React from 'react';
import { useExecutionMonitor } from '../../hooks/useExecutionMonitoring';

interface ExecutionStatusIndicatorProps {
  executionId: string;
  showProgress?: boolean;
  showNodeCount?: boolean;
  className?: string;
}

export const ExecutionStatusIndicator: React.FC<ExecutionStatusIndicatorProps> = ({
  executionId,
  showProgress = false,
  showNodeCount = false,
  className = ''
}) => {
  const { executionProgress, executionEvents } = useExecutionMonitor(executionId);

  const getStatusInfo = () => {
    if (!executionProgress) {
      // Fallback to events if no progress data
      const latestEvent = executionEvents[executionEvents.length - 1];
      if (latestEvent) {
        switch (latestEvent.type) {
          case 'started':
            return {
              status: 'running',
              icon: <Loader className="w-4 h-4 animate-spin" />,
              color: 'text-blue-500',
              bgColor: 'bg-blue-50',
              label: 'Running'
            };
          case 'completed':
            return {
              status: 'success',
              icon: <CheckCircle className="w-4 h-4" />,
              color: 'text-green-500',
              bgColor: 'bg-green-50',
              label: 'Completed'
            };
          case 'failed':
            return {
              status: 'error',
              icon: <AlertCircle className="w-4 h-4" />,
              color: 'text-red-500',
              bgColor: 'bg-red-50',
              label: 'Failed'
            };
          case 'cancelled':
            return {
              status: 'cancelled',
              icon: <Square className="w-4 h-4" />,
              color: 'text-gray-500',
              bgColor: 'bg-gray-50',
              label: 'Cancelled'
            };
        }
      }
      
      return {
        status: 'unknown',
        icon: <Clock className="w-4 h-4" />,
        color: 'text-gray-400',
        bgColor: 'bg-gray-50',
        label: 'Unknown'
      };
    }

    switch (executionProgress.status as any) {
      case 'running':
        return {
          status: 'running',
          icon: <Loader className="w-4 h-4 animate-spin" />,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50',
          label: 'Running'
        };
      case 'paused':
        return {
          status: 'paused',
          icon: <Pause className="w-4 h-4" />,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          label: 'Paused'
        };
      case 'success':
        return {
          status: 'success',
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          label: 'Completed'
        };
      case 'error':
        return {
          status: 'error',
          icon: <AlertCircle className="w-4 h-4" />,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          label: 'Failed'
        };
      case 'cancelled':
        return {
          status: 'cancelled',
          icon: <Square className="w-4 h-4" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          label: 'Cancelled'
        };
      default:
        return {
          status: 'unknown',
          icon: <Clock className="w-4 h-4" />,
          color: 'text-gray-400',
          bgColor: 'bg-gray-50',
          label: 'Unknown'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const progressPercentage = executionProgress 
    ? (executionProgress.completedNodes / executionProgress.totalNodes) * 100 
    : 0;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Status Icon and Label */}
      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${statusInfo.bgColor}`}>
        <span className={statusInfo.color}>
          {statusInfo.icon}
        </span>
        <span className={`text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Progress Bar */}
      {showProgress && executionProgress && (
        <div className="flex items-center space-x-2">
          <div className="w-20 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                statusInfo.status === 'error' ? 'bg-red-500' :
                statusInfo.status === 'success' ? 'bg-green-500' :
                'bg-blue-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">
            {Math.round(progressPercentage)}%
          </span>
        </div>
      )}

      {/* Node Count */}
      {showNodeCount && executionProgress && (
        <div className="text-xs text-gray-500">
          {executionProgress.completedNodes}/{executionProgress.totalNodes} nodes
          {executionProgress.failedNodes > 0 && (
            <span className="text-red-500 ml-1">
              ({executionProgress.failedNodes} failed)
            </span>
          )}
        </div>
      )}

      {/* Current Node */}
      {executionProgress?.currentNode && statusInfo.status === 'running' && (
        <div className="text-xs text-gray-500">
          Current: <code className="bg-gray-100 px-1 rounded">{executionProgress.currentNode}</code>
        </div>
      )}
    </div>
  );
};
