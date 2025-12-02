import { AutoComplete, AutoCompleteOption } from "@/components/ui/autocomplete";
import { Sheet } from "lucide-react";

interface Spreadsheet {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface SpreadsheetSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  credentialId?: string;
  error?: string;
}

export function SpreadsheetSelector({
  value,
  onChange,
  disabled = false,
  credentialId,
  error,
}: SpreadsheetSelectorProps) {
  // Fetch spreadsheets from Google Sheets API
  const fetchSpreadsheets = async (): Promise<AutoCompleteOption<Spreadsheet>[]> => {
    if (!credentialId) {
      throw new Error("Please select credentials first");
    }

    const token = localStorage.getItem("auth_token");
    
    // Call Google Sheets API with credential ID
    const response = await fetch(`/api/google/spreadsheets?credentialId=${credentialId}`, {
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
      
      // Extract Google API error if present
      if (errorMessage.includes("Google Drive API has not been used") || 
          errorMessage.includes("is disabled")) {
        throw new Error("Google Drive API is not enabled in your Google Cloud Project. Please enable it in the Google Cloud Console.");
      } else if (errorMessage.includes("Invalid token") || errorMessage.includes("Token expired")) {
        throw new Error("Your Google credentials have expired. Please update your credentials.");
      } else {
        throw new Error(errorMessage);
      }
    }

    const result = await response.json();
    const data = result.data || {};
    const spreadsheets = data.spreadsheets || [];
    
    // Transform to AutoComplete options
    return spreadsheets.map((s: Spreadsheet) => ({
      id: s.id,
      label: s.name,
      value: s,
      metadata: {
        subtitle: s.modifiedTime 
          ? `Modified: ${new Date(s.modifiedTime).toLocaleDateString()}`
          : undefined,
        webViewLink: s.webViewLink,
      },
    }));
  };

  return (
    <div className="space-y-2">
      <AutoComplete<Spreadsheet>
        value={value}
        onChange={onChange}
        onFetch={fetchSpreadsheets}
        preloadOnMount={!!credentialId}
        placeholder="Select a spreadsheet..."
        searchPlaceholder="Search spreadsheets..."
        emptyMessage={!credentialId ? "Please select credentials first" : "No spreadsheets available"}
        noOptionsMessage="No spreadsheets found"
        disabled={disabled || !credentialId}
        error={error}
        icon={<Sheet className="w-4 h-4 text-green-600" />}
        clearable={true}
        refreshable={true}
        searchable={true}
        maxHeight={300}
      />
      
      {!credentialId && (
        <p className="text-xs text-amber-600">
          ⚠️ Please configure Google Sheets credentials first
        </p>
      )}
    </div>
  );
}
