# Security policy / Güvenlik politikası

## English

### Scope and support

This is an experimental tool intended **only for trusted private networks**. Only the latest revision of the 0.1.x line receives fixes on a best-effort basis; there is no security SLA, formal audit, or production-hardening guarantee.

Important known boundaries:

- HTTP pages, pairing, signaling, and fallback images are not TLS-encrypted.
- Standard WebRTC media encryption does not turn unauthenticated HTTP signaling into a verified end-to-end trust model.
- A pairing PIN, rate limits, and random session tokens reduce accidental / opportunistic access; they do not protect an untrusted network from an active attacker.
- Public deployment, port forwarding, public tunnels, and use on shared untrusted Wi-Fi are unsupported.
- Explicitly stop browser capture when finished. Server-side timeouts do not directly revoke an established peer-to-peer media channel.
- Local capture permissions and the privacy of the chosen screen remain the user's responsibility.

### Report a vulnerability privately

1. On the repository's **Security** tab, use **Report a vulnerability** if the maintainer has enabled private vulnerability reporting.
2. If that option is unavailable, use a private contact method explicitly published on the maintainer's GitHub profile. No email address is assumed by this project.
3. If no private channel exists, do not publish exploit details, pairing tokens, screen content, or credentials in an issue. Ask only for a private reporting channel without sensitive details.

Include the affected revision, impact, required network access, and minimal reproduction steps using **synthetic data**. Do not send real desktop captures or a live pairing code. Allow the maintainer time to investigate before coordinated public disclosure.

Maintainers should enable private reporting before inviting security reports; the [publishing guide](docs/PUBLISHING.md) explains this step.

## Türkçe

### Kapsam ve destek

Bu deneysel araç **yalnızca güvenilir özel ağlar** içindir. 0.1.x serisinin son revizyonuna imkânlar ölçüsünde düzeltme sağlanır; güvenlik SLA'sı, resmi denetim veya üretim ortamı garantisi yoktur.

Bilinen önemli sınırlar:

- HTTP sayfaları, eşleştirme, bağlantı mesajları ve uyumluluk görüntüleri TLS ile şifrelenmez.
- WebRTC'nin standart görüntü şifrelemesi, kimliği doğrulanmamış HTTP sinyalleşmesini doğrulanmış uçtan uca güven modeline dönüştürmez.
- PIN, deneme sınırları ve rastgele oturum anahtarları yanlışlıkla / fırsatçı erişimi azaltır; güvensiz ağdaki aktif saldırganı engelleme garantisi vermez.
- Herkese açık sunucu, port yönlendirme, genel tünel ve güvenilmeyen ortak Wi-Fi desteklenmez.
- İşin bitince tarayıcı yakalamasını kendin durdur. Sunucu zaman aşımı kurulmuş eşler arası medya kanalını doğrudan iptal etmez.
- Yerel yakalama izinleri ve seçilen ekranın gizliliği kullanıcının sorumluluğundadır.

### Güvenlik açığını özel olarak bildirme

1. Bakımcı özel bildirimleri açtıysa deponun **Security** sekmesindeki **Report a vulnerability** seçeneğini kullan.
2. Seçenek yoksa bakımcının GitHub profilinde açıkça yayınladığı özel iletişim kanalını kullan. Proje herhangi bir e-posta adresi varsaymaz.
3. Özel kanal yoksa issue'da saldırı ayrıntısı, oturum anahtarı, ekran içeriği veya kimlik bilgisi paylaşma. Yalnızca hassas ayrıntı vermeden özel bildirim kanalı iste.

Etkilenen revizyonu, etkiyi, gereken ağ erişimini ve **yapay verilerle** kısa tekrarlama adımlarını ekle. Gerçek masaüstü görüntüsü veya etkin eşleştirme kodu gönderme. Koordineli açık yayınlamadan önce bakımcıya inceleme süresi tanı.

Bakımcılar güvenlik bildirimi istemeden önce özel raporlamayı açmalıdır; adımlar [yayınlama rehberinde](docs/PUBLISHING.md) bulunur.
