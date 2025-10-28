import { AssignmentStatementNode, AST, GotoNode, IfStatementNode, PrintStatementNode } from "./ast";
import { Debugger, Frame } from "./Debugger";

export class Interpreter {
    private output: string = '';
    private env: any = {};
    private dbg: Debugger;
    private currentFrame: Frame;
    private nodeDepth: number = 0;
    private currentAst: AST | null = null;
    private currentLineIndex: number = 0;
    private isExecuting: boolean = false;

    constructor(dbg: Debugger) {
        this.env.lines = {};
        this.env.vars = {};
        this.dbg = dbg;
        this.currentFrame = new Frame({
            name: "<main>",
            locals: {},
            parent: null,
            callDepth: 0
        });
    }

    async executeLine(line: any): Promise<any> {
        // Debug before executing line
        console.log('Executing line with span:', line.span, 'AST line:', line.span?.start?.line);
        await this.dbg.before({
            node: line,
            nodeDepth: this.nodeDepth,
            frame: this.currentFrame
        });

        // Check if debugger paused during the before() call
        if (this.dbg.isPaused()) {
            console.log('Debugger paused during executeLine - returning early');
            // Return without executing the line - it will be executed on resume
            return {
                output: this.output,
                env: this.env
            };
        }

        if (line.type !== 'STATEMENT') {
            this.output += `Unsupported AST node type: ${line.type}\n`;
            return {
                output: this.output,
                env: this.env
            };
        } else {
            const lineNumber = (line as any).lineNumber?.value ?? '<unknown>';
            this.output += `${lineNumber}: `;
            const stmt = line.children?.[0];
            this.env.lines[lineNumber] = stmt;

            if (!stmt) {
                this.output += `Empty STATEMENT node encountered. (Malformed AST)<br/>\n`;
                return {
                    output: this.output,
                    env: this.env
                };
            }

            this.nodeDepth++;
            try {
                await this.executeStatement(stmt);
            } catch (error) {
                // Handle exceptions with debugger
                await this.dbg.onException({
                    node: stmt,
                    nodeDepth: this.nodeDepth,
                    frame: this.currentFrame
                }, error as Error);
            }
            this.nodeDepth--;
        }

        console.log({ output: this.output, env: this.env });
        return {
            output: this.output,
            env: this.env
        };
    }

    async run(ast: AST): Promise<any> {
        // If this is a new execution (not a resume), reset everything
        if (!this.isExecuting) {
            this.output = '';
            this.env.lines = {};
            this.env.vars = {};
            this.nodeDepth = 0;
            this.currentLineIndex = 0;
            this.currentAst = ast;

            // Reset frame and sync with env
            this.currentFrame = new Frame({
                name: "<main>",
                locals: this.env.vars,
                parent: null,
                callDepth: 0
            });
        }

        this.isExecuting = true;
        
        // Start debugger execution tracking
        console.log('Starting debugger execution');
        this.dbg.startExecution();
        
        const { body } = this.currentAst!;

        // Continue execution from where we left off
        for (let i = this.currentLineIndex; i < body.length; i++) {
            this.currentLineIndex = i;
            console.log('Main loop executing line', i, 'isPaused before:', this.dbg.isPaused());
            await this.executeLine(body[i]);
            
            console.log('Main loop after executeLine, isPaused:', this.dbg.isPaused());
            // Check if debugger is paused and return partial results
            if (this.dbg.isPaused()) {
                console.log('MAIN LOOP DETECTED PAUSE - stopping execution');
                this.output += `<br/><em>Execution paused. Click Continue or Step to proceed.</em><br/>\n`;
                // DON'T increment currentLineIndex - we want to re-execute this line on resume
                return {
                    output: this.output,
                    env: this.env
                };
            }
        }

        // Execution completed
        this.isExecuting = false;
        this.currentAst = null;
        this.currentLineIndex = 0;
        
        return {
            output: this.output,
            env: this.env
        };
    }

    /**
     * Resume execution from where it was paused
     */
    async resume(): Promise<any> {
        if (!this.isExecuting || !this.currentAst) {
            throw new Error("No execution to resume");
        }
        
        console.log('Interpreter.resume() called - current line index:', this.currentLineIndex);
        
        // Remove the pause message from output
        this.output = this.output.replace(/<br\/><em>Execution paused.*?<br\/>\n$/, '');
        
        // Continue execution from where we left off - DON'T call startExecution again
        const { body } = this.currentAst!;

        // Move to NEXT line when resuming (we've already paused at current line)
        // Actually, DON'T skip the line - execute it but skip the pause
        // The resumeExecution() call should have set skipNextPause = true
        console.log('Resume: staying at current line index to execute it:', this.currentLineIndex);

        // Continue execution from the next line
        for (let i = this.currentLineIndex; i < body.length; i++) {
            this.currentLineIndex = i;
            console.log('Resume loop executing line', i, 'isPaused before:', this.dbg.isPaused());
            await this.executeLine(body[i]);
            
            console.log('Resume loop after executeLine, isPaused:', this.dbg.isPaused());
            // Check if debugger is paused and return partial results
            if (this.dbg.isPaused()) {
                console.log('RESUME LOOP DETECTED PAUSE - stopping execution');
                this.output += `<br/><em>Execution paused. Click Continue or Step to proceed.</em><br/>\n`;
                // DON'T increment currentLineIndex - we want to re-execute this line on next resume
                return {
                    output: this.output,
                    env: this.env
                };
            }
        }

        // Execution completed
        this.isExecuting = false;
        this.currentAst = null;
        this.currentLineIndex = 0;
        
        return {
            output: this.output,
            env: this.env
        };
    }

    /**
     * Execute just one line and then pause again
     */
    async step(): Promise<any> {
        if (!this.isExecuting || !this.currentAst) {
            throw new Error("No execution to step");
        }
        
        // Remove the pause message from output
        this.output = this.output.replace(/<br\/><em>Execution paused.*?<br\/>\n$/, '');
        
        const { body } = this.currentAst!;
        
        // Execute just the current line
        if (this.currentLineIndex < body.length) {
            // Temporarily set to RUN mode to execute the line
            this.dbg.resume();
            
            await this.executeLine(body[this.currentLineIndex]);
            
            // Move to next line
            this.currentLineIndex++;
            
            // Set back to step mode and pause
            this.dbg.setStepMode();
            
            // Check if we're at the end
            if (this.currentLineIndex >= body.length) {
                // Execution completed
                this.isExecuting = false;
                this.currentAst = null;
                this.currentLineIndex = 0;
                
                return {
                    output: this.output,
                    env: this.env
                };
            } else {
                // Paused at next line
                this.output += `<br/><em>Execution paused. Click Continue or Step to proceed.</em><br/>\n`;
                return {
                    output: this.output,
                    env: this.env
                };
            }
        }
        
        return {
            output: this.output,
            env: this.env
        };
    }

    /**
     * Check if execution is currently in progress
     */
    get executing(): boolean {
        return this.isExecuting;
    }

    private async executeStatement(stmt: any): Promise<void> {
        // Debug before executing statement
        await this.dbg.before({
            node: stmt,
            nodeDepth: this.nodeDepth,
            frame: this.currentFrame
        });

        switch (stmt.type) {
            case 'PRINT_STATEMENT':
                const toPrint = await this.executePrintStatement(stmt as PrintStatementNode);
                this.output += toPrint + '<br/>\n';
                break;
            case 'INPUT_STATEMENT':
                this.output += `INPUT statement encountered. (Input handling not implemented)<br/>\n`;
                break;
            case 'ASSIGNMENT_STATEMENT':
                const toAssignStr = await this.executeAssignmentStatement(stmt as AssignmentStatementNode);
                this.output += toAssignStr + '<br/>\n';
                break;
            case 'IF_STATEMENT':
                const ifStmtStr = await this.executeIfStatement(stmt as IfStatementNode);
                this.output += `${ifStmtStr}<br/>\n`;
                break;
            case 'GOTO_STATEMENT':
                this.output += `${await this.executeGotoStatement(stmt as GotoNode)}<br/>\n`;
                break;
            case 'END':
                this.output += `END statement encountered. Terminating execution.<br/>\n`;
                break;
            default:
                this.output += `Unsupported statement type: ${stmt.type}<br/>\n`;
        }
    }

    private async executePrintStatement(stmt: PrintStatementNode): Promise<string> {
        // Debug before executing print statement
        await this.dbg.before({
            node: stmt,
            nodeDepth: this.nodeDepth,
            frame: this.currentFrame
        });

        let outStr = '';
        if (stmt.children) {
            for (const child of stmt.children) {
                this.nodeDepth++;

                // Debug each print child
                await this.dbg.before({
                    node: child,
                    nodeDepth: this.nodeDepth,
                    frame: this.currentFrame
                });

                if (child.type === 'LITERAL') {
                    outStr += child.value;
                } else if (child.type === 'VARIABLE') {
                    const name = (child as any).name;
                    // Check frame locals first, then global env
                    const value = this.currentFrame.locals[name] ?? this.env.vars[name] ?? '<undefined>';
                    outStr += `${value}`;
                } else if (child.type === 'NUMBER') {
                    outStr += child.value;
                } else if (child.type === 'BINARY_EXPRESSION') {
                    const result = await this.executeBinaryExpression(child);
                    outStr += `${result}`;
                } else {
                    outStr += `<unknown>`;
                }
                this.nodeDepth--;
            }
        }
        return outStr;
    }

    private async executeBinaryExpression(expr: any): Promise<number> {
        // Debug before executing binary expression
        await this.dbg.before({
            node: expr,
            nodeDepth: this.nodeDepth,
            frame: this.currentFrame
        });

        const leftNode = expr.left;
        const rightNode = expr.right;
        const operator = expr.operator;

        let leftValue = 0;
        let rightValue = 0;

        this.nodeDepth++;

        // Debug and evaluate left operand
        await this.dbg.before({
            node: leftNode,
            nodeDepth: this.nodeDepth,
            frame: this.currentFrame
        });

        if (leftNode.type === 'NUMBER') {
            leftValue = parseFloat(leftNode.value);
        } else if (leftNode.type === 'VARIABLE') {
            const name = leftNode.name;
            leftValue = parseFloat(this.currentFrame.locals[name] ?? this.env.vars[name] ?? '0');
        } else if (leftNode.type === 'BINARY_EXPRESSION') {
            leftValue = await this.executeBinaryExpression(leftNode);
        }

        // Debug and evaluate right operand
        await this.dbg.before({
            node: rightNode,
            nodeDepth: this.nodeDepth,
            frame: this.currentFrame
        });

        if (rightNode.type === 'NUMBER') {
            rightValue = parseFloat(rightNode.value);
        } else if (rightNode.type === 'VARIABLE') {
            const name = rightNode.name;
            rightValue = parseFloat(this.currentFrame.locals[name] ?? this.env.vars[name] ?? '0');
        } else if (rightNode.type === 'BINARY_EXPRESSION') {
            rightValue = await this.executeBinaryExpression(rightNode);
        }

        this.nodeDepth--;

        switch (operator) {
            case '+': return leftValue + rightValue;
            case '-': return leftValue - rightValue;
            case '*': return leftValue * rightValue;
            case '/': return rightValue !== 0 ? leftValue / rightValue : 0;
            case '=': return leftValue === rightValue ? 1 : 0;
            case '<': return leftValue < rightValue ? 1 : 0;
            case '>': return leftValue > rightValue ? 1 : 0;
            default: return 0;
        }
    }

    private async executeAssignmentStatement(assignmentNode: AssignmentStatementNode): Promise<string> {
        // Debug before executing assignment
        await this.dbg.before({
            node: assignmentNode,
            nodeDepth: this.nodeDepth,
            frame: this.currentFrame
        });

        let toAssignStr = '';
        const varNode = assignmentNode.variable;
        const valueNode = assignmentNode.expression;
        console.log("Assigning variable:", varNode, valueNode);

        if (varNode && valueNode) {
            this.nodeDepth++;

            // Debug the value expression
            await this.dbg.before({
                node: valueNode,
                nodeDepth: this.nodeDepth,
                frame: this.currentFrame
            });

            switch (valueNode.type) {
                case 'NUMBER':
                    this.env.vars[varNode.name] = valueNode.value;
                    this.currentFrame.set(varNode.name, valueNode.value);
                    toAssignStr = `Assigned ${valueNode.value} to variable $${varNode.name}.`;
                    break;
                case 'LITERAL':
                    this.env.vars[varNode.name] = valueNode.value;
                    this.currentFrame.set(varNode.name, valueNode.value);
                    toAssignStr = `Assigned "${valueNode.value}" to variable $${varNode.name}.`;
                    break;
                case 'BINARY_EXPRESSION':
                    const result = await this.executeBinaryExpression(valueNode);
                    this.env.vars[varNode.name] = result;
                    this.currentFrame.set(varNode.name, result);
                    toAssignStr = `Assigned ${result} to variable $${varNode.name}.`;
                    break;
                default:
                    toAssignStr = `Unsupported expression type in assignment: ${valueNode.type}.`;
            }
            this.nodeDepth--;
        } else {
            toAssignStr += `Malformed ASSIGNMENT_STATEMENT node.`;
        }
        return toAssignStr;
    }

    private async executeGotoStatement(gotoNode: GotoNode): Promise<string> {
        // Debug before executing goto
        await this.dbg.before({
            node: gotoNode,
            nodeDepth: this.nodeDepth,
            frame: this.currentFrame
        });

        const targetLine = gotoNode.targetLine;
        return `GOTO statement to line ${targetLine} encountered. (Jump handling not implemented)`;
    }

    private async executeIfStatement(ifNode: IfStatementNode): Promise<string> {
        // Debug before executing if statement
        await this.dbg.before({
            node: ifNode,
            nodeDepth: this.nodeDepth,
            frame: this.currentFrame
        });

        let ifStmtStr = '';
        const condition = ifNode.condition;
        const thenBranch = ifNode.thenBranch;
        const elseBranch = ifNode.elseBranch;

        this.nodeDepth++;
        const conditionResult = await this.executeBinaryExpression(condition);
        this.nodeDepth--;

        if (conditionResult) {
            ifStmtStr += `IF condition true, executing THEN branch.\n`;

            // Create new frame for THEN branch
            const thenFrame = new Frame({
                name: "if-then",
                locals: {},
                parent: this.currentFrame,
                callDepth: this.currentFrame.callDepth + 1
            });
            const oldFrame = this.currentFrame;
            this.currentFrame = thenFrame;

            this.nodeDepth++;
            for (const stmt of thenBranch) {
                switch (stmt.type) {
                    case 'PRINT_STATEMENT':
                        ifStmtStr += (await this.executePrintStatement(stmt as PrintStatementNode)) + `\n`;
                        break;
                    case 'ASSIGNMENT_STATEMENT':
                        ifStmtStr += (await this.executeAssignmentStatement(stmt as AssignmentStatementNode)) + `\n`;
                        break;
                    default:
                        ifStmtStr += `Unsupported statement type in IF THEN branch: ${stmt.type}\n`;
                }
            }
            this.nodeDepth--;
            this.currentFrame = oldFrame;
        } else {
            ifStmtStr += `IF condition false.\n`;
            if (elseBranch) {
                ifStmtStr += `Executing ELSE branch.\n`;

                // Create new frame for ELSE branch
                const elseFrame = new Frame({
                    name: "if-else",
                    locals: {},
                    parent: this.currentFrame,
                    callDepth: this.currentFrame.callDepth + 1
                });
                const oldFrame = this.currentFrame;
                this.currentFrame = elseFrame;

                this.nodeDepth++;
                for (const stmt of elseBranch) {
                    switch (stmt.type) {
                        case 'PRINT_STATEMENT':
                            ifStmtStr += (await this.executePrintStatement(stmt as PrintStatementNode)) + `\n`;
                            break;
                        case 'ASSIGNMENT_STATEMENT':
                            ifStmtStr += (await this.executeAssignmentStatement(stmt as AssignmentStatementNode)) + `\n`;
                            break;
                        default:
                            ifStmtStr += `Unsupported statement type in IF ELSE branch: ${stmt.type}\n`;
                    }
                }
                this.nodeDepth--;
                this.currentFrame = oldFrame;
            }
        }
        return ifStmtStr;
    }
}

// Export default function for backward compatibility
export default async function interpreter(ast: AST, dbg: Debugger): Promise<any> {
    // Use a global interpreter instance to maintain state across calls
    if (!globalInterpreterInstance) {
        globalInterpreterInstance = new Interpreter(dbg);
    }
    
    // If we have ongoing execution, resume appropriately based on step mode
    if (globalInterpreterInstance.executing) {
        console.log('Ongoing execution detected, step mode:', dbg.currentStepMode);
        // Check if we're in step mode
        if (dbg.currentStepMode === 'in') {
            console.log('Calling step()');
            return await globalInterpreterInstance.step();
        } else {
            console.log('Calling resume()');
            return await globalInterpreterInstance.resume();
        }
    }
    
    // Starting new execution - reset debugger state first
    console.log('Starting new execution');
    dbg.resetState();
    
    return await globalInterpreterInstance.run(ast);
}

// Global instance to maintain state across calls
let globalInterpreterInstance: Interpreter | null = null;
