import React, { useState } from 'react';
import './App.css';
import NanoEditor from './components/nanoeditor/nanoeditor';
import CodeOutput from './components/codeoutput/codeoutput';
import parser from './interpreter/parser';

function App() {
    const initCode = `10 PRINT "HELLO, WORLD!"
20 INPUT $A
30 PRINT "YOU ENTERED: "; $A
40 END`;
    const [tempcode, setTempcode] = useState(renderTokens(initCode));

    const handleCodeChange = (newCode: string) => {
        setTempcode(renderTokens(newCode));
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
                    <CodeOutput output={tempcode} />
                </div>
            </main>
        </div>
    );
}

const renderTokens = (code: string) => {
    const parsed = parser(code);
    return parsed.tokens.map(tokenLine => tokenLine.map(token => JSON.stringify(token)).join(' ')).join('<br/><br/>');
};

export default App;
