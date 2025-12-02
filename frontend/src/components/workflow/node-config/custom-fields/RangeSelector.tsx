import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Grid, Type } from "lucide-react";
import { useState } from "react";

interface RangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  spreadsheetId?: string;
  sheetName?: string;
  error?: string;
}

export function RangeSelector({
  value,
  onChange,
  disabled = false,
  spreadsheetId,
  sheetName,
  error,
}: RangeSelectorProps) {
  const [mode, setMode] = useState<"manual" | "builder">("manual");
  
  // Parse existing range
  const parseRange = (range: string) => {
    const match = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (match) {
      return {
        startColumn: match[1],
        startRow: match[2],
        endColumn: match[3],
        endRow: match[4],
      };
    }
    return {
      startColumn: "A",
      startRow: "1",
      endColumn: "Z",
      endRow: "100",
    };
  };

  const [rangeBuilder, setRangeBuilder] = useState(parseRange(value));

  const buildRange = () => {
    const { startColumn, startRow, endColumn, endRow } = rangeBuilder;
    if (startColumn && startRow && endColumn && endRow) {
      return `${startColumn}${startRow}:${endColumn}${endRow}`;
    }
    return "";
  };

  const handleBuilderChange = (field: string, val: string) => {
    const newBuilder = { ...rangeBuilder, [field]: val };
    setRangeBuilder(newBuilder);
    
    // Auto-update the range
    const newRange = `${newBuilder.startColumn}${newBuilder.startRow}:${newBuilder.endColumn}${newBuilder.endRow}`;
    if (newBuilder.startColumn && newBuilder.startRow && newBuilder.endColumn && newBuilder.endRow) {
      onChange(newRange);
    }
  };

  const presets = [
    { name: "First 100 rows", value: "A1:Z100" },
    { name: "First 10 columns", value: "A1:J1000" },
    { name: "Full sheet (A-Z)", value: "A1:Z10000" },
    { name: "First 1000 rows", value: "A1:Z1000" },
  ];

  return (
    <div className="space-y-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Range Selection</CardTitle>
          <CardDescription className="text-xs">
            {!spreadsheetId
              ? "Select a spreadsheet first"
              : !sheetName
              ? "Select a sheet first"
              : "Specify the range to monitor"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual" className="text-xs">
                <Type className="w-3 h-3 mr-1" />
                Manual
              </TabsTrigger>
              <TabsTrigger value="builder" className="text-xs">
                <Grid className="w-3 h-3 mr-1" />
                Builder
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-3">
              <div>
                <Label htmlFor="range-input" className="text-xs">
                  Range (e.g., A1:D100)
                </Label>
                <Input
                  id="range-input"
                  type="text"
                  placeholder="e.g., A1:D100"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={disabled || !spreadsheetId || !sheetName}
                  className={error ? "border-red-500" : ""}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to monitor the entire sheet
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Quick Presets</Label>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => onChange(preset.value)}
                      disabled={disabled || !spreadsheetId || !sheetName}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="builder" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="start-col" className="text-xs">
                    Start Column
                  </Label>
                  <Input
                    id="start-col"
                    type="text"
                    placeholder="A"
                    value={rangeBuilder.startColumn}
                    onChange={(e) =>
                      handleBuilderChange("startColumn", e.target.value.toUpperCase())
                    }
                    disabled={disabled || !spreadsheetId || !sheetName}
                  />
                </div>
                <div>
                  <Label htmlFor="start-row" className="text-xs">
                    Start Row
                  </Label>
                  <Input
                    id="start-row"
                    type="text"
                    placeholder="1"
                    value={rangeBuilder.startRow}
                    onChange={(e) => handleBuilderChange("startRow", e.target.value)}
                    disabled={disabled || !spreadsheetId || !sheetName}
                  />
                </div>
                <div>
                  <Label htmlFor="end-col" className="text-xs">
                    End Column
                  </Label>
                  <Input
                    id="end-col"
                    type="text"
                    placeholder="Z"
                    value={rangeBuilder.endColumn}
                    onChange={(e) =>
                      handleBuilderChange("endColumn", e.target.value.toUpperCase())
                    }
                    disabled={disabled || !spreadsheetId || !sheetName}
                  />
                </div>
                <div>
                  <Label htmlFor="end-row" className="text-xs">
                    End Row
                  </Label>
                  <Input
                    id="end-row"
                    type="text"
                    placeholder="100"
                    value={rangeBuilder.endRow}
                    onChange={(e) => handleBuilderChange("endRow", e.target.value)}
                    disabled={disabled || !spreadsheetId || !sheetName}
                  />
                </div>
              </div>

              <div className="p-3 bg-muted rounded-md">
                <Label className="text-xs text-muted-foreground">Generated Range</Label>
                <p className="text-sm font-mono font-medium">{buildRange() || "Invalid range"}</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
