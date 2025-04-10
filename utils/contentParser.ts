// utils/contentParser.ts
/**
 * Utility functions for parsing content in social posts, including URL detection,
 * image URL detection, and content segmentation for rendering.
 */

/**
 * Regular expression for detecting URLs
 * Matches common URL patterns with or without protocol
 */
const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;

/**
 * Regular expression for detecting image URLs
 * Matches URLs ending with common image extensions
 */
const IMAGE_URL_REGEX = /\.(gif|jpe?g|tiff?|png|webp|bmp)(\?.*)?$/i;

/**
 * Interface for content segments
 */
export interface ContentSegment {
  type: 'text' | 'url' | 'image';
  content: string;
}

/**
 * Check if a URL is an image URL based on its extension
 * 
 * @param url URL to check
 * @returns Boolean indicating if URL is an image
 */
export function isImageUrl(url: string): boolean {
  return IMAGE_URL_REGEX.test(url);
}

/**
 * Extract URLs from text
 * 
 * @param text Text to extract URLs from
 * @returns Array of URLs found in the text
 */
export function extractUrls(text: string): string[] {
  return text.match(URL_REGEX) || [];
}

/**
 * Parse text content into segments for rendering
 * Each segment is either plain text, a URL, or an image URL
 * 
 * @param content Text content to parse
 * @returns Array of content segments
 */
export function parseContent(content: string): ContentSegment[] {
  if (!content) return [];
  
  const segments: ContentSegment[] = [];
  const urls = extractUrls(content);
  
  // If no URLs, return whole content as text
  if (urls.length === 0) {
    return [{ type: 'text', content }];
  }
  
  // Split content by URLs and create segments for each part
  let remainingContent = content;
  
  urls.forEach(url => {
    const parts = remainingContent.split(url);
    
    // Add text before URL if exists
    if (parts[0]) {
      segments.push({ type: 'text', content: parts[0] });
    }
    
    // Add URL (as image or link)
    const type = isImageUrl(url) ? 'image' : 'url';
    segments.push({ type, content: url });
    
    // Update remaining content
    remainingContent = parts.slice(1).join(url);
  });
  
  // Add any remaining text
  if (remainingContent) {
    segments.push({ type: 'text', content: remainingContent });
  }
  
  return segments;
}
