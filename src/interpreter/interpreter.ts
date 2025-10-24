import { AssignmentStatementNode, AST, GotoNode, IfStatementNode, PrintStatementNode } from "./ast";

export default function interpreter(ast: AST): any {
    const { body } = ast;
    let output = '';
    let env = {} as any;
    env.lines = {};
    env.vars = {};

    function executePrintStatement(stmt: PrintStatementNode) {
        let outStr = '';
        stmt.children?.forEach(child => {
            if (child.type === 'LITERAL') {
                outStr += child.value;
            } else if (child.type === 'VARIABLE') {
                const name = (child as any).name;
                outStr += `${env.vars[name] ?? '<undefined>'}`;
            } else if (child.type === 'NUMBER') {
                outStr += child.value;
            } else if (child.type === 'BINARY_EXPRESSION') {
                const result = executeBinaryExpression(child);
                outStr += `${result}`;
            } else {
                outStr += `<unknown>`;
            }
        });
        return outStr;
    }

    function executeBinaryExpression(expr: any): number {
        const leftNode = expr.left;
        const rightNode = expr.right;
        const operator = expr.operator;

        let leftValue = 0;
        let rightValue = 0;

        if (leftNode.type === 'NUMBER') {
            leftValue = parseFloat(leftNode.value);
        } else if (leftNode.type === 'VARIABLE') {
            const name = leftNode.name;
            leftValue = parseFloat(env.vars[name] ?? '0');
        } else if (leftNode.type === 'BINARY_EXPRESSION') {
            leftValue = executeBinaryExpression(leftNode);
        }

        if (rightNode.type === 'NUMBER') {
            rightValue = parseFloat(rightNode.value);
        } else if (rightNode.type === 'VARIABLE') {
            const name = rightNode.name;
            rightValue = parseFloat(env.vars[name] ?? '0');
        } else if (rightNode.type === 'BINARY_EXPRESSION') {
            rightValue = executeBinaryExpression(rightNode);
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

    function executeAssignmentStatement(assignmentNode: AssignmentStatementNode) {
        let toAssignStr = '';
        const varNode = assignmentNode.variable;
        const valueNode = assignmentNode.expression;
        console.log("Assigning variable:", varNode, valueNode);
        if (varNode && valueNode) {
            switch (valueNode.type) {
                case 'NUMBER':
                    env.vars[varNode.name] = valueNode.value;
                    toAssignStr = `Assigned ${valueNode.value} to variable $${varNode.name}.`;
                    break;
                case 'LITERAL':
                    env.vars[varNode.name] = valueNode.value;
                    toAssignStr = `Assigned "${valueNode.value}" to variable $${varNode.name}.`;
                    break;
                case 'BINARY_EXPRESSION':
                    const result = executeBinaryExpression(valueNode);
                    env.vars[varNode.name] = result;
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

    function executeGotoStatement(gotoNode: GotoNode) {
        const targetLine = gotoNode.targetLine;
        return `GOTO statement to line ${targetLine} encountered. (Jump handling not implemented)`;
    }

    function executeIfStatement(ifNode: IfStatementNode) {
        let ifStmtStr = '';
        const condition = ifNode.condition;
        const thenBranch = ifNode.thenBranch;
        const elseBranch = ifNode.elseBranch;
        const conditionResult = executeBinaryExpression(condition);
        if (conditionResult) {
            ifStmtStr += `IF condition true, executing THEN branch.\n`;
            thenBranch.forEach(stmt => {
                switch (stmt.type) {
                    case 'PRINT_STATEMENT':
                        ifStmtStr += executePrintStatement(stmt as PrintStatementNode) + `\n`;
                        break;
                    case 'ASSIGNMENT_STATEMENT':
                        ifStmtStr += executeAssignmentStatement(stmt as AssignmentStatementNode) + `\n`;
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
                            ifStmtStr += executePrintStatement(stmt as PrintStatementNode) + `\n`;
                            break;
                        case 'ASSIGNMENT_STATEMENT':
                            ifStmtStr += executeAssignmentStatement(stmt as AssignmentStatementNode) + `\n`;
                            break;
                        default:
                            ifStmtStr += `Unsupported statement type in IF ELSE branch: ${stmt.type}\n`;
                    }
                });
            }
        }
        return ifStmtStr;
    }

    for (const line of body) {
        if (line.type !== 'STATEMENT') {
            output += `Unsupported AST node type: ${line.type}\n`;
            continue;
        } else {
            const lineNumber = (line as any).lineNumber?.value ?? '<unknown>';
            output += `${lineNumber}: `;
            const stmt = line.children?.[0];
            env.lines[lineNumber] = stmt;
            if (!stmt) {
                output += `Empty STATEMENT node encountered. (Malformed AST)<br/>\n`;
                continue;
            }
            switch (stmt.type) {
                case 'PRINT_STATEMENT':
                    const toPrint = executePrintStatement(stmt as PrintStatementNode);
                    output += toPrint + '<br/>\n';
                    break;
                case 'INPUT_STATEMENT':
                    output += `INPUT statement encountered. (Input handling not implemented)<br/>\n`;
                    break;
                case 'ASSIGNMENT_STATEMENT':
                    const toAssignStr = executeAssignmentStatement(stmt as AssignmentStatementNode);
                    output += toAssignStr + '<br/>\n';
                    break;
                case 'IF_STATEMENT':
                    const ifStmtStr = executeIfStatement(stmt as IfStatementNode);
                    output += `${ifStmtStr}<br/>\n`;
                    break;
                case 'GOTO_STATEMENT':
                    output += `${executeGotoStatement(stmt as GotoNode)}<br/>\n`;
                    break;
                case 'END':
                    output += `END statement encountered. Terminating execution.<br/>\n`;
                    break;
                default:
                    output += `Unsupported statement type: ${stmt.type}<br/>\n`;
            }


        }
    }
    console.log({ output, env });
    return {
        output,
        env
    } as any;
}
