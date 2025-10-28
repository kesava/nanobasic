import { Debugger } from './DebuggerCore';
import { DebuggerUI } from './DebuggerUI';
import type { DebuggerUICallbacks } from './DebuggerUI';
import type { BreakpointCondition, SourceLocation } from './BreakpointManager';

class DebuggerWithUI {
    private debugger: Debugger;
    private ui: DebuggerUI;

    constructor() {
        this.debugger = new Debugger();
        this.ui = new DebuggerUI();
        this.setupIntegration();
    }

    private setupIntegration(): void {
        const callbacks: DebuggerUICallbacks = {
            onContinue: () => this.debugger.continue(),
            onStep: () => this.debugger.step(),
            onPrintLocals: () => {
                const locals = this.debugger.getLocals();
                const message = this.formatLocals(locals);
                this.ui.logMessage(message);
            },
            onBacktrace: () => {
                const backtrace = this.debugger.getBacktrace();
                const message = this.formatBacktrace(backtrace);
                this.ui.logMessage(message);
            },
            onClearBreakpoints: () => {
                this.debugger.clearAllBreakpoints();
                this.ui.logMessage('All breakpoints cleared');
                this.updateBreakpointUI();
            },
            onAddConditionalBreakpoint: (line: number, condition?: string) => {
                const span = {
                    start: { line, column: 0 },
                    end: { line, column: 0 }
                };
                
                if (condition && condition.trim()) {
                    const breakpointCondition: BreakpointCondition = {
                        expression: condition.trim(),
                        type: 'expression'
                    };
                    this.debugger.addConditionalBreakpoint(span, breakpointCondition);
                    this.ui.logMessage(`Conditional breakpoint added at line ${line}: ${condition}`);
                } else {
                    this.debugger.addBreakpoint(span);
                    this.ui.logMessage(`Breakpoint added at line ${line}`);
                }
                
                this.updateBreakpointUI();
            },
            onExportBreakpoints: () => {
                return this.debugger.exportBreakpoints();
            },
            onImportBreakpoints: (jsonData: string) => {
                const result = this.debugger.importBreakpoints(jsonData);
                this.updateBreakpointUI();
                return result;
            },
            onToggleBreakpoint: (location: SourceLocation) => {
                const span = {
                    start: { line: location.line, column: location.column },
                    end: { line: location.line, column: location.column }
                };
                this.debugger.toggleBreakpoint(span);
                this.updateBreakpointUI();
            },
            onRemoveBreakpoint: (location: SourceLocation) => {
                const span = {
                    start: { line: location.line, column: location.column },
                    end: { line: location.line, column: location.column }
                };
                this.debugger.removeBreakpoint(span);
                this.updateBreakpointUI();
            }
        };

        this.ui.setCallbacks(callbacks);

        this.debugger.addEventListener((event) => {
            switch (event.type) {
                case 'stateChanged':
                    this.ui.updateState(event.state);
                    break;
                case 'paused':
                    this.ui.updateState({ 
                        status: `Paused (${event.reason})`,
                        isPaused: true 
                    });
                    break;
                case 'resumed':
                    this.ui.updateState({ 
                        status: 'Running',
                        isPaused: false 
                    });
                    break;
                case 'breakpointHit':
                    const bp = event.breakpoint;
                    this.ui.logMessage(`Breakpoint hit at line ${bp.location.line} (${bp.hitCount} times)`);
                    if (bp.logMessage) {
                        this.ui.logMessage(`Log: ${bp.logMessage}`);
                    }
                    this.updateBreakpointUI();
                    break;
                case 'exception':
                    const location = event.location ? 
                        `${event.location.line}:${event.location.column}` : 
                        'unknown';
                    this.ui.logMessage(`Exception at ${location}: ${event.error.message}`);
                    break;
            }
        });
    }

    private updateBreakpointUI(): void {
        const breakpoints = this.debugger.getBreakpoints();
        const stats = this.debugger.getBreakpointStats();
        this.ui.updateBreakpoints(breakpoints, stats);
    }

    private formatLocals(locals: { [key: string]: any }): string {
        if (Object.keys(locals).length === 0) {
            return '<strong>Local Variables:</strong><br>&nbsp;&nbsp;(no local variables)';
        }
        
        let output = '<strong>Local Variables:</strong><br>';
        Object.entries(locals).forEach(([key, value]) => {
            output += `&nbsp;&nbsp;$${key} = ${JSON.stringify(value)}<br>`;
        });
        return output;
    }

    private formatBacktrace(backtrace: Array<{ name: string; locals: string[] }>): string {
        if (backtrace.length === 0) {
            return '<strong>Call Stack:</strong><br>&nbsp;&nbsp;(empty stack)';
        }
        
        let output = '<strong>Call Stack:</strong><br>';
        backtrace.forEach((frame, index) => {
            const localVars = frame.locals.length > 0 ?
                ` (locals: ${frame.locals.join(', ')})` :
                ' (no locals)';
            output += `&nbsp;&nbsp;#${index} ${frame.name}${localVars}<br>`;
        });
        return output;
    }

    // Expose core debugger methods for backward compatibility
    enableWebUI(): void {
        // UI is automatically enabled in constructor
    }

    addBreakpoint(span: any, options?: any) {
        const result = this.debugger.addBreakpoint(span, options);
        this.updateBreakpointUI();
        return result;
    }

    removeBreakpoint(span: any) {
        const result = this.debugger.removeBreakpoint(span);
        this.updateBreakpointUI();
        return result;
    }

    toggleBreakpoint(span: any) {
        const result = this.debugger.toggleBreakpoint(span);
        this.updateBreakpointUI();
        return result;
    }

    hasBreakpoint(span: any) {
        return this.debugger.hasBreakpoint(span);
    }

    clearAllBreakpoints() {
        this.debugger.clearAllBreakpoints();
        this.updateBreakpointUI();
    }

    addConditionalBreakpoint(span: any, condition: BreakpointCondition) {
        const result = this.debugger.addConditionalBreakpoint(span, condition);
        this.updateBreakpointUI();
        return result;
    }

    exportBreakpoints() {
        return this.debugger.exportBreakpoints();
    }

    importBreakpoints(jsonData: string) {
        const result = this.debugger.importBreakpoints(jsonData);
        this.updateBreakpointUI();
        return result;
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
        const locals = this.debugger.getLocals();
        const message = this.formatLocals(locals);
        this.ui.logMessage(message);
        return locals;
    }

    backtrace() {
        const backtrace = this.debugger.getBacktrace();
        const message = this.formatBacktrace(backtrace);
        this.ui.logMessage(message);
        return backtrace;
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