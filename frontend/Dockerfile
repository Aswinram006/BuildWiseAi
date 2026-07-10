FROM node:18-alpine

WORKDIR /app

# Copy dependencies definitions
COPY package.json .

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose port
EXPOSE 5173

# Start development server with host option so it listens to Docker requests
CMD ["npm", "run", "dev", "--", "--host"]
