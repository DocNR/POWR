# Documentation Migration Mapping

**Last Updated:** 2025-04-01  
**Status:** Active  
**Related To:** Documentation Organization, Migration Process

## Purpose

This document tracks the migration of documentation files from their original locations to their new destinations in the reorganized documentation structure. It serves as both a migration checklist and a reference for finding documents that have been moved.

## Migration Status Legend

- ✅ **Migrated**: File has been migrated to new location
- 🔄 **In Progress**: Migration started but not complete
- ⏳ **Pending**: Not yet migrated
- 🔀 **Consolidated**: Combined with other document(s)
- 📁 **Archived**: Moved to archive due to obsolescence
- ❌ **Deprecated**: Content no longer relevant, not migrated

## High Priority Documents

| Status | Original Path | New Path | Notes |
|--------|--------------|----------|-------|
| ✅ | docs/design/MVPandTargetedRebuild.md | docs/project/mvp_and_rebuild.md | Updated with proper metadata and cross-references |
| ✅ | docs/design/Analysis/NDK_Comprehensive_Guide.md | docs/technical/ndk/comprehensive_guide.md | Updated with new links |
| ✅ | docs/design/DocumentationOrganizationPlan.md | docs/project/documentation/organization_plan.md | Updated with links to related docs |
| ✅ | docs/design/DocumentationReviewPrompt.md | docs/project/documentation/review_process.md | Updated with new structure references |
| ✅ | docs/design/DocumentationImplementationScript.md | docs/project/documentation/implementation_script.md | Updated script for new structure |
| ✅ | docs/design/nostr-exercise-nip.md | docs/technical/nostr/exercise_nip.md | - |
| ✅ | docs/design/WorkoutCompletion.md | docs/features/workout/completion_flow.md | - |
| ✅ | docs/design/POWR Pack/POWRPack.md | docs/features/powr_packs/overview.md | Enhanced with proper structure and metadata |
| ✅ | docs/design/POWR Pack/POWR_Pack_Implementation_Plan.md | docs/features/powr_packs/implementation_plan.md | Technical content reorganized and expanded |
| ✅ | docs/design/Analysis/NDKSubscriptionAnalysis.md | docs/technical/ndk/subscription_analysis.md | Enhanced with code examples and best practices |
| ✅ | docs/design/Analysis/NDKandNip19.md | docs/technical/nostr/encoding_decoding.md | Complete guide with practical examples |
| ✅ | docs/coding_style.md | docs/guides/coding_style.md | Enhanced with React/TypeScript specifics and standardized formatting |

## NDK Related Documents

| Status | Original Path | New Path | Notes |
|--------|--------------|----------|-------|
| ✅ | docs/design/Analysis/NDK_Comprehensive_Guide.md | docs/technical/ndk/comprehensive_guide.md | - |
| ✅ | docs/design/Analysis/NDKSubscriptionAnalysis.md | docs/technical/ndk/subscription_analysis.md | Enhanced with code examples and best practices |
| ✅ | docs/design/Analysis/NDKandNip19.md | docs/technical/nostr/encoding_decoding.md | Complete guide with practical examples |
| ⏳ | docs/design/Analysis/NDKFunctionHexKeys.md | docs/technical/ndk/function_hex_keys.md | - |

## POWR Pack Related Documents

| Status | Original Path | New Path | Notes |
|--------|--------------|----------|-------|
| ✅ | docs/design/POWR Pack/POWRPack.md | docs/features/powr_packs/overview.md | Enhanced with proper structure and metadata |
| ✅ | docs/design/POWR Pack/POWR_Pack_Implementation_Plan.md | docs/features/powr_packs/implementation_plan.md | Technical content reorganized and expanded |

## Social Related Documents

| Status | Original Path | New Path | Notes |
|--------|--------------|----------|-------|
| ✅ | docs/design/Social/POWRSocialArchitecture.md | docs/features/social/architecture.md | Enhanced with structure diagrams |
| ✅ | docs/design/Social/POWRSocialFeedImplementationPlan.md | docs/features/social/feed_implementation_details.md | Enhanced with code examples |
| ✅ | docs/design/Social/UpdatedPlan.md | docs/features/social/implementation_plan.md | Enhanced with NDK patterns |
| ✅ | docs/design/Social/SocialFeedFilteringRules.md | docs/features/social/feed_filtering.md | Enhanced with implementation details |
| ✅ | docs/design/Social/SocialFeedCacheImplementation.md | docs/features/social/cache_implementation.md | Enhanced with error handling examples |
| 📁 | docs/design/Social/ImplementationPlan.md | - | Superseded by newer documents |
| 📁 | docs/design/Analysis/OlasSocialFeed.md | - | Historical analysis, superseded by newer approaches |

## Workout Related Documents

| Status | Original Path | New Path | Notes |
|--------|--------------|----------|-------|
| ✅ | docs/design/WorkoutCompletion.md | docs/features/workout/completion_flow.md | - |
| ✅ | docs/design/WorkoutTab/WorkoutTabDesignDoc.md | docs/features/workout/workout_overview.md | Enhanced with implementation status |
| ✅ | docs/design/WorkoutTab/WorkoutUIComponentSpec.md | docs/features/workout/ui_components.md | Enhanced with accessibility details |
| ✅ | docs/design/WorkoutTab/WorkoutDataFlowSpec.md | docs/features/workout/data_models.md | Enhanced with error handling examples |
| ⏳ | docs/design/WorkoutTab/WorkoutImplementationRoadmap.md | docs/features/workout/implementation_roadmap.md | - |
| ⏳ | docs/design/WorkoutTab/Summary.md | 🔀 | To be consolidated into workout_overview.md |
| ✅ | docs/design/WorkoutTab/HistoryTabEnhancementDesignDoc.md | docs/features/history/history_overview.md | Enhanced with architecture diagrams and implementation status |
| ✅ | docs/design/WorkoutHistory/MigrationGuide.md | docs/features/history/migration_guide.md | Updated with code examples and troubleshooting tips |

## Profile Related Documents

| Status | Original Path | New Path | Notes |
|--------|--------------|----------|-------|
| ✅ | docs/design/ProfileTab/ProfileTabEnhancementDesignDoc.md | docs/features/profile/profile_overview.md | Complete migration with extensive restructuring. Created detailed tab-specific documentation, authentication patterns guide, and technical implementation details. |

## Library Related Documents

| Status | Original Path | New Path | Notes |
|--------|--------------|----------|-------|
| ✅ | docs/design/library_tab.md | docs/features/library/library_overview.md | Reformatted with modern styling and enhanced with component architecture details |
| ✅ | docs/design/Templates/TemplateOrganization.md | docs/features/library/template_organization.md | Consolidated with template-creation-design.md and enhanced with implementation status details |
| ✅ | docs/design/template-creation-design.md | 🔀 | Consolidated into template_organization.md with proper archival reference |

## Technical Documents

| Status | Original Path | New Path | Notes |
|--------|--------------|----------|-------|
| ✅ | docs/design/nostr-exercise-nip.md | docs/technical/nostr/exercise_nip.md | - |
| ⏳ | docs/design/database_architecture.md | docs/architecture/database_architecture.md | - |
| ⏳ | docs/design/database_implementation.md | docs/architecture/database_implementation.md | - |
| ✅ | docs/design/cache-management.md | docs/technical/caching/cache_management.md | Enhanced with NDK analysis and unified architecture proposal |
| ✅ | docs/design/styling_design_doc.md | docs/technical/styling/styling_guide.md | Enhanced with cross-platform guidance and platform-specific considerations |

## Settings Related Documents

| Status | Original Path | New Path | Notes |
|--------|--------------|----------|-------|
| ⏳ | docs/design/Settings/SettingsImplementationGuide.md | docs/features/settings/implementation_guide.md | - |

## Testing Related Documents

| Status | Original Path | New Path | Notes |
|--------|--------------|----------|-------|
| ⏳ | docs/testing/ContactCacheServiceTests.md | docs/testing/contact_cache_service_tests.md | - |
| ⏳ | docs/testing/CacheImplementationTesting.md | docs/testing/cache_testing.md | - |

## Other Documents

| Status | Original Path | New Path | Notes |
|--------|--------------|----------|-------|
| ⏳ | docs/ai_collaboration_guide.md | docs/guides/ai_collaboration_guide.md | - |
| ⏳ | docs/writing_good_interfaces.md | docs/guides/writing_good_interfaces.md | - |
| ⏳ | docs/design/RNR-original-example.tsx | 📁 | Historical reference only |

## Migration Progress

- **High Priority Documents**: 12/12 (100%)
- **NDK Related Documents**: 3/4 (75%)
- **POWR Pack Related Documents**: 2/2 (100%)
- **Social Related Documents**: 5/7 (71%)
- **Workout Related Documents**: 4/8 (50%)
- **Profile Related Documents**: 1/1 (100%)
- **Library Related Documents**: 3/3 (100%)
- **Technical Documents**: 3/5 (60%)
- **Settings Related Documents**: 0/1 (0%)
- **Testing Related Documents**: 0/2 (0%)
- **Other Documents**: 0/3 (0%)

**Overall Progress**: 30/48 (62.5%)

## Related Documentation

- [Documentation Organization Plan](./organization_plan.md) - Overall documentation organization strategy
- [Documentation Review Process](./review_process.md) - Process for reviewing documentation quality
- [Documentation Implementation Script](./implementation_script.md) - Implementation details for migration
- [Documentation Standards](./standards.md) - Detailed documentation standards
