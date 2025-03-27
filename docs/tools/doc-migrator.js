#!/usr/bin/env node

/**
 * Documentation Migration Tool
 * 
 * This script facilitates the migration of documentation files from the old structure
 * to the new standardized structure outlined in the Documentation Organization Plan.
 * 
 * Usage:
 *   node doc-migrator.js <source> <destination> <title> <status> [--dryrun]
 * 
 * Example:
 *   node doc-migrator.js docs/design/WorkoutCompletion.md docs/features/workout/completion_flow.md "Workout Completion Flow" "Active"
 * 
 * Options:
 *   --dryrun  Preview the migration without making any changes
 */

const fs = require('fs');
const path = require('path');

// Process command line arguments
const args = process.argv.slice(2);
const dryRunIndex = args.indexOf('--dryrun');
const dryRun = dryRunIndex !== -1;

if (dryRun) {
  args.splice(dryRunIndex, 1);
}

if (args.length < 4) {
  console.error('Usage: node doc-migrator.js <source> <destination> <title> <status> [--dryrun]');
  console.error('Example: node doc-migrator.js docs/design/WorkoutCompletion.md docs/features/workout/completion_flow.md "Workout Completion Flow" "Active"');
  process.exit(1);
}

const [source, destination, title, status] = args;

// Validate inputs
if (!fs.existsSync(source)) {
  console.error(`Error: Source file '${source}' not found`);
  process.exit(1);
}

// Read source content
console.log(`Reading source file: ${source}`);
const sourceContent = fs.readFileSync(source, 'utf8');

// Extract content, removing the original title
const contentWithoutTitle = sourceContent.replace(/^# .+(\r?\n|\r)/, '');

// Create new content with template
const today = new Date().toISOString().slice(0, 10);
const newContent = `# ${title}

**Last Updated:** ${today}  
**Status:** ${status}  
**Related To:** [Fill in related component]

## Purpose

[Brief description of this document's purpose]

${contentWithoutTitle}

## Related Documentation

- [Add related document links]
`;

// In dry run mode, just show what would be migrated
if (dryRun) {
  console.log('\n=== DRY RUN ===');
  console.log(`\nWould create: ${destination}`);
  console.log('\nNew content preview:');
  console.log('-------------------');
  console.log(newContent.substring(0, 500) + '...');
  console.log('-------------------');
  console.log('\nNo changes were made (dry run mode)');
  process.exit(0);
}

// Ensure destination directory exists
const destDir = path.dirname(destination);
if (!fs.existsSync(destDir)) {
  console.log(`Creating directory structure: ${destDir}`);
  fs.mkdirSync(destDir, { recursive: true });
}

// Write new file
console.log(`Writing to destination: ${destination}`);
fs.writeFileSync(destination, newContent);
console.log(`✅ Successfully migrated ${source} to ${destination}`);

// Create a function to update the migration mapping file
function updateMigrationMapping(source, destination, status = '✅') {
  const mappingFile = 'docs/project/documentation/migration_mapping.md';
  
  if (!fs.existsSync(mappingFile)) {
    console.log(`Warning: Migration mapping file (${mappingFile}) not found. Skipping update.`);
    return;
  }
  
  console.log(`Updating migration mapping in ${mappingFile}`);
  let mappingContent = fs.readFileSync(mappingFile, 'utf8');
  
  // Find the line with the source file path
  const sourcePathRegex = new RegExp(`\\|\\s*⏳\\s*\\|\\s*${source.replace(/\//g, '\\/')}\\s*\\|`);
  
  if (sourcePathRegex.test(mappingContent)) {
    // Update the status if found
    mappingContent = mappingContent.replace(
      sourcePathRegex,
      `| ${status} | ${source} |`
    );
    
    // Update overall progress count
    const progressRegex = /\*\*Overall Progress\*\*: (\d+)\/(\d+) \((\d+)%\)/;
    const match = progressRegex.exec(mappingContent);
    
    if (match) {
      const completed = parseInt(match[1], 10) + 1;
      const total = parseInt(match[2], 10);
      const percentage = Math.round((completed / total) * 100);
      mappingContent = mappingContent.replace(
        progressRegex,
        `**Overall Progress**: ${completed}/${total} (${percentage}%)`
      );
    }
    
    fs.writeFileSync(mappingFile, mappingContent);
    console.log(`✅ Updated migration mapping file`);
  } else {
    console.log(`Note: Couldn't find entry for ${source} in mapping file.`);
  }
}

// Update the migration mapping
try {
  updateMigrationMapping(source, destination);
} catch (error) {
  console.error(`Warning: Failed to update migration mapping: ${error.message}`);
}

console.log('\nMigration completed successfully!');
console.log('\nNext steps:');
console.log('1. Review the migrated document and update the purpose section');
console.log('2. Add relevant related documentation links');
console.log('3. Update any cross-references in other documents');
