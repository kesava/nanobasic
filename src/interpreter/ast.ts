import { TokenError } from './Token';

export interface AstNode {
    type: AstNodeType;
    value?: any;
    children?: AstNode[];
    span: {
        start: { line: number; column: number };
        end: { line: number; column: number };
    };
}

export interface AST {
    type: AstNodeType.PROGRAM;
    body: AstNode[];
}

export enum AstNodeType {
    PROGRAM = "PROGRAM",
    STATEMENT = "STATEMENT",
    EXPRESSION = "EXPRESSION",
    VARIABLE = "VARIABLE",
    LITERAL = "LITERAL",
    NUMBER = "NUMBER",
    BINARY_EXPRESSION = "BINARY_EXPRESSION",
    IF_STATEMENT = "IF_STATEMENT",
    INPUT_STATEMENT = "INPUT_STATEMENT",
    PRINT_STATEMENT = "PRINT_STATEMENT",
    ASSIGNMENT_STATEMENT = "ASSIGNMENT_STATEMENT",
    LINE_NUMBER = "LINE_NUMBER",
    GOTO_STATEMENT = "GOTO_STATEMENT",
    END = "END",
}

export class AST {
    type: AstNodeType.PROGRAM = AstNodeType.PROGRAM;
    body: AstNode[] = [];
    errors: TokenError[] = [];

    constructor() {
        this.body = [];
    }
}

export class LiteralNode implements AstNode {
    type = AstNodeType.LITERAL;
    value: string | number;
    span: { start: { line: number; column: number }; end: { line: number; column: number } };

    constructor(value: string | number, span: { start: { line: number; column: number }; end: { line: number; column: number } }) {
        this.value = value;
        this.span = span;
    }
}

export class LineNumberNode implements AstNode {
    type = AstNodeType.LINE_NUMBER;
    value: number;
    span: { start: { line: number; column: number }; end: { line: number; column: number } };

    constructor(value: number, span: { start: { line: number; column: number }; end: { line: number; column: number } }) {
        this.value = value;
        this.span = span;
    }
}

export class VariableNode implements AstNode {
    type = AstNodeType.VARIABLE;
    name: string;
    span: { start: { line: number; column: number }; end: { line: number; column: number } };

    constructor(name: string, span: { start: { line: number; column: number }; end: { line: number; column: number } }) {
        this.name = name;
        this.span = span;
    }
}

export class BinaryExpressionNode implements AstNode {
    type = AstNodeType.BINARY_EXPRESSION;
    operator: string;
    left: AstNode;
    right: AstNode;
    span: { start: { line: number; column: number }; end: { line: number; column: number } };

    constructor(operator: string, left: AstNode, right: AstNode, span: { start: { line: number; column: number }; end: { line: number; column: number } }) {
        this.operator = operator;
        this.left = left;
        this.right = right;
        this.span = span;
    }
}

export class StatementNode implements AstNode {
    type = AstNodeType.STATEMENT;
    lineNumber: LineNumberNode;
    children: AstNode[];
    span: { start: { line: number; column: number }; end: { line: number; column: number } };

    constructor(lineNumber: LineNumberNode, children: AstNode[] = [], span: { start: { line: number; column: number }; end: { line: number; column: number } }) {
        this.lineNumber = lineNumber;
        this.children = children;
        this.span = span;
    }

    addChild(child: AstNode) {
        this.children.push(child);
    }

    addChildren(children: AstNode[]) {
        this.children.push(...children);
    }
}

export class IfStatementNode implements AstNode {
    type = AstNodeType.IF_STATEMENT;
    condition: AstNode;
    thenBranch: AstNode[];
    elseBranch?: AstNode[];
    span: { start: { line: number; column: number }; end: { line: number; column: number } };

    constructor(condition: AstNode, thenBranch: AstNode[], span: { start: { line: number; column: number }; end: { line: number; column: number } }, elseBranch?: AstNode[]) {
        this.condition = condition;
        this.thenBranch = thenBranch;
        this.elseBranch = elseBranch;
        this.span = span;
    }
}

export class InputStatementNode implements AstNode {
    type = AstNodeType.INPUT_STATEMENT;
    variable: VariableNode;
    span: { start: { line: number; column: number }; end: { line: number; column: number } };

    constructor(variable: VariableNode, span: { start: { line: number; column: number }; end: { line: number; column: number } }) {
        this.variable = variable;
        this.span = span;
    }
}

export class PrintStatementNode implements AstNode {
    type = AstNodeType.PRINT_STATEMENT;
    children?: AstNode[];
    span: { start: { line: number; column: number }; end: { line: number; column: number } };

    constructor(span: { start: { line: number; column: number }; end: { line: number; column: number } }, children?: AstNode[]) {
        this.children = children;
        this.span = span;
    }
}

export class AssignmentStatementNode implements AstNode {
    type = AstNodeType.ASSIGNMENT_STATEMENT;
    variable: VariableNode;
    expression: AstNode;
    span: { start: { line: number; column: number }; end: { line: number; column: number } };

    constructor(variable: VariableNode, expression: AstNode, span: { start: { line: number; column: number }; end: { line: number; column: number } }) {
        this.variable = variable;
        this.expression = expression;
        this.span = span;
    }
}

export class NumberNode implements AstNode {
    type = AstNodeType.NUMBER;
    value: number;
    span: { start: { line: number; column: number }; end: { line: number; column: number } };

    constructor(value: number, span: { start: { line: number; column: number }; end: { line: number; column: number } }) {
        this.value = value;
        this.span = span;
    }
}

export class GotoNode implements AstNode {
    type = AstNodeType.GOTO_STATEMENT;
    targetLine: number;
    span: { start: { line: number; column: number }; end: { line: number; column: number } };

    constructor(targetLine: number, span: { start: { line: number; column: number }; end: { line: number; column: number } }) {
        this.targetLine = targetLine;
        this.span = span;
    }
}

export class EndNode implements AstNode {
    type = AstNodeType.END;
    span: { start: { line: number; column: number }; end: { line: number; column: number } };

    constructor(span: { start: { line: number; column: number }; end: { line: number; column: number } }) {
        this.span = span;
    }
}
