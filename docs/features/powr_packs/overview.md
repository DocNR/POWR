# POWR Pack Overview

**Last Updated:** 2025-03-26  
**Status:** Active  
**Related To:** Workout Templates, Exercises, Nostr Integration

## Purpose

This document provides an overview of the POWR Pack feature, which allows users to import and manage collections of workout templates and exercises shared via the Nostr protocol. POWR Packs enable fitness content creators to share their workout programs with users in a decentralized manner.

## Key Concepts

### POWR Pack

A POWR Pack is a collection of workout templates and exercises stored as a NIP-51 list (kind 30004 "Curation set") on the Nostr network. It enables:

1. **Content Bundling**: Multiple workout templates and their required exercises grouped together
2. **Simple Sharing**: Distribution via `naddr1` links that encode references to the collection
3. **Decentralized Storage**: Content is hosted on the Nostr network, not centralized servers
4. **User Control**: Users can selectively import content they want from a pack

### Core Functionality

The POWR Pack feature provides the following capabilities:

1. **Import Functionality**: Users can import packs via `naddr1` links
2. **Selective Import**: Users can choose which templates and exercises to import
3. **Dependency Management**: When selecting a template, required exercises are automatically selected
4. **Pack Management**: Users can view and delete imported packs

## User Experience

### Import Flow

1. User accesses "Import POWR Pack" from the Settings menu
2. User enters or pastes an `naddr1` link
3. App fetches the pack content from Nostr relays
4. User selects which templates and exercises to import
5. Selected content is saved to the local database

### Management Interface

The "Manage POWR Packs" screen allows users to:
1. View all imported packs with metadata
2. See the number of templates and exercises in each pack
3. Delete packs while optionally keeping their content

### Social Discovery

The social tab includes a section for discovering POWR Packs:
1. Horizontal scrolling list of available packs
2. Pack preview with author and content summary
3. Tap to view and import content

## Technical Implementation

### Data Storage

POWR Packs are tracked in two database tables:

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

### Nostr Integration

POWR Packs leverage the Nostr protocol in several ways:

1. **NIP-51 Lists**: Packs are stored as curated lists (kind 30004)
2. **NIP-19 Addresses**: Packs are shared via `naddr1` encoded addresses
3. **Custom Event Kinds**: Referenced content includes workout templates (kind 33402) and exercise templates (kind 33401)

## Future Enhancements

Potential future enhancements to the POWR Pack feature include:

1. **User Profile Integration**: Filter or view all POWR Packs that a user subscribes to
2. **Creator Tools**: External website or app to create POWR Packs
3. **Expanded Import**: Support for importing individual workout templates or exercises via `naddr` or `nevent` references
4. **Dedicated Event Kind**: Create a special Nostr event kind for workout programming collections
5. **In-App Creation**: Allow users to create and publish their own POWR Packs

## Related Documentation

- [POWR Pack Implementation Plan](./implementation_plan.md) - Detailed implementation plan
- [Workout Templates](../workout/data_models.md) - Workout template data structures
- [Exercise Templates](../workout/data_models.md) - Exercise template data structures
- [Nostr Exercise NIP](../../technical/nostr/exercise_nip.md) - Nostr protocol specification for workout data
