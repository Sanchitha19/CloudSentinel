FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
WORKDIR /app/server
RUN npm install
CMD ["npx", "ts-node", "./src/index.ts"]
