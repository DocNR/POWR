import { NDKUser, NostrEvent } from "@nostr-dev-kit/ndk";

export type AuthMethod = 'private_key' | 'amber' | 'ephemeral';

export type SigningOperation = {
  event: NostrEvent;
  resolve: (signature: string) => void;
  reject: (error: Error) => void;
  timestamp: number;
};

export type AuthState = 
  | { status: 'unauthenticated' }
  | { status: 'authenticating', method: AuthMethod }
  | { status: 'authenticated', user: NDKUser, method: AuthMethod }
  | { 
      status: 'signing', 
      user: NDKUser,
      method: AuthMethod,
      operationCount: number, 
      operations: SigningOperation[] 
    }
  | { status: 'error', error: Error, previousState?: AuthState };

export interface AuthActions {
  setAuthenticating: (method: AuthMethod) => void;
  setAuthenticated: (user: NDKUser, method: AuthMethod) => void;
  setSigningInProgress: (inProgress: boolean, operation: SigningOperation) => void;
  logout: () => Promise<boolean>;
  setError: (error: Error) => void;
}
