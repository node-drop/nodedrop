import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Check, Code, Copy, Info } from "lucide-react";
import { useState } from "react";

interface WidgetEmbedGeneratorProps {
  formUrl?: string; // From dependsOn (for form widgets)
  chatUrl?: string; // From dependsOn (for chat widgets)
  widgetType?: 'form' | 'chat'; // To distinguish between widget types
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

export function WidgetEmbedGenerator({
  formUrl,
  chatUrl,
  widgetType = 'form',
  disabled = false,
}: WidgetEmbedGeneratorProps) {
  // Extract ID from URL based on widget type
  const widgetId = widgetType === 'chat' ? (chatUrl || '') : (formUrl || '');
  const [copiedAuto, setCopiedAuto] = useState(false);
  const [copiedManual, setCopiedManual] = useState(false);
  const [copiedES, setCopiedES] = useState(false);

  // Get widget URL from environment or use defaults
  const getWidgetUrl = () => {
    const baseUrl = import.meta.env.VITE_WIDGET_URL || 
                   import.meta.env.VITE_APP_URL || 
                   "https://yourdomain.com";
    
    if (widgetType === 'chat') {
      return `${baseUrl}/widgets/chat/nd-chat-widget.umd.js`;
    } else {
      return `${baseUrl}/widgets/form/nd-form-widget.umd.js`;
    }
  };

  const getApiUrl = () => {
    return import.meta.env.VITE_API_URL || "http://localhost:4000/api";
  };

  const widgetUrl = getWidgetUrl();
  const apiUrl = getApiUrl();

  // Show message if widget ID not available yet
  if (!widgetId) {
    const widgetTypeName = widgetType === 'chat' ? 'chat' : 'form';
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <Info className="h-4 w-4 text-amber-600 mt-0.5" />
            <div>
              <strong>Widget embed code will be available after activating the workflow.</strong>
              <br />
              Save and activate this workflow to generate the {widgetTypeName} ID and get the embed code.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate embed codes based on widget type
  const generateEmbedCodes = () => {
    if (widgetType === 'chat') {
      return {
        autoInitCode: `<!-- Add this to your HTML -->
<div data-nd-chat="${widgetId}" 
     data-api-url="${apiUrl}"
     data-theme="light"
     data-position="bottom-right"></div>

<!-- Add the widget script -->
<script src="${widgetUrl}"></script>`,

        manualInitCode: `<!-- Load widget script -->
<script src="${widgetUrl}"></script>

<!-- Initialize with JavaScript -->
<script>
  const widget = new window.nodeDropChatWidget();
  
  widget.init({
    chatId: '${widgetId}',
    apiUrl: '${apiUrl}',
    theme: 'light', // 'light', 'dark', or 'auto'
    position: 'bottom-right', // 'bottom-right', 'bottom-left', 'top-right', 'top-left'
    onMessage: (message) => {
      console.log('User sent:', message);
      // Your custom message handling
    },
    onResponse: (response) => {
      console.log('AI responded:', response);
      // Your custom response handling
    },
    onError: (error) => {
      console.error('Chat error:', error);
      // Your custom error handling
    }
  });
</script>`,

        esModuleCode: `import { nodeDropChatWidget } from '${widgetUrl.replace('.umd.js', '.es.js')}';

const widget = new nodeDropChatWidget();

widget.init({
  chatId: '${widgetId}',
  apiUrl: '${apiUrl}',
  theme: 'auto',
  position: 'bottom-right'
});`
      };
    } else {
      return {
        autoInitCode: `<!-- Add this to your HTML -->
<div data-nd-form="${widgetId}" 
     data-api-url="${apiUrl}"
     data-theme="light"></div>

<!-- Add the widget script -->
<script src="${widgetUrl}"></script>`,

        manualInitCode: `<!-- Add container -->
<div id="my-form"></div>

<!-- Load widget script -->
<script src="${widgetUrl}"></script>

<!-- Initialize with JavaScript -->
<script>
  const widget = new window.nodeDropFormWidget();
  
  widget.init({
    formId: '${widgetId}',
    apiUrl: '${apiUrl}',
    container: '#my-form',
    theme: 'light', // 'light', 'dark', or 'auto'
    onSuccess: (data) => {
      console.log('Form submitted!', data);
      // Your custom success handling
      alert('Thank you for your submission!');
    },
    onError: (error) => {
      console.error('Form error:', error);
      // Your custom error handling
    }
  });
</script>`,

        esModuleCode: `import { nodeDropFormWidget } from '${widgetUrl.replace('.umd.js', '.es.js')}';

const widget = new nodeDropFormWidget();

widget.init({
  formId: '${widgetId}',
  apiUrl: '${apiUrl}',
  container: document.getElementById('form-container'),
  theme: 'auto'
});`
      };
    }
  };

  const { autoInitCode, manualInitCode, esModuleCode } = generateEmbedCodes();

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: 'auto' | 'manual' | 'es') => {
    try {
      await navigator.clipboard.writeText(text);
      
      if (type === 'auto') {
        setCopiedAuto(true);
        setTimeout(() => setCopiedAuto(false), 2000);
      } else if (type === 'manual') {
        setCopiedManual(true);
        setTimeout(() => setCopiedManual(false), 2000);
      } else {
        setCopiedES(true);
        setTimeout(() => setCopiedES(false), 2000);
      }
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs for different embed methods */}
      <Tabs defaultValue="auto" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="auto" disabled={disabled}>
            <Code className="w-3.5 h-3.5 mr-1.5" />
            Auto-Init
          </TabsTrigger>
          <TabsTrigger value="manual" disabled={disabled}>
            <Code className="w-3.5 h-3.5 mr-1.5" />
            Manual
          </TabsTrigger>
          <TabsTrigger value="module" disabled={disabled}>
            <Code className="w-3.5 h-3.5 mr-1.5" />
            ES Module
          </TabsTrigger>
        </TabsList>

        {/* Auto-Init Tab */}
        <TabsContent value="auto" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Simple Auto-Initialize</CardTitle>
              <CardDescription className="text-xs">
                Just add a div with data attributes. The {widgetType} widget auto-initializes on page load.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-medium">HTML Code</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(autoInitCode, 'auto')}
                    disabled={disabled}
                    className="h-7 text-xs"
                  >
                    {copiedAuto ? (
                      <>
                        <Check className="w-3 h-3 mr-1 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy Code
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={autoInitCode}
                  readOnly
                  disabled={disabled}
                  className="font-mono text-xs h-32 resize-none"
                />
              </div>

              <div className="flex items-start gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <Info className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Best for:</strong> Quick embeds, WordPress sites, static pages
                  {widgetType === 'chat' && (
                    <span className="block mt-1">
                      The chat bubble will appear automatically in the configured position.
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Init Tab */}
        <TabsContent value="manual" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Manual Initialization</CardTitle>
              <CardDescription className="text-xs">
                Full control with JavaScript. Add callbacks for {widgetType === 'chat' ? 'message/response' : 'success/error'} handling.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-medium">HTML + JavaScript Code</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(manualInitCode, 'manual')}
                    disabled={disabled}
                    className="h-7 text-xs"
                  >
                    {copiedManual ? (
                      <>
                        <Check className="w-3 h-3 mr-1 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy Code
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={manualInitCode}
                  readOnly
                  disabled={disabled}
                  className="font-mono text-xs h-64 resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ES Module Tab */}
        <TabsContent value="module" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">ES Module Import</CardTitle>
              <CardDescription className="text-xs">
                For modern build tools like Vite, Webpack, or React apps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-medium">JavaScript Code</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(esModuleCode, 'es')}
                    disabled={disabled}
                    className="h-7 text-xs"
                  >
                    {copiedES ? (
                      <>
                        <Check className="w-3 h-3 mr-1 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy Code
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={esModuleCode}
                  readOnly
                  disabled={disabled}
                  className="font-mono text-xs h-40 resize-none"
                />
              </div>

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Reference */}
      <Card className="bg-slate-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Configuration Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5">
              {widgetType === 'chat' ? (
                <>
                  <code className="text-xs bg-white px-2 py-1 rounded">chatId</code>
                  <span className="text-muted-foreground">Your chat ID (required)</span>
                  
                  <code className="text-xs bg-white px-2 py-1 rounded">apiUrl</code>
                  <span className="text-muted-foreground">Backend API URL (optional)</span>
                  
                  <code className="text-xs bg-white px-2 py-1 rounded">theme</code>
                  <span className="text-muted-foreground">'light', 'dark', or 'auto'</span>
                  
                  <code className="text-xs bg-white px-2 py-1 rounded">position</code>
                  <span className="text-muted-foreground">'bottom-right', 'bottom-left', etc.</span>
                  
                  <code className="text-xs bg-white px-2 py-1 rounded">onMessage</code>
                  <span className="text-muted-foreground">Callback when user sends message</span>
                  
                  <code className="text-xs bg-white px-2 py-1 rounded">onResponse</code>
                  <span className="text-muted-foreground">Callback when AI responds</span>
                  
                  <code className="text-xs bg-white px-2 py-1 rounded">onError</code>
                  <span className="text-muted-foreground">Callback on error</span>
                </>
              ) : (
                <>
                  <code className="text-xs bg-white px-2 py-1 rounded">formId</code>
                  <span className="text-muted-foreground">Your form ID (required)</span>
                  
                  <code className="text-xs bg-white px-2 py-1 rounded">apiUrl</code>
                  <span className="text-muted-foreground">Backend API URL (optional)</span>
                  
                  <code className="text-xs bg-white px-2 py-1 rounded">container</code>
                  <span className="text-muted-foreground">Selector or element (optional)</span>
                  
                  <code className="text-xs bg-white px-2 py-1 rounded">theme</code>
                  <span className="text-muted-foreground">'light', 'dark', or 'auto'</span>
                  
                  <code className="text-xs bg-white px-2 py-1 rounded">onSuccess</code>
                  <span className="text-muted-foreground">Callback on success</span>
                  
                  <code className="text-xs bg-white px-2 py-1 rounded">onError</code>
                  <span className="text-muted-foreground">Callback on error</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
