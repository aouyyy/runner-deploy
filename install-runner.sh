#!/bin/bash
npm i qrcode-terminal request qrcode-reader set-cookie-parser jimp --registry=https://registry.npm.taobao.org
node download.js
mkdir logs mysql redis scripts
docker build . -t runner
