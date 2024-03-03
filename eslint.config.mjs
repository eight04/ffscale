import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    "rules": {
      "dot-notation": 2,
      "max-statements-per-line": 2,
      "no-console": 1,
      "quotes": [2, "double", "avoid-escape"],
      "semi": [2, "always"]
    },
  }
];
