import { AST } from "./ast";

export default function interpreter(ast: AST): string {
    const { body } = ast;
    let output = '';
    let env = {} as any;
    env.lines = {};
    env.vars = {};

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
                    const toPrint = stmt.children?.map(child => {
                        if (child.type === 'LITERAL') {
                            return child.value;
                        } else if (child.type === 'VARIABLE') {
                            const name = (child as any).name;
                            return `${env.vars[name] ?? '<undefined>'}`;
                        } else {
                            return `<unknown>`;
                        }
                    }).join(' ');
                    output += toPrint + '<br/>\n';
                    break;
                case 'INPUT_STATEMENT':
                    output += `INPUT statement encountered. (Input handling not implemented)<br/>\n`;
                    break;
                case 'ASSIGNMENT_STATEMENT':
                    const assignmentNode = (stmt as any);
                    const varNode = assignmentNode.variable;
                    const valueNode = assignmentNode.expression;
                    console.log("Assigning variable:", varNode, valueNode);
                    if (varNode && valueNode) {
                        env.vars[varNode.name] = valueNode.value;
                        output += `Assigned ${valueNode.value} to variable ${varNode.name}.<br/>\n`;
                    } else {
                        output += `Malformed ASSIGNMENT_STATEMENT node.<br/>\n`;
                    }
                    break;
                case 'END':
                    output += `END statement encountered. Terminating execution.<br/>\n`;
                    return output;
                default:
                    output += `Unsupported statement type: ${stmt.type}<br/>\n`;
            }

        }
    }
    return output;
}
