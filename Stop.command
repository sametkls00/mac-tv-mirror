#!/bin/sh
set -eu
PATH="$PATH:/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin"
export PATH
cd -P "$(dirname "$0")"
root=$(pwd -P)
project=mac-tv-mirror
if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  printf '%s\n' 'Yerel Docker çalışmıyor / Local Docker is not running.'
  exit 0
fi
endpoint=${DOCKER_HOST:-$(docker context inspect "$(docker context show)" --format '{{.Endpoints.docker.Host}}')}
case "$endpoint" in unix://*) ;; *) printf '%s\n' 'Uzak Docker değiştirilmedi / Remote Docker left unchanged.'; exit 1 ;; esac
for id in $(docker ps --all --quiet --filter "label=com.docker.compose.project=$project"); do
  owner=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$id")
  [ "$owner" = "$root" ] || { printf '%s\n' 'Başka klasöre ait proje değiştirilmedi / Project owned by another folder left unchanged.'; exit 1; }
done
if [ ! -f .local-run/.env ]; then
  printf '%s\n' 'Yerel başlatma ayarı yok; işlem yapılmadı / No local startup configuration; nothing changed.'
  exit 0
fi
docker compose --env-file .local-run/.env --project-name "$project" down
printf '%s\n' 'Uygulama durduruldu. Docker ve diğer projeler açık kaldı / App stopped. Docker and other projects were left running.'
