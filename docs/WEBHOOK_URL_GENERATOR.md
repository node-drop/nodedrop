# Webhook URL Generator Component

## Overview

The Webhook URL Generator is a custom component for the Webhook Trigger node that provides pre-generated webhook URLs for both test and production environments with easy copy functionality.

## Features

- **Automatic URL Generation**: Automatically generates unique webhook IDs using UUID v4
- **Dual Environment Support**: Separate URLs for test (localhost) and production environments
- **Copy to Clipboard**: One-click copy functionality for both test and production URLs
- **Visual Feedback**: Success indicators when URLs are copied
- **Regeneration**: Ability to regenerate webhook IDs if needed (with warning)
- **Path Support**: Automatically appends optional paths to webhook URLs
- **Responsive UI**: Clean, card-based interface with color-coded environments

## Usage

### In Node Definition

The component is integrated into the Webhook Trigger node definition:

```typescript
{
  displayName: "Webhook URL",
  name: "webhookUrl",
  type: "custom",
  required: false,
  default: "",
  description: "Generated webhook URL for test and production environments",
  component: "WebhookUrlGenerator",
  componentProps: {
    mode: "test",
  },
}
```

### Component Props

| Prop       | Type                     | Default  | Description                      |
| ---------- | ------------------------ | -------- | -------------------------------- |
| `value`    | `string`                 | `""`     | The webhook ID (UUID)            |
| `onChange` | `function`               | -        | Callback when webhook ID changes |
| `disabled` | `boolean`                | `false`  | Disable all interactions         |
| `path`     | `string`                 | `""`     | Optional path to append to URLs  |
| `mode`     | `"test" \| "production"` | `"test"` | Initial display mode             |

### Environment Variables

The component uses the following environment variables for URL generation:

#### Test Environment

- `VITE_WEBHOOK_TEST_URL` - Primary test webhook URL
- `VITE_API_URL` - Falls back to API URL with `/webhook` path
- Default: `http://localhost:4000/webhook`

#### Production Environment

- `VITE_WEBHOOK_PROD_URL` - Primary production webhook URL
- `VITE_WEBHOOK_BASE_URL` - Alternative production URL
- Default: `https://your-domain.com/webhook`

### Frontend .env Configuration

```env
# Test Environment
VITE_WEBHOOK_TEST_URL=http://localhost:4000/webhook
VITE_API_URL=http://localhost:4000/api

# Production Environment
VITE_WEBHOOK_PROD_URL=https://your-production-domain.com/webhook
VITE_WEBHOOK_BASE_URL=https://your-production-domain.com/webhook
```

### Backend .env Configuration

```env
# Webhook base URL for production
WEBHOOK_BASE_URL=http://localhost:4000/webhook
```

## URL Structure

The generated webhook URLs follow this pattern:

```
{baseUrl}/{webhookId}/{path?}
```

### Examples

**Test URL (without path):**

```
http://localhost:4000/webhook/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Production URL (with path):**

```
https://your-domain.com/webhook/a1b2c3d4-e5f6-7890-abcd-ef1234567890/custom-path
```

## User Interface

### Mode Selector

- **Test URL Button**: Displays test environment (blue theme)
- **Production URL Button**: Displays production environment (green theme)

### URL Display Cards

#### Test Environment (Blue)

- Shows "localhost" badge
- Blue-themed card with test URL
- Copy button with success feedback
- Helper text for development use

#### Production Environment (Green)

- Shows "live" badge
- Green-themed card with production URL
- Copy button with success feedback
- Helper text for production use

### Webhook ID Section

- Read-only display of current webhook ID
- "Regenerate" button to create new ID
- Warning message about invalidating old URLs

### Info Box

- Instructions on how to use webhook URLs
- 4-step guide for integration

## Integration Flow

1. **User Opens Webhook Trigger Node**

   - Component auto-generates a unique webhook ID
   - Test and production URLs are displayed

2. **User Selects Environment**

   - Clicks "Test URL" or "Production URL" button
   - Corresponding card is displayed

3. **User Copies URL**

   - Clicks copy button
   - URL is copied to clipboard
   - Success checkmark appears for 2 seconds

4. **URL is Saved**
   - Webhook ID (value) is saved in node parameters as `webhookUrl`
   - Backend uses this ID to register webhook

## Backend Integration

### TriggerService Updates

The `TriggerService` has been updated to handle the webhook URL parameter:

```typescript
private async activateWebhookTrigger(trigger: TriggerDefinition): Promise<void> {
  // Use webhookUrl parameter as webhookId if provided
  if (!trigger.settings.webhookId) {
    if (trigger.settings.webhookUrl && typeof trigger.settings.webhookUrl === 'string') {
      trigger.settings.webhookId = trigger.settings.webhookUrl;
    } else {
      trigger.settings.webhookId = uuidv4();
    }
  }

  // Store webhook trigger for lookup
  if (trigger.settings.webhookId) {
    this.webhookTriggers.set(trigger.settings.webhookId, trigger);
  }
}
```

### TriggerSettings Interface

```typescript
export interface TriggerSettings {
  webhookId?: string;        // Internal webhook ID
  webhookUrl?: string;       // Generated webhook ID from frontend
  httpMethod?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path?: string;
  authentication?: {...};
  // ... other settings
}
```

## Component Registration

The component is registered in the custom component registry:

```typescript
// frontend/src/components/ui/form-generator/customComponentRegistry.ts
import { WebhookUrlGenerator } from "@/components/workflow/node-config/custom-fields";

export const customFieldComponents: Record<string, any> = {
  // ... other components
  WebhookUrlGenerator,
};
```

## Copy Functionality

The component implements clipboard API with fallback for older browsers:

```typescript
const copyToClipboard = async (text: string, type: "test" | "production") => {
  try {
    // Modern clipboard API
    await navigator.clipboard.writeText(text);
    // Show success indicator
  } catch (error) {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
};
```

## Best Practices

1. **Environment Separation**: Always use test URLs during development and production URLs in live environments
2. **URL Security**: Keep webhook URLs private as they can trigger workflow executions
3. **Path Usage**: Use paths to create logical groupings of webhooks
4. **Regeneration**: Only regenerate webhook IDs when absolutely necessary as it invalidates existing integrations
5. **Documentation**: Document webhook URLs shared with external services

## Security Considerations

- Webhook IDs are UUIDs (v4) providing ~128 bits of entropy
- URLs should be treated as secrets and transmitted securely
- Consider enabling authentication in webhook trigger settings
- Monitor webhook execution logs for suspicious activity
- Rotate webhook IDs periodically for sensitive workflows

## Troubleshooting

### URL Not Working

- Verify backend server is running
- Check environment variables are set correctly
- Ensure webhook ID matches in both frontend and backend
- Verify workflow is active

### Copy Not Working

- Check browser permissions for clipboard access
- Try the fallback selection method
- Ensure HTTPS in production (required for clipboard API)

### Wrong URL Format

- Verify `.env` files have correct base URLs
- Check for trailing slashes in environment variables
- Ensure path parameter doesn't start with `/`

## Future Enhancements

- [ ] QR code generation for mobile testing
- [ ] Webhook testing interface
- [ ] Request history viewer
- [ ] Custom domain support
- [ ] URL shortening integration
- [ ] Webhook analytics
