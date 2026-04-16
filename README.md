# NeetCode Practice App

A comprehensive interview preparation platform designed to track progress, visualize study patterns, and master System Design breakdowns. This application provides a unified interface for the 150-challenge NeetCode roadmap and in-depth System Design analysis.

## 🚀 Live Demo
- **Production URL**: [https://neetcode-practice-qrm3yr6kqq-uc.a.run.app](https://neetcode-practice-qrm3yr6kqq-uc.a.run.app)
- **Health Check**: [https://neetcode-practice-qrm3yr6kqq-uc.a.run.app/api/health](https://neetcode-practice-qrm3yr6kqq-uc.a.run.app/api/health)

## ✨ Key Features
- **Roadmap Visualization**: Track progress across the NeetCode 150 roadmap.
- **System Design Breakdowns**: Detailed functional and non-functional requirements for popular system design problems.
- **Practice Calendar**: Heatmap-style visualization of your daily study activity.
- **Smart Navigation**: Context-aware navigation between Dashboard, Problem sets, and System Design breakdowns.

## 🛠 Technology Stack
- **Frontend**: React (Vite), Lucide Icons, Vanilla CSS (Premium Dark Theme)
- **Backend**: Node.js, Express.js
- **Database**: MySQL (hosted on Google Cloud SQL), Sequelize ORM
- **Deployment**: 
  - **Environment**: Google Cloud Run (Containerized with Docker & Nginx)
  - **CI/CD**: GitHub Actions (automated deployments on push to `main`)
  - **Secrets Management**: Google Cloud Secret Manager

## 💻 Local Development

### Prerequisites
- Node.js (v18+)
- MySQL (or Cloud SQL Auth Proxy for cloud DB access)

### Setup
1. **Clone the repository**:
   ```bash
   git clone git@github.com:pmaxit/neetcode_practice.git
   cd neetcode_practice
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file based on `.env.example`:
   ```bash
   DB_USER=your_user
   DB_PASS=your_password
   DB_NAME=neetcode_db
   INSTANCE_CONNECTION_NAME=your_gcp_project:region:instance
   ```

4. **Run the application**:
   ```bash
   # Start the development server (Frontend + Backend)
   ./run_local.sh
   ```

## 🏗 Project Structure
- `src/`: React frontend components and styles.
- `server.js`: Express backend managing API and database connections.
- `scripts/`: Utility scripts for data scraping and database population.
- `.github/workflows/`: CI/CD pipeline configuration.
- `nginx.conf` & `Dockerfile`: Production deployment configuration.

## 🤖 CI/CD Pipeline
Every push to the `main` branch triggers an automated build and deployment via GitHub Actions.
- **Workflow**: `.github/workflows/deploy.yml`
- **Build Tool**: Google Cloud Build
- **Platform**: Google Cloud Run
