import { Token, TokenError } from './Token';

export default function parser(input: string): { tokens: Token[][]; errors: TokenError[] } {
    const lines = input.split('\n');
    const outputTokens: Token[][] = [];
    const unknownCharacters: TokenError[] = [];
    console.log("Parsing input:", input);
    const lineNumberRegex = {
        regex: /^\s*(\d+)\s*/, type: 'LINE_NUMBER'
    };
    const tokenRegex = [
        { type: 'STRING', regex: /^"([^"]*)"/ },
        { type : 'VARIABLE', regex: /^\$([a-zA-Z_]\w*)/ },
        { type: 'NUMBER', regex: /^\d+/ },

        { type: 'LET', regex: /^LET\b/ },
        { type: 'PRINT', regex: /^PRINT\b/ },
        { type: 'IF', regex: /^IF\b/ },
        { type: 'ELSE', regex: /^ELSE\b/ },
        { type: 'INPUT', regex: /^INPUT\b/ },
        { type: 'THEN', regex: /^THEN\b/ },
        { type: 'GOTO', regex: /^GOTO\b/ },
        { type: 'END', regex: /^END\b/ },
        { type: 'IDENTIFIER', regex: /^[a-zA-Z_]\w*/ },
        { type: 'OPERATOR', regex: /^[+\-*/=<>]/ },
        { type: 'WHITESPACE', regex: /^\s+/ },
        { type: 'NEWLINE', regex: /^\n/ },
        { type: 'UNKNOWN', regex: /^./ },
    ];

    lines.forEach((line, lineNumber) => {
        let position = 0;
        const lineTokens: Token[] = [];

        // Check for line number at the start of the line
        const lineNumberMatch = line.match(lineNumberRegex.regex);
        if (lineNumberMatch) {
            const value = lineNumberMatch[1];
            lineTokens.push(new Token(lineNumberRegex.type, value, lineNumber + 1, position + 1));
            position += lineNumberMatch[0].length;
        }

        while (position < line.length) {
            let matched = false;

            for (const { type, regex } of tokenRegex) {
                const substring = line.slice(position);
                const match = substring.match(regex);

                if (match) {
                    const value = match[0];
                    if (type !== 'WHITESPACE') { // Ignore whitespace tokens
                        if (type === 'VARIABLE') {
                            // For variables, use the captured group (variable name without $)
                            const variableName = match[1];
                            lineTokens.push(new Token(type, variableName, lineNumber + 1, position + 1));
                        } else {
                            lineTokens.push(new Token(type, value, lineNumber + 1, position + 1));
                        }
                    }
                    position += value.length;
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                position++; // Skip unknown character
                unknownCharacters.push({ line: lineNumber + 1, column: position, char: line[position - 1] });
            }
        }
        outputTokens.push(lineTokens);
    });
    return ({
        tokens: outputTokens,
        errors: unknownCharacters
    });
}
