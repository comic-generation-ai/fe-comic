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
# @angular/build:application (Angular 17+) xuất ra dist/fe-comic/browser/, không
# phải thẳng dist/fe-comic/ — thiếu "/browser" thì index.html thật nằm lạc 1 cấp,
# COPY vào thư mục đã có sẵn index.html mặc định của nginx (không tự xoá trước)
# nên nginx vẫn phục vụ trang "Welcome to nginx!" gốc thay vì app Angular.
COPY --from=builder /app/dist/fe-comic/browser /usr/share/nginx/html
# Prerender bật (xem "Prerendered N static routes" lúc build) nên builder xuất
# index.csr.html (fallback client-side-render) thay vì index.html thường —
# đổi tên lại để nginx tự nhận đúng document mặc định thay vì phục vụ trang
# "Welcome to nginx!" gốc (index.html cũ của base image không bị ghi đè).
RUN mv /usr/share/nginx/html/index.csr.html /usr/share/nginx/html/index.html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]