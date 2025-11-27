const fs = require("fs");
const path = require("path");

function loadEnvFile() {
  try {
    const envPath = path.resolve(__dirname, "..", ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      return content.split(/\r?\n/).reduce((acc, line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          return acc;
        }
        const delimiterIndex = trimmed.indexOf("=");
        if (delimiterIndex === -1) {
          return acc;
        }
        const key = trimmed.slice(0, delimiterIndex).trim();
        const value = trimmed.slice(delimiterIndex + 1).trim();
        if (key) {
          acc[key] = value;
        }
        return acc;
      }, {});
    }
  } catch (error) {
    // ignore read errors in test environment
  }
  return {};
}

const fileEnv = loadEnvFile();

module.exports = {
  API_BASE_URL:
    process.env.API_BASE_URL || fileEnv.API_BASE_URL || "",
  API_TIMEOUT_MS:
    process.env.API_TIMEOUT_MS || fileEnv.API_TIMEOUT_MS || "15000",
  ACCESS_TOKEN_KEY:
    process.env.ACCESS_TOKEN_KEY || fileEnv.ACCESS_TOKEN_KEY || "accessToken",
  REFRESH_TOKEN_KEY:
    process.env.REFRESH_TOKEN_KEY || fileEnv.REFRESH_TOKEN_KEY || "refreshToken",
};
