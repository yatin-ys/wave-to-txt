# --- Stage 1: Build the React application ---
FROM node:22-alpine AS build-stage

WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# IMPORTANT: This allows Docker Compose to pass the API URL at build time.
# The default value is for accessing the API via the Nginx proxy.
ARG VITE_API_URL=/api

# Set the build-time argument as an environment variable for the build command
ENV VITE_API_URL=${VITE_API_URL}

# Build the application for production
RUN npm run build


# --- Stage 2: Serve the application with Nginx ---
FROM nginx:stable-alpine AS production-stage

# Copy the built static files from the build stage to the Nginx public folder
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration file
# This file configures Nginx to serve the React app and proxy API requests
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for the Nginx server
EXPOSE 80

# The base Nginx image already has a CMD to start the server, so we don't need one.