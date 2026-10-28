#!/bin/sh
set -eu
PATH="$PATH:/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin"
export PATH
cd -P "$(dirname "$0")"
root=$(pwd -P)
project=mac-tv-mirror

fail() {
  printf '\n%s\n' "$1" >&2
  if [ -t 0 ]; then printf 'Enter ile kapat / Press Enter to close: '; read -r answer || true; fi
  exit 1
}

private_ip() {
  case "$1" in ''|*[!0-9.]*) return 1 ;; esac
  printf '%s\n' "$1" | awk -F. 'NF != 4 {exit 1} {for(i=1;i<=4;i++) if($i !~ /^[0-9]+$/ || $i<0 || $i>255) exit 1; if($1==10 || ($1==172 && $2>=16 && $2<=31) || ($1==192 && $2==168)) exit 0; exit 1}'
}

command -v docker >/dev/null 2>&1 || fail 'Docker Desktop gerekli / Docker Desktop is required.'
endpoint=${DOCKER_HOST:-$(docker context inspect "$(docker context show)" --format '{{.Endpoints.docker.Host}}')}
case "$endpoint" in unix://*) ;; *) fail 'Yalnızca yerel Docker Engine desteklenir / Only a local Docker Engine is supported.' ;; esac
if ! docker info >/dev/null 2>&1; then
  printf '%s\n' 'Docker Desktop başlatılıyor / Starting Docker Desktop…'
  open -a Docker || fail 'Docker Desktop açılamadı / Could not open Docker Desktop.'
  tries=0
  until docker info >/dev/null 2>&1; do
    tries=$((tries + 1))
    [ "$tries" -lt 45 ] || fail 'Docker hazır olmadı / Docker did not become ready.'
    sleep 2
  done
fi

for id in $(docker ps --all --quiet --filter "label=com.docker.compose.project=$project"); do
  owner=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$id")
  [ "$owner" = "$root" ] || fail 'Bu isimde başka klasöre ait Docker projesi var; değiştirilmedi / A different folder owns this Docker project; left unchanged.'
done

port=${APP_PORT:-8768}
case "$port" in ''|*[!0-9]*) fail 'APP_PORT geçerli sayı olmalı / APP_PORT must be a valid number.' ;; esac
[ "$port" -ge 1024 ] && [ "$port" -le 65535 ] || fail 'APP_PORT 1024–65535 arasında olmalı / APP_PORT must be 1024–65535.'
lan=${TV_LAN_IP:-}
if [ -z "$lan" ]; then
  if [ -n "${TV_INTERFACE:-}" ]; then
    lan=$(ipconfig getifaddr "$TV_INTERFACE" 2>/dev/null || true)
  else
    for interface in en0 $(networksetup -listallhardwareports 2>/dev/null | awk '/^Device: / {print $2}'); do
      candidate=$(ipconfig getifaddr "$interface" 2>/dev/null || true)
      if private_ip "$candidate"; then lan=$candidate; break; fi
    done
  fi
fi
private_ip "$lan" || fail 'Özel Wi-Fi/Ethernet IPv4 adresi bulunamadı / No private Wi-Fi/Ethernet IPv4 address found.'

umask 077
mkdir -p .local-run
printf 'TV_LAN_IP=%s\nAPP_PORT=%s\n' "$lan" "$port" > .local-run/.env
docker compose --env-file .local-run/.env --project-name "$project" up --build --detach || fail 'Başlatılamadı; portun başka uygulamada kullanılmadığını kontrol et / Startup failed; check for a port conflict.'
tries=0
until curl --fail --silent --max-time 2 --noproxy '*' "http://127.0.0.1:$port/api/health" >/dev/null 2>&1; do
  tries=$((tries + 1))
  [ "$tries" -lt 20 ] || fail 'Sunucu yanıt vermedi / The server did not respond.'
  sleep 1
done
printf '\nMac: http://localhost:%s/mac\nTV: http://%s:%s/\n' "$port" "$lan" "$port"
printf '%s\n' 'Mac sayfasındaki kodu TV’de gir. Sonra ekranı ve sesi kendin seç.' 'Enter the code shown on the Mac page on the TV, then explicitly select screen/audio.'
open -a 'Google Chrome' "http://localhost:$port/mac" || open "http://localhost:$port/mac"
