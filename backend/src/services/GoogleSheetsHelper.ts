/**
 * Google Sheets API Helper Service
 * Provides utilities for interacting with Google Sheets API
 */

const logger = {
  error: (message: string, extra?: any) => console.error(message, extra),
  info: (message: string, extra?: any) => {}, // Disabled for cleaner output
  warn: (message: string, extra?: any) => console.warn(message, extra),
  debug: (message: string, extra?: any) => {}, // Disabled for cleaner output
};

export interface GoogleSheetsCredentials {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
}

export interface SpreadsheetMetadata {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
  sheets?: SheetMetadata[];
}

export interface SheetMetadata {
  id: number;
  title: string;
  index: number;
  rowCount?: number;
  columnCount?: number;
}

export interface ColumnMetadata {
  name: string;
  index: number;
  letter: string;
  type?: string;
  sampleValues?: string[];
}

export interface SheetData {
  values: any[][];
  headers?: string[];
  range: string;
}

export interface ChangeDetectionResult {
  changes: RowChange[];
  lastChecksum: string;
}

export interface RowChange {
  rowNumber: number;
  changeType: "added" | "updated" | "deleted";
  data: Record<string, any>;
  columnsChanged?: string[];
}

export class GoogleSheetsHelper {
  private static readonly BASE_URL = "https://sheets.googleapis.com/v4";
  private static readonly DRIVE_API_URL = "https://www.googleapis.com/drive/v3";

  /**
   * Get list of spreadsheets accessible to the user
   */
  static async listSpreadsheets(
    credentials: GoogleSheetsCredentials,
    pageSize: number = 100
  ): Promise<SpreadsheetMetadata[]> {
    try {
      const response = await this.makeRequest(
        `${this.DRIVE_API_URL}/files`,
        {
          q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
          pageSize: pageSize.toString(),
          fields: "files(id,name,modifiedTime,webViewLink)",
          orderBy: "modifiedTime desc",
        },
        credentials
      );

      return (
        response.files?.map((file: any) => ({
          id: file.id,
          name: file.name,
          modifiedTime: file.modifiedTime,
          webViewLink: file.webViewLink,
        })) || []
      );
    } catch (error) {
      logger.error("Failed to list spreadsheets", { error });
      throw new Error("Failed to fetch spreadsheets from Google Drive");
    }
  }

  /**
   * Get spreadsheet metadata including sheets
   */
  static async getSpreadsheetMetadata(
    spreadsheetId: string,
    credentials: GoogleSheetsCredentials
  ): Promise<SpreadsheetMetadata> {
    try {
      const response = await this.makeRequest(
        `${this.BASE_URL}/spreadsheets/${spreadsheetId}`,
        { fields: "spreadsheetId,properties,sheets" },
        credentials
      );

      return {
        id: response.spreadsheetId,
        name: response.properties.title,
        sheets:
          response.sheets?.map((sheet: any) => ({
            id: sheet.properties.sheetId,
            title: sheet.properties.title,
            index: sheet.properties.index,
            rowCount: sheet.properties.gridProperties?.rowCount,
            columnCount: sheet.properties.gridProperties?.columnCount,
          })) || [],
      };
    } catch (error) {
      logger.error("Failed to get spreadsheet metadata", {
        spreadsheetId,
        error,
      });
      throw new Error("Failed to fetch spreadsheet metadata");
    }
  }

  /**
   * Get columns from a sheet (headers and metadata)
   */
  static async getColumns(
    spreadsheetId: string,
    sheetName: string,
    credentials: GoogleSheetsCredentials,
    hasHeader: boolean = true
  ): Promise<ColumnMetadata[]> {
    try {
      // Get first 2 rows (header + sample data)
      const range = hasHeader ? `${sheetName}!1:2` : `${sheetName}!1:1`;
      const data = await this.getSheetData(spreadsheetId, range, credentials);

      const columns: ColumnMetadata[] = [];
      const headers = hasHeader ? data.values[0] || [] : [];
      const sampleRow = hasHeader ? data.values[1] || [] : data.values[0] || [];

      const maxCols = Math.max(headers.length, sampleRow.length);

      for (let i = 0; i < maxCols; i++) {
        const letter = this.columnIndexToLetter(i);
        const name = hasHeader && headers[i] ? headers[i] : `Column ${letter}`;
        const sampleValue = sampleRow[i];

        columns.push({
          name,
          index: i,
          letter,
          type: this.detectType(sampleValue),
          sampleValues: sampleValue ? [sampleValue] : [],
        });
      }

      return columns;
    } catch (error) {
      logger.error("Failed to get columns", {
        spreadsheetId,
        sheetName,
        error,
      });
      throw new Error("Failed to fetch column metadata");
    }
  }

  /**
   * Get data from a sheet
   */
  static async getSheetData(
    spreadsheetId: string,
    range: string,
    credentials: GoogleSheetsCredentials
  ): Promise<SheetData> {
    try {
      const response = await this.makeRequest(
        `${
          this.BASE_URL
        }/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
        {},
        credentials
      );

      return {
        values: response.values || [],
        range: response.range,
      };
    } catch (error) {
      logger.error("Failed to get sheet data", {
        spreadsheetId,
        range,
        error,
      });
      throw new Error("Failed to fetch sheet data");
    }
  }

  /**
   * Detect changes in sheet data
   */
  static detectChanges(
    previousData: any[][],
    currentData: any[][],
    hasHeader: boolean = true
  ): RowChange[] {
    const changes: RowChange[] = [];
    const startRow = hasHeader ? 1 : 0;
    const headers = hasHeader ? previousData[0] || [] : [];

    // Detect new rows
    if (currentData.length > previousData.length) {
      for (let i = previousData.length; i < currentData.length; i++) {
        changes.push({
          rowNumber: i + 1,
          changeType: "added",
          data: this.rowToObject(currentData[i], headers, hasHeader),
        });
      }
    }

    // Detect deleted rows
    if (currentData.length < previousData.length) {
      for (let i = currentData.length; i < previousData.length; i++) {
        changes.push({
          rowNumber: i + 1,
          changeType: "deleted",
          data: this.rowToObject(previousData[i], headers, hasHeader),
        });
      }
    }

    // Detect updated rows
    const minLength = Math.min(currentData.length, previousData.length);
    for (let i = startRow; i < minLength; i++) {
      const prevRow = previousData[i] || [];
      const currRow = currentData[i] || [];

      if (JSON.stringify(prevRow) !== JSON.stringify(currRow)) {
        const columnsChanged: string[] = [];

        for (let j = 0; j < Math.max(prevRow.length, currRow.length); j++) {
          if (prevRow[j] !== currRow[j]) {
            const columnName = hasHeader
              ? headers[j] || `Column ${j}`
              : `Column ${j}`;
            columnsChanged.push(columnName);
          }
        }

        changes.push({
          rowNumber: i + 1,
          changeType: "updated",
          data: this.rowToObject(currRow, headers, hasHeader),
          columnsChanged,
        });
      }
    }

    return changes;
  }

  /**
   * Convert row array to object with headers
   */
  static rowToObject(
    row: any[],
    headers: string[],
    hasHeader: boolean
  ): Record<string, any> {
    if (!hasHeader || headers.length === 0) {
      return { values: row };
    }

    const obj: Record<string, any> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i] !== undefined ? row[i] : null;
    }
    return obj;
  }

  /**
   * Apply filters to row data
   */
  static applyFilters(
    data: Record<string, any>,
    filters: any[],
    filterMode: "and" | "or" = "and"
  ): boolean {
    if (!filters || filters.length === 0) return true;

    const results = filters.map((filter) => {
      const value = data[filter.column];
      const compareValue = filter.value;

      switch (filter.condition) {
        case "equals":
          return value == compareValue;
        case "notEquals":
          return value != compareValue;
        case "contains":
          return String(value).includes(String(compareValue));
        case "notContains":
          return !String(value).includes(String(compareValue));
        case "startsWith":
          return String(value).startsWith(String(compareValue));
        case "endsWith":
          return String(value).endsWith(String(compareValue));
        case "greaterThan":
          return Number(value) > Number(compareValue);
        case "lessThan":
          return Number(value) < Number(compareValue);
        case "isEmpty":
          return !value || String(value).trim() === "";
        case "isNotEmpty":
          return value && String(value).trim() !== "";
        case "regex":
          try {
            return new RegExp(compareValue).test(String(value));
          } catch {
            return false;
          }
        default:
          return true;
      }
    });

    return filterMode === "and"
      ? results.every((r) => r)
      : results.some((r) => r);
  }

  /**
   * Convert column index to letter (0 -> A, 25 -> Z, 26 -> AA)
   */
  static columnIndexToLetter(index: number): string {
    let letter = "";
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }

  /**
   * Detect data type from value
   */
  private static detectType(value: any): string {
    if (value === null || value === undefined || value === "") return "empty";
    if (!isNaN(value) && !isNaN(parseFloat(value))) return "number";
    if (value === "true" || value === "false") return "boolean";
    if (this.isDate(value)) return "date";
    return "string";
  }

  /**
   * Check if value is a date
   */
  private static isDate(value: any): boolean {
    const date = new Date(value);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Make authenticated request to Google API
   */
  private static async makeRequest(
    url: string,
    params: Record<string, string>,
    credentials: GoogleSheetsCredentials
  ): Promise<any> {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // Log the error response body for debugging
      const errorBody = await response.text();

      // Handle token refresh if needed
      if (response.status === 401 && credentials.refreshToken) {
        const newToken = await this.refreshAccessToken(credentials);
        credentials.accessToken = newToken;

        // Retry request with new token
        const retryResponse = await fetch(fullUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${newToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!retryResponse.ok) {
          const retryErrorBody = await retryResponse.text();
          throw new Error(
            `Google API error: ${retryResponse.statusText} - ${retryErrorBody}`
          );
        }

        return retryResponse.json();
      }

      throw new Error(
        `Google API error: ${response.statusText} - ${errorBody}`
      );
    }

    return response.json();
  }

  /**
   * Refresh OAuth2 access token
   */
  private static async refreshAccessToken(
    credentials: GoogleSheetsCredentials
  ): Promise<string> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        refresh_token: credentials.refreshToken!,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh access token");
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }
}
