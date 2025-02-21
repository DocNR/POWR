# POWR Social Features Design Document

## Problem Statement
POWR needs to integrate social features that leverage the Nostr protocol while maintaining a local-first architecture. The system must provide a seamless way for users to share workout content, receive feedback, and engage with the fitness community without compromising the standalone functionality of the application. Additionally, the implementation must support future integration with value-exchange mechanisms through Nostr Wallet Connect.

## Requirements

### Functional Requirements
- Custom Nostr event types for exercises, workout templates, and workout records
- Social sharing of workout content via NIP-19 references
- Comment system on exercises, templates, and workout records
- Reactions and likes on shared content
- App discovery through NIP-89 handlers
- Support for zaps and Lightning payments via NWC
- Ability to track template usage and popularity
- User profile and content discovery
- Local-first storage with Nostr sync capabilities

### Non-Functional Requirements
- Performance: Social content loads within 500ms when online
- Security: User private keys are never exposed to the application
- Reliability: All created content must be usable offline
- Usability: Social interactions should be intuitive and seamlessly integrated
- Privacy: Users control what content gets shared publicly
- Scalability: System handles thousands of exercise templates and workout records

## Design Decisions

### 1. Custom Event Kinds vs. Standard Kinds
**Approach**: Use custom event kinds (33401, 33402, 33403) for exercises, templates, and workout records rather than generic kind 1 events.

**Rationale**:
- Custom kinds enable clear data separation and easier filtering
- Avoids confusion between social posts and fitness data
- Enables specialized app handlers via NIP-89
- Aligns with best practices for specialized content types
- Enables distinct validation rules for each content type

**Trade-offs**:
- Requires implementing NIP-89 app handlers for client support
- Less immediate visibility in generic Nostr clients
- Needs additional social sharing mechanism for discovery

### 2. Template-Record Relationship
**Approach**: Implement standalone workout records with explicit references to templates.

**Rationale**:
- Cleaner separation between templates and completed workouts
- More flexible for workouts that modify templates
- Better support for offline-first usage
- Simplifies synchronization logic
- Easier to implement privacy controls

**Trade-offs**:
- Requires custom queries to track template usage
- Doesn't leverage built-in reply notification systems
- Additional relationship management logic needed

### 3. Comments Implementation
**Approach**: Use NIP-22 generic comments system with proper reference structure.

**Rationale**:
- Standardized approach compatible with existing Nostr clients
- Supports threaded conversations
- Clear distinction between content and comments
- Integrates with existing notification systems
- Simple to implement using established patterns

**Trade-offs**:
- Requires filtering to display relevant comments
- Additional UI components for comment display
- Need for moderation tools (client-side filtering)

### 4. Nostr Wallet Connect Integration
**Approach**: Implement NIP-47 Nostr Wallet Connect for Lightning payments and zaps.

**Rationale**:
- Secure payment capabilities without managing private keys
- Enables zaps on workout content
- Creates opportunities for creator compensation
- Integrates with existing Nostr Lightning infrastructure
- Future-proofs for monetization features

**Trade-offs**:
- Additional complexity in wallet connection management
- Dependency on external wallet implementations
- Requires careful error handling for payment flows

## Technical Design

### Core Components

```typescript
// Exercise Template Event (Kind 33401)
interface ExerciseTemplate extends NostrEvent {
  kind: 33401;
  content: string; // Detailed instructions
  tags: [
    ["d", string], // Unique identifier
    ["title", string], // Exercise name
    ["format", ...string[]], // Data structure parameters
    ["format_units", ...string[]], // Units for parameters
    ["equipment", string], // Equipment type
    ["difficulty"?, string], // Optional skill level
    ["imeta"?, ...string[]], // Optional media metadata
    ["t"?, string][], // Optional hashtags
  ]
}

// Workout Template Event (Kind 33402)
interface WorkoutTemplate extends NostrEvent {
  kind: 33402;
  content: string; // Workout notes and instructions
  tags: [
    ["d", string], // Unique identifier
    ["title", string], // Workout name
    ["type", string], // Workout type (strength, circuit, etc.)
    ["exercise", ...string[]][], // Exercise references with parameters
    ["rounds"?, string], // Optional rounds count
    ["duration"?, string], // Optional total duration
    ["interval"?, string], // Optional interval duration
    ["rest_between_rounds"?, string], // Optional rest time
    ["t"?, string][], // Optional hashtags
  ]
}

// Workout Record Event (Kind 33403)
interface WorkoutRecord extends NostrEvent {
  kind: 33403;
  content: string; // Workout notes
  tags: [
    ["d", string], // Unique identifier
    ["title", string], // Workout name
    ["type", string], // Workout type
    ["template"?, string], // Optional template reference
    ["exercise", ...string[]][], // Exercises with actual values
    ["start", string], // Start timestamp
    ["end", string], // End timestamp
    ["completed", string], // Completion status
    ["rounds_completed"?, string], // Optional rounds completed
    ["interval"?, string], // Optional interval duration
    ["pr"?, string][], // Optional personal records
    ["t"?, string][], // Optional hashtags
  ]
}

// Comment (Kind 1111)
interface WorkoutComment extends NostrEvent {
  kind: 1111;
  content: string; // Comment text
  tags: [
    // Root reference (exercise, template, or record)
    ["e", string, string, string], // id, relay, pubkey
    ["K", string], // Root kind (33401, 33402, or 33403)
    ["P", string, string], // Root pubkey, relay
    
    // Parent comment (for replies)
    ["e"?, string, string, string], // id, relay, pubkey
    ["k"?, string], // Parent kind (1111)
    ["p"?, string, string], // Parent pubkey, relay
  ]
}

// App Handler Registration (Kind 31990)
interface AppHandler extends NostrEvent {
  kind: 31990;
  content: string;
  tags: [
    ["k", "33401", "exercise-template"],
    ["k", "33402", "workout-template"],
    ["k", "33403", "workout-record"],
    ["web", string], // App URL
    ["name", string], // App name
    ["description", string] // App description
  ]
}

// Nostr Wallet Connection Manager
class NWCManager {
  async connectWallet(nwcURI: string): Promise<{
    connected: boolean;
    pubkey?: string;
    error?: string;
  }>;
  
  async getBalance(): Promise<number>;
  
  async zapEvent(
    event: NostrEvent,
    amount: number,
    comment?: string
  ): Promise<{
    success: boolean;
    preimage?: string;
    error?: string;
  }>;
}

// Social Service
class SocialService {
  // Share workout on social feeds
  async shareWorkoutSocially(
    workout: WorkoutTemplate | WorkoutRecord,
    message: string
  ): Promise<NostrEvent>;
  
  // Get comments for content
  async getComments(
    eventId: string,
    rootKind: number
  ): Promise<WorkoutComment[]>;
  
  // Post comment
  async postComment(
    rootEvent: NostrEvent,
    content: string,
    parentComment?: WorkoutComment
  ): Promise<WorkoutComment>;
  
  // Track template usage
  async getTemplateUsageCount(templateId: string): Promise<number>;
  
  // React to content
  async reactToEvent(
    event: NostrEvent,
    reaction: "+" | "🔥" | "👍"
  ): Promise<NostrEvent>;
}
```

### Integration Points

#### Nostr Protocol Integration
- NDK for Nostr event management and relay communication
- NIP-19 for nevent URL encoding/decoding
- NIP-22 for comment threading
- NIP-25 for reactions and likes
- NIP-47 for Nostr Wallet Connect
- NIP-57 for zaps
- NIP-89 for app handler registration

#### Application Integration
- **Library Screen**: 
  - Displays social metrics on exercise/template cards (usage count, likes, comments)
  - Filters for trending/popular content
  - Visual indicators for content source (local, POWR, Nostr)

- **Detail Screens**: 
  - Shows comments and reactions on exercises, templates, and workout records
  - Displays creator information with follow option
  - Presents usage statistics and popularity metrics
  - Provides zap/tip options for content creators

- **Profile Screen**: 
  - Displays user's created workouts, templates, and exercises
  - Shows workout history and statistics visualization
  - Presents achievements, PRs, and milestone tracking
  - Includes user's social activity (comments, reactions)
  - Provides analytics dashboard of workout progress and consistency

- **Settings Screen**:
  - Nostr Wallet Connect management
  - Relay configuration and connection management
  - Social preferences (public/private sharing defaults)
  - Notification settings for social interactions
  - Mute and content filtering options
  - Profile visibility and privacy controls

- **Share Sheet**: 
  - Social sharing interface for workout records and achievements
  - Options for including stats, images, or workout summaries
  - Relay selection for content publishing
  - Privacy option to share publicly or to specific relays only

- **Comment UI**: 
  - Thread-based comment creation and display
  - Reply functionality with proper nesting
  - Reaction options with count displays
  - Comment filtering and sorting options

#### External Dependencies
- SQLite for local storage
- NDK (Nostr Development Kit) for Nostr integration
- NWC libraries for wallet connectivity
- Lightning payment providers

## Implementation Plan

### Phase 1: Core Nostr Event Structure
1. Implement custom event kinds (33401, 33402, 33403)
2. Create event validation and processing functions
3. Build local-first storage with Nostr event structure
4. Develop basic event publishing to relays

### Phase 2: Social Interaction Foundation
1. Implement NIP-22 comments system
2. Create NIP-25 reactions support
3. Build NIP-19 social sharing functions
4. Implement NIP-89 app handler registration
5. Develop UI components for social interactions

### Phase 3: Nostr Wallet Connect
1. Implement NWC connection management
2. Create wallet interface in profile section
3. Develop zap functionality for content
4. Build UI for Lightning interactions
5. Add tipping capability for creators

### Phase 4: Advanced Social Features
1. Implement NIP-51 lists for workout collections
2. Create user follows and discoveries
3. Develop achievement sharing
4. Build coaching and feedback tools
5. Add paid content capabilities

## Testing Strategy

### Unit Tests
- Event validation and processing tests
- Comment threading logic tests
- Wallet connection management tests
- Relay communication tests
- Social share URL generation tests

### Integration Tests
- End-to-end comment flow testing
- Reaction and like functionality testing
- Template usage tracking tests
- Social sharing workflow tests
- Zap flow testing
- Cross-client compatibility testing

### User Testing
- Usability of social sharing flows
- Clarity of comment interfaces
- Wallet connection experience
- Performance on different devices and connection speeds

## Observability

### Logging
- Social event publishing attempts and results
- Relay connection status
- Comment submission success/failure
- Wallet connection events
- Payment attempts and results

### Metrics
- Template popularity (usage counts)
- Comment engagement rates
- Social sharing frequency
- Zaps received/sent
- Relay response times
- Offline content creation stats

## Future Considerations

### Potential Enhancements
- Group fitness challenges with bounties
- Subscription model for premium content
- Coaching marketplace with Lightning payments
- Team workout coordination
- Custom fitness community creation
- AI-powered workout recommendations based on social data

### Known Limitations
- Reliance on external Lightning wallets
- Comment moderation limited to client-side filtering
- Content discovery dependent on relay availability
- Limited backward compatibility with generic Nostr clients

## Dependencies

### Runtime Dependencies
- NDK (Nostr Development Kit)
- SQLite database
- Nostr relay connections
- Lightning network (for zaps)
- NWC-compatible wallets

### Development Dependencies
- TypeScript
- React Native
- Expo
- Jest for testing
- NativeWind for styling

## Security Considerations
- Never store or request user private keys
- Secure management of NWC connection secrets
- Client-side validation of all incoming events
- Content filtering for inappropriate material
- User control over content visibility
- Protection against spam and abuse

## Rollout Strategy

### Development Phase
1. Implement custom event kinds and validation
2. Create UI components for social interactions
3. Develop local-first storage with Nostr sync
4. Build and test commenting system
5. Implement wallet connection interface
6. Add documentation for Nostr integration

### Beta Testing
1. Release to limited test group
2. Monitor relay performance and sync issues
3. Gather feedback on social interaction flows
4. Test cross-client compatibility
5. Evaluate Lightning payment reliability

### Production Deployment
1. Deploy app handler registration
2. Roll out social features progressively
3. Monitor engagement and performance metrics
4. Provide guides for social feature usage
5. Establish relay connection recommendations
6. Create nostr:// URI scheme handlers

## References
- [Nostr NIPs Repository](https://github.com/nostr-protocol/nips)
- [NDK Documentation](https://github.com/nostr-dev-kit/ndk)
- [POWR Workout NIP Draft](nostr-exercise-nip.md)
- [NIP-47 Wallet Connect](https://github.com/nostr-protocol/nips/blob/master/47.md)
- [NIP-57 Lightning Zaps](https://github.com/nostr-protocol/nips/blob/master/57.md)
- [NIP-89 App Handlers](https://github.com/nostr-protocol/nips/blob/master/89.md)