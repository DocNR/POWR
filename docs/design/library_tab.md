# POWR Library Tab PRD

## Overview

### Problem Statement
Users need a centralized location to manage their fitness content (exercises and workout templates) while supporting both local content creation and Nostr-based content discovery. The library must maintain usability in offline scenarios while preparing for future social features.

### Goals
1. Provide organized access to exercises and workout templates
2. Enable efficient content discovery and reuse
3. Support clear content ownership and source tracking
4. Maintain offline-first functionality
5. Prepare for future Nostr integration

## Feature Requirements

### Navigation Structure
- Material Top Tabs navigation with three sections:
  - Templates (default tab)
  - Exercises
  - Programs (placeholder for future implementation)

### Templates Tab

#### Content Organization
- Favorites section
- Recently performed section
- Alphabetical list of remaining templates
- Clear source badges (Local/POWR/Nostr)

#### Template Item Display
- Template title
- Workout type (strength, circuit, EMOM, etc.)
- Preview of included exercises (first 3)
- Source badge
- Favorite star button
- Usage stats

#### Search & Filtering
- Persistent search bar with real-time filtering
- Filter options:
  - Workout type
  - Equipment needed
  - Tags

### Exercises Tab

#### Content Organization
- Recent section (10 most recent exercises)
- Alphabetical list of all exercises
- Tag-based categorization
- Clear source badges

#### Exercise Item Display
- Exercise name
- Category/tags
- Equipment type
- Source badge
- Usage stats

#### Search & Filtering
- Persistent search bar with real-time filtering
- Filter options:
  - Equipment
  - Tags
  - Source

### Programs Tab (Future)
- Placeholder implementation
- "Coming Soon" messaging
- Basic description of future functionality

## Content Interaction

### Progressive Disclosure Pattern

#### 1. Card Display
- Basic info
- Source badge (Local/POWR/Nostr)
- Quick stats/preview
- Favorite button (templates only)

#### 2. Quick Preview (Hover/Long Press)
- Extended preview info
- Key stats
- Quick actions

#### 3. Bottom Sheet Details
- Basic Information:
  - Full title and description
  - Category/tags
  - Equipment requirements
  
- Stats & History:
  - Personal records
  - Usage history
  - Performance trends
  
- Source Information:
  - For local content:
    - Creation date
    - Last modified
  - For Nostr content:
    - Author information
    - Original post date
    - Relay source
    
- Action Buttons:
  - For local content:
    - Start Workout (templates)
    - Edit
    - Publish to Nostr
    - Delete
  - For Nostr content:
    - Start Workout (templates)
    - Delete from Library

#### 4. Full Details Modal
- Comprehensive view
- Complete history
- Advanced options

## Technical Requirements

### Data Storage
- SQLite for local storage
- Schema supporting:
  - Exercise templates
  - Workout templates
  - Usage history
  - Source tracking
  - Nostr metadata

### Content Management
- No limit on custom exercises/templates
- Tag character limit: 30 characters
- Support for external media links (images/videos)
- Local caching of Nostr content

### Media Content Handling
- For Nostr content:
  - Store media URLs in metadata
  - Cache images locally when saved
  - Lazy load images when online
  - Show placeholders when offline
- For local content:
  - Optional image/video links
  - No direct media upload in MVP

### Offline Capabilities
- Full functionality without internet
- Local-first architecture
- Graceful degradation of Nostr features
- Clear offline state indicators

## User Interface Components

### Core Components
1. MaterialTopTabs navigation
2. Persistent search header
3. Filter button and sheet
4. Content cards
5. Bottom sheet previews
6. Tab-specific FABs:
   - Templates Tab: FAB for creating new workout templates
   - Exercises Tab: FAB for creating new custom exercises 
   - Programs Tab: FAB for creating training programs (future)

### Component Details

#### Templates Tab FAB
- Primary action: Create new workout template
- Icon: Layout/Template icon
- Navigation: Routes to template creation flow
- Fixed position at bottom right

#### Exercises Tab FAB
- Primary action: Create new exercise
- Icon: Dumbbell icon
- Navigation: Routes to exercise creation flow
- Fixed position at bottom right

#### Programs Tab FAB (Future)
- Primary action: Create new program
- Icon: Calendar/Program icon
- Navigation: Routes to program creation flow
- Fixed position at bottom right

### Component States
1. Loading states
2. Empty states
3. Error states
4. Offline states
5. Content creation/editing modes

## Implementation Phases

### Phase 1: Core Structure
1. Tab navigation setup
2. Basic content display
3. Search and filtering
4. Local content management

### Phase 2: Enhanced Features
1. Favorite system
2. History tracking
3. Performance stats
4. Tag management

### Phase 3: Nostr Integration
1. Content syncing
2. Publishing flow
3. Author attribution
4. Media handling

## Success Metrics

### Performance
- Search response: < 100ms
- Scroll performance: 60fps
- Image load time: < 500ms

### User Experience
- Content discovery time
- Search success rate
- Template reuse rate
- Exercise reference frequency

### Technical
- Offline reliability
- Storage efficiency
- Cache hit rate
- Sync success rate

## Future Considerations

### Programs Tab Development
- Program creation
- Calendar integration
- Progress tracking
- Social sharing

### Enhanced Social Features
- Content recommendations
- Author following
- Usage analytics
- Community features

### Additional Enhancements
- Advanced media support
- Custom collections
- Export/import functionality
- Backup solutions

2025-02-09 Update

Progress Analysis:

✅ COMPLETED:
1. Navigation Structure
- Implemented Material Top Tabs with Templates, Exercises, and Programs sections
- Clear visual hierarchy with proper styling

2. Basic Content Management
- Search functionality
- Filter system with proper categorization
- Source badges (Local/POWR/Nostr)
- Basic CRUD operations for exercises and templates

3. UI Components
- SearchHeader component
- FilterSheet with proper categorization
- Content cards with consistent styling
- FAB for content creation
- Sheet components for new content creation

🟡 IN PROGRESS/PARTIAL:
1. Content Organization
- We have basic favorites for templates but need to implement:
  - Recently performed section
  - Usage stats tracking
  - Better categorization system

2. Progressive Disclosure Pattern
- We have basic cards and creation sheets but need:
  - Quick Preview on long press
  - Bottom Sheet Details view
  - Full Details Modal

3. Content Interaction
- Basic CRUD operations exist but need:
  - Performance tracking
  - History integration
  - Better stats visualization

❌ NOT STARTED:
1. Technical Implementation
- Nostr integration preparation
- SQLite database setup
- Proper caching system
- Offline capabilities

2. Advanced Features
- Performance tracking
- Usage history
- Media content handling
- Import/export functionality

Recommended Next Steps:

1. Data Layer Implementation
```typescript
// First set up SQLite database schema and service
class LibraryService {
  // Exercise management
  getExercises(): Promise<Exercise[]>
  createExercise(exercise: Exercise): Promise<string>
  updateExercise(id: string, exercise: Partial<Exercise>): Promise<void>
  deleteExercise(id: string): Promise<void>

  // Template management  
  getTemplates(): Promise<Template[]>
  createTemplate(template: Template): Promise<string>
  updateTemplate(id: string, template: Partial<Template>): Promise<void>
  deleteTemplate(id: string): Promise<void>

  // Usage tracking
  logExerciseUse(exerciseId: string): Promise<void>
  logTemplateUse(templateId: string): Promise<void>
  getExerciseHistory(exerciseId: string): Promise<ExerciseHistory[]>
  getTemplateHistory(templateId: string): Promise<TemplateHistory[]>
}
```

2. Detail Views
- Create a detailed view component for exercises and templates
- Implement proper state management for tracking usage
- Add performance metrics visualization

3. Progressive Disclosure
- Implement long press preview
- Create bottom sheet details view
- Add full screen modal for editing
