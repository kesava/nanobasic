// CodeOutput component placeholder
import React from 'react';

const CodeOutput = ({
    output = 'output will be shown here.'
}) => {
    return (
        <output
            className="code-output"
            dangerouslySetInnerHTML={{ __html: output }}
        />
    );
}
export default CodeOutput;
