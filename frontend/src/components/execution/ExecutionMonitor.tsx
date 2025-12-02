import React, { useState } from 'react';
import { Play, Square, AlertCircle, CheckCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { useExecutionMonitor } from '../../hooks/useExecutionMonitoring';
// Types are imported through the hook

interface ExecutionMonitorProps {
  executionId: string | null;
  className?: string;
}

export const ExecutionMonitor: React.FC<ExecutionMonitorProps> = ({ 
  executionId, 
  className = '' 
}) => {
  const [showLogs, setShowLogs] = useState(false);
  const [showNodeEvents, setShowNodeEvents] = useState(false);
  
  const {
    isConnected,
    isMonitoring,
    executionEvents,
    executionProgress,
    executionLogs,
    nodeEvents,
    reconnect
  } = useExecutionMonitor(executionId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <Square className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'started':
        return 'text-blue-600 bg-blue-50';
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50';
      case 'node-started':
        return 'text-purple-600 bg-purple-50';
      case 'node-completed':
        return 'text-emerald-600 bg-emerald-50';
      case 'node-failed':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  if (!executionId) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Select an execution to monitor</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold">Execution Monitor</h3>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          
          {!isConnected && (
            <button
              onClick={reconnect}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reconnect
            </button>
          )}
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          Execution ID: <code className="bg-gray-100 px-1 rounded">{executionId}</code>
          {isMonitoring && (
            <span className="ml-2 text-green-600">• Monitoring</span>
          )}
        </div>
      </div>

      {/* Progress Section */}
      {executionProgress && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium flex items-center space-x-2">
              {getStatusIcon(executionProgress.status)}
              <span>Progress</span>
            </h4>
            <span className="text-sm text-gray-500">
              {executionProgress.completedNodes} / {executionProgress.totalNodes} nodes
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                executionProgress.status === 'error' ? 'bg-red-500' :
                executionProgress.status === 'success' ? 'bg-green-500' :
                'bg-blue-500'
              }`}
              style={{
                width: `${(executionProgress.completedNodes / executionProgress.totalNodes) * 100}%`
              }}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Status:</span>
              <span className={`ml-2 font-medium ${
                executionProgress.status === 'running' ? 'text-blue-600' :
                executionProgress.status === 'success' ? 'text-green-600' :
                executionProgress.status === 'error' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {executionProgress.status}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Current Node:</span>
              <span className="ml-2 font-mono text-xs">
                {executionProgress.currentNode || 'None'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Started:</span>
              <span className="ml-2">{formatTimestamp(executionProgress.startedAt)}</span>
            </div>
            <div>
              <span className="text-gray-500">Failed Nodes:</span>
              <span className={`ml-2 ${executionProgress.failedNodes > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {executionProgress.failedNodes}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8 px-4">
          <button
            onClick={() => { setShowLogs(false); setShowNodeEvents(false); }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              !showLogs && !showNodeEvents
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Events ({executionEvents.length})
          </button>
          <button
            onClick={() => { setShowLogs(true); setShowNodeEvents(false); }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              showLogs
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Logs ({executionLogs.length})
          </button>
          <button
            onClick={() => { setShowLogs(false); setShowNodeEvents(true); }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              showNodeEvents
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Node Events ({nodeEvents.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {!showLogs && !showNodeEvents && (
          <div className="space-y-2">
            {executionEvents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No execution events yet</p>
            ) : (
              executionEvents.slice().reverse().map((event, index) => (
                <div key={index} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(event.type)}`}>
                    {event.type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {event.nodeId ? `Node: ${event.nodeId}` : 'Execution'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    {event.error && (
                      <p className="text-sm text-red-600 mt-1">{event.error.message}</p>
                    )}
                    {event.data && (
                      <pre className="text-xs text-gray-600 mt-1 bg-gray-100 p-1 rounded overflow-x-auto">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {showLogs && (
          <div className="space-y-1">
            {executionLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No logs yet</p>
            ) : (
              executionLogs.slice().reverse().map((log, index) => (
                <div key={index} className="flex items-start space-x-2 p-2 rounded hover:bg-gray-50">
                  <div className={`px-1 py-0.5 rounded text-xs font-medium ${
                    log.level === 'error' ? 'text-red-600 bg-red-50' :
                    log.level === 'warn' ? 'text-yellow-600 bg-yellow-50' :
                    log.level === 'info' ? 'text-blue-600 bg-blue-50' :
                    'text-gray-600 bg-gray-50'
                  }`}>
                    {log.level.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{log.message}</span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    {log.nodeId && (
                      <p className="text-xs text-gray-500">Node: {log.nodeId}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {showNodeEvents && (
          <div className="space-y-2">
            {nodeEvents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No node events yet</p>
            ) : (
              nodeEvents.slice().reverse().map((event, index) => (
                <div key={index} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(event.type)}`}>
                    {event.type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium font-mono">{event.nodeId}</span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    {event.data && (
                      <pre className="text-xs text-gray-600 mt-1 bg-gray-100 p-1 rounded overflow-x-auto">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
