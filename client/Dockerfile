FROM node:20-alpine
WORKDIR /app
COPY . .
WORKDIR /app/client
RUN rm -rf node_modules package-lock.json
RUN npm install
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]