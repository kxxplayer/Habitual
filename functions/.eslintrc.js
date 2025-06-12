module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "*.local",
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    // Increase max-len to 140 for more flexibility
    "max-len": ["error", { code: 140, ignoreUrls: true, ignoreTemplateLiterals: true, ignoreRegExpLiterals: true, ignoreComments: true }],
    "indent": ["error", 2], // Enforce 2-space indentation
    "quotes": ["error", "double"], // Enforce double quotes
    "object-curly-spacing": ["error", "always"], // Enforce space inside object curly braces
    "comma-dangle": ["error", "always-multiline"], // Enforce trailing commas for multiline
    "eol-last": ["error", "always"], // Ensure newline at end of file
    "import/no-unresolved": 0,
    "require-jsdoc": 0, // Disable require-jsdoc if you don't use JSDoc comments
    "valid-jsdoc": 0, // Disable valid-jsdoc if you don't use JSDoc comments
    "@typescript-eslint/no-explicit-any": "off", // Allow 'any' type
  },
};

