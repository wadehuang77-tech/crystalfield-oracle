import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, mergeConfig, type Plugin } from 'vite';
import baseConfig from './vite.config';

const testApi = 'https://crystalfield-maya-sandbox-api.wadehuang77.workers.dev';
const testFrontend = 'https://crystalfield-maya-sandbox.pages.dev';
const outputDirectory = 'dist-maya-test';
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://accounts.google.com https://ssl.gstatic.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://accounts.google.com https://fonts.googleapis.com",
  "img-src 'self' data: https://*.googleusercontent.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' ${testApi} https://accounts.google.com https://www.googleapis.com`,
  'frame-src https://accounts.google.com',
  "form-action 'self' https://payment-stage.ecpay.com.tw",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ');

function testOnlyAssets(): Plugin {
  return {
    name: 'maya-isolated-test-assets',
    configResolved(config) {
      if (resolve(config.root, config.build.outDir) !== resolve(outputDirectory)) {
        throw new Error('Maya test build cannot override the isolated output directory.');
      }
      if (config.define?.['import.meta.env.VITE_API_BASE'] !== JSON.stringify(testApi)) {
        throw new Error('Maya test build cannot override the test API definition.');
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const isolated = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (script) =>
          /googletagmanager\.com|gtag\(|fbq\(/.test(script) ? '' : script,
        ).replace(/<noscript>[\s\S]*?<\/noscript>/gi, '');
        return {
          html: isolated,
          tags: [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow, noarchive' }, injectTo: 'head' }],
        };
      },
    },
    async writeBundle(options) {
      if (!options.dir || resolve(options.dir) !== resolve(outputDirectory)) {
        throw new Error('Maya test output must use its separate dist-maya-test directory.');
      }
      await writeFile(resolve(options.dir, '_headers'), `/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Content-Security-Policy: ${csp}\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n`);
      await writeFile(resolve(options.dir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
      await writeFile(resolve(options.dir, 'maya-test-build.json'), JSON.stringify({
        purpose: 'Dreamspell isolated external test only',
        frontend_origin: testFrontend,
        api_origin: testApi,
        output_directory: outputDirectory,
        pages_project: 'crystalfield-maya-sandbox',
        production_analytics: false,
        indexable: false,
      }, null, 2));
    },
  };
}

export default defineConfig(({ mode }) => {
  if (mode !== 'maya-test') throw new Error('Use --mode maya-test with the isolated config.');
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if ((process.env.VITE_API_BASE ?? env.VITE_API_BASE) !== testApi) {
    throw new Error(`Maya test build requires VITE_API_BASE=${testApi}; no production fallback is allowed.`);
  }
  return mergeConfig(baseConfig, {
    plugins: [testOnlyAssets()],
    define: { 'import.meta.env.VITE_API_BASE': JSON.stringify(testApi) },
    build: { outDir: outputDirectory },
    server: { host: '127.0.0.1', strictPort: true },
  });
});
