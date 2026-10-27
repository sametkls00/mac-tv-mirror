# Publish to GitHub / GitHub'da yayınlama

[English README](../README.md) · [Türkçe README](../README.tr.md)

## Türkçe

Bu klasörün içeriği doğrudan GitHub deposunun kökünde olacak şekilde hazırlanmıştır. Gerçek ev IP adresi, canlı eşleştirme kodu, kişisel GitHub hesabı veya sabit uzaktan depo adresi içermez. Yeni bir Git deposu başlatmak ve uzak depoyu seçmek senin kontrolündedir.

### 1. Yerel son kontrol

Proje klasöründe terminal aç:

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run test:browser
```

Son komut isteğe bağlıdır; kurulu Chrome ve özel yerel ağ adresi gerektirir. Gerçek ekranını yakalamaz. Başka bir kopya çalışıyorsa normal uygulamayı farklı portta başlat; mevcut paylaşımını kapatman gerekmez.

Günlük, ekran görüntüsü veya yerel ayar eklediysen yayınlamadan önce kontrol et. [.gitignore](../.gitignore), yalnızca henüz izlenmeyen dosyaları dışlar; önceden Git'e eklenmiş sırları temizlemez. Etkin kodları ve anahtarları hiçbir zaman paylaşma.

### 2. Terminal + GitHub CLI ile paylaş

Önce Git ve [GitHub CLI](https://cli.github.com/) kurulu olmalı. Bu adımlar internette **herkese açık** depo oluşturur. İstediğin kişisel hesabın açık olduğunu kontrol et:

```sh
gh auth status
```

Oturum yoksa:

```sh
gh auth login
```

Ardından **bu proje klasöründe**, henüz depo oluşturmadıysan:

```sh
git init -b main
git add .
git diff --cached --stat
git commit -m "Initial public version"
gh repo create mac-tv-mirror --public --source=. --remote=origin --push
```

Son komut oturum açtığın hesabında depo oluşturur ve kodu gönderir. Aynı isimde depo varsa farklı isim seç veya var olan depoya bağlan. Git kimlik bilgisi isterse kendi adını ve tercih ettiğin GitHub e-postanı / no-reply adresini yalnızca bu depo için yapılandır; başkasının kimliğini kopyalama. Proje hiçbir hesap veya erişim anahtarı sağlamaz.

### GitHub CLI yerine GitHub arayüzünü kullanmak

1. GitHub'da yeni, boş, **Public** depo oluştur; README, lisans veya ignore dosyası ekletme, bunlar zaten projede var.
2. Yukarıdaki yerel Git başlatma ve commit adımlarını çalıştır.
3. GitHub'ın yeni depo sayfasındaki **“push an existing repository”** komutlarını kullan; uzak adresin kendi kişisel depona ait olduğunu kontrol et.

GitHub Desktop tercih edersen önce yerel Git başlatma adımlarını tamamla, sonra **File → Add Local Repository** ile bu klasörü seç ve **Publish repository** kullan. Herkesin erişebilmesi için **Keep this code private** seçeneğini kaldır ve hesabı doğrula.

Tarayıcıdan sürükleyip bırakma, gizli [.github](../.github/) klasörünü ve diğer nokta dosyalarını atlayabilir. İş akışlarının da gitmesi için Git / GitHub Desktop tercih et. Dıştaki klasörü değil, proje içeriğini deponun köküne gönder.

### 3. GitHub'da son düzenleme

- About açıklaması önerisi: **Local Mac-to-TV screen sharing in a TV browser. WebRTC + JPEG fallback. English / Türkçe.**
- Konu önerileri: **macos**, **screen-sharing**, **smart-tv**, **webrtc**, **tizen**, **local-network**.
- **Settings → Security → Code security and analysis** veya GitHub'ın güncel **Security** ayarları üzerinden **Private vulnerability reporting** özelliğini aç. Menü adı değişebilir.
- **Actions** sekmesinde ilk kontrolün tamamlanmasını bekle; burada hazırlanmış bir iş akışı bulunması, GitHub'da zaten çalıştığı anlamına gelmez.
- İstersen testlerden sonra sürüm etiketi ve GitHub Release oluştur. [Değişiklik kaydındaki](../CHANGELOG.md) “Unreleased” durumunu gerçek yayın tarihiyle güncelle.

[MIT lisansı](../LICENSE) başkalarının kullanmasına, değiştirmesine ve lisans koşullarıyla dağıtmasına izin verir. Yazarı kişisel adınla göstermek istersen lisansın telif satırını yayınlamadan önce kendi tercihine göre güncelleyebilirsin. GitHub Pages veya herkese açık sunucuda uygulamayı çalıştırma; burası yalnızca **kaynak kodunun paylaşımıdır**.

## English

The folder is ready to become the **root contents** of a GitHub repository. It contains no live home IP, pairing code, personal GitHub identity, or preconfigured remote. Initializing Git and choosing the remote remain under your control.

### 1. Check locally

Open a terminal in the project folder:

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run test:browser
```

The final command is optional and requires Chrome plus an assigned private LAN address. It uses synthetic video, not your screen. Check any locally added logs, screenshots, or configuration before publication. [.gitignore](../.gitignore) does not remove secrets already committed to Git.

### 2. Publish using GitHub CLI

Install Git and [GitHub CLI](https://cli.github.com/), then confirm that the intended personal account is authenticated:

```sh
gh auth status
```

If necessary, sign in with **gh auth login**. The following commands create a **public** repository; run them inside this project folder only if it has not been initialized yet:

```sh
git init -b main
git add .
git diff --cached --stat
git commit -m "Initial public version"
gh repo create mac-tv-mirror --public --source=. --remote=origin --push
```

Choose another name or connect to an existing remote if that repository name is already taken. If Git requests an identity, set your own name and preferred GitHub email / no-reply address locally for this repository. Do not copy another person's identity. The project ships no credentials.

Alternatively, create an empty **Public** repository in GitHub's web UI without auto-generating any files. Initialize and commit locally, then follow GitHub's **push an existing repository** commands using your own repository URL. With GitHub Desktop, add the locally initialized folder via **File → Add Local Repository**, then **Publish repository** and uncheck **Keep this code private**.

Prefer Git or GitHub Desktop over browser drag-and-drop, which can omit the hidden [.github](../.github/) configuration and other dotfiles. Upload the folder's contents at repository root, not an extra enclosing folder.

### 3. Finish on GitHub

- Suggested description: **Local Mac-to-TV screen sharing in a TV browser. WebRTC + JPEG fallback. English / Türkçe.**
- Suggested topics: **macos**, **screen-sharing**, **smart-tv**, **webrtc**, **tizen**, **local-network**.
- Enable **Private vulnerability reporting** in repository security settings. GitHub's exact menu location can change.
- Check the first **Actions** run; a configured workflow is not evidence that hosted CI has already passed.
- Optionally tag a release after checks pass and replace “Unreleased” in the [changelog](../CHANGELOG.md) with the actual date.

The [MIT license](../LICENSE) permits reuse under its terms. You may adjust its copyright line to your preferred attribution before publishing. Do not run this local service on GitHub Pages, a public server, or a public tunnel. This guide publishes **source code**, not a publicly accessible screen-sharing instance.
