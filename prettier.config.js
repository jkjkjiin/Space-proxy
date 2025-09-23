// Prettier configuration for Space-proxy
// See https://prettier.io/docs/en/options.html for all options
module.exports = {
    tabWidth: 4, // Use 4 spaces per indentation level
    useTabs: true, // Indent with tabs instead of spaces
    semi: true, // Add semicolons at the ends of statements
    singleQuote: true, // Use single quotes instead of double quotes
    trailingComma: 'none', // No trailing commas
    bracketSpacing: true, // Print spaces between brackets in object literals
    bracketSameLine: false, // Put > of multi-line JSX elements at the end of the last line
    arrowParens: 'avoid', // Omit parens when possible for single-arg arrow functions
    proseWrap: 'always', // Wrap prose if it exceeds the print width
    endOfLine: 'auto' // Maintain existing line endings (useful for cross-OS projects)
};
