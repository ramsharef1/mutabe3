#!/usr/bin/env bash
# D-080: run the sample-articles script on production as the deploy user (owns the checkout), with the
# backend's env. Flags the 2026-09-16 demo set as samples and adds 3 labelled samples per empty section.
# Idempotent. Then purge nothing — the homepage revalidates within 60 s.
set -euo pipefail
APP=/var/www/mutabe3/current/projects/mutabe3
sudo -u mutabe3-deploy -H bash -c "cd $APP && export PATH=/opt/node22/bin:\$PATH && set -a && . /etc/mutabe3/backend.env && set +a && npx tsx packages/backend/src/scripts/sample-articles.ts"
