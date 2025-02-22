# Template Organization and Drag-and-Drop Feature

## Problem Statement
Users need a more flexible way to organize their growing collection of workout templates. Currently, templates are organized in a flat list with basic filtering. Users need the ability to create custom folders and easily reorganize templates through drag-and-drop interactions.

## Requirements

### Functional Requirements
- Create, rename, and delete folders
- Move templates between folders via drag-and-drop
- Reorder templates within folders
- Reorder folders themselves
- Collapse/expand folder views
- Support template search across folders
- Maintain existing category and favorite filters
- Support template color coding
- Batch move/delete operations

### Non-Functional Requirements
- Smooth drag animations (60fps)
- Persist folder structure locally
- Support offline operation
- Sync with Nostr when available
- Maintain current performance with 100+ templates
- Accessible drag-and-drop interactions

## Design Decisions

### 1. Folder Data Structure
Using a hierarchical structure with templates linked to folders:

```typescript
interface TemplateFolder {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  order: number;
  created_at: number;
  updated_at: number;
}

interface Template {
  // ... existing fields ...
  folder_id?: string;  // Optional - null means root level
  order: number;      // Position within folder or root
}
```

Rationale:
- Simple but flexible structure
- Easy to query and update
- Supports future nested folders if needed
- Maintains compatibility with existing template structure

### 2. Drag-and-Drop Implementation
Using react-native-reanimated and react-native-gesture-handler:

Rationale:
- Native performance for animations
- Built-in gesture handling
- Good community support
- Cross-platform compatibility
- Rich animation capabilities

## Technical Design

### Core Components
```typescript
// Folder management
interface FolderManagerHook {
  folders: TemplateFolder[];
  createFolder: (name: string) => Promise<string>;
  updateFolder: (id: string, data: Partial<TemplateFolder>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  reorderFolder: (id: string, newOrder: number) => Promise<void>;
}

// Draggable template component
interface DraggableTemplateProps {
  template: Template;
  onDragStart?: () => void;
  onDragEnd?: (dropZone: DropZone) => void;
  isDragging?: boolean;
}

// Drop zone types
type DropZone = {
  type: 'folder' | 'root' | 'template';
  id: string;
  position: 'before' | 'after' | 'inside';
}
```

### Integration Points
- SQLite database for local storage
- Nostr event kind for folder structure
- Template list screen
- Template filtering system
- Drag animation system

## Implementation Plan

### Phase 1: Foundation
1. Update database schema
2. Create folder management hooks
3. Implement basic folder CRUD operations
4. Add folder view to template screen

### Phase 2: Drag and Drop
1. Implement DraggableTemplateCard
2. Add drag gesture handling
3. Create drop zone detection
4. Implement reordering logic

### Phase 3: Enhancement
1. Add folder customization
2. Implement batch operations
3. Add Nostr sync support
4. Polish animations and feedback

## Testing Strategy

### Unit Tests
- Folder CRUD operations
- Template ordering logic
- Drop zone detection
- Data structure validation

### Integration Tests
- Drag and drop flows
- Folder persistence
- Search across folders
- Filter interactions

## Observability

### Logging
- Folder operations
- Drag and drop events
- Error conditions
- Performance metrics

### Metrics
- Folder usage statistics
- Common template organizations
- Operation success rates
- Animation performance

## Future Considerations

### Potential Enhancements
- Nested folders
- Folder sharing
- Template duplicating
- Advanced sorting options
- Folder templates
- Batch operations
- Grid view option

### Known Limitations
- Initial complexity increase
- Performance with very large template sets
- Cross-device sync challenges
- Platform-specific gesture differences

## Dependencies

### Runtime Dependencies
- react-native-reanimated ^3.0.0
- react-native-gesture-handler ^2.0.0
- SQLite storage
- NDK for Nostr sync

### Development Dependencies
- TypeScript
- Jest for testing
- React Native testing library

## Security Considerations
- Validate folder names
- Sanitize template data
- Secure local storage
- Safe Nostr event handling

## Rollout Strategy

### Development Phase
1. Implement core folder structure
2. Add basic drag-and-drop
3. Beta test with power users
4. Polish based on feedback

### Production Deployment
1. Feature flag for initial release
2. Gradual rollout to users
3. Monitor performance metrics
4. Collect user feedback

## References
- [React Native Reanimated Documentation](https://docs.swmansion.com/react-native-reanimated/)
- [React Native Gesture Handler Documentation](https://docs.swmansion.com/react-native-gesture-handler/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Nostr NIP-01 Specification](https://github.com/nostr-protocol/nips/blob/master/01.md)