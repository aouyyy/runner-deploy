#!/bin/bash
docker exec -it runner sh -c "cd /app/scripts/jd_scripts && npm i"
docker exec -it runner sh -c "cd /app/scripts/runner_scripts && npm i"
