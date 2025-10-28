import { BreakpointManager } from './BreakpointManager';
import type { Breakpoint, BreakpointCondition, BreakpointHit, SourceLocation } from './BreakpointManager';
import { DebuggerEventEmitter } from './DebuggerEvents';
import type { DebuggerEvent } from './DebuggerEvents';
import { DebuggerStateManager, DebuggerState, StepMode, PauseReason } from './DebuggerStateManager';
import type { ExecutionContext, StateTransition } from './DebuggerStateManager';

// Legacy step mode constants for backward compatibility
const LegacyStepMode = {
    RUN: "run",
    IN: "in",
    OVER: "over",
    OUT: "out"
} as const;

type LegacyStepModeType = typeof LegacyStepMode[keyof typeof LegacyStepMode];

interface DebuggerContext {
    node: {
        span?: { start: { line: number; column: number }; end: { line: number; column: number } };
    };
    nodeDepth: number;
    frame: Frame;
}

class Frame {
    name: string;
    locals: { [key: string]: any };
    parent: Frame | null;
    callDepth: number;

    constructor({
        name = "<main>",
        locals = {},
        parent = null,
        callDepth = 0
    }: {
        name?: string;
        locals?: { [key: string]: any };
        parent?: Frame | null;
        callDepth?: number;
    } = {}) {
        this.name = name;
        this.locals = locals;
        this.parent = parent;
        this.callDepth = callDepth;
    }

    lookup(k: string): any {
        if (k in this.locals) {
            return this.locals[k];
        }
        if (this.parent) {
            return this.parent.lookup(k);
        }
        throw new ReferenceError(`Variable '${k}' not found`);
    }

    set(k: string, v: any): void {
        this.locals[k] = v;
    }
}

class Debugger {
    private breakpointManager: BreakpointManager;
    private stateManager: DebuggerStateManager;
    private eventEmitter: DebuggerEventEmitter;
    private onContinueCallback: (() => void) | null = null;
    private onStepCallback: (() => void) | null = null;
    private currentContext: DebuggerContext | null = null;
    private currentBreakpointHit: BreakpointHit | null = null;

    constructor() {
        this.breakpointManager = new BreakpointManager();
        this.stateManager = new DebuggerStateManager();
        this.eventEmitter = new DebuggerEventEmitter();
        this.setupStateListeners();
        this.setupBreakpointListeners();
    }

    /**
     * Setup state change listeners
     */
    private setupStateListeners(): void {
        this.stateManager.onStateChanged((transition: StateTransition) => {
            // Update execution context when state changes
            if (this.currentContext?.node.span) {
                this.stateManager.updateExecutionContext({
                    currentLine: this.currentContext.node.span.start.line,
                    currentColumn: this.currentContext.node.span.start.column,
                    nodeDepth: this.currentContext.nodeDepth,
                    frameName: this.currentContext.frame.name
                });
            }

            // Emit state change events
            this.emitStateChange();

            // Emit specific state events
            switch (transition.to) {
                case DebuggerState.PAUSED:
                    this.eventEmitter.emit({
                        type: 'paused',
                        timestamp: new Date(),
                        reason: this.mapPauseReasonToEventReason(this.stateManager.getPauseReason()),
                        location: this.getCurrentLocation(),
                        context: this.currentContext
                    });
                    break;
                case DebuggerState.RUNNING:
                case DebuggerState.STEPPING:
                    this.eventEmitter.emit({
                        type: 'resumed',
                        timestamp: new Date(),
                        mode: transition.to === DebuggerState.STEPPING ? 'step' : 'run'
                    });
                    break;
            }
        });
    }

    /**
     * Add event listener for debugger events
     */
    addEventListener(listener: (event: DebuggerEvent) => void): void {
        this.eventEmitter.onAll(listener);
    }

    /**
     * Remove event listener
     */
    removeEventListener(listener: (event: DebuggerEvent) => void): void {
        this.eventEmitter.offAll(listener);
    }

    /**
     * Enable web-based debugging UI (deprecated - use DebuggerUI class)
     */
    enableWebUI(): void {
        console.warn('enableWebUI() is deprecated. Use DebuggerUI class instead.');
    }

    /**
     * Add a breakpoint at the specified location
     */
    addBreakpoint(
        span: { start: { line: number; column: number }; end: { line: number; column: number } } | null,
        options: {
            enabled?: boolean;
            condition?: BreakpointCondition;
            logMessage?: string;
        } = {}
    ): Breakpoint | null {
        if (!span) return null;
        
        const location: SourceLocation = {
            line: span.start.line,
            column: span.start.column
        };
        
        const breakpoint = this.breakpointManager.addBreakpoint(location, options);
        console.log('Breakpoint added:', breakpoint);
        return breakpoint;
    }

    /**
     * Remove a breakpoint at the specified location
     */
    removeBreakpoint(span: { start: { line: number; column: number }; end: { line: number; column: number } } | null): boolean {
        if (!span) return false;
        
        const location: SourceLocation = {
            line: span.start.line,
            column: span.start.column
        };
        
        const removed = this.breakpointManager.removeBreakpointAt(location);
        if (removed) {
            console.log('Breakpoint removed at:', location);
        }
        return removed;
    }

    /**
     * Toggle breakpoint at the specified location
     */
    toggleBreakpoint(span: { start: { line: number; column: number }; end: { line: number; column: number } } | null): Breakpoint | null {
        if (!span) return null;
        
        const location: SourceLocation = {
            line: span.start.line,
            column: span.start.column
        };
        
        const existing = this.breakpointManager.findBreakpointAt(location);
        if (existing) {
            this.breakpointManager.toggleBreakpoint(existing.id);
            return existing;
        } else {
            return this.addBreakpoint(span);
        }
    }

    /**
     * Check if there's a breakpoint at the given location
     */
    hasBreakpoint(span: { start: { line: number; column: number }; end: { line: number; column: number } } | null): boolean {
        if (!span) return false;
        
        const location: SourceLocation = {
            line: span.start.line,
            column: span.start.column
        };
        
        return this.breakpointManager.hasBreakpointAt(location);
    }

    /**
     * Get all breakpoints
     */
    getBreakpoints(): Breakpoint[] {
        return this.breakpointManager.getAllBreakpoints();
    }

    /**
     * Clear all breakpoints
     */
    clearAllBreakpoints(): void {
        this.breakpointManager.clearAll();
    }

    /**
     * Add conditional breakpoint
     */
    addConditionalBreakpoint(
        span: { start: { line: number; column: number }; end: { line: number; column: number } } | null,
        condition: BreakpointCondition
    ): Breakpoint | null {
        return this.addBreakpoint(span, { condition });
    }

    /**
     * Export breakpoints to JSON
     */
    exportBreakpoints(): string {
        return this.breakpointManager.exportBreakpoints();
    }

    /**
     * Import breakpoints from JSON
     */
    importBreakpoints(jsonData: string): { success: boolean; imported: number; errors: string[] } {
        return this.breakpointManager.importBreakpoints(jsonData);
    }

    async shouldPause({ node, nodeDepth, frame }: { node: { span?: { start: { line: number; column: number }; end: { line: number; column: number } } }; nodeDepth: number; frame: any }): Promise<boolean> {
        // Check if state manager says we should skip
        const shouldSkip = this.stateManager.shouldSkipPause();
        console.log('shouldPause: shouldSkipPause =', shouldSkip);
        if (shouldSkip) {
            this.stateManager.setSkipNextPause(false);
            console.log('shouldPause: SKIPPING pause due to skipNextPause flag');
            return false;
        }

        // Check for step mode
        if (this.stateManager.getState() === DebuggerState.STEPPING) {
            console.log('shouldPause: true (step mode)');
            return true;
        }

        // Check for breakpoints
        if (node.span) {
            const location: SourceLocation = {
                line: node.span.start.line,
                column: node.span.start.column
            };
            
            console.log('Checking breakpoint at location:', location);
            console.log('Available breakpoints:', this.breakpointManager.getAllBreakpoints().map(bp => ({ line: bp.location.line, enabled: bp.enabled })));
            
            const context = { node, nodeDepth, frame, location };
            const breakpointHit = await this.breakpointManager.shouldPauseAt(location, context);
            
            if (breakpointHit) {
                this.currentBreakpointHit = breakpointHit;
                console.log('shouldPause: true (breakpoint hit)', breakpointHit);
                return true;
            }
        }

        console.log('shouldPause: false');
        return false;
    }

    // Pause execution and update state via events
    async before(ctx: DebuggerContext): Promise<void> {
        console.log('Before method called for node:', ctx.node.span?.start);
        const shouldPause = await this.shouldPause({
            node: ctx.node,
            nodeDepth: ctx.nodeDepth,
            frame: ctx.frame
        });
        
        console.log('shouldPause result:', shouldPause);
        if (!shouldPause) return;

        console.log('PAUSING EXECUTION - shouldPause returned true');
        
        // Store current context for inspection
        this.currentContext = ctx;

        // Determine pause reason
        let pauseReason: PauseReason = PauseReason.STEP;
        if (this.currentBreakpointHit) {
            pauseReason = PauseReason.BREAKPOINT;
            console.log('Emitting breakpointHit event');
            this.eventEmitter.emit({
                type: 'breakpointHit',
                timestamp: new Date(),
                breakpoint: this.currentBreakpointHit.breakpoint,
                hitCount: this.currentBreakpointHit.breakpoint.hitCount
            });
            this.currentBreakpointHit = null;
        }

        // Transition to paused state
        console.log('Transitioning to paused state with reason:', pauseReason);
        this.stateManager.pauseExecution(pauseReason, ctx);
        
        return;
    }

    /**
     * Check if execution is currently paused
     */
    isPaused(): boolean {
        return this.stateManager.isPaused();
    }

    /**
     * Start execution - transitions from IDLE to RUNNING state
     */
    startExecution(): boolean {
        console.log('DebuggerCore.startExecution called');
        return this.stateManager.startExecution();
    }

    /**
     * Get current step mode (for backward compatibility)
     */
    get currentStepMode(): LegacyStepModeType {
        const stepMode = this.stateManager.getStepMode();
        switch (stepMode) {
            case StepMode.RUN: return LegacyStepMode.RUN;
            case StepMode.INTO: return LegacyStepMode.IN;
            case StepMode.OVER: return LegacyStepMode.OVER;
            case StepMode.OUT: return LegacyStepMode.OUT;
            default: return LegacyStepMode.RUN;
        }
    }

    /**
     * Reset debugger to run mode (unpause)
     */
    resume(): void {
        this.stateManager.resumeExecution();
    }

    /**
     * Set debugger to step mode (will pause at next statement)
     */
    setStepMode(): void {
        this.stateManager.stepExecution(StepMode.INTO);
    }

    /**
     * Set callback for when Continue is triggered
     */
    setOnContinueCallback(callback: () => void): void {
        this.onContinueCallback = callback;
    }

    /**
     * Set callback for when Step is triggered
     */
    setOnStepCallback(callback: () => void): void {
        this.onStepCallback = callback;
    }

    /**
     * Continue execution (called by UI)
     */
    continue(): void {
        this.stateManager.resumeExecution();
        
        if (this.onContinueCallback) {
            this.onContinueCallback();
        }
    }

    /**
     * Step to next statement (called by UI)
     */
    step(): void {
        this.stateManager.stepExecution(StepMode.INTO);
        
        this.eventEmitter.emit({
            type: 'stepped',
            timestamp: new Date()
        });
        
        if (this.onStepCallback) {
            this.onStepCallback();
        }
    }

    /**
     * Get current local variables (for UI)
     */
    getLocals(): { [key: string]: any } {
        return this.currentContext?.frame.locals || {};
    }

    /**
     * Get call stack backtrace (for UI)
     */
    getBacktrace(): Array<{ name: string; locals: string[] }> {
        const backtrace: Array<{ name: string; locals: string[] }> = [];
        let currentFrame: Frame | null = this.currentContext?.frame || null;
        
        while (currentFrame) {
            backtrace.push({
                name: currentFrame.name,
                locals: Object.keys(currentFrame.locals).map(k => `$${k}`)
            });
            currentFrame = currentFrame.parent;
        }
        
        return backtrace;
    }

    /**
     * Get breakpoint statistics (for UI)
     */
    getBreakpointStats(): {
        total: number;
        enabled: number;
        disabled: number;
        withConditions: number;
        totalHits: number;
    } {
        return this.breakpointManager.getStatistics();
    }

    async onException(ctx: DebuggerContext, err: Error): Promise<void> {
        const location = ctx.node.span ? {
            line: ctx.node.span.start.line,
            column: ctx.node.span.start.column
        } : undefined;
        
        this.eventEmitter.emit({
            type: 'exception',
            timestamp: new Date(),
            error: err,
            location
        });
        
        // Transition to error state
        this.stateManager.handleError(err, ctx);
        
        await this.before(ctx);
        throw err;
    }

    /**
     * Setup breakpoint event listeners
     */
    private setupBreakpointListeners(): void {
        this.breakpointManager.addEventListener((_event) => {
            // Forward breakpoint events through our event emitter
            // This allows UI to listen to a single source
            this.emitStateChange();
        });
    }

    /**
     * Map PauseReason to event reason string
     */
    private mapPauseReasonToEventReason(pauseReason: PauseReason | null): 'breakpoint' | 'step' | 'exception' | 'user' | 'end' {
        switch (pauseReason) {
            case PauseReason.BREAKPOINT: return 'breakpoint';
            case PauseReason.STEP: return 'step';
            case PauseReason.EXCEPTION: return 'exception';
            case PauseReason.USER_REQUEST: return 'user';
            case PauseReason.PROGRAM_END: return 'end';
            default: return 'step';
        }
    }

    /**
     * Get current location for events
     */
    private getCurrentLocation(): { line: number; column: number } | undefined {
        return this.currentContext?.node.span ? {
            line: this.currentContext.node.span.start.line,
            column: this.currentContext.node.span.start.column
        } : undefined;
    }

    /**
     * Emit state change event with current debugger state
     */
    private emitStateChange(): void {
        const stateInfo = this.stateManager.getStateInfo();
        const location = this.getCurrentLocation();
        const locationString = location ? `Line ${location.line}, Col ${location.column}` : undefined;
            
        this.eventEmitter.emit({
            type: 'stateChanged',
            timestamp: new Date(),
            state: {
                status: stateInfo.displayState,
                mode: this.currentStepMode,
                location: locationString,
                depth: this.currentContext?.nodeDepth,
                frameName: this.currentContext?.frame.name,
                isPaused: stateInfo.isPaused
            }
        });
    }

    /**
     * Get debugger state information
     */
    getStateInfo() {
        return this.stateManager.getStateInfo();
    }

    /**
     * Get state history for debugging
     */
    getStateHistory() {
        return this.stateManager.getStateHistory();
    }

    /**
     * Reset debugger state
     */
    resetState(): void {
        this.stateManager.reset();
        this.currentContext = null;
        this.currentBreakpointHit = null;
    }
}

export { 
    Debugger, 
    Frame, 
    LegacyStepMode as StepMode, 
    BreakpointManager, 
    DebuggerEventEmitter,
    DebuggerStateManager,
    DebuggerState,
    StepMode as NewStepMode,
    PauseReason
};
export type { 
    Breakpoint, 
    BreakpointCondition, 
    DebuggerEvent,
    ExecutionContext,
    StateTransition
};
export const dbg = new Debugger();