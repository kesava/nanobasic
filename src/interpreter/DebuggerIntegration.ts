import { Debugger } from './DebuggerCore';
import type { BreakpointCondition } from './BreakpointManager';

class DebuggerWithUI {
    private debugger: Debugger;

    constructor() {
        this.debugger = new Debugger();
    }

    // Expose core debugger methods for backward compatibility
    enableWebUI(): void {
        // UI is automatically enabled in constructor
    }

    addBreakpoint(span: any, options?: any) {
        return this.debugger.addBreakpoint(span, options);
    }

    removeBreakpoint(span: any) {
        return this.debugger.removeBreakpoint(span);
    }

    toggleBreakpoint(span: any) {
        return this.debugger.toggleBreakpoint(span);
    }

    hasBreakpoint(span: any) {
        return this.debugger.hasBreakpoint(span);
    }

    clearAllBreakpoints() {
        return this.debugger.clearAllBreakpoints();
    }

    addConditionalBreakpoint(span: any, condition: BreakpointCondition) {
        return this.debugger.addConditionalBreakpoint(span, condition);
    }

    exportBreakpoints() {
        return this.debugger.exportBreakpoints();
    }

    importBreakpoints(jsonData: string) {
        return this.debugger.importBreakpoints(jsonData);
    }

    getBreakpoints() {
        return this.debugger.getBreakpoints();
    }

    async before(ctx: any) {
        return this.debugger.before(ctx);
    }

    isPaused() {
        return this.debugger.isPaused();
    }

    get currentStepMode() {
        return this.debugger.currentStepMode;
    }

    resume() {
        return this.debugger.resume();
    }

    setStepMode() {
        return this.debugger.setStepMode();
    }

    setOnContinueCallback(callback: () => void) {
        return this.debugger.setOnContinueCallback(callback);
    }

    setOnStepCallback(callback: () => void) {
        return this.debugger.setOnStepCallback(callback);
    }

    async onException(ctx: any, err: Error) {
        return this.debugger.onException(ctx, err);
    }

    addEventListener(listener: any) {
        return this.debugger.addEventListener(listener);
    }

    removeEventListener(listener: any) {
        return this.debugger.removeEventListener(listener);
    }

    // Add the missing methods that React hooks expect
    continue() {
        return this.debugger.continue();
    }

    step() {
        return this.debugger.step();
    }

    printLocals() {
        return this.debugger.getLocals();
    }

    backtrace() {
        return this.debugger.getBacktrace();
    }

    getBreakpointStats() {
        return this.debugger.getBreakpointStats();
    }

    startExecution() {
        return this.debugger.startExecution();
    }

    resetState() {
        return this.debugger.resetState();
    }
}

export { DebuggerWithUI };
export const dbg = new DebuggerWithUI();
