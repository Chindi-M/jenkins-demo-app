pipeline {
    agent any
    
    environment {
        // App configuration
        APP_NAME = 'jenkins-demo-app'
        VERSION = "${env.BUILD_NUMBER}"
        DOCKER_IMAGE = "${APP_NAME}:${VERSION}"
        
        // Environment ports
        STAGING_PORT = '3001'
        PRODUCTION_PORT = '3002'
        
        // Container names
        STAGING_CONTAINER = "${APP_NAME}-staging"
        PROD_CONTAINER = "${APP_NAME}-production"
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo '📥 Checking out code...'
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo '📦 Installing dependencies...'
                sh 'npm ci'
            }
        }
        
        stage('Lint') {
            steps {
                echo '🔍 Running linter...'
                sh 'npm run lint'
            }
        }
        
        stage('Unit Tests') {
            steps {
                echo '🧪 Running unit tests...'
                sh 'npm test'
            }
            post {
                always {
                    // Archive test results if you add JUnit reporter
                    echo 'Tests completed'
                }
            }
        }
        
        stage('Security Scan') {
            steps {
                echo '🔒 Running security audit...'
                sh 'npm audit --audit-level=moderate || true'
            }
        }
        
        stage('Build Docker Image') {
            steps {
                echo '🐋 Building Docker image...'
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
                    
                    // Wait for container to be ready
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
                echo '⏸️  Waiting for deployment approval...'
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
                    
                    // Wait for container to be ready
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
                    // Keep last 5 images
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
            echo '✅ Pipeline completed successfully!'
            echo "🌐 Staging: http://localhost:${STAGING_PORT}"
            echo "🌐 Production: http://localhost:${PRODUCTION_PORT}"
        }
        failure {
            echo '❌ Pipeline failed!'
            // Rollback staging if needed
            script {
                sh "docker stop ${STAGING_CONTAINER} || true"
                sh "docker rm ${STAGING_CONTAINER} || true"
            }
        }
        always {
            echo '📊 Pipeline execution completed'
            // Clean workspace if needed
            // cleanWs()
        }
    }
}