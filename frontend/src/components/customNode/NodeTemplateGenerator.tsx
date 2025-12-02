import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Download, RotateCcw } from 'lucide-react';
import { useCustomNodeStore } from '../../stores/customNode';

export const NodeTemplateGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const generatePackageZip = useCustomNodeStore((state) => state.generatePackageZip);

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    type: 'action' as 'action' | 'trigger' | 'transform',
    author: '',
    version: '1.0.0',
    group: [] as string[],
    typescript: true,
    includeCredentials: false,
    includeTests: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsGenerating(true);
      await generatePackageZip(formData);
    } catch (error) {
      console.error('Failed to generate package:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    if (field === 'group') {
      // Convert comma-separated string to array
      const groupArray = value ? value.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];
      setFormData(prev => ({ ...prev, [field]: groupArray }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <Card className="rounded-xl border bg-card text-card-foreground shadow w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Generate Custom Node Package</CardTitle>
        <CardDescription>
          Create a complete nodeDrop custom node package with all necessary files. The package will be generated as a zip file for download.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Node Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="my-custom-node"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                value={formData.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
                placeholder="My Custom Node"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe what your custom node does..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="type">Node Type</Label>
              <Select value={formData.type} onValueChange={(value) => handleChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select node type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="action">Action</SelectItem>
                  <SelectItem value="trigger">Trigger</SelectItem>
                  <SelectItem value="transform">Transform</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                type="text"
                value={formData.author}
                onChange={(e) => handleChange('author', e.target.value)}
                placeholder="Your Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                type="text"
                value={formData.version}
                onChange={(e) => handleChange('version', e.target.value)}
                placeholder="1.0.0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="groups">Groups</Label>
            <Input
              id="groups"
              type="text"
              value={formData.group.join(', ')}
              onChange={(e) => handleChange('group', e.target.value)}
              placeholder="utilities, helpers, integrations"
            />
            <p className="text-sm text-muted-foreground">Category groups for organizing nodes (comma-separated, optional)</p>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-medium">Additional Options</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="typescript"
                  checked={formData.typescript}
                  onCheckedChange={(checked) => handleChange('typescript', checked)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="typescript" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    TypeScript
                  </Label>
                  <p className="text-xs text-muted-foreground">Generate TypeScript files</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="credentials"
                  checked={formData.includeCredentials}
                  onCheckedChange={(checked) => handleChange('includeCredentials', checked)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="credentials" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Include Credentials
                  </Label>
                  <p className="text-xs text-muted-foreground">Add credential handling</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tests"
                  checked={formData.includeTests}
                  onCheckedChange={(checked) => handleChange('includeTests', checked)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="tests" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Include Tests
                  </Label>
                  <p className="text-xs text-muted-foreground">Generate test files</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Generate Package
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormData({
                name: '',
                displayName: '',
                description: '',
                type: 'action',
                author: '',
                version: '1.0.0',
                group: [],
                typescript: true,
                includeCredentials: false,
                includeTests: true,
              })}
              disabled={isGenerating}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
