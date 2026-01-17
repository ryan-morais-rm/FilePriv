#!/bin/bash
# Rode esse script como ROOT nas VMs que serão criadas no virtualBox

apt update

apt install -y openssh-server openssh-client

systemctl enable ssh

systemctl start ssh

mkdir -p /home/vagrant/arquivos 