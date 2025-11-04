# ===== Build Stage =====
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci || npm install

# Copy all source files
COPY . .

# Compile TypeScript
RUN npx tsc

# ===== Production Stage =====
FROM node:20-alpine

WORKDIR /app

# Copy only built files and package files for production
COPY package*.json ./
COPY --from=build /app/dist ./dist

# Install only production dependencies
ENV NODE_ENV=production
RUN npm ci --only=production || npm install --production

# Expose the port your server listens on
EXPOSE 3000

# Run the compiled server
CMD ["node", "dist/server.js"]
