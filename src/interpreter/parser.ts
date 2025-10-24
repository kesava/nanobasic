import { Token, TokenError } from './Token';
import {
    AST,
    AstNode, LineNumberNode,
    AssignmentStatementNode,
    PrintStatementNode,
    InputStatementNode,
    StatementNode,
    IfStatementNode,
    VariableNode,
    NumberNode,
    LiteralNode,
    BinaryExpressionNode,
    EndNode,
    GotoNode
} from './ast';
const parser = (tokenList: { tokens: Token[][]; errors: TokenError[] }) => {
    const ast = new AST();
    const lines = tokenList.tokens;
    lines.forEach((lineTokens, index) => {
        const firstToken = lineTokens[0];
        if (firstToken && firstToken.type === 'LINE_NUMBER') {
            const statement = new StatementNode(new LineNumberNode(parseInt(firstToken.value)));
            // rest of the tokens
            const bodyNodes = parseStatementBody(lineTokens.slice(1), index + 1);
            statement.children.push(...bodyNodes);
            ast.body.push(statement);
        } else {
            // Handle error: line does not start with a line number
            console.error(`Syntax Error: Line ${index + 1} does not start with a line number.`);
            ast.errors.push(new TokenError('Expected line number at the beginning of the line.', index + 1, 1, ''));
        }
    });
    return ast;
};

export default parser;

const parseStatementBody = (tokens: Token[], lineNumber: number): AstNode[] => {
    const nodes: AstNode[] = [];
    let position = 0;
    while (position < tokens.length) {
        const token = tokens[position];
        switch (token.type) {
            case 'LET': {
                // Parse assignment statement
                const assignmentNode = parseAssignment(tokens, position, lineNumber);
                if (assignmentNode) {
                    nodes.push(assignmentNode.node);
                    position = assignmentNode.newPosition;
                } else {
                    position++;
                }
                break;
            }
            case 'PRINT': {
                const printNode = parsePrint(tokens, position, lineNumber);
                if (printNode) {
                    nodes.push(printNode.node);
                    position = printNode.newPosition;
                } else {
                    position++;
                }
                break;
            }
            case 'INPUT': {
                const inputNode = parseInput(tokens, position, lineNumber);
                if (inputNode) {
                    nodes.push(inputNode.node);
                    position = inputNode.newPosition;
                } else {
                    position++;
                }
                break;
            }
            case 'IF': {
                const ifNode = parseIf(tokens, position, lineNumber);
                if (ifNode) {
                    nodes.push(ifNode.node);
                    position = ifNode.newPosition;
                } else {
                    position++;
                }
                break;
            }
            case 'GOTO': {
                const gotoNode = parseGoto(tokens, position, lineNumber);
                if (gotoNode) {
                    nodes.push(gotoNode.node);
                    position = gotoNode.newPosition;
                } else {
                    position++;
                }
                break;
            }
            case 'IF_STATEMENT': {
                // Parse IF statement
                const ifNode = parseIf(tokens, position, lineNumber);
                if (ifNode) {
                    nodes.push(ifNode.node);
                    position = ifNode.newPosition;
                } else {
                    position++;
                }
                break;
            }
            case 'END': {
                nodes.push(new EndNode());
                position++;
                break;
            }
            default:
                console.error(`Syntax Error: Unexpected token '${token.value}' at line ${lineNumber}, column ${token.column}.`);
                position++;
                break;
        }
    }
    return nodes;
};

const parseAssignment = (tokens: Token[], position: number, lineNumber: number): { node: AssignmentStatementNode; newPosition: number } | null => {
    // Expected format: LET <variable> = <expression>
    if (tokens[position].type === 'LET' &&
        tokens[position + 1] &&
        tokens[position + 1].type === 'VARIABLE' &&
        tokens[position + 2] &&
        tokens[position + 2].type === 'OPERATOR' &&
        tokens[position + 2].value === '=') {
        const variableName = tokens[position + 1].value;
        const exprTokens = [];
        let exprPosition = position + 3;
        while (exprPosition < tokens.length) {
            exprTokens.push(tokens[exprPosition]);
            exprPosition++;
        }
        const exprNode = parseExpression(exprTokens, lineNumber);
        if (exprNode) {
            const assignmentNode = new AssignmentStatementNode(new VariableNode(variableName), exprNode);
            return { node: assignmentNode, newPosition: exprPosition };
        }
    }
    console.error(`Syntax Error: Invalid assignment statement at line ${lineNumber}.`);
    return null;
};

const parsePrint = (tokens: Token[], position: number, lineNumber: number): { node: PrintStatementNode; newPosition: number } | null => {
    // Expected format: PRINT <expression>
    if (tokens[position].type === 'PRINT') {
        const printTokens = [];
        let exprPosition = position + 1;
        while (exprPosition < tokens.length) {
            printTokens.push(tokens[exprPosition]);
            exprPosition++;
        }
        const printChildren: AstNode[] = [];
        printTokens.forEach(token => {
            if (token.type === 'SEMICOLON') {
                // Ignore semicolons in PRINT statements for now
            } else {
                switch (token.type) {
                    case 'LITERAL':
                        printChildren.push(new LiteralNode(token.value));
                        break;
                    case 'VARIABLE':
                        printChildren.push(new VariableNode(token.value));
                        break;
                    case 'NUMBER':
                        printChildren.push(new NumberNode(parseFloat(token.value)));
                        break;
                    default:
                        console.error(`Syntax Error: Invalid token in PRINT statement at line ${lineNumber}, column ${token.column}.`);
                        break;
                }
            }
        });
        if (printChildren.length > 0) {
            const printNode = new PrintStatementNode(printChildren);
            return { node: printNode, newPosition: exprPosition };
        } else {
            console.error(`Syntax Error: No valid expressions in PRINT statement at line ${lineNumber}.`);
            return null;
        }
    }
    console.error(`Syntax Error: Invalid PRINT statement at line ${lineNumber}.`);
    return null;
};

const parseInput = (tokens: Token[], position: number, lineNumber: number): { node: InputStatementNode; newPosition: number } | null => {
    // Expected format: INPUT <variable>
    if (tokens[position].type === 'INPUT' &&
        tokens[position + 1] &&
        tokens[position + 1].type === 'VARIABLE') {
        const variableName = tokens[position + 1].value;
        const inputNode = new InputStatementNode(new VariableNode(variableName));
        return { node: inputNode, newPosition: position + 2 };
    }
    console.error(`Syntax Error: Invalid INPUT statement at line ${lineNumber}.`);
    return null;
};

const parseIf = (tokens: Token[], position: number, lineNumber: number): { node: IfStatementNode; newPosition: number } | null => {
    // Expected format: IF <condition> THEN <statements> [ELSE <statements>]
    // This is a simplified version and may need enhancements for complex conditions and statements
    if (tokens[position].type === 'IF') {
        let condTokens = [];
        let thenTokens = [];
        let elseTokens = [];
        let currentPosition = position + 1;
        let inThen = false;
        let inElse = false;

        while (currentPosition < tokens.length) {
            const token = tokens[currentPosition];
            if (token.type === 'THEN') {
                inThen = true;
                currentPosition++;
                continue;
            } else if (token.type === 'ELSE') {
                inElse = true;
                inThen = false;
                currentPosition++;
                continue;
            }

            if (!inThen && !inElse) {
                condTokens.push(token);
            } else if (inThen) {
                thenTokens.push(token);
            } else if (inElse) {
                elseTokens.push(token);
            }
            currentPosition++;
        }

        const conditionNode = parseExpression(condTokens, lineNumber);
        const thenNodes = parseStatementBody(thenTokens, lineNumber);
        const elseNodes = elseTokens.length > 0 ? parseStatementBody(elseTokens, lineNumber) : undefined;

        if (conditionNode) {
            const ifNode = new IfStatementNode(conditionNode, thenNodes, elseNodes);
            return { node: ifNode, newPosition: currentPosition };
        }
    }
    console.error(`Syntax Error: Invalid IF statement at line ${lineNumber}.`);
    return null;
};

const parseExpression = (tokens: Token[], lineNumber: number): AstNode | null => {
    // This is a very simplified expression parser that only handles single variables or numbers
    if (tokens.length === 1) {
        const token = tokens[0];
        if (token.type === 'NUMBER') {
            return new NumberNode(parseFloat(token.value));
        } else if (token.type === 'VARIABLE') {
            return new VariableNode(token.value);
        } else if (token.type === 'LITERAL') {
            return new LiteralNode(token.value);
        }
    } else if (tokens.length === 3) {
        // Simple binary expression: <operand> <operator> <operand>
        const leftToken = tokens[0];
        const operatorToken = tokens[1];
        const rightToken = tokens[2];

        let leftNode: AstNode | null = null;
        let rightNode: AstNode | null = null;

        if (leftToken.type === 'NUMBER') {
            leftNode = new NumberNode(parseFloat(leftToken.value));
        } else if (leftToken.type === 'VARIABLE') {
            leftNode = new VariableNode(leftToken.value);
        }

        if (rightToken.type === 'NUMBER') {
            rightNode = new NumberNode(parseFloat(rightToken.value));
        } else if (rightToken.type === 'VARIABLE') {
            rightNode = new VariableNode(rightToken.value);
        }

        if (leftNode && rightNode) {
            return new BinaryExpressionNode(operatorToken.value, leftNode, rightNode);
        }
    }
    console.error(`Syntax Error: Invalid expression at line ${lineNumber}.`);
    return null;
};

const parseGoto = (tokens: Token[], position: number, lineNumber: number): { node: GotoNode; newPosition: number } | null => {
    // Expected format: GOTO <line_number>
    if (tokens[position].type === 'GOTO' &&
        tokens[position + 1] &&
        tokens[position + 1].type === 'NUMBER') {
        const lineNum = parseInt(tokens[position + 1].value);
        const gotoNode = new GotoNode(lineNum); // You may want to create a specific GotoNode class
        return { node: gotoNode, newPosition: position + 2 };
    }
    console.error(`Syntax Error: Invalid GOTO statement at line ${lineNumber}.`);
    return null;
}
