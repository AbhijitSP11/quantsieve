import "./config/env.js"; // load .env early
import app from "./api/server.js";

const PORT = Number(process.env["PORT"] ?? 3000);

app.listen(PORT, () => {
  console.log(`QuantSieve API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Evaluate:     POST http://localhost:${PORT}/api/evaluate`);
});
