# NDK Mobile Implementation References

## File Structure Overview

# NDK Mobile Implementation References

## Core Types and Exports

### Main Entry Point (`src/index.ts`)
```typescript
import '@bacons/text-decoder/install';
import 'react-native-get-random-values';

export * from './hooks';
export * from './cache-adapter/sqlite';
export * from './components';
export * from './components/relays';
export * from '@nostr-dev-kit/ndk';

import NDK from '@nostr-dev-kit/ndk';
export default NDK;
```

### Core Types (`src/types.ts`)
```typescript
export type SettingsStore = {
    getSync: (key: string) => string | null;
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
    delete: (key: string) => Promise<void>;
}
```

## File Structure Overview

### NDK Mobile Structure (`@nostr-dev-kit/ndk-mobile`)
```plaintext
src/
  ├── cache-adapter/
  │   ├── migrations.ts      [REVIEWED] - Database versioning system
  │   └── sqlite.ts         [REVIEWED] - SQLite implementation
  ├── hooks/
  │   ├── ndk.ts            [REVIEWED] - Core NDK hook
  │   ├── session.ts        [REVIEWED] - Session management
  │   ├── subscribe.ts      [REVIEWED] - Event subscription
  │   ├── user-profile.ts   [REVIEWED] - Profile handling
  │   └── wallet.ts         [REVIEWED] - Wallet integration
  ├── providers/
  │   ├── ndk/
  │   │   ├── signers/      [REVIEWED]
  │   │   │   ├── nip07.ts  - Browser extension auth
  │   │   │   ├── nip46.ts  - Remote signing
  │   │   │   └── pk.ts     - Private key handling
  │   │   ├── wallet.tsx    [REVIEWED] - Wallet provider impl
  │   │   └── context.tsx   
  │   └── session/
  │       └── NEED ACCESS
  ├── stores/
  │   ├── ndk.ts            [REVIEWED] - NDK state management
  │   ├── session/          [REVIEWED] - Session management
  │   │   ├── index.ts      - Store definition
  │   │   ├── types.ts      - Type definitions
  │   │   └── actions/      - Store actions
  │   └── wallet.ts
  └── types.ts
```

## Recent Component Analysis

### Authentication & Signing (`providers/ndk/signers/`)

#### NIP-07 Browser Extension (`nip07.ts`)
```typescript
export async function loginWithNip07() {
    const signer = new NDKNip07Signer();
    return signer.user().then(async (user: NDKUser) => {
        if (user.npub) {
            return { user, npub: user.npub, signer };
        }
    });
}
```

#### NIP-46 Remote Signing (`nip46.ts`)
```typescript
export async function withNip46(
    ndk: NDK, 
    token: string, 
    sk?: string
): Promise<NDKSigner | null> {
    let localSigner = sk ? 
        new NDKPrivateKeySigner(sk) : 
        NDKPrivateKeySigner.generate();
    
    const signer = new NDKNip46Signer(ndk, token, localSigner);
    return signer.blockUntilReady();
}
```

### Wallet Provider (`providers/ndk/wallet.tsx`)
- **Key Features**:
  - Wallet state management
  - Balance tracking
  - Transaction monitoring
  - Multi-wallet support (NWC, Cashu)

- **Notable Implementation**:
```typescript
function persistWalletConfiguration(
    wallet: NDKWallet, 
    settingsStore: SettingsStore
) {
    const payload = walletPayload(wallet);
    const type = wallet.type;
    settingsStore.set('wallet', JSON.stringify({ type, payload }));
}
```

## POWR Implementation Patterns

### 1. Authentication Strategy
```typescript
// Support multiple auth methods
export type WorkoutAuthMethod = 
    | { type: 'nip07' }
    | { type: 'nip46'; token: string }
    | { type: 'privateKey'; key: string };

// Auth provider wrapper
export const WorkoutAuthProvider = ({ 
    children,
    onAuth
}: PropsWithChildren<{
    onAuth: (user: NDKUser) => void
}>) => {
    // Implementation
};
```

### 2. Session Management
```typescript
export interface WorkoutSession {
    currentUser: NDKUser;
    activeWorkout?: NDKEvent;
    templates: Map<string, NDKEvent>;
    history: NDKEvent[];
}

export const WorkoutSessionProvider = ({
    children,
    session
}: PropsWithChildren<{
    session: WorkoutSession
}>) => {
    // Implementation
};
```

### Files Still Needed:
1. Session Provider Implementation:
   ```plaintext
   src/providers/session/
   ├── context.tsx
   └── index.tsx
   ```

2. Wallet Store Implementation:
   ```plaintext
   src/stores/wallet.ts
   ```# POWR Implementation Resources

## File Structures

### NDK Mobile Structure (`@nostr-dev-kit/ndk-mobile`)
```plaintext
src/
  ├── cache-adapter/
  │   ├── migrations.ts      [REVIEWED] - Database versioning system
  │   └── sqlite.ts         [REVIEWED] - SQLite implementation
  ├── hooks/
  │   ├── ndk.ts            [REVIEWED] - Core NDK hook
  │   ├── session.ts        [REVIEWED] - Session management
  │   ├── subscribe.ts      [REVIEWED] - Event subscription
  │   ├── user-profile.ts   [REVIEWED] - Profile handling
  │   └── wallet.ts         [REVIEWED] - Wallet integration
  ├── providers/
  │   ├── ndk/
  │   │   ├── signers/
  │   │   │   ├── nip07.ts  [REVIEWED] - Browser extension auth
  │   │   │   ├── nip46.ts  [REVIEWED] - Remote signing
  │   │   │   └── pk.ts     [REVIEWED] - Private key handling
  │   │   └── context.tsx
  │   └── session/
  ├── stores/
  │   ├── ndk.ts            [REVIEWED] - NDK state management
  │   ├── session/
  │   │   ├── index.ts      [REVIEWED] - Session store
  │   │   ├── types.ts      [REVIEWED] - Session types
  │   │   ├── utils.ts      [REVIEWED] - Helper functions
  │   │   └── actions/      [REVIEWED]
  │   │       ├── addEvent.ts    - Event handling
  │   │       ├── init.ts        - Session initialization
  │   │       ├── mutePubkey.ts  - User muting
  │   │       ├── setEvents.ts   - Event management
  │   │       ├── setMuteList.ts - Mute list management
  │   │       └── wot.ts         - Web of trust
  │   └── wallet.ts
  └── types.ts
```

### Files To Review Next

#### NDK Mobile
1. Provider Implementation:
   ```plaintext
   src/providers/ndk/
   ├── context.tsx    - NDK context setup
   └── index.tsx      - Provider exports
   ```

2. Session Provider:
   ```plaintext
   src/providers/session/
   ├── context.tsx    - Session context
   └── index.tsx      - Session exports
   ```

#### NDK Core Internals
Looking at specific NDK files would be helpful:
```plaintext
packages/ndk/
├── events/
│   ├── Event.ts     - Event implementation
│   └── kinds.ts     - Event kind definitions
└── relay/
    ├── Relay.ts     - Relay implementation
    └── Pool.ts      - Relay pool management
```
```

## Detailed Component Analysis

### 0. Authentication & Signing (NDK)

#### Signer Implementation (`src/providers/ndk/signers/`)
- **Available Signers**:
  - NIP-07 (Browser Extension)
  - NIP-46 (Remote Signing)
  - Private Key
- **Key Implementations**:

```typescript
// NIP-07 Browser Extension
export async function loginWithNip07() {
    const signer = new NDKNip07Signer();
    return signer.user().then(async (user: NDKUser) => {
        if (user.npub) {
            return { user, npub: user.npub, signer };
        }
    });
}

// NIP-46 Remote Signing
export async function withNip46(ndk: NDK, token: string, sk?: string): Promise<NDKSigner | null> {
    let localSigner = sk ? 
        new NDKPrivateKeySigner(sk) : 
        NDKPrivateKeySigner.generate();
    
    const signer = new NDKNip46Signer(ndk, token, localSigner);
    return signer.blockUntilReady();
}
```

- **Payload Handling**:
```typescript
export async function withPayload(
    ndk: NDK,
    payload: string,
    settingsStore: SettingsStore
): Promise<NDKSigner | null> {
    if (payload.startsWith('nsec1')) return withPrivateKey(payload);
    // NIP-46 handling with local key persistence
}
```

- **POWR Applications**:
  - User authentication
  - Workout signing
  - Template authorization
  - Private workout encryption

#### Wallet Integration (`hooks/wallet.ts`)
- **Core Functionality**:
```typescript
const useNDKWallet = () => {
    const { ndk } = useNDK();
    const activeWallet = useWalletStore(s => s.activeWallet);
    const setActiveWallet = (wallet: NDKWallet) => {
        storeSetActiveWallet(wallet);
        ndk.wallet = wallet;
        // Handle persistence
    }
    return { activeWallet, setActiveWallet, balances };
}
```
- **Features**:
  - Wallet state management
  - Balance tracking
  - Settings persistence
- **POWR Applications**:
  - Premium template purchases
  - Trainer payments
  - Achievement rewards

### 1. Session Store Implementation (NDK)

#### Store Architecture (`stores/index.ts`, `stores/types.ts`)
- **Core State Structure**:
```typescript
export interface SessionState {
    follows: string[] | undefined;
    muteListEvent: NDKList | undefined;
    muteList: Set<Hexpubkey>;
    events: Map<NDKKind, NDKEvent[]>;
    wot: Map<Hexpubkey, number>;
    ndk: NDK | undefined;
}
```

- **Initialization Options**:
```typescript
export interface SessionInitOpts {
    follows?: boolean;
    muteList?: boolean;
    wot?: number | false;
    kinds?: Map<NDKKind, { wrapper?: NDKEventWithFrom<any> }>;
    filters?: (user: NDKUser) => NDKFilter[];
}
```

#### Event Management (`stores/actions/`)

##### Event Addition (`addEvent.ts`)
```typescript
export const addEvent = (event: NDKEvent, onAdded, set) => {
    set((state: SessionState) => {
        const kind = event.kind!;
        const newEvents = new Map(state.events);
        let existing = newEvents.get(kind) || [];

        // Handle replaceable events
        if (event.isParamReplaceable()) {
            // Deduplication logic
        }

        newEvents.set(kind, [...existing, event]);
        return { events: newEvents, ...changes };
    });
};
```
- **Key Features**:
  - Event deduplication
  - Replaceable event handling
  - State immutability

##### Session Initialization (`init.ts`)
```typescript
export const initSession = (
    ndk: NDK,
    user: NDKUser,
    settingsStore: SettingsStore,
    opts: SessionInitOpts,
    on: SessionInitCallbacks,
    set,
    get
) => {
    const filters = generateFilters(user, opts);
    const sub = ndk.subscribe(filters, {
        groupable: false,
        closeOnEose: false
    });
    // Event handling setup
};
```
- **Features**:
  - Filter generation
  - Event subscription
  - State initialization

#### Web of Trust Implementation (`wot.ts`)
```typescript
export function addWotEntries(
    ndk: NDK,
    follows: Hexpubkey[],
    settingsStore: SettingsStore,
    set: (state: Partial<SessionState>) => void,
    cb: () => void
) {
    // WoT computation implementation
}
```
- **Key Features**:
  - Trust score computation
  - Cache management
  - Persistence strategy

### POWR Adaptation Strategy

#### 1. Workout Session Store
```typescript
export interface WorkoutSessionState {
    activeWorkout?: NDKEvent;
    templates: Map<NDKKind, NDKEvent[]>;
    workoutHistory: NDKEvent[];
    follows: Set<Hexpubkey>; // Following trainers/users
    trust: Map<Hexpubkey, number>; // Trainer trust scores
}

export interface WorkoutInitOpts {
    loadTemplates?: boolean;
    loadHistory?: boolean;
    watchFollows?: boolean;
    trustScoring?: boolean;
}
```

#### 2. Event Management
```typescript
export const addWorkoutEvent = (event: NDKEvent, set) => {
    set((state: WorkoutSessionState) => {
        switch(event.kind) {
            case 33401: // Exercise Template
                return handleTemplateEvent(state, event);
            case 33402: // Workout Template
                return handleWorkoutTemplate(state, event);
            case 33403: // Workout Record
                return handleWorkoutRecord(state, event);
        }
    });
};
```

#### 3. Trust System
```typescript
export const computeTrainerTrust = (
    trainerId: Hexpubkey,
    state: WorkoutSessionState
) => {
    // Factors to consider:
    // - Number of users following
    // - Template usage count
    // - Verified credentials
    // - User ratings
};
```

### 2. NDK Core Components

#### Cache System (`src/cache-adapter/`)

##### SQLite Adapter (`sqlite.ts`)
- **Key Implementation**:
```typescript
export class NDKCacheAdapterSqlite implements NDKCacheAdapter {
    // Core caching functionality
    async setEvent(event: NDKEvent, filters: NDKFilter[], relay?: NDKRelay)
    async query(subscription: NDKSubscription)
    async fetchProfile(pubkey: Hexpubkey)
}
```
- **Notable Features**:
  - LRU caching for profiles
  - Transaction support
  - Batch operation handling
  - Event deduplication
- **POWR Applications**:
  - Workout template caching
  - Performance optimization
  - Offline data access

##### Migrations (`migrations.ts`)
- **Key Tables**:
```typescript
export const migrations = [{
    version: 0,
    up: async (db: SQLite.SQLiteDatabase) => {
        // Events table
        // Profiles table
        // Event tags table
        // Relay status table
    }
}];
```
- **POWR Adaptation Needed**:
  - Add workout-specific tables
  - Template versioning
  - Exercise history tracking

### 2. Event Handling System

#### Subscription Hook (`src/hooks/subscribe.ts`)
- **Core Interface**:
```typescript
interface UseSubscribeParams {
    filters: NDKFilter[] | null;
    opts?: {
        wrap?: boolean;
        bufferMs?: number;
        includeMuted?: boolean;
    };
}
```
- **Key Features**:
  - Event buffering system
  - Automatic deduplication
  - Muted user filtering
- **POWR Applications**:
  - Real-time workout updates
  - Social feed implementation
  - Template sharing

#### Session Management (`src/hooks/session.ts`)
- **Key Functionality**:
  - User authentication
  - Event caching
  - Profile management
- **Notable Methods**:
```typescript
useNDKSession() {
    // Session initialization
    // Wallet management
    // Event handling
}
```

### 3. Olas Implementation Patterns

#### State Management (`stores/session/`)
- **Core Store Structure**:
```typescript
export const useNDKSessionStore = create<SessionState>()((set, get) => ({
    follows: undefined,
    events: new Map(),
    muteList: new Set(),
    
    // Actions
    init: (ndk, user, settingsStore, opts, cb),
    addEvent: (event, onAdded),
    setEvents: (kind, events)
}));
```
- **Key Features**:
  - Immutable state updates
  - Action composition
  - Event buffering
- **POWR Applications**:
  - Workout state management
  - Progress tracking
  - Social interactions

#### Event Actions (`stores/session/actions/`)
- **Key Implementations**:
  - `addEvent.ts`: Event processing and deduplication
  - `init.ts`: Session initialization and relay setup
  - `setEvents.ts`: Batch event updates
- **Notable Patterns**:
```typescript
export const addEvent = (event: NDKEvent, onAdded, set) => {
    set((state: SessionState) => {
        // Event processing
        // State updates
        // Callback handling
    });
};
```

#### UI Components (`components/relays/`)
- **Connectivity Indicator**:
```typescript
const CONNECTIVITY_STATUS_COLORS: Record<NDKRelayStatus, string> = {
    [NDKRelayStatus.CONNECTED]: '#66cc66',
    [NDKRelayStatus.DISCONNECTED]: '#aa4240',
    // ...
};
```
- **Usage in POWR**:
  - Connection status visualization
  - Workout sync indicators
  - Real-time feedback

## Files To Review Next

### Priority 1
1. NDK Provider Context:
   - `src/providers/ndk/context.tsx`
   - Implementation of NDK context
   - Provider patterns

2. Database Utilities:
   - `apps/mobile/utils/db.ts`
   - Database operations
   - Sync logic

### Priority 2
1. Form Management:
   - `apps/mobile/components/NewPost/store.ts`
   - State management patterns
   - Form validation

## Implementation Strategy for POWR

### Phase 1: Core Data Layer
1. Adapt NDK's SQLite adapter:
```typescript
export class WorkoutCacheAdapter extends NDKCacheAdapterSqlite {
    // Add workout-specific methods
    async setWorkoutRecord(workout: NDKEvent): Promise<void>;
    async getWorkoutHistory(): Promise<NDKEvent[]>;
    async getTemplates(): Promise<NDKEvent[]>;
}
```

### Phase 2: State Management
1. Create workout store using Olas patterns:
```typescript
export const useWorkoutStore = create<WorkoutState>((set, get) => ({
    activeWorkout: undefined,
    templates: new Map(),
    history: [],
    
    // Actions
    startWorkout: (template: NDKEvent) => {},
    recordSet: (exercise: NDKEvent, weight: number, reps: number) => {},
    completeWorkout: () => {}
}));
```

### Phase 3: Event Handling
1. Implement workout-specific subscriptions:
```typescript
export const useWorkoutSubscribe = ({filters, opts}) => {
    return useSubscribe({
        filters,
        opts: {
            buffer: true,
            includeMuted: false
        }
    });
};
```

Would you like me to:
1. Add analysis for any specific component?
2. Create example implementations for POWR?
3. Review additional files?