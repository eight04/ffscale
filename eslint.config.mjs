import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    "rules": {
      "dot-notation": 2,
      "max-statements-per-line": 2,
      "quotes": [2, "double", "avoid-escape"],
    },
    languageOptions: {
      globals: globals.node
    }
  }
];
