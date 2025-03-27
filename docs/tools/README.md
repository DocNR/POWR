# Documentation Tools

**Last Updated:** 2025-03-26  
**Status:** Active  
**Related To:** Documentation Migration, Quality Assurance

## Purpose

This directory contains tools to assist with the documentation process, particularly the migration of documentation from the old structure to the new structure and ensuring documentation quality.

## Available Tools

### doc-migrator.js

A Node.js script to migrate documentation files from the old structure to the new structure with proper formatting and metadata.

#### Usage

```bash
node doc-migrator.js <source> <destination> <title> <status> [--dryrun]
```

#### Example

```bash
# Migrate a workout documentation file
node doc-migrator.js docs/design/WorkoutCompletion.md docs/features/workout/completion_flow.md "Workout Completion Flow" "Active"

# Preview migration without making changes
node doc-migrator.js docs/design/WorkoutCompletion.md docs/features/workout/completion_flow.md "Workout Completion Flow" "Active" --dryrun
```

#### Features

- Adds standard metadata headers (Last Updated, Status, Related To)
- Creates purpose section placeholder
- Adds related documentation section
- Maintains original content
- Updates the migration mapping file with migration status
- Creates necessary directories automatically

### check-links.js

A Node.js script to verify that internal links between documentation files are valid and optionally fix broken links based on the migration mapping.

#### Usage

```bash
node check-links.js [--fix]
```

#### Features

- Scans all markdown files in the docs directory
- Verifies that relative links point to existing files
- Provides detailed reports of broken links
- Can automatically fix broken links using migration mapping
- Updates migration status and progress statistics
- Ignores external links, anchors, and mailto links

## Using These Tools in the Migration Process

1. Use the migration mapping file to identify which files need to be migrated
2. For each file, use `doc-migrator.js` to migrate it to the new location with proper formatting
3. Periodically run `check-links.js` to ensure no broken links are introduced
4. After a batch of migrations, run `check-links.js --fix` to update any links to migrated files

## Related Documentation

- [Documentation Organization Plan](../project/documentation/organization_plan.md)
- [Documentation Implementation Script](../project/documentation/implementation_script.md)
- [Documentation Migration Mapping](../project/documentation/migration_mapping.md)
