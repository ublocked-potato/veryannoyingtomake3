FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy all server files
COPY server.js server-v2.js server-v3.js ./

# Expose port
EXPOSE 3000

# Set environment variable
ENV NODE_ENV=production

# Run V3 by default (best compatibility)
# Change to server.js for V1 or server-v2.js for V2
CMD ["node", "server-v3.js"]
