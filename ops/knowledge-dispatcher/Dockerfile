FROM node:22-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY dispatch.mjs ./dispatch.mjs
EXPOSE 8080
CMD ["node", "dispatch.mjs"]
