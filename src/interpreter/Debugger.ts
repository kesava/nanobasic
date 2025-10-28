// Re-export the integrated debugger for backward compatibility
export { 
    Frame, 
    StepMode, 
    BreakpointManager, 
    DebuggerEventEmitter,
    DebuggerStateManager,
    DebuggerState as DebuggerExecutionState,
    NewStepMode,
    PauseReason
} from './DebuggerCore';
export { DebuggerWithUI as Debugger, dbg } from './DebuggerIntegration';
export { DebuggerUI } from './DebuggerUI';
export type { 
    Breakpoint, 
    BreakpointCondition, 
    DebuggerEvent,
    ExecutionContext,
    StateTransition
} from './DebuggerCore';
export type { DebuggerState, DebuggerUICallbacks, DebuggerStats } from './DebuggerUI';

// Enable web UI by default in browser environment
if (typeof window !== 'undefined') {
    // UI is automatically enabled in DebuggerIntegration
}