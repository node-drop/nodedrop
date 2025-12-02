# Rate Limiting System

This directory contains all rate limiting configuration and documentation.

## 📁 File Structure

```
backend/
├── src/
│   └── rate-limit/
│       └── rate-limit.config.ts    # Rate limit configuration (imported by code)
└── docs/
    └── rate-limit/
        ├── README.md                       # Quick start guide
        ├── RATE_LIMITING.md               # Complete documentation
        ├── RATE_LIMITING_SUMMARY.md       # Quick reference
        ├── TESTING_RATE_LIMITING.md       # Testing guide
        ├── test-rate-limit.js             # Node.js test script
        └── test-rate-limit.ps1            # PowerShell test script
```

## 🚀 Quick Start

### Run Tests

**Node.js:**

```bash
node docs/rate-limit/test-rate-limit.js
```

**PowerShell:**

```powershell
.\docs\rate-limit\test-rate-limit.ps1
```

### Enable Rate Limiting for localhost

Add to `backend/.env`:

```env
RATE_LIMIT_SKIP_LOCALHOST=false
```

Then restart your server.

## 📚 Documentation

- **[README.md](./README.md)** - This file (quick start)
- **[RATE_LIMITING.md](./RATE_LIMITING.md)** - Complete implementation guide
- **[RATE_LIMITING_SUMMARY.md](./RATE_LIMITING_SUMMARY.md)** - Quick reference
- **[TESTING_RATE_LIMITING.md](./TESTING_RATE_LIMITING.md)** - Detailed testing instructions

## ⚙️ Configuration

Rate limiting is configured in `backend/src/rate-limit/rate-limit.config.ts`.

### Environment Variables

```env
# Enable/disable rate limiting
RATE_LIMIT_ENABLED=true

# Skip localhost in development
RATE_LIMIT_SKIP_LOCALHOST=true

# Form fetch limits (GET)
FORM_FETCH_MAX_REQUESTS=30
FORM_FETCH_WINDOW_MS=60000  # 1 minute

# Form submit limits (POST)
FORM_SUBMIT_MAX_REQUESTS=5
FORM_SUBMIT_WINDOW_MS=900000  # 15 minutes
```

## 🔧 Usage in Code

```typescript
import {
  rateLimitConfig,
  shouldSkipRateLimit,
} from "../rate-limit/rate-limit.config";
import rateLimit from "express-rate-limit";

const formFetchLimiter = rateLimit({
  windowMs: rateLimitConfig.publicFormFetch.windowMs,
  max: rateLimitConfig.publicFormFetch.max,
  skip: (req) => shouldSkipRateLimit(req.ip),
});

router.get("/:formId", formFetchLimiter, handler);
```

## 📊 Current Limits

| Endpoint           | Limit        | Window     | Notes            |
| ------------------ | ------------ | ---------- | ---------------- |
| Form Fetch (GET)   | 30 requests  | 1 minute   | Read operations  |
| Form Submit (POST) | 5 requests   | 15 minutes | Write operations |
| API General        | 100 requests | 1 minute   | Not yet applied  |
| Auth               | 5 attempts   | 15 minutes | Not yet applied  |

## 🧪 Test Scripts

Both test scripts:

- Check server connection
- Test GET rate limit (35 requests)
- Test POST rate limit (10 requests)
- Display colored output with rate limit headers
- Show when limits are exceeded

## ✨ Features

- ✅ IP-based rate limiting
- ✅ Different limits for read/write operations
- ✅ Localhost exemption in development
- ✅ Configurable via environment variables
- ✅ Standard rate limit headers
- ✅ Custom error messages
- ✅ Automated test scripts

---

**Last Updated:** October 18, 2025
