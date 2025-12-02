import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertTriangle, Loader2, Settings, Download, Info } from 'lucide-react';
import { useCustomNodeStore } from '../../stores/customNode';
import { NodePackageValidationResult } from '../../types/customNode';

export const PackageValidator: React.FC = () => {
  const { validatePackage, compilePackage, loadPackage } = useCustomNodeStore();
  const [packagePath, setPackagePath] = useState('');
  const [validationResult, setValidationResult] = useState<NodePackageValidationResult | null>(null);
  const [compilationResult, setCompilationResult] = useState<any>(null);
  const [loadResult, setLoadResult] = useState<any>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleValidate = async () => {
    if (!packagePath.trim()) return;

    setLoading(prev => ({ ...prev, validate: true }));
    setValidationResult(null);
    
    try {
      const result = await validatePackage(packagePath.trim());
      setValidationResult(result);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setLoading(prev => ({ ...prev, validate: false }));
    }
  };

  const handleCompile = async () => {
    if (!packagePath.trim()) return;

    setLoading(prev => ({ ...prev, compile: true }));
    setCompilationResult(null);
    
    try {
      const result = await compilePackage(packagePath.trim());
      setCompilationResult(result);
    } catch (error) {
      console.error('Compilation failed:', error);
    } finally {
      setLoading(prev => ({ ...prev, compile: false }));
    }
  };

  const handleLoad = async () => {
    if (!packagePath.trim()) return;

    setLoading(prev => ({ ...prev, load: true }));
    setLoadResult(null);
    
    try {
      const result = await loadPackage(packagePath.trim());
      setLoadResult(result);
    } catch (error) {
      console.error('Loading failed:', error);
    } finally {
      setLoading(prev => ({ ...prev, load: false }));
    }
  };

  const renderValidationResult = () => {
    if (!validationResult) return null;

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {validationResult.valid ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            {validationResult.valid ? 'Package is valid' : 'Package validation failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {validationResult.packageInfo && (
            <div>
              <h4 className="font-medium mb-3">Package Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {validationResult.packageInfo.name}
                </div>
                <div>
                  <span className="font-medium">Version:</span> {validationResult.packageInfo.version}
                </div>
                <div>
                  <span className="font-medium">Author:</span> {validationResult.packageInfo.author || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Nodes:</span> {validationResult.packageInfo.nodes.length}
                </div>
              </div>
              <div className="mt-3">
                <span className="font-medium">Description:</span> {validationResult.packageInfo.description}
              </div>
              {validationResult.packageInfo.nodes.length > 0 && (
                <div className="mt-3">
                  <span className="font-medium">Node Files:</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {validationResult.packageInfo.nodes.map((node, index) => (
                      <Badge key={index} variant="secondary">{node}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {validationResult.errors.length > 0 && (
            <>
              <Separator />
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Errors</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {validationResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </>
          )}

          {validationResult.warnings.length > 0 && (
            <>
              <Separator />
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warnings</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCompilationResult = () => {
    if (!compilationResult) return null;

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {compilationResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            {compilationResult.success ? 'Compilation successful' : 'Compilation failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {compilationResult.compiledPath && (
            <div>
              <Label>Output Path</Label>
              <Badge variant="outline" className="mt-1 font-mono text-xs">
                {compilationResult.compiledPath}
              </Badge>
            </div>
          )}

          {compilationResult.errors && compilationResult.errors.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Compilation Errors</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {compilationResult.errors.map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {compilationResult.warnings && compilationResult.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Compilation Warnings</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {compilationResult.warnings.map((warning: string, index: number) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderLoadResult = () => {
    if (!loadResult) return null;

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {loadResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            {loadResult.success ? 'Package loaded successfully' : 'Package loading failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadResult.nodeType && (
            <div>
              <Label>Node Type</Label>
              <Badge variant="outline" className="mt-1 font-mono text-xs">
                {loadResult.nodeType}
              </Badge>
            </div>
          )}

          {loadResult.errors && loadResult.errors.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Loading Errors</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {loadResult.errors.map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {loadResult.warnings && loadResult.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Loading Warnings</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {loadResult.warnings.map((warning: string, index: number) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="rounded-xl border bg-card text-card-foreground shadow w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Package Validator & Loader</CardTitle>
        <CardDescription>
          Validate, compile, and load custom node packages. Enter the path to your package directory.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Package Path Input */}
        <div className="space-y-2">
          <Label htmlFor="packagePath">Package Path</Label>
          <div className="flex gap-2">
            <Input
              id="packagePath"
              type="text"
              value={packagePath}
              onChange={(e) => setPackagePath(e.target.value)}
              placeholder="/path/to/your/custom-node-package"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setPackagePath('')}
            >
              Clear
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Absolute path to the directory containing your custom node package
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            onClick={handleValidate}
            disabled={!packagePath.trim() || loading.validate}
            variant="default"
          >
            {loading.validate ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Validate Package
              </>
            )}
          </Button>

          <Button
            onClick={handleCompile}
            disabled={!packagePath.trim() || loading.compile}
            variant="outline"
          >
            {loading.compile ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Compiling...
              </>
            ) : (
              <>
                <Settings className="mr-2 h-4 w-4" />
                Compile Package
              </>
            )}
          </Button>

          <Button
            onClick={handleLoad}
            disabled={!packagePath.trim() || loading.load}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            {loading.load ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Load Package
              </>
            )}
          </Button>
        </div>

        {/* Help Text */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>How to use</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li><strong>Validate:</strong> Check if your package structure is correct</li>
              <li><strong>Compile:</strong> Compile TypeScript files to JavaScript (if needed)</li>
              <li><strong>Load:</strong> Load the package into the system for use</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Results */}
        {renderValidationResult()}
        {renderCompilationResult()}
        {renderLoadResult()}
      </CardContent>
    </Card>
  );
};
