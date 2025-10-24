// CodeOutput component placeholder
import React from 'react';
import { JsonView, allExpanded, defaultStyles, collapseAllNested } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

const CodeOutput = ({
    output,
    tokens,
    ast,
    env,
}) => {
    return (
        <>
            <div
                className="code-output"
                dangerouslySetInnerHTML={{ __html: output }}
            ></div>

            <div className="debug-section">
                <h3>Environment:</h3>
                {env && <JsonView data={env} shouldExpandNode={allExpanded} style={defaultStyles} />}
                <h3>AST:</h3>
                {ast && <JsonView data={ast} shouldExpandNode={allExpanded} style={defaultStyles} />}
                <h3>Tokens:</h3>
                <JsonView data={tokens} shouldExpandNode={collapseAllNested} style={defaultStyles} />
            </div>
        </>
    );
}
export default CodeOutput;
