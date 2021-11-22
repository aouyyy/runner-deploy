#!/bin/bash
node download.js
docker build . -t runner
docker-compose up -d
