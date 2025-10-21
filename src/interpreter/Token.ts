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

export interface TokenError {
    line: number;
    column: number;
    char: string;
}
