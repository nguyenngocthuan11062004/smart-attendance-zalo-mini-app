/**
 * ESLint — tập trung bắt lỗi React Hooks (stale closure, thiếu dependency,
 * gọi hook sau early return). Đây là lớp bảo vệ tự động cho đúng loại bug UX
 * khó thấy nhất trong dự án này.
 *
 * Chạy:  npm install   (cài eslint + plugin)  rồi  npm run lint
 * Sửa dần các cảnh báo "react-hooks/exhaustive-deps" — mỗi cảnh báo là 1 nguy
 * cơ state cũ / effect chạy sai.
 */
module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["react-hooks"],
  rules: {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
  },
  ignorePatterns: [
    "dist",
    "node_modules",
    "*.config.*",
    "vite.config.*",
    "functions",
    "admin",
  ],
};
