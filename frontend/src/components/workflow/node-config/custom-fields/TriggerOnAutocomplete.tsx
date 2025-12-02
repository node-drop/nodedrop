import { AutoComplete, AutoCompleteOption } from "@/components/ui/autocomplete";
import { Activity } from "lucide-react";
import { useMemo } from "react";

interface TriggerOnAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  options?: Array<{
    name: string;
    value: string;
    description?: string;
  }>;
}

export function TriggerOnAutocomplete({
  value,
  onChange,
  disabled = false,
  error,
  options = [],
}: TriggerOnAutocompleteProps) {
  // Convert node property options to AutoComplete options format
  const autocompleteOptions = useMemo<AutoCompleteOption[]>(() => {
    const converted = options.map((option) => ({
      id: option.value,
      label: option.name,
      value: option.value,
      metadata: {
        subtitle: option.description,
      },
    }));
    return converted;
  }, [options]);

  return (
    <div>
      <AutoComplete
        value={value}
        onChange={(selectedValue) => onChange(selectedValue)}
        options={autocompleteOptions}
        placeholder="Select trigger event..."
        searchPlaceholder="Search trigger events..."
        emptyMessage="No trigger events available"
        noOptionsMessage="No matching trigger events"
        icon={<Activity className="h-4 w-4" />}
        disabled={disabled}
        error={error}
        clearable={false}
        refreshable={false}
        searchable={true}
        renderOption={(option) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{option.label}</span>
            {option.metadata?.subtitle && (
              <span className="text-xs text-muted-foreground">
                {option.metadata.subtitle}
              </span>
            )}
          </div>
        )}
        renderSelected={(option) => (
          <span className="text-sm">{option.label}</span>
        )}
      />
    </div>
  );
}
