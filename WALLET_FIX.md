# Pera Wallet Integration Fix

## Problem
The Pera Wallet SDK was failing to load with the error:
```
Uncaught ReferenceError: exports is not defined
```

This occurred because the downloaded SDK file was using CommonJS module syntax (`exports`) which doesn't work directly in browsers.

## Solution
Instead of downloading and serving the SDK locally, we're now using:

1. **ES Module Import Maps** - Modern browser feature that allows importing npm packages directly
2. **ESM.sh CDN** - A CDN that automatically converts npm packages to ES modules for browser use

## Changes Made

### 1. Updated HTML Files
Changed from local SDK file to ES module import:

```html
<!-- OLD: Local file with CommonJS -->
<script src="/static/js/pera-wallet.js"></script>

<!-- NEW: ES Module from CDN -->
<script type="importmap">
{
    "imports": {
        "@perawallet/connect": "https://esm.sh/@perawallet/connect@1.3.4"
    }
}
</script>
```

### 2. Updated Script Tags
Changed scripts to use ES module type:

```html
<!-- OLD -->
<script src="/static/js/wallet.js"></script>
<script src="/static/js/app.js"></script>

<!-- NEW -->
<script type="module" src="/static/js/wallet.js"></script>
<script type="module" src="/static/js/app.js"></script>
```

### 3. Updated wallet.js
Added ES module import at the top:

```javascript
// Import Pera Wallet Connect
import { PeraWalletConnect } from '@perawallet/connect';
```

Removed the `waitForSDK()` function since the import ensures the SDK is loaded.

## Browser Compatibility

Import maps are supported in:
- Chrome 89+
- Edge 89+
- Safari 16.4+
- Firefox 108+

For older browsers, you would need to use a bundler (webpack, vite, etc.) or a polyfill.

## Testing

1. Open browser console at `http://localhost:3000`
2. You should see: `Pera Wallet SDK initialized`
3. Click "Connect Wallet" button
4. Pera Wallet modal should appear

## Alternative Approaches

If ES modules don't work in your environment, consider:

1. **Use a bundler** (Vite, Webpack, Parcel) - Recommended for production
2. **Use Skypack CDN** - Another ES module CDN: `https://cdn.skypack.dev/@perawallet/connect`
3. **Build from source** - Clone the repo and build a browser bundle

## Files Modified

- `web/index.html` - Updated SDK loading and script tags
- `web/providers.html` - Updated SDK loading and script tags
- `web/static/js/wallet.js` - Added ES module import, removed waitForSDK
- `web/static/js/app.js` - Added waitForWalletManager function

## Next Steps

1. Test wallet connection in browser
2. Test transaction signing
3. Deploy escrow smart contract
4. Update `ESCROW_ADDRESS_PLACEHOLDER` in app.js with actual contract address
