#!/usr/bin/env bash
# 빌드 결과를 "latest" 프리릴리스에 올린다.
#
# 아티팩트만으로는 폰에서 받기가 불편하다. GitHub 모바일 앱은 Actions 아티팩트를
# 내려받게 해 주지 않고, 릴리스가 하나도 없으면 "릴리스" 항목 자체를 숨긴다.
# 그래서 고정된 태그 하나에 매번 덮어쓴다 — 폰에서는 늘 같은 자리에서 같은 이름의
# 파일을 받으면 된다. 빌드마다 릴리스를 새로 만들면 몇 GB 씩 쌓이기만 한다.
#
# build.yml 과 guest-image.yml 이 각자 자기 파일을 올린다. 둘은 서로 다른 커밋에서
# 돌 수 있으므로, 노트에 파일 묶음마다 어느 커밋/런에서 왔는지 한 줄씩 남긴다.
#
# 사용법: publish-latest.sh <키> <설명> <파일>...
set -euo pipefail

TAG=latest
key=$1
desc=$2
shift 2
repo=$GITHUB_REPOSITORY

# 두 워크플로가 동시에 처음 만들려 들 수 있다. 진 쪽은 이미 생긴 것을 쓴다.
if ! gh release view "$TAG" >/dev/null 2>&1; then
  gh release create "$TAG" --prerelease --title "최신 빌드" --notes "" --target "$GITHUB_SHA" \
    || gh release view "$TAG" >/dev/null
fi

# 태그를 이번 커밋으로 옮긴다. 안 옮기면 릴리스 화면이 첫 빌드의 커밋을 영원히 가리킨다.
gh api -X PATCH "repos/$repo/git/refs/tags/$TAG" -f sha="$GITHUB_SHA" -F force=true >/dev/null

gh release upload "$TAG" "$@" --clobber

# 노트: 머리말 + 묶음별 한 줄. 자기 줄만 갈아 끼운다.
line="- **$desc** — \`${GITHUB_SHA:0:7}\` · [런 $GITHUB_RUN_ID]($GITHUB_SERVER_URL/$repo/actions/runs/$GITHUB_RUN_ID) · $(date -u '+%Y-%m-%d %H:%M UTC') <!-- $key -->"
others=$(gh release view "$TAG" --json body -q .body | grep -- '<!-- ' | grep -v -- "<!-- $key -->" || true)
{
  echo "작업 브랜치의 최신 빌드입니다. 빌드할 때마다 같은 이름으로 덮어씁니다."
  echo
  echo "- \`app-debug.apk\` — 앱"
  echo "- \`android7-guest.zip\` — 게스트 이미지. 앱의 \"Android 7 구성 가져오기\"에 그대로 넣으면 됩니다."
  echo
  echo "### 어느 빌드인가"
  [ -n "$others" ] && printf '%s\n' "$others"
  echo "$line"
} | awk '!/<!-- / || !seen[$0]++' > "$RUNNER_TEMP/release-notes.md"
gh release edit "$TAG" --notes-file "$RUNNER_TEMP/release-notes.md"

echo "올림: $* -> $GITHUB_SERVER_URL/$repo/releases/tag/$TAG"
