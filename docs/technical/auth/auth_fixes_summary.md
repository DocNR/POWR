# Authentication System Fixes Summary

## Authentication Persistence Fix

We have successfully implemented a solution for authentication persistence across app restarts. The key components of the fix:

1. **Key Storage Standardization**
   - Implemented consistent use of key names through `SECURE_STORE_KEYS` constants
   - Set up migration utilities to handle legacy storage formats
   - Ensured consistent key storage across different parts of the app

2. **Initialization Sequence Improvement**
   - Added proper pre-NDK credential migration in _layout.tsx
   - Ensured migration happens before NDK initialization
   - Fixed race conditions during startup

3. **Diagnostic Tools**
   - Created AuthPersistenceTest component for real-time debugging
   - Added visualization of stored credentials
   - Implemented test utilities for manual testing

## React Query Integration Fix

We also fixed an issue where the app was encountering errors when using the legacy Zustand-based authentication with React Query components. The solution:

1. **QueryClientProvider with Dual Auth Systems**
   - Added QueryClientProvider to the legacy auth path in _layout.tsx
   - Created a shared queryClient instance that works with both auth systems
   - Ensured NDKContext is properly provided in both paths

2. **Component-level Compatibility**
   - Components like UserAvatar that use React Query hooks now work in both auth modes
   - Data fetching via React Query continues to work even when using Zustand for auth state

## Code Changes

### 1. Updated app/_layout.tsx to use QueryClientProvider in both auth paths

```tsx
// Create a shared queryClient for both auth systems
const queryClient = React.useMemo(() => createQueryClient(), []);

// In the render method:
{FLAGS.useReactQueryAuth ? (
  // React Query Auth system (already had QueryClientProvider internally)
  <ReactQueryAuthProvider enableNDK={true} queryClient={queryClient}>
    {/* ... */}
  </ReactQueryAuthProvider>
) : (
  // Legacy Auth system with added QueryClientProvider and NDKContext
  <QueryClientProvider client={queryClient}>
    <NDKContext.Provider value={{ ndk: useNDKStore.getState().ndk, isInitialized: true }}>
      <AuthProvider ndk={useNDKStore.getState().ndk!}>
        {/* ... */}
      </AuthProvider>
    </NDKContext.Provider>
  </QueryClientProvider>
)}
```

### 2. Updated ReactQueryAuthProvider to accept a queryClient prop

The ReactQueryAuthProvider component was enhanced to accept an external queryClient to avoid creating multiple instances.

## Best Practices for Future Development

When working with dual authentication systems:

1. **Data Fetching vs. Auth State Management**
   - Keep React Query for data fetching regardless of which auth system is used
   - Authentication state can be managed by either Zustand or React Query
   
2. **Context Providers**
   - Always include QueryClientProvider for React Query hooks to work
   - Provide NDKContext when not using ReactQueryAuthProvider
   - Component hooks that need React Query should always be wrapped in QueryClientProvider

3. **Storage Keys**
   - Always reference storage keys from the constants file
   - Migrate legacy keys when encountered
   - Document key structure and migration paths

## Testing Tips

To test authentication persistence:

1. Clear all security keys using the AuthPersistenceTest screen
2. Create test keys and restart the app
3. Verify credentials load correctly on restart
4. Verify proper NDK initialization with loaded credentials
5. Check logs for proper initialization sequence
6. Toggle between auth systems to test compatibility of both approaches

## Known Limitations

- Legacy components that depend on React Query still need the QueryClientProvider wrapper
- Components must handle the possibility that NDK might not be initialized yet
- External signers require separate handling with dedicated hooks
