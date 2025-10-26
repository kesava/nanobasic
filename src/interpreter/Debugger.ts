export class Debugger {
    private currentLine: number = -1;

    constructor() {}

    setCurrentLine(lineNumber: number) {
        this.currentLine = lineNumber;
    }

    getCurrentLine(): number {
        return this.currentLine;
    }
}

export const dbg = new Debugger();
