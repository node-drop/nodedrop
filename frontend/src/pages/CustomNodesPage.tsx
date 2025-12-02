import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NodeTemplateGenerator } from '../components/customNode/NodeTemplateGenerator';
import { PackageValidator } from '../components/customNode/PackageValidator';
import { Zap, CheckCircle } from 'lucide-react';

export const CustomNodesPage: React.FC = () => {
  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8" />
            Custom Nodes
          </h1>
          <p className="text-muted-foreground mt-2">
            Create and validate custom nodes for your workflows
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="generator" className="w-full">
          <TabsList>
            <TabsTrigger value="generator" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Create Node
            </TabsTrigger>
            <TabsTrigger value="validator" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Validate Package
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="mt-6">
            <NodeTemplateGenerator />
          </TabsContent>

          <TabsContent value="validator" className="mt-6">
            <PackageValidator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
