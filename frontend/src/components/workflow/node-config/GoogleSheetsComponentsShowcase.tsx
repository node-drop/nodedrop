import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import {
  ColumnSelector,
  RangeSelector,
  SheetSelector,
  SpreadsheetSelector,
} from "./custom-fields";

/**
 * Google Sheets Custom Components Showcase
 * Demonstrates all custom field components for the Google Sheets Trigger node
 */
export function GoogleSheetsComponentsShowcase() {
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [range, setRange] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [credentialId] = useState("demo-credential-id");

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Google Sheets Custom Components</h1>
        <p className="text-muted-foreground">
          Interactive showcase of all custom field components for the Google Sheets Trigger node
        </p>
      </div>

      <Tabs defaultValue="spreadsheet" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="spreadsheet">Spreadsheet</TabsTrigger>
          <TabsTrigger value="sheet">Sheet</TabsTrigger>
          <TabsTrigger value="range">Range</TabsTrigger>
          <TabsTrigger value="columns">Columns</TabsTrigger>
        </TabsList>

        <TabsContent value="spreadsheet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SpreadsheetSelector</CardTitle>
              <CardDescription>
                Browse and select Google Spreadsheets from your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Features:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Search functionality</li>
                  <li>Real-time list of spreadsheets</li>
                  <li>Last modified dates</li>
                  <li>Refresh capability</li>
                  <li>Visual feedback with icons</li>
                  <li>Credential-based authentication</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4 bg-muted/30">
                <SpreadsheetSelector
                  value={spreadsheetId}
                  onChange={setSpreadsheetId}
                  credentialId={credentialId}
                />
              </div>

              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Selected Value:</p>
                <code className="bg-muted px-2 py-1 rounded">
                  {spreadsheetId || "null"}
                </code>
              </div>

              <div className="text-xs">
                <p className="font-medium mb-2">Usage in Node Definition:</p>
                <pre className="bg-muted p-3 rounded overflow-x-auto">
{`{
  displayName: "Spreadsheet",
  name: "spreadsheetId",
  type: "custom",
  required: true,
  component: "SpreadsheetSelector",
  componentProps: {
    credentialField: "googleSheetsOAuth2"
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sheet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SheetSelector</CardTitle>
              <CardDescription>
                Select specific sheets within a spreadsheet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Features:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Automatic loading when spreadsheet is selected</li>
                  <li>Sheet metadata (rows × columns)</li>
                  <li>Dependency on spreadsheet selection</li>
                  <li>Refresh capability</li>
                  <li>Visual sheet icons</li>
                </ul>
              </div>

              {!spreadsheetId && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  ⚠️ Please select a spreadsheet first in the "Spreadsheet" tab
                </div>
              )}

              <div className="border rounded-lg p-4 bg-muted/30">
                <SheetSelector
                  value={sheetName}
                  onChange={setSheetName}
                  spreadsheetId={spreadsheetId}
                  credentialId={credentialId}
                />
              </div>

              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Selected Value:</p>
                <code className="bg-muted px-2 py-1 rounded">
                  {sheetName || "null"}
                </code>
              </div>

              <div className="text-xs">
                <p className="font-medium mb-2">Usage in Node Definition:</p>
                <pre className="bg-muted p-3 rounded overflow-x-auto">
{`{
  displayName: "Sheet Name",
  name: "sheetName",
  type: "custom",
  required: true,
  component: "SheetSelector",
  componentProps: {
    dependsOn: "spreadsheetId",
    credentialField: "googleSheetsOAuth2"
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="range" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>RangeSelector</CardTitle>
              <CardDescription>
                Flexible range selection with manual and builder modes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Features:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Manual mode: Type range directly (e.g., A1:D100)</li>
                  <li>Builder mode: Use form fields for start/end</li>
                  <li>Quick preset ranges</li>
                  <li>Real-time validation</li>
                  <li>Visual range preview</li>
                </ul>
              </div>

              {(!spreadsheetId || !sheetName) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  ⚠️ Please select a spreadsheet and sheet first
                </div>
              )}

              <div className="border rounded-lg p-4 bg-muted/30">
                <RangeSelector
                  value={range}
                  onChange={setRange}
                  spreadsheetId={spreadsheetId}
                  sheetName={sheetName}
                />
              </div>

              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Selected Value:</p>
                <code className="bg-muted px-2 py-1 rounded">
                  {range || "null"}
                </code>
              </div>

              <div className="text-xs">
                <p className="font-medium mb-2">Usage in Node Definition:</p>
                <pre className="bg-muted p-3 rounded overflow-x-auto">
{`{
  displayName: "Range",
  name: "range",
  type: "custom",
  component: "RangeSelector",
  componentProps: {
    dependsOn: ["spreadsheetId", "sheetName"],
    credentialField: "googleSheetsOAuth2"
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="columns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ColumnSelector</CardTitle>
              <CardDescription>
                Select specific columns with multi-select support
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Features:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Multi-select support</li>
                  <li>Column search</li>
                  <li>Sample data preview</li>
                  <li>Type detection (string, number, date, etc.)</li>
                  <li>Selected count indicator</li>
                  <li>Visual selection feedback</li>
                </ul>
              </div>

              {(!spreadsheetId || !sheetName) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  ⚠️ Please select a spreadsheet and sheet first
                </div>
              )}

              <div className="border rounded-lg p-4 bg-muted/30">
                <ColumnSelector
                  value={selectedColumns}
                  onChange={(val) => setSelectedColumns(Array.isArray(val) ? val : [val])}
                  spreadsheetId={spreadsheetId}
                  sheetName={sheetName}
                  credentialId={credentialId}
                  multiSelect={true}
                />
              </div>

              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Selected Value:</p>
                <code className="bg-muted px-2 py-1 rounded">
                  {selectedColumns.length > 0
                    ? JSON.stringify(selectedColumns, null, 2)
                    : "[]"}
                </code>
              </div>

              <div className="text-xs">
                <p className="font-medium mb-2">Usage in Node Definition:</p>
                <pre className="bg-muted p-3 rounded overflow-x-auto">
{`{
  displayName: "Columns to Watch",
  name: "columnsToWatch",
  type: "custom",
  component: "ColumnSelector",
  componentProps: {
    dependsOn: ["spreadsheetId", "sheetName"],
    credentialField: "googleSheetsOAuth2",
    multiSelect: true
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Complete Node Configuration Example</CardTitle>
          <CardDescription>
            See how all components work together in a real node
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium mb-1">Spreadsheet ID:</p>
                <code className="bg-muted px-2 py-1 rounded text-xs break-all">
                  {spreadsheetId || "Not selected"}
                </code>
              </div>
              <div>
                <p className="font-medium mb-1">Sheet Name:</p>
                <code className="bg-muted px-2 py-1 rounded text-xs">
                  {sheetName || "Not selected"}
                </code>
              </div>
              <div>
                <p className="font-medium mb-1">Range:</p>
                <code className="bg-muted px-2 py-1 rounded text-xs">
                  {range || "Not specified"}
                </code>
              </div>
              <div>
                <p className="font-medium mb-1">Columns:</p>
                <code className="bg-muted px-2 py-1 rounded text-xs">
                  {selectedColumns.length > 0
                    ? `${selectedColumns.length} selected`
                    : "None selected"}
                </code>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Generated Configuration:</p>
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{JSON.stringify(
  {
    spreadsheetId: spreadsheetId || null,
    sheetName: sheetName || null,
    range: range || null,
    columnsToWatch: selectedColumns.length > 0 ? selectedColumns : null,
  },
  null,
  2
)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
