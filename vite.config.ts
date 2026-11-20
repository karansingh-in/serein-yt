import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv } from 'vite';
import handler from './api/videos';

// The same handler runs on Vercel in production; this mounts it locally.
function localApi() {
  return async (req: IncomingMessage, res: ServerResponse, next?: () => void) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    await handler(Object.assign(req, { query: Object.fromEntries(url.searchParams) }), res);
    if (!res.writableEnded) next?.();
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // An explicit YT_KEY in the environment wins, including an empty one (fixtures).
  if (process.env.YT_KEY === undefined && env.YT_KEY) process.env.YT_KEY = env.YT_KEY;

  return {
    plugins: [
      {
        name: 'local-api',
        configureServer(server) {
          server.middlewares.use('/api/videos', localApi());
        },
        configurePreviewServer(server) {
          server.middlewares.use('/api/videos', localApi());
        },
      },
    ],
    build: { target: 'safari16' },
  };
});
