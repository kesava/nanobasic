import React, { useState } from 'react';
import './App.css';
import NanoEditor from './components/nanoeditor/nanoeditor';
import CodeOutput from './components/codeoutput/codeoutput';
import lexer from './interpreter/lexer';
import parser from './interpreter/parser';
import interpreter from './interpreter/interpreter';
import { LexerOutput, TokenError, Token } from './interpreter/Token';
import { AST } from './interpreter/ast';

function App() {
    const initCode = `10 PRINT "HELLO, WORLD!"
20 LET $A = 5 + 4
30 IF 8 < $A THEN LET $A = 23 ELSE LET $A = $A + 11
40 PRINT "RESULT $A: "; $A
50 END  `;
    const [output, setOutput] = useState<string>('');
    const [tokens, setTokens] = useState<LexerOutput>({
        tokens: [] as Token[][],
        errors: [] as TokenError[]
    });
    const [ast, setAst] = useState<AST | null>(null);
    const [env, setEnv] = useState<any>(null);

    const handleCodeChange = (newCode: string) => {
        console.log("Code changed:", newCode);
        const lexResult = lexer(newCode);
        setTokens(lexResult);
        if (lexResult.errors.length > 0) {
            setOutput(`Lexing Errors:\n${lexResult.errors.map(err => `Line ${err.line}, Col ${err.column}: ${err.message} (Char: '${err.char}')`).join('\n')}`);
            setAst(null);
            return;
        }

        const astResult = parser(lexResult);
        setAst(astResult);
        if (astResult.errors.length > 0) {
            setOutput(`Parsing Errors:\n${astResult.errors.map(err => `Line ${err.line}, Col ${err.column}: ${err.message}`).join('\n')}`);
            return;
        }

        const { output, env } = interpreter(astResult);
        setOutput(output);
        setEnv(env.vars);
    };

    return (
        <div className="App">
            <header className="app-header">
                <h1>NanoBasic v0.1</h1>
                <p>Your minimalistic BASIC interpreter.</p>
            </header>
            <main className="app-main">
                <div className="editor-section">
                    <NanoEditor initialCode={initCode} onChange={handleCodeChange} />
                </div>
                <div className="output-section">
                    <CodeOutput
                        output={output}
                        tokens={tokens}
                        ast={ast || undefined}
                        env={env}
                    />
                </div>
            </main>
        </div>
    );
}

export default App;
