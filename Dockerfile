FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

**.dockerignore:**
```
node_modules
npm-debug.log
.git
.gitignore
Jenkinsfile
*.md