// Define the name of the NodeJS installation configured in Jenkins
def NODEJS_TOOL_NAME = 'NodeJS 18' 

pipeline {
    agent any
    
    environment {
        // App configuration
        APP_NAME = 'jenkins-demo-app'
        // VERSION will be overwritten in the 'Version Bump' stage
        VERSION = "${env.BUILD_NUMBER}" 
        DOCKER_IMAGE = "${APP_NAME}:${VERSION}"
        
        // Environment ports
        STAGING_PORT = '3001'
        PRODUCTION_PORT = '3002'
        
        // Container names
        STAGING_CONTAINER = "${APP_NAME}-staging"
        PROD_CONTAINER = "${APP_NAME}-production"
        
        // New variable to hold the bumped semantic version
        NEW_APP_VERSION = '' 
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo '📥 Checking out code...'
                checkout scm
            }
        }
        
        // --- NEW STAGE: Bump Version ---
        stage('Version Bump') {
            steps {
                echo '🔖 Bumping version and extracting new version...'
                script {
                    // 1. Use the 'tool' step to set the environment for npm
                    tool(NODEJS_TOOL_NAME) { 
                        // 2. Bump the patch version in package.json
                        sh 'npm version patch -m "CI: Bumped to %s"' 
                        
                        // 3. Read the new version from package.json and store it
                        // This uses a multi-line script for safe variable assignment
                        NEW_APP_VERSION = sh(
                            returnStdout: true,
                            script: "npm pkg get version | tr -d '\"'" // Use npm to get version, trim quotes
                        ).trim()
                        
                        // 4. Update the global environment variables with the new version
                        env.VERSION = "${NEW_APP_VERSION}"
                        env.DOCKER_IMAGE = "${env.APP_NAME}:${env.VERSION}"
                    }
                    echo "✅ New Application Version: ${env.VERSION}"
                    echo "✅ New Docker Image Tag: ${env.DOCKER_IMAGE}"
                }
            }
        }
        // -------------------------------
        
        stage('Install Dependencies') {
            steps {
                echo '📦 Installing dependencies...'
                // 🔑 All subsequent npm commands are wrapped in the 'tool' step
                tool(NODEJS_TOOL_NAME) { 
                    sh 'npm ci'
                }
            }
        }
        
        stage('Lint & Test') {
            steps {
                tool(NODEJS_TOOL_NAME) {
                    echo '🔍 Running linter...'
                    sh 'npm run lint'
                    echo '🧪 Running unit tests...'
                    sh 'npm test'
                    echo '🔒 Running security audit...'
                    sh 'npm audit --audit-level=moderate || true'
                }
            }
            post {
                always {
                    echo 'Tests and scans completed'
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                echo "🐋 Building Docker image ${env.DOCKER_IMAGE}..."
                script {
                    sh """
                        docker build \
                        --build-arg VERSION=${VERSION} \
                        -t ${DOCKER_IMAGE} \
                        -t ${APP_NAME}:latest \
                        .
                    """
                }
            }
        }
        
        // ... (Remaining deployment stages are unchanged but will use the new VERSION and DOCKER_IMAGE) ...
        
        stage('Deploy to Staging') {
            steps {
                echo '🚀 Deploying to staging environment...'
                script {
                    // Stop and remove existing staging container
                    sh """
                        docker stop ${STAGING_CONTAINER} || true
                        docker rm ${STAGING_CONTAINER} || true
                    """
                    // Run new staging container
                    sh """
                        docker run -d \
                        --name ${STAGING_CONTAINER} \
                        -p ${STAGING_PORT}:3000 \
                        -e VERSION=${VERSION} \
                        -e ENVIRONMENT=staging \
                        ${DOCKER_IMAGE}
                    """
                    sleep(time: 5, unit: 'SECONDS')
                }
            }
        }
        
        stage('Staging Tests') {
            steps {
                echo '✅ Running staging smoke tests...'
                script {
                    sh """
                        curl -f http://localhost:${STAGING_PORT}/health || exit 1
                        curl -f http://localhost:${STAGING_PORT}/ || exit 1
                    """
                }
            }
        }
        
        stage('Approval') {
            steps {
                echo '⏸️  Waiting for deployment approval...'
                input message: 'Deploy to Production?', ok: 'Deploy'
            }
        }
        
        stage('Deploy to Production') {
            steps {
                echo '🎯 Deploying to production environment...'
                script {
                    // Stop and remove existing production container
                    sh """
                        docker stop ${PROD_CONTAINER} || true
                        docker rm ${PROD_CONTAINER} || true
                    """
                    // Run new production container
                    sh """
                        docker run -d \
                        --name ${PROD_CONTAINER} \
                        -p ${PRODUCTION_PORT}:3000 \
                        -e VERSION=${VERSION} \
                        -e ENVIRONMENT=production \
                        ${DOCKER_IMAGE}
                    """
                    sleep(time: 5, unit: 'SECONDS')
                }
            }
        }
        
        stage('Production Health Check') {
            steps {
                echo '🏥 Verifying production deployment...'
                script {
                    sh """
                        curl -f http://localhost:${PRODUCTION_PORT}/health || exit 1
                        curl -f http://localhost:${PRODUCTION_PORT}/ || exit 1
                    """
                }
            }
        }
        
        stage('Cleanup Old Images') {
            steps {
                echo '🧹 Cleaning up old Docker images...'
                script {
                    sh """
                        docker images ${APP_NAME} --format "{{.ID}} {{.Tag}}" | \
                        grep -v latest | \
                        tail -n +6 | \
                        awk '{print \$1}' | \
                        xargs -r docker rmi || true
                    """
                }
            }
        }
    }
    
    post {
        success {
            echo "✅ Pipeline completed successfully! Deployed version: ${env.VERSION}"
            echo "🌐 Staging: http://localhost:${STAGING_PORT}"
            echo "🌐 Production: http://localhost:${PRODUCTION_PORT}"
        }
        failure {
            echo '❌ Pipeline failed! Rolling back staging...'
            script {
                sh "docker stop ${STAGING_CONTAINER} || true"
                sh "docker rm ${STAGING_CONTAINER} || true"
            }
        }
        always {
            echo '📊 Pipeline execution completed'
        }
    }
}