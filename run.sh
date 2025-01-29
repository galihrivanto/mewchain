#!/bin/sh
mkdir -p data/node1 data/node2 data/node3

# ensure previous process is killed
docker compose down

# build and run
docker compose build
docker compose up