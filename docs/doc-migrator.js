#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Usage example: node doc-migrator.js docs/design/WorkoutCompletion.md docs/features/workout/completion_flow.md "Workout Completion Flow" "Active"

// Parse command line arguments
const [source, destination, title, status] = process.argv.slice(2);

if (!source || !destination || !title || !status) {
  console.error('Usage: node doc-migrator.js <source> <destination> <title> <status>');
  process.exit(1);
}

// Validate source file exists
if (!fs.existsSync(source)) {
  console.error(`Source file not found: ${source}`);
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

${sourceContent}

## Related Documentation

- [Add related document links]
`;

// Ensure destination directory exists
const destDir = path.dirname(destination);
if (!fs.existsSync(destDir)) {
  console.log(`Creating directory: ${destDir}`);
  fs.mkdirSync(destDir, { recursive: true });
}

// Write new file
console.log(`Writing to destination: ${destination}`);
fs.writeFileSync(destination, newContent);
console.log(`Successfully migrated ${source} to ${destination}`);

// Create a simple script to check for broken internal links
function createLinkChecker() {
  const linkCheckerContent = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docsRoot = path.resolve(__dirname);

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
}`;

  fs.writeFileSync(path.join(__dirname, 'check-links.js'), linkCheckerContent);
  console.log('Created link checker script: check-links.js');
}

// Create a link checker script
createLinkChecker();
