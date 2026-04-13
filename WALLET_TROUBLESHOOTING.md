# Wallet Integration Troubleshooting

## Issue: "Pera Wallet SDK not loaded"

### Quick Fix

1. **Test SDK Loading**:
   - Open: http://localhost:3000/sdk-test.html
   - Check if SDKs load successfully
   - If they fail, check your internet connection

2. **Clear Browser Cache**:
   - Press `Ctrl + Shift + Delete` (Windows/Linux)
   - Press `Cmd + Shift + Delete` (Mac)
   - Clear cached images and files
   - Refresh the page (`Ctrl + F5` or `Cmd + Shift + R`)

3. **Check Browser Console**:
   - Press `F12` to open Developer Tools
   - Go to Console tab
   - Look for errors loading scripts
   - Should see: "SDKs loaded successfully"

### Common Causes

#### 1. CDN Blocked
**Symptom**: Scripts fail to load from unpkg.com

**Solution**:
- Check if your firewall/antivirus is blocking unpkg.com
- Try a different network
- Use a VPN if CDN is blocked in your region

#### 2. Browser Extensions
**Symptom**: Ad blockers or privacy extensions blocking scripts

**Solution**:
- Disable ad blockers for localhost
- Disable privacy extensions temporarily
- Try in Incognito/Private mode

#### 3. Slow Internet
**Symptom**: SDKs timeout before loading

**Solution**:
- Wait longer for page to load
- Check internet connection
- Refresh the page

#### 4. CORS Issues
**Symptom**: Console shows CORS errors

**Solution**:
- Already fixed with `crossorigin="anonymous"` attribute
- If still occurring, check browser security settings

### Verification Steps

1. **Open SDK Test Page**:
   ```
   http://localhost:3000/sdk-test.html
   ```

2. **Check Console Output**:
   ```javascript
   // Should see:
   ✅ Algorand SDK loaded successfully
   ✅ Pera Wallet SDK loaded successfully
   ✅ Pera Wallet initialized successfully
   ```

3. **Test Connection**:
   - Click "Test Pera Wallet Connection" button
   - Pera Wallet modal should open
   - If it opens, SDKs are working!

### Manual SDK Check

Open browser console (`F12`) and type:

```javascript
// Check Algorand SDK
typeof algosdk
// Should return: "object"

// Check Pera Wallet SDK
typeof PeraWalletConnect
// Should return: "function"

// Test initialization
new PeraWalletConnect({ chainId: 416002 })
// Should return: PeraWalletConnect object
```

### Alternative: Download SDKs Locally

If CDN continues to fail, download SDKs locally:

1. **Download Algorand SDK**:
   ```bash
   curl -o web/static/js/algosdk.min.js https://unpkg.com/algosdk@2.7.0/dist/browser/algosdk.min.js
   ```

2. **Download Pera Wallet SDK**:
   ```bash
   curl -o web/static/js/pera-wallet.min.js https://unpkg.com/@perawallet/connect@1.3.4/dist/index.umd.min.js
   ```

3. **Update HTML**:
   ```html
   <script src="/static/js/algosdk.min.js"></script>
   <script src="/static/js/pera-wallet.min.js"></script>
   ```

### Still Not Working?

1. **Check Server Logs**:
   ```bash
   # Look for 404 errors on SDK files
   ```

2. **Verify File Paths**:
   - Ensure `web/static/js/wallet.js` exists
   - Ensure `web/static/js/app.js` exists

3. **Test with Different Browser**:
   - Try Chrome, Firefox, or Edge
   - Some browsers have stricter security

4. **Check Network Tab**:
   - Open DevTools (`F12`)
   - Go to Network tab
   - Refresh page
   - Look for failed requests (red)
   - Check status codes

### Success Indicators

When everything works, you should see:

1. **Console Logs**:
   ```
   SDKs loaded successfully
   Pera Wallet SDK initialized
   ```

2. **No Errors**:
   - No red errors in console
   - All scripts load with 200 status

3. **Connect Button Works**:
   - Click "Connect Wallet"
   - Pera Wallet modal opens
   - QR code displays

### Getting Help

If still having issues:

1. **Check Console**:
   - Copy all error messages
   - Include in support request

2. **Check Network Tab**:
   - Screenshot failed requests
   - Note status codes

3. **System Info**:
   - Browser name and version
   - Operating system
   - Internet connection type

4. **Test Page Results**:
   - Visit http://localhost:3000/sdk-test.html
   - Screenshot the results
   - Include in support request

---

## Quick Reference

### Test URLs
- SDK Test: http://localhost:3000/sdk-test.html
- Homepage: http://localhost:3000
- Providers: http://localhost:3000/providers.html

### Console Commands
```javascript
// Check SDKs
console.log('algosdk:', typeof algosdk);
console.log('PeraWalletConnect:', typeof PeraWalletConnect);

// Test wallet
const wallet = new PeraWalletConnect({ chainId: 416002 });
console.log('Wallet:', wallet);
```

### Expected Behavior
1. Page loads
2. SDKs load from CDN
3. Console shows "SDKs loaded successfully"
4. Click "Connect Wallet"
5. Pera Wallet modal opens
6. Scan QR or use extension
7. Wallet connects
8. Address displays in UI

---

**Last Updated**: April 13, 2026
