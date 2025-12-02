import { AlertCircle, CheckCircle, Download, Package, RefreshCw, Trash2, Upload } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { NodeType, nodeTypeService } from '../../services/nodeType';
import { useCustomNodeStore } from '../../stores/customNode';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

export const CustomNodeList: React.FC = () => {
  const { packages, unloadPackage, reloadPackage } = useCustomNodeStore();
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNodeTypes();
  }, []);

  const loadNodeTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const types = await nodeTypeService.getAllNodeTypes();
      setNodeTypes(types || []); // Ensure types is never undefined
    } catch (err) {
      console.error('CustomNodeList: Error loading node types:', err);
      setError('Failed to load node types');
      setNodeTypes([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleUnload = async (packageName: string) => {
    setLoadingActions(prev => ({ ...prev, [packageName]: true }));
    try {
      await unloadPackage(packageName);
    } catch (error) {
      console.error('Failed to unload package:', error);
    } finally {
      setLoadingActions(prev => ({ ...prev, [packageName]: false }));
    }
  };

  const handleReload = async (packageName: string) => {
    setLoadingActions(prev => ({ ...prev, [`${packageName}-reload`]: true }));
    try {
      await reloadPackage(packageName);
    } catch (error) {
      console.error('Failed to reload package:', error);
    } finally {
      setLoadingActions(prev => ({ ...prev, [`${packageName}-reload`]: false }));
    }
  };

  const handleDeleteNodeType = async (type: string) => {
    if (!confirm(`Are you sure you want to delete the node type "${type}"?`)) {
      return;
    }

    setLoadingActions(prev => ({ ...prev, [`delete-${type}`]: true }));
    try {
      await nodeTypeService.deleteNodeType(type);
      await loadNodeTypes(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete node type:', error);
    } finally {
      setLoadingActions(prev => ({ ...prev, [`delete-${type}`]: false }));
    }
  };

  const handleToggleStatus = async (type: string, currentStatus: boolean) => {
    setLoadingActions(prev => ({ ...prev, [`toggle-${type}`]: true }));
    try {
      await nodeTypeService.updateNodeTypeStatus(type, !currentStatus);
      await loadNodeTypes(); // Refresh the list
    } catch (error) {
      console.error('Failed to update node type status:', error);
    } finally {
      setLoadingActions(prev => ({ ...prev, [`toggle-${type}`]: false }));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Loading node types...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-red-600">
          <AlertCircle className="mr-2 h-4 w-4" />
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-4"
            onClick={loadNodeTypes}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Installed Nodes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nodeTypes?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {nodeTypes?.filter(n => n.active).length || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loaded Packages</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{packages.length}</div>
            <p className="text-xs text-muted-foreground">
              Runtime packages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Node Groups</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {nodeTypes ? new Set(nodeTypes.flatMap(n => n.group)).size : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Node Types Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom Node Types</CardTitle>
              <CardDescription>
                All custom nodes registered in the database
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadNodeTypes}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!nodeTypes || nodeTypes.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No custom nodes found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Upload a zip file containing custom nodes to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodeTypes?.map((node) => (
                  <TableRow key={node.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {node.icon ? (
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                            <span className="text-sm">{node.icon}</span>
                          </div>
                        ) : (
                          <div 
                            className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-medium"
                            style={{ backgroundColor: node.color || '#3b82f6' }}
                          >
                            {node.displayName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{node.displayName}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {node.description}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {node.type}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {node.group.map((g, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {g}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">v{node.version}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {node.active ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={`text-sm ${node.active ? 'text-green-600' : 'text-gray-500'}`}>
                          {node.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(node.type, node.active)}
                          disabled={loadingActions[`toggle-${node.type}`]}
                        >
                          {loadingActions[`toggle-${node.type}`] ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : node.active ? (
                            'Deactivate'
                          ) : (
                            'Activate'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteNodeType(node.type)}
                          disabled={loadingActions[`delete-${node.type}`]}
                          className="text-red-600 hover:text-red-700"
                        >
                          {loadingActions[`delete-${node.type}`] ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Runtime Packages */}
      {packages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Runtime Packages</CardTitle>
            <CardDescription>
              Dynamically loaded node packages (for development)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {packages.map((pkg) => (
                <div key={pkg.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{pkg.name}</h3>
                      <Badge>v{pkg.version}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>{pkg.nodes.length} nodes</span>
                      {pkg.credentials && <span>{pkg.credentials.length} credentials</span>}
                      {pkg.author && <span>by {pkg.author}</span>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReload(pkg.name)}
                      disabled={loadingActions[`${pkg.name}-reload`]}
                    >
                      {loadingActions[`${pkg.name}-reload`] ? (
                        <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <RefreshCw className="h-3 w-3 mr-1" />
                      )}
                      Reload
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnload(pkg.name)}
                      disabled={loadingActions[pkg.name]}
                      className="text-red-600 hover:text-red-700"
                    >
                      {loadingActions[pkg.name] ? (
                        <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Trash2 className="h-3 w-3 mr-1" />
                      )}
                      Unload
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
