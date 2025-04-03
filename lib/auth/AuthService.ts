import NDK, { NDKUser, NDKSigner, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk-mobile";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { AuthMethod } from "./types";
import { AuthStateManager } from "./AuthStateManager";
import { SigningQueue } from "./SigningQueue";

// Constants for SecureStore
const PRIVATE_KEY_STORAGE_KEY = "powr.private_key";
const EXTERNAL_SIGNER_STORAGE_KEY = "nostr_external_signer";

/**
 * Service that manages authentication operations
 * Acts as the central implementation for all auth-related functionality
 */
export class AuthService {
  private ndk: NDK;
  private signingQueue = new SigningQueue();
  
  constructor(ndk: NDK) {
    this.ndk = ndk;
  }
  
  /**
   * Initialize from stored state
   */
  async initialize(): Promise<void> {
    try {
      console.log("[AuthService] Initializing...");
      
      // Try to restore previous auth session
      const privateKey = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
      
      if (privateKey) {
        console.log("[AuthService] Found stored private key, attempting to login");
        await this.loginWithPrivateKey(privateKey);
        return;
      }
      
      // Try to restore external signer session
      const externalSignerJson = await SecureStore.getItemAsync(EXTERNAL_SIGNER_STORAGE_KEY);
      if (externalSignerJson) {
        try {
          const signerInfo = JSON.parse(externalSignerJson);
          if (signerInfo.type === "amber" && signerInfo.pubkey && signerInfo.packageName) {
            console.log("[AuthService] Found stored external signer info, attempting to login");
            await this.loginWithAmber(signerInfo.pubkey, signerInfo.packageName);
            return;
          }
        } catch (error) {
          console.warn("[AuthService] Error parsing external signer info:", error);
          // Continue to unauthenticated state
        }
      }
      
      console.log("[AuthService] No stored credentials found, remaining unauthenticated");
    } catch (error) {
      console.error("[AuthService] Error initializing auth service:", error);
      AuthStateManager.setError(error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  /**
   * Login with a private key
   */
  async loginWithPrivateKey(privateKey: string): Promise<NDKUser> {
    try {
      console.log("[AuthService] Starting private key login");
      AuthStateManager.setAuthenticating("private_key");
      
      // Clean the input
      privateKey = privateKey.trim();
      
      // Configure NDK with private key signer
      this.ndk.signer = await this.createPrivateKeySigner(privateKey);
      
      // Get user
      const user = await this.ndk.signer.user();
      console.log("[AuthService] Signer created, user retrieved:", user.npub);
      
      // Fetch profile information if possible
      try {
        await user.fetchProfile();
        console.log("[AuthService] Profile fetched successfully");
      } catch (profileError) {
        console.warn("[AuthService] Warning: Could not fetch user profile:", profileError);
        // Continue even if profile fetch fails
      }
      
      // Store key securely
      await SecureStore.setItemAsync(PRIVATE_KEY_STORAGE_KEY, privateKey);
      
      // Update auth state
      AuthStateManager.setAuthenticated(user, "private_key");
      console.log("[AuthService] Private key login complete");
      
      return user;
    } catch (error) {
      console.error("[AuthService] Private key login error:", error);
      AuthStateManager.setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * Login with Amber signer
   */
  async loginWithAmber(pubkey?: string, packageName?: string): Promise<NDKUser> {
    try {
      console.log("[AuthService] Starting Amber login");
      AuthStateManager.setAuthenticating("amber");
      
      // Request public key from Amber if not provided
      let effectivePubkey = pubkey;
      let effectivePackageName = packageName;
      
      if (!effectivePubkey || !effectivePackageName) {
        console.log("[AuthService] No pubkey/packageName provided, requesting from Amber");
        const info = await this.requestAmberPublicKey();
        effectivePubkey = info.pubkey;
        effectivePackageName = info.packageName;
      }
      
      // Create an NDKAmberSigner
      console.log("[AuthService] Creating Amber signer with pubkey:", effectivePubkey);
      this.ndk.signer = await this.createAmberSigner(effectivePubkey, effectivePackageName);
      
      // Get user
      const user = await this.ndk.signer.user();
      console.log("[AuthService] User fetched from Amber signer");
      
      // Fetch profile
      try {
        await user.fetchProfile();
        console.log("[AuthService] Profile fetched successfully");
      } catch (profileError) {
        console.warn("[AuthService] Warning: Could not fetch user profile:", profileError);
        // Continue even if profile fetch fails
      }
      
      // Store signer info securely
      const signerInfo = JSON.stringify({
        type: "amber",
        pubkey: effectivePubkey,
        packageName: effectivePackageName
      });
      await SecureStore.setItemAsync(EXTERNAL_SIGNER_STORAGE_KEY, signerInfo);
      
      // Update auth state
      AuthStateManager.setAuthenticated(user, "amber");
      console.log("[AuthService] Amber login complete");
      
      return user;
    } catch (error) {
      console.error("[AuthService] Amber login error:", error);
      AuthStateManager.setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * Create ephemeral key (no login)
   */
  async createEphemeralKey(): Promise<NDKUser> {
    try {
      console.log("[AuthService] Creating ephemeral key");
      AuthStateManager.setAuthenticating("ephemeral");
      
      // Generate a random key
      this.ndk.signer = await this.createEphemeralSigner();
      
      // Get user
      const user = await this.ndk.signer.user();
      console.log("[AuthService] Ephemeral key created, user npub:", user.npub);
      
      // Update auth state
      AuthStateManager.setAuthenticated(user, "ephemeral");
      console.log("[AuthService] Ephemeral login complete");
      
      return user;
    } catch (error) {
      console.error("[AuthService] Ephemeral key creation error:", error);
      AuthStateManager.setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      console.log("[AuthService] Logging out");
      
      // Cancel any pending sign operations
      this.signingQueue.cancelAll("User logged out");
      
      // Notify the Amber app of session termination (Android only)
      if (Platform.OS === "android" && this.ndk.signer) {
        try {
          const signerInfo = await SecureStore.getItemAsync(EXTERNAL_SIGNER_STORAGE_KEY);
          if (signerInfo) {
            console.log("[AuthService] Notifying Amber of session termination");
            // This would call the native module method to terminate the Amber session
            // Will be implemented in the AmberSignerModule.kt
          }
        } catch (error) {
          console.warn("[AuthService] Error terminating Amber session:", error);
          // Continue with logout even if Amber notification fails
        }
      }
      
      // Clear NDK signer
      console.log("[AuthService] Clearing NDK signer");
      this.ndk.signer = undefined;
      
      // Clear auth state - this will also clear storage
      await AuthStateManager.logout();
      
      console.log("[AuthService] Logout complete");
    } catch (error) {
      console.error("[AuthService] Logout error:", error);
      throw error;
    }
  }
  
  // Private helper methods for creating specific signers
  
  /**
   * Creates a private key signer from a hex or nsec string
   */
  private async createPrivateKeySigner(privateKey: string): Promise<NDKSigner> {
    console.log("[AuthService] Creating private key signer");
    
    // Handle nsec formatted keys
    if (privateKey.startsWith("nsec")) {
      try {
        const { nip19 } = await import("nostr-tools");
        const { data } = nip19.decode(privateKey);
        // Convert the decoded data (Uint8Array) to hex string
        privateKey = Buffer.from(data as Uint8Array).toString("hex");
      } catch (error) {
        console.error("[AuthService] Error decoding nsec:", error);
        throw new Error("Invalid nsec format");
      }
    }
    
    // Ensure private key is valid hex format
    if (privateKey.length !== 64 || !/^[0-9a-f]+$/i.test(privateKey)) {
      throw new Error("Invalid private key format - must be nsec or 64-character hex");
    }
    
    return new NDKPrivateKeySigner(privateKey);
  }
  
  /**
   * Requests a public key from Amber
   */
  private async requestAmberPublicKey(): Promise<{ pubkey: string, packageName: string }> {
    console.log("[AuthService] Requesting public key from Amber");
    
    if (Platform.OS !== "android") {
      throw new Error("Amber signer is only available on Android");
    }
    
    try {
      // We'll dynamically import NDKAmberSigner to avoid circular dependencies
      const { default: NDKAmberSigner } = await import("@/lib/signers/NDKAmberSigner");
      // Call the static method to request a public key
      const { pubkey, packageName } = await NDKAmberSigner.requestPublicKey();
      
      if (!pubkey || !packageName) {
        throw new Error("Amber returned invalid pubkey or packageName");
      }
      
      return { pubkey, packageName };
    } catch (error) {
      console.error("[AuthService] Error requesting public key from Amber:", error);
      throw error;
    }
  }
  
  /**
   * Creates an Amber signer with the given pubkey and package name
   */
  private async createAmberSigner(pubkey: string, packageName: string): Promise<NDKSigner> {
    console.log("[AuthService] Creating Amber signer");
    
    if (Platform.OS !== "android") {
      throw new Error("Amber signer is only available on Android");
    }
    
    // Dynamically import to avoid circular dependencies
    const { default: NDKAmberSigner } = await import("@/lib/signers/NDKAmberSigner");
    return new NDKAmberSigner(pubkey, packageName);
  }
  
  /**
   * Creates an ephemeral signer with a random keypair
   */
  private async createEphemeralSigner(): Promise<NDKSigner> {
    console.log("[AuthService] Creating ephemeral signer");
    
    // Generate a new random keypair
    const { generateSecretKey } = await import("nostr-tools");
    const secretKeyBytes = generateSecretKey();
    // Convert to hex for the private key signer
    const privateKey = Array.from(secretKeyBytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
    
    return new NDKPrivateKeySigner(privateKey);
  }
}
