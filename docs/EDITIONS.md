# NodeDrop Editions

NodeDrop is available in two editions:

## Community Edition (Open Source)

The **free, self-hosted** version you can run anywhere.

```bash
# Default - no configuration needed
NODEDROP_EDITION=community
```

### What's Included
- ✅ Full workflow automation engine
- ✅ All 50+ built-in nodes
- ✅ Unlimited workflows
- ✅ Unlimited executions
- ✅ Single workspace
- ✅ Single user (or basic auth)
- ✅ All triggers (webhook, cron, manual)
- ✅ Credential encryption
- ✅ Custom nodes support
- ✅ Docker deployment
- ✅ Community support

### What's Not Included
- ❌ Multi-workspace
- ❌ Team collaboration
- ❌ Member invitations
- ❌ SSO/SAML
- ❌ Audit logs
- ❌ Priority support

## Cloud Edition (SaaS)

The **managed, multi-tenant** version at [nodedrop.io](https://nodedrop.io).

### Plans

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Workspaces | 1 | 5 | Unlimited |
| Team members | 1 | 10 | Unlimited |
| Workflows | 5 | 50 | Unlimited |
| Executions/month | 1,000 | 10,000 | Unlimited |
| Credentials | 10 | 100 | Unlimited |
| Teams | ❌ | ✅ | ✅ |
| SSO/SAML | ❌ | ❌ | ✅ |
| Audit logs | ❌ | ❌ | ✅ |
| Priority support | ❌ | ✅ | ✅ |

## Running Cloud Edition Locally (Development)

For contributors working on cloud features:

```bash
NODEDROP_EDITION=cloud
```

This enables all multi-tenant features locally for testing.

## Feature Gating

Features are gated using the edition config:

### Backend
```typescript
import { isFeatureEnabled } from './config/edition';
import { requireEditionFeature } from './middleware/edition';

// Check in code
if (isFeatureEnabled('teamCollaboration')) {
  // Enable team features
}

// Middleware for routes (returns 403 if feature not available)
router.post('/teams', requireEditionFeature('teamCollaboration'), createTeam);
router.post('/workspaces', requireEditionFeature('multiWorkspace'), createWorkspace);
```

### Frontend
```typescript
import { editionConfig } from '@/config/edition';

// Conditionally render UI
{editionConfig.isFeatureEnabled('multiWorkspace') && (
  <WorkspaceSwitcher />
)}

// Hide sidebar items
{editionConfig.isFeatureEnabled('teamCollaboration') && (
  <TeamsList />
)}
```

### API Endpoint
```bash
# Get current edition info
GET /api/edition

# Response
{
  "success": true,
  "data": {
    "edition": "community",
    "features": {
      "multiWorkspace": false,
      "teamCollaboration": false,
      ...
    }
  }
}
```

## Philosophy

We believe in **open core**:
- The core automation engine is 100% open source
- Cloud features (multi-tenancy, collaboration) fund development
- Self-hosted users get a fully functional product
- No artificial limitations on the open source version

This model is used successfully by n8n, GitLab, Supabase, and many others.
