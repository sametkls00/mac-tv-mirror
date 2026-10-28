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
    'Sharing profile': 'Paylaşım profili',
    'Movie / browser tab': 'Film / tarayıcı sekmesi',
    'Screen / presentation': 'Ekran / sunum',
    'Picture quality and performance': 'Görüntü kalitesi ve performans',
    'Resolution limit': 'Çözünürlük sınırı',
    'Auto (up to 1080p)': 'Otomatik (en fazla 1080p)',
    'Target frame rate': 'Hedef kare hızı',
    'Video quality': 'Görüntü kalitesi',
    'Low data': 'Düşük veri',
    'Balanced': 'Dengeli',
    'High quality': 'Yüksek kalite',
    'Adapt quality while preserving the selected FPS target': 'Seçilen FPS hedefini koruyarak kaliteyi uyarla',
    'Apply without stopping': 'Durdurmadan uygula',
    '60 FPS is a target, not a guarantee. Resolution keeps the source aspect ratio.': '60 FPS bir hedeftir, garanti değildir. Çözünürlük kaynak görüntünün en-boy oranını korur.',
    'Live video statistics': 'Canlı görüntü istatistikleri',
    'Selected target': 'Seçilen hedef',
    'Capture source': 'Yakalanan kaynak',
    'Encoded / sent video': 'Kodlanan / gönderilen görüntü',
    'Video bitrate': 'Görüntü veri hızı',
    'Network RTT': 'Ağ gidiş-dönüş süresi',
    'Packet loss': 'Paket kaybı',
    'Waiting for a live connection.': 'Canlı bağlantı bekleniyor.',
    'Measured FPS is not the selected target or a TV refresh-rate guarantee. RTT is network round-trip time, not end-to-end movie delay. Missing browser statistics are shown as —.': 'Ölçülen FPS, seçilen hedef veya TV yenileme hızı garantisi değildir. RTT ağ gidiş-dönüş süresidir; filmin uçtan uca gecikmesi değildir. Tarayıcının sağlamadığı istatistikler — ile gösterilir.',
    'The browser did not expose encoder controls. Capture limits still apply; actual output may differ.': 'Tarayıcı kodlayıcı kontrollerini sunmadı. Yakalama sınırları uygulanır; gerçek çıktı farklı olabilir.',
    'The browser rejected encoder limits. Capture continues; actual output may differ.': 'Tarayıcı kodlayıcı sınırlarını reddetti. Yakalama devam ediyor; gerçek çıktı farklı olabilir.',
    'Selected limits are active. Compare the target with the measured statistics below.': 'Seçilen sınırlar etkin. Hedefi aşağıdaki ölçülen istatistiklerle karşılaştır.',
    'Encoder controls are not available yet. Try again once the live connection is ready.': 'Kodlayıcı kontrolleri henüz hazır değil. Canlı bağlantı kurulunca tekrar dene.',
    'Settings applied without restarting screen or audio capture.': 'Ayarlar, ekran veya ses yakalaması yeniden başlatılmadan uygulandı.',
    'Applying settings to the current capture…': 'Ayarlar mevcut yakalamaya uygulanıyor…',
    'The browser rejected these settings. Previous settings were restored; sharing continues.': 'Tarayıcı bu ayarları reddetti. Önceki ayarlar geri yüklendi; paylaşım devam ediyor.',
    'Some settings could not be restored. Sharing continues; check measured output or select the source again.': 'Bazı ayarlar geri yüklenemedi. Paylaşım sürüyor; ölçülen çıktıyı kontrol et veya kaynağı yeniden seç.',
    'JPEG fallback: selected WebRTC FPS and bitrate limits do not apply.': 'JPEG uyumluluk modu: seçilen WebRTC FPS ve veri hızı sınırları uygulanmaz.',
    'Adaptive level {level}/3 · scale {scale}× · bitrate cap {bitrate} Mbps · FPS target {fps}': 'Uyarlama düzeyi {level}/3 · ölçek {scale}× · veri hızı sınırı {bitrate} Mbps · FPS hedefi {fps}',
    'Adaptive quality off · bitrate cap {bitrate} Mbps · FPS target {fps}': 'Uyarlanabilir kalite kapalı · veri hızı sınırı {bitrate} Mbps · FPS hedefi {fps}',
    'Encoder limits are unavailable. Only the measured output is reliable.': 'Kodlayıcı sınırları kullanılamıyor. Yalnızca ölçülen çıktıyı esas al.',
    'Selection changed. Press Apply without stopping to update the active stream.': 'Seçim değişti. Etkin akışı güncellemek için Durdurmadan uygula düğmesine bas.',
    'TV picture': 'TV görüntüsü',
    'Fit (keep everything)': 'Sığdır (tamamını göster)',
    'Fill (crop edges)': 'Doldur (kenarları kırp)',
    'Stretch (distorts)': 'Ger (oranı bozar)',
    'Hide controls during playback': 'Oynatma sırasında kontrolleri gizle',
    'Fit preserves proportions and may leave black bars.': 'Sığdır oranları korur; siyah boşluk kalabilir.',
    'Fill crops the source edges. Resolution and screen aspect ratio are different settings.': 'Doldur, kaynak görüntünün kenarlarını kırpar. Çözünürlük ve ekran en-boy oranı farklı ayarlardır.',
    'Stretch fills the TV but distorts the original proportions.': 'Ger, TV’yi doldurur ancak görüntünün özgün oranlarını bozar.',
    'Waiting for decoded-video statistics.': 'Çözülen görüntü istatistikleri bekleniyor.',
    'Press a remote key or move the pointer to show controls.': 'Kontroller için kumandadan bir tuşa bas veya imleci hareket ettir.',
    'JPEG fallback does not support 60 FPS or audio.': 'JPEG uyumluluk modu 60 FPS veya ses desteklemez.',
    'TV decoded video: {width} × {height} · {fps} FPS · {bitrate} Mbps (not panel refresh rate)': 'TV’de çözülen görüntü: {width} × {height} · {fps} FPS · {bitrate} Mbps (panel yenileme hızı değildir)',
    'Include tab audio when available': 'Kullanılabiliyorsa sekme sesini paylaş',
    "For movies, choose the Chrome tab playing the film and turn on Share tab audio in Chrome's picker. Keep the player and tab unmuted. Full-desktop audio is not guaranteed on macOS. No microphone is requested.": 'Film için Chrome’un paylaşım penceresinde filmin açık olduğu sekmeyi seç ve Sekme sesini paylaş seçeneğini aç. Oynatıcının ve sekmenin sesi açık kalsın. macOS’ta tüm masaüstünün sesi garanti edilmez. Mikrofon izni istenmez.',
    'Audio requires a captured audio track, WebRTC support, and Enable sound on the TV. JPEG compatibility mode is silent at roughly 3–5 fps and is not intended for movies. Protected content may appear black.': 'Ses için yakalanmış bir ses izi, WebRTC desteği ve TV’de Sesi aç onayı gerekir. Yaklaşık 3–5 kare/sn çalışan JPEG uyumluluk modu sessizdir; film için uygun değildir. Korumalı içerik siyah görünebilir.',
    'No screen or audio is being captured.': 'Şu anda ekran veya ses yakalanmıyor.',
    'JPEG compatibility mode cannot send audio. Use a WebRTC-capable TV browser for movies.': 'JPEG uyumluluk modu ses gönderemez. Film için WebRTC destekleyen bir TV tarayıcısı gerekir.',
    'Audio track captured. Choose Enable sound on the TV. Keep the source player and tab unmuted.': 'Ses izi yakalandı. TV’de Sesi aç düğmesine bas. Kaynak oynatıcının ve sekmenin sesi açık kalsın.',
    'No audio track was provided. Stop and share the film tab again with Share tab audio enabled.': 'Ses izi alınamadı. Paylaşımı durdur ve filmin sekmesini Sekme sesini paylaş açıkken yeniden paylaş.',
    'Audio sharing is off. Only video is being captured.': 'Ses paylaşımı kapalı. Yalnızca görüntü yakalanıyor.',
    'Live connection established. Check the audio status below.': 'Canlı bağlantı kuruldu. Aşağıdaki ses durumunu kontrol et.',
    'Enable sound': 'Sesi aç',
    'Mute sound': 'Sessize al',
    'Waiting for an audio track.': 'Ses izi bekleniyor.',
    'No audio track received. Enable Share tab audio on the Mac.': 'Ses izi alınmadı. Mac’te Sekme sesini paylaş seçeneğini aç.',
    'Audio received. Press Enable sound on this TV.': 'Ses alınıyor. Bu TV’de Sesi aç düğmesine bas.',
    'Sound enabled. Use the TV volume controls.': 'Ses açık. Ses düzeyini TV kumandasından ayarlayabilirsin.',
    'The TV blocked playback. Press Enable sound to retry on the TV.': 'TV oynatmayı engelledi. TV’de Sesi aç düğmesine basarak tekrar dene.',
    'JPEG compatibility mode has no audio and is not suitable for movies.': 'JPEG uyumluluk modunda ses yoktur; bu mod film izlemek için uygun değildir.',
    'Sound was blocked by the TV browser. Press Enable sound to retry. Video stays live.': 'TV tarayıcısı sesi engelledi. Sesi aç düğmesiyle tekrar dene. Canlı görüntü devam ediyor.',
    'Live screen · WebRTC': 'Canlı ekran · WebRTC',
    'HTTP is not encrypted. Use a trusted private network only. Do not expose this server to the internet.': 'HTTP bağlantısı şifreli değildir. Yalnızca güvendiğin özel ağda kullan. Bu sunucuyu internete açma.',
    'Screen sharing stopped.': 'Ekran paylaşımı durduruldu.',
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
