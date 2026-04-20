FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
WORKDIR /app/server
RUN npm install
EXPOSE 3001
CMD ["npx", "tsx", "src/index.ts"]
