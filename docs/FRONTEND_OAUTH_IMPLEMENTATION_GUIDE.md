# Frontend OAuth Implementation Guide

## Overview

The `googleOAuth2` credential requires an OAuth flow to get the access token. The frontend needs to show an "Authorize with Google" button that triggers this flow.

## OAuth Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    OAuth2 Flow Diagram                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. User creates credential                                      │
│     ├─ Enters Client ID                                          │
│     ├─ Enters Client Secret                                      │
│     └─ Clicks "Authorize with Google" button                     │
│                                                                   │
│  2. Frontend calls backend                                       │
│     GET /api/oauth/google/authorize?                             │
│         clientId=xxx&                                            │
│         clientSecret=xxx&                                        │
│         credentialName=My Google Account&                        │
│         credentialType=googleOAuth2                              │
│                                                                   │
│  3. Backend returns authorization URL                            │
│     {                                                             │
│       authorizationUrl: "https://accounts.google.com/...",      │
│       callbackUrl: "http://localhost:3000/oauth/callback"       │
│     }                                                             │
│                                                                   │
│  4. Frontend opens popup/redirect to Google                      │
│     User sees Google consent screen                              │
│     User clicks "Allow"                                          │
│                                                                   │
│  5. Google redirects to callback URL                             │
│     http://localhost:3000/oauth/callback?code=xxx&state=xxx     │
│                                                                   │
│  6. Frontend sends code to backend                               │
│     POST /api/oauth/google/callback                              │
│     { code: "xxx", state: "xxx" }                               │
│                                                                   │
│  7. Backend exchanges code for tokens                            │
│     ├─ Calls Google token endpoint                               │
│     ├─ Gets access_token and refresh_token                       │
│     └─ Saves credential to database                              │
│                                                                   │
│  8. Frontend shows success                                       │
│     "Successfully connected as user@gmail.com"                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Frontend Implementation

### 1. Credential Form Component

The credential form should detect OAuth2 credentials and show an authorize button:

```typescript
// Example: CredentialForm.tsx

interface CredentialFormProps {
  credentialType: string;
  onSave: (data: any) => void;
}

function CredentialForm({ credentialType, onSave }: CredentialFormProps) {
  const [formData, setFormData] = useState({
    clientId: '',
    clientSecret: '',
    name: ''
  });
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Check if this is an OAuth2 credential
  const isOAuth2 = credentialType === 'googleOAuth2' || 
                   credentialType === 'googleSheetsOAuth2' ||
                   credentialType === 'googleDriveOAuth2';

  const handleAuthorize = async () => {
    try {
      // Step 1: Get authorization URL from backend
      const response = await fetch(
        `/api/oauth/google/authorize?` +
        `clientId=${encodeURIComponent(formData.clientId)}&` +
        `clientSecret=${encodeURIComponent(formData.clientSecret)}&` +
        `credentialName=${encodeURIComponent(formData.name)}&` +
        `credentialType=${credentialType}`,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          }
        }
      );

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get authorization URL');
      }

      // Step 2: Open Google consent screen in popup
      const popup = window.open(
        data.data.authorizationUrl,
        'Google Authorization',
        'width=600,height=700'
      );

      // Step 3: Listen for callback
      window.addEventListener('message', handleOAuthCallback);

    } catch (error) {
      console.error('Authorization error:', error);
      alert('Failed to authorize with Google');
    }
  };

  const handleOAuthCallback = async (event: MessageEvent) => {
    // Verify origin
    if (event.origin !== window.location.origin) return;

    const { code, state } = event.data;
    
    if (!code || !state) return;

    try {
      // Step 4: Send code to backend
      const response = await fetch('/api/oauth/google/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ code, state })
      });

      const data = await response.json();

      if (data.success) {
        setIsAuthorized(true);
        alert(`Successfully connected as ${data.data.credential.name}`);
        
        // Credential is now saved, close form or redirect
        onSave(data.data.credential);
      } else {
        throw new Error(data.message || 'Failed to complete authorization');
      }
    } catch (error) {
      console.error('Callback error:', error);
      alert('Failed to complete authorization');
    }

    // Clean up listener
    window.removeEventListener('message', handleOAuthCallback);
  };

  return (
    <div className="credential-form">
      <h2>Create {credentialType} Credential</h2>
      
      <input
        type="text"
        placeholder="Credential Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />

      <input
        type="text"
        placeholder="Client ID"
        value={formData.clientId}
        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
      />

      <input
        type="password"
        placeholder="Client Secret"
        value={formData.clientSecret}
        onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
      />

      {isOAuth2 && (
        <button
          onClick={handleAuthorize}
          disabled={!formData.clientId || !formData.clientSecret || !formData.name}
          className="btn-authorize"
        >
          {isAuthorized ? '✓ Authorized' : '🔐 Authorize with Google'}
        </button>
      )}

      {!isOAuth2 && (
        <button onClick={() => onSave(formData)}>
          Save Credential
        </button>
      )}
    </div>
  );
}
```

### 2. OAuth Callback Page

Create a callback page that receives the authorization code:

```typescript
// Example: pages/oauth/callback.tsx

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function OAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const { code, state, error } = router.query;

    if (error) {
      // User denied access or error occurred
      window.opener?.postMessage({ error }, window.location.origin);
      window.close();
      return;
    }

    if (code && state) {
      // Send code and state to parent window
      window.opener?.postMessage({ code, state }, window.location.origin);
      
      // Show success message briefly before closing
      setTimeout(() => {
        window.close();
      }, 1000);
    }
  }, [router.query]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column'
    }}>
      <h2>✓ Authorization Successful</h2>
      <p>You can close this window...</p>
    </div>
  );
}
```

### 3. Styling the Authorize Button

```css
/* Example: styles/credentials.css */

.btn-authorize {
  background: #4285F4; /* Google blue */
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
}

.btn-authorize:hover {
  background: #357AE8;
}

.btn-authorize:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-authorize.authorized {
  background: #0F9D58; /* Google green */
}
```

## API Endpoints

### 1. Get Authorization URL

```
GET /api/oauth/google/authorize
```

**Query Parameters:**
- `clientId` (required for new credentials)
- `clientSecret` (required for new credentials)
- `credentialName` (optional)
- `credentialType` (optional, defaults to "googleOAuth2")
- `credentialId` (optional, for editing existing credentials)

**Response:**
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
    "callbackUrl": "http://localhost:3000/oauth/callback"
  }
}
```

### 2. Exchange Code for Tokens

```
POST /api/oauth/google/callback
```

**Body:**
```json
{
  "code": "4/0AY0e-g7...",
  "state": "eyJjcmVkZW50aWFsSWQiOi..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Successfully authenticated with Google",
    "credential": {
      "id": "cred_123",
      "name": "My Google Account",
      "type": "googleOAuth2"
    },
    "expiresIn": 3600
  }
}
```

## User Flow

### Creating a New Credential

1. User clicks "Create Credential"
2. Selects "Google OAuth2"
3. Enters:
   - Credential Name: "My Google Account"
   - Client ID: "123456789-abc.apps.googleusercontent.com"
   - Client Secret: "GOCSPX-xxx"
4. Clicks "Authorize with Google" button
5. Popup opens with Google consent screen
6. User signs in and clicks "Allow"
7. Popup closes automatically
8. Success message: "Successfully connected as user@gmail.com"
9. Credential is saved and ready to use

### Editing an Existing Credential

1. User clicks "Edit" on existing credential
2. Can update Client ID/Secret
3. Clicks "Re-authorize with Google" to refresh tokens
4. Same OAuth flow as above
5. Tokens are updated in the credential

## Testing the Implementation

### Manual Test

1. **Create credential:**
   ```
   - Name: "Test Google Account"
   - Client ID: (from Google Cloud Console)
   - Client Secret: (from Google Cloud Console)
   - Click "Authorize with Google"
   ```

2. **Verify popup opens:**
   - Should see Google sign-in page
   - URL should be accounts.google.com

3. **Complete authorization:**
   - Sign in with Google account
   - Click "Allow" on consent screen
   - Popup should close automatically

4. **Verify credential saved:**
   - Should see success message
   - Credential should appear in list
   - Should have green checkmark or "Authorized" status

5. **Test credential:**
   - Click "Test" button
   - Should see: "Connected successfully as user@gmail.com"

### Automated Test

```typescript
describe('OAuth2 Credential Flow', () => {
  it('should complete OAuth flow', async () => {
    // 1. Get authorization URL
    const authResponse = await fetch('/api/oauth/google/authorize?...');
    expect(authResponse.ok).toBe(true);
    
    // 2. Simulate OAuth callback
    const callbackResponse = await fetch('/api/oauth/google/callback', {
      method: 'POST',
      body: JSON.stringify({ code: 'test_code', state: 'test_state' })
    });
    expect(callbackResponse.ok).toBe(true);
    
    // 3. Verify credential saved
    const credential = await callbackResponse.json();
    expect(credential.success).toBe(true);
    expect(credential.data.credential.type).toBe('googleOAuth2');
  });
});
```

## Troubleshooting

### Issue: "Redirect URI mismatch"
**Solution:** Add `http://localhost:3000/oauth/callback` to Google Cloud Console → Credentials → OAuth 2.0 Client IDs → Authorized redirect URIs

### Issue: Popup blocked
**Solution:** Ensure the authorize button click directly opens the popup (not async). Browsers block popups that aren't triggered by direct user action.

### Issue: "Please complete OAuth2 authorization first"
**Solution:** This is expected before authorization. After clicking "Authorize with Google" and completing the flow, the test should work.

### Issue: Tokens expire
**Solution:** The backend automatically uses refresh tokens to get new access tokens. If refresh fails, user needs to re-authorize.

## Summary

The frontend needs to:

1. ✅ Show "Authorize with Google" button for OAuth2 credentials
2. ✅ Call `/api/oauth/google/authorize` to get authorization URL
3. ✅ Open Google consent screen in popup
4. ✅ Handle callback with authorization code
5. ✅ Send code to `/api/oauth/google/callback`
6. ✅ Show success message when complete

The backend already handles:
- ✅ Generating authorization URLs
- ✅ Exchanging codes for tokens
- ✅ Saving credentials with tokens
- ✅ Refreshing expired tokens

Once implemented, users will be able to easily authorize with Google and use the credential across all Google services (Drive, Sheets, Gmail, etc.)! 🎉
