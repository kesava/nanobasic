import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import NanoEditor from './components/nanoeditor/nanoeditor';
import CodeOutput from './components/codeoutput/codeoutput';
import DebuggerPanel from './components/Debugger/DebuggerPanel';
import { useDebugger, useDebugMessages } from './hooks/useDebugger';
import lexer from './interpreter/lexer';
import parser from './interpreter/parser';
import interpreter from './interpreter/interpreter';
import { LexerOutput, TokenError, Token } from './interpreter/Token';
import { AST } from './interpreter/ast';
import { dbg } from './interpreter/Debugger';

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

    // Create ref for NanoEditor
    const editorRef = useRef<{ clearBreakpoints: () => void }>(null);

    // Use the debugger hook
    const {
        debuggerState,
        breakpoints,
        stats,
        callbacks: debuggerCallbacks,
    } = useDebugger({
        autoStart: true, // Always show debugger
        onStateChange: (state) => {
            console.log('Debugger state changed:', state);
        }
    });

    // Use debug messages hook
    const { addMessage } = useDebugMessages();

    // Enhanced callbacks that integrate with the app state
    const enhancedCallbacks = {
        ...debuggerCallbacks,
        onContinue: () => {
            addMessage('🎬 Continuing execution...');
            debuggerCallbacks.onContinue();
        },
        onStep: () => {
            addMessage('👣 Stepping to next statement...');
            debuggerCallbacks.onStep();
        },
        onPrintLocals: () => {
            addMessage('📊 Printing local variables...');
            debuggerCallbacks.onPrintLocals();
        },
        onBacktrace: () => {
            addMessage('📋 Generating call stack...');
            debuggerCallbacks.onBacktrace();
        },
        onClearBreakpoints: () => {
            addMessage('🗑️ All breakpoints cleared');
            debuggerCallbacks.onClearBreakpoints();
            // Also clear breakpoints in the editor
            editorRef.current?.clearBreakpoints();
        }
    };

    const handleCodeRun = async (newCode: string) => {
        console.log("Code run:", newCode);

        // Clear output immediately when code runs
        setOutput('');
        setEnv(null);
        addMessage(`🚀 Running code (${newCode.split('\n').length} lines)`);

        const lexResult = lexer(newCode);
        setTokens(lexResult);
        if (lexResult.errors.length > 0) {
            const errorMsg = `Lexing Errors:\n${lexResult.errors.map(err => `Line ${err.line}, Col ${err.column}: ${err.message} (Char: '${err.char}')`).join('\n')}`;
            setOutput(errorMsg);
            addMessage('❌ Lexing errors found');
            setAst(null);
            return;
        }

        const astResult = parser(lexResult);
        setAst(astResult);
        if (astResult.errors.length > 0) {
            const errorMsg = `Parsing Errors:\n${astResult.errors.map(err => `Line ${err.line}, Col ${err.column}: ${err.message}`).join('\n')}`;
            setOutput(errorMsg);
            addMessage('❌ Parsing errors found');
            return;
        }

        try {
            const { output, env } = await interpreter(astResult, dbg);
            setOutput(output);
            setEnv(env.vars);
            addMessage('✅ Execution completed successfully');
        } catch (error) {
            const errorMsg = `Runtime Error: ${error}`;
            setOutput(errorMsg);
            addMessage(`❌ Runtime error: ${error}`);
        }
    };


    // Set up continue callback for debugger
    useEffect(() => {
        const continueExecution = async () => {
            if (ast) {
                // Don't call resume() here - the continue() method already does that
                const { output, env } = await interpreter(ast, dbg);
                setOutput(output);
                setEnv(env.vars);
            }
        };

        const stepExecution = async () => {
            if (ast) {
                // Step execution should only execute one line at a time
                // The interpreter function will handle step mode appropriately
                const { output, env } = await interpreter(ast, dbg);
                setOutput(output);
                setEnv(env.vars);
            }
        };

        dbg.setOnContinueCallback(continueExecution);
        dbg.setOnStepCallback(stepExecution);
    }, [ast]); // Re-setup when AST changes


    return (
        <div className="App">
            <header className="app-header">
                <h1>NanoBasic v0.7</h1>
                <p>A minimalistic BASIC interpreter with an integrated debugger.</p>
                <div style={{ marginTop: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                        Status: {debuggerState.status} | Mode: {debuggerState.mode}
                        {debuggerState.isPaused && ' | ⏸️ PAUSED'}
                    </span>
                </div>
            </header>
            <main className="app-main">
                <div className="editor-section">
                    {/* @ts-ignore */}
                    <NanoEditor ref={editorRef} initialCode={initCode} onRun={handleCodeRun} />
                </div>
                <div className="output-section">
                    <CodeOutput
                        output={output}
                        tokens={tokens}
                        ast={ast || undefined}
                        env={env}
                    />
                </div>
                {/* Always show debugger */}
                <div className="debugger-section">
                    <DebuggerPanel
                        isVisible={true}
                        debuggerState={debuggerState}
                        breakpoints={breakpoints}
                        stats={stats}
                        callbacks={enhancedCallbacks}
                    />
                </div>
            </main>

            {/* Remove the overlay debugger panel */}
        </div>
    );
}

export default App;
