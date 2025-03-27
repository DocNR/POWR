# Documentation Reorganization Implementation Script

**Last Updated:** 2025-03-26  
**Status:** Active  
**Related To:** Documentation Standards, Project Organization

## Purpose

This document provides a practical, step-by-step approach to implementing the documentation reorganization outlined in the organization plan. It includes specific commands, actions, and validation steps to ensure a smooth migration process.

## Prerequisites

- Git command line tools
- Access to repository
- Node.js (for running any scripts we might create)
- Text editor for modifying files

## Phase 1: Setup and Preparation

### 1. Create a dedicated branch for documentation updates

```bash
git checkout -b docs/reorganization
```

### 2. Create the new folder structure

```bash
# Create the main directory structure
mkdir -p docs/guides
mkdir -p docs/architecture
mkdir -p docs/features/workout
mkdir -p docs/features/social
mkdir -p docs/features/profile
mkdir -p docs/features/library
mkdir -p docs/features/powr_packs
mkdir -p docs/features/history
mkdir -p docs/features/settings
mkdir -p docs/technical/ndk
mkdir -p docs/technical/caching
mkdir -p docs/technical/styling
mkdir -p docs/technical/nostr
mkdir -p docs/testing
mkdir -p docs/project
mkdir -p docs/project/documentation
mkdir -p docs/tools
mkdir -p docs/archive
```

### 3. Create placeholders for critical new documents

```bash
touch docs/index.md
touch docs/guides/index.md
touch docs/architecture/index.md
touch docs/features/index.md
touch docs/technical/index.md
touch docs/testing/index.md
touch docs/project/index.md
```

## Phase 2: Migration of High-Priority Documents

### 1. Move the MVP and Targeted Rebuild document

```bash
cp docs/design/MVPandTargetedRebuild.md docs/project/mvp_and_rebuild.md
```

Update the document with a new header that includes:
- Last updated date
- Status: Active
- Add proper cross-references to other documents

### 2. Move the NDK Comprehensive Guide

```bash
cp docs/design/Analysis/NDK_Comprehensive_Guide.md docs/technical/ndk/comprehensive_guide.md
```

Update the document with:
- Last updated date
- Status: Active
- Cross-references to other NDK-related documents

### 3. Consolidate Social Architecture Documentation

Review and merge insights from:
- docs/design/Social/POWRSocialArchitecture.md
- docs/design/Social/POWRSocialFeedImplementationPlan.md
- docs/design/Social/UpdatedPlan.md

```bash
touch docs/features/social/architecture.md
```

Create a comprehensive document that consolidates the key information.

### 4. Update Database Architecture Documentation

```bash
cp docs/design/database_architecture.md docs/architecture/database_architecture.md
```

Update with latest database schema and patterns.

### 5. Move Coding Style Guide

```bash
cp docs/coding_style.md docs/guides/coding_style.md
```

## Phase 3: Iterative Content Migration

For each remaining document, follow this process:

1. Review using the review process criteria
2. Determine whether to:
   - Migrate (with updates)
   - Consolidate with other documents
   - Archive as outdated
3. Update content and move to new location

### Migration Script

Create a simple node script to assist with migrations:

```javascript
// doc-migrator.js
const fs = require('fs');
const path = require('path');

// Usage: node doc-migrator.js <source> <destination> <title> <status>
const [source, destination, title, status] = process.argv.slice(2);

if (!source || !destination || !title || !status) {
  console.error('Usage: node doc-migrator.js <source> <destination> <title> <status>');
  process.exit(1);
}

// Read source content
console.log(`Reading source file: ${source}`);
const sourceContent = fs.readFileSync(source, 'utf8');

// Create new content with template
const today = new Date().toISOString().slice(0, 10);
const newContent = `# ${title}

**Last Updated:** ${today}  
**Status:** ${status}  
**Related To:** [Fill in related component]

## Purpose

[Brief description of this document's purpose]

${sourceContent.replace(/^# .+(\r?\n|\r)/, '')}

## Related Documentation

- [Add related document links]
`;

// Ensure destination directory exists
const destDir = path.dirname(destination);
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Write new file
console.log(`Writing to destination: ${destination}`);
fs.writeFileSync(destination, newContent);
console.log(`Successfully migrated ${source} to ${destination}`);

// Create a simple link checker to help validate links
const checkLinksScript = `
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docsRoot = path.resolve(__dirname, '..');

// Get all markdown files
const allMdFiles = execSync(\`find \${docsRoot} -name "*.md"\`).toString().split('\\n').filter(Boolean);

// Track all files and links
const allFiles = new Set(allMdFiles.map(f => path.relative(docsRoot, f)));
const brokenLinks = [];

allMdFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const relativeFile = path.relative(docsRoot, file);
  
  // Find markdown links
  const linkRegex = /\\[.*?\\]\\((.*?)\\)/g;
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    const link = match[1];
    
    // Skip external links and anchors
    if (link.startsWith('http') || link.startsWith('#')) continue;
    
    // Resolve relative to the file
    const fileDir = path.dirname(relativeFile);
    const resolvedLink = path.normalize(path.join(fileDir, link));
    
    // Check if file exists
    if (!allFiles.has(resolvedLink)) {
      brokenLinks.push({ file: relativeFile, link, resolvedLink });
    }
  }
});

if (brokenLinks.length > 0) {
  console.log('Found broken links:');
  brokenLinks.forEach(({ file, link, resolvedLink }) => {
    console.log(\`In \${file}: Broken link \${link} (resolves to \${resolvedLink})\`);
  });
  process.exit(1);
} else {
  console.log('All links are valid!');
}
`;

fs.writeFileSync('check-links.js', checkLinksScript);
console.log('Created link checker script: check-links.js');
```

Run this script for each document to migrate:

```bash
node doc-migrator.js docs/design/WorkoutCompletion.md docs/features/workout/completion_flow.md "Workout Completion Flow" "Active"
```

## Phase 4: Archive Outdated Documents

For documents determined to be outdated:

```bash
# Example
mkdir -p docs/archive/social
cp docs/design/Social/OldImplementationPlan.md docs/archive/social/old_implementation_plan.md
```

Add an archive notice at the top:

```markdown
> **ARCHIVED DOCUMENT**: This document is outdated and kept for historical reference only. Please refer to [Current Document](path/to/current/doc.md) for up-to-date information.
```

## Phase 5: Create Index Documents

For each section, create an index document that lists and describes the contents:

```markdown
# Technical Documentation

This section contains technical documentation for various aspects of the POWR app.

## Contents

- [NDK Documentation](./ndk/index.md): Nostr Development Kit implementation details
- [Caching Documentation](./caching/index.md): Caching strategies and implementations
- [Styling Documentation](./styling/index.md): Styling approach and patterns
- [Nostr Documentation](./nostr/index.md): Nostr protocol implementation details
```

## Phase 6: Update References

### 1. Search for document references in the codebase

```bash
grep -r "docs/design" --include="*.ts" --include="*.tsx" .
```

### 2. Update each reference to point to the new location

### 3. Update cross-references between documents

## Phase 7: Validation and Testing

### 1. Verify all links work

Use the link checker script created during the migration process:

```bash
node docs/tools/check-links.js
```

### 2. Manual review of most critical documents

## Phase 8: Commit Changes

```bash
git add docs
git commit -m "Reorganize documentation to improve structure and discoverability

- Implemented new folder structure for better organization
- Migrated key documents to appropriate locations
- Updated content with consistent formatting
- Created index files for better navigation
- Archived outdated documents
- Fixed cross-references between documents"

git push origin docs/reorganization
```

## Phase 9: Create Pull Request

Create a pull request with a detailed description of changes, including:

1. Overview of reorganization
2. Summary of major content updates
3. Instructions for developers to find documentation they previously used

## Success Checklist

- [ ] All documents follow the new structure
- [ ] No redundant documentation exists
- [ ] All documentation reflects current implementation or plans
- [ ] Key MVP documentation is prominently placed
- [ ] Naming conventions are consistent throughout
- [ ] All cross-references between documents work
- [ ] Obsolete documents are properly archived
- [ ] New documentation fills important gaps
- [ ] Main index.md provides clear navigation

## Related Documentation

- [Documentation Organization Plan](./organization_plan.md) - Overall documentation organization strategy
- [Documentation Review Process](./review_process.md) - Process for reviewing documentation quality
- [Documentation Migration Mapping](./migration_mapping.md) - Mapping of source files to destinations
- [Documentation Standards](./standards.md) - Detailed documentation standards
