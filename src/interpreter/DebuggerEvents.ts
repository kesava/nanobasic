type DebuggerEventType = 'stateChanged' | 'paused' | 'resumed' | 'stepped' | 'breakpointHit' | 'exception';

interface BaseDebuggerEvent {
    type: DebuggerEventType;
    timestamp: Date;
}

interface StateChangedEvent extends BaseDebuggerEvent {
    type: 'stateChanged';
    state: {
        status: string;
        mode: string;
        location?: string;
        depth?: number;
        frameName?: string;
        isPaused: boolean;
    };
}

interface PausedEvent extends BaseDebuggerEvent {
    type: 'paused';
    reason: 'breakpoint' | 'step' | 'exception' | 'user' | 'end';
    location?: {
        line: number;
        column: number;
    };
    context?: any;
}

interface ResumedEvent extends BaseDebuggerEvent {
    type: 'resumed';
    mode: 'run' | 'step';
}

interface SteppedEvent extends BaseDebuggerEvent {
    type: 'stepped';
    location?: {
        line: number;
        column: number;
    };
}

interface BreakpointHitEvent extends BaseDebuggerEvent {
    type: 'breakpointHit';
    breakpoint: any; // Will be typed when we import Breakpoint
    hitCount: number;
}

interface ExceptionEvent extends BaseDebuggerEvent {
    type: 'exception';
    error: Error;
    location?: {
        line: number;
        column: number;
    };
}

type DebuggerEvent = StateChangedEvent | PausedEvent | ResumedEvent | SteppedEvent | BreakpointHitEvent | ExceptionEvent;

type DebuggerEventListener = (event: DebuggerEvent) => void;

class DebuggerEventEmitter {
    private listeners: Map<DebuggerEventType, DebuggerEventListener[]> = new Map();
    private globalListeners: DebuggerEventListener[] = [];

    /**
     * Add event listener for specific event type
     */
    on(eventType: DebuggerEventType, listener: DebuggerEventListener): void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType)!.push(listener);
    }

    /**
     * Add global event listener for all events
     */
    onAll(listener: DebuggerEventListener): void {
        this.globalListeners.push(listener);
    }

    /**
     * Remove event listener
     */
    off(eventType: DebuggerEventType, listener: DebuggerEventListener): void {
        const typeListeners = this.listeners.get(eventType);
        if (typeListeners) {
            const index = typeListeners.indexOf(listener);
            if (index >= 0) {
                typeListeners.splice(index, 1);
            }
        }
    }

    /**
     * Remove global event listener
     */
    offAll(listener: DebuggerEventListener): void {
        const index = this.globalListeners.indexOf(listener);
        if (index >= 0) {
            this.globalListeners.splice(index, 1);
        }
    }

    /**
     * Emit an event to all listeners
     */
    emit(event: DebuggerEvent): void {
        // Notify type-specific listeners
        const typeListeners = this.listeners.get(event.type);
        if (typeListeners) {
            typeListeners.forEach(listener => {
                try {
                    listener(event);
                } catch (err) {
                    console.error(`Debugger event listener error (${event.type}):`, err);
                }
            });
        }

        // Notify global listeners
        this.globalListeners.forEach(listener => {
            try {
                listener(event);
            } catch (err) {
                console.error('Debugger global event listener error:', err);
            }
        });
    }

    /**
     * Remove all listeners
     */
    removeAllListeners(): void {
        this.listeners.clear();
        this.globalListeners = [];
    }

    /**
     * Get listener count for debugging
     */
    getListenerCount(eventType?: DebuggerEventType): number {
        if (eventType) {
            return this.listeners.get(eventType)?.length || 0;
        }
        return this.globalListeners.length + 
               Array.from(this.listeners.values()).reduce((sum, arr) => sum + arr.length, 0);
    }
}

export { DebuggerEventEmitter };
export type { 
    DebuggerEvent, 
    DebuggerEventListener, 
    DebuggerEventType,
    StateChangedEvent,
    PausedEvent,
    ResumedEvent,
    SteppedEvent,
    BreakpointHitEvent,
    ExceptionEvent
};