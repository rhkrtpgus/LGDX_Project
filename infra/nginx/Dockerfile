FROM node:24-alpine AS frontend-builder

WORKDIR /workspace/Front

COPY Front/package.json Front/package-lock.json ./
RUN npm ci

COPY Front ./

ARG VITE_JAVA_API_BASE_URL=/api
ARG VITE_FASTAPI_API_BASE_URL=/fastapi
ARG VITE_JAVA_PROXY_TARGET=http://back:8082
ARG VITE_FASTAPI_PROXY_TARGET=http://fastapi:8000

ENV VITE_JAVA_API_BASE_URL=${VITE_JAVA_API_BASE_URL}
ENV VITE_FASTAPI_API_BASE_URL=${VITE_FASTAPI_API_BASE_URL}
ENV VITE_JAVA_PROXY_TARGET=${VITE_JAVA_PROXY_TARGET}
ENV VITE_FASTAPI_PROXY_TARGET=${VITE_FASTAPI_PROXY_TARGET}

RUN npm run build

FROM nginx:1.29-alpine

COPY infra/nginx/default.compose.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-builder /workspace/Front/dist /usr/share/nginx/html
