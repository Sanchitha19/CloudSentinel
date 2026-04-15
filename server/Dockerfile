FROM node:20-alpine
WORKDIR /app
COPY . .
WORKDIR /app/server
RUN npm install
RUN npm install -g typescript ts-node
CMD ["npx", "ts-node", "src/index.ts"]
