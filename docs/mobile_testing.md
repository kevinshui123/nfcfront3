Mobile testing
==============

How to test the NFC user flow on mobile

- Option 1 — Chrome DevTools device emulation:
  1. Open `http://localhost:5173/t/demo-token`
  2. Press F12 to open DevTools, toggle device toolbar (Ctrl+Shift+M)
  3. Choose an iPhone/Android profile and refresh the page

- Option 2 — Real device (recommended):
  1. Ensure your dev machine and phone are on the same LAN
  2. Start the frontend dev server (Vite) — it binds to localhost:5173 by default
  3. Find your machine IP (e.g., `192.168.1.42`) and open `http://192.168.1.42:5173/t/demo-token` from the phone browser

Notes:
- If you are logged in as admin in the desktop browser but want to test guest NFC flow on phone use private/incognito mode or remove `access_token` from localStorage.
- Deep-link behavior is simulated with fallback to web when the app is not present.


