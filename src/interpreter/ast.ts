import { TokenError } from './Token';
export interface AstNode {
    type: AstNodeType;
    value?: any;
    children?: AstNode[];
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

    constructor(value: string | number) {
        this.value = value;
    }
}

export class LineNumberNode implements AstNode {
    type = AstNodeType.LINE_NUMBER;
    value: number;

    constructor(value: number) {
        this.value = value;
    }
}

export class VariableNode implements AstNode {
    type = AstNodeType.VARIABLE;
    name: string;

    constructor(name: string) {
        this.name = name;
    }
}

export class BinaryExpressionNode implements AstNode {
    type = AstNodeType.BINARY_EXPRESSION;
    operator: string;
    left: AstNode;
    right: AstNode;

    constructor(operator: string, left: AstNode, right: AstNode) {
        this.operator = operator;
        this.left = left;
        this.right = right;
    }
}

export class StatementNode implements AstNode {
    type = AstNodeType.STATEMENT;
    lineNumber: LineNumberNode;
    children: AstNode[];

    constructor(lineNumber: LineNumberNode, children: AstNode[] = []) {
        this.lineNumber = lineNumber;
        this.children = children;
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

    constructor(condition: AstNode, thenBranch: AstNode[], elseBranch?: AstNode[]) {
        this.condition = condition;
        this.thenBranch = thenBranch;
        this.elseBranch = elseBranch;
    }
}

export class InputStatementNode implements AstNode {
    type = AstNodeType.INPUT_STATEMENT;
    variable: VariableNode;

    constructor(variable: VariableNode) {
        this.variable = variable;
    }
}

export class PrintStatementNode implements AstNode {
    type = AstNodeType.PRINT_STATEMENT;
    children?: AstNode[];

    constructor(children?: AstNode[]) {
        this.children = children;
    }
}

export class AssignmentStatementNode implements AstNode {
    type = AstNodeType.ASSIGNMENT_STATEMENT;
    variable: VariableNode;
    expression: AstNode;

    constructor(variable: VariableNode, expression: AstNode) {
        this.variable = variable;
        this.expression = expression;
    }
}

export class NumberNode implements AstNode {
    type = AstNodeType.NUMBER;
    value: number;

    constructor(value: number) {
        this.value = value;
    }
}

export class GotoNode implements AstNode {
    type = AstNodeType.GOTO_STATEMENT;
    targetLine: number;

    constructor(targetLine: number) {
        this.targetLine = targetLine;
    }
}

export class EndNode implements AstNode {
    type = AstNodeType.END;
}
