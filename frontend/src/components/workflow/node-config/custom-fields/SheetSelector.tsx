import { AutoComplete, AutoCompleteOption } from "@/components/ui/autocomplete";
import { FileSpreadsheet } from "lucide-react";
import { useCallback } from "react";

interface Sheet {
  id: number;
  title: string;
  index: number;
  rowCount?: number;
  columnCount?: number;
}

interface SheetSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  spreadsheetId?: string;
  credentialId?: string;
  error?: string;
}

export function SheetSelector({
  value,
  onChange,
  disabled = false,
  spreadsheetId,
  credentialId,
  error,
}: SheetSelectorProps) {
  // Fetch sheets from Google Sheets API
  const fetchSheets = useCallback(async (): Promise<AutoCompleteOption<Sheet>[]> => {
    try {
      if (!spreadsheetId) {
        throw new Error("Please select a spreadsheet first");
      }

      if (!credentialId) {
        throw new Error("Please select credentials first");
      }

      const token = localStorage.getItem("auth_token");
      
      // Call Google Sheets API with credential ID
      const url = `/api/google/spreadsheets/${spreadsheetId}/sheets?credentialId=${credentialId}`;
      
      const response = await fetch(
        url,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        // Parse error response
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.message || response.statusText;
        } catch (parseError) {
          // Ignore parse errors
        }
        
        // Extract Google API error if present
        if (errorMessage.includes("Spreadsheet not found")) {
          throw new Error("The selected spreadsheet could not be found. It may have been deleted or you may not have access.");
        } else if (errorMessage.includes("Invalid token") || errorMessage.includes("Token expired")) {
          throw new Error("Your Google credentials have expired. Please update your credentials.");
        } else {
          throw new Error(errorMessage);
        }
      }

      const result = await response.json();
      const data = result.data || {};
      const sheets = data.sheets || [];
      
      // Transform to AutoComplete options
      return sheets.map((sheet: Sheet) => ({
        id: sheet.title, // Use title as ID since it's the value we want
        label: sheet.title,
        value: sheet,
        metadata: {
          subtitle: sheet.rowCount && sheet.columnCount
            ? `${sheet.rowCount} rows × ${sheet.columnCount} columns`
            : undefined,
          index: sheet.index,
        },
      }));
    } catch (error) {
      // Re-throw to let AutoComplete handle the error display
      throw error;
    }
  }, [spreadsheetId, credentialId]);

  return (
    <div className="space-y-2">
      <AutoComplete<Sheet>
        key={spreadsheetId || 'no-spreadsheet'} // Force remount when spreadsheet changes
        value={value}
        onChange={onChange}
        onFetch={fetchSheets}
        preloadOnMount={!!spreadsheetId && !!credentialId}
        placeholder="Select a sheet..."
        searchPlaceholder="Search sheets..."
        emptyMessage={
          !spreadsheetId 
            ? "Please select a spreadsheet first" 
            : !credentialId
            ? "Please select credentials first"
            : "No sheets available"
        }
        noOptionsMessage="No sheets found"
        disabled={disabled || !spreadsheetId || !credentialId}
        error={error}
        icon={<FileSpreadsheet className="w-4 h-4 text-blue-600" />}
        clearable={true}
        refreshable={true}
        searchable={true}
        maxHeight={300}
        renderOption={(option) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{option.label}</span>
            {option.metadata?.subtitle && (
              <span className="text-xs text-muted-foreground">
                {option.metadata.subtitle}
              </span>
            )}
          </div>
        )}
      />
      
      {!spreadsheetId && (
        <p className="text-xs text-amber-600">
          ⚠️ Please select a spreadsheet first
        </p>
      )}
    </div>
  );
}
