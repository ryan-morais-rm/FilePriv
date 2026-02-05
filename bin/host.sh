#!/bin/bash

# Rode esse script para configurar as chaves privadas

ssh-keygen -m PEM -t rsa -b 4096 -f ./storage_key -N ""


