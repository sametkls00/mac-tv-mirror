# Mac TV Mirror

[English](README.md) · [Türkçe](README.tr.md)

Mac ekranını, aynı yerel ağdaki akıllı televizyona **TV'nin internet tarayıcısı üzerinden** aktar. TV uygulaması, bulut aktarıcısı, üçüncü taraf JavaScript veya npm bağımlılığı gerekmez.

**Durum: deneysel, v0.1.0.** Bu, tarayıcı tabanlı bir alternatiftir; **AirPlay veya Miracast uygulaması değildir** ve TV'ye bu protokolleri eklemez. Fiziksel Tizen / Axen TV uyumluluğu doğrulanmamıştır; destek ve performans modele göre değişir.

## Özellikler

- Tarayıcı ve macOS izniyle tüm ekranı veya tek pencereyi paylaşma.
- İki tarayıcı arasında WebRTC görüntü aktarımı; kullanılabiliyorsa H.264 önceliği.
- WebRTC desteklenmiyorsa otomatik JPEG uyumluluk modu: uygun koşullarda yaklaşık 3–5 kare/sn, en fazla 1280 piksel genişlik.
- Rastgele üretilen altı haneli eşleştirme kodu ve aynı anda tek alıcı oturumu.
- Sayfayı yeniden yüklemeden değiştirilebilen Türkçe ve İngilizce arayüz.
- Diske görüntü kaydı yapılmaz; uyumluluk modunda yalnızca son kare bellekte tutulur.
- Yalnızca standart kütüphane kullanan küçük bir Node.js sunucusu.

**Sınırlar:** yalnızca görüntü, **ses aktarımı yoktur**. Gecikmeye duyarlı oyunlar veya kesinlikle akıcı film izleme için uygun değildir. DRM korumalı içerik siyah görünebilir. Aynı anda birden fazla TV desteklenmez.

## Gereksinimler

- **Node.js 22 veya üzeri** ve **Google Chrome** kurulu bir Mac. Gerekirse Node'u [nodejs.org](https://nodejs.org/) üzerinden yükle.
- JavaScript, temel HTTP istekleri ve JPEG destekleyen bir TV tarayıcısı. WebRTC zorunlu değildir; ancak çok eski TV tarayıcıları uyumluluk modunda da çalışmayabilir.
- Aynı, güvenilir özel IPv4 ağına bağlı iki cihaz. Misafir Wi-Fi ağı ve istemci izolasyonu bağlantıyı engelleyebilir.

Hedef gönderici ortamı macOS + Chrome'dur. Birim testlerinin Linux'ta da çalışması, her işletim sistemi veya tarayıcıda ekran yakalama desteği olduğu anlamına gelmez.

## Hızlı başlangıç

Depoyu indir, proje klasöründe terminal aç ve çalıştır:

```sh
npm start
```

Uygulamayı çalıştırmak için paket kurulumu gerekmez. Sunucu Mac adresini, **senin ağına ait** TV adresini ve yeni eşleştirme kodunu yazdırır.

1. Mac'te Chrome ile **http://localhost:8765/mac** adresini aç. Bu sekmeyi açık tut.
2. TV tarayıcısının **adres çubuğuna**, sunucunun yazdırdığı **TV adresini** yaz; arama kutusunu kullanma.
3. Mac'te görünen altı haneli kodu TV'de gir.
4. Mac'te **Ekranımı paylaş** düğmesine bas. **Ekran / Entire Screen** veya bir pencere seçip **Paylaş** ile onayla.
5. Destekleniyorsa TV'de **Tam ekran** düğmesine bas.

WebRTC görüntü vermezse yaklaşık 11 saniye sonra uyumluluk modu istenir. TV'deki **Görüntü yoksa: uyumluluk modu** düğmesini de kullanabilirsin.

Görüntüyü durdurmak için Mac'te **Paylaşımı durdur** düğmesine veya Chrome'un kendi paylaşımı durdurma kontrolüne bas. Yerel sunucuyu kapatmak için terminalde **Control+C** kullan. İşin bitince sunucuyu kapat.

Her iki sayfada dil seçicisi bulunur. Mac veya TV adresinin sonuna `?lang=tr` ya da `?lang=en` de ekleyebilirsin. Yerel depolamada yalnızca dil tercihi tutulur; eşleştirme anahtarları tutulmaz.

## macOS izinleri

İstenirse **Sistem Ayarları → Gizlilik ve Güvenlik → Ekran ve Sistem Sesi Kaydı** bölümünde Chrome'a izin ver. Menü adı macOS sürümüne göre değişebilir. macOS isterse Chrome'u yeniden aç.

Yerel ağ veya güvenlik duvarı izni sorulursa yalnızca güvenilir ağında gerekli Chrome / Node bağlantısına izin ver. **Güvenlik duvarını tamamen kapatma.** Sunucu bağlantısının engellenmesi, TV'nin sayfayı açmasını önleyebilir.

## Ağ yapılandırması

Sunucu yaygın Wi-Fi / Ethernet adlarına öncelik vererek fiziksel görünen arayüzlerden özel IPv4 adresi seçer. Tüm arayüzler yerine **yalnızca loopback ve seçilen yerel ağ adresinde** dinler. Birden fazla adaptör, VPN veya özel ağ varsa yazdırılan adresi kontrol et; gerektiğinde seçimi elle belirle.

- **PORT** — sunucu portu; varsayılan **8765**. İlk kopya çalışıyorsa farklı bir port seçebilirsin:

  ```sh
  PORT=8766 npm start
  ```

- **TV_INTERFACE** — TV ile aynı ağa bağlı adaptörü seçer. macOS'ta adları görmek için:

  ```sh
  networksetup -listallhardwareports
  TV_INTERFACE=en1 npm start
  ```

  Yukarıdaki adaptör adı örnektir; her Mac'te doğru seçim değildir.

- **TV_LAN_IP** — **bu bilgisayara atanmış** özel bir IPv4 adresini doğrudan seçer. Adaptör ayarından önceliklidir. Herkese açık veya bilgisayara atanmamış adresler reddedilir. Başkasının TV adresini kopyalama.

Mac'in IP adresi değişirse sunucuyu yeniden başlat ve yeni TV adresini kullan. Çalışma anındaki IP adresini, eşleştirme kodunu ve oturum anahtarlarını herkese açık hata bildirimlerine ekleme.

## Güvenlik ve gizlilik

**Yalnızca güvendiğin özel ev ağında kullan. Bu sunucuyu internete açma, port yönlendirme yapma, herkese açık tünel kullanma veya genel bir barındırma servisine kurma.** GitHub kaynak kodunu barındırır; bu servisin çalışan bir kopyasını barındırmamalıdır.

- HTTP sayfaları, bağlantı mesajları, eşleştirme kodu ve JPEG görüntüleri **TLS ile şifrelenmez**. WebRTC görüntüsü kendi standart taşıma şifrelemesini kullanır; ancak kimliği doğrulanmamış HTTP sinyalleşmesi nedeniyle ağ saldırganına karşı uçtan uca koruma garantisi verilmez. PIN, erişim kontrolüdür; şifreleme değildir.
- Harici STUN / TURN sunucusu, analitik, CDN veya görüntü depolama servisi kullanılmaz. Tarayıcıların uygulamadan bağımsız arka plan ağ faaliyetleri olabilir.
- Gönderici ayarları ve kontrolleri yalnızca loopback üzerinden kullanılabilir. Origin / Host kontrolleri, rastgele oturum anahtarları, istek ve kod deneme sınırları ek önlemlerdir; resmi güvenlik denetimi iddiası değildir.
- Gönderici sunucuyla iletişimi keserse sunucu tarafındaki paylaşım durumu yaklaşık 20 saniyede kapanır. Zaman aşımına güvenmek yerine ekran yakalamayı kendin durdur; kurulmuş tarayıcılar arası bağlantıyı HTTP sunucusu doğrudan yönetmez.

Açık bildirmeden önce [güvenlik politikasını](SECURITY.md) oku. Paylaşım öncesi bildirimleri ve hassas pencereleri gizle.

## Sorun giderme

### TV sayfayı açamıyor

TV'de localhost değil, yazdırılan **yerel ağ adresini** kullan. Wi-Fi, misafir ağı izolasyonu, Mac güvenlik duvarı, VPN yönlendirmesi ve tarayıcı yerel ağ izinlerini kontrol et. Mac uyanık, sunucu terminali açık kalmalı. Çözüm olarak yönlendirici güvenliğini zayıflatma veya güvenlik duvarını kapatma.

### Sayfa açılıyor ama görüntü yok

Mac'te ekranı seç, macOS kayıt izinlerini kontrol et ve TV'de uyumluluk modunu dene. Uygulama DRM / HDCP korumasını aşamaz. Devam ederse TV modeli, yazılım sürümü ve görünen hatayı özel bilgi paylaşmadan bildir.

### Görüntü yavaş veya ses yok

Ses aktarımı uygulanmamıştır. Uyumluluk modu, yüksek kare hızından çok geniş tarayıcı desteğine öncelik verir. Wi-Fi sinyalini iyileştir veya WebRTC destekleyen tarayıcı dene; akıcı oynatma garanti edilmez.

### Port zaten kullanılıyor

Diğer kopyayı kapat veya yukarıdaki örnekle farklı port seç. Port değişince varsayılan Mac adresi de değişir. İki kopya aynı adres ve portu kullanamaz.

## Geliştirme ve kontroller

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run test:browser
```

Kilit dosyasında üçüncü taraf bağımlılığı yoktur. İsteğe bağlı tarayıcı testi, kurulu Chrome ve bilgisayara atanmış özel yerel IPv4 adresi gerektirir; geçici port ve ayrı Chrome profili kullanır. Otomatik seçim başarısızsa **CHROME_PATH** ile tarayıcı çalıştırılabilir dosyasını belirt. Test **yapay canvas görüntüsü** kullanır, gerçek masaüstünü yakalamaz. Türkçe / İngilizce geçişi, eşleştirme, WebRTC, JPEG modu, durdurma ve yeniden başlatmayı kontrol eder. Fiziksel TV uyumluluk sertifikası değildir.

GitHub Actions; macOS / Linux üzerinde Node.js 22 ve 24 birim kontrolleri, macOS'ta Chrome testi çalıştıracak şekilde hazırdır. GitHub'daki ilk iş akışı henüz senin deponda çalışmalıdır; yerel testlerin geçmesi GitHub çalışmasının zaten başarılı olduğu anlamına gelmez.

## Proje dosyaları

- [Yerel HTTP sunucusu](server.mjs) — eşleştirme, bağlantı mesajları, erişim kontrolü ve son JPEG karesi.
- [Gönderici sayfası](public/sender.html) ve [gönderici davranışı](public/sender.js) — tarayıcı ekran yakalaması.
- [Alıcı sayfası](public/receiver.html) ve [alıcı davranışı](public/receiver.js) — TV görüntüsü ve uyumluluk modu.
- [Arayüz çevirileri](public/i18n.js) — İngilizce kaynaklar ve Türkçe çeviriler.
- [Sunucu testleri](test/server.test.mjs) ve [tarayıcı kontrolleri](scripts/browser-smoke.mjs).

## Paylaşım ve katkı

Kendi kopyanı yayınlamak için [GitHub yayınlama rehberini — Türkçe / English](docs/PUBLISHING.md) kullan. Gizli yapılandırma dosyaları dahil klasörün içeriğini deponun köküne koy. npm paketi yanlışlıkla kayıt deposuna gönderilmesin diye özel işaretlenmiştir; bu, GitHub deposunu herkese açık yapmana **engel değildir**.

Hata, TV uyumluluk raporu ve çeviri katkıları kabul edilir. [Katkı rehberini](CONTRIBUTING.md) ve [davranış kurallarını](CODE_OF_CONDUCT.md) oku. Samsung, Axen, LG, Tizen, Apple veya başka bir üretici için resmi uyumluluk iddiası yoktur.

## Lisans

[MIT](LICENSE) — lisans koşullarına göre kullanabilir, değiştirebilir ve dağıtabilirsin; garanti verilmez. Projenin Apple, Samsung, Axen veya diğer TV üreticileriyle resmi bağlantısı yoktur.
