# Custom Nodes API Documentation

## Overview

The Custom Nodes API provides endpoints for managing, creating, and deploying custom nodes in the node drop platform. All endpoints require authentication unless otherwise specified.

## Base URL

```
http://localhost:4000/api/custom-nodes
```

## Authentication

All API endpoints require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Package Management

#### Get Loaded Packages

Retrieve all currently loaded custom node packages.

```http
GET /packages
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "my-custom-node",
      "version": "1.0.0",
      "description": "A custom node for processing data",
      "author": "John Doe",
      "main": "index.js",
      "nodes": ["nodes/MyNode.node.js"],
      "credentials": ["credentials/MyApi.credentials.js"],
      "keywords": ["automation", "data"]
    }
  ],
  "count": 1
}
```

#### Validate Package

Validate the structure and configuration of a custom node package.

```http
POST /packages/validate
```

**Request Body:**
```json
{
  "packagePath": "/path/to/custom-node-package"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": [
      "TypeScript file detected: nodes/MyNode.node.ts. Make sure to compile before loading."
    ],
    "packageInfo": {
      "name": "my-custom-node",
      "version": "1.0.0",
      "description": "A custom node",
      "main": "index.js",
      "nodes": ["nodes/MyNode.node.js"]
    }
  }
}
```

**Error Response:**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "errors": [
      "Package name is required",
      "Node file not found: nodes/MyNode.node.js"
    ],
    "warnings": []
  }
}
```

#### Load Package

Load a custom node package into the system.

```http
POST /packages/load
```

**Request Body:**
```json
{
  "packagePath": "/path/to/custom-node-package"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "nodeType": "my-custom-node",
    "warnings": []
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to load package",
  "details": [
    "Invalid node definition format",
    "Node validation failed: Execute function is required"
  ]
}
```

#### Unload Package

Remove a loaded custom node package from the system.

```http
DELETE /packages/:packageName
```

**Parameters:**
- `packageName` (string): Name of the package to unload

**Response:**
```json
{
  "success": true,
  "message": "Package my-custom-node unloaded successfully"
}
```

#### Reload Package

Reload a custom node package (useful for development).

```http
POST /packages/:packageName/reload
```

**Parameters:**
- `packageName` (string): Name of the package to reload

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "nodeType": "my-custom-node",
    "warnings": []
  },
  "message": "Package my-custom-node reloaded successfully"
}
```

### Template Generation

#### Generate Node Package

Create a new custom node package from a template.

```http
POST /generate
```

**Request Body:**
```json
{
  "name": "my-new-node",
  "displayName": "My New Node",
  "description": "A new custom node for automation",
  "type": "action",
  "author": "John Doe",
  "version": "1.0.0",
  "group": "transform,integration",
  "includeCredentials": true,
  "includeTests": true,
  "typescript": true,
  "outputPath": "/path/to/output/directory"
}
```

**Parameters:**
- `name` (string, required): Node name (kebab-case)
- `displayName` (string, required): Human-readable name
- `description` (string, required): Node description
- `type` (string, required): Node type (`action`, `trigger`, `transform`)
- `author` (string, optional): Author name
- `version` (string, optional): Initial version (default: "1.0.0")
- `group` (string, optional): Comma-separated list of groups
- `includeCredentials` (boolean, optional): Include credentials template
- `includeTests` (boolean, optional): Include test files (default: true)
- `typescript` (boolean, optional): Use TypeScript (default: true)
- `outputPath` (string, optional): Output directory (default: current directory)

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "packagePath": "/path/to/output/my-new-node",
    "warnings": []
  },
  "message": "Node package generated successfully"
}
```

### Compilation

#### Compile Package

Compile a TypeScript node package to JavaScript.

```http
POST /compile
```

**Request Body:**
```json
{
  "packagePath": "/path/to/typescript-package"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "compiledPath": "/path/to/typescript-package/dist",
    "warnings": [
      "TypeScript Warning: Unused variable 'example'"
    ]
  },
  "message": "Package compiled successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to compile package",
  "details": [
    "TypeScript Error: Cannot find module 'missing-dependency'",
    "TypeScript Error: Property 'invalidProp' does not exist"
  ]
}
```

### Marketplace

#### Search Marketplace

Search for available nodes in the marketplace.

```http
GET /marketplace/search
```

**Query Parameters:**
- `query` (string, optional): Search query
- `category` (string, optional): Filter by category
- `author` (string, optional): Filter by author
- `verified` (boolean, optional): Show only verified packages
- `minRating` (number, optional): Minimum rating filter
- `tags` (string, optional): Comma-separated list of tags
- `sortBy` (string, optional): Sort by (`relevance`, `downloads`, `rating`, `updated`, `created`)
- `sortOrder` (string, optional): Sort order (`asc`, `desc`)
- `limit` (number, optional): Number of results per page
- `offset` (number, optional): Pagination offset

**Example:**
```http
GET /marketplace/search?query=http&verified=true&sortBy=downloads&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "packages": [
      {
        "id": "http-request-node",
        "name": "http-request-node",
        "version": "2.1.0",
        "description": "Advanced HTTP request node with authentication",
        "author": "NodeDev Team",
        "keywords": ["http", "api", "request"],
        "downloadUrl": "https://marketplace.example.com/packages/http-request-node/2.1.0",
        "homepage": "https://github.com/example/http-request-node",
        "license": "MIT",
        "createdAt": "2023-01-15T10:00:00Z",
        "updatedAt": "2023-12-01T15:30:00Z",
        "downloads": 15420,
        "rating": 4.8,
        "ratingCount": 156,
        "verified": true,
        "nodeTypes": ["http-request"],
        "credentialTypes": ["httpAuth", "oauth2"]
      }
    ],
    "total": 1,
    "hasMore": false
  }
}
```

#### Get Package Info

Get detailed information about a specific marketplace package.

```http
GET /marketplace/packages/:packageId
```

**Parameters:**
- `packageId` (string): Package identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "http-request-node",
    "name": "http-request-node",
    "version": "2.1.0",
    "description": "Advanced HTTP request node with authentication support",
    "author": "NodeDev Team",
    "keywords": ["http", "api", "request", "authentication"],
    "downloadUrl": "https://marketplace.example.com/packages/http-request-node/2.1.0",
    "homepage": "https://github.com/example/http-request-node",
    "repository": "https://github.com/example/http-request-node.git",
    "license": "MIT",
    "createdAt": "2023-01-15T10:00:00Z",
    "updatedAt": "2023-12-01T15:30:00Z",
    "downloads": 15420,
    "rating": 4.8,
    "ratingCount": 156,
    "verified": true,
    "screenshots": [
      "https://marketplace.example.com/screenshots/http-request-1.png"
    ],
    "readme": "# HTTP Request Node\n\nAdvanced HTTP request node...",
    "changelog": "## v2.1.0\n- Added OAuth2 support\n- Fixed timeout issues",
    "dependencies": {
      "axios": "^1.0.0"
    },
    "engines": {
      "node": ">=18.0.0"
    },
    "nodeTypes": ["http-request"],
    "credentialTypes": ["httpAuth", "oauth2"]
  }
}
```

#### Install Package

Install a package from the marketplace.

```http
POST /marketplace/install
```

**Request Body:**
```json
{
  "packageId": "http-request-node",
  "version": "2.1.0",
  "force": false,
  "skipValidation": false
}
```

**Parameters:**
- `packageId` (string, required): Package identifier
- `version` (string, optional): Specific version to install
- `force` (boolean, optional): Force reinstall if already installed
- `skipValidation` (boolean, optional): Skip package validation

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "packagePath": "/app/custom-nodes/http-request-node",
    "version": "2.1.0"
  },
  "message": "Package installed and loaded successfully"
}
```

#### Publish Package

Publish a package to the marketplace.

```http
POST /marketplace/publish
```

**Request Body:**
```json
{
  "packagePath": "/path/to/my-package",
  "version": "1.0.0",
  "changelog": "Initial release with basic functionality",
  "tags": "automation,data-processing,api",
  "private": false,
  "dryRun": false
}
```

**Parameters:**
- `packagePath` (string, required): Path to the package directory
- `version` (string, optional): Version to publish
- `changelog` (string, optional): Release notes
- `tags` (string, optional): Comma-separated tags
- `private` (boolean, optional): Private package flag
- `dryRun` (boolean, optional): Validate without publishing

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "packageId": "my-package",
    "version": "1.0.0",
    "downloadUrl": "https://marketplace.example.com/packages/my-package/1.0.0"
  },
  "message": "Package published successfully"
}
```

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message",
  "details": ["Detailed error 1", "Detailed error 2"]
}
```

### Common HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Package operations**: 10 requests per minute
- **Marketplace search**: 60 requests per minute
- **Template generation**: 5 requests per minute

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1640995200
```

## WebSocket Events

Real-time updates are available via WebSocket connection:

### Package Events

```javascript
// Package loaded
{
  "event": "package:loaded",
  "data": {
    "packageName": "my-custom-node",
    "nodeType": "my-custom-node"
  }
}

// Package unloaded
{
  "event": "package:unloaded",
  "data": {
    "packageName": "my-custom-node"
  }
}

// Package error
{
  "event": "package:error",
  "data": {
    "packageName": "my-custom-node",
    "error": "Failed to load package"
  }
}
```

### Hot Reload Events

```javascript
// File changed (development mode)
{
  "event": "hotreload:changed",
  "data": {
    "packageName": "my-custom-node",
    "filePath": "/path/to/changed/file.ts"
  }
}

// Package reloaded
{
  "event": "hotreload:reloaded",
  "data": {
    "packageName": "my-custom-node",
    "success": true
  }
}
```

## SDK Usage Examples

### JavaScript/TypeScript

```typescript
import { CustomNodeService } from './services/customNode';

const nodeService = new CustomNodeService();

// Load a package
const result = await nodeService.loadPackage('/path/to/package');
if (result.success) {
  console.log('Package loaded:', result.nodeType);
}

// Search marketplace
const searchResults = await nodeService.searchMarketplace({
  query: 'http',
  verified: true,
  limit: 10
});

console.log('Found packages:', searchResults.packages.length);
```

### cURL Examples

```bash
# Get loaded packages
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/custom-nodes/packages

# Load a package
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"packagePath": "/path/to/package"}' \
  http://localhost:4000/api/custom-nodes/packages/load

# Search marketplace
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/custom-nodes/marketplace/search?query=http&verified=true"
```

## Changelog

### v1.0.0
- Initial API release
- Package management endpoints
- Template generation
- Marketplace integration
- Hot reload support

---

For more information, see the [Custom Nodes Documentation](CUSTOM_NODES.md).