import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Breakpoint, SourceLocation } from '../../interpreter/BreakpointManager';
import styles from './DebuggerPanel.module.css';

interface DebuggerState {
    status: string;
    mode: string;
    location?: string;
    depth?: number;
    frameName?: string;
    isPaused: boolean;
}

interface DebuggerCallbacks {
    onContinue: () => void;
    onStep: () => void;
    onPrintLocals: () => void;
    onBacktrace: () => void;
    onClearBreakpoints: () => void;
    onAddConditionalBreakpoint: (line: number, condition?: string) => void;
    onExportBreakpoints: () => string;
    onImportBreakpoints: (jsonData: string) => { success: boolean; imported: number; errors: string[] };
    onToggleBreakpoint: (location: SourceLocation) => void;
    onRemoveBreakpoint: (location: SourceLocation) => void;
}

interface DebuggerStats {
    total: number;
    enabled: number;
    disabled: number;
    withConditions: number;
    totalHits: number;
}

interface DebuggerPanelProps {
    isVisible?: boolean;
    debuggerState: DebuggerState;
    breakpoints: Breakpoint[];
    stats: DebuggerStats;
    callbacks: DebuggerCallbacks;
    onVisibilityChange?: (visible: boolean) => void;
}

const DebuggerPanel: React.FC<DebuggerPanelProps> = ({
    isVisible = true,
    debuggerState,
    breakpoints,
    stats,
    callbacks
}) => {
    const [isMinimized, setIsMinimized] = useState(false);
    const [debugOutput, setDebugOutput] = useState<string[]>([]);

    // Touch gesture state
    const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
    const [lastTap, setLastTap] = useState(0);

    // Refs for DOM manipulation
    const outputRef = useRef<HTMLDivElement>(null);

    // Add message to debug output
    const logMessage = useCallback((message: string) => {
        setDebugOutput(prev => [...prev, message]);
    }, []);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isVisible) return;

            // Skip if typing in input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            // Ctrl/Cmd + key shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'enter':
                    case 'r':
                        e.preventDefault();
                        callbacks.onContinue();
                        break;
                    case 's':
                        e.preventDefault();
                        callbacks.onStep();
                        break;
                    case 'l':
                        e.preventDefault();
                        callbacks.onPrintLocals();
                        break;
                    case 'b':
                        e.preventDefault();
                        // Breakpoint panel is now always visible
                        break;
                    case 'm':
                        e.preventDefault();
                        setIsMinimized(prev => !prev);
                        break;
                }
            }

            // F-key shortcuts
            switch (e.key) {
                case 'F5':
                    e.preventDefault();
                    callbacks.onContinue();
                    break;
                case 'F10':
                    e.preventDefault();
                    callbacks.onStep();
                    break;
                case 'F9':
                    e.preventDefault();
                    // Breakpoint panel is now always visible
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, callbacks]);

    // Auto-scroll debug output
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [debugOutput]);

    // Handle touch gestures
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart({
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        });
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!e.changedTouches[0]) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const deltaX = endX - touchStart.x;
        const deltaY = endY - touchStart.y;

        // Double-tap to minimize
        const currentTime = Date.now();
        const tapLength = currentTime - lastTap;
        if (tapLength < 500 && tapLength > 0) {
            e.preventDefault();
            setIsMinimized(prev => !prev);
            return;
        }
        setLastTap(currentTime);

        // Swipe gestures
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            e.preventDefault();
            if (deltaX > 0) {
                callbacks.onContinue();
                showSwipeIndicator('Continue ▶️');
            } else {
                callbacks.onStep();
                showSwipeIndicator('Step ⬇️');
            }
        }
    };

    // Show swipe indicator feedback
    const showSwipeIndicator = (text: string) => {
        // This would be better implemented with a toast library or state management
        logMessage(`Gesture: ${text}`);
    };


    return (
        <div
            className={`${styles.debuggerPanel} ${isMinimized ? styles.minimized : ''}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
                display: isVisible ? 'block' : 'none'
            }}
        >
            {/* Header */}
            <div className={`${styles.header} ${isMinimized ? styles.minimized : ''}`}>
                <h3 className={styles.title}>
                    NanoBasic Debugger
                </h3>
                <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className={styles.minimizeButton}
                >
                    {isMinimized ? '+' : '−'}
                </button>
            </div>

            {!isMinimized && (
                <>
                    {/* Status Section - minimal */}
                    <div className={styles.statusSection}>
                        <div className={styles.statusGrid}>
                            <span>{debuggerState.status}</span>
                            <span>{debuggerState.mode}</span>
                            {debuggerState.isPaused && <span>⏸️</span>}
                        </div>
                    </div>

                    {/* Control Buttons - with labels */}
                    <div className={styles.controlButtons}>
                        <button
                            onClick={callbacks.onContinue}
                            className={`${styles.button} ${styles.primary} ${debuggerState.isPaused ? styles.active : ''}`}
                            title="Continue (F5)"
                        >
                            ▶️ <span className={styles.buttonText}>Continue</span>
                        </button>
                        <button
                            onClick={callbacks.onStep}
                            className={`${styles.button} ${styles.primary} ${debuggerState.mode === 'in' ? styles.active : ''}`}
                            title="Step (F10)"
                        >
                            ⤵️ <span className={styles.buttonText}>Step</span>
                        </button>
                        <button
                            onClick={callbacks.onPrintLocals}
                            className={`${styles.button} ${styles.secondary}`}
                            title="Print locals"
                        >
                            📊 <span className={styles.buttonText}>Locals</span>
                        </button>
                        <button
                            onClick={callbacks.onClearBreakpoints}
                            className={`${styles.button} ${styles.danger}`}
                            title="Clear all breakpoints"
                        >
                            🗑️ <span className={styles.buttonText}>Clear</span>
                        </button>
                    </div>

                    {/* Breakpoint Controls - always visible */}
                    <div className={styles.breakpointPanel}>
                        {/* Breakpoint List */}
                        <div className={styles.breakpointList}>
                            <div style={{ marginBottom: '4px', fontSize: '9px', color: '#5f6368' }}>
                                {stats.total} breakpoint{stats.total !== 1 ? 's' : ''}
                            </div>
                            {breakpoints.length === 0 ? (
                                <div style={{ color: '#9aa0a6', fontStyle: 'italic', fontSize: '9px' }}>
                                    No breakpoints
                                </div>
                            ) : (
                                breakpoints.map(bp => (
                                    <div key={bp.id} className={styles.breakpointItem}>
                                        <span className={styles.breakpointIcon}>
                                            {bp.enabled ? '⚫' : '⚪'}
                                        </span>
                                        <span className={styles.breakpointText}>
                                            Line {bp.location.line * 10}
                                            {bp.hitCount > 0 && ` (${bp.hitCount})`}
                                        </span>
                                        <button
                                            onClick={() => callbacks.onToggleBreakpoint(bp.location)}
                                            className={styles.smallButton}
                                        >
                                            {bp.enabled ? '◯' : '●'}
                                        </button>
                                        <button
                                            onClick={() => callbacks.onRemoveBreakpoint(bp.location)}
                                            className={styles.smallButton}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Debug Output */}
                    <div
                        ref={outputRef}
                        className={styles.debugOutput}
                    >
                        {debugOutput.map((message, index) => (
                            <div key={index}>{message}</div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

// Remove unused button styles since we're using CSS modules now

export default DebuggerPanel;
export type { DebuggerState, DebuggerCallbacks, DebuggerStats };
