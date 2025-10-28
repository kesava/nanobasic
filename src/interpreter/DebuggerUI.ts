import type { Breakpoint, SourceLocation } from './BreakpointManager';

/**
 * @deprecated This DebuggerUI class is deprecated in favor of the React-based DebuggerPanel component.
 * Most methods in this class are no longer used and exist only for backward compatibility.
 */

interface DebuggerState {
    status: string;
    mode: string;
    location?: string;
    depth?: number;
    frameName?: string;
    isPaused: boolean;
}

interface DebuggerUICallbacks {
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

class DebuggerUI {
    private panel: HTMLElement | null = null;
    private callbacks: DebuggerUICallbacks | null = null;
    private currentState: DebuggerState = {
        status: 'Ready',
        mode: 'run',
        isPaused: false
    };

    constructor() {
        this.initializePanel();
    }

    /**
     * Set callback functions for UI interactions
     */
    setCallbacks(callbacks: DebuggerUICallbacks): void {
        this.callbacks = callbacks;
    }

    /**
     * Update the debugger state and refresh UI
     */
    updateState(state: Partial<DebuggerState>): void {
        this.currentState = { ...this.currentState, ...state };
        this.refreshStatusDisplay();
        this.updateButtonStates();
    }

    /**
     * Log a message to the debug output panel
     */
    logMessage(message: string): void {
        const output = document.getElementById('debug-output');
        if (output) {
            output.innerHTML += `<div>${message}</div>`;
            output.scrollTop = output.scrollHeight;
        }
    }

    /**
     * Update the breakpoint list display
     */
    updateBreakpoints(breakpoints: Breakpoint[], stats: DebuggerStats): void {
        const listElement = document.getElementById('breakpoint-list');
        if (!listElement) return;

        let html = `<div style="margin-bottom: 10px; font-weight: bold;">Breakpoints (${stats.total}, ${stats.enabled} enabled)</div>`;

        if (breakpoints.length === 0) {
            html += '<div style="color: #666; font-style: italic;">No breakpoints set</div>';
        } else {
            breakpoints.forEach(bp => {
                const statusIcon = bp.enabled ? '🔴' : '⚪';
                const conditionText = bp.condition ? ` [${bp.condition.expression}]` : '';
                const hitText = bp.hitCount > 0 ? ` (${bp.hitCount} hits)` : '';
                
                html += `
                    <div style="display: flex; align-items: center; margin-bottom: 5px; padding: 3px; border: 1px solid #ddd; border-radius: 3px;">
                        <span style="margin-right: 5px;">${statusIcon}</span>
                        <span style="flex: 1;">Line ${bp.location.line}:${bp.location.column}${conditionText}${hitText}</span>
                        <button data-action="toggle-bp" data-line="${bp.location.line}" data-column="${bp.location.column}" 
                                style="font-size: 10px; padding: 2px 4px; margin-left: 5px;">Toggle</button>
                        <button data-action="remove-bp" data-line="${bp.location.line}" data-column="${bp.location.column}" 
                                style="font-size: 10px; padding: 2px 4px; margin-left: 2px;">Remove</button>
                    </div>
                `;
            });
        }

        listElement.innerHTML = html;
        this.attachBreakpointListeners();
    }

    /**
     * Show/hide the debug panel (deprecated - now using React component)
     */
    setVisible(visible: boolean): void {
        // This method is deprecated - visibility is now managed by React
        console.warn('DebuggerUI.setVisible is deprecated. Use React DebuggerPanel visibility prop instead.');
    }

    /**
     * Toggle breakpoint panel visibility (deprecated - now using React component)
     */
    toggleBreakpointPanel(): void {
        // This method is deprecated - breakpoint panel is now managed by React
        console.warn('DebuggerUI.toggleBreakpointPanel is deprecated. Use React DebuggerPanel instead.');
    }

    /**
     * Initialize the persistent debug panel (deprecated - now using React component)
     */
    private initializePanel(): void {
        // This method is deprecated and no longer used
        // The debugger panel is now handled by the React DebuggerPanel component
        return;
    }

    /**
     * Create the HTML content for the debug panel (deprecated - now using React component)
     */
    private createPanelContent(): void {
        // This method is deprecated and no longer used
        // The debugger panel is now handled by the React DebuggerPanel component
        return;
    }

    /**
     * Ensure viewport meta tag is present for responsive design
     */
    private ensureViewportMeta(): void {
        if (typeof document === 'undefined') return;
        
        const existingViewport = document.querySelector('meta[name="viewport"]');
        if (!existingViewport) {
            const viewport = document.createElement('meta');
            viewport.name = 'viewport';
            viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=yes';
            document.head.appendChild(viewport);
        }
    }

    /**
     * Get responsive CSS styles
     */
    private getResponsiveStyles(): string {
        return `
            <style>
                /* Base styles */
                .debugger-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: clamp(10px, 2vh, 15px);
                    padding-bottom: 8px;
                    border-bottom: 1px solid #ddd;
                }
                
                .debugger-title {
                    margin: 0;
                    color: #333;
                    font-size: clamp(14px, 4vw, 16px);
                    font-weight: 600;
                }
                
                .minimize-btn {
                    background: #ff5f56;
                    border: none;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    color: white;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                
                .minimize-btn:hover {
                    background: #e64946;
                    transform: scale(1.1);
                }
                
                .status-section {
                    margin-bottom: clamp(10px, 2vh, 15px);
                    padding: clamp(8px, 2vw, 12px);
                    background: #fff;
                    border-radius: 6px;
                    border: 1px solid #e0e0e0;
                }
                
                .status-grid {
                    display: grid;
                    gap: 4px;
                    font-size: clamp(11px, 2.5vw, 13px);
                }
                
                /* Control buttons */
                .control-buttons {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: clamp(6px, 1.5vw, 10px);
                    margin-bottom: clamp(10px, 2vh, 15px);
                }
                
                .debug-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: clamp(4px, 1vw, 8px);
                    padding: clamp(8px, 2vw, 12px);
                    cursor: pointer;
                    border: 1px solid #ccc;
                    border-radius: 6px;
                    transition: all 0.2s;
                    font-size: clamp(11px, 2.5vw, 13px);
                    font-family: inherit;
                    min-height: 36px;
                    touch-action: manipulation;
                    user-select: none;
                    -webkit-user-select: none;
                }
                
                .debug-btn.primary {
                    background: #4CAF50;
                    color: white;
                    border-color: #45a049;
                    font-weight: 500;
                }
                
                .debug-btn.secondary {
                    background: #f9f9f9;
                    color: #333;
                    border-color: #ccc;
                }
                
                .debug-btn.danger {
                    background: #f44336;
                    color: white;
                    border-color: #d32f2f;
                }
                
                .debug-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                }
                
                .debug-btn.primary:hover {
                    background: #45a049;
                }
                
                .debug-btn.secondary:hover {
                    background: #e0e0e0;
                    border-color: #999;
                }
                
                .debug-btn.danger:hover {
                    background: #d32f2f;
                }
                
                .debug-btn.active {
                    background: #2196F3;
                    color: white;
                    border-color: #1976D2;
                    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
                }
                
                .debug-btn.active:hover {
                    background: #1976D2;
                }
                
                /* Breakpoint panel */
                .breakpoint-panel {
                    background: #f9f9f9;
                    border: 1px solid #e0e0e0;
                    border-radius: 6px;
                    padding: clamp(10px, 2vw, 15px);
                    margin-bottom: clamp(10px, 2vh, 15px);
                }
                
                .form-label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                    font-size: clamp(11px, 2.5vw, 13px);
                    color: #333;
                }
                
                .form-row {
                    display: grid;
                    grid-template-columns: auto 1fr auto;
                    gap: clamp(4px, 1vw, 8px);
                    margin-bottom: 12px;
                    align-items: stretch;
                }
                
                .line-input {
                    width: clamp(50px, 15vw, 70px);
                    padding: clamp(6px, 1.5vw, 8px);
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    font-size: clamp(11px, 2.5vw, 13px);
                    font-family: inherit;
                }
                
                .condition-input {
                    padding: clamp(6px, 1.5vw, 8px);
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    font-size: clamp(11px, 2.5vw, 13px);
                    font-family: inherit;
                    min-width: 0;
                }
                
                .add-btn {
                    white-space: nowrap;
                    padding: clamp(6px, 1.5vw, 8px) clamp(12px, 3vw, 16px);
                }
                
                .breakpoint-actions {
                    display: flex;
                    gap: clamp(6px, 1.5vw, 10px);
                    margin-bottom: 12px;
                    flex-wrap: wrap;
                }
                
                .breakpoint-actions .debug-btn {
                    flex: 1;
                    min-width: 0;
                }
                
                .breakpoint-list {
                    max-height: clamp(120px, 25vh, 180px);
                    overflow-y: auto;
                    font-size: clamp(10px, 2vw, 12px);
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    background: #fff;
                    padding: 6px;
                }
                
                /* Debug output */
                .debug-output {
                    background: #fff;
                    border: 1px solid #e0e0e0;
                    border-radius: 6px;
                    padding: clamp(8px, 2vw, 12px);
                    max-height: clamp(150px, 30vh, 250px);
                    overflow-y: auto;
                    font-size: clamp(10px, 2vw, 12px);
                    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                    line-height: 1.4;
                }
                
                /* Responsive breakpoints */
                @media (max-width: 480px) {
                    .control-buttons {
                        grid-template-columns: 1fr;
                        gap: 8px;
                    }
                    
                    .btn-text {
                        display: none;
                    }
                    
                    .debug-btn {
                        justify-content: center;
                        min-height: 42px;
                        font-size: 16px;
                    }
                    
                    .form-row {
                        grid-template-columns: 1fr;
                        gap: 8px;
                    }
                    
                    .breakpoint-actions {
                        flex-direction: column;
                        gap: 8px;
                    }
                    
                    .status-grid {
                        font-size: 12px;
                    }
                }
                
                @media (max-width: 320px) {
                    .debugger-title {
                        font-size: 14px;
                    }
                    
                    .debug-btn {
                        min-height: 44px;
                        padding: 10px 8px;
                    }
                    
                    .status-section {
                        padding: 8px;
                    }
                }
                
                @media (min-width: 768px) {
                    .control-buttons {
                        grid-template-columns: repeat(3, 1fr);
                    }
                    
                    .btn-text {
                        display: inline;
                    }
                }
                
                @media (min-width: 1024px) {
                    .control-buttons {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 12px;
                    }
                    
                    .debug-btn {
                        padding: 12px 16px;
                    }
                }
                
                /* Touch optimizations */
                @media (hover: none) and (pointer: coarse) {
                    .debug-btn {
                        min-height: 44px;
                        padding: 12px;
                    }
                    
                    .minimize-btn {
                        width: 24px;
                        height: 24px;
                        font-size: 14px;
                    }
                }
                
                /* High contrast mode support */
                @media (prefers-contrast: high) {
                    .debug-btn {
                        border-width: 2px;
                    }
                    
                    .status-section,
                    .breakpoint-panel,
                    .debug-output {
                        border-width: 2px;
                    }
                }
                
                /* Reduced motion support */
                @media (prefers-reduced-motion: reduce) {
                    .debug-btn,
                    .minimize-btn {
                        transition: none;
                    }
                }
                
                /* Dark mode support */
                @media (prefers-color-scheme: dark) {
                    .debugger-header {
                        border-bottom-color: #555;
                    }
                    
                    .debugger-title {
                        color: #f0f0f0;
                    }
                    
                    .status-section,
                    .debug-output {
                        background: #2d2d2d;
                        border-color: #555;
                        color: #f0f0f0;
                    }
                    
                    .breakpoint-panel {
                        background: #333;
                        border-color: #555;
                    }
                    
                    .debug-btn.secondary {
                        background: #444;
                        color: #f0f0f0;
                        border-color: #666;
                    }
                    
                    .debug-btn.secondary:hover {
                        background: #555;
                    }
                    
                    .line-input,
                    .condition-input {
                        background: #2d2d2d;
                        color: #f0f0f0;
                        border-color: #555;
                    }
                }
            </style>
        `;
    }

    /**
     * Attach event listeners to UI controls (deprecated - now using React component)
     */
    private attachEventListeners(): void {
        // This method is deprecated and no longer used
        // The debugger panel is now handled by the React DebuggerPanel component
        return;
    }

    /**
     * Attach listeners for dynamically created breakpoint list buttons
     */
    private attachBreakpointListeners(): void {
        document.querySelectorAll('[data-action="toggle-bp"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const line = parseInt(target.dataset.line || '0');
                const column = parseInt(target.dataset.column || '0');
                this.callbacks?.onToggleBreakpoint({ line, column });
            });
        });

        document.querySelectorAll('[data-action="remove-bp"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const line = parseInt(target.dataset.line || '0');
                const column = parseInt(target.dataset.column || '0');
                this.callbacks?.onRemoveBreakpoint({ line, column });
            });
        });
    }

    /**
     * Update the status display section
     */
    private refreshStatusDisplay(): void {
        const statusElement = document.getElementById('debug-status');
        const modeElement = document.getElementById('debug-mode');
        const statusSection = document.getElementById('debug-status-section');
        
        if (statusElement) statusElement.textContent = this.currentState.status;
        if (modeElement) modeElement.textContent = this.currentState.mode;

        if (statusSection && this.currentState.location) {
            statusSection.innerHTML = `
                <strong>Location:</strong> ${this.currentState.location}<br>
                <strong>Depth:</strong> ${this.currentState.depth || 0}<br>
                <strong>Frame:</strong> ${this.currentState.frameName || 'unknown'}<br>
                <strong>Mode:</strong> <span id="debug-mode">${this.currentState.mode}</span>
            `;
        }
    }

    /**
     * Update button active states based on current mode
     */
    private updateButtonStates(): void {
        const allButtons = document.querySelectorAll('.debug-btn[data-mode]');
        allButtons.forEach(btn => btn.classList.remove('active'));

        const currentModeBtn = document.querySelector(`[data-mode="${this.currentState.mode}"]`);
        if (currentModeBtn) {
            currentModeBtn.classList.add('active');
        }
    }

    /**
     * Handle adding conditional breakpoint from UI inputs
     */
    private handleAddConditionalBreakpoint(): void {
        const lineInput = document.getElementById('bp-line') as HTMLInputElement;
        const conditionInput = document.getElementById('bp-condition') as HTMLInputElement;
        
        const line = parseInt(lineInput.value);
        const condition = conditionInput.value.trim();
        
        if (isNaN(line) || line <= 0) {
            this.logMessage('Please enter a valid line number');
            return;
        }
        
        this.callbacks?.onAddConditionalBreakpoint(line, condition);
        
        // Clear inputs
        lineInput.value = '';
        conditionInput.value = '';
    }

    /**
     * Handle exporting breakpoints to file
     */
    private handleExportBreakpoints(): void {
        try {
            const jsonData = this.callbacks?.onExportBreakpoints();
            if (!jsonData) return;

            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `nanobasic-breakpoints-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.logMessage('Breakpoints exported successfully');
        } catch (err) {
            this.logMessage(`Export failed: ${err}`);
        }
    }

    /**
     * Handle importing breakpoints from file
     */
    private handleImportBreakpoints(file: File): void {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = e.target?.result as string;
                const result = this.callbacks?.onImportBreakpoints(jsonData);
                
                if (result?.success) {
                    this.logMessage(`Successfully imported ${result.imported} breakpoints`);
                } else if (result) {
                    this.logMessage(`Import completed with errors: ${result.errors.join(', ')}. Imported: ${result.imported}`);
                }
            } catch (err) {
                this.logMessage(`Import failed: ${err}`);
            }
        };
        reader.readAsText(file);
    }

    /**
     * Minimize/expand the debug panel
     */
    private minimizePanel(): void {
        if (!this.panel) return;
        
        const isMinimized = this.panel.dataset.minimized === 'true';
        
        if (isMinimized) {
            // Expand
            this.panel.style.height = '';
            this.panel.style.overflow = '';
            this.panel.dataset.minimized = 'false';
            
            // Show all content
            const content = this.panel.querySelectorAll('.status-section, .control-buttons, .breakpoint-panel, .debug-output');
            content.forEach(el => {
                (el as HTMLElement).style.display = '';
            });
            
            // Update minimize button
            const minBtn = document.getElementById('btn-minimize');
            if (minBtn) minBtn.textContent = '−';
        } else {
            // Minimize
            this.panel.style.height = '50px';
            this.panel.style.overflow = 'hidden';
            this.panel.dataset.minimized = 'true';
            
            // Hide all content except header
            const content = this.panel.querySelectorAll('.status-section, .control-buttons, .breakpoint-panel, .debug-output');
            content.forEach(el => {
                (el as HTMLElement).style.display = 'none';
            });
            
            // Update minimize button
            const minBtn = document.getElementById('btn-minimize');
            if (minBtn) minBtn.textContent = '+';
        }
    }

    /**
     * Add keyboard shortcuts for accessibility and power users
     */
    private addKeyboardShortcuts(): void {
        if (typeof document === 'undefined') return;
        
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when debugger is active
            if (!this.panel || this.panel.style.display === 'none') return;
            
            // Check if we're in an input field
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
            
            // Handle shortcuts with Ctrl/Cmd + key
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'enter':
                    case 'r':
                        e.preventDefault();
                        this.callbacks?.onContinue();
                        break;
                    case 's':
                        e.preventDefault();
                        this.callbacks?.onStep();
                        break;
                    case 'l':
                        e.preventDefault();
                        this.callbacks?.onPrintLocals();
                        break;
                    case 'b':
                        e.preventDefault();
                        this.toggleBreakpointPanel();
                        break;
                    case 'm':
                        e.preventDefault();
                        this.minimizePanel();
                        break;
                }
            }
            
            // Handle F-key shortcuts
            switch (e.key) {
                case 'F5':
                    e.preventDefault();
                    this.callbacks?.onContinue();
                    break;
                case 'F10':
                    e.preventDefault();
                    this.callbacks?.onStep();
                    break;
                case 'F9':
                    e.preventDefault();
                    this.toggleBreakpointPanel();
                    break;
            }
        });
    }

    /**
     * Add touch gesture support for mobile devices
     */
    private addTouchGestures(): void {
        if (!this.panel || typeof window === 'undefined') return;
        
        let startY = 0;
        let startHeight = 0;
        let isResizing = false;
        
        // Add resize handle for mobile
        const resizeHandle = document.createElement('div');
        resizeHandle.style.cssText = `
            position: absolute;
            top: -5px;
            left: 50%;
            transform: translateX(-50%);
            width: 40px;
            height: 10px;
            background: #ccc;
            border-radius: 5px;
            cursor: ns-resize;
            touch-action: none;
            z-index: 1001;
        `;
        
        // Only show handle on touch devices
        if ('ontouchstart' in window) {
            this.panel.appendChild(resizeHandle);
            this.panel.style.position = 'relative';
        }
        
        // Touch events for resizing
        resizeHandle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            isResizing = true;
            startY = e.touches[0].clientY;
            startHeight = this.panel!.offsetHeight;
            
            resizeHandle.style.background = '#999';
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!isResizing || !this.panel) return;
            
            e.preventDefault();
            const currentY = e.touches[0].clientY;
            const deltaY = startY - currentY;
            const newHeight = Math.min(Math.max(startHeight + deltaY, 100), window.innerHeight - 40);
            
            this.panel.style.height = `${newHeight}px`;
        });
        
        document.addEventListener('touchend', () => {
            if (isResizing) {
                isResizing = false;
                resizeHandle.style.background = '#ccc';
            }
        });
        
        // Double-tap to minimize/expand
        let lastTap = 0;
        this.panel.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 500 && tapLength > 0) {
                e.preventDefault();
                this.minimizePanel();
            }
            
            lastTap = currentTime;
        });
        
        // Swipe gestures for common actions
        let startX = 0;
        let startTouchY = 0;
        
        this.panel.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startTouchY = e.touches[0].clientY;
        });
        
        this.panel.addEventListener('touchend', (e) => {
            if (!e.changedTouches[0]) return;
            
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const deltaX = endX - startX;
            const deltaY = endY - startTouchY;
            
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                e.preventDefault();
                
                if (deltaX > 0) {
                    this.callbacks?.onContinue();
                    this.showSwipeIndicator('Continue ▶️');
                } else {
                    this.callbacks?.onStep();
                    this.showSwipeIndicator('Step ⬇️');
                }
            }
        });
    }

    /**
     * Show visual feedback for swipe gestures
     */
    private showSwipeIndicator(text: string): void {
        if (!this.panel) return;
        
        const indicator = document.createElement('div');
        indicator.textContent = text;
        indicator.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 1002;
            pointer-events: none;
            animation: swipeIndicator 0.6s ease-out;
        `;
        
        if (!document.querySelector('#swipe-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'swipe-animation-styles';
            style.textContent = `
                @keyframes swipeIndicator {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                    50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(1.1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        this.panel.appendChild(indicator);
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 600);
    }
}

export { DebuggerUI };
export type { DebuggerState, DebuggerUICallbacks, DebuggerStats };