FROM node:22-alpine AS build-stage

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Build-time arguments for Vite environment variables
ARG VITE_API_URL=/api
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_AUTH_REDIRECT_URL=http://localhost:3000
ARG VITE_ENABLE_GOOGLE_AUTH=true

# Set as environment variables for the build process
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_AUTH_REDIRECT_URL=${VITE_AUTH_REDIRECT_URL}
ENV VITE_ENABLE_GOOGLE_AUTH=${VITE_ENABLE_GOOGLE_AUTH}

RUN npm run build

FROM nginx:stable-alpine AS production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80