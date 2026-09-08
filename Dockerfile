# Build dist with npm run build first. The same tested files go to Pages and Docker.
# The slim Alpine variant contains no currently reported image vulnerabilities
# in the official image scan while retaining the same nginx 1.30.4 runtime.
FROM nginx:stable-alpine-slim@sha256:ddde39c6e51f02fde7417c0e2c9c234cf2d0a4c7bdbbe176aeb37d8ad7ab4eb58c
COPY ops/nginx.conf /etc/nginx/nginx.conf
COPY dist/ /usr/share/nginx/html/
USER 101:101
EXPOSE 8080
STOPSIGNAL SIGQUIT
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
