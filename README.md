# Mac TV Mirror

[English](README.md) · [Türkçe](README.tr.md)

Share a Mac screen with a smart TV **through the TV's web browser**, over your own local network. No TV app, cloud relay, third-party JavaScript, or npm dependencies required.

**Status: experimental, v0.1.0.** This is a browser-based alternative, **not an AirPlay or Miracast implementation**. It does not add either protocol to a TV. Physical Tizen / Axen TV compatibility has not been verified; browser capabilities and performance vary by model.

## Features

- Share an entire screen or one window with explicit browser / macOS permission.
- WebRTC video between the two browsers, with H.264 preferred when available.
- Optional captured-tab audio over the same WebRTC connection, with TV-side enable / mute controls. No microphone is requested.
- Selectable 15 / 24 / 30 / **60 FPS targets**, with a default 1080p/60 target. Limits are applied to capture and the WebRTC video sender where supported; they do not guarantee actual 60 FPS playback.
- Auto / 720p / 1080p resolution limits, three quality levels, and live changes without restarting audio capture. Rejected changes attempt to restore the previous limits.
- Adaptive quality lowers detail / bitrate first while retaining the selected FPS target, plus measured capture, encoded/sent, and TV-decoded statistics.
- TV **Fit / Fill / Stretch** controls and remote-friendly, automatically hidden playback controls.
- Automatic JPEG compatibility mode if the TV cannot use WebRTC; approximately 3–5 fps under suitable conditions, at up to 1280 pixels wide.
- A randomly generated six-digit pairing code and one active receiver session.
- English and Turkish UI, switchable without reloading the page.
- No recording to disk; compatibility mode retains only the latest frame in memory.
- A small Node.js server built only with standard-library modules.
- Optional Docker Compose packaging with separate local-only sender and LAN receiver ports. Capture remains in the Mac's Chrome browser, not the container.

**Limitations:** audio requires a browser-provided audio track and a WebRTC-capable TV browser. **JPEG fallback has no audio and is not suitable for movies.** Smooth movie playback and latency-sensitive gaming are not guaranteed. DRM-protected services may show a black image. Sharing with multiple TVs is not supported.

## Requirements

- A Mac with **Node.js 22 or newer** and **Google Chrome**. Install Node from [nodejs.org](https://nodejs.org/) if needed.
- A TV browser with JavaScript, basic HTTP requests, and JPEG support. WebRTC is optional because a fallback is provided, but very old TV browsers may still be incompatible.
- Both devices on the same trusted private IPv4 network. Guest Wi-Fi and wireless client isolation can prevent access.

macOS + Chrome is the intended sender setup. Unit tests also run on Linux; that does not establish support for screen capture on every operating system or browser.

## Easiest Mac startup (Docker)

1. Keep the project folder on your Mac and install Docker Desktop and Chrome.
2. Double-click [Start.command](Start.command). It starts Docker if necessary, selects a private LAN address, starts only this project's service, and opens the Mac page.
3. Open the **TV URL shown on the Mac page** on the TV. By default both addresses use **port 8768**: Mac **http://localhost:8768/mac**, TV **the Mac's private IP:8768**.
4. Enter the current pairing code, share the film's Chrome tab with **Share tab audio**, then press **Enable sound** on the TV.
5. Click **Stop sharing** to stop capture. Double-click [Stop.command](Stop.command) to close this application's service; Docker and unrelated containers stay running.

The terminal window can be closed after startup. If macOS blocks a downloaded launcher, use the native Node instructions below rather than disabling Gatekeeper. If archive extraction removed executable permissions, restore them in the project folder:

```sh
chmod +x Start.command Stop.command
```

The scripts use only a local Docker Engine, do not request admin rights, and do not install a login/background startup service. The first start needs internet to obtain the Node base image. Screen/audio capture never starts automatically. If your private IP changes, run Start again and refresh the TV using the newly shown URL.

## Native Node quick start

Download the repository, open a terminal in its folder, and run:

```sh
npm start
```

No package installation is needed to run the app. The server prints the Mac URL, the TV URL for **your** network, and a fresh pairing code.

1. On the Mac, open **http://localhost:8765/mac** in Chrome. Keep this tab open.
2. On the TV, type the **TV URL printed by the server** into the browser address bar, not its search box.
3. Enter the six-digit code shown on the Mac.
4. Click **Share my screen** on the Mac. For films, choose the film's **Chrome Tab** and enable **Share tab audio** in Chrome's picker. For desktop-only use, choose **Entire Screen** or a window instead.
5. If an audio track is available, select **Enable sound** on the TV using its remote, then choose **Fullscreen** if supported.

If WebRTC startup or negotiation stalls for about 11 seconds, the receiver requests compatibility mode. The negotiation deadline restarts when an offer arrives, so total startup can take longer. You can also select **No picture? Try compatibility mode** manually.

To stop the video, click **Stop sharing** on the Mac or use Chrome's built-in stop-sharing control. To close the local server, press **Control+C** in its terminal. Stop the server when you are finished.

Use the language selector on either page. You can also open the Mac page with `?lang=en` or `?lang=tr`; the TV page supports the same query parameter. Only the language preference is stored locally, not pairing tokens.

## Watching films with sound

1. Open a non-DRM film in a separate **Chrome tab**. Keep the player and the tab unmuted.
2. On the Mac sender page, select **Movie / browser tab** and leave **Include tab audio when available** enabled.
3. In Chrome's capture dialog, select the film's tab and explicitly enable **Share tab audio**. A request for audio is not a guarantee that the browser returns it.
4. Check the sender's audio status. If it says no audio track was provided, stop and choose the tab again with its audio enabled. Capturing a window or the whole Mac desktop does not guarantee system audio.
5. Pair the TV and press **Enable sound** there. TV browsers commonly require a local button click before audible playback. Adjust volume using the TV remote; **Mute sound** silences only the receiver.

The local preview always stays muted to avoid feedback; that does not mean the outgoing audio is muted. The app never requests a microphone, records audio to disk, or bypasses content protection. Audio and video travel in one WebRTC media stream; physical-TV A/V synchronization and sustained playback still need device testing.

If the TV falls back to JPEG images, there will be no sound and film playback will not be smooth. This is a capability limit, not something an audio toggle can fix. No external audio driver or native system-audio helper is installed by this feature.

## 60 FPS, quality, and different screen sizes

The default target is **1080p / 60 FPS / Balanced**. Use the sender's performance controls to select **15, 24, 30, or 60 FPS**, a resolution limit, and a quality level. While sharing, press **Apply without stopping**. The current screen and audio tracks are retained; you do not need to reselect the film merely to change these limits. If a change is rejected, the app attempts to restore the previous limits and explains if restoration was incomplete.

**60 FPS is a requested ceiling and cadence target, not a guaranteed result or frame interpolation.** A 24/30 FPS film does not acquire real extra detail just because 60 is selected. macOS / Chrome capture limits, encoder load, Wi-Fi, video complexity, and the TV decoder can all reduce actual cadence. If 1080p/60 is unstable, try **720p/60** before lowering FPS. A 4K TV does not require a 4K screen-sharing stream.

- **Resolution** limits capture dimensions while keeping the source proportions. A Mac screen with a different aspect ratio may produce dimensions such as 1152 × 720 rather than exactly 1280 × 720. No Mac display setting is changed.
- **Auto** uses a 1080p ceiling and enables adaptive quality. Adaptive mode waits for sustained congestion / encoding pressure, reduces bitrate and resolution scale first, and recovers gradually. It keeps the chosen FPS target, although the browser can still deliver fewer frames. It is not a guarantee against buffering or synchronization issues.
- **Statistics** distinguish the selected target, capture settings, measured encoded/sent FPS, and TV-decoded FPS. Video bitrate is measured over sampling intervals. RTT is network round-trip time, **not end-to-end A/V delay**. Missing values remain **—** rather than fabricated zeroes.
- **JPEG fallback** remains low-frame-rate and silent regardless of the selected 60 FPS target. Its JPEG size / compression follows the quality setting, but it is not a movie mode.

On the TV, choose:

- **Fit:** keep all content and original proportions; black bars may remain.
- **Fill:** fill the TV by cropping source edges.
- **Stretch:** fill the TV by distorting proportions; not recommended for films.

When aspect ratios differ, it is not possible to have no bars, no crop, and no distortion simultaneously. Films may also have their own cinematic letterboxing.

Playback controls hide after roughly 4.5 seconds of inactivity. A remote key, pointer movement, or touch brings them back; the first Enter wakes controls instead of activating an unseen button. Disable **Hide controls during playback** if your remote/browser does not behave well. Picture-fit and auto-hide preferences are stored locally, never pairing tokens or screen content.

## Optional Docker Compose

Native Node remains the simplest / lightest Mac setup. Docker packages only the small HTTP service; it does **not** capture the Mac, remove browser permissions, improve video encoding speed, or guarantee 60 FPS. It installs no audio / screen devices and mounts no Docker socket or host files.

With Docker Desktop / compatible local Docker Engine running, from the project folder:

```sh
export TV_LAN_IP="$(ipconfig getifaddr en0)"
docker compose up --build --detach
docker compose logs --tail 20 mirror
```

Use the adapter actually connected to the TV's network if it is not **en0**. The Compose variable must be the **Mac host's private LAN IPv4 address**, not the container's address. Mac **http://localhost:8768/mac** and the TV's printed LAN URL both use the **same public port, 8768**. Internally, Docker keeps separate sender and receiver listeners. Read the pairing code on the sender page; do not publish container logs containing the code.

If that port is in use, choose another public port **before** starting:

```sh
export APP_PORT=8770
docker compose up --build --detach
```

The supplied [Compose configuration](compose.yaml) publishes the same public port on two distinct host addresses: sender **only on 127.0.0.1**, receiver only on the chosen LAN IP. **Never replace these mappings with an all-interface binding or bypass the internal split.** The container trusts its dedicated sender listener; origin / Host checks do not replace correct port publication. Do not run the container entrypoint directly on a publicly reachable host. Screen/audio capture and WebRTC still run between the two real browsers.

For the double-click launchers' managed instance, use [Stop.command](Stop.command), or run:

```sh
docker compose --env-file .local-run/.env --project-name mac-tv-mirror down
```

The local environment file contains your current network address and stays ignored by Git. Do not publish it. The launchers will not replace a project owned by another checkout, and they do not kill other Node or Docker processes.

Stop it from the same shell / environment with:

```sh
docker compose down
```

The service has no automatic restart policy. The image includes only the allowlisted runtime source and license, not local logs, credentials, Git history, or captures. [Container access tests](test/docker.test.mjs) also run without Docker; an actual isolated container check is available via [the container test script](scripts/container-smoke.mjs) and GitHub Actions.

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

Confirm that WebRTC is active, the Mac reports a captured audio track, Chrome's **Share tab audio** was enabled, the source player / tab is unmuted, and **Enable sound** was selected on the TV. A missing audio track requires stopping and choosing the source again. If the TV rejects sound, retry its sound button; the app keeps live video rather than treating an autoplay restriction as a codec failure. Compatibility mode is always silent and intentionally prioritizes broad browser support over frame rate. Improve Wi-Fi signal quality or try a supported WebRTC browser; smooth playback is not guaranteed.

### The port is already in use

Stop your other copy, or choose another port as shown above. The default Mac URL changes when you change the port. A second copy cannot reuse the same address and port.

## Development and checks

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run test:browser
```

The lockfile contains no third-party dependencies. The optional browser smoke test requires installed Chrome and an assigned private LAN IPv4 address; it uses temporary ports and an isolated Chrome profile. Set **CHROME_PATH** to a browser executable if automatic discovery fails. It uses **synthetic canvas video and a generated test tone**, never your real desktop or microphone. It verifies decoded WebRTC audio energy, 60 FPS capture/encoder targets, live settings and rollback, simulated congestion response, measured statistics, TV fit / hidden-control behavior, both languages, JPEG fallback, and capture cleanup. The synthetic source need not actually run at 60 FPS; target application and measured output are tested separately. Test speaker output is muted. These checks are not a physical TV certification or a guarantee of macOS capture-picker capabilities.

GitHub Actions is configured for Node.js 22 and 24 unit checks on macOS / Linux, a Chrome smoke test on macOS, and an isolated Docker image/access check on Linux. Hosted CI still needs to run for your committed revision; local passing tests do not mean a GitHub run has already passed.

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
