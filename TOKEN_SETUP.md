# Token Management System Setup

This project now includes an automatic token management system for Adup and Taboola platforms. The system automatically handles token retrieval, caching, and renewal based on expiration times.

## Environment Variables Required

Add the following environment variables to your `.env` file:

### Adup Platform
```
ADUP_CLIENT_ID=RolxOVSfud4aZYo7pOoe
ADUP_CLIENT_SECRET=KBp2bT0if4fwjNlkioCOnrDcDfJswGZ3QDNqeKaaIGOQ8Coy
```

### Taboola Platform
```
TABOOLA_CLIENT_ID=29789ce1ffce4420a3a4b7a02a08dca5
TABOOLA_CLIENT_SECRET=7cc5a5d3d81c49e38eccde69aad04492
TABOOLA_ACCOUNT_ID=your_account_id_here
```

## How It Works

1. **Automatic Token Retrieval**: The system fetches tokens using client credentials when needed
2. **Smart Caching**: Tokens are cached in memory with expiration tracking
3. **Buffer Time**: Tokens are refreshed 5 minutes before actual expiration
4. **Error Handling**: Comprehensive error handling with retry logic
5. **Type Safety**: Full TypeScript support with proper typing

## Token Expiration Times

- **Adup**: 1800 seconds (30 minutes)
- **Taboola**: 43200 seconds (12 hours)

## API Endpoints for Testing

### Check Token Cache Status
```
GET /api/tokens/status
```

### Test Token Retrieval
```
GET /api/tokens/test
```

## Usage in Code

```typescript
import { makeAuthenticatedRequest, getAdupToken, getTaboolaToken } from '@/lib/api-helpers';

// Make authenticated requests
const response = await makeAuthenticatedRequest('adup', 'https://api.adup-tech.com/v202101/reports/spend');

// Get tokens directly
const adupToken = await getAdupToken();
const taboolaToken = await getTaboolaToken();
```

## Benefits

- ✅ No manual token management required
- ✅ Automatic token refresh before expiration
- ✅ Secure credential storage in environment variables
- ✅ Reduced API calls through smart caching
- ✅ Comprehensive error handling
- ✅ Type-safe implementation

## Migration from Static Tokens

If you were previously using static tokens in environment variables, you can now remove:
- `TABOOLA_ACCESS_TOKEN`
- Any hardcoded Adup tokens

The system will automatically handle token retrieval using the client credentials. 