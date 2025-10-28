import { useState, useEffect, useCallback, useRef } from 'react';
import { dbg } from '../interpreter/Debugger';
import type {
    Breakpoint,
    DebuggerEvent
} from '../interpreter/DebuggerCore';
import type { SourceLocation } from '../interpreter/BreakpointManager';
import type { DebuggerState, DebuggerCallbacks, DebuggerStats } from '../components/Debugger/DebuggerPanel';

interface UseDebuggerOptions {
    onStateChange?: (state: DebuggerState) => void;
    onMessage?: (message: string) => void;
    autoStart?: boolean;
}

interface UseDebuggerReturn {
    // State
    debuggerState: DebuggerState;
    breakpoints: Breakpoint[];
    stats: DebuggerStats;
    isVisible: boolean;

    // Actions
    callbacks: DebuggerCallbacks;
    setVisible: (visible: boolean) => void;

    // Utilities
    addMessage: (message: string) => void;
    clearMessages: () => void;
}

export const useDebugger = (options: UseDebuggerOptions = {}): UseDebuggerReturn => {
    const { onStateChange, onMessage, autoStart = false } = options;

    // State
    const [debuggerState, setDebuggerState] = useState<DebuggerState>({
        status: 'Ready',
        mode: 'run',
        isPaused: false
    });

    const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
    const [stats, setStats] = useState<DebuggerStats>({
        total: 0,
        enabled: 0,
        disabled: 0,
        withConditions: 0,
        totalHits: 0
    });

    const [isVisible, setIsVisible] = useState(autoStart);
    const eventListenerRef = useRef<((event: DebuggerEvent) => void) | null>(null);

    // Update breakpoints and stats
    const updateBreakpoints = useCallback(() => {
        const allBreakpoints = dbg.getBreakpoints();
        // Calculate basic stats since getBreakpointStats might not be available
        const enabledBreakpoints = allBreakpoints.filter(bp => bp.enabled);
        const withConditions = allBreakpoints.filter(bp => bp.condition);
        const totalHits = allBreakpoints.reduce((sum, bp) => sum + bp.hitCount, 0);

        const currentStats: DebuggerStats = {
            total: allBreakpoints.length,
            enabled: enabledBreakpoints.length,
            disabled: allBreakpoints.length - enabledBreakpoints.length,
            withConditions: withConditions.length,
            totalHits: totalHits
        };

        setBreakpoints(allBreakpoints);
        setStats(currentStats);
    }, []);

    // Handle debugger events
    const handleDebuggerEvent = useCallback((event: DebuggerEvent) => {
        switch (event.type) {
            case 'stateChanged':
                const newState = {
                    status: event.state.status,
                    mode: event.state.mode,
                    location: event.state.location,
                    depth: event.state.depth,
                    frameName: event.state.frameName,
                    isPaused: event.state.isPaused
                };
                setDebuggerState(newState);
                onStateChange?.(newState);
                break;

            case 'paused':
                const message = `Paused: ${event.reason}${event.location ? ` at line ${event.location.line}` : ''}`;
                onMessage?.(message);
                break;

            case 'resumed':
                onMessage?.(`Resumed in ${event.mode} mode`);
                break;

            case 'stepped':
                onMessage?.('Step executed');
                break;

            case 'breakpointHit':
                onMessage?.(`Breakpoint hit (${event.hitCount} times)`);
                break;

            case 'exception':
                onMessage?.(`Exception: ${event.error.message}`);
                break;
        }

        // Update breakpoints after any event that might change them
        if (['stateChanged', 'breakpointHit'].includes(event.type)) {
            updateBreakpoints();
        }
    }, [onStateChange, onMessage]); // Remove updateBreakpoints from dependencies

    // Setup debugger event listener
    useEffect(() => {
        eventListenerRef.current = handleDebuggerEvent;
        dbg.addEventListener(handleDebuggerEvent);

        // Initial state update
        updateBreakpoints();

        return () => {
            if (eventListenerRef.current) {
                dbg.removeEventListener(eventListenerRef.current);
            }
        };
    }, []); // Remove dependencies that cause infinite loop

    // Debugger action callbacks
    const callbacks: DebuggerCallbacks = {
        onContinue: useCallback(() => {
            dbg.continue();
            onMessage?.('Continuing execution...');
        }, [onMessage]),

        onStep: useCallback(() => {
            dbg.step();
            onMessage?.('Stepping to next statement...');
        }, [onMessage]),

        onPrintLocals: useCallback(() => {
            dbg.printLocals();
            onMessage?.('Printing local variables...');
        }, [onMessage]),

        onBacktrace: useCallback(() => {
            dbg.backtrace();
            onMessage?.('Generating call stack...');
        }, [onMessage]),

        onClearBreakpoints: useCallback(() => {
            dbg.clearAllBreakpoints();
            updateBreakpoints();
            onMessage?.('All breakpoints cleared');
        }, [onMessage]), // Remove updateBreakpoints from dependencies

        onAddConditionalBreakpoint: useCallback((line: number, condition?: string) => {
            console.log('Adding breakpoint at BASIC line:', line, 'with condition:', condition);
            // Convert BASIC line number (20) to AST line number (2)
            const astLineNumber = line / 10;
            console.log('Converted to AST line:', astLineNumber);
            
            const span = {
                start: { line: astLineNumber, column: 0 },
                end: { line: astLineNumber, column: 0 }
            };

            const options = condition ? {
                condition: {
                    expression: condition,
                    type: 'expression' as const
                }
            } : undefined;

            const breakpoint = dbg.addBreakpoint(span, options);
            console.log('Breakpoint added:', breakpoint);

            if (breakpoint) {
                updateBreakpoints();
                const conditionText = condition ? ` with condition "${condition}"` : '';
                onMessage?.(`Breakpoint added at line ${line}${conditionText}`);
            } else {
                onMessage?.(`Failed to add breakpoint at line ${line}`);
            }
        }, [onMessage]), // Remove updateBreakpoints from dependencies

        onExportBreakpoints: useCallback(() => {
            return dbg.exportBreakpoints();
        }, []),

        onImportBreakpoints: useCallback((jsonData: string) => {
            const result = dbg.importBreakpoints(jsonData);
            updateBreakpoints();
            return result;
        }, []), // Remove updateBreakpoints from dependencies

        onToggleBreakpoint: useCallback((location: SourceLocation) => {
            const span = {
                start: { line: location.line, column: location.column },
                end: { line: location.line, column: location.column }
            };

            dbg.toggleBreakpoint(span);
            updateBreakpoints();
            onMessage?.(`Breakpoint toggled at line ${location.line}`);
        }, [onMessage]), // Remove updateBreakpoints from dependencies

        onRemoveBreakpoint: useCallback((location: SourceLocation) => {
            const span = {
                start: { line: location.line, column: location.column },
                end: { line: location.line, column: location.column }
            };

            const removed = dbg.removeBreakpoint(span);
            if (removed) {
                updateBreakpoints();
                onMessage?.(`Breakpoint removed from line ${location.line}`);
            } else {
                onMessage?.(`No breakpoint found at line ${location.line}`);
            }
        }, [onMessage]) // Remove updateBreakpoints from dependencies
    };

    // Utility functions
    const addMessage = useCallback((message: string) => {
        onMessage?.(message);
    }, [onMessage]);

    const clearMessages = useCallback(() => {
        // This would be handled by the parent component that manages messages
        onMessage?.('--- Debug output cleared ---');
    }, [onMessage]);

    const setVisible = useCallback((visible: boolean) => {
        setIsVisible(visible);
    }, []);

    return {
        // State
        debuggerState,
        breakpoints,
        stats,
        isVisible,

        // Actions
        callbacks,
        setVisible,

        // Utilities
        addMessage,
        clearMessages
    };
};

// Additional hook for managing debug messages separately
export const useDebugMessages = (maxMessages: number = 100) => {
    const [messages, setMessages] = useState<Array<{ id: string; text: string; timestamp: Date }>>([]);

    const addMessage = useCallback((text: string) => {
        const message = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text,
            timestamp: new Date()
        };

        setMessages(prev => {
            const newMessages = [...prev, message];
            return newMessages.slice(-maxMessages); // Keep only last N messages
        });
    }, [maxMessages]);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    const removeMessage = useCallback((id: string) => {
        setMessages(prev => prev.filter(msg => msg.id !== id));
    }, []);

    return {
        messages,
        addMessage,
        clearMessages,
        removeMessage
    };
};

export default useDebugger;
