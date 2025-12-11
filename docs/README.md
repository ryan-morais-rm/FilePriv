# FilePriv

## Motivação
- Projeto da disciplina de **Desenvolvimento Web** do IFPB - Campus João Pessoa
- Estudante = *Ryan de Morais Correia*
- Professor = *Luiz Carlos Rodrigues Chaves*

## Introdução
- Este projeto é um protótipo funcional de um servidor de armazenamento distribuído seguro. O objetivo é permitir que usuários façam upload de arquivos que serão divididos, criptografados em partes e distribuídos. Cada parte é protegida com uma chave privada relacionada à uma senha, exigindo que o usuário forneça a combinação correta para reconstruir o arquivo.

- O diferencial é a autenticação aleatória por parte do arquivo: mesmo que uma senha seja comprometida, não é garantido que a chave correspondente seja descoberta. Isso aumenta a segurança contra ataques de brute-force e vazamento parcial. 

- Este protótipo foi pensado para projeto acadêmico de 4 meses, utilizando as seguintes ferramentas:

### Tecnologias
[![HTML5](https://img.shields.io/badge/html5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/css3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/javascript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Docker](https://img.shields.io/badge/docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

## Informações extras
[![Status](https://img.shields.io/badge/status-prototype-yellow)](README.md)
[![GitHub Repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/ryan-morais-rm/FilePriv.git) 

## Funcionalidades
- Upload e download de arquivos via web.
- Criptografia do arquivo usando AES-GCM.
- Geração de chave aleatória por arquivo. 
- Proteção de cada partição do arquivo.
- Reconstrução do arquivo a partir das senhas atreladas às chaves. 
