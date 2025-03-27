#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docsRoot = path.resolve(__dirname);

// Get all markdown files
const allMdFiles = execSync(`find ${docsRoot} -name "*.md"`).toString().split('\n').filter(Boolean);

// Track all files and links
const allFiles = new Set(allMdFiles.map(f => path.relative(docsRoot, f)));
const brokenLinks = [];

allMdFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const relativeFile = path.relative(docsRoot, file);
  
  // Find markdown links
  const linkRegex = /\[.*?\]\((.*?)\)/g;
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
    console.log(`In ${file}: Broken link ${link} (resolves to ${resolvedLink})`);
  });
  process.exit(1);
} else {
  console.log('All links are valid!');
}