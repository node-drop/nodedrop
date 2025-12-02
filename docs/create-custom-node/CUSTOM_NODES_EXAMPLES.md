# Custom Nodes Examples

This document provides practical examples of custom nodes for different use cases.

## Table of Contents

- [Basic Examples](#basic-examples)
- [Advanced Examples](#advanced-examples)
- [Integration Examples](#integration-examples)
- [Best Practices](#best-practices)

## Basic Examples

### 1. Simple Data Transformer

A basic node that transforms data by adding a timestamp and processing flag.

```typescript
// nodes/data-transformer.node.ts
import { NodeDefinition, NodeInputData, NodeOutputData } from '../types/node.types';

const DataTransformerNode: NodeDefinition = {
  type: 'data-transformer',
  displayName: 'Data Transformer',
  name: 'dataTransformer',
  group: ['transform'],
  version: 1,
  description: 'Transform data by adding metadata',
  icon: 'fa:exchange-alt',
  color: '#FF9800',
  defaults: {
    name: 'Data Transformer',
    addTimestamp: true,
    timestampField: 'processedAt'
  },
  inputs: ['main'],
  outputs: ['main'],
  properties: [
    {
      displayName: 'Add Timestamp',
      name: 'addTimestamp',
      type: 'boolean',
      default: true,
      description: 'Whether to add a timestamp to each item'
    },
    {
      displayName: 'Timestamp Field',
      name: 'timestampField',
      type: 'string',
      default: 'processedAt',
      description: 'Name of the timestamp field',
      displayOptions: {
        show: {
          addTimestamp: [true]
        }
      }
    }
  ],
  execute: async function(inputData: NodeInputData): Promise<NodeOutputData[]> {
    const addTimestamp = this.getNodeParameter('addTimestamp') as boolean;
    const timestampField = this.getNodeParameter('timestampField') as string;
    const items = inputData.main?.[0] || [];

    const processedItems = items.map(item => {
      const newItem = {
        ...item.json,
        processed: true
      };

      if (addTimestamp) {
        newItem[timestampField] = new Date().toISOString();
      }

      return { json: newItem };
    });

    return [{ main: processedItems }];
  }
};

export default DataTransformerNode;
```

### 2. Text Processor

A node that performs various text operations.

```typescript
// nodes/text-processor.node.ts
const TextProcessorNode: NodeDefinition = {
  type: 'text-processor',
  displayName: 'Text Processor',
  name: 'textProcessor',
  group: ['transform'],
  version: 1,
  description: 'Process text data with various operations',
  icon: 'fa:font',
  color: '#2196F3',
  defaults: {
    name: 'Text Processor'
  },
  inputs: ['main'],
  outputs: ['main'],
  properties: [
    {
      displayName: 'Operation',
      name: 'operation',
      type: 'options',
      required: true,
      default: 'uppercase',
      options: [
        { name: 'Uppercase', value: 'uppercase' },
        { name: 'Lowercase', value: 'lowercase' },
        { name: 'Title Case', value: 'titlecase' },
        { name: 'Reverse', value: 'reverse' },
        { name: 'Word Count', value: 'wordcount' }
      ]
    },
    {
      displayName: 'Text Field',
      name: 'textField',
      type: 'string',
      required: true,
      default: 'text',
      description: 'Field containing the text to process'
    },
    {
      displayName: 'Output Field',
      name: 'outputField',
      type: 'string',
      required: false,
      default: '',
      description: 'Field to store the result (leave empty to overwrite input field)'
    }
  ],
  execute: async function(inputData: NodeInputData): Promise<NodeOutputData[]> {
    const operation = this.getNodeParameter('operation') as string;
    const textField = this.getNodeParameter('textField') as string;
    const outputField = this.getNodeParameter('outputField') as string;
    const items = inputData.main?.[0] || [];

    const processedItems = items.map(item => {
      const text = item.json[textField];
      
      if (typeof text !== 'string') {
        this.logger.warn(`Field '${textField}' is not a string`, { item: item.json });
        return item;
      }

      let result: string | number;

      switch (operation) {
        case 'uppercase':
          result = text.toUpperCase();
          break;
        case 'lowercase':
          result = text.toLowerCase();
          break;
        case 'titlecase':
          result = text.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
          );
          break;
        case 'reverse':
          result = text.split('').reverse().join('');
          break;
        case 'wordcount':
          result = text.trim().split(/\s+/).length;
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      const targetField = outputField || textField;
      
      return {
        json: {
          ...item.json,
          [targetField]: result
        }
      };
    });

    return [{ main: processedItems }];
  }
};

export default TextProcessorNode;
```

## Advanced Examples

### 3. HTTP API Client with Authentication

A sophisticated HTTP client node with multiple authentication methods.

```typescript
// nodes/http-client.node.ts
const HttpClientNode: NodeDefinition = {
  type: 'http-client',
  displayName: 'HTTP Client',
  name: 'httpClient',
  group: ['integration'],
  version: 1,
  description: 'Make HTTP requests with authentication support',
  icon: 'fa:globe',
  color: '#4CAF50',
  defaults: {
    name: 'HTTP Client'
  },
  inputs: ['main'],
  outputs: ['main'],
  credentials: [
    {
      name: 'httpAuth',
      displayName: 'HTTP Authentication',
      documentationUrl: 'https://docs.example.com/http-auth',
      properties: [
        {
          displayName: 'Authentication Type',
          name: 'authType',
          type: 'options',
          default: 'none',
          options: [
            { name: 'None', value: 'none' },
            { name: 'Basic Auth', value: 'basic' },
            { name: 'Bearer Token', value: 'bearer' },
            { name: 'API Key', value: 'apikey' }
          ]
        },
        {
          displayName: 'Username',
          name: 'username',
          type: 'string',
          default: '',
          displayOptions: {
            show: { authType: ['basic'] }
          }
        },
        {
          displayName: 'Password',
          name: 'password',
          type: 'string',
          default: '',
          displayOptions: {
            show: { authType: ['basic'] }
          }
        },
        {
          displayName: 'Token',
          name: 'token',
          type: 'string',
          default: '',
          displayOptions: {
            show: { authType: ['bearer'] }
          }
        },
        {
          displayName: 'API Key',
          name: 'apiKey',
          type: 'string',
          default: '',
          displayOptions: {
            show: { authType: ['apikey'] }
          }
        },
        {
          displayName: 'API Key Header',
          name: 'apiKeyHeader',
          type: 'string',
          default: 'X-API-Key',
          displayOptions: {
            show: { authType: ['apikey'] }
          }
        }
      ]
    }
  ],
  properties: [
    {
      displayName: 'Method',
      name: 'method',
      type: 'options',
      required: true,
      default: 'GET',
      options: [
        { name: 'GET', value: 'GET' },
        { name: 'POST', value: 'POST' },
        { name: 'PUT', value: 'PUT' },
        { name: 'DELETE', value: 'DELETE' },
        { name: 'PATCH', value: 'PATCH' }
      ]
    },
    {
      displayName: 'URL',
      name: 'url',
      type: 'string',
      required: true,
      default: '',
      description: 'The URL to make the request to'
    },
    {
      displayName: 'Headers',
      name: 'headers',
      type: 'json',
      default: '{}',
      description: 'Additional headers to send'
    },
    {
      displayName: 'Body',
      name: 'body',
      type: 'json',
      default: '',
      description: 'Request body (for POST, PUT, PATCH)',
      displayOptions: {
        show: {
          method: ['POST', 'PUT', 'PATCH']
        }
      }
    },
    {
      displayName: 'Timeout (ms)',
      name: 'timeout',
      type: 'number',
      default: 30000,
      description: 'Request timeout in milliseconds'
    }
  ],
  execute: async function(inputData: NodeInputData): Promise<NodeOutputData[]> {
    const method = this.getNodeParameter('method') as string;
    const url = this.getNodeParameter('url') as string;
    const headers = JSON.parse(this.getNodeParameter('headers') as string || '{}');
    const body = this.getNodeParameter('body') as string;
    const timeout = this.getNodeParameter('timeout') as number;
    const items = inputData.main?.[0] || [];

    // Get credentials
    const credentials = await this.getCredentials('httpAuth');
    
    // Set up authentication
    if (credentials) {
      switch (credentials.authType) {
        case 'basic':
          const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
          headers['Authorization'] = `Basic ${auth}`;
          break;
        case 'bearer':
          headers['Authorization'] = `Bearer ${credentials.token}`;
          break;
        case 'apikey':
          headers[credentials.apiKeyHeader] = credentials.apiKey;
          break;
      }
    }

    const results = [];

    for (const item of items) {
      try {
        // Replace placeholders in URL and body with item data
        const processedUrl = this.replacePlaceholders(url, item.json);
        const processedBody = body ? this.replacePlaceholders(body, item.json) : undefined;

        const requestOptions = {
          method,
          url: processedUrl,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          timeout,
          ...(processedBody && ['POST', 'PUT', 'PATCH'].includes(method) && {
            body: processedBody
          })
        };

        const response = await this.helpers.request(requestOptions);

        results.push({
          json: {
            ...item.json,
            httpResponse: {
              statusCode: response.statusCode || 200,
              body: response,
              headers: response.headers || {}
            }
          }
        });

      } catch (error) {
        this.logger.error('HTTP request failed', { error, item: item.json });
        
        results.push({
          json: {
            ...item.json,
            httpError: {
              message: error.message,
              statusCode: error.statusCode || 500
            }
          }
        });
      }
    }

    return [{ main: results }];
  },

  // Helper method to replace placeholders
  replacePlaceholders: function(text: string, data: any): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }
};

export default HttpClientNode;
```

### 4. Database Query Node

A node for executing database queries with connection pooling.

```typescript
// nodes/database-query.node.ts
import { Pool } from 'pg'; // PostgreSQL example

const DatabaseQueryNode: NodeDefinition = {
  type: 'database-query',
  displayName: 'Database Query',
  name: 'databaseQuery',
  group: ['database'],
  version: 1,
  description: 'Execute SQL queries against a database',
  icon: 'fa:database',
  color: '#336791',
  defaults: {
    name: 'Database Query'
  },
  inputs: ['main'],
  outputs: ['main'],
  credentials: [
    {
      name: 'postgres',
      displayName: 'PostgreSQL Connection',
      properties: [
        {
          displayName: 'Host',
          name: 'host',
          type: 'string',
          default: 'localhost'
        },
        {
          displayName: 'Port',
          name: 'port',
          type: 'number',
          default: 5432
        },
        {
          displayName: 'Database',
          name: 'database',
          type: 'string',
          required: true
        },
        {
          displayName: 'Username',
          name: 'username',
          type: 'string',
          required: true
        },
        {
          displayName: 'Password',
          name: 'password',
          type: 'string',
          required: true
        }
      ]
    }
  ],
  properties: [
    {
      displayName: 'Operation',
      name: 'operation',
      type: 'options',
      required: true,
      default: 'select',
      options: [
        { name: 'Select', value: 'select' },
        { name: 'Insert', value: 'insert' },
        { name: 'Update', value: 'update' },
        { name: 'Delete', value: 'delete' },
        { name: 'Custom Query', value: 'custom' }
      ]
    },
    {
      displayName: 'Table',
      name: 'table',
      type: 'string',
      required: true,
      default: '',
      displayOptions: {
        show: {
          operation: ['select', 'insert', 'update', 'delete']
        }
      }
    },
    {
      displayName: 'Query',
      name: 'query',
      type: 'string',
      required: true,
      default: '',
      description: 'SQL query to execute',
      displayOptions: {
        show: {
          operation: ['custom']
        }
      }
    },
    {
      displayName: 'Columns',
      name: 'columns',
      type: 'string',
      default: '*',
      description: 'Columns to select (comma-separated)',
      displayOptions: {
        show: {
          operation: ['select']
        }
      }
    },
    {
      displayName: 'Where Condition',
      name: 'whereCondition',
      type: 'string',
      default: '',
      description: 'WHERE clause condition',
      displayOptions: {
        show: {
          operation: ['select', 'update', 'delete']
        }
      }
    }
  ],
  execute: async function(inputData: NodeInputData): Promise<NodeOutputData[]> {
    const operation = this.getNodeParameter('operation') as string;
    const table = this.getNodeParameter('table') as string;
    const customQuery = this.getNodeParameter('query') as string;
    const columns = this.getNodeParameter('columns') as string;
    const whereCondition = this.getNodeParameter('whereCondition') as string;
    const items = inputData.main?.[0] || [];

    // Get database credentials
    const credentials = await this.getCredentials('postgres');
    
    // Create connection pool
    const pool = new Pool({
      host: credentials.host,
      port: credentials.port,
      database: credentials.database,
      user: credentials.username,
      password: credentials.password,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    const results = [];

    try {
      for (const item of items) {
        let query: string;
        let values: any[] = [];

        switch (operation) {
          case 'select':
            query = `SELECT ${columns} FROM ${table}`;
            if (whereCondition) {
              query += ` WHERE ${this.replacePlaceholders(whereCondition, item.json)}`;
            }
            break;

          case 'insert':
            const insertKeys = Object.keys(item.json);
            const insertValues = Object.values(item.json);
            const placeholders = insertKeys.map((_, i) => `$${i + 1}`).join(', ');
            
            query = `INSERT INTO ${table} (${insertKeys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
            values = insertValues;
            break;

          case 'update':
            const updateKeys = Object.keys(item.json);
            const updateValues = Object.values(item.json);
            const updateSet = updateKeys.map((key, i) => `${key} = $${i + 1}`).join(', ');
            
            query = `UPDATE ${table} SET ${updateSet}`;
            if (whereCondition) {
              query += ` WHERE ${this.replacePlaceholders(whereCondition, item.json)}`;
            }
            query += ' RETURNING *';
            values = updateValues;
            break;

          case 'delete':
            query = `DELETE FROM ${table}`;
            if (whereCondition) {
              query += ` WHERE ${this.replacePlaceholders(whereCondition, item.json)}`;
            }
            query += ' RETURNING *';
            break;

          case 'custom':
            query = this.replacePlaceholders(customQuery, item.json);
            break;

          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        this.logger.debug('Executing query', { query, values });

        const result = await pool.query(query, values);

        results.push({
          json: {
            ...item.json,
            queryResult: {
              rows: result.rows,
              rowCount: result.rowCount,
              command: result.command
            }
          }
        });
      }
    } catch (error) {
      this.logger.error('Database query failed', { error });
      throw new Error(`Database query failed: ${error.message}`);
    } finally {
      await pool.end();
    }

    return [{ main: results }];
  },

  replacePlaceholders: function(text: string, data: any): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }
};

export default DatabaseQueryNode;
```

## Integration Examples

### 5. Slack Notification Node

A node for sending messages to Slack channels.

```typescript
// nodes/slack-notification.node.ts
const SlackNotificationNode: NodeDefinition = {
  type: 'slack-notification',
  displayName: 'Slack Notification',
  name: 'slackNotification',
  group: ['communication'],
  version: 1,
  description: 'Send notifications to Slack channels',
  icon: 'fa:slack',
  color: '#4A154B',
  defaults: {
    name: 'Slack Notification'
  },
  inputs: ['main'],
  outputs: ['main'],
  credentials: [
    {
      name: 'slackApi',
      displayName: 'Slack API',
      properties: [
        {
          displayName: 'Bot Token',
          name: 'botToken',
          type: 'string',
          required: true,
          description: 'Slack Bot User OAuth Token'
        }
      ]
    }
  ],
  properties: [
    {
      displayName: 'Channel',
      name: 'channel',
      type: 'string',
      required: true,
      default: '#general',
      description: 'Channel to send message to (# for channels, @ for users)'
    },
    {
      displayName: 'Message',
      name: 'message',
      type: 'string',
      required: true,
      default: '',
      description: 'Message to send'
    },
    {
      displayName: 'Username',
      name: 'username',
      type: 'string',
      default: 'nodeDrop Bot',
      description: 'Bot username to display'
    },
    {
      displayName: 'Icon Emoji',
      name: 'iconEmoji',
      type: 'string',
      default: ':robot_face:',
      description: 'Emoji to use as bot icon'
    },
    {
      displayName: 'Attachments',
      name: 'attachments',
      type: 'json',
      default: '[]',
      description: 'Message attachments (JSON array)'
    }
  ],
  execute: async function(inputData: NodeInputData): Promise<NodeOutputData[]> {
    const channel = this.getNodeParameter('channel') as string;
    const message = this.getNodeParameter('message') as string;
    const username = this.getNodeParameter('username') as string;
    const iconEmoji = this.getNodeParameter('iconEmoji') as string;
    const attachments = JSON.parse(this.getNodeParameter('attachments') as string || '[]');
    const items = inputData.main?.[0] || [];

    const credentials = await this.getCredentials('slackApi');
    
    const results = [];

    for (const item of items) {
      try {
        const processedMessage = this.replacePlaceholders(message, item.json);
        
        const payload = {
          channel,
          text: processedMessage,
          username,
          icon_emoji: iconEmoji,
          attachments: attachments.map((attachment: any) => ({
            ...attachment,
            text: attachment.text ? this.replacePlaceholders(attachment.text, item.json) : undefined,
            title: attachment.title ? this.replacePlaceholders(attachment.title, item.json) : undefined
          }))
        };

        const response = await this.helpers.request({
          method: 'POST',
          url: 'https://slack.com/api/chat.postMessage',
          headers: {
            'Authorization': `Bearer ${credentials.botToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Slack API error: ${response.error}`);
        }

        results.push({
          json: {
            ...item.json,
            slackResponse: {
              success: true,
              channel: response.channel,
              timestamp: response.ts,
              message: response.message
            }
          }
        });

      } catch (error) {
        this.logger.error('Slack notification failed', { error, item: item.json });
        
        results.push({
          json: {
            ...item.json,
            slackResponse: {
              success: false,
              error: error.message
            }
          }
        });
      }
    }

    return [{ main: results }];
  },

  replacePlaceholders: function(text: string, data: any): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }
};

export default SlackNotificationNode;
```

### 6. File Processor Node

A node for reading and processing files.

```typescript
// nodes/file-processor.node.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import * as csv from 'csv-parser';

const FileProcessorNode: NodeDefinition = {
  type: 'file-processor',
  displayName: 'File Processor',
  name: 'fileProcessor',
  group: ['file'],
  version: 1,
  description: 'Read and process files (CSV, JSON, TXT)',
  icon: 'fa:file',
  color: '#795548',
  defaults: {
    name: 'File Processor'
  },
  inputs: ['main'],
  outputs: ['main'],
  properties: [
    {
      displayName: 'Operation',
      name: 'operation',
      type: 'options',
      required: true,
      default: 'read',
      options: [
        { name: 'Read File', value: 'read' },
        { name: 'Write File', value: 'write' },
        { name: 'List Directory', value: 'list' }
      ]
    },
    {
      displayName: 'File Path',
      name: 'filePath',
      type: 'string',
      required: true,
      default: '',
      description: 'Path to the file or directory'
    },
    {
      displayName: 'File Format',
      name: 'fileFormat',
      type: 'options',
      default: 'json',
      options: [
        { name: 'JSON', value: 'json' },
        { name: 'CSV', value: 'csv' },
        { name: 'Text', value: 'text' }
      ],
      displayOptions: {
        show: {
          operation: ['read', 'write']
        }
      }
    },
    {
      displayName: 'Encoding',
      name: 'encoding',
      type: 'options',
      default: 'utf8',
      options: [
        { name: 'UTF-8', value: 'utf8' },
        { name: 'ASCII', value: 'ascii' },
        { name: 'Base64', value: 'base64' }
      ],
      displayOptions: {
        show: {
          operation: ['read', 'write']
        }
      }
    }
  ],
  execute: async function(inputData: NodeInputData): Promise<NodeOutputData[]> {
    const operation = this.getNodeParameter('operation') as string;
    const filePath = this.getNodeParameter('filePath') as string;
    const fileFormat = this.getNodeParameter('fileFormat') as string;
    const encoding = this.getNodeParameter('encoding') as BufferEncoding;
    const items = inputData.main?.[0] || [];

    const results = [];

    for (const item of items) {
      try {
        const processedPath = this.replacePlaceholders(filePath, item.json);

        switch (operation) {
          case 'read':
            const fileContent = await fs.readFile(processedPath, encoding);
            let parsedContent: any;

            switch (fileFormat) {
              case 'json':
                parsedContent = JSON.parse(fileContent);
                break;
              case 'csv':
                parsedContent = await this.parseCsv(fileContent);
                break;
              case 'text':
                parsedContent = fileContent;
                break;
            }

            results.push({
              json: {
                ...item.json,
                fileContent: parsedContent,
                filePath: processedPath,
                fileSize: (await fs.stat(processedPath)).size
              }
            });
            break;

          case 'write':
            let contentToWrite: string;

            switch (fileFormat) {
              case 'json':
                contentToWrite = JSON.stringify(item.json, null, 2);
                break;
              case 'csv':
                contentToWrite = this.jsonToCsv([item.json]);
                break;
              case 'text':
                contentToWrite = String(item.json.content || '');
                break;
            }

            await fs.writeFile(processedPath, contentToWrite, encoding);

            results.push({
              json: {
                ...item.json,
                writeResult: {
                  success: true,
                  filePath: processedPath,
                  bytesWritten: Buffer.byteLength(contentToWrite, encoding)
                }
              }
            });
            break;

          case 'list':
            const files = await fs.readdir(processedPath, { withFileTypes: true });
            const fileList = files.map(file => ({
              name: file.name,
              isDirectory: file.isDirectory(),
              isFile: file.isFile(),
              path: path.join(processedPath, file.name)
            }));

            results.push({
              json: {
                ...item.json,
                files: fileList,
                directoryPath: processedPath,
                fileCount: fileList.length
              }
            });
            break;
        }

      } catch (error) {
        this.logger.error('File operation failed', { error, item: item.json });
        
        results.push({
          json: {
            ...item.json,
            fileError: {
              message: error.message,
              operation,
              filePath: this.replacePlaceholders(filePath, item.json)
            }
          }
        });
      }
    }

    return [{ main: results }];
  },

  parseCsv: function(csvContent: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = require('stream');
      const readable = new stream.Readable();
      readable.push(csvContent);
      readable.push(null);

      readable
        .pipe(csv())
        .on('data', (data: any) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  },

  jsonToCsv: function(jsonArray: any[]): string {
    if (jsonArray.length === 0) return '';
    
    const headers = Object.keys(jsonArray[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of jsonArray) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  },

  replacePlaceholders: function(text: string, data: any): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }
};

export default FileProcessorNode;
```

## Best Practices

### Error Handling

```typescript
execute: async function(inputData: NodeInputData): Promise<NodeOutputData[]> {
  const items = inputData.main?.[0] || [];
  const results = [];

  for (const item of items) {
    try {
      // Your node logic here
      const result = await this.processItem(item);
      
      results.push({
        json: {
          ...item.json,
          ...result
        }
      });
    } catch (error) {
      // Log the error
      this.logger.error('Item processing failed', { 
        error: error.message, 
        stack: error.stack,
        item: item.json 
      });

      // Decide whether to fail the entire execution or continue
      if (this.getNodeParameter('continueOnFail') as boolean) {
        results.push({
          json: {
            ...item.json,
            error: {
              message: error.message,
              timestamp: new Date().toISOString()
            }
          }
        });
      } else {
        throw error; // Fail the entire execution
      }
    }
  }

  return [{ main: results }];
}
```

### Input Validation

```typescript
execute: async function(inputData: NodeInputData): Promise<NodeOutputData[]> {
  // Validate required parameters
  const requiredParam = this.getNodeParameter('requiredParam') as string;
  if (!requiredParam) {
    throw new Error('Required parameter is missing');
  }

  // Validate input data structure
  const items = inputData.main?.[0] || [];
  if (items.length === 0) {
    this.logger.warn('No input items to process');
    return [{ main: [] }];
  }

  // Validate each item
  for (const item of items) {
    if (!item.json || typeof item.json !== 'object') {
      throw new Error('Invalid input item: must be an object');
    }
  }

  // Continue with processing...
}
```

### Resource Management

```typescript
execute: async function(inputData: NodeInputData): Promise<NodeOutputData[]> {
  let connection;
  
  try {
    // Acquire resources
    connection = await this.createConnection();
    
    // Process items
    const results = await this.processItems(inputData, connection);
    
    return results;
  } catch (error) {
    this.logger.error('Execution failed', { error });
    throw error;
  } finally {
    // Always clean up resources
    if (connection) {
      await connection.close();
    }
  }
}
```

### Testing Your Nodes

```typescript
// __tests__/my-node.test.ts
import MyNode from '../nodes/my-node.node';

describe('MyNode', () => {
  let mockContext: any;

  beforeEach(() => {
    mockContext = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn(),
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      },
      helpers: {
        request: jest.fn()
      }
    };
  });

  it('should process data correctly', async () => {
    // Setup
    mockContext.getNodeParameter.mockImplementation((param: string) => {
      switch (param) {
        case 'operation': return 'process';
        case 'field': return 'data';
        default: return undefined;
      }
    });

    const inputData = {
      main: [[
        { json: { data: 'test', id: 1 } },
        { json: { data: 'example', id: 2 } }
      ]]
    };

    // Execute
    const result = await MyNode.execute.call(mockContext, inputData);

    // Assert
    expect(result).toBeDefined();
    expect(result[0].main).toHaveLength(2);
    expect(result[0].main[0].json.processed).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    // Setup error condition
    mockContext.getNodeParameter.mockImplementation(() => {
      throw new Error('Parameter error');
    });

    const inputData = { main: [[{ json: {} }]] };

    // Execute and expect error
    await expect(
      MyNode.execute.call(mockContext, inputData)
    ).rejects.toThrow('Parameter error');
  });
});
```

---

These examples demonstrate various patterns and best practices for creating custom nodes. Use them as starting points for your own node de