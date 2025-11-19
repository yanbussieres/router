import type { Context, Config } from "@netlify/edge-functions";

// Import the TanStack Start server
// Note: This may need to be adjusted based on the actual server export
const serverModule = await import("../../dist/server/server.js");

export default async (req: Request, context: Context) => {
  try {
    // The server exports a default object with a fetch method
    const server = serverModule.default;
    
    if (server && typeof server.fetch === "function") {
      return await server.fetch(req);
    }
    
    // Fallback: if the structure is different, try calling it directly
    if (typeof server === "function") {
      return await server(req);
    }
    
    throw new Error("Server export not found or invalid");
  } catch (error) {
    console.error("Error in TanStack Start Edge Function:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

export const config: Config = {
  path: "/*",
};

