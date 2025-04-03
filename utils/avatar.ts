/**
 * Utility functions for avatar handling
 */

/**
 * Generates a consistent Robohash URL for a user
 * @param pubkey User's public key or npub
 * @param fallback Fallback string to use if no pubkey is provided
 * @param size Size of the image to request (default: 150x150)
 * @returns URL string for the Robohash avatar
 */
export const getRobohashUrl = (pubkey?: string, fallback: string = 'anonymous', size: string = '150x150'): string => {
  // Use pubkey if available, otherwise use fallback string
  const seed = pubkey || fallback;
  
  // Always use set3 for consistent robot style across the app
  return `https://robohash.org/${seed}?set=set3&size=${size}`;
};

/**
 * Gets a consistent seed for user avatar generation
 * Useful when we need the seed but not the full URL
 * @param pubkey User's public key or npub 
 * @param fallback Fallback string to use if no pubkey is provided
 * @returns A string to use as a seed for avatar generation
 */
export const getAvatarSeed = (pubkey?: string, fallback: string = 'anonymous'): string => {
  return pubkey || fallback;
};
