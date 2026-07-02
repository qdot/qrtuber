import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: ({ browser }) => {
    const isChrome = browser === 'chrome';

    return {
      name: 'QRTuber',
      version: '0.0.1',
      short_name: 'QRTuber',
      description: 'Pick up QRCodes in video streams for data relay and device control.',
      permissions: isChrome
        ? ['storage', 'activeTab', 'scripting', 'offscreen']
        : ['storage', 'activeTab', 'scripting'],
      minimum_chrome_version: isChrome ? '109' : undefined,
      browser_specific_settings: isChrome
        ? undefined
        : {
            gecko: {
              id: 'qrtuber@nonpolynomial.com',
              strict_min_version: '115.0'
            }
          },
      content_security_policy: isChrome
        ? {
            extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
          }
        : "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
    };
  }
});
