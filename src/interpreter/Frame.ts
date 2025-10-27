class Frame {
    name: string;
    locals: { [key: string]: any };
    parent: Frame | null;
    callDepth: number;

    constructor({
        name = "<main>",
        locals = {},
        parent = null,
        callDepth = 0
    }: {
        name?: string;
        locals?: { [key: string]: any };
        parent?: Frame | null;
        callDepth?: number;
    } = {}) {
        this.name = name;
        this.locals = locals;
        this.parent = parent;
        this.callDepth = callDepth;
    }

    lookup(k: string): any {
        if (k in this.locals) {
            return this.locals[k];
        }
        if (this.parent) {
            return this.parent.lookup(k);
        }
        throw new ReferenceError(`Variable '${k}' not found`);
    }

    set(k: string, v: any): void {
        this.locals[k] = v;
    }
}

export { Frame };
