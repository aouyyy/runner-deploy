#!/bin/bash
set -e
echo -e "======================启动nginx========================\n"
nginx -c /etc/nginx/nginx.conf

echo -e "======================启动控制面板========================\n"
cd /app
yarn start:prod
