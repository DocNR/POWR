Let me examine some of the key files related to subscriptions and contact lists. First, let's look at the subscription implementation:
─── text_editor | developer ──────────────────────────
path: ~/ndk/ndk/src/subscription/index.ts
command: view


### /Users/danielwyler/ndk/ndk/src/subscription/index.ts
```typescript
import { EventEmitter } from "tseep";

import type { NDKEventId, NostrEvent } from "../events/index.js";
import { NDKEvent } from "../events/index.js";
import type { NDK } from "../ndk/index.js";
import type { NDKRelay } from "../relay";
import type { NDKPool } from "../relay/pool/index.js";
import { calculateRelaySetsFromFilters } from "../relay/sets/calculate";
import type { NDKRelaySet } from "../relay/sets/index.js";
import { queryFullyFilled } from "./utils.js";
import type { NDKKind } from "../events/kinds/index.js";
import { verifiedSignatures } from "../events/validation.js";
import { wrapEvent } from "../events/wrap.js";

export type NDKSubscriptionInternalId = string;

export type NDKSubscriptionDelayedType = "at-least" | "at-most";

export type NDKFilter<K extends number = NDKKind> = {
    ids?: string[];
    kinds?: K[];
    authors?: string[];
    since?: number;
    until?: number;
    limit?: number;
    search?: string;
    [key: `#${string}`]: string[] | undefined;
};

export enum NDKSubscriptionCacheUsage {
    // Only use cache, don't subscribe to relays
    ONLY_CACHE = "ONLY_CACHE",

    // Use cache, if no matches, use relays
    CACHE_FIRST = "CACHE_FIRST",

    // Use cache in addition to relays
    PARALLEL = "PARALLEL",

    // Skip cache, don't query it
    ONLY_RELAY = "ONLY_RELAY",
}

export interface NDKSubscriptionOptions {
    /**
     * Whether to close the subscription when all relays have reached the end of the event stream.
     * @default false
     */
    closeOnEose?: boolean;
    cacheUsage?: NDKSubscriptionCacheUsage;

    /**
     * Whether to skip caching events coming from this subscription
     **/
    dontSaveToCache?: boolean;

    /**
     * Groupable subscriptions are created with a slight time
     * delayed to allow similar filters to be grouped together.
     */
    groupable?: boolean;

    /**
     * The delay to use when grouping subscriptions, specified in milliseconds.
     * @default 100
     * @example
     * const sub1 = ndk.subscribe({ kinds: [1], authors: ["alice"] }, { groupableDelay: 100 });
     * const sub2 = ndk.subscribe({ kinds: [0], authors: ["alice"] }, { groupableDelay: 1000 });
     * // sub1 and sub2 will be grouped together and executed 100ms after sub1 was created
     */
    groupableDelay?: number;

    /**
     * Specifies how this delay should be interpreted.
     * "at-least" means "wait at least this long before sending the subscription"
     * "at-most" means "wait at most this long before sending the subscription"
     * @default "at-most"
     * @example
     * const sub1 = ndk.subscribe({ kinds: [1], authors: ["alice"] }, { groupableDelay: 100, groupableDelayType: "at-least" });
     * const sub2 = ndk.subscribe({ kinds: [0], authors: ["alice"] }, { groupableDelay: 1000, groupableDelayType: "at-most" });
     * // sub1 and sub2 will be grouped together and executed 1000ms after sub1 was created
     */
    groupableDelayType?: NDKSubscriptionDelayedType;

    /**
     * The subscription ID to use for the subscription.
     */
    subId?: string;

    /**
     * Pool to use
     */
    pool?: NDKPool;

    /**
     * Skip signature verification
     * @default false
     */
    skipVerification?: boolean;

    /**
     * Skip event validation. Event validation, checks whether received
     * kinds conform to what the expected schema of that kind should look like.rtwle
     * @default false
     */
    skipValidation?: boolean;

    /**
     * Skip emitting on events before they are received from a relay. (skip optimistic publish)
     * @default false
     */
    skipOptimisticPublishEvent?: boolean;

    /**
     * Remove filter constraints when querying the cache.
     * 
     * This allows setting more aggressive filters that will be removed when hitting the cache.
     * 
     * Useful uses of this include removing `since` or `until` constraints or `limit` filters.
     * 
     * @example
     * ndk.subscribe({ kinds: [1], since: 1710000000, limit: 10 }, { cacheUnconstrainFilter: ['since', 'limit'] });
     * 
     * This will hit relays with the since and limit constraints, while loading from the cache without them.
     */
    cacheUnconstrainFilter?: (keyof NDKFilter)[];

    /**
     * Whether to wrap events in kind-specific classes when possible.
     * @default false
     */
    wrap?: boolean;
}

/**
 * Default subscription options.
 */
export const defaultOpts: NDKSubscriptionOptions = {
    closeOnEose: false,
    cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
    dontSaveToCache: false,
    groupable: true,
    groupableDelay: 100,
    groupableDelayType: "at-most",
    cacheUnconstrainFilter: ['limit', 'since', 'until']
};

/**
 * Represents a subscription to an NDK event stream.
 *
 * @emits event
 * Emitted when an event is received by the subscription.
 * * ({NDKEvent} event - The event received by the subscription,
 * * {NDKRelay} relay - The relay that received the event,
 * * {NDKSubscription} subscription - The subscription that received the event.)
 *
 * @emits event:dup
 * Emitted when a duplicate event is received by the subscription.
 * * {NDKEvent} event - The duplicate event received by the subscription.
 * * {NDKRelay} relay - The relay that received the event.
 * * {number} timeSinceFirstSeen - The time elapsed since the first time the event was seen.
 * * {NDKSubscription} subscription - The subscription that received the event.
 * 
 * @emits cacheEose - Emitted when the cache adapter has reached the end of the events it had.
 *
 * @emits eose - Emitted when all relays have reached the end of the event stream.
 * * {NDKSubscription} subscription - The subscription that received EOSE.
 *
 * @emits close - Emitted when the subscription is closed.
 * * {NDKSubscription} subscription - The subscription that was closed.
 *
 * @example
 * const sub = ndk.subscribe({ kinds: [1] }); // Get all kind:1s
 * sub.on("event", (event) => console.log(event.content); // Show the content
 * sub.on("eose", () => console.log("All relays have reached the end of the event stream"));
 * sub.on("close", () => console.log("Subscription closed"));
 * setTimeout(() => sub.stop(), 10000); // Stop the subscription after 10 seconds
 *
 * @description
 * Subscriptions are created using {@link NDK.subscribe}.
 *
 * # Event validation
 * By defaults, subscriptions will validate events to comply with the minimal requirement
 * of each known NIP.
 * This can be disabled by setting the `skipValidation` option to `true`.
 *
 * @example
 * const sub = ndk.subscribe({ kinds: [1] }, { skipValidation: false });
 * sub.on("event", (event) => console.log(event.content); // Only valid events will be received
 */
export class NDKSubscription extends EventEmitter<{
    cacheEose: () => void;
    eose: (sub: NDKSubscription) => void;
    close: (sub: NDKSubscription) => void;

    /**
     * Emitted when a duplicate event is received by the subscription.
     * @param event - The duplicate event received by the subscription.
     * @param relay - The relay that received the event.
     * @param timeSinceFirstSeen - The time elapsed since the first time the event was seen.
     * @param sub - The subscription that received the event.
     */
    "event:dup": (
        event: NDKEvent | NostrEvent,
        relay: NDKRelay | undefined,
        timeSinceFirstSeen: number,
        sub: NDKSubscription,
        fromCache: boolean,
        optimisticPublish: boolean
    ) => void;
    
    /**
     * Emitted when an event is received by the subscription.
     * @param event - The event received by the subscription.
     * @param relay - The relay that received the event.
     * @param sub - The subscription that received the event.
     * @param fromCache - Whether the event was received from the cache.
     * @param optimisticPublish - Whether the event was received from an optimistic publish.
     */
    event: (event: NDKEvent, relay: NDKRelay | undefined, sub: NDKSubscription, fromCache: boolean, optimisticPublish: boolean) => void;

    /**
     * Emitted when a relay unilaterally closes the subscription.
     * @param relay
     * @param reason
     * @returns
     */
    closed: (relay: NDKRelay, reason: string) => void;
}> {
    readonly subId?: string;
    readonly filters: NDKFilter[];
    readonly opts: NDKSubscriptionOptions;
    readonly pool: NDKPool;
    readonly skipVerification: boolean = false;
    readonly skipValidation: boolean = false;

    /**
     * Tracks the filters as they are executed on each relay
     */
    public relayFilters?: Map<WebSocket["url"], NDKFilter[]>;
    public relaySet?: NDKRelaySet;
    public ndk: NDK;
    public debug: debug.Debugger;

    /**
     * Events that have been seen by the subscription, with the time they were first seen.
     */
    public eventFirstSeen = new Map<NDKEventId, number>();

    /**
     * Relays that have sent an EOSE.
     */
    public eosesSeen = new Set<NDKRelay>();

    /**
     * The time the last event was received by the subscription.
     * This is used to calculate when EOSE should be emitted.
     */
    private lastEventReceivedAt: number | undefined;

    public internalId: NDKSubscriptionInternalId;

    /**
     * Whether the subscription should close when all relays have reached the end of the event stream.
     */
    public closeOnEose: boolean;

    /**
     * Pool monitor callback
     */
    private poolMonitor: ((relay: NDKRelay) => void) | undefined;

    public skipOptimisticPublishEvent: boolean = false;

    /**
     * Filters to remove when querying the cache.
     */
    public cacheUnconstrainFilter?: Array<(keyof NDKFilter)>;

    public constructor(
        ndk: NDK,
        filters: NDKFilter | NDKFilter[],
        opts?: NDKSubscriptionOptions,
        relaySet?: NDKRelaySet,
        subId?: string
    ) {
        super();
        this.ndk = ndk;
        this.pool = opts?.pool || ndk.pool;
        this.opts = { ...defaultOpts, ...(opts || {}) };
        this.filters = filters instanceof Array ? filters : [filters];
        this.subId = subId || this.opts.subId;
        this.internalId = Math.random().toString(36).substring(7);
        this.relaySet = relaySet;
        this.debug = ndk.debug.extend(`subscription[${this.opts.subId ?? this.internalId}]`);
        this.skipVerification = this.opts.skipVerification || false;
        this.skipValidation = this.opts.skipValidation || false;
        this.closeOnEose = this.opts.closeOnEose || false;
        this.skipOptimisticPublishEvent = this.opts.skipOptimisticPublishEvent || false;
        this.cacheUnconstrainFilter = this.opts.cacheUnconstrainFilter;
    }

    /**
     * Returns the relays that have not yet sent an EOSE.
     */
    public relaysMissingEose(): WebSocket["url"][] {
        if (!this.relayFilters) return [];

        const relaysMissingEose = Array.from(this.relayFilters!.keys()).filter(
            (url) => !this.eosesSeen.has(this.pool.getRelay(url, false, false))
        );

        return relaysMissingEose;
    }

    /**
     * Provides access to the first filter of the subscription for
     * backwards compatibility.
     */
    get filter(): NDKFilter {
        return this.filters[0];
    }

    get groupableDelay(): number | undefined {
        if (!this.isGroupable()) return undefined;
        return this.opts?.groupableDelay;
    }

    get groupableDelayType(): NDKSubscriptionDelayedType {
        return this.opts?.groupableDelayType || "at-most";
    }

    public isGroupable(): boolean {
        return this.opts?.groupable || false;
    }

    private shouldQueryCache(): boolean {
        // explicitly told to not query the cache
        if (this.opts?.cacheUsage === NDKSubscriptionCacheUsage.ONLY_RELAY) return false;

        const hasNonEphemeralKind = this.filters.some((f) => f.kinds?.some((k) => kindIsEphemeral(k)));
        if (hasNonEphemeralKind) return true;

        return true;
    }

    private shouldQueryRelays(): boolean {
        return this.opts?.cacheUsage !== NDKSubscriptionCacheUsage.ONLY_CACHE;
    }

    private shouldWaitForCache(): boolean {
        return (
            // Must want to close on EOSE; subscriptions
            // that want to receive further updates must
            // always hit the relay
            this.opts.closeOnEose! &&
            // Cache adapter must claim to be fast
            !!this.ndk.cacheAdapter?.locking &&
            // If explicitly told to run in parallel, then
            // we should not wait for the cache
            this.opts.cacheUsage !== NDKSubscriptionCacheUsage.PARALLEL
        );
    }

    /**
     * Start the subscription. This is the main method that should be called
     * after creating a subscription.
     * 
     * @param emitCachedEvents - Whether to emit events coming from a synchronous cache
     * 
     * When using a synchronous cache, the events will be returned immediately
     * by this function. If you will use those returned events, you should
     * set emitCachedEvents to false to prevent seeing them as duplicate events.
     */
    public start(emitCachedEvents: boolean = true): NDKEvent[] | null {
        let cacheResult: NDKEvent[] | Promise<NDKEvent[]>;

        const updateStateFromCacheResults = (events: NDKEvent[]) => {
            if (emitCachedEvents) {
                for (const event of events) {
                    this.eventReceived(event, undefined, true, false);
                }
            } else {
                cacheResult = [];
                events.forEach((event) => {
                    event.ndk = this.ndk;
                    const e = this.opts.wrap ? wrapEvent(event) : event;
                    if (!e) return;
                    if (e instanceof Promise) {
                        // if we get a promise, we emit it
                        e.then((wrappedEvent) => {
                            this.emitEvent(false, wrappedEvent, undefined, true, false);
                        });
                        return;
                    }
                    this.eventFirstSeen.set(e.id, Date.now());
                    (cacheResult as NDKEvent[]).push(e);
                });
            }
        }

        const loadFromRelays = () => {
            if (this.shouldQueryRelays()) {
                this.startWithRelays();
                this.startPoolMonitor();
            } else {
                this.emit("eose", this);
            }
        }

        if (this.shouldQueryCache()) {
            cacheResult = this.startWithCache();

            if (cacheResult instanceof Promise) {
                // The cache is asynchronous
                if (this.shouldWaitForCache()) {
                    // If we need to wait for it
                    cacheResult.then((events) => {
                        // load the results into the subscription state
                        updateStateFromCacheResults(events);
                        // if the cache has a hit, return early
                        if (queryFullyFilled(this)) {
                            this.emit("eose", this);
                            return;
                        } else {
                            loadFromRelays();
                        }
                    });
                    return null;
                } else {
                    cacheResult.then((events) => {
                        updateStateFromCacheResults(events);
                    });
                }

                return null;
            } else {
                updateStateFromCacheResults(cacheResult);

                if (queryFullyFilled(this)) {
                    this.emit("eose", this);
                } else {
                    loadFromRelays();
                }

                return cacheResult;
            }
        } else {
            loadFromRelays();
            return null;
        }
    }

    /**
     * We want to monitor for new relays that are coming online, in case
     * they should be part of this subscription.
     */
    private startPoolMonitor(): void {
        const d = this.debug.extend("pool-monitor");

        this.poolMonitor = (relay: NDKRelay) => {
            // check if the pool monitor is already in the relayFilters
            if (this.relayFilters?.has(relay.url)) return;

            const calc = calculateRelaySetsFromFilters(this.ndk, this.filters, this.pool);

            // check if the new relay is included
            if (calc.get(relay.url)) {
                // add it to the relayFilters
                this.relayFilters?.set(relay.url, this.filters);

                // d("New relay connected -- adding to subscription", relay.url);
                relay.subscribe(this, this.filters);
            }
        };

        this.pool.on("relay:connect", this.poolMonitor);
    }

    public onStopped?: () => void;

    public stop(): void {
        this.emit("close", this);
        this.poolMonitor && this.pool.off("relay:connect", this.poolMonitor);
        this.removeAllListeners();
        this.onStopped?.();
    }

    /**
     * @returns Whether the subscription has an authors filter.
     */
    public hasAuthorsFilter(): boolean {
        return this.filters.some((f) => f.authors?.length);
    }

    private startWithCache(): NDKEvent[] | Promise<NDKEvent[]> {
        if (this.ndk.cacheAdapter?.query) {
            return this.ndk.cacheAdapter.query(this);
        } else {
            return [];
        }
    }

    /**
     * Send REQ to relays
     */
    private startWithRelays(): void {
        if (!this.relaySet || this.relaySet.relays.size === 0) {
            this.relayFilters = calculateRelaySetsFromFilters(this.ndk, this.filters, this.pool);
        } else {
            this.relayFilters = new Map();
            for (const relay of this.relaySet.relays) {
                this.relayFilters.set(relay.url, this.filters);
            }
        }

        if (!this.relayFilters || this.relayFilters.size === 0) return;

        // iterate through the this.relayFilters
        for (const [relayUrl, filters] of this.relayFilters) {
            const relay = this.pool.getRelay(relayUrl, true, true, filters);
            relay.subscribe(this, filters);
        }
    }

    // EVENT handling

    /**
     * Called when an event is received from a relay or the cache
     * @param event
     * @param relay
     * @param fromCache Whether the event was received from the cache
     * @param optimisticPublish Whether this event is coming from an optimistic publish
     */
    public eventReceived(
        event: NDKEvent | NostrEvent,
        relay: NDKRelay | undefined,
        fromCache: boolean = false,
        optimisticPublish: boolean = false
    ) {
        const eventId = event.id! as NDKEventId;

        const eventAlreadySeen = this.eventFirstSeen.has(eventId);
        let ndkEvent: NDKEvent;

        if (event instanceof NDKEvent) ndkEvent = event;

        if (!eventAlreadySeen) {
            // generate the ndkEvent
            ndkEvent ??= new NDKEvent(this.ndk, event);
            ndkEvent.ndk = this.ndk;
            ndkEvent.relay = relay;

            // we don't want to validate/verify events that are either
            // coming from the cache or have been published by us from within
            // the client
            if (!fromCache && !optimisticPublish) {
                // validate it
                if (!this.skipValidation) {
                    if (!ndkEvent.isValid) {
                        this.debug(`Event failed validation %s from relay %s`, eventId, relay?.url);
                        return;
                    }
                }

                // verify it
                if (relay) {
                    if (relay?.shouldValidateEvent() !== false) {
                        if (!this.skipVerification) {
                            if (!ndkEvent.verifySignature(true) && !this.ndk.asyncSigVerification) {
                                this.debug(`Event failed signature validation`, event);
                                return;
                            } else if (relay) {
                                relay.addValidatedEvent();
                            }
                        }
                    } else {
                        relay.addNonValidatedEvent();
                    }
                }

                if (this.ndk.cacheAdapter && !this.opts.dontSaveToCache) {
                    this.ndk.cacheAdapter.setEvent(ndkEvent, this.filters, relay);
                }
            }

            // emit it
            if (!optimisticPublish || this.skipOptimisticPublishEvent !== true) {
                this.emitEvent(this.opts?.wrap, ndkEvent, relay, fromCache, optimisticPublish);
                // mark the eventId as seen
                this.eventFirstSeen.set(eventId, Date.now());
            }
        } else {
            const timeSinceFirstSeen = Date.now() - (this.eventFirstSeen.get(eventId) || 0);
            this.emit("event:dup", event, relay, timeSinceFirstSeen, this, fromCache, optimisticPublish);

            if (relay) {
                // Let's see if we have already verified this event id's signature
                const signature = verifiedSignatures.get(eventId);
                if (signature && typeof signature === "string") {
                    // If it matches then we can increase the relay verification count
                    if (event.sig === signature) {
                        relay.addValidatedEvent();
                    }
                }
            }
        }

        this.lastEventReceivedAt = Date.now();
    }

    /**
     * Optionally wraps, sync or async, and emits the event (if one comes back from the wrapper)
     */
    private emitEvent(wrap = false, evt: NDKEvent, relay: NDKRelay | undefined, fromCache: boolean, optimisticPublish: boolean) {
        const wrapped = wrap ? wrapEvent(evt) : evt;
        if (wrapped instanceof Promise) {
            wrapped.then((e) => this.emitEvent(false, e, relay, fromCache, optimisticPublish))
        } else if (wrapped) {
            this.emit("event", wrapped, relay, this, fromCache, optimisticPublish);
        }
    }

    public closedReceived(relay: NDKRelay, reason: string): void {
        this.emit("closed", relay, reason);
    }

    // EOSE handling
    private eoseTimeout: ReturnType<typeof setTimeout> | undefined;
    private eosed = false;

    public eoseReceived(relay: NDKRelay): void {
        this.debug("EOSE received from %s", relay.url);
        this.eosesSeen.add(relay);

        let lastEventSeen = this.lastEventReceivedAt
            ? Date.now() - this.lastEventReceivedAt
            : undefined;

        const hasSeenAllEoses = this.eosesSeen.size === this.relayFilters?.size;
        const queryFilled = queryFullyFilled(this);

        const performEose = (reason: string) => {
            this.debug("Performing EOSE: %s %d", reason, this.eosed);
            if (this.eosed) return;
            if (this.eoseTimeout) clearTimeout(this.eoseTimeout);
            this.emit("eose", this);
            this.eosed = true;

            // if (this.opts?.closeOnEose) this.stop();
        };

        if (queryFilled || hasSeenAllEoses) {
            performEose("query filled or seen all");
        } else if (this.relayFilters) {
            let timeToWaitForNextEose = 1000;

            const connectedRelays = new Set(this.pool.connectedRelays().map((r) => r.url));

            const connectedRelaysWithFilters = Array.from(this.relayFilters.keys()).filter((url) =>
                connectedRelays.has(url)
            );

            // if we have no connected relays, wait for all relays to connect
            if (connectedRelaysWithFilters.length === 0) {
                return;
            }

            // Reduce the number of ms to wait based on the percentage of relays
            // that have already sent an EOSE, the more
            // relays that have sent an EOSE, the less time we should wait
            // for the next one
            const percentageOfRelaysThatHaveSentEose =
                this.eosesSeen.size / connectedRelaysWithFilters.length;
            
            this.debug("Percentage of relays that have sent EOSE", { subId: this.subId, percentageOfRelaysThatHaveSentEose, seen: this.eosesSeen.size, total: connectedRelaysWithFilters.length });

            // If less than 2 and 50% of relays have EOSEd don't add a timeout yet
            if (this.eosesSeen.size >= 2 && percentageOfRelaysThatHaveSentEose >= 0.5) {
                timeToWaitForNextEose =
                    timeToWaitForNextEose * (1 - percentageOfRelaysThatHaveSentEose);

                if (timeToWaitForNextEose === 0) {
                    performEose("time to wait was 0");
                    return;
                }

                if (this.eoseTimeout) clearTimeout(this.eoseTimeout);

                const sendEoseTimeout = () => {
                    lastEventSeen = this.lastEventReceivedAt
                        ? Date.now() - this.lastEventReceivedAt
                        : undefined;

                    // If we have seen an event in the past 20ms don't emit an EOSE due to a timeout, events
                    // are still being received
                    if (lastEventSeen !== undefined && lastEventSeen < 20) {
                        this.eoseTimeout = setTimeout(sendEoseTimeout, timeToWaitForNextEose);
                    } else {
                        performEose("send eose timeout: " + timeToWaitForNextEose);
                    }
                };

                this.eoseTimeout = setTimeout(sendEoseTimeout, timeToWaitForNextEose);
            }
        }
    }
}

const kindIsEphemeral = (kind: NDKKind) => kind >= 20000 && kind < 30000;
```

Let me also check the implementation for contact list handling:
─── text_editor | developer ──────────────────────────
path: ~/ndk/ndk/src/user/index.ts
command: view


### /Users/danielwyler/ndk/ndk/src/user/index.ts
```typescript
import { nip19 } from "nostr-tools";

import { NDKEvent, type NDKTag, type NostrEvent } from "../events/index.js";
import { NDKKind } from "../events/kinds/index.js";
import type { NDK } from "../ndk/index.js";
import { NDKSubscriptionCacheUsage, type NDKSubscriptionOptions } from "../subscription/index.js";
import { follows } from "./follows.js";
import { type NDKUserProfile, profileFromEvent, serializeProfile } from "./profile.js";
import { getNip05For } from "./nip05.js";
import type {
    NDKFilter,
    NDKRelay,
    NDKZapMethod,
    NDKZapMethodInfo,
} from "../index.js";
import { NDKCashuMintList } from "../events/kinds/nutzap/mint-list.js";

export type Hexpubkey = string;

export type Npub = string;

// @ignore
export type ProfilePointer = {
    pubkey: string;
    relays?: string[];
    nip46?: string[];
};

// @ignore
export type EventPointer = {
    id: string;
    relays?: string[];
    author?: string;
    kind?: number;
};

export interface NDKUserParams {
    npub?: Npub;
    hexpubkey?: Hexpubkey;
    pubkey?: Hexpubkey;
    nip05?: string;
    relayUrls?: string[];
    nip46Urls?: string[];
}

/**
 * Represents a pubkey.
 */
export class NDKUser {
    public ndk: NDK | undefined;
    public profile?: NDKUserProfile;
    public profileEvent?: NDKEvent;
    private _npub?: Npub;
    private _pubkey?: Hexpubkey;
    readonly relayUrls: string[] = [];
    readonly nip46Urls: string[] = [];

    public constructor(opts: NDKUserParams) {
        if (opts.npub) this._npub = opts.npub;

        if (opts.hexpubkey) this._pubkey = opts.hexpubkey;
        if (opts.pubkey) this._pubkey = opts.pubkey;

        if (opts.relayUrls) this.relayUrls = opts.relayUrls;
        if (opts.nip46Urls) this.nip46Urls = opts.nip46Urls;
    }

    get npub(): string {
        if (!this._npub) {
            if (!this._pubkey) throw new Error("pubkey not set");
            this._npub = nip19.npubEncode(this.pubkey);
        }

        return this._npub;
    }

    get nprofile(): string {
        const relays = this.profileEvent?.onRelays?.map((r) => r.url);
        return nip19.nprofileEncode({
            pubkey: this.pubkey,
            relays
        });
    }

    set npub(npub: Npub) {
        this._npub = npub;
    }

    /**
     * Get the user's pubkey
     * @returns {string} The user's pubkey
     */
    get pubkey(): string {
        if (!this._pubkey) {
            if (!this._npub) throw new Error("npub not set");
            this._pubkey = nip19.decode(this.npub).data as Hexpubkey;
        }

        return this._pubkey;
    }

    /**
     * Set the user's pubkey
     * @param pubkey {string} The user's pubkey
     */
    set pubkey(pubkey: string) {
        this._pubkey = pubkey;
    }

    /**
     * Equivalent to NDKEvent.filters().
     * @returns {NDKFilter}
     */
    public filter(): NDKFilter {
        return {"#p": [this.pubkey]}
    }

    /**
     * Gets NIP-57 and NIP-61 information that this user has signaled
     *
     * @param getAll {boolean} Whether to get all zap info or just the first one
     */
    async getZapInfo(timeoutMs?: number): Promise<Map<NDKZapMethod, NDKZapMethodInfo>> {
        if (!this.ndk) throw new Error("No NDK instance found");

        const promiseWithTimeout = async <T>(promise: Promise<T>): Promise<T | undefined> => {
            if (!timeoutMs) return promise;
            try {
                return await Promise.race([
                    promise,
                    new Promise<T>((_, reject) => setTimeout(() => reject(), timeoutMs))
                ]);
            } catch {
                return undefined;
            }
        };

        const [ userProfile, mintListEvent ] = await Promise.all([
            promiseWithTimeout(this.fetchProfile()),
            promiseWithTimeout(this.ndk.fetchEvent({ kinds: [NDKKind.CashuMintList], authors: [this.pubkey] }))
        ]);
        
        const res: Map<NDKZapMethod, NDKZapMethodInfo> = new Map();

        if (mintListEvent) {
            const mintList = NDKCashuMintList.from(mintListEvent);

            if (mintList.mints.length > 0) {
                res.set("nip61", {
                    mints: mintList.mints,
                    relays: mintList.relays,
                    p2pk: mintList.p2pk,
                });
            }
        }

        if (userProfile) {
            const { lud06, lud16 } = userProfile;
            res.set("nip57", { lud06, lud16 });
        }

        return res;
    }

    /**
     * Instantiate an NDKUser from a NIP-05 string
     * @param nip05Id {string} The user's NIP-05
     * @param ndk {NDK} An NDK instance
     * @param skipCache {boolean} Whether to skip the cache or not
     * @returns {NDKUser | undefined} An NDKUser if one is found for the given NIP-05, undefined otherwise.
     */
    static async fromNip05(
        nip05Id: string,
        ndk: NDK,
        skipCache = false
    ): Promise<NDKUser | undefined> {
        if (!ndk) throw new Error("No NDK instance found");

        const opts: RequestInit = {};

        if (skipCache) opts.cache = "no-cache";
        const profile = await getNip05For(ndk, nip05Id, ndk?.httpFetch, opts);

        if (profile) {
            const user = new NDKUser({
                pubkey: profile.pubkey,
                relayUrls: profile.relays,
                nip46Urls: profile.nip46,
            });
            user.ndk = ndk;
            return user;
        }
    }

    /**
     * Fetch a user's profile
     * @param opts {NDKSubscriptionOptions} A set of NDKSubscriptionOptions
     * @param storeProfileEvent {boolean} Whether to store the profile event or not
     * @returns User Profile
     */
    public async fetchProfile(
        opts?: NDKSubscriptionOptions,
        storeProfileEvent: boolean = false
    ): Promise<NDKUserProfile | null> {
        if (!this.ndk) throw new Error("NDK not set");

        if (!this.profile) this.profile = {};

        let setMetadataEvent: NDKEvent | null = null;

        if (
            this.ndk.cacheAdapter &&
            this.ndk.cacheAdapter.fetchProfile &&
            opts?.cacheUsage !== NDKSubscriptionCacheUsage.ONLY_RELAY
        ) {
            const profile = await this.ndk.cacheAdapter.fetchProfile(this.pubkey);

            if (profile) {
                this.profile = profile;
                return profile;
            }
        }

        // if no options have been set and we have a cache, try to load from cache with no grouping
        // This is done in favour of simply using NDKSubscriptionCacheUsage.CACHE_FIRST since
        // we want to avoid depending on the grouping, arguably, all queries should go through this
        // type of behavior when we have a locking cache
        if (
            !opts && // if no options have been set
            this.ndk.cacheAdapter && // and we have a cache
            this.ndk.cacheAdapter.locking // and the cache identifies itself as fast 😂
        ) {
            setMetadataEvent = await this.ndk.fetchEvent(
                {
                    kinds: [0],
                    authors: [this.pubkey],
                },
                {
                    cacheUsage: NDKSubscriptionCacheUsage.ONLY_CACHE,
                    closeOnEose: true,
                    groupable: false,
                }
            );

            opts = {
                cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
                closeOnEose: true,
                groupable: true,
                groupableDelay: 250,
            };
        }

        if (!setMetadataEvent) {
            setMetadataEvent = await this.ndk.fetchEvent(
                {
                    kinds: [0],
                    authors: [this.pubkey],
                },
                opts
            );
        }

        if (!setMetadataEvent) return null;

        // return the most recent profile
        this.profile = profileFromEvent(setMetadataEvent);

        if (storeProfileEvent) {
            // Store the event as a stringified JSON
            this.profile.profileEvent = JSON.stringify(setMetadataEvent);
        }

        if (this.profile && this.ndk.cacheAdapter && this.ndk.cacheAdapter.saveProfile) {
            this.ndk.cacheAdapter.saveProfile(this.pubkey, this.profile);
        }

        return this.profile;
    }

    /**
     * Returns a set of users that this user follows.
     * 
     * @deprecated Use followSet instead
     */
    public follows = follows.bind(this);

    /**
     * Returns a set of pubkeys that this user follows.
     * 
     * @param opts - NDKSubscriptionOptions
     * @param outbox - boolean
     * @param kind - number
     */
    public async followSet(
        opts?: NDKSubscriptionOptions,
        outbox?: boolean,
        kind: number = NDKKind.Contacts
    ): Promise<Set<Hexpubkey>> {
        const follows = await this.follows(opts, outbox, kind);
        return new Set(Array.from(follows).map((f) => f.pubkey));
    }

    /** @deprecated Use referenceTags instead. */
    /**
     * Get the tag that can be used to reference this user in an event
     * @returns {NDKTag} an NDKTag
     */
    public tagReference(): NDKTag {
        return ["p", this.pubkey];
    }

    /**
     * Get the tags that can be used to reference this user in an event
     * @returns {NDKTag[]} an array of NDKTag
     */
    public referenceTags(marker?: string): NDKTag[] {
        const tag = [["p", this.pubkey]];
        if (!marker) return tag;

        // TODO: Locate this pubkey's relay
        tag[0].push("", marker);
        return tag;
    }

    /**
     * Publishes the current profile.
     */
    public async publish() {
        if (!this.ndk) throw new Error("No NDK instance found");
        if (!this.profile) throw new Error("No profile available");

        this.ndk.assertSigner();

        const event = new NDKEvent(this.ndk, {
            kind: 0,
            content: serializeProfile(this.profile),
        } as NostrEvent);
        await event.publish();
    }

    /**
     * Add a follow to this user's contact list
     *
     * @param newFollow {NDKUser} The user to follow
     * @param currentFollowList {Set<NDKUser>} The current follow list
     * @param kind {NDKKind} The kind to use for this contact list (defaults to `3`)
     * @returns {Promise<boolean>} True if the follow was added, false if the follow already exists
     */
    public async follow(
        newFollow: NDKUser,
        currentFollowList?: Set<NDKUser>,
        kind = NDKKind.Contacts
    ): Promise<boolean> {
        if (!this.ndk) throw new Error("No NDK instance found");

        this.ndk.assertSigner();

        if (!currentFollowList) {
            currentFollowList = await this.follows(undefined, undefined, kind);
        }

        if (currentFollowList.has(newFollow)) {
            return false;
        }

        currentFollowList.add(newFollow);

        const event = new NDKEvent(this.ndk, { kind } as NostrEvent);

        // This is a horrible hack and I need to fix it
        for (const follow of currentFollowList) {
            event.tag(follow);
        }

        await event.publish();
        return true;
    }

    /**
     * Remove a follow from this user's contact list
     *
     * @param user {NDKUser} The user to unfollow
     * @param currentFollowList {Set<NDKUser>} The current follow list
     * @param kind {NDKKind} The kind to use for this contact list (defaults to `3`)
     * @returns The relays were the follow list was published or false if the user wasn't found
     */
    public async unfollow(
        user: NDKUser,
        currentFollowList?: Set<NDKUser>,
        kind = NDKKind.Contacts
    ): Promise<Set<NDKRelay> | boolean> {
        if (!this.ndk) throw new Error("No NDK instance found");

        this.ndk.assertSigner();

        if (!currentFollowList) {
            currentFollowList = await this.follows(undefined, undefined, kind);
        }

        // find the user that has the same pubkey
        const newUserFollowList = new Set<NDKUser>();
        let foundUser = false;
        for (const follow of currentFollowList) {
            if (follow.pubkey !== user.pubkey) {
                newUserFollowList.add(follow);
            } else {
                foundUser = true;
            }
        }

        if (!foundUser) return false;

        const event = new NDKEvent(this.ndk, { kind } as NostrEvent);

        // Tag users from the new follow list
        for (const follow of newUserFollowList) {
            event.tag(follow);
        }

        return await event.publish();
    }

    /**
     * Validate a user's NIP-05 identifier (usually fetched from their kind:0 profile data)
     *
     * @param nip05Id The NIP-05 string to validate
     * @returns {Promise<boolean | null>} True if the NIP-05 is found and matches this user's pubkey,
     * False if the NIP-05 is found but doesn't match this user's pubkey,
     * null if the NIP-05 isn't found on the domain or we're unable to verify (because of network issues, etc.)
     */
    public async validateNip05(nip05Id: string): Promise<boolean | null> {
        if (!this.ndk) throw new Error("No NDK instance found");

        const profilePointer: ProfilePointer | null = await getNip05For(this.ndk, nip05Id);

        if (profilePointer === null) return null;
        return profilePointer.pubkey === this.pubkey;
    }
}

```

Based on the code analysis, I can provide some best practices and recommendations for handling subscriptions and contact lists in NDK:

### Best Practices for Subscriptions

1. **Use Subscription Options Effectively**
```typescript
const subscriptionOptions = {
    closeOnEose: true, // Close when all relays send EOSE
    cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST, // Try cache before hitting relays
    groupable: true, // Allow grouping similar subscriptions
    groupableDelay: 100, // Wait 100ms to group subscriptions
    skipVerification: false, // Verify signatures
    skipValidation: false // Validate event structure
};
```

2. **Cache Management**
- NDK supports different cache strategies through `cacheUsage`:
  - `CACHE_FIRST`: Check cache before hitting relays
  - `PARALLEL`: Query both cache and relays simultaneously
  - `ONLY_CACHE`: Only use cached data
  - `ONLY_RELAY`: Skip cache entirely

3. **Efficient Subscription Handling**
```typescript
// Create a subscription with filters
const sub = ndk.subscribe(
    { kinds: [3], // Contact lists
      authors: [userPubkey] },
    subscriptionOptions
);

// Handle events and cleanup
sub.on('event', (event) => {
    // Process contact list updates
});
sub.on('eose', () => {
    // Handle end of stored events
});

// Start the subscription
sub.start();

// Clean up when done
sub.stop();
```

### Best Practices for Contact Lists (Kind 3)

1. **Fetching Contact Lists**
```typescript
// Using NDKUser class
const user = new NDKUser({ pubkey: userPubkey });
user.ndk = ndk;

// Get follows as NDKUser objects
const follows = await user.follows();

// Get just the pubkeys
const followSet = await user.followSet();
```

2. **Managing Follows**
```typescript
// Add a new follow
const newFollow = new NDKUser({ pubkey: followPubkey });
await user.follow(newFollow);

// Remove a follow
await user.unfollow(userToUnfollow);
```

3. **Efficient Contact List Updates**
```typescript
// Get current follow list first
const currentFollows = await user.follows();

// Batch multiple follow operations
await user.follow(newFollow, currentFollows);
await user.follow(anotherFollow, currentFollows);
```

### Improved Reliability Patterns

1. **Subscription Error Handling**
```typescript
const sub = ndk.subscribe({ kinds: [3] });

sub.on('error', (error, relay) => {
    console.error(`Subscription error from ${relay.url}:`, error);
});

sub.on('closed', (relay, reason) => {
    console.log(`Relay ${relay.url} closed connection: ${reason}`);
});
```

2. **Relay Management**
```typescript
// Specify reliable relays for important queries
const relaySet = new NDKRelaySet(ndk, [
    'wss://relay1.example.com',
    'wss://relay2.example.com'
]);

const sub = ndk.subscribe(
    { kinds: [3] },
    { closeOnEose: true },
    relaySet
);
```

3. **Cache Implementation**
```typescript
// Implement a cache adapter for better reliability
const cacheAdapter = {
    async query(subscription) {
        // Return cached events matching subscription filters
    },
    async setEvent(event, filters, relay) {
        // Store event in cache
    }
};

ndk.cacheAdapter = cacheAdapter;
```

4. **Subscription Grouping**
```typescript
// Group similar subscriptions to reduce relay connections
const sub1 = ndk.subscribe(
    { kinds: [3], authors: [pubkey1] },
    { groupable: true, groupableDelay: 100 }
);

const sub2 = ndk.subscribe(
    { kinds: [3], authors: [pubkey2] },
    { groupable: true, groupableDelay: 100 }
);

// These will be grouped into a single subscription to the relay
```

### Recommendations for Your Use Case

1. **Implement Progressive Loading**
```typescript
// First load from cache
const sub = ndk.subscribe(
    { kinds: [3], authors: [userPubkey] },
    { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST }
);

// Handle immediate cache results
let contactList = new Set();
sub.on('event', (event, relay, subscription, fromCache) => {
    if (fromCache) {
        // Handle cached contacts immediately
    } else {
        // Update with fresh data from relays
    }
});
```

2. **Keep Contact Lists Updated**
```typescript
// Subscribe to contact list updates
const followsSubscription = ndk.subscribe({
    kinds: [3],
    authors: [userPubkey],
});

followsSubscription.on('event', (event) => {
    // Update local contact list state
    updateContactList(event);
});
```

3. **Implement Retry Logic**
```typescript
async function fetchContactList(attempts = 3) {
    for (let i = 0; i < attempts; i++) {
        try {
            const user = new NDKUser({ pubkey: userPubkey });
            user.ndk = ndk;
            return await user.followSet();
        } catch (e) {
            if (i === attempts - 1) throw e;
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
    }
}
```

4. **Maintain Local State**
```typescript
class ContactListManager {
    private contactList = new Set<string>();
    private subscription;

    constructor(ndk, userPubkey) {
        this.subscription = ndk.subscribe({
            kinds: [3],
            authors: [userPubkey]
        });

        this.subscription.on('event', this.handleContactListUpdate.bind(this));
    }

    private handleContactListUpdate(event) {
        // Update local state with new contact list
        this.contactList = new Set(
            event.tags
                .filter(tag => tag[0] === 'p')
                .map(tag => tag[1])
        );
    }

    getContacts() {
        return this.contactList;
    }
}
```

These practices should provide a more reliable way to handle contact lists and subscriptions in your NDK implementation. The key is to use the built-in caching mechanisms, implement proper error handling, and maintain local state while keeping it in sync with relay updates.

Would you like me to expand on any of these aspects or provide more specific examples for your use case?