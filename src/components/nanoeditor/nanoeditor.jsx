import React, { useState } from 'react';
import './NanoEditor.css';

    const NanoEditor = ({ initialCode = '', onChange }) => {
    const [code, setCode] = useState(initialCode);
    const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 });

    const lines = splitAndStripLineNumbers(code);

    const handleCodeChange = (e) => {
        const newCode = joinWithoutLineNumbers(splitAndStripLineNumbers(e.target.value));
        setCode(newCode);

        // Call the parent's onChange handler
        if (onChange) {
            onChange(joinAndPutLineNumbers(newCode));
        }

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
          className="editor"
          value={code}
          onChange={handleCodeChange}
          onSelect={handleCursorChange}
          onKeyUp={handleCursorChange}
          onClick={handleCursorChange}
          spellCheck={false}
        />
      </div>
      <div className="status-bar">
        <span>Ln {cursorPosition.line}, Col {cursorPosition.col}</span>
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
