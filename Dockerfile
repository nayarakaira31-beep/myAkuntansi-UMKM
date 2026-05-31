FROM node:22-alpine

WORKDIR /app

# Copy package metadata
COPY package.json package-lock.json* ./

# Install all dependencies (we need devDependencies for the build step)
RUN npm install

# Copy all source files
COPY . .

# Build the Vite application and Esbuild server
RUN npm run build

# Expose the port (must use 3000 as per environment settings)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
