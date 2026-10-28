# Mac TV Mirror

[English](README.md) · [Türkçe](README.tr.md)

Mac ekranını, aynı yerel ağdaki akıllı televizyona **TV'nin internet tarayıcısı üzerinden** aktar. TV uygulaması, bulut aktarıcısı, üçüncü taraf JavaScript veya npm bağımlılığı gerekmez.

**Durum: deneysel, v0.1.0.** Bu, tarayıcı tabanlı bir alternatiftir; **AirPlay veya Miracast uygulaması değildir** ve TV'ye bu protokolleri eklemez. Fiziksel Tizen / Axen TV uyumluluğu doğrulanmamıştır; destek ve performans modele göre değişir.

## Özellikler

- Tarayıcı ve macOS izniyle tüm ekranı veya tek pencereyi paylaşma.
- İki tarayıcı arasında WebRTC görüntü aktarımı; kullanılabiliyorsa H.264 önceliği.
- Aynı WebRTC bağlantısında isteğe bağlı sekme sesi; TV'de sesi açma / susturma kontrolü. Mikrofon izni istenmez.
- Seçilebilir 15 / 24 / 30 / **60 FPS hedefi**, varsayılan 1080p/60 hedefi. Destekleniyorsa yakalama ve WebRTC göndericisine uygulanır; gerçek 60 FPS oynatma garantisi değildir.
- Otomatik / 720p / 1080p sınırları, üç kalite düzeyi ve sesi yeniden başlatmadan canlı ayar değişimi. Reddedilen değişiklikte önceki sınırlar geri yüklenmeye çalışılır.
- Seçilen FPS hedefini koruyup önce ayrıntı / veri hızını düşüren uyarlanabilir kalite; yakalama, gönderim ve TV çözümleme ölçümleri.
- TV'de **Sığdır / Doldur / Ger** ve kumandayla geri gelen otomatik gizlenen oynatma kontrolleri.
- WebRTC desteklenmiyorsa otomatik JPEG uyumluluk modu: uygun koşullarda yaklaşık 3–5 kare/sn, en fazla 1280 piksel genişlik.
- Rastgele üretilen altı haneli eşleştirme kodu ve aynı anda tek alıcı oturumu.
- Sayfayı yeniden yüklemeden değiştirilebilen Türkçe ve İngilizce arayüz.
- Diske görüntü kaydı yapılmaz; uyumluluk modunda yalnızca son kare bellekte tutulur.
- Yalnızca standart kütüphane kullanan küçük bir Node.js sunucusu.
- Ayrı yerel gönderici ve LAN alıcısı portlarıyla isteğe bağlı Docker Compose paketi. Yakalama konteynerde değil Mac'in Chrome tarayıcısında yapılır.

**Sınırlar:** ses için tarayıcının bir ses izi sağlaması ve TV'nin WebRTC desteklemesi gerekir. **JPEG uyumluluk modunda ses yoktur; bu mod film için uygun değildir.** Akıcı film oynatma ve gecikmeye duyarlı oyun deneyimi garanti edilmez. DRM korumalı içerik siyah görünebilir. Aynı anda birden fazla TV desteklenmez.

## Gereksinimler

- **Node.js 22 veya üzeri** ve **Google Chrome** kurulu bir Mac. Gerekirse Node'u [nodejs.org](https://nodejs.org/) üzerinden yükle.
- JavaScript, temel HTTP istekleri ve JPEG destekleyen bir TV tarayıcısı. WebRTC zorunlu değildir; ancak çok eski TV tarayıcıları uyumluluk modunda da çalışmayabilir.
- Aynı, güvenilir özel IPv4 ağına bağlı iki cihaz. Misafir Wi-Fi ağı ve istemci izolasyonu bağlantıyı engelleyebilir.

Hedef gönderici ortamı macOS + Chrome'dur. Birim testlerinin Linux'ta da çalışması, her işletim sistemi veya tarayıcıda ekran yakalama desteği olduğu anlamına gelmez.

## Mac'te en kolay başlatma (Docker)

1. Proje klasörünü Mac'te tut; Docker Desktop ve Chrome kurulu olsun.
2. [Start.command](Start.command) dosyasına çift tıkla. Gerekirse Docker'ı açar, özel yerel ağ adresini seçer, yalnızca bu projenin servisini başlatır ve Mac sayfasını açar.
3. Mac sayfasında yazan **TV adresini** TV'de aç. Varsayılan iki adres de **8768 portunu** kullanır: Mac **http://localhost:8768/mac**, TV **Mac'in özel IP adresi:8768**.
4. Güncel eşleştirme kodunu gir; film sekmesini **Sekme sesini paylaş** açıkken paylaş ve TV'de **Sesi aç** düğmesine bas.
5. Yakalamayı kapatmak için **Paylaşımı durdur** kullan. Uygulama servisini tamamen kapatmak için [Stop.command](Stop.command) dosyasına çift tıkla; Docker ve diğer konteynerler açık kalır.

Başlatma bitince terminal penceresini kapatabilirsin. macOS indirilmiş dosyayı engellerse Gatekeeper'ı kapatmak yerine aşağıdaki doğrudan Node yolunu kullan. ZIP çıkarma çalıştırma iznini kaldırdıysa proje klasöründe:

```sh
chmod +x Start.command Stop.command
```

Betikler yalnızca yerel Docker Engine kullanır; yönetici izni veya oturum açılışına servis kurulumu istemez. İlk açılışta Node temel imajı için internet gerekir. Ekran/ses otomatik paylaşılmaz. Özel IP değişirse Start'ı tekrar çalıştırıp TV'yi yeni adresle yenile.

## Doğrudan Node ile hızlı başlangıç

Depoyu indir, proje klasöründe terminal aç ve çalıştır:

```sh
npm start
```

Uygulamayı çalıştırmak için paket kurulumu gerekmez. Sunucu Mac adresini, **senin ağına ait** TV adresini ve yeni eşleştirme kodunu yazdırır.

1. Mac'te Chrome ile **http://localhost:8765/mac** adresini aç. Bu sekmeyi açık tut.
2. TV tarayıcısının **adres çubuğuna**, sunucunun yazdırdığı **TV adresini** yaz; arama kutusunu kullanma.
3. Mac'te görünen altı haneli kodu TV'de gir.
4. Mac'te **Ekranımı paylaş** düğmesine bas. Film için **Chrome Sekmesi** bölümünden film sekmesini seç ve Chrome'un **Sekme sesini paylaş** seçeneğini aç. Yalnızca masaüstü görüntüsü için ekran veya pencere seçebilirsin.
5. Ses izi varsa TV kumandasıyla **Sesi aç** düğmesine bas; destekleniyorsa **Tam ekran** seçeneğini kullan.

WebRTC başlangıcı veya bağlantı görüşmesi yaklaşık 11 saniye ilerlemezse uyumluluk modu istenir. Bağlantı teklifi geldiğinde görüşme süresi yeniden başlar; toplam açılış daha uzun sürebilir. TV'deki **Görüntü yoksa: uyumluluk modu** düğmesini de kullanabilirsin.

Görüntüyü durdurmak için Mac'te **Paylaşımı durdur** düğmesine veya Chrome'un kendi paylaşımı durdurma kontrolüne bas. Yerel sunucuyu kapatmak için terminalde **Control+C** kullan. İşin bitince sunucuyu kapat.

Her iki sayfada dil seçicisi bulunur. Mac veya TV adresinin sonuna `?lang=tr` ya da `?lang=en` de ekleyebilirsin. Yerel depolamada yalnızca dil tercihi tutulur; eşleştirme anahtarları tutulmaz.

## Film ve ses paylaşımı

1. DRM koruması olmayan filmi ayrı bir **Chrome sekmesinde** aç. Oynatıcının ve sekmenin sesi açık kalsın.
2. Mac gönderici sayfasında **Film / tarayıcı sekmesi** profilini seç; **Kullanılabiliyorsa sekme sesini paylaş** açık kalsın.
3. Chrome'un paylaşım penceresinde film sekmesini seç ve **Sekme sesini paylaş** seçeneğini açıkça etkinleştir. Ses istenmesi, tarayıcının mutlaka ses izi sağlayacağı anlamına gelmez.
4. Mac'teki ses durumunu kontrol et. Ses izi alınamadığı yazıyorsa durdur ve sekmeyi ses seçeneği açıkken yeniden paylaş. Bir pencereyi veya tüm Mac masaüstünü seçmek sistem sesini garanti etmez.
5. TV'yi eşleştirip kumandadan **Sesi aç** düğmesine bas. TV tarayıcıları sesli oynatma için genellikle kendi sayfasında bir düğmeye basılmasını ister. Ses düzeyini TV kumandasından ayarla; **Sessize al** yalnızca alıcıyı susturur.

Yankıyı önlemek için Mac'teki önizleme her zaman sessizdir; bu, gönderilen sesin kapalı olduğu anlamına gelmez. Uygulama mikrofon istemez, sesi diske kaydetmez ve içerik korumasını aşmaz. Ses ve görüntü aynı WebRTC medya akışında taşınır; fiziksel TV'deki senkronizasyon ve uzun süreli oynatma ayrıca denenmelidir.

TV JPEG uyumluluk moduna geçerse ses gelmez ve film akıcı olmaz. Bu, bir ses düğmesiyle çözülebilecek bir ayar değil, yetenek sınırıdır. Bu özellik harici ses sürücüsü veya yerel sistem sesi yardımcısı yüklemez.

## 60 FPS, kalite ve farklı ekran boyutları

Varsayılan hedef **1080p / 60 FPS / Dengeli**. Göndericideki performans kontrollerinden **15, 24, 30 veya 60 FPS**, çözünürlük sınırı ve kalite düzeyi seç. Paylaşım sürerken **Durdurmadan uygula** düğmesine bas. Mevcut ekran ve ses izleri korunur; yalnızca bu sınırları değiştirmek için filmi yeniden seçmen gerekmez. Değişiklik reddedilirse önceki sınırlar geri yüklenmeye çalışılır; eksik geri yükleme varsa açıkça belirtilir.

**60 FPS istenen üst sınır ve kare hızı hedefidir; sonuç garantisi veya ara kare üretimi değildir.** 24/30 FPS film, 60 seçildiğinde yeni gerçek görüntü ayrıntısı kazanmaz. macOS / Chrome yakalaması, kodlayıcı yükü, Wi-Fi, görüntü karmaşıklığı ve TV çözücüsü gerçek hızı düşürebilir. 1080p/60 kararsızsa FPS'i düşürmeden önce **720p/60** dene. TV'nin 4K olması, paylaşımın da 4K olmasını gerektirmez.

- **Çözünürlük**, kaynağın oranlarını koruyarak yakalama boyutlarını sınırlar. En-boy oranı farklı Mac ekranında 1280 × 720 yerine 1152 × 720 gibi boyutlar oluşabilir. Mac'in ekran ayarı değiştirilmez.
- **Otomatik**, 1080p tavanıyla uyarlanabilir kaliteyi açar. Kalıcı ağ / kodlama baskısında önce veri hızı ve çözünürlük ölçeği düşürülür; toparlanma kademelidir. FPS hedefi korunur ama tarayıcı yine daha az kare gönderebilir. Takılma veya senkronizasyon garantisi verilmez.
- **İstatistikler**, seçilen hedefi, yakalama ayarını, ölçülen kodlanan/gönderilen FPS'i ve TV'de çözülen FPS'i ayrı gösterir. Görüntü veri hızı örnekleme aralıklarından hesaplanır. RTT ağ gidiş-dönüş süresidir; **uçtan uca ses/görüntü gecikmesi değildir**. Eksik bilgi uydurulmuş sıfır yerine **—** görünür.
- **JPEG uyumluluk modu**, 60 FPS seçilse de düşük kare hızlı ve sessizdir. JPEG boyutu / sıkıştırması kalite seçimine uyar; film modu değildir.

TV'deki seçenekler:

- **Sığdır:** tüm içeriği ve oranları korur; siyah boşluk kalabilir.
- **Doldur:** kenarlardan kırparak TV'yi doldurur.
- **Ger:** oranları bozarak TV'yi doldurur; film için önerilmez.

Oranlar farklıyken aynı anda boşluksuz, kırpmasız ve bozulmasız görüntü mümkün değildir. Filmin kendi sinema oranından kaynaklanan bantlar da olabilir.

Kontroller yaklaşık 4,5 saniye hareketsizlikte gizlenir. Kumanda tuşu, imleç hareketi veya dokunma geri getirir; ilk Enter görünmeyen düğmeyi çalıştırmak yerine kontrolleri uyandırır. Kumanda/tarayıcı uyumsuzsa **Oynatma sırasında kontrolleri gizle** seçeneğini kapat. Yerleşim ve gizleme tercihleri yerelde tutulur; oturum anahtarı veya ekran içeriği saklanmaz.

## İsteğe bağlı Docker Compose

Mac'te doğrudan Node en hafif ve basit yoldur. Docker yalnızca küçük HTTP servisini paketler; Mac ekranını yakalamaz, izinleri kaldırmaz, kodlamayı hızlandırmaz veya 60 FPS garanti etmez. Ses/ekran aygıtı yüklenmez; Docker soketi veya bilgisayar dosyaları bağlanmaz.

Docker Desktop / uyumlu yerel Docker Engine açıkken proje klasöründe:

```sh
export TV_LAN_IP="$(ipconfig getifaddr en0)"
docker compose up --build --detach
docker compose logs --tail 20 mirror
```

TV ile aynı ağa bağlı adaptör **en0** değilse doğru adaptörü kullan. Compose değişkeni konteynerin değil **Mac'in özel yerel IPv4 adresi** olmalıdır. Mac **http://localhost:8768/mac** ile TV'nin yazdırılan LAN adresi **aynı dış portu, 8768'i** kullanır. Docker içinde gönderici/alıcı ayrı kalır. Kodu Mac gönderici sayfasından oku; kod içeren konteyner günlüklerini yayınlama.

Port doluysa başlamadan önce başka bir dış port seç:

```sh
export APP_PORT=8770
docker compose up --build --detach
```

Sağlanan [Compose yapılandırması](compose.yaml), aynı dış portu iki farklı adreste yayınlar: gönderici **yalnızca 127.0.0.1**, alıcı ise seçilen LAN IP'sinde. **Bunları tüm arayüzlere açılan bir eşlemeyle değiştirme; içerideki ayrımı kaldırma.** Konteyner, ayrılmış gönderici girişine güvenir; Origin / Host kontrolleri doğru port yayınının yerini tutmaz. Konteyner giriş programını herkese açık bir sunucuda doğrudan çalıştırma. Ekran/ses yakalama ve WebRTC iki gerçek tarayıcı arasında kalır.

Çift tıklama dosyalarının yönettiği kopyayı [Stop.command](Stop.command) ile veya şu komutla kapat:

```sh
docker compose --env-file .local-run/.env --project-name mac-tv-mirror down
```

Yerel ortam dosyası güncel ağ adresini içerir ve Git dışında tutulur; yayınlama. Başlatıcılar başka klasörün projesinin üzerine yazmaz, diğer Node veya Docker süreçlerini öldürmez.

Aynı terminal / ortamdan durdurmak için:

```sh
docker compose down
```

Otomatik yeniden başlatma politikası yoktur. İmaj yalnızca izin listesindeki çalışma kodunu ve lisansı içerir; yerel günlük, kimlik bilgisi, Git geçmişi veya yakalama içermez. [Konteyner erişim testleri](test/docker.test.mjs) Docker olmadan da çalışır; gerçek izole konteyner kontrolü [test betiğinde](scripts/container-smoke.mjs) ve GitHub Actions'ta bulunur.

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

WebRTC'nin etkin olduğunu, Mac'in ses izi yakaladığını, Chrome'da **Sekme sesini paylaş** seçildiğini, kaynak oynatıcı / sekmenin sessiz olmadığını ve TV'de **Sesi aç** düğmesine basıldığını kontrol et. Ses izi yoksa paylaşımı durdurup kaynağı yeniden seçmek gerekir. TV sesi reddederse ses düğmesini yeniden dene; uygulama bu otomatik oynatma kısıtını codec hatası sayıp canlı görüntüyü kapatmaz. Uyumluluk modu her zaman sessizdir ve yüksek kare hızından çok geniş tarayıcı desteğine öncelik verir. Wi-Fi sinyalini iyileştir veya WebRTC destekleyen tarayıcı dene; akıcı oynatma garanti edilmez.

### Port zaten kullanılıyor

Diğer kopyayı kapat veya yukarıdaki örnekle farklı port seç. Port değişince varsayılan Mac adresi de değişir. İki kopya aynı adres ve portu kullanamaz.

## Geliştirme ve kontroller

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run test:browser
```

Kilit dosyasında üçüncü taraf bağımlılığı yoktur. İsteğe bağlı tarayıcı testi, kurulu Chrome ve bilgisayara atanmış özel yerel IPv4 adresi gerektirir; geçici port ve ayrı Chrome profili kullanır. Otomatik seçim başarısızsa **CHROME_PATH** ile tarayıcı çalıştırılabilir dosyasını belirt. Test **yapay canvas görüntüsü ve üretilmiş test sesi** kullanır; gerçek masaüstüne veya mikrofona erişmez. Çözülen ses enerjisini, 60 FPS yakalama/kodlayıcı hedeflerini, canlı ayar/geri yüklemeyi, yapay ağ baskısına tepkiyi, ölçümleri, TV yerleşim/gizli kontrollerini, iki dili, JPEG modunu ve yakalama temizliğini doğrular. Yapay kaynağın gerçekten 60 FPS çalışması şart değildir; hedefin uygulanması ve ölçülen çıktı ayrı test edilir. Test hoparlör çıkışı susturulur. Fiziksel TV uyumluluk sertifikası veya macOS paylaşım penceresi için destek garantisi değildir.

GitHub Actions; macOS / Linux'ta Node.js 22 ve 24 birim kontrolleri, macOS'ta Chrome testi ve Linux'ta izole Docker imajı / erişim kontrolü için hazırdır. İş akışı ilgili commit için senin deponda çalışmalıdır; yerel testlerin geçmesi GitHub çalışmasının zaten başarılı olduğu anlamına gelmez.

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
