import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import './NanoEditor.css';
import { dbg } from '../../interpreter/Debugger';

const NanoEditor = forwardRef(({ initialCode = '', onRun, currentLine = 10 }, ref) => {
    const [code, setCode] = useState(initialCode);
    const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 });
    const [breakpoints, setBreakpoints] = useState(new Set());
    const textareaRef = useRef(null);

    useEffect(() => {
        //convert to uppercase
        const upperCode = initialCode.toUpperCase();
        const newCode = joinWithoutLineNumbers(splitAndStripLineNumbers(upperCode));
        setCode(newCode);
    }, [initialCode]);

    const lines = splitAndStripLineNumbers(code);

    const handleCodeChange = (e) => {
        const textarea = e.target;
        const cursorStart = textarea.selectionStart;
        const cursorEnd = textarea.selectionEnd;

        const upperCode = e.target.value.toUpperCase();
        const newCode = joinWithoutLineNumbers(splitAndStripLineNumbers(upperCode));
        setCode(newCode);

        // Restore cursor position after state update
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.setSelectionRange(cursorStart, cursorEnd);
            }
        }, 0);

        handleCursorChange(e);
    };

    const handleRunClick = () => {
        if (onRun) {
            const codeWithLineNumbers = joinAndPutLineNumbers(code);
            onRun(codeWithLineNumbers);
        }
    };

    const handleCursorChange = (e) => {
        const textarea = e.target;
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = lines.join('\n').substring(0, cursorPos);
        const linesBeforeCursor = textBeforeCursor.split('\n');

        const line = linesBeforeCursor.length;
        const col = linesBeforeCursor[linesBeforeCursor.length - 1].length + 1;

        setCursorPosition({ line, col });
    };

    const toggleBreakpoint = (lineNumber) => {
        const newBreakpoints = new Set(breakpoints);
        // Convert BASIC line number (10,20,30) to sequential file line (1,2,3)
        const fileLineNumber = lineNumber / 10;

        if (newBreakpoints.has(lineNumber)) {
            newBreakpoints.delete(lineNumber);
            // Remove breakpoint using sequential file line number for AST
            dbg.removeBreakpoint({
                start: { line: fileLineNumber, column: 1 },
                end: { line: fileLineNumber, column: 1 }
            });
        } else {
            newBreakpoints.add(lineNumber);
            // Add breakpoint using sequential file line number for AST
            dbg.addBreakpoint({
                start: { line: fileLineNumber, column: 1 },
                end: { line: fileLineNumber, column: 1 }
            });
        }
        setBreakpoints(newBreakpoints);
    };

    // Expose clearBreakpoints method via ref
    useImperativeHandle(ref, () => ({
        clearBreakpoints: () => {
            setBreakpoints(new Set());
        }
    }));

    return (
        <div className="nano-editor">
            <div className="editor-container">
                <div className="line-numbers">
                    {lines.map((_, index) => {
                        const lineNumber = (index + 1) * 10;
                        const hasBreakpoint = breakpoints.has(lineNumber);
                        return (
                            <div
                                key={index}
                                className={`line-number ${hasBreakpoint ? 'breakpoint' : ''}`}
                                onClick={() => toggleBreakpoint(lineNumber)}
                                title={hasBreakpoint ? 'Click to remove breakpoint' : 'Click to add breakpoint'}
                            >
                                {hasBreakpoint && <span className="breakpoint-dot">●</span>}
                                {lineNumber}
                            </div>
                        );
                    })}
                </div>
                <textarea
                    ref={textareaRef}
                    className="editor"
                    value={code}
                    currentLine={currentLine}
                    onChange={handleCodeChange}
                    onSelect={handleCursorChange}
                    onKeyUp={handleCursorChange}
                    onClick={handleCursorChange}
                    spellCheck={false}
                />
            </div>
            <div className="status-bar">
                <span className="left">
                    <button className="run-button" onClick={handleRunClick}>
                        ▶️ Run
                    </button>
                </span>
                <span className="right">Ln {cursorPosition.line}, Col {cursorPosition.col}</span>
            </div>
        </div>
    );
});

export default NanoEditor;

const stripLineNumber = (line) => {
    return line.replace(/^\s*\d+\s*/, '');
};
const putLineNUmber = (line, number) => {
    return `${number} ${line}`;
};

const splitAndStripLineNumbers = (code) => code.split('\n').map(stripLineNumber);
const joinAndPutLineNumbers = code => code.split('\n').map((line, index) => putLineNUmber(line, (index + 1) * 10)).join('\n');
const joinWithoutLineNumbers = code => code.join('\n');
