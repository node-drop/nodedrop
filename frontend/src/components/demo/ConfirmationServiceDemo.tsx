/**
 * Demo component showing how to use the ConfirmationService
 * This demonstrates various types of confirmations available
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { confirmationService } from '@/services/confirmationService';
import { useState } from 'react';

export function ConfirmationServiceDemo() {
  const [lastResult, setLastResult] = useState<string>('');

  const handleExecuteWithPinnedData = async () => {
    const result = await confirmationService.confirmExecuteWithPinnedData('HTTP Request Node');
    setLastResult(`Execute with pinned data: ${result ? 'Confirmed' : 'Cancelled'}`);
  };

  const handleDelete = async () => {
    const result = await confirmationService.confirmDelete('My Important Workflow', 'workflow');
    setLastResult(`Delete workflow: ${result ? 'Confirmed' : 'Cancelled'}`);
  };

  const handleDataLoss = async () => {
    const result = await confirmationService.confirmDataLoss('Resetting all node configurations will lose your current settings.');
    setLastResult(`Data loss action: ${result ? 'Confirmed' : 'Cancelled'}`);
  };

  const handleCustomConfirm = async () => {
    const result = await confirmationService.confirm({
      title: 'Custom Confirmation',
      message: 'This is a custom confirmation dialog with multiple details.',
      confirmText: 'Yes, I understand',
      cancelText: 'No, go back',
      severity: 'info',
      details: [
        'This action will modify your workflow',
        'All connected nodes will be affected',
        'You can undo this action later',
        'Make sure you have saved your work'
      ]
    });
    setLastResult(`Custom confirm: ${result ? 'Confirmed' : 'Cancelled'}`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Confirmation Service Demo</CardTitle>
          <CardDescription>
            Test different types of confirmation dialogs provided by the ConfirmationService
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Execute with Pinned Data</CardTitle>
                <CardDescription className="text-sm">
                  Shows when executing a node that has pinned mock data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExecuteWithPinnedData} variant="outline" className="w-full">
                  Execute Node with Mock Data
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Delete Confirmation</CardTitle>
                <CardDescription className="text-sm">
                  Shows for destructive delete operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleDelete} variant="outline" className="w-full">
                  Delete Workflow
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Data Loss Warning</CardTitle>
                <CardDescription className="text-sm">
                  Shows for actions that might cause data loss
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleDataLoss} variant="outline" className="w-full">
                  Reset Configuration
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Custom Dialog</CardTitle>
                <CardDescription className="text-sm">
                  Shows a custom confirmation with multiple details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleCustomConfirm} variant="outline" className="w-full">
                  Show Custom Dialog
                </Button>
              </CardContent>
            </Card>
          </div>

          {lastResult && (
            <Card className="mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Last Result</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-mono bg-gray-100 p-3 rounded">
                  {lastResult}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Features Demonstrated:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Execute with Pinned Data:</strong> Warning severity, custom button text, detailed explanation</li>
              <li>• <strong>Delete Confirmation:</strong> Danger severity, clear destructive action warning</li>
              <li>• <strong>Data Loss Warning:</strong> Warning severity, emphasis on potential data loss</li>
              <li>• <strong>Custom Dialog:</strong> Custom severity, multiple details, custom button text</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">Benefits of ConfirmationService:</h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• <strong>Consistent UI:</strong> All confirmations use the same shadcn dialog component</li>
              <li>• <strong>Store Compatibility:</strong> Can be used from Zustand stores and other non-React code</li>
              <li>• <strong>Type Safety:</strong> Full TypeScript support with proper types</li>
              <li>• <strong>Flexible:</strong> Support for different severities, custom text, and detailed explanations</li>
              <li>• <strong>Accessible:</strong> Built on shadcn components with proper ARIA attributes</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
