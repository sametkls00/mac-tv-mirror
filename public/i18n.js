'use strict';

// ES5 syntax keeps the receiver usable on older TV browsers.
(function () {
  var translations = {
    'Language': 'Dil',
    'Mac → TV · Local Screen Sharing': 'Mac → TV · Yerel Ekran Paylaşımı',
    'TV · Mac Screen': 'TV · Mac Ekranı',
    'LOCAL NETWORK ONLY · NO CLOUD SERVICE': 'YALNIZCA YEREL AĞDA · BULUT SERVİSİ YOK',
    'Mirror your Mac to your TV': 'Mac ekranını TV’ye yansıt',
    '1. Open this address in the TV browser': '1. TV tarayıcısında bu adresi aç',
    'Preparing address…': 'Adres hazırlanıyor…',
    'Enter this pairing code when prompted on the TV:': 'TV’de istendiğinde bu eşleştirme kodunu gir:',
    'Waiting for the TV.': 'TV bağlantısı bekleniyor.',
    'TV paired ✓': 'TV eşleştirildi ✓',
    '2. Choose what to share': '2. Paylaşılacak ekranı seç',
    'For the whole desktop, select Screen / Entire Screen in the browser dialog. You can also share a single window.': 'Tüm masaüstü için tarayıcı penceresinde Ekran / Entire Screen seç. Yalnızca bir pencereyi paylaşmak da mümkün.',
    'Share my screen': 'Ekranımı paylaş',
    'Stop sharing': 'Paylaşımı durdur',
    'Connecting to the local server…': 'Yerel sunucuya bağlanılıyor…',
    'Keep this page open. After selecting a screen, switch to the app you want to show. macOS may ask for screen recording and local network permissions for Chrome.': 'Bu sayfayı açık tut. Ekranı seçtikten sonra göstermek istediğin uygulamaya geç. macOS, Chrome için ekran kaydı ve yerel ağ izni isteyebilir.',
    'Video only — no audio. Protected content may appear black. If WebRTC is unavailable, compatibility mode sends roughly 3–5 frames per second.': 'Yalnızca görüntü aktarılır; ses yoktur. Korumalı içerik siyah görünebilir. WebRTC kullanılamazsa uyumluluk modu yaklaşık 3–5 kare/sn gönderir.',
    'HTTP is not encrypted. Use a trusted private network only. Do not expose this server to the internet.': 'HTTP bağlantısı şifreli değildir. Yalnızca güvendiğin özel ağda kullan. Bu sunucuyu internete açma.',
    'Screen sharing stopped.': 'Ekran paylaşımı durduruldu.',
    'Sending live video to the TV. No audio is transmitted.': 'TV’ye canlı görüntü aktarılıyor. Ses aktarılmıyor.',
    'WebRTC failed; the TV will try compatibility mode.': 'Akıcı bağlantı kurulamadı; TV uyumluluk modunu deneyecek.',
    'Open this page in Chrome on the Mac using its localhost address.': 'Bu sayfayı Mac’te Chrome ile localhost adresinden aç.',
    'Screen selected. Waiting for the TV…': 'Ekran seçildi. TV bağlantısı bekleniyor…',
    'Screen sharing was not allowed. Open System Settings → Privacy & Security → Screen & System Audio Recording and allow Chrome. You may need to reopen Chrome.': 'Ekran paylaşımına izin verilmedi. Sistem Ayarları → Gizlilik ve Güvenlik → Ekran ve Sistem Sesi Kaydı bölümünde Chrome’a izin ver. Chrome’u yeniden açman gerekebilir.',
    'The screen could not be captured. Check the macOS screen recording permission and restart Chrome if necessary.': 'Ekran yakalanamadı. macOS ekran kaydı iznini kontrol et; gerekirse Chrome’u yeniden başlat.',
    'Screen selection was cancelled.': 'Ekran seçimi iptal edildi.',
    'The sharing session ended. You can start again.': 'Paylaşım oturumu sona erdi. Yeniden başlatabilirsin.',
    'Sending compatibility images (roughly 3–5 fps, no audio).': 'Uyumluluk modunda görüntü aktarılıyor (yaklaşık 3–5 kare/sn, ses yok).',
    'Ready. Pair the TV or select a screen to begin.': 'Hazır. Başlamak için TV’yi eşleştir veya ekranı seç.',
    'Local connection error.': 'Yerel bağlantı hatası.',
    'Connection: {message}': 'Bağlantı: {message}',
    'MAC → TV · LOCAL CONNECTION': 'MAC → TV · YEREL BAĞLANTI',
    'Connect to your Mac': 'Mac ekranına bağlan',
    'Enter the six-digit code shown on the Mac sharing page.': 'Mac’teki paylaşım sayfasında görünen altı haneli kodu gir.',
    'Pairing code': 'Eşleştirme kodu',
    'Connect': 'Bağlan',
    'Waiting to pair with the Mac.': 'Mac ile eşleştirmeyi bekliyor.',
    'Connecting…': 'Bağlanılıyor…',
    'No picture? Try compatibility mode': 'Görüntü yoksa: uyumluluk modu',
    'Fullscreen': 'Tam ekran',
    'Cannot reach the Mac. Check that both devices are on the same Wi-Fi network.': 'Mac’e ulaşılamıyor. İki cihazın aynı Wi-Fi ağında olduğunu kontrol et.',
    'Waiting for a current image from the Mac…': 'Mac’ten güncel görüntü bekleniyor…',
    'Compatibility mode · Video only, no audio': 'Uyumluluk modu · Yalnızca görüntü, ses yok',
    'Preparing compatibility images…': 'Uyumluluk görüntüsü hazırlanıyor…',
    'Live screen · No audio': 'Canlı ekran · Ses aktarılmıyor',
    'Session ended. Reconnect using the current code on the Mac.': 'Oturum sona erdi. Mac’teki güncel kodla tekrar bağlan.',
    'Connecting to the Mac screen…': 'Mac ekranı bağlanıyor…',
    'Click “Share my screen” on the Mac.': 'Mac’te “Ekranımı paylaş” düğmesine bas.',
    'Sharing is off · Waiting for the Mac': 'Paylaşım kapalı · Mac’ten başlatılmasını bekliyor',
    'Use the TV browser menu to enter fullscreen.': 'Tam ekran için TV tarayıcısının menüsünü kullan.',
    'Request too large.': 'İstek çok büyük.',
    'A JSON request is required.': 'JSON isteği gerekli.',
    'Invalid JSON.': 'Geçersiz JSON.',
    'This action is only available on the Mac sharing page.': 'Bu işlem yalnızca Mac üzerindeki paylaşım sayfasından yapılabilir.',
    'TV pairing is required.': 'TV eşleştirmesi gerekli.',
    'Server address not allowed.': 'İzin verilmeyen sunucu adresi.',
    'Cross-site request blocked.': 'Siteler arası istek engellendi.',
    'Request origin could not be verified.': 'İstek kaynağı doğrulanamadı.',
    'Sharing settings are only available on the Mac.': 'Paylaşım ayarları yalnızca Mac üzerinde açılabilir.',
    'Too many attempts. Wait one minute.': 'Çok fazla deneme. Bir dakika bekle.',
    'Incorrect pairing code.': 'Eşleştirme kodu yanlış.',
    'Another TV is already paired. Close its page and wait one minute.': 'Başka bir TV zaten bağlı. Önce o sayfayı kapat ve bir dakika bekle.',
    'The sharing session has changed.': 'Paylaşım oturumu değişti.',
    'Invalid connection message.': 'Geçersiz bağlantı mesajı.',
    'Connection message limit exceeded.': 'Bağlantı mesajı sınırı aşıldı.',
    'A JPEG image is required.': 'JPEG görüntüsü gerekli.',
    'Sharing is not active.': 'Paylaşım etkin değil.',
    'Sharing has stopped.': 'Paylaşım sona erdi.',
    'Invalid JPEG image.': 'Geçersiz JPEG görüntüsü.',
    'Waiting for a current image.': 'Güncel görüntü bekleniyor.',
    'The sender page is only available on the Mac.': 'Gönderici sayfası yalnızca Mac üzerinde açılabilir.',
    'Page not found.': 'Sayfa bulunamadı.',
    'An error occurred on the local server.': 'Yerel sunucuda bir hata oluştu.'
  };
  var language = 'en';
  var dynamic = {};
  var nodes = [];
  try {
    var requested = new URL(window.location.href).searchParams.get('lang');
    var saved = localStorage.getItem('mac-tv-mirror-language');
    var preferred = requested || saved || navigator.language || 'en';
    language = /^tr/i.test(preferred) ? 'tr' : 'en';
  } catch (_) { language = /^tr/i.test(navigator.language || '') ? 'tr' : 'en'; }

  function translate(source, values) {
    var text = language === 'tr' && Object.prototype.hasOwnProperty.call(translations, source) ? translations[source] : source;
    return text.replace(/\{(\w+)\}/g, function (match, key) { return values && values[key] !== undefined ? String(values[key]) : match; });
  }
  function set(id, source, values) {
    var element = document.getElementById(id);
    dynamic[id] = { source: source, values: values };
    if (element) element.textContent = translate(source, values);
  }
  function apply() {
    document.documentElement.lang = language;
    for (var i = 0; i < nodes.length; i += 1) nodes[i].element.textContent = translate(nodes[i].source);
    for (var id in dynamic) {
      if (Object.prototype.hasOwnProperty.call(dynamic, id)) set(id, dynamic[id].source, dynamic[id].values);
    }
    var selector = document.getElementById('language');
    if (selector) selector.value = language;
  }
  var marked = document.querySelectorAll('[data-i18n]');
  for (var i = 0; i < marked.length; i += 1) nodes.push({ element: marked[i], source: marked[i].getAttribute('data-i18n') || marked[i].textContent });
  var selector = document.getElementById('language');
  if (selector) selector.onchange = function () {
    language = selector.value === 'tr' ? 'tr' : 'en';
    try { localStorage.setItem('mac-tv-mirror-language', language); } catch (_) { /* Storage can be disabled on TVs. */ }
    apply();
  };
  window.MirrorI18n = { t: translate, set: set, getLanguage: function () { return language; } };
  apply();
})();
