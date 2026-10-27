# Contributing / Katkı rehberi

[English README](README.md) · [Türkçe README](README.tr.md) · [Security / Güvenlik](SECURITY.md)

## English

Thank you for improving this experimental local-network tool. Bug reports, documentation fixes, translations, and honest device compatibility reports are welcome.

### Before opening an issue

- Read the README and its troubleshooting section.
- For security problems, follow the [security policy](SECURITY.md), not a public bug report.
- Include macOS, Chrome, Node.js, TV model, firmware, and whether WebRTC or JPEG mode was used.
- State clearly whether the result came from a physical TV or a synthetic browser test.
- Remove local IPs, pairing codes, tokens, notifications, personal screen content, and credentials from logs or screenshots.

### Local development

Use Node.js 22 or newer. There are no third-party dependencies, but installing from the lockfile keeps the workflow consistent:

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run test:browser
```

The browser test requires installed Chrome and a private LAN IPv4 address. It uses a separate temporary profile and synthetic canvas video. **Never remove the synthetic capture stub or add flags that auto-capture a contributor's real desktop.** Set **CHROME_PATH** if Chrome is installed in a nonstandard location.

### Pull request guidelines

- Keep changes focused, with tests for changed behavior.
- Preserve explicit capture consent, local-only operation, loopback-only sender controls, and pairing / origin checks.
- Keep receiver and translation scripts compatible with older TV JavaScript engines; do not introduce mandatory modern syntax or APIs without a fallback.
- Update both READMEs and the [UI translations](public/i18n.js) when user-facing behavior changes.
- Add no runtime dependency, cloud service, CDN, analytics, or external signaling server without discussing the trade-offs first.
- Do not claim vendor certification, audio support, or physical device compatibility without evidence.
- Contributions are submitted under the project's [MIT license](LICENSE). Preserve license notices and follow the [code of conduct](CODE_OF_CONDUCT.md).

The project does not require a Contributor License Agreement. Maintainers may request changes or decline features that conflict with the privacy model.

## Türkçe

Bu deneysel yerel ağ aracına hata bildirimi, belge düzeltmesi, çeviri ve dürüst cihaz uyumluluk raporlarıyla katkı verebilirsin.

### Issue açmadan önce

- README ve sorun giderme bölümünü oku.
- Güvenlik sorunlarını herkese açık issue yerine [güvenlik politikasına](SECURITY.md) göre bildir.
- macOS, Chrome, Node.js, TV modeli, yazılım sürümü ve WebRTC mi JPEG modu mu kullanıldığını belirt.
- Fiziksel TV ile mi yoksa yapay tarayıcı testiyle mi denediğini açıkça yaz.
- Günlük ve görüntülerden yerel IP, eşleştirme kodu, oturum anahtarı, bildirim, kişisel ekran içeriği ve kimlik bilgilerini çıkar.

### Yerel geliştirme

Node.js 22 veya üzeri kullan. Üçüncü taraf bağımlılığı yoktur; yine de kilit dosyasından kurulum geliştirme akışını tutarlı tutar:

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run test:browser
```

Tarayıcı testi için kurulu Chrome ve özel yerel IPv4 adresi gerekir. Ayrı geçici profil ve yapay canvas görüntüsü kullanılır. **Yapay yakalama kodunu kaldırma; katkıcının gerçek masaüstünü otomatik yakalayan bayrak ekleme.** Chrome standart konumda değilse **CHROME_PATH** kullan.

### Pull request kuralları

- Değişiklikleri odaklı tut ve değişen davranışı test et.
- Açık ekran iznini, yalnızca yerel kullanımı, loopback gönderici kontrollerini, eşleştirme ve kaynak kontrollerini koru.
- Alıcı ve çeviri kodunda eski TV JavaScript motorlarını gözet; uyumluluk alternatifi olmadan zorunlu modern sözdizimi veya API ekleme.
- Kullanıcı davranışı değişince iki README'yi ve [arayüz çevirilerini](public/i18n.js) güncelle.
- Çalışma anı bağımlılığı, bulut servisi, CDN, analitik veya harici sinyalleşme sunucusu eklemeden önce tartışma aç.
- Kanıt olmadan üretici sertifikası, ses desteği veya fiziksel cihaz uyumluluğu iddia etme.
- Katkılar projenin [MIT lisansı](LICENSE) altında sunulur. Lisans bildirimlerini koru ve [davranış kurallarına](CODE_OF_CONDUCT.md) uy.

Ayrı bir katkıcı lisans sözleşmesi istenmez. Bakımcılar gizlilik modeliyle çelişen değişiklikleri reddedebilir veya düzenleme isteyebilir.
