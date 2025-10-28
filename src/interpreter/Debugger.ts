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
export type {
    Breakpoint,
    BreakpointCondition,
    DebuggerEvent,
    ExecutionContext,
    StateTransition
} from './DebuggerCore';

// Re-export types from DebuggerPanel (React component)
export type {
    DebuggerState,
    DebuggerCallbacks,
    DebuggerStats
} from '../components/Debugger/DebuggerPanel';

// Backward compatibility alias
export type { DebuggerCallbacks as DebuggerUICallbacks } from '../components/Debugger/DebuggerPanel';
