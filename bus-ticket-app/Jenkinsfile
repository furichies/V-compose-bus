pipeline {
    agent any
    stages {
        stage('Build') {
            steps { sh 'docker compose build' }
        }
        stage('Test') {
            steps {
                sh 'docker compose run --rm user-auth pytest'
                sh 'docker compose run --rm bus-reservation pytest'
                sh 'docker compose run --rm payment-gateway pytest'
                sh 'docker compose run --rm route-scheduler pytest'
            }
        }
        stage('Deploy') {
            steps { sh 'docker compose up -d' }
        }
        stage('Cleanup') {
            steps { sh 'docker system prune -f' }
        }
    }
}
