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

    useEffect(() => {
        fetchSettings();
    }, []);

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
                        <Label>AI Model</Label>
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
                        <p className="text-xs text-muted-foreground">
                            Select the model used for workflow generation and chat.
                        </p>
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
                        <p className="text-xs text-muted-foreground mt-1">
                            Your key is linked from your secure credential vault.
                        </p>
                    </div>
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
