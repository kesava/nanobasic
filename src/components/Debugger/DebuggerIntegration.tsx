import React from 'react';
import DebuggerPanel from './DebuggerPanel';
import { useDebugger, useDebugMessages } from '../../hooks/useDebugger';
import type { DebuggerState } from './DebuggerPanel';

/**
 * Example component showing how to integrate the DebuggerPanel
 * This would typically be integrated into App.tsx or wherever debugging is needed
 */
const DebuggerIntegration: React.FC = () => {
    // Use the debugger hook to manage state and callbacks
    const {
        debuggerState,
        breakpoints,
        stats,
        isVisible,
        callbacks,
        setVisible
    } = useDebugger({
        autoStart: false, // Don't show by default
        onStateChange: (state: DebuggerState) => {
            console.log('Debugger state changed:', state);
        }
    });

    // Use the debug messages hook to manage output
    const { messages, addMessage } = useDebugMessages();

    // Enhanced callbacks that also handle logging
    const enhancedCallbacks = {
        ...callbacks,
        onContinue: () => {
            addMessage('🎬 Continuing execution...');
            callbacks.onContinue();
        },
        onStep: () => {
            addMessage('👣 Stepping to next statement...');
            callbacks.onStep();
        },
        onPrintLocals: () => {
            addMessage('📊 Printing local variables...');
            callbacks.onPrintLocals();
        },
        onBacktrace: () => {
            addMessage('📋 Generating call stack...');
            callbacks.onBacktrace();
        },
        onClearBreakpoints: () => {
            addMessage('🗑️ Clearing all breakpoints...');
            callbacks.onClearBreakpoints();
        }
    };

    return (
        <div>
            {/* Main app content would go here */}
            <div style={{ padding: '20px' }}>
                <h1>NanoBasic Interpreter</h1>
                <p>This is where your main application would be.</p>
                
                {/* Debug control buttons */}
                <div style={{ marginBottom: '20px' }}>
                    <button 
                        onClick={() => setVisible(!isVisible)}
                        style={{
                            padding: '10px 20px',
                            marginRight: '10px',
                            backgroundColor: isVisible ? '#f44336' : '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {isVisible ? 'Hide Debugger' : 'Show Debugger'}
                    </button>
                    
                    <button 
                        onClick={() => addMessage(`Test message at ${new Date().toLocaleTimeString()}`)}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Add Test Message
                    </button>
                </div>

                {/* Debug messages display (optional) */}
                {messages.length > 0 && (
                    <div style={{
                        background: '#f5f5f5',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '10px',
                        maxHeight: '200px',
                        overflowY: 'auto'
                    }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Debug Messages:</h3>
                        {messages.map((msg: { id: string; text: string; timestamp: Date }) => (
                            <div key={msg.id} style={{ 
                                fontSize: '12px', 
                                marginBottom: '5px',
                                fontFamily: 'monospace'
                            }}>
                                <span style={{ color: '#666' }}>
                                    [{msg.timestamp.toLocaleTimeString()}]
                                </span> {msg.text}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* The DebuggerPanel component */}
            <DebuggerPanel
                isVisible={isVisible}
                debuggerState={debuggerState}
                breakpoints={breakpoints}
                stats={stats}
                callbacks={enhancedCallbacks}
            />
        </div>
    );
};

export default DebuggerIntegration;