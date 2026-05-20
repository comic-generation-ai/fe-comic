# --- GIAI ĐOẠN 1: Dành cho lúc Dev cùng Team ---
FROM node:22-slim AS development
USER node
WORKDIR /app
COPY --chown=node:node package*.json ./
RUN npm install
COPY --chown=node:node . .
EXPOSE 4200
CMD ["npm", "start"]

# --- GIAI ĐOẠN 2 & 3: Dành cho lúc Deploy (Tạm thời Docker Compose sẽ bỏ qua phần này) ---
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build --configuration=production

FROM nginx:alpine AS production
# Thay 'fe-comic' bằng tên thư mục build thực tế trong folder dist/ của bạn
COPY --from=builder /app/dist/fe-comic /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]