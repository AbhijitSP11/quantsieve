import dotenv from "dotenv";

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Create a .env file with ${key}=your_api_key_here\n` +
        `See .env.example for reference.`
    );
  }
  return value;
}

export const env = {
  get ANTHROPIC_API_KEY(): string {
    return requireEnv("ANTHROPIC_API_KEY");
  },
};
