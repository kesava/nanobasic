const StepMode = {
    RUN: "run",
    IN: "in",
    OVER: "over",
    OUT: "out"
} as const;

type StepModeType = typeof StepMode[keyof typeof StepMode];

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
    private breakpoints: Set<string>;
    private stepMode: StepModeType;
    private debugPanel: HTMLElement | null = null;
    private onContinueCallback: (() => void) | null = null;
    private onStepCallback: (() => void) | null = null;
    private currentContext: DebuggerContext | null = null;
    private isPausedState: boolean = false;
    private skipNextPause: boolean = false;

    constructor() {
        this.breakpoints = new Set();
        this.stepMode = StepMode.RUN;
    }

    /**
     * Enable web-based debugging UI
     */
    enableWebUI(): void {
        this.createPersistentDebugPanel();
    }

    /**
     * Create persistent debug panel that's always visible
     */
    private createPersistentDebugPanel(): void {
        if (typeof window === 'undefined') return;

        // Try to find existing panel, but wait for React to render first
        const tryInitializePanel = () => {
            this.debugPanel = document.getElementById('debugger-panel');
            
            // If panel already exists and is already initialized, don't reinitialize
            if (this.debugPanel && this.debugPanel.innerHTML.includes('🐛 Debugger')) {
                return; // Panel already set up
            }

            if (this.debugPanel) {
                this.debugPanel.style.cssText = `
                    margin: 60px;
                    padding: 30px;
                    top: 10px;
                    right: 10px;
                    background: #f0f0f0;
                    border: 2px solid #333;
                    border-radius: 8px;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                    z-index: 1000;
                    font-family: ui-monospace, monospace;
                    min-width: 300px;
                `;

                this.debugPanel.innerHTML = `
                    <h3 style="margin: 0 0 10px 0; color: #333;">🐛 Debugger</h3>
                    <div style="margin-bottom: 15px;">
                        <strong>Status:</strong> <span id="debug-status">Ready</span><br>
                        <strong>Mode:</strong> <span id="debug-mode">${this.stepMode}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 15px;">
                        <button id="btn-continue" class="debug-btn" data-mode="run">▶️ Continue</button>
                        <button id="btn-step" class="debug-btn" data-mode="in">⬇️ Step</button>
                        <button id="btn-print-locals" class="debug-btn">📊 Print Locals</button>
                        <button id="btn-backtrace" class="debug-btn">📋 Backtrace</button>
                    </div>
                    <div id="debug-output" style="background: #fff; border: 1px solid #ccc; padding: 8px; max-height: 200px; overflow-y: auto; font-size: 12px;"></div>
                    <style>
                        .debug-btn {
                            padding: 8px;
                            cursor: pointer;
                            border: 1px solid #ccc;
                            background: #f9f9f9;
                            border-radius: 4px;
                            transition: all 0.2s;
                            font-size: 12px;
                        }
                        .debug-btn:hover {
                            background: #e0e0e0;
                            border-color: #999;
                        }
                        .debug-btn.active {
                            background: #4CAF50;
                            color: white;
                            border-color: #45a049;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        }
                        .debug-btn.active:hover {
                            background: #45a049;
                        }
                    </style>
                `;

                this.attachPersistentEventListeners();
                this.updateButtonStates();
            }
        };

        // Try immediately first
        tryInitializePanel();
        
        // If panel wasn't found, try again after a brief delay for React to render
        if (!this.debugPanel) {
            setTimeout(tryInitializePanel, 100);
        }
    }

    /**
     * Attach event listeners for persistent debug panel
     */
    private attachPersistentEventListeners(): void {
        const btnContinue = document.getElementById('btn-continue');
        const btnStep = document.getElementById('btn-step');
        const btnPrintLocals = document.getElementById('btn-print-locals');
        const btnBacktrace = document.getElementById('btn-backtrace');

        btnContinue?.addEventListener('click', () => {
            this.stepMode = StepMode.RUN;
            this.isPausedState = false;
            this.skipNextPause = true; // Skip the current breakpoint when continuing
            this.updateDebugStatus('Running');
            // Trigger continue callback to resume full execution
            if (this.onContinueCallback) {
                this.onContinueCallback();
            }
        });

        btnStep?.addEventListener('click', () => {
            this.stepMode = StepMode.IN;
            this.isPausedState = false; // Clear pause so step can execute
            this.skipNextPause = true; // Skip the current breakpoint to execute this line
            this.updateDebugStatus('Step Mode');
            // Trigger step callback for single line execution
            if (this.onStepCallback) {
                this.onStepCallback();
            }
        });

        btnPrintLocals?.addEventListener('click', () => {
            this.printLocals();
        });

        btnBacktrace?.addEventListener('click', () => {
            this.printBacktrace();
        });
    }

    /**
     * Update debug status in the panel
     */
    private updateDebugStatus(status: string): void {
        const statusElement = document.getElementById('debug-status');
        const modeElement = document.getElementById('debug-mode');
        if (statusElement) statusElement.textContent = status;
        if (modeElement) modeElement.textContent = this.stepMode;

        // Update button states
        this.updateButtonStates();
    }

    /**
     * Update active state of debug buttons
     */
    private updateButtonStates(): void {
        // Remove active class from all buttons
        const allButtons = document.querySelectorAll('.debug-btn[data-mode]');
        allButtons.forEach(btn => btn.classList.remove('active'));

        // Add active class to current mode button
        const currentModeBtn = document.querySelector(`[data-mode="${this.stepMode}"]`);
        if (currentModeBtn) {
            currentModeBtn.classList.add('active');
        }
    }

    /**
     * Log message to debug output panel
     */
    private logToDebugOutput(message: string): void {
        const output = document.getElementById('debug-output');
        if (output) {
            output.innerHTML += `<div>${message}</div>`;
            output.scrollTop = output.scrollHeight;
        }
    }

    /**
     * Show/hide the debug panel
     */
    showDebugPanel(): void {
        if (this.debugPanel) {
            this.debugPanel.style.display = 'block';
        }
    }

    hideDebugPanel(): void {
        if (this.debugPanel) {
            this.debugPanel.style.display = 'none';
        }
    }

    addBreakpoint(span: { start: { line: number; column: number }; end: { line: number; column: number } } | null): void {
        if (span) {
            this.breakpoints.add(`${span.start.line}:${span.start.column}`);
        }
        console.log('Current breakpoints:', Array.from(this.breakpoints));
    }

    removeBreakpoint(span: { start: { line: number; column: number }; end: { line: number; column: number } } | null): void {
        if (span) {
            this.breakpoints.delete(`${span.start.line}:${span.start.column}`);
        }
    }

    hasBreakpoint(span: { start: { line: number; column: number }; end: { line: number; column: number } } | null): boolean {
        const result = !!(span && this.breakpoints.has(`${span.start.line}:${span.start.column}`));
        console.log(`Checking breakpoint at ${span?.start.line}:${span?.start.column} - Found: ${result}`, Array.from(this.breakpoints));
        return result;
    }

    shouldPause({ node }: { node: { span?: { start: { line: number; column: number }; end: { line: number; column: number } } }; nodeDepth: number }): boolean {
        // If we're skipping the next pause (e.g., during resume), don't pause
        if (this.skipNextPause) {
            this.skipNextPause = false;
            return false;
        }

        const hasBreakpoint = this.hasBreakpoint(node.span || null);
        const shouldPauseResult = hasBreakpoint || this.stepMode === StepMode.IN;

        console.log(`shouldPause: ${shouldPauseResult} (breakpoint: ${hasBreakpoint}, mode: ${this.stepMode})`);
        return shouldPauseResult;
    }

    // Pause execution and update persistent UI
    async before(ctx: DebuggerContext): Promise<void> {
        if (!this.debugPanel) return;
        if (!this.shouldPause(ctx)) return;

        // Store current context for locals/backtrace access
        this.currentContext = ctx;

        // Set paused state
        this.isPausedState = true;

        // Update panel with current execution context
        this.updateExecutionContext(ctx);

        // Determine pause reason and update status
        if (this.hasBreakpoint(ctx.node.span || null)) {
            this.updateDebugStatus('Paused at breakpoint');
        } else if (this.stepMode === StepMode.IN) {
            this.updateDebugStatus('Paused (step mode)');
        }

        // Always return immediately - let interpreter handle the pause
        return;
    }

    /**
     * Update the persistent panel with current execution context
     */
    private updateExecutionContext(ctx: DebuggerContext): void {
        const spanInfo = ctx.node.span
            ? `Line ${ctx.node.span.start.line}, Col ${ctx.node.span.start.column}`
            : 'Unknown location';

        this.updateDebugStatus(`Paused at ${spanInfo}`);

        // Update the status section
        const statusSection = this.debugPanel?.querySelector('div');
        if (statusSection) {
            statusSection.innerHTML = `
                <strong>Location:</strong> ${spanInfo}<br>
                <strong>Depth:</strong> ${ctx.nodeDepth}<br>
                <strong>Frame:</strong> ${ctx.frame.name}<br>
                <strong>Mode:</strong> <span id="debug-mode">${this.stepMode}</span>
            `;
        }

        // Ensure buttons reflect current state
        this.updateButtonStates();
    }

    /**
     * Check if execution is currently paused
     */
    isPaused(): boolean {
        return this.isPausedState || this.stepMode !== StepMode.RUN;
    }

    /**
     * Get current step mode
     */
    get currentStepMode(): StepModeType {
        return this.stepMode;
    }

    /**
     * Reset debugger to run mode (unpause)
     */
    resume(): void {
        this.stepMode = StepMode.RUN;
        this.isPausedState = false;
        this.skipNextPause = true; // Skip the current breakpoint when resuming
        this.updateDebugStatus('Running');
    }

    /**
     * Set debugger to step mode (will pause at next statement)
     */
    setStepMode(): void {
        this.stepMode = StepMode.IN;
        this.isPausedState = true; // Step mode means paused until next execution
        this.updateDebugStatus('Step Mode');
    }

    /**
     * Set callback for when Continue button is clicked
     */
    setOnContinueCallback(callback: () => void): void {
        this.onContinueCallback = callback;
    }

    /**
     * Set callback for when Step button is clicked
     */
    setOnStepCallback(callback: () => void): void {
        this.onStepCallback = callback;
    }

    /**
     * Print current local variables
     */
    printLocals(): void {
        if (!this.currentContext) {
            this.logToDebugOutput('No execution context available');
            return;
        }

        const frame = this.currentContext.frame;
        let output = '<div><strong>Local Variables:</strong><br>';

        if (Object.keys(frame.locals).length === 0) {
            output += '&nbsp;&nbsp;(no local variables)<br>';
        } else {
            Object.entries(frame.locals).forEach(([key, value]) => {
                output += `&nbsp;&nbsp;$${key} = ${JSON.stringify(value)}<br>`;
            });
        }

        output += '</div>';
        this.logToDebugOutput(output);
    }

    /**
     * Print call stack backtrace
     */
    printBacktrace(): void {
        if (!this.currentContext) {
            this.logToDebugOutput('No execution context available');
            return;
        }

        let output = '<div><strong>Call Stack:</strong><br>';
        let frameNum = 0;
        let currentFrame: Frame | null = this.currentContext.frame;

        while (currentFrame) {
            const localVars = Object.keys(currentFrame.locals).length > 0
                ? ` (locals: ${Object.keys(currentFrame.locals).map(k => `$${k}`).join(', ')})`
                : ' (no locals)';

            output += `&nbsp;&nbsp;#${frameNum} ${currentFrame.name}${localVars}<br>`;
            currentFrame = currentFrame.parent;
            frameNum++;
        }

        output += '</div>';
        this.logToDebugOutput(output);
    }

    async onException(ctx: DebuggerContext, err: Error): Promise<void> {
        if (!this.debugPanel) throw err;
        const spanStr = ctx.node.span
            ? `${ctx.node.span.start.line},${ctx.node.span.start.column}`
            : "<unknown>";
        this.logToDebugOutput(`Exception at ${spanStr}: ${err.message}`);
        await this.before(ctx);
        throw err;
    }
}

export { Debugger, Frame, StepMode };
export const dbg = new Debugger();

// Enable web UI by default in browser environment
if (typeof window !== 'undefined') {
    dbg.enableWebUI();
}
