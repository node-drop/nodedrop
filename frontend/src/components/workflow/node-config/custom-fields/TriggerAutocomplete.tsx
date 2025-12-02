import { AutoComplete, AutoCompleteOption } from "@/components/ui/autocomplete";
import { Zap } from "lucide-react";

interface Trigger {
  id: string;
  type: string;
  nodeId: string;
  description: string;
  settings?: any;
}

interface TriggerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  workflowId?: string; // Received from FieldRenderer via dependsOn
}

export function TriggerAutocomplete({
  value,
  onChange,
  disabled = false,
  error,
  workflowId,
}: TriggerAutocompleteProps) {
  // Fetch triggers for the selected workflow
  const fetchTriggers = async (): Promise<AutoCompleteOption<string>[]> => {
    if (!workflowId) {
      throw new Error("Please select a workflow first");
    }

    const token = localStorage.getItem("auth_token");
    
    // Call triggers API
    const response = await fetch(`/api/workflows/${workflowId}/triggers`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: "include",
    });

    if (!response.ok) {
      // Parse error response
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || response.statusText;
      throw new Error(errorMessage);
    }

    const result = await response.json();
    const triggers = result.data || [];
    
    // Transform to AutoComplete options
    // Store only the ID as the value, but show description as label
    return triggers.map((t: Trigger) => ({
      id: t.id,
      label: t.description,
      value: t.id, // Store only the ID
      metadata: {
        subtitle: `${t.type} • Node: ${t.nodeId}`,
      },
    }));
  };

  return (
    <div className="space-y-2">
      <AutoComplete<string>
        key={workflowId || 'no-workflow'} // Force remount when workflow changes
        value={value}
        onChange={onChange}
        onFetch={fetchTriggers}
        preloadOnMount={!!workflowId}
        placeholder="Select a trigger"
        searchPlaceholder="Search triggers..."
        emptyMessage={!workflowId ? "Please select a workflow first" : "No triggers available"}
        noOptionsMessage="No triggers found"
        disabled={disabled || !workflowId}
        error={error}
        icon={<Zap className="w-4 h-4 text-yellow-600" />}
        clearable={false}
        refreshable={true}
        searchable={true}
        maxHeight={300}
      />
      
      {!workflowId && (
        <p className="text-xs text-amber-600">
          ⚠️ Please select a workflow first
        </p>
      )}
    </div>
  );
}
