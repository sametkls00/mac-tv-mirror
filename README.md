# Mac TV Mirror

[English](README.md) · [Türkçe](README.tr.md)

Share a Mac screen with a smart TV **through the TV's web browser**, over your own local network. No TV app, cloud relay, third-party JavaScript, or npm dependencies required.

**Status: experimental, v0.1.0.** This is a browser-based alternative, **not an AirPlay or Miracast implementation**. It does not add either protocol to a TV. Physical Tizen / Axen TV compatibility has not been verified; browser capabilities and performance vary by model.

## Features

- Share an entire screen or one window with explicit browser / macOS permission.
- WebRTC video between the two browsers, with H.264 preferred when available.
- Automatic JPEG compatibility mode if the TV cannot use WebRTC; approximately 3–5 fps under suitable conditions, at up to 1280 pixels wide.
- A randomly generated six-digit pairing code and one active receiver session.
- English and Turkish UI, switchable without reloading the page.
- No recording to disk; compatibility mode retains only the latest frame in memory.
- A small Node.js server built only with standard-library modules.

**Limitations:** video only, **no audio**; not suitable for latency-sensitive gaming or guaranteed smooth movie playback. DRM-protected services may show a black image. Sharing with multiple TVs is not supported.

## Requirements

- A Mac with **Node.js 22 or newer** and **Google Chrome**. Install Node from [nodejs.org](https://nodejs.org/) if needed.
- A TV browser with JavaScript, basic HTTP requests, and JPEG support. WebRTC is optional because a fallback is provided, but very old TV browsers may still be incompatible.
- Both devices on the same trusted private IPv4 network. Guest Wi-Fi and wireless client isolation can prevent access.

macOS + Chrome is the intended sender setup. Unit tests also run on Linux; that does not establish support for screen capture on every operating system or browser.

## Quick start

Download the repository, open a terminal in its folder, and run:

```sh
npm start
```

No package installation is needed to run the app. The server prints the Mac URL, the TV URL for **your** network, and a fresh pairing code.

1. On the Mac, open **http://localhost:8765/mac** in Chrome. Keep this tab open.
2. On the TV, type the **TV URL printed by the server** into the browser address bar, not its search box.
3. Enter the six-digit code shown on the Mac.
4. Click **Share my screen** on the Mac. Choose **Entire Screen** or a window and confirm **Share**.
5. On the TV, choose **Fullscreen** if its browser supports it.

If WebRTC cannot display the screen, the receiver requests compatibility mode after about 11 seconds. You can also select **No picture? Try compatibility mode** manually.

To stop the video, click **Stop sharing** on the Mac or use Chrome's built-in stop-sharing control. To close the local server, press **Control+C** in its terminal. Stop the server when you are finished.

Use the language selector on either page. You can also open the Mac page with `?lang=en` or `?lang=tr`; the TV page supports the same query parameter. Only the language preference is stored locally, not pairing tokens.

## macOS permissions

If requested, allow Chrome under **System Settings → Privacy & Security → Screen & System Audio Recording**. The exact name depends on the macOS version. Reopen Chrome if macOS asks you to.

If a local-network or firewall prompt appears, allow the necessary Chrome / Node connection only on your trusted network. **Do not disable the firewall entirely.** A firewall blocking the server can prevent the TV from loading the page.

## Network configuration

The server automatically chooses a private IPv4 address from physical-looking network interfaces, preferring common Wi-Fi / Ethernet names. It binds **only to loopback and the selected LAN address**, not every interface. On systems with several adapters, VPNs, or multiple private networks, check the printed address and override selection when necessary.

- **PORT** — server port; default **8765**. For example, use another port if the first copy of the app is already running:

  ```sh
  PORT=8766 npm start
  ```

- **TV_INTERFACE** — choose the adapter connected to the TV's network. On macOS, inspect adapter names with:

  ```sh
  networksetup -listallhardwareports
  TV_INTERFACE=en1 npm start
  ```

  The adapter name above is an example, not a universal Mac default.

- **TV_LAN_IP** — explicitly select a private IPv4 address **already assigned to this computer**. This takes precedence over the interface setting. Public addresses and addresses not assigned to the computer are rejected. Never copy someone else's TV URL.

If the Mac's address changes, restart the server and use the newly printed TV URL. Do not put runtime IP addresses, pairing codes, or tokens in public bug reports.

## Security and privacy

**Use only on a trusted private home network. Do not expose this server to the internet, forward its port, put it behind a public tunnel, or deploy it to a public hosting provider.** GitHub hosts the source; it should not host a running instance of this service.

- HTTP pages, signaling, pairing codes, and JPEG fallback images are **not TLS-encrypted**. WebRTC media uses its standard transport encryption, but unauthenticated HTTP signaling does not provide an end-to-end protection guarantee against a network attacker. A PIN is access control, not encryption.
- The server does not use external STUN / TURN servers, analytics, CDNs, or image storage. Browsers may still perform their own background network activity independently of this application.
- Sender controls and sender configuration are loopback-only. Origin / Host checks, random session tokens, request limits, and pairing rate limits provide additional safeguards, not a claim of a formal security audit.
- After the sender stops checking in, server-side sharing state expires in approximately 20 seconds. Stop the capture explicitly rather than relying on timeouts; an already established browser-to-browser connection is not controlled directly by the HTTP server.

See the [security policy](SECURITY.md) before reporting a vulnerability. Hide notifications and sensitive windows before sharing your screen.

## Troubleshooting

### The TV cannot open the page

Use the printed **LAN** URL on the TV, never localhost. Check Wi-Fi, guest-network isolation, the Mac's firewall, VPN routing, and browser local-network permissions. The Mac must stay awake and the server terminal must remain open. Do not weaken your router security or disable the firewall to work around this.

### The page opens, but the image is blank

Select a screen on the Mac, check macOS capture permissions, then try compatibility mode on the TV. This app cannot bypass DRM / HDCP restrictions. If it still fails, report the TV model, firmware, and visible error without private information.

### The picture is slow or has no sound

No audio is implemented. Compatibility mode intentionally prioritizes broad browser support over frame rate. Improve Wi-Fi signal quality or try a supported WebRTC browser; smooth playback is not guaranteed.

### The port is already in use

Stop your other copy, or choose another port as shown above. The default Mac URL changes when you change the port. A second copy cannot reuse the same address and port.

## Development and checks

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run test:browser
```

The lockfile contains no third-party dependencies. The optional browser smoke test requires installed Chrome and an assigned private LAN IPv4 address; it uses temporary ports and an isolated Chrome profile. Set **CHROME_PATH** to a browser executable if automatic discovery fails. It displays **synthetic canvas video**, never captures your real desktop, and covers English / Turkish switching, pairing, WebRTC, JPEG fallback, stop, and restart. These checks are not a physical TV certification.

GitHub Actions is configured for Node.js 22 and 24 unit checks on macOS / Linux, plus a Chrome smoke test on macOS. Hosted CI still needs to run in your repository; local passing tests do not mean a GitHub run has already passed.

## Project files

- [Local HTTP server](server.mjs) — pairing, signaling, access control, and the latest JPEG frame.
- [Sender page](public/sender.html) and [sender behavior](public/sender.js) — browser screen capture.
- [Receiver page](public/receiver.html) and [receiver behavior](public/receiver.js) — TV playback and fallback.
- [UI translations](public/i18n.js) — English sources and Turkish translations.
- [Server tests](test/server.test.mjs) and [browser checks](scripts/browser-smoke.mjs).

## Share and contribute

Ready to publish your own copy? Follow the [GitHub publishing guide — English / Türkçe](docs/PUBLISHING.md). Keep the repository contents at the repository root, including hidden configuration files. The npm package is deliberately private to prevent accidental registry publishing; this does **not** stop you from making the GitHub repository public.

Bug reports, TV compatibility reports, and translations are welcome. Read the [contribution guide](CONTRIBUTING.md) and [code of conduct](CODE_OF_CONDUCT.md). No official compatibility claim is made for Samsung, Axen, LG, Tizen, Apple, or any other vendor.

## License

[MIT](LICENSE) — you may use, modify, and redistribute the project under the license terms, without warranty. This project is independent and is not affiliated with Apple, Samsung, Axen, or other TV manufacturers.
