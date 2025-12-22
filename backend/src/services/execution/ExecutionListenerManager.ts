/**
 * ExecutionListenerManager - Manages event listeners per execution to prevent memory leaks
 * 
 * Problem: Event listeners attached to RealtimeExecutionEngine accumulate over time
 * Solution: Track and cleanup listeners per execution lifecycle
 */

import { EventEmitter } from "events";
import { logger } from "../../utils/logger";

export interface ExecutionEventHandlers {
    onExecutionStarted?: (data: any) => void;
    onNodeStarted?: (data: any) => void;
    onNodeCompleted?: (data: any) => void;
    onNodeFailed?: (data: any) => void;
    onExecutionCompleted?: (data: any) => void;
    onExecutionFailed?: (data: any) => void;
    onExecutionCancelled?: (data: any) => void;
    onExecutionLog?: (data: any) => void;
}

interface ListenerRegistration {
    executionId: string;
    eventName: string;
    handler: (...args: any[]) => void;
    registeredAt: Date;
}

export class ExecutionListenerManager {
    private emitter: EventEmitter;
    private listeners: Map<string, ListenerRegistration[]> = new Map();
    private readonly MAX_LISTENERS_PER_EXECUTION = 20;
    private readonly CLEANUP_INTERVAL_MS = 60000; // 1 minute
    private readonly MAX_LISTENER_AGE_MS = 3600000; // 1 hour
    private cleanupTimer?: NodeJS.Timeout;

    constructor(emitter: EventEmitter) {
        this.emitter = emitter;
        this.startPeriodicCleanup();
    }

    /**
     * Register listeners for a specific execution
     * Returns a cleanup function to remove all listeners for this execution
     */
    registerExecutionListeners(
        executionId: string,
        handlers: ExecutionEventHandlers
    ): () => void {
        const registrations: ListenerRegistration[] = [];

        // Helper to register a single listener
        const register = (eventName: string, handler?: (...args: any[]) => void) => {
            if (!handler) return;

            // Wrap handler to filter by executionId
            const wrappedHandler = (data: any) => {
                if (data.executionId === executionId) {
                    handler(data);
                }
            };

            this.emitter.on(eventName, wrappedHandler);

            const registration: ListenerRegistration = {
                executionId,
                eventName,
                handler: wrappedHandler,
                registeredAt: new Date(),
            };

            registrations.push(registration);
        };

        // Register all provided handlers
        register("execution-started", handlers.onExecutionStarted);
        register("node-started", handlers.onNodeStarted);
        register("node-completed", handlers.onNodeCompleted);
        register("node-failed", handlers.onNodeFailed);
        register("execution-completed", handlers.onExecutionCompleted);
        register("execution-failed", handlers.onExecutionFailed);
        register("execution-cancelled", handlers.onExecutionCancelled);
        register("execution-log", handlers.onExecutionLog);

        // Store registrations
        this.listeners.set(executionId, registrations);

        // Check listener count
        const totalListeners = this.getTotalListenerCount();
        if (totalListeners > this.MAX_LISTENERS_PER_EXECUTION * 10) {
            logger.warn(`[ListenerManager] High listener count detected: ${totalListeners}`);
        }

        logger.debug(`[ListenerManager] Registered ${registrations.length} listeners for execution ${executionId}`);

        // Return cleanup function
        return () => this.cleanupExecution(executionId);
    }

    /**
     * Cleanup all listeners for a specific execution
     */
    cleanupExecution(executionId: string): void {
        const registrations = this.listeners.get(executionId);
        if (!registrations) {
            return;
        }

        for (const registration of registrations) {
            this.emitter.removeListener(registration.eventName, registration.handler);
        }

        this.listeners.delete(executionId);
        logger.debug(`[ListenerManager] Cleaned up ${registrations.length} listeners for execution ${executionId}`);
    }

    /**
     * Cleanup all stale listeners (older than MAX_LISTENER_AGE_MS)
     */
    cleanupStaleListeners(): void {
        const now = Date.now();
        const staleExecutions: string[] = [];

        for (const [executionId, registrations] of this.listeners.entries()) {
            const age = now - registrations[0].registeredAt.getTime();
            if (age > this.MAX_LISTENER_AGE_MS) {
                staleExecutions.push(executionId);
            }
        }

        if (staleExecutions.length > 0) {
            logger.warn(`[ListenerManager] Cleaning up ${staleExecutions.length} stale executions`);
            for (const executionId of staleExecutions) {
                this.cleanupExecution(executionId);
            }
        }
    }

    /**
     * Start periodic cleanup of stale listeners
     */
    private startPeriodicCleanup(): void {
        this.cleanupTimer = setInterval(() => {
            this.cleanupStaleListeners();
        }, this.CLEANUP_INTERVAL_MS);
    }

    /**
     * Stop periodic cleanup
     */
    stopPeriodicCleanup(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
    }

    /**
     * Get total number of registered listeners
     */
    getTotalListenerCount(): number {
        let count = 0;
        for (const registrations of this.listeners.values()) {
            count += registrations.length;
        }
        return count;
    }

    /**
     * Get listener statistics
     */
    getStats(): {
        activeExecutions: number;
        totalListeners: number;
        listenersByEvent: Record<string, number>;
        oldestListenerAge: number | null;
    } {
        const listenersByEvent: Record<string, number> = {};
        let oldestTimestamp: number | null = null;

        for (const registrations of this.listeners.values()) {
            for (const registration of registrations) {
                listenersByEvent[registration.eventName] = 
                    (listenersByEvent[registration.eventName] || 0) + 1;

                const timestamp = registration.registeredAt.getTime();
                if (oldestTimestamp === null || timestamp < oldestTimestamp) {
                    oldestTimestamp = timestamp;
                }
            }
        }

        return {
            activeExecutions: this.listeners.size,
            totalListeners: this.getTotalListenerCount(),
            listenersByEvent,
            oldestListenerAge: oldestTimestamp ? Date.now() - oldestTimestamp : null,
        };
    }

    /**
     * Cleanup all listeners (for shutdown)
     */
    cleanupAll(): void {
        const executionIds = Array.from(this.listeners.keys());
        for (const executionId of executionIds) {
            this.cleanupExecution(executionId);
        }
        this.stopPeriodicCleanup();
        logger.info(`[ListenerManager] Cleaned up all listeners`);
    }
}
