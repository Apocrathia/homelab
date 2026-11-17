# Stage 1: Build the Coraza Playground WASM + frontend
FROM golang:1.26-alpine AS builder

WORKDIR /build

# Install Node.js for frontend build
RUN apk add --no-cache nodejs npm git

# Clone the playground
RUN git clone https://github.com/corazawaf/coraza-playground.git . && \
    git checkout main

# Build WASM (Go → WASM)
RUN go run mage.go build

# Stage 2: Serve static files with nginx
FROM nginx:alpine

COPY --from=builder /build/www /usr/share/nginx/html

# The playground is a static SPA — all routing is client-side.
# nginx default config with try_files handles this.
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    # WASM files need correct MIME type \
    location ~ \.wasm$ { \
        types { application/wasm wasm; } \
        default_type application/wasm; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
