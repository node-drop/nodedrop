import { UnifiedCredentialSelector } from '@/components/credential/UnifiedCredentialSelector';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from "@/services/api";
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AISettings {
    provider: string;
    model: string;
    credentialId?: string;
    hasKey: boolean;
}

interface AISettingsFormProps {
    onClose: () => void;
}

export function AISettingsForm({ onClose }: AISettingsFormProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<AISettings>({
        provider: 'openai',
        model: 'gpt-4o',
        hasKey: false
    });
    const [selectedCredentialId, setSelectedCredentialId] = useState<string | undefined>(undefined);
    const [availableLocalModels, setAvailableLocalModels] = useState<any[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        if (settings.provider === 'ollama') {
            fetchOllamaModels();
        }
    }, [settings.provider]);

    const fetchOllamaModels = async () => {
        setLoadingModels(true);
        try {
            // Try localhost default port.
            // Using /api/ps to show likely-to-be-fast RUNNING models only.
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
            
            const res = await fetch('http://localhost:11434/api/ps', { 
                signal: controller.signal 
            });
            clearTimeout(timeoutId);
            
            if (res.ok) {
                const data = await res.json();
                if (data.models && Array.isArray(data.models)) {
                    setAvailableLocalModels(data.models);
                    // precise match or fallback
                    if (!settings.model || settings.model === 'gpt-4o') {
                        // Default to the first running model if available
                        if (data.models.length > 0) {
                            setSettings(prev => ({ ...prev, model: data.models[0].name }));
                        } else {
                            // If no running models, maybe default to generic or keep empty
                            setSettings(prev => ({ ...prev, model: 'llama3' }));
                        }
                    }
                }
            }
        } catch (err) {
            console.warn("Failed to fetch running local models (CORS or not running)", err);
        } finally {
            setLoadingModels(false);
        }
    };

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get<AISettings>('/ai/settings');
            const data = res as unknown as AISettings;
            setSettings(data);
            setSelectedCredentialId(data.credentialId);
        } catch (err) {
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiClient.put('/ai/settings', {
                provider: settings.provider,
                model: settings.model,
                credentialId: selectedCredentialId || null
            });
            toast.success("Settings saved successfully");
            onClose();
        } catch (err) {
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>AI Provider</Label>
                        <Select 
                            value={settings.provider || 'openai'} 
                            onValueChange={(val) => setSettings(prev => ({ 
                                ...prev, 
                                provider: val,
                                // Reset model defaults when switching providers
                                model: val === 'ollama' ? 'llama3' : 'gpt-4o'
                            }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Provider" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="openai">OpenAI (Cloud)</SelectItem>
                                <SelectItem value="ollama">Ollama (Local / Private)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {settings.provider === 'openai' ? (
                        <>
                            <div className="space-y-2">
                                <Label>Model</Label>
                                <Select 
                                    value={settings.model} 
                                    onValueChange={(val) => setSettings(prev => ({ ...prev, model: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gpt-4o">GPT-4o (Recommended)</SelectItem>
                                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Fastest)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>OpenAI API Key</Label>
                                <UnifiedCredentialSelector
                                    allowedTypes={['apiKey']}
                                    value={selectedCredentialId}
                                    onChange={setSelectedCredentialId}
                                    placeholder="Select or create an API Key..."
                                    description="Select a stored credential or create a new one."
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label>Model Name</Label>
                                {availableLocalModels.length > 0 ? (
                                     <Select 
                                        value={settings.model} 
                                        onValueChange={(val) => setSettings(prev => ({ ...prev, model: val }))}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select Running Model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableLocalModels.map((m: any) => (
                                                <SelectItem key={m.name} value={m.name}>
                                                    {m.name} (Running)
                                                </SelectItem>
                                            ))}
                                            <SelectItem value="custom">+ Type Manual Name</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <input
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={settings.model}
                                        onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
                                        placeholder="e.g. llama3, mistral, phi3"
                                    />
                                )}
                                
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-muted-foreground">
                                        {availableLocalModels.length > 0 
                                            ? `Found ${availableLocalModels.length} models locally` 
                                            : "Could not auto-detect models (CORS or stopped). Type manual name."}
                                    </p>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 text-xs"
                                        onClick={fetchOllamaModels}
                                        disabled={loadingModels}
                                    >
                                        {loadingModels ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                        Refresh Running
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Connection Settings (Optional)</Label>
                                <UnifiedCredentialSelector
                                    allowedTypes={['apiKey', 'custom_ai_api']}
                                    value={selectedCredentialId}
                                    onChange={setSelectedCredentialId}
                                    placeholder="Select custom connection..."
                                    description="Use a 'Custom AI API' credential to set a Base URL (default: http://localhost:11434/v1)."
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
