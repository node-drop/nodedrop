import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiClient } from "@/services/api";
import { Loader2, RefreshCw, Search, Table } from "lucide-react";
import { useEffect, useState } from "react";

interface Column {
  name: string;
  index: number;
  letter: string;
  type?: string;
  sampleValues?: string[];
}

interface ColumnSelectorProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  disabled?: boolean;
  spreadsheetId?: string;
  sheetName?: string;
  credentialId?: string;
  multiSelect?: boolean;
  error?: string;
}

export function ColumnSelector({
  value,
  onChange,
  disabled = false,
  spreadsheetId,
  sheetName,
  credentialId,
  multiSelect = false,
  error,
}: ColumnSelectorProps) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch columns from Google Sheets API
  const fetchColumns = async () => {
    if (!spreadsheetId || !sheetName || !credentialId) {
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.get(
        `/api/google/spreadsheets/${spreadsheetId}/sheets/${encodeURIComponent(
          sheetName
        )}/columns?credentialId=${credentialId}`
      );

      if (response.success && response.data) {
        setColumns(response.data.columns || []);
      }
    } catch (err) {
      console.error("Failed to fetch columns:", err);
      setColumns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (spreadsheetId && sheetName) {
      fetchColumns();
    } else {
      setColumns([]);
    }
  }, [spreadsheetId, sheetName, credentialId]);

  const handleSelect = (column: Column) => {
    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : value ? [value] : [];
      const newValues = currentValues.includes(column.name)
        ? currentValues.filter((v) => v !== column.name)
        : [...currentValues, column.name];
      onChange(newValues);
    } else {
      onChange(column.name);
    }
  };

  const isSelected = (column: Column) => {
    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : value ? [value] : [];
      return currentValues.includes(column.name);
    }
    return value === column.name;
  };

  const filteredColumns = columns.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCount = multiSelect && Array.isArray(value) ? value.length : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder="Search columns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={disabled || loading || !spreadsheetId || !sheetName}
            className={error ? "border-red-500" : ""}
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={fetchColumns}
          disabled={disabled || loading || !spreadsheetId || !sheetName || !credentialId}
          title="Refresh columns"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      {multiSelect && selectedCount > 0 && (
        <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md border border-blue-200">
          <span className="text-xs text-blue-700 font-medium">
            {selectedCount} column{selectedCount > 1 ? "s" : ""} selected
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => onChange([])}
            disabled={disabled}
          >
            Clear
          </Button>
        </div>
      )}

      <Card>
        <ScrollArea className="h-[300px]">
          <CardContent className="p-2 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !spreadsheetId || !sheetName ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Select a spreadsheet and sheet first
              </div>
            ) : filteredColumns.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {searchTerm ? "No columns found" : "No columns available"}
              </div>
            ) : (
              filteredColumns.map((column) => {
                const selected = isSelected(column);
                
                return (
                  <div
                    key={column.letter}
                    className={`flex items-start gap-3 p-3 rounded-md hover:bg-muted cursor-pointer ${
                      selected ? "bg-blue-50 border border-blue-200" : ""
                    }`}
                    onClick={() => !disabled && handleSelect(column)}
                  >
                    {multiSelect && (
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => handleSelect(column)}
                        disabled={disabled}
                        className="mt-0.5"
                      />
                    )}
                    <div className="flex items-start gap-2 flex-1">
                      <Table className={`w-4 h-4 mt-0.5 flex-shrink-0 ${selected ? "text-blue-600" : "text-muted-foreground"}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{column.name}</p>
                          <span className="text-xs text-muted-foreground font-mono">
                            ({column.letter})
                          </span>
                        </div>
                        {column.type && (
                          <p className="text-xs text-muted-foreground">
                            Type: {column.type}
                          </p>
                        )}
                        {column.sampleValues && column.sampleValues.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Sample: {column.sampleValues.slice(0, 3).join(", ")}
                            {column.sampleValues.length > 3 && "..."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </ScrollArea>
      </Card>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {(!spreadsheetId || !sheetName) && (
        <p className="text-xs text-amber-600">
          ⚠️ Please select a spreadsheet and sheet first
        </p>
      )}
    </div>
  );
}
