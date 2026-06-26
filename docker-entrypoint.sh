#!/bin/sh
set -eu

API_UPSTREAM_URL="${API_UPSTREAM_URL:-http://127.0.0.1:8080}"

sed "s|__API_UPSTREAM_URL__|${API_UPSTREAM_URL}|g" \
  /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'