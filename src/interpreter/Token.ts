export  class Token {
    type: string;
    value: string;
    line: number;
    column: number;

    constructor(type: string, value: string, line: number, column: number) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.column = column;
    }
}

export class TokenError {
    message: string;
    line: number;
    column: number;
    char: string;

    constructor(message: string, line: number, column: number, char: string) {
        this.message = message;
        this.line = line;
        this.column = column;
        this.char = char;
    }
}
export interface LexerOutput {
    tokens: Token[][];
    errors: TokenError[]
}
