module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'deprecation'],
  extends: ['plugin:@typescript-eslint/recommended'],
  rules: {
    "@typescript-eslint/indent": ["warn", 2],
    "no-console": "error",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/member-ordering": "error",
    "@typescript-eslint/no-use-before-define": "off",
    "@typescript-eslint/explicit-function-return-type":"off",
    "@typescript-eslint/camelcase": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-this-alias": "off",
    "deprecation/deprecation": "warn",
  },
  parserOptions: {
    "project": "./tsconfig.json"
  }
};