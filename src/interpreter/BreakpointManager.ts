interface SourceLocation {
    line: number;
    column: number;
}

interface BreakpointCondition {
    expression: string;
    type: 'expression' | 'hitCount' | 'logMessage';
}

interface Breakpoint {
    id: string;
    location: SourceLocation;
    enabled: boolean;
    condition?: BreakpointCondition;
    hitCount: number;
    createdAt: Date;
    lastHit?: Date;
    logMessage?: string;
}

interface BreakpointHit {
    breakpoint: Breakpoint;
    context: any;
    timestamp: Date;
}

type BreakpointEventType = 'added' | 'removed' | 'toggled' | 'hit' | 'conditionChanged';

interface BreakpointEvent {
    type: BreakpointEventType;
    breakpoint: Breakpoint;
    context?: any;
}

type BreakpointEventListener = (event: BreakpointEvent) => void;

class BreakpointManager {
    private breakpoints: Map<string, Breakpoint> = new Map();
    private listeners: BreakpointEventListener[] = [];
    private nextId = 1;

    /**
     * Add a new breakpoint at the specified location
     */
    addBreakpoint(
        location: SourceLocation, 
        options: {
            enabled?: boolean;
            condition?: BreakpointCondition;
            logMessage?: string;
        } = {}
    ): Breakpoint {
        const id = this.generateId();
        const breakpoint: Breakpoint = {
            id,
            location,
            enabled: options.enabled ?? true,
            condition: options.condition,
            hitCount: 0,
            createdAt: new Date(),
            logMessage: options.logMessage
        };

        this.breakpoints.set(id, breakpoint);
        this.notifyListeners({
            type: 'added',
            breakpoint
        });

        return breakpoint;
    }

    /**
     * Remove a breakpoint by ID
     */
    removeBreakpoint(id: string): boolean {
        const breakpoint = this.breakpoints.get(id);
        if (!breakpoint) return false;

        this.breakpoints.delete(id);
        this.notifyListeners({
            type: 'removed',
            breakpoint
        });

        return true;
    }

    /**
     * Remove breakpoint by location
     */
    removeBreakpointAt(location: SourceLocation): boolean {
        const breakpoint = this.findBreakpointAt(location);
        if (!breakpoint) return false;

        return this.removeBreakpoint(breakpoint.id);
    }

    /**
     * Toggle breakpoint enabled/disabled state
     */
    toggleBreakpoint(id: string): boolean {
        const breakpoint = this.breakpoints.get(id);
        if (!breakpoint) return false;

        breakpoint.enabled = !breakpoint.enabled;
        this.notifyListeners({
            type: 'toggled',
            breakpoint
        });

        return true;
    }

    /**
     * Update breakpoint condition
     */
    setBreakpointCondition(id: string, condition: BreakpointCondition | undefined): boolean {
        const breakpoint = this.breakpoints.get(id);
        if (!breakpoint) return false;

        breakpoint.condition = condition;
        this.notifyListeners({
            type: 'conditionChanged',
            breakpoint
        });

        return true;
    }

    /**
     * Check if there's a breakpoint at the given location
     */
    hasBreakpointAt(location: SourceLocation): boolean {
        return this.findBreakpointAt(location) !== null;
    }

    /**
     * Find breakpoint at specific location
     */
    findBreakpointAt(location: SourceLocation): Breakpoint | null {
        const breakpoints = Array.from(this.breakpoints.values());
        for (const breakpoint of breakpoints) {
            if (this.locationsMatch(breakpoint.location, location)) {
                return breakpoint;
            }
        }
        return null;
    }

    /**
     * Get breakpoint by ID
     */
    getBreakpoint(id: string): Breakpoint | undefined {
        return this.breakpoints.get(id);
    }

    /**
     * Get all breakpoints
     */
    getAllBreakpoints(): Breakpoint[] {
        return Array.from(this.breakpoints.values());
    }

    /**
     * Get enabled breakpoints only
     */
    getEnabledBreakpoints(): Breakpoint[] {
        return this.getAllBreakpoints().filter(bp => bp.enabled);
    }

    /**
     * Clear all breakpoints
     */
    clearAll(): void {
        const breakpoints = Array.from(this.breakpoints.values());
        this.breakpoints.clear();
        
        breakpoints.forEach(breakpoint => {
            this.notifyListeners({
                type: 'removed',
                breakpoint
            });
        });
    }

    /**
     * Check if execution should pause at this location
     */
    async shouldPauseAt(location: SourceLocation, context: any): Promise<BreakpointHit | null> {
        const breakpoint = this.findBreakpointAt(location);
        if (!breakpoint || !breakpoint.enabled) {
            return null;
        }

        // Increment hit count
        breakpoint.hitCount++;
        breakpoint.lastHit = new Date();

        // Check condition if present
        if (breakpoint.condition) {
            const shouldPause = await this.evaluateCondition(breakpoint.condition, context);
            if (!shouldPause) {
                return null;
            }
        }

        const hit: BreakpointHit = {
            breakpoint,
            context,
            timestamp: new Date()
        };

        this.notifyListeners({
            type: 'hit',
            breakpoint,
            context
        });

        return hit;
    }

    /**
     * Export breakpoints to JSON
     */
    exportBreakpoints(): string {
        const exportData = {
            version: '1.0',
            breakpoints: this.getAllBreakpoints().map(bp => ({
                location: bp.location,
                enabled: bp.enabled,
                condition: bp.condition,
                logMessage: bp.logMessage
            })),
            exportedAt: new Date().toISOString()
        };
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import breakpoints from JSON
     */
    importBreakpoints(jsonData: string): { success: boolean; imported: number; errors: string[] } {
        const errors: string[] = [];
        let imported = 0;

        try {
            const data = JSON.parse(jsonData);
            
            if (!data.breakpoints || !Array.isArray(data.breakpoints)) {
                return { success: false, imported: 0, errors: ['Invalid breakpoint data format'] };
            }

            for (const bpData of data.breakpoints) {
                try {
                    if (!bpData.location || typeof bpData.location.line !== 'number') {
                        errors.push('Invalid breakpoint location');
                        continue;
                    }

                    this.addBreakpoint(bpData.location, {
                        enabled: bpData.enabled,
                        condition: bpData.condition,
                        logMessage: bpData.logMessage
                    });
                    imported++;
                } catch (err) {
                    errors.push(`Failed to import breakpoint: ${err}`);
                }
            }

            return { success: errors.length === 0, imported, errors };
        } catch (err) {
            return { success: false, imported: 0, errors: [`Parse error: ${err}`] };
        }
    }

    /**
     * Add event listener for breakpoint changes
     */
    addEventListener(listener: BreakpointEventListener): void {
        this.listeners.push(listener);
    }

    /**
     * Remove event listener
     */
    removeEventListener(listener: BreakpointEventListener): void {
        const index = this.listeners.indexOf(listener);
        if (index >= 0) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Get breakpoint statistics
     */
    getStatistics(): {
        total: number;
        enabled: number;
        disabled: number;
        withConditions: number;
        totalHits: number;
    } {
        const breakpoints = this.getAllBreakpoints();
        return {
            total: breakpoints.length,
            enabled: breakpoints.filter(bp => bp.enabled).length,
            disabled: breakpoints.filter(bp => !bp.enabled).length,
            withConditions: breakpoints.filter(bp => bp.condition).length,
            totalHits: breakpoints.reduce((sum, bp) => sum + bp.hitCount, 0)
        };
    }

    private generateId(): string {
        return `bp_${this.nextId++}_${Date.now()}`;
    }

    private locationsMatch(loc1: SourceLocation, loc2: SourceLocation): boolean {
        return loc1.line === loc2.line && loc1.column === loc2.column;
    }

    private async evaluateCondition(condition: BreakpointCondition, context: any): Promise<boolean> {
        try {
            switch (condition.type) {
                case 'expression':
                    return this.evaluateExpression(condition.expression, context);
                
                case 'hitCount':
                    const targetHits = parseInt(condition.expression);
                    const breakpoint = this.findBreakpointAt(context.location);
                    return breakpoint ? breakpoint.hitCount >= targetHits : false;
                
                case 'logMessage':
                    console.log(`Breakpoint log: ${condition.expression}`, context);
                    return false; // Log messages don't pause execution
                
                default:
                    return true;
            }
        } catch (err) {
            console.warn(`Breakpoint condition evaluation failed: ${err}`);
            return true; // Default to pausing on error
        }
    }

    private evaluateExpression(expression: string, context: any): boolean {
        try {
            // Simple expression evaluator for variables
            // In a real implementation, you'd want a proper expression parser
            if (expression.includes('=')) {
                const [varName, expectedValue] = expression.split('=').map(s => s.trim());
                const actualValue = context.frame?.locals[varName.replace('$', '')] || 
                                 context.env?.vars[varName.replace('$', '')];
                return actualValue?.toString() === expectedValue;
            }
            
            // For now, just return true for any other expression
            return true;
        } catch (err) {
            console.warn(`Expression evaluation failed: ${err}`);
            return true;
        }
    }

    private notifyListeners(event: BreakpointEvent): void {
        this.listeners.forEach(listener => {
            try {
                listener(event);
            } catch (err) {
                console.error('Breakpoint event listener error:', err);
            }
        });
    }
}

export { BreakpointManager };
export type { 
    Breakpoint, 
    BreakpointCondition, 
    BreakpointHit, 
    BreakpointEvent, 
    BreakpointEventListener,
    SourceLocation 
};