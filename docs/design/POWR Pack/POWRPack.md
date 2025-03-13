# POWR Pack Implementation Document

## Overview

This document outlines the implementation plan for creating a "POWR Pack" feature in the POWR fitness app. POWR Packs are shareable collections of workout templates and exercises that users can import into their app. This feature leverages the Nostr protocol (NIP-51 lists) to enable decentralized sharing of fitness content.

## Key Concepts

1. **POWR Pack**: A collection of workout templates and exercises stored as a NIP-51 list (kind 30004 "Curation set")
2. **Pack Sharing**: Packs are shared via `naddr1` links that encode references to the collection
3. **Selective Import**: Users can select which templates/exercises to import from a pack
4. **Dependency Management**: When selecting a template, all required exercises are automatically selected

## Implementation Steps

### 1. Database Schema Extensions

Add new tables to track imported packs and their contents:

```sql
-- POWR Packs table
CREATE TABLE powr_packs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  author_pubkey TEXT,
  nostr_event_id TEXT,
  import_date INTEGER NOT NULL
);

-- POWR Pack items table
CREATE TABLE powr_pack_items (
  pack_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_order INTEGER,
  PRIMARY KEY (pack_id, item_id),
  FOREIGN KEY (pack_id) REFERENCES powr_packs(id) ON DELETE CASCADE
);
```

### 2. New Service: POWRPackService

Create a new service in `lib/db/services/POWRPackService.ts` with these key methods:

- `fetchPackFromNaddr(naddr: string)`: Fetch a pack and its content from Nostr
- `importPack(pack, templates, exercises, selectedIds)`: Import selected items to local database
- `getImportedPacks()`: List all imported packs with metadata
- `deletePack(packId, keepItems)`: Remove a pack while optionally keeping its content

### 3. UI Components

#### Settings Integration

Add POWR Packs to the settings drawer:
- "Import POWR Pack" item
- "Manage POWR Packs" item

#### Import Flow

Create screen at `app/(packs)/import.tsx`:
- Input field for naddr
- Pack details display
- Selectable list of templates
- Selectable list of exercises with auto-selection based on template dependencies
- Import button

#### Management Interface

Create screen at `app/(packs)/manage.tsx`:
- List of imported packs
- Pack details (templates/exercises count, import date)
- Delete functionality

#### Social Discovery

Add a section to the social tab:
- Horizontal scrolling list of available packs
- Tap to view/import a pack

### 4. Routing

Configure routing in `app/(packs)/_layout.tsx`:
- Import screen as modal
- Management screen as standard page

## Technical Implementation Details

### Data Flow

1. **Pack Creation**: Exercise → Template → Pack (we've validated this flow works via NAK tests)
2. **Pack Import**:
   - Decode naddr
   - Fetch pack event and referenced content
   - Parse Nostr events to POWR model objects
   - Save selected items to database

### Dependency Management

When users select a workout template, the system will:
1. Identify all exercises referenced by the template
2. Automatically select these exercises (shown as "required")
3. Prevent deselection of required exercises

### Integration with Existing Services

- **NostrWorkoutService**: Use existing conversion methods between Nostr events and app models
- **LibraryService**: Update to query content from imported packs
- **NDK**: Use for fetching Nostr events and managing relay connections

## Sharing UI Mockups

### Import Screen
```
┌─────────────────────────────┐
│ Import POWR Pack            │
├─────────────────────────────┤
│ ┌───────────────────────┐   │
│ │ naddr1...             │   │
│ └───────────────────────┘   │
│                             │
│ ┌─────────────┐             │
│ │ Fetch Pack  │             │
│ └─────────────┘             │
│                             │
│ Pack Name                   │
│ Description text here...    │
│                             │
│ Templates                   │
│ ┌─────────────────────────┐ │
│ │ ☑ Beginner Full Body    │ │
│ │   Strength workout      │ │
│ └─────────────────────────┘ │
│                             │
│ Exercises                   │
│ ┌─────────────────────────┐ │
│ │ ☑ Squat                 │ │
│ │   Required by template  │ │
│ └─────────────────────────┘ │
│                             │
│ ┌───────────────────────┐   │
│ │ Import 3 items        │   │
│ └───────────────────────┘   │
└─────────────────────────────┘
```

### Management Screen
```
┌─────────────────────────────┐
│ Manage POWR Packs           │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ POWR Test Pack      [🗑]│ │
│ │ A test collection...    │ │
│ │                         │ │
│ │ 2 templates • 2 exercises│
│ │ Imported 2 days ago     │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ Beginner Pack       [🗑]│ │
│ │ For new users...        │ │
│ │                         │ │
│ │ 3 templates • 5 exercises│
│ │ Imported 1 week ago     │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

### Social Discovery
```
┌─────────────────────────────┐
│                             │
│ POWR Packs                  │
│ Discover workout collections│
│                             │
│ ┌─────┐  ┌─────┐  ┌─────┐  │
│ │Pack1│  │Pack2│  │Pack3│  │
│ │     │  │     │  │     │  │
│ │     │  │     │  │     │  │
│ └─────┘  └─────┘  └─────┘  │
│                             │
└─────────────────────────────┘
```

## Testing and Validation

We've successfully tested the basic Nostr event publishing flow using NAK:
1. Created exercise events (kind 33401)
2. Created template events (kind 33402) that reference the exercises
3. Created a pack event (kind 30004) that references both templates and exercises
4. Verified that all events were published and can be fetched by ID

## Implementation Timeline

1. **Database Schema Updates**: Implement new tables
2. **POWRPackService**: Create service for fetching and importing packs
3. **Settings Integration**: Add menu items to settings drawer
4. **Import UI**: Implement import screen with selection logic
5. **Management UI**: Create pack management interface
6. **Social Discovery**: Add pack discovery section to social tab
7. **Testing**: Validate full import/management flow

## Next Steps

1. Implement the database schema changes
2. Build POWRPackService
3. Create the UI components
4. Test the full feature flow
5. Consider future enhancements (creating/publishing packs from within the app)