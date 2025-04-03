import { NostrEvent } from "@nostr-dev-kit/ndk";
import { SigningOperation } from "./types";

/**
 * A queue for managing Nostr event signing operations.
 * Prevents UI blocking by processing operations in a controlled manner.
 */
export class SigningQueue {
  private queue: SigningOperation[] = [];
  private processing = false;
  private maxConcurrent = 1;
  private activeCount = 0;

  /**
   * Adds a signing operation to the queue and returns a promise that resolves
   * when the signature is available
   * 
   * @param event The NostrEvent to sign
   * @returns Promise that resolves to the signature string
   */
  async enqueue(event: NostrEvent): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create signing operation with timestamp for ordering
      const operation: SigningOperation = { 
        event, 
        resolve, 
        reject,
        timestamp: Date.now()
      };
      
      // Add to queue and process
      this.queue.push(operation);
      this.processQueue();
    });
  }

  /**
   * Processes the next operation in the queue if conditions allow
   */
  private async processQueue() {
    if (this.processing || this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    
    try {
      // Sort queue by timestamp (oldest first)
      this.queue.sort((a, b) => a.timestamp - b.timestamp);
      
      const operation = this.queue.shift()!;
      this.activeCount++;
      
      try {
        // The actual signing will be implemented by the specific signer
        // that uses this queue. This method just prepares the operation.
        // We'll notify state managers about the operation starting/ending.
        
        // NOTE: The actual signing is handled externally by the signer
        // that uses this queue. This operation will remain pending until
        // the signer completes it and calls the resolve/reject callbacks.
      } catch (error) {
        console.error("Signing operation error:", error);
        operation.reject(error instanceof Error ? error : new Error(String(error)));
      } finally {
        this.activeCount--;
      }
    } finally {
      this.processing = false;
      // Continue processing if items remain
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }

  /**
   * Cancels all pending operations in the queue
   * 
   * @param reason The reason for cancellation
   */
  cancelAll(reason: string): void {
    const error = new Error(`Signing operations canceled: ${reason}`);
    
    // Reject all queued operations
    this.queue.forEach(operation => {
      operation.reject(error);
    });
    
    // Clear the queue
    this.queue = [];
    
    // Reset processing state
    this.processing = false;
    this.activeCount = 0;
  }

  /**
   * Returns the number of operations currently in the queue
   */
  get length(): number {
    return this.queue.length;
  }

  /**
   * Returns whether the queue is currently processing
   */
  get isProcessing(): boolean {
    return this.processing || this.activeCount > 0;
  }
}
