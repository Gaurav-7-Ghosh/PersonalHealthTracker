// Artifact build only: React is a cdnjs global there and its UMD build has no jsx-runtime,
// so map the automatic JSX runtime onto React.createElement.
import React from 'react'
const jsx = (type, props, key) => React.createElement(type, key === undefined ? props : { ...props, key })
export { jsx, jsx as jsxs, jsx as jsxDEV }
export const Fragment = React.Fragment
