#!/usr/bin/env node

/**
 * Documentation Link Checker
 * 
 * This script verifies that internal links between documentation files are valid.
 * It scans all markdown files in the docs directory and checks that relative links
 * point to existing files.
 * 
 * Usage:
 *   node check-links.js [--fix]
 * 
 * Options:
 *   --fix  Attempt to fix broken links by updating to the new file paths from migration mapping
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const shouldFix = args.includes('--fix');

// Get the docs directory path
const docsRoot = path.resolve(__dirname, '..');

// Get all markdown files
console.log('Finding all markdown files...');
const allMdFiles = execSync(`find ${docsRoot} -name "*.md"`)
  .toString()
  .split('\n')
  .filter(Boolean);

console.log(`Found ${allMdFiles.length} markdown files to check`);

// Track all files and links
const allFiles = new Set(allMdFiles.map(f => path.relative(docsRoot, f)));
const brokenLinks = [];
const fixedLinks = [];

// Optional: Load the migration mapping to attempt to fix broken links
let migrationMap = null;
if (shouldFix) {
  try {
    const mappingFile = path.join(docsRoot, 'project', 'documentation', 'migration_mapping.md');
    if (fs.existsSync(mappingFile)) {
      const mappingContent = fs.readFileSync(mappingFile, 'utf8');
      
      // Parse migration mapping table to get old->new path mappings
      migrationMap = {};
      const tableRows = mappingContent.match(/\|\s*(?:✅|🔄|⏳|🔀|📁|❌)\s*\|\s*([^\|]+)\s*\|\s*([^\|]+)\s*\|/g);
      
      if (tableRows) {
        tableRows.forEach(row => {
          const match = row.match(/\|\s*(?:✅|🔄|⏳|🔀|📁|❌)\s*\|\s*([^\|]+)\s*\|\s*([^\|]+)\s*\|/);
          if (match && match[1] && match[2]) {
            const oldPath = match[1].trim();
            let newPath = match[2].trim();
            
            // Skip archived/deprecated entries (they might not have a new path)
            if (newPath !== '📁' && newPath !== '❌' && !newPath.startsWith('🔀')) {
              migrationMap[oldPath] = newPath;
            }
          }
        });
      }
      
      console.log(`Loaded ${Object.keys(migrationMap).length} migration mappings for fixing broken links`);
    }
  } catch (err) {
    console.warn(`Warning: Failed to load migration mapping: ${err.message}`);
    console.log('Continuing without auto-fix capability');
  }
}

// Function to suggest a fix for a broken link
function suggestFix(brokenLink, sourceFileDir) {
  if (!migrationMap) return null;
  
  // Try to resolve the link as if it were pointing to an old file path
  const absoluteBrokenPath = path.resolve(sourceFileDir, brokenLink);
  const relativeBrokenPath = path.relative(docsRoot, absoluteBrokenPath);
  
  // Check if the broken link matches any old paths in our migration map
  for (const oldPath in migrationMap) {
    if (relativeBrokenPath.includes(oldPath) || oldPath.includes(relativeBrokenPath)) {
      const newPath = migrationMap[oldPath];
      
      // Create a relative link from source file to the new path
      const relativeNew = path.relative(
        sourceFileDir, 
        path.join(docsRoot, newPath)
      );
      
      return relativeNew;
    }
  }
  
  return null;
}

// Check each file for broken links
console.log('Checking links...');
let totalLinks = 0;

allMdFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const relativeFile = path.relative(docsRoot, file);
  const fileDir = path.dirname(file);
  
  // Find markdown links
  const linkRegex = /\[.*?\]\((.*?)\)/g;
  let match;
  let fileModified = false;
  let newContent = content;
  
  while ((match = linkRegex.exec(content)) !== null) {
    const link = match[1];
    totalLinks++;
    
    // Skip external links, anchors, and mailto links
    if (link.startsWith('http') || link.startsWith('#') || link.startsWith('mailto:')) continue;
    
    // Deal with links that contain anchors
    const [linkPath, anchor] = link.split('#');
    
    // Resolve relative to the file
    const resolvedLink = path.normalize(path.join(fileDir, linkPath));
    const resolvedRelative = path.relative(docsRoot, resolvedLink);
    
    // Check if file exists
    if (!fs.existsSync(resolvedLink)) {
      const issue = {
        file: relativeFile,
        link,
        resolvedLink: resolvedRelative,
        fullMatch: match[0],
        fix: null
      };
      
      // Try to suggest a fix
      if (shouldFix) {
        const suggestedFix = suggestFix(linkPath, fileDir);
        if (suggestedFix) {
          issue.fix = suggestedFix + (anchor ? `#${anchor}` : '');
          
          // Replace the link in the content
          const originalLink = match[0];
          const fixedLink = originalLink.replace(link, issue.fix);
          newContent = newContent.replace(originalLink, fixedLink);
          fileModified = true;
          
          fixedLinks.push(issue);
        }
      }
      
      brokenLinks.push(issue);
    }
  }
  
  // Save fixed content if needed
  if (fileModified) {
    fs.writeFileSync(file, newContent);
    console.log(`✅ Fixed links in ${relativeFile}`);
  }
});

// Report results
console.log(`\nChecked ${totalLinks} links in ${allMdFiles.length} files.`);

if (brokenLinks.length > 0) {
  console.log(`\nFound ${brokenLinks.length} broken links:`);
  
  brokenLinks.forEach(({ file, link, resolvedLink, fix }) => {
    console.log(`• In ${file}: Broken link ${link} (resolves to ${resolvedLink})`);
    if (fix) {
      console.log(`  ✓ Fixed to: ${fix}`);
    }
  });
  
  if (shouldFix) {
    console.log(`\nAutomatically fixed ${fixedLinks.length} links.`);
    if (fixedLinks.length < brokenLinks.length) {
      console.log(`${brokenLinks.length - fixedLinks.length} links could not be automatically fixed.`);
    }
  } else {
    console.log('\nTip: Run with --fix to attempt automatic fixes based on migration mapping.');
  }
  
  process.exit(1);
} else {
  console.log('\n✅ All links are valid!');
  process.exit(0);
}
