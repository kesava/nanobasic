// Debugger execution states
enum DebuggerState {
    IDLE = 'idle',           // Not executing anything
    RUNNING = 'running',     // Normal execution
    PAUSED = 'paused',       // Paused at breakpoint or by user
    STEPPING = 'stepping',   // Single-step mode
    ERROR = 'error',         // Exception occurred
    TERMINATED = 'terminated' // Execution finished
}

// Step modes for granular control
enum StepMode {
    RUN = 'run',       // Continuous execution
    INTO = 'into',     // Step into functions/statements
    OVER = 'over',     // Step over functions
    OUT = 'out'        // Step out of current function
}

// Pause reasons for better debugging context
enum PauseReason {
    BREAKPOINT = 'breakpoint',
    STEP = 'step',
    EXCEPTION = 'exception', 
    USER_REQUEST = 'user',
    PROGRAM_END = 'end'
}

// Valid state transitions
const STATE_TRANSITIONS: Record<DebuggerState, DebuggerState[]> = {
    [DebuggerState.IDLE]: [DebuggerState.RUNNING, DebuggerState.STEPPING],
    [DebuggerState.RUNNING]: [DebuggerState.PAUSED, DebuggerState.ERROR, DebuggerState.TERMINATED, DebuggerState.IDLE],
    [DebuggerState.PAUSED]: [DebuggerState.RUNNING, DebuggerState.STEPPING, DebuggerState.TERMINATED, DebuggerState.IDLE],
    [DebuggerState.STEPPING]: [DebuggerState.PAUSED, DebuggerState.RUNNING, DebuggerState.ERROR, DebuggerState.TERMINATED],
    [DebuggerState.ERROR]: [DebuggerState.IDLE, DebuggerState.TERMINATED],
    [DebuggerState.TERMINATED]: [DebuggerState.IDLE]
};

interface ExecutionContext {
    currentLine: number;
    currentColumn: number;
    nodeDepth: number;
    frameName: string;
    lastExecutionTime: Date;
}

interface StateTransition {
    from: DebuggerState;
    to: DebuggerState;
    reason?: string;
    timestamp: Date;
    context?: any;
}

class DebuggerStateManager {
    private currentState: DebuggerState = DebuggerState.IDLE;
    private stepMode: StepMode = StepMode.RUN;
    private pauseReason: PauseReason | null = null;
    private executionContext: ExecutionContext | null = null;
    private stateHistory: StateTransition[] = [];
    private skipNextPause: boolean = false;
    private maxHistorySize: number = 100;

    // Event callbacks
    private onStateChange: ((transition: StateTransition) => void) | null = null;

    constructor() {
        this.recordTransition(DebuggerState.IDLE, DebuggerState.IDLE, 'initialization');
    }

    /**
     * Get current debugger state
     */
    getState(): DebuggerState {
        return this.currentState;
    }

    /**
     * Get current step mode
     */
    getStepMode(): StepMode {
        return this.stepMode;
    }

    /**
     * Get pause reason (if paused)
     */
    getPauseReason(): PauseReason | null {
        return this.pauseReason;
    }

    /**
     * Get current execution context
     */
    getExecutionContext(): ExecutionContext | null {
        return this.executionContext;
    }

    /**
     * Check if execution is currently paused
     */
    isPaused(): boolean {
        return this.currentState === DebuggerState.PAUSED;
    }

    /**
     * Check if execution is running
     */
    isRunning(): boolean {
        return this.currentState === DebuggerState.RUNNING || 
               this.currentState === DebuggerState.STEPPING;
    }

    /**
     * Check if debugger is idle
     */
    isIdle(): boolean {
        return this.currentState === DebuggerState.IDLE;
    }

    /**
     * Check if an error occurred
     */
    hasError(): boolean {
        return this.currentState === DebuggerState.ERROR;
    }

    /**
     * Check if execution is terminated
     */
    isTerminated(): boolean {
        return this.currentState === DebuggerState.TERMINATED;
    }

    /**
     * Check if should skip next pause
     */
    shouldSkipPause(): boolean {
        return this.skipNextPause;
    }

    /**
     * Transition to new state with validation
     */
    transitionTo(
        newState: DebuggerState, 
        reason?: string, 
        context?: any
    ): boolean {
        if (!this.isValidTransition(this.currentState, newState)) {
            console.warn(`Invalid state transition: ${this.currentState} -> ${newState}`);
            return false;
        }

        const oldState = this.currentState;
        this.currentState = newState;

        // Clear pause reason if not paused
        if (newState !== DebuggerState.PAUSED) {
            this.pauseReason = null;
        }

        // Don't clear skip flag here - it should only be cleared when actually used in shouldPause
        // The skipNextPause flag needs to survive the state transition

        this.recordTransition(oldState, newState, reason, context);
        return true;
    }

    /**
     * Start execution
     */
    startExecution(): boolean {
        if (this.currentState === DebuggerState.IDLE) {
            this.stepMode = StepMode.RUN;
            return this.transitionTo(DebuggerState.RUNNING, 'execution started');
        }
        return false;
    }

    /**
     * Pause execution
     */
    pauseExecution(reason: PauseReason, context?: any): boolean {
        console.log('pauseExecution called - current state:', this.currentState, 'isRunning:', this.isRunning());
        if (this.isRunning()) {
            this.pauseReason = reason;
            const result = this.transitionTo(DebuggerState.PAUSED, `paused: ${reason}`, context);
            console.log('pauseExecution transition result:', result, 'new state:', this.currentState);
            return result;
        }
        console.log('pauseExecution failed - not in running state');
        return false;
    }

    /**
     * Resume execution from paused state
     */
    resumeExecution(): boolean {
        console.log('DebuggerStateManager: resumeExecution called, current state:', this.currentState);
        if (this.currentState === DebuggerState.PAUSED) {
            this.stepMode = StepMode.RUN;
            console.log('DebuggerStateManager: setting skipNextPause = true');
            this.skipNextPause = true;
            const result = this.transitionTo(DebuggerState.RUNNING, 'resumed');
            console.log('DebuggerStateManager: resumeExecution result:', result, 'skipNextPause:', this.skipNextPause);
            return result;
        }
        console.log('DebuggerStateManager: resumeExecution failed - not in PAUSED state');
        return false;
    }

    /**
     * Start single-step execution
     */
    stepExecution(mode: StepMode = StepMode.INTO): boolean {
        if (this.currentState === DebuggerState.PAUSED || this.currentState === DebuggerState.IDLE) {
            this.stepMode = mode;
            this.skipNextPause = true;
            
            const targetState = this.currentState === DebuggerState.IDLE ? 
                DebuggerState.STEPPING : DebuggerState.STEPPING;
            
            return this.transitionTo(targetState, `step ${mode}`);
        }
        return false;
    }

    /**
     * Handle execution error
     */
    handleError(error: Error, context?: any): boolean {
        if (this.isRunning()) {
            return this.transitionTo(DebuggerState.ERROR, `error: ${error.message}`, { error, ...context });
        }
        return false;
    }

    /**
     * Terminate execution
     */
    terminateExecution(reason?: string): boolean {
        if (!this.isTerminated() && !this.isIdle()) {
            return this.transitionTo(DebuggerState.TERMINATED, reason || 'execution terminated');
        }
        return false;
    }

    /**
     * Reset to idle state
     */
    reset(): boolean {
        this.stepMode = StepMode.RUN;
        this.pauseReason = null;
        this.executionContext = null;
        this.skipNextPause = false;
        return this.transitionTo(DebuggerState.IDLE, 'reset');
    }

    /**
     * Update execution context
     */
    updateExecutionContext(context: Partial<ExecutionContext>): void {
        this.executionContext = {
            currentLine: context.currentLine || this.executionContext?.currentLine || 0,
            currentColumn: context.currentColumn || this.executionContext?.currentColumn || 0,
            nodeDepth: context.nodeDepth || this.executionContext?.nodeDepth || 0,
            frameName: context.frameName || this.executionContext?.frameName || '<main>',
            lastExecutionTime: new Date()
        };
    }

    /**
     * Set skip next pause flag
     */
    setSkipNextPause(skip: boolean = true): void {
        console.log('DebuggerStateManager: setSkipNextPause called with:', skip, 'was:', this.skipNextPause);
        this.skipNextPause = skip;
    }

    /**
     * Check if should pause at current location
     */
    shouldPauseHere(): boolean {
        if (this.skipNextPause) {
            return false;
        }

        return this.currentState === DebuggerState.STEPPING || 
               (this.currentState === DebuggerState.PAUSED && this.pauseReason === PauseReason.STEP);
    }

    /**
     * Get state history
     */
    getStateHistory(): StateTransition[] {
        return [...this.stateHistory];
    }

    /**
     * Get last state transition
     */
    getLastTransition(): StateTransition | null {
        return this.stateHistory[this.stateHistory.length - 1] || null;
    }

    /**
     * Set state change callback
     */
    onStateChanged(callback: (transition: StateTransition) => void): void {
        this.onStateChange = callback;
    }

    /**
     * Get current state as display string
     */
    getDisplayState(): string {
        switch (this.currentState) {
            case DebuggerState.IDLE:
                return 'Ready';
            case DebuggerState.RUNNING:
                return 'Running';
            case DebuggerState.PAUSED:
                return `Paused (${this.pauseReason || 'unknown'})`;
            case DebuggerState.STEPPING:
                return `Step Mode (${this.stepMode})`;
            case DebuggerState.ERROR:
                return 'Error';
            case DebuggerState.TERMINATED:
                return 'Terminated';
            default:
                return 'Unknown';
        }
    }

    /**
     * Save current state to localStorage
     */
    saveState(): boolean {
        try {
            if (typeof window === 'undefined') return false;
            
            const stateData = {
                currentState: this.currentState,
                stepMode: this.stepMode,
                pauseReason: this.pauseReason,
                executionContext: this.executionContext,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            
            localStorage.setItem('nanobasic-debugger-state', JSON.stringify(stateData));
            return true;
        } catch (err) {
            console.warn('Failed to save debugger state:', err);
            return false;
        }
    }

    /**
     * Load state from localStorage
     */
    loadState(): boolean {
        try {
            if (typeof window === 'undefined') return false;
            
            const stateJson = localStorage.getItem('nanobasic-debugger-state');
            if (!stateJson) return false;
            
            const stateData = JSON.parse(stateJson);
            
            // Validate state data
            if (!stateData.version || !stateData.currentState) {
                return false;
            }
            
            // Restore state with validation
            if (this.isValidTransition(this.currentState, stateData.currentState)) {
                this.currentState = stateData.currentState;
                this.stepMode = stateData.stepMode || StepMode.RUN;
                this.pauseReason = stateData.pauseReason;
                this.executionContext = stateData.executionContext;
                
                this.recordTransition(
                    DebuggerState.IDLE, 
                    this.currentState, 
                    'state restored from storage'
                );
                
                return true;
            }
            
            return false;
        } catch (err) {
            console.warn('Failed to load debugger state:', err);
            return false;
        }
    }

    /**
     * Clear saved state
     */
    clearSavedState(): void {
        try {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('nanobasic-debugger-state');
            }
        } catch (err) {
            console.warn('Failed to clear saved state:', err);
        }
    }

    /**
     * Create state snapshot for recovery
     */
    createSnapshot(): {
        state: DebuggerState;
        stepMode: StepMode;
        pauseReason: PauseReason | null;
        context: ExecutionContext | null;
        timestamp: string;
    } {
        return {
            state: this.currentState,
            stepMode: this.stepMode,
            pauseReason: this.pauseReason,
            context: this.executionContext,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Restore from state snapshot
     */
    restoreFromSnapshot(snapshot: {
        state: DebuggerState;
        stepMode: StepMode;
        pauseReason: PauseReason | null;
        context: ExecutionContext | null;
    }): boolean {
        if (!this.isValidTransition(this.currentState, snapshot.state)) {
            return false;
        }
        
        this.currentState = snapshot.state;
        this.stepMode = snapshot.stepMode;
        this.pauseReason = snapshot.pauseReason;
        this.executionContext = snapshot.context;
        
        this.recordTransition(
            this.currentState,
            snapshot.state,
            'restored from snapshot'
        );
        
        return true;
    }

    /**
     * Get detailed state information
     */
    getStateInfo(): {
        state: DebuggerState;
        stepMode: StepMode;
        pauseReason: PauseReason | null;
        context: ExecutionContext | null;
        displayState: string;
        isPaused: boolean;
        isRunning: boolean;
    } {
        return {
            state: this.currentState,
            stepMode: this.stepMode,
            pauseReason: this.pauseReason,
            context: this.executionContext,
            displayState: this.getDisplayState(),
            isPaused: this.isPaused(),
            isRunning: this.isRunning()
        };
    }

    /**
     * Validate state transition
     */
    private isValidTransition(from: DebuggerState, to: DebuggerState): boolean {
        return STATE_TRANSITIONS[from]?.includes(to) || false;
    }

    /**
     * Record state transition in history
     */
    private recordTransition(
        from: DebuggerState, 
        to: DebuggerState, 
        reason?: string, 
        context?: any
    ): void {
        const transition: StateTransition = {
            from,
            to,
            reason,
            timestamp: new Date(),
            context
        };

        this.stateHistory.push(transition);

        // Limit history size
        if (this.stateHistory.length > this.maxHistorySize) {
            this.stateHistory.shift();
        }

        // Notify callback
        if (this.onStateChange) {
            this.onStateChange(transition);
        }
    }
}

export { 
    DebuggerStateManager, 
    DebuggerState, 
    StepMode, 
    PauseReason,
    STATE_TRANSITIONS
};
export type { 
    ExecutionContext, 
    StateTransition 
};