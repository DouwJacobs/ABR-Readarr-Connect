# ===== Build Stage =====
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN apk add --no-cache python3 make g++ && npm ci || npm install

# Copy all source files
COPY . .

# Compile TypeScript
RUN npx tsc

# Build client
RUN npm --prefix ./client ci || npm --prefix ./client install \
    && npm --prefix ./client run build \
    && mkdir -p public \
    && cp -r ./client/dist/* ./public/ || true

# ===== Production Stage =====
FROM node:20-alpine

WORKDIR /app

# Copy only built files and package files for production
COPY package*.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

# Install only production dependencies
ENV NODE_ENV=production
RUN npm ci --only=production || npm install --production

# Expose the port your server listens on
EXPOSE 3000

# Run the compiled server
CMD ["node", "dist/server.js"]
