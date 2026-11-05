#!/usr/bin/env bash
set -euo pipefail
: "${DEPLOY_HOST:?}"
: "${DEPLOY_PORT:?}"
: "${DEPLOY_USER:?}"
: "${DEPLOY_WEBROOT:?}"
expected='/data/d/c/dcd5ea33-2c96-443d-9288-ab7942f77b67/hurtis.sk/sub/rieky'
[[ "$DEPLOY_WEBROOT" == "$expected" ]] || { echo 'Unexpected webroot'; exit 1; }
[[ "$DEPLOY_PORT" =~ ^[0-9]+$ ]] || exit 1
[[ "$DEPLOY_HOST" =~ ^[a-zA-Z0-9.-]+$ && "$DEPLOY_USER" =~ ^[a-zA-Z0-9_-]+$ ]] || exit 1
ssh_key="${DEPLOY_SSH_KEY:-$HOME/.ssh/deploy_key}"
remote="$DEPLOY_USER@$DEPLOY_HOST"
transport="ssh -i $ssh_key -p $DEPLOY_PORT -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=20"
# Copy only public assets. Never synchronize the repository or delete hosting files.
# Upload index last so newly referenced assets are already available.
rsync -rlptz --omit-dir-times -e "$transport" css js geojson img webfonts favicon.ico rieka.jpg "$remote:$DEPLOY_WEBROOT/"
rsync -rlptz --omit-dir-times --delay-updates -e "$transport" index.html "$remote:$DEPLOY_WEBROOT/"
