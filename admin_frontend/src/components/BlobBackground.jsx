import React, { useEffect, useRef } from 'react'

export default function BlobBackground() {
  const containerRef = useRef(null)
  const styleElRef = useRef(null)
  const scriptElRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Add the background container HTML (keeps markup minimal)
    container.innerHTML = `
      <div class="background-container">
        <div class="blob-bg" data-blob-count="3" data-colors='["#8F60BF", "#2DAFB7"]'></div>
      </div>
    `

    // Inject CSS styles and UI overrides for light blob background
    const style = document.createElement('style')
    style.textContent = `
      * { margin: 0; }

      /* Make sure the app's existing backgrounds are transparent so only blobs are visible */
      html, body, #root, .app-container { background: transparent !important; }
      /* App content must render above the blob background */
      #root, .app-container { position: relative; z-index: 1; }

      .background-container {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100vh;
        height: 100dvh;
        display: flex;
        flex-direction: column;
        gap: 1em;
        justify-content: center;
        align-items: center;
        font-family: system-ui, sans-serif;
        pointer-events: none;
        z-index: 0;
      }

      .blob-bg {
        position: absolute;
        inset: 0;
        height: 100%;
        width: 100%;
        filter: blur(80px) opacity(0.5);
        overflow: hidden;
        z-index: 0;
      }

      .blob {
        background-color: #8f60bf;
        position: absolute;
        border-radius: 50%;
        height: 25rem;
        width: 25rem;
        transform: translate(-50%, -50%);
        animation: blob-animation 60s alternate infinite;
        z-index: 0;
      }

      @keyframes blob-animation {
        0% { transform: translate(-50%, -50%); }
        20% { transform: translate(-20%, -70%); }
        60% { transform: translate(-70%, -50%); }
        80% { transform: translate(-20%, -30%); }
        100% { transform: translate(10%, -20%); }
      }

      /* ---------- Light-theme UI overrides when blob background is active ---------- */
      /* Logo and brand: use dark text so logo is visible on light background */
      :root:not([data-theme="dark"]) .brand-initials,
      :root:not([data-theme="dark"]) .brand-logo,
      :root:not([data-theme="dark"]) .prism-title,
      :root:not([data-theme="dark"]) .brand-title,
      :root:not([data-theme="dark"]) .brand-title.gradient {
        color: #111 !important;
      }
      :root:not([data-theme="dark"]) .brand-initials {
        background: #fff !important;
        box-shadow: 0 6px 18px rgba(3,10,20,0.06) !important;
      }

      /* Buttons: primary stays dark (black background, white text); other buttons use dark text */
      :root:not([data-theme="dark"]) .ant-btn-primary {
        background: #111 !important;
        border-color: #111 !important;
        color: #fff !important;
        box-shadow: 0 6px 18px rgba(2,6,23,0.06);
      }
      :root:not([data-theme="dark"]) .ant-btn {
        color: #111 !important;
        background: rgba(0,0,0,0.04) !important;
        border: 1px solid rgba(0,0,0,0.06) !important;
      }

      /* Central card / login module: make it a light card that fits the background */
      :root:not([data-theme="dark"]) .login-hero .ant-card,
      :root:not([data-theme="dark"]) .nfc-card,
      :root:not([data-theme="dark"]) .ant-card {
        background: rgba(255,255,255,0.94) !important;
        color: #111 !important;
        border-radius: 14px !important;
        box-shadow: 0 8px 24px rgba(3,10,20,0.06) !important;
        border: 1px solid rgba(0,0,0,0.06) !important;
      }
      /* Ensure headings and small text inside cards are dark */
      :root:not([data-theme="dark"]) .login-hero .ant-card .prism-title,
      :root:not([data-theme="dark"]) .login-hero .ant-card h1,
      :root:not([data-theme="dark"]) .nfc-card .card-title {
        color: #111 !important;
      }

      /* Remove character-by-character smoky animations */
      .smoky-root, .smoky-char {
        animation: none !important;
        transition: none !important;
        opacity: 1 !important;
        transform: none !important;
      }

      /* Hide other decorative animated background elements to avoid double backgrounds */
      :root:not([data-theme="dark"]) .app-header { background: transparent; border-bottom: none; }
      :root:not([data-theme="dark"]) .nfc-particles,
      :root:not([data-theme="dark"]) #projector,
      :root:not([data-theme="dark"]) .tubes-root,
      :root:not([data-theme="dark"]) .neural-root {
        display: none !important;
      }

      /* Make sure main content sits above blobs */
      #root, .app-container { position: relative; z-index: 1; }
    `
    document.head.appendChild(style)
    styleElRef.current = style

    // Force light theme so UI uses dark text on bright blob background
    try { document.documentElement.setAttribute('data-theme', 'light') } catch (e) {}

    // Inject JavaScript for blob generation
    const script = document.createElement('script')
    script.textContent = `
      (function() {
        const blobContainers = document.querySelectorAll(".blob-bg");

        const getSafePercentage = (margin) =>
          Math.round(Math.random() * (100 - 2 * margin)) + margin;

        const isJsonString = (str) => {
          try { return JSON.parse(str); } catch (e) { return false; }
        };

        blobContainers.forEach((blobBg) => {
          const safeAera = 5;
          const colors = isJsonString(blobBg.getAttribute("data-colors"));
          const blobCount = blobBg.getAttribute("data-blob-count");
          if (!colors || colors.length < 1) return;
          if (!blobCount || !parseInt(blobCount)) return;
          for (let i = 0; i < blobCount; i++) {
            const blob = document.createElement("div");
            blob.classList.add("blob");
            blob.style.top = getSafePercentage(safeAera) + "%";
            blob.style.left = getSafePercentage(safeAera) + "%";
            blob.style.animationDelay = (Math.random() - 0.5) * 10 * i + "s";
            blob.style.backgroundColor = colors[i % colors.length];
            blobBg.appendChild(blob);
          }
        });
      })();
    `
    document.body.appendChild(script)
    scriptElRef.current = script

    // cleanup on unmount
    return () => {
      try { scriptElRef.current && scriptElRef.current.remove() } catch (e) {}
      try { styleElRef.current && styleElRef.current.remove() } catch (e) {}
      if (container) { container.innerHTML = '' }
    }
  }, [])

  return <div ref={containerRef} className="blob-background" aria-hidden />
}
