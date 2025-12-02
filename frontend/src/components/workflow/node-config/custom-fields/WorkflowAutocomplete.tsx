import { AutoComplete, AutoCompleteOption } from "@/components/ui/autocomplete";
import { Workflow } from "lucide-react";

interface WorkflowData {
  id: string;
  name: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface WorkflowAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export function WorkflowAutocomplete({
  value,
  onChange,
  disabled = false,
  error,
}: WorkflowAutocompleteProps) {
  // Fetch workflows from API
  const fetchWorkflows = async (): Promise<AutoCompleteOption<string>[]> => {
    const token = localStorage.getItem("auth_token");
    
    // Call workflows API
    const response = await fetch(`/api/workflows`, {
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
    const workflows = result.data || [];
    
    // Transform to AutoComplete options
    // Store only the ID as the value, but show name as label
    return workflows.map((w: WorkflowData) => ({
      id: w.id,
      label: w.name,
      value: w.id, // Store only the ID
      metadata: {
        subtitle: w.active 
          ? "Active" 
          : "Inactive",
        status: w.active ? "active" : "inactive",
      },
    }));
  };

  return (
    <div className="space-y-2">
      <AutoComplete<string>
        value={value}
        onChange={onChange}
        onFetch={fetchWorkflows}
        preloadOnMount={true}
        placeholder="Select a workflow to trigger"
        searchPlaceholder="Search workflows..."
        emptyMessage="No workflows available"
        noOptionsMessage="No workflows found"
        disabled={disabled}
        error={error}
        icon={<Workflow className="w-4 h-4 text-blue-600" />}
        clearable={false}
        refreshable={true}
        searchable={true}
        maxHeight={300}
      />
    </div>
  );
}
