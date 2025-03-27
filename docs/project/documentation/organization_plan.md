# POWR App Documentation Organization Plan

**Last Updated:** 2025-03-26  
**Status:** Active  
**Related To:** Documentation Standards, Project Organization

## Purpose

This document outlines the plan for reorganizing the POWR app documentation to improve consistency, accessibility, and maintainability.

## Current Documentation Issues

After examining our documentation structure, we've identified several issues:

1. **Inconsistent organization**: Some documents are in feature-specific folders while others are directly in the `/design/` directory
2. **Scattered analysis documents**: Technical analysis documents are spread across different locations
3. **Redundant documentation**: Multiple files covering the same features with overlapping information
4. **Poor visibility of key documents**: Critical documents like MVPandTargetedRebuild.md aren't prominently placed
5. **Inconsistent naming conventions**: Mix of camelCase, PascalCase, and snake_case in folder and file names
6. **Outdated documentation**: Some documents no longer reflect current implementation or plans

## Proposed Documentation Structure

```
docs/
├── guides/                          # Developer guides and practices
│   ├── coding_style.md                # Coding standards and practices
│   ├── ai_collaboration_guide.md      # How to work with AI tools
│   ├── documentation_guide.md         # How to write and maintain docs
│   └── writing_good_interfaces.md     # Interface design principles
│
├── architecture/                    # System-wide architectural documentation
│   ├── system_overview.md             # High-level system architecture
│   ├── data_flow.md                   # App-wide data flow patterns
│   ├── database_architecture.md       # Database design and schema
│   ├── state_management.md            # State management approach
│   └── offline_support.md             # Offline functionality architecture
│
├── features/                        # Feature-specific documentation
│   ├── workout/                       # Workout feature documentation
│   │   ├── workout_overview.md          # Feature overview
│   │   ├── ui_components.md             # UI component specifications
│   │   ├── data_models.md               # Data models and interfaces
│   │   ├── completion_flow.md           # Workout completion flow
│   │   └── implementation_roadmap.md    # Implementation plan
│   │
│   ├── social/                        # Social feature documentation
│   │   ├── social_overview.md           # Feature overview
│   │   ├── architecture.md              # Social feature architecture
│   │   ├── feed_implementation.md       # Feed implementation details
│   │   ├── caching_strategy.md          # Caching approach
│   │   └── filtering_rules.md           # Content filtering rules
│   │
│   ├── profile/                       # Profile feature documentation
│   │   └── profile_enhancement.md       # Profile tab enhancements
│   │
│   ├── library/                       # Library feature documentation
│   │   ├── library_overview.md          # Feature overview
│   │   └── template_organization.md     # Template organization
│   │
│   ├── powr_packs/                    # POWR Packs feature documentation
│   │   ├── overview.md                  # Feature overview
│   │   └── implementation_plan.md       # Implementation plan
│   │
│   ├── history/                       # History feature documentation
│   │   ├── history_overview.md          # Feature overview
│   │   └── migration_guide.md           # Migration guide
│   │
│   └── settings/                      # Settings feature documentation
│       └── implementation_guide.md     # Implementation guide
│
├── technical/                       # Technical documentation
│   ├── ndk/                           # NDK-related documentation
│   │   ├── comprehensive_guide.md       # Comprehensive NDK guide
│   │   ├── subscription_analysis.md     # Subscription handling analysis
│   │   └── encoding_decoding.md         # NIP-19 encoding/decoding
│   │
│   ├── caching/                       # Caching documentation
│   │   └── cache_implementation.md      # Cache implementation details
│   │
│   ├── styling/                       # Styling documentation
│   │   └── styling_guide.md            # Styling approach and patterns
│   │
│   └── nostr/                         # Nostr protocol documentation
│       └── exercise_nip.md             # Nostr exercise NIP
│
├── testing/                         # Testing documentation
│   ├── testing_strategy.md            # Overall testing approach
│   ├── cache_testing.md               # Cache implementation testing
│   └── contact_service_tests.md       # Contact service testing
│
├── project/                         # Project management documentation
│   ├── mvp_and_rebuild.md             # MVP and targeted rebuild plan
│   ├── roadmap.md                     # Project roadmap
│   ├── release_process.md             # Release process documentation
│   └── documentation/                 # Documentation about documentation
│       ├── organization_plan.md         # This document
│       ├── review_process.md            # Documentation review process
│       ├── implementation_script.md     # Implementation scripts
│       ├── migration_mapping.md         # Source → destination mapping
│       └── standards.md                 # Documentation standards
│
├── tools/                          # Documentation tools
│   ├── doc-migrator.js               # Migration script
│   ├── check-links.js                # Link validation script  
│   └── README.md                     # Tool documentation
│
└── archive/                         # Archived/obsolete documentation
    └── [outdated documents]           # Outdated documentation files
```

## Implementation Strategy

1. **Create New Structure**: Create the new folder structure while preserving existing files
2. **Document Review**: Review all existing documentation using the review_process.md criteria
3. **Migrate Content**:
   - Move files to their appropriate locations in the new structure
   - Rename files to follow consistent conventions
   - Update cross-references between documents
4. **Consolidate Documentation**:
   - Merge redundant documentation
   - Create new overview documents for each major feature area
5. **Archive Outdated Content**:
   - Move obsolete documentation to the archive folder
   - Add notices to archived docs indicating they're outdated
6. **Update References**:
   - Search codebase for references to documentation
   - Update any links in code comments or README files
7. **Documentation Index**:
   - Create an index file for each major section
   - Add a main index.md at the root of the docs directory

## File Naming Conventions

- Use `snake_case` for all documentation filenames for consistency
- Use descriptive but concise names that clearly indicate content
- For feature-specific docs, prefix with feature name: `social_architecture.md`
- For technical docs, use descriptive names: `subscription_analysis.md`

## Content Guidelines

- Each document should begin with a clear title and purpose statement
- Include a last-updated date in each document
- Include a table of contents for longer documents
- Use consistent heading levels (# for title, ## for major sections, etc.)
- Include code examples where appropriate
- Link to related documentation when referencing other concepts
- Include diagrams for complex systems or flows

## Priority Documents

The following documents should be prioritized in the migration process:

1. **docs/project/mvp_and_rebuild.md** (moved from MVPandTargetedRebuild.md)
2. **docs/technical/ndk/comprehensive_guide.md** (moved from NDK_Comprehensive_Guide.md)
3. **docs/features/social/architecture.md** (consolidated from social docs)
4. **docs/architecture/database_architecture.md** (updated from existing)
5. **docs/guides/coding_style.md** (moved from root)

## Document Example: Migration Template

For each document that needs to be migrated, use this template:

```markdown
# [Document Title]

**Last Updated:** [Date]
**Status:** [Active/Archived/Draft]
**Related To:** [Feature/Component]

## Purpose

Brief description of this document's purpose.

## Content

Main document content goes here.

## Related Documentation

- [Link to related doc 1]
- [Link to related doc 2]
```

## Success Criteria

The documentation reorganization will be considered successful when:

1. All documentation follows the new structure
2. No redundant documentation exists in multiple locations
3. All documentation is updated to reflect current implementation or plans
4. Key MVP-related documentation is prominently accessible
5. Naming conventions are consistent throughout
6. All cross-references between documents are functional
7. Obsolete documents are properly archived
8. New documentation is created to fill important gaps

## Related Documentation

- [Documentation Review Process](./review_process.md) - How to review documentation for quality and accuracy
- [Documentation Migration Implementation](./implementation_script.md) - Specific implementation details
- [Documentation Migration Mapping](./migration_mapping.md) - Mapping of source files to destinations
- [Documentation Standards](./standards.md) - Detailed documentation standards
