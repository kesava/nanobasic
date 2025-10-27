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

const parser = (tokenList: { tokens: Token[][]; errors: TokenError[] }): AST => {
    const ast = new AST();
    const lines = tokenList.tokens;

    lines.forEach((lineTokens, index) => {
        const firstToken = lineTokens[0];
        if (firstToken && firstToken.type === 'LINE_NUMBER') {
            const lineNumberSpan = {
                start: { line: firstToken.line, column: firstToken.column },
                end: { line: firstToken.line, column: firstToken.column + firstToken.value.length }
            };

            const lastToken = lineTokens[lineTokens.length - 1];
            const statementSpan = {
                start: { line: firstToken.line, column: firstToken.column },
                end: { line: lastToken.line, column: lastToken.column + lastToken.value.length }
            };

            const statement = new StatementNode(
                new LineNumberNode(parseInt(firstToken.value), lineNumberSpan),
                [],
                statementSpan
            );

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
                const assignmentResult = parseAssignment(tokens, position, lineNumber);
                if (assignmentResult) {
                    nodes.push(assignmentResult.node);
                    position = assignmentResult.newPosition;
                } else {
                    position++;
                }
                break;
            }
            case 'PRINT': {
                const printResult = parsePrint(tokens, position, lineNumber);
                if (printResult) {
                    nodes.push(printResult.node);
                    position = printResult.newPosition;
                } else {
                    position++;
                }
                break;
            }
            case 'INPUT': {
                const inputResult = parseInput(tokens, position, lineNumber);
                if (inputResult) {
                    nodes.push(inputResult.node);
                    position = inputResult.newPosition;
                } else {
                    position++;
                }
                break;
            }
            case 'IF': {
                const ifResult = parseIf(tokens, position, lineNumber);
                if (ifResult) {
                    nodes.push(ifResult.node);
                    position = ifResult.newPosition;
                } else {
                    position++;
                }
                break;
            }
            case 'GOTO': {
                const gotoResult = parseGoto(tokens, position, lineNumber);
                if (gotoResult) {
                    nodes.push(gotoResult.node);
                    position = gotoResult.newPosition;
                } else {
                    position++;
                }
                break;
            }
            case 'END': {
                const endSpan = {
                    start: { line: token.line, column: token.column },
                    end: { line: token.line, column: token.column + token.value.length }
                };
                nodes.push(new EndNode(endSpan));
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
    if (tokens[position].type === 'LET' &&
        tokens[position + 1] &&
        tokens[position + 1].type === 'VARIABLE' &&
        tokens[position + 2] &&
        tokens[position + 2].type === 'OPERATOR' &&
        tokens[position + 2].value === '=') {

        const variableName = tokens[position + 1].value;
        const variableToken = tokens[position + 1];
        const exprTokens = [];
        let exprPosition = position + 3;

        while (exprPosition < tokens.length) {
            exprTokens.push(tokens[exprPosition]);
            exprPosition++;
        }

        const exprNode = parseExpression(exprTokens, lineNumber);
        if (exprNode) {
            const variableSpan = {
                start: { line: variableToken.line, column: variableToken.column },
                end: { line: variableToken.line, column: variableToken.column + variableToken.value.length }
            };

            const assignmentSpan = {
                start: { line: tokens[position].line, column: tokens[position].column },
                end: exprNode.span.end
            };

            const assignmentNode = new AssignmentStatementNode(
                new VariableNode(variableName, variableSpan),
                exprNode,
                assignmentSpan
            );
            return { node: assignmentNode, newPosition: exprPosition };
        }
    }
    console.error(`Syntax Error: Invalid assignment statement at line ${lineNumber}.`);
    return null;
};

const parsePrint = (tokens: Token[], position: number, lineNumber: number): { node: PrintStatementNode; newPosition: number } | null => {
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
                const tokenSpan = {
                    start: { line: token.line, column: token.column },
                    end: { line: token.line, column: token.column + token.value.length }
                };

                switch (token.type) {
                    case 'LITERAL':
                        printChildren.push(new LiteralNode(token.value, tokenSpan));
                        break;
                    case 'VARIABLE':
                        printChildren.push(new VariableNode(token.value, tokenSpan));
                        break;
                    case 'NUMBER':
                        printChildren.push(new NumberNode(parseFloat(token.value), tokenSpan));
                        break;
                    default:
                        console.error(`Syntax Error: Invalid token in PRINT statement at line ${lineNumber}, column ${token.column}.`);
                        break;
                }
            }
        });

        if (printChildren.length > 0) {
            const printSpan = {
                start: { line: tokens[position].line, column: tokens[position].column },
                end: printChildren[printChildren.length - 1].span.end
            };

            const printNode = new PrintStatementNode(printSpan, printChildren);
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
    if (tokens[position].type === 'INPUT' &&
        tokens[position + 1] &&
        tokens[position + 1].type === 'VARIABLE') {

        const variableName = tokens[position + 1].value;
        const variableToken = tokens[position + 1];

        const variableSpan = {
            start: { line: variableToken.line, column: variableToken.column },
            end: { line: variableToken.line, column: variableToken.column + variableToken.value.length }
        };

        const inputSpan = {
            start: { line: tokens[position].line, column: tokens[position].column },
            end: { line: variableToken.line, column: variableToken.column + variableToken.value.length }
        };

        const inputNode = new InputStatementNode(
            new VariableNode(variableName, variableSpan),
            inputSpan
        );
        return { node: inputNode, newPosition: position + 2 };
    }
    console.error(`Syntax Error: Invalid INPUT statement at line ${lineNumber}.`);
    return null;
};

const parseIf = (tokens: Token[], position: number, lineNumber: number): { node: IfStatementNode; newPosition: number } | null => {
    if (tokens[position].type === 'IF') {
        const condTokens: Token[] = [];
        const thenTokens: Token[] = [];
        const elseTokens: Token[] = [];
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
            } else if (inThen && !inElse) {
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
            const lastToken = tokens[currentPosition - 1] || tokens[position];
            const ifSpan = {
                start: { line: tokens[position].line, column: tokens[position].column },
                end: { line: lastToken.line, column: lastToken.column + lastToken.value.length }
            };

            const ifNode = new IfStatementNode(conditionNode, thenNodes, ifSpan, elseNodes);
            return { node: ifNode, newPosition: currentPosition };
        }
    }
    console.error(`Syntax Error: Invalid IF statement at line ${lineNumber}.`);
    return null;
};

const parseExpression = (tokens: Token[], lineNumber: number): AstNode | null => {
    if (tokens.length === 0) {
        return null;
    }

    if (tokens.length === 1) {
        const token = tokens[0];
        const tokenSpan = {
            start: { line: token.line, column: token.column },
            end: { line: token.line, column: token.column + token.value.length }
        };

        if (token.type === 'NUMBER') {
            return new NumberNode(parseFloat(token.value), tokenSpan);
        } else if (token.type === 'VARIABLE') {
            return new VariableNode(token.value, tokenSpan);
        } else if (token.type === 'LITERAL') {
            return new LiteralNode(token.value, tokenSpan);
        }
    } else if (tokens.length === 3) {
        const leftToken = tokens[0];
        const operatorToken = tokens[1];
        const rightToken = tokens[2];

        let leftNode: AstNode | null = null;
        let rightNode: AstNode | null = null;

        const leftSpan = {
            start: { line: leftToken.line, column: leftToken.column },
            end: { line: leftToken.line, column: leftToken.column + leftToken.value.length }
        };

        const rightSpan = {
            start: { line: rightToken.line, column: rightToken.column },
            end: { line: rightToken.line, column: rightToken.column + rightToken.value.length }
        };

        if (leftToken.type === 'NUMBER') {
            leftNode = new NumberNode(parseFloat(leftToken.value), leftSpan);
        } else if (leftToken.type === 'VARIABLE') {
            leftNode = new VariableNode(leftToken.value, leftSpan);
        }

        if (rightToken.type === 'NUMBER') {
            rightNode = new NumberNode(parseFloat(rightToken.value), rightSpan);
        } else if (rightToken.type === 'VARIABLE') {
            rightNode = new VariableNode(rightToken.value, rightSpan);
        }

        if (leftNode && rightNode && operatorToken.type === 'OPERATOR') {
            const binarySpan = {
                start: leftSpan.start,
                end: rightSpan.end
            };

            return new BinaryExpressionNode(operatorToken.value, leftNode, rightNode, binarySpan);
        }
    }

    console.error(`Syntax Error: Invalid expression at line ${lineNumber}.`);
    return null;
};

const parseGoto = (tokens: Token[], position: number, lineNumber: number): { node: GotoNode; newPosition: number } | null => {
    if (tokens[position].type === 'GOTO' &&
        tokens[position + 1] &&
        tokens[position + 1].type === 'NUMBER') {

        const lineNum = parseInt(tokens[position + 1].value);
        const gotoSpan = {
            start: { line: tokens[position].line, column: tokens[position].column },
            end: { line: tokens[position + 1].line, column: tokens[position + 1].column + tokens[position + 1].value.length }
        };

        const gotoNode = new GotoNode(lineNum, gotoSpan);
        return { node: gotoNode, newPosition: position + 2 };
    }
    console.error(`Syntax Error: Invalid GOTO statement at line ${lineNumber}.`);
    return null;
};
