import React, { useEffect, useState, useRef } from 'react';
import './NanoEditor.css';

const NanoEditor = ({ initialCode = '', onChange, currentLine = 10 }) => {
    const [code, setCode] = useState(initialCode);
    const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 });
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

        // Call the parent's onChange handler
        if (onChange) {
            onChange(joinAndPutLineNumbers(newCode));
        }

        // Restore cursor position after state update
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.setSelectionRange(cursorStart, cursorEnd);
            }
        }, 0);

        handleCursorChange(e);
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

    return (
        <div className="nano-editor">
            <div className="editor-container">
                <div className="line-numbers">
                    {lines.map((_, index) => (
                        <div key={index} className="line-number">
                            {(index + 1) * 10}
                        </div>
                    ))}
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
                &nbsp;<span className="left"><Debugger currentLine={currentLine} /></span>
                <span className="right">Ln {cursorPosition.line}, Col {cursorPosition.col}</span>
            </div>
        </div>
    );
};

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

// with current line indicator, play and pause buttons
const Debugger = ({ currentLine, playAction }) => {
    // use this to manage playing state
    const [playing, setPlaying] = useState(false);
    const handlePlay = () => {
        setPlaying(true);
        if (playAction) {
            playAction();
        }
    };
    const stopPlay = () => {
        setPlaying(false);
    };
    return (
        <div className="debugger">
            <span>Current Line: {currentLine}</span>
            <button onClick={handlePlay} disabled={playing}>▶️</button>
            <button onClick={stopPlay} disabled={!playing}>⏸️</button>
        </div>
    );
}
