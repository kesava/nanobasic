import { AssignmentStatementNode, AST, GotoNode, IfStatementNode, PrintStatementNode } from "./ast";
import { Debugger } from './Debugger'
export class Interpreter {
    private output: string = '';
    private env: any = {};
    private dbg: Debugger;

    constructor(dbg: Debugger) {
        this.env.lines = {};
        this.env.vars = {};
        this.dbg = dbg;
    }

    executeLine(line: any): any {
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

            this.executeStatement(stmt);
        }

        console.log({ output: this.output, env: this.env });
        return {
            output: this.output,
            env: this.env
        };
    }

    run(ast: AST): any {
        this.output = '';
        this.env.lines = {};
        this.env.vars = {};

        const { body } = ast;

        for (const line of body) {
            this.executeLine(line);
        }

        return {
            output: this.output,
            env: this.env
        };
    }

    private executeStatement(stmt: any): void {
        switch (stmt.type) {
            case 'PRINT_STATEMENT':
                const toPrint = this.executePrintStatement(stmt as PrintStatementNode);
                this.output += toPrint + '<br/>\n';
                break;
            case 'INPUT_STATEMENT':
                this.output += `INPUT statement encountered. (Input handling not implemented)<br/>\n`;
                break;
            case 'ASSIGNMENT_STATEMENT':
                const toAssignStr = this.executeAssignmentStatement(stmt as AssignmentStatementNode);
                this.output += toAssignStr + '<br/>\n';
                break;
            case 'IF_STATEMENT':
                const ifStmtStr = this.executeIfStatement(stmt as IfStatementNode);
                this.output += `${ifStmtStr}<br/>\n`;
                break;
            case 'GOTO_STATEMENT':
                this.output += `${this.executeGotoStatement(stmt as GotoNode)}<br/>\n`;
                break;
            case 'END':
                this.output += `END statement encountered. Terminating execution.<br/>\n`;
                break;
            default:
                this.output += `Unsupported statement type: ${stmt.type}<br/>\n`;
        }
    }

    private executePrintStatement(stmt: PrintStatementNode): string {
        let outStr = '';
        stmt.children?.forEach(child => {
            if (child.type === 'LITERAL') {
                outStr += child.value;
            } else if (child.type === 'VARIABLE') {
                const name = (child as any).name;
                outStr += `${this.env.vars[name] ?? '<undefined>'}`;
            } else if (child.type === 'NUMBER') {
                outStr += child.value;
            } else if (child.type === 'BINARY_EXPRESSION') {
                const result = this.executeBinaryExpression(child);
                outStr += `${result}`;
            } else {
                outStr += `<unknown>`;
            }
        });
        return outStr;
    }

    private executeBinaryExpression(expr: any): number {
        const leftNode = expr.left;
        const rightNode = expr.right;
        const operator = expr.operator;

        let leftValue = 0;
        let rightValue = 0;

        if (leftNode.type === 'NUMBER') {
            leftValue = parseFloat(leftNode.value);
        } else if (leftNode.type === 'VARIABLE') {
            const name = leftNode.name;
            leftValue = parseFloat(this.env.vars[name] ?? '0');
        } else if (leftNode.type === 'BINARY_EXPRESSION') {
            leftValue = this.executeBinaryExpression(leftNode);
        }

        if (rightNode.type === 'NUMBER') {
            rightValue = parseFloat(rightNode.value);
        } else if (rightNode.type === 'VARIABLE') {
            const name = rightNode.name;
            rightValue = parseFloat(this.env.vars[name] ?? '0');
        } else if (rightNode.type === 'BINARY_EXPRESSION') {
            rightValue = this.executeBinaryExpression(rightNode);
        }

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

    private executeAssignmentStatement(assignmentNode: AssignmentStatementNode): string {
        let toAssignStr = '';
        const varNode = assignmentNode.variable;
        const valueNode = assignmentNode.expression;
        console.log("Assigning variable:", varNode, valueNode);

        if (varNode && valueNode) {
            switch (valueNode.type) {
                case 'NUMBER':
                    this.env.vars[varNode.name] = valueNode.value;
                    toAssignStr = `Assigned ${valueNode.value} to variable $${varNode.name}.`;
                    break;
                case 'LITERAL':
                    this.env.vars[varNode.name] = valueNode.value;
                    toAssignStr = `Assigned "${valueNode.value}" to variable $${varNode.name}.`;
                    break;
                case 'BINARY_EXPRESSION':
                    const result = this.executeBinaryExpression(valueNode);
                    this.env.vars[varNode.name] = result;
                    toAssignStr = `Assigned ${result} to variable $${varNode.name}.`;
                    break;
                default:
                    toAssignStr = `Unsupported expression type in assignment: ${valueNode.type}.`;
            }
        } else {
            toAssignStr += `Malformed ASSIGNMENT_STATEMENT node.`;
        }
        return toAssignStr;
    }

    private executeGotoStatement(gotoNode: GotoNode): string {
        const targetLine = gotoNode.targetLine;
        return `GOTO statement to line ${targetLine} encountered. (Jump handling not implemented)`;
    }

    private executeIfStatement(ifNode: IfStatementNode): string {
        let ifStmtStr = '';
        const condition = ifNode.condition;
        const thenBranch = ifNode.thenBranch;
        const elseBranch = ifNode.elseBranch;
        const conditionResult = this.executeBinaryExpression(condition);

        if (conditionResult) {
            ifStmtStr += `IF condition true, executing THEN branch.\n`;
            thenBranch.forEach(stmt => {
                switch (stmt.type) {
                    case 'PRINT_STATEMENT':
                        ifStmtStr += this.executePrintStatement(stmt as PrintStatementNode) + `\n`;
                        break;
                    case 'ASSIGNMENT_STATEMENT':
                        ifStmtStr += this.executeAssignmentStatement(stmt as AssignmentStatementNode) + `\n`;
                        break;
                    default:
                        ifStmtStr += `Unsupported statement type in IF THEN branch: ${stmt.type}\n`;
                }
            });
        } else {
            ifStmtStr += `IF condition false.\n`;
            if (elseBranch) {
                ifStmtStr += `Executing ELSE branch.\n`;
                elseBranch.forEach(stmt => {
                    switch (stmt.type) {
                        case 'PRINT_STATEMENT':
                            ifStmtStr += this.executePrintStatement(stmt as PrintStatementNode) + `\n`;
                            break;
                        case 'ASSIGNMENT_STATEMENT':
                            ifStmtStr += this.executeAssignmentStatement(stmt as AssignmentStatementNode) + `\n`;
                            break;
                        default:
                            ifStmtStr += `Unsupported statement type in IF ELSE branch: ${stmt.type}\n`;
                    }
                });
            }
        }
        return ifStmtStr;
    }
}

// Export default function for backward compatibility
export default function interpreter(ast: AST, dbg: Debugger): any {
    const interpreterInstance = new Interpreter(dbg);
    return interpreterInstance.run(ast);  // Changed from execute to run
}
