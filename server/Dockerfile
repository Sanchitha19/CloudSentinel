FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
WORKDIR /app/server
RUN npm install
CMD ["npx", "tsx", "./src/index.ts"]
