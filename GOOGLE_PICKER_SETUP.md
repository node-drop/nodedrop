# Google Picker Integration Guide

This guide explains how to set up and use the Google Picker field for selecting Google Sheets and Drive files directly from a modal.

## What is Google Picker?

Google Picker is an official Google API that provides a file/folder browser modal. It allows users to:
- Browse Google Drive files and folders
- Select Google Sheets
- Select Google Docs
- Multi-select items
- All without building a custom file browser

## Setup Steps

### 1. Enable Google Picker API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Go to **APIs & Services** > **Library**
4. Search for "Google Picker API"
5. Click on it and press **Enable**

### 2. Configure OAuth Redirect URI

Make sure your Google OAuth app has the correct redirect URI configured:
- Go to **APIs & Services** > **Credentials**
- Click on your OAuth 2.0 Client ID
- Add `http://localhost:3000/oauth/callback` (for development)
- Add your production URL when deploying

### 3. Update Node Configuration

The Google Sheets node now uses the picker by default. To use it in other nodes:

```javascript
{
  displayName: "Select File",
  name: "fileId",
  type: "custom",
  required: true,
  component: "GooglePickerField",
  componentProps: {
    pickerType: "sheets", // or "drive" or "both"
    dependsOn: "authentication", // Field that contains credential ID
  },
  description: "Click Browse to select a file from Google Drive",
}
```

## How It Works

### Frontend Flow

1. User clicks the "Browse" button
2. Frontend fetches the access token from backend (using user's own Google OAuth credential)
3. Google Picker modal opens with user's Google Drive
4. User selects a file/sheet
5. File ID is stored in the field

### Backend Flow

1. Frontend requests `/api/credentials/{credentialId}/access-token`
2. Backend retrieves the credential (user's own Google OAuth token)
3. Backend extracts and returns the access token
4. Frontend uses token to initialize Google Picker

## Key Point

Each user's Google Picker uses **their own Google OAuth credentials**, not a shared API key. This means:
- No need for a separate `GOOGLE_API_KEY`
- Each user sees their own Google Drive files
- Permissions are based on user's Google account
- More secure and scalable

## Usage in Nodes

### Google Sheets Node

The spreadsheet ID field now has a picker:

```javascript
{
  displayName: "Spreadsheet ID",
  name: "spreadsheetId",
  type: "custom",
  required: true,
  component: "GooglePickerField",
  componentProps: {
    pickerType: "sheets",
    dependsOn: "authentication",
  },
}
```

### Google Drive Node

You can add a picker for file selection:

```javascript
{
  displayName: "File ID",
  name: "fileId",
  type: "custom",
  required: true,
  component: "GooglePickerField",
  componentProps: {
    pickerType: "drive",
    dependsOn: "authentication",
  },
}
```

## Picker Types

- **sheets**: Only show Google Sheets
- **drive**: Show all Google Drive files
- **both**: Show both Sheets and Drive files (default)

## Troubleshooting

### "Failed to open Google Picker"

- Check that Google Picker API is enabled in Cloud Console
- Verify the user has a valid Google OAuth credential selected
- Check browser console for specific error messages

### "Please select Google credentials first"

- Make sure you've selected a Google OAuth credential in the authentication field
- The credential must be a valid Google OAuth2 credential with Drive access

### Access token errors

- Verify the credential has a valid access token
- Check that the credential hasn't expired
- Try refreshing the credential if available

## Security Notes

- Access tokens are only sent to authenticated users
- Tokens are retrieved server-side and not exposed in frontend code
- The API key is used only for the Picker UI, not for API calls
- All file operations still use the OAuth access token

## Advanced: Custom Picker Configuration

To customize the picker behavior, modify `GooglePickerField.tsx`:

```typescript
const pickerBuilder = new window.google.picker.PickerBuilder()
  .addView(view)
  .setOAuthToken(accessToken)
  .setCallback(handlePickerCallback)
  // Add custom options:
  .enableFeature(window.google.picker.Feature.NAV_HIDDEN) // Hide nav
  .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED) // Multi-select
  .build()
```

See [Google Picker API docs](https://developers.google.com/picker/docs) for more options.
