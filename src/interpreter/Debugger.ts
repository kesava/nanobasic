// Re-export the integrated debugger for backward compatibility
export {
    Frame,
    StepMode,
    BreakpointManager,
    DebuggerEventEmitter,
    DebuggerStateManager,
    DebuggerState as DebuggerExecutionState,
    InternalStepMode,
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
