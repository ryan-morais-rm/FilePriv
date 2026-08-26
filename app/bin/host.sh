#!/bin/bash

# Rode esse script para configurar as chaves privadas
ssh-keygen -m PEM -t rsa -b 4096 -f ./storage_key -N ""

# Esse comando serve para utilizar o HTTPS
sudo npx http-server . -p 443 -S -C src/backend/https_pem/cert.pem -K src/backend/https_pem/key.pem
