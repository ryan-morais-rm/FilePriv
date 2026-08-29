FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY public ./public/
COPY src/node ./src/
COPY src/proto ./proto/
COPY .env ./

EXPOSE 443