import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// Environment validation function
function validateEnvironment(env: Record<string, string>) {
  const errors: string[] = [];

  // Check if API URL is configured
  if (!env.VITE_API_URL) {
    errors.push("VITE_API_URL is required but not set");
  } else if (!env.VITE_API_URL.match(/^(https?:\/\/|\/)/)) {
    errors.push(
      "VITE_API_URL must be a valid URL or path (starting with http://, https://, or /)"
    );
  }

  if (errors.length > 0) {
    console.error("❌ Frontend environment validation failed:");
    errors.forEach((error) => console.error(`  - ${error}`));
    console.error(
      "\n💡 Please check your .env file and ensure all required variables are set."
    );
    process.exit(1);
  }

  console.log("✅ Frontend environment validation passed");
  console.log(`🔧 API URL: ${env.VITE_API_URL}`);
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), "");

  // Validate environment variables
  validateEnvironment(env);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:8000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
