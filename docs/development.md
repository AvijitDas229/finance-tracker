# 👨‍💻 Comprehensive Development Guide

This document is the primary resource for anyone contributing to the **Finance Tracker** project. It outlines the application's architecture, setup procedures, coding standards, and contribution workflow.

---

## 1. Project Architecture

The Finance Tracker utilizes a **Client-Server Architecture**, ensuring clear separation of concerns, scalability, and maintainability.

### 1.1 Technology Stack
| Component | Primary Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React.js / [Insert Frontend Framework] | Handles the user interface, routing, and state management (e.g., Context API, Redux). |
| **Backend** | [Node.js Express / Python Django] | Provides a RESTful API, manages business logic, and handles user authentication and authorization. |
| **Database** | [MongoDB / PostgreSQL] | Persistent storage for all user data, transactions, and categories. |
| **Authentication**| JWT (JSON Web Tokens) | Stateless authentication used for securing API routes. |

### 1.2 Data Flow
1.  The **Frontend** initiates data requests (e.g., fetching transactions).
2.  The request goes to the **Backend API** (protected by JWT middleware).
3.  The **Backend** controller validates the request and interacts with the **Database** model.
4.  Data is retrieved, processed, and sent back as a JSON response to the **Frontend**.
5.  The **Frontend** updates the UI based on the response.

---

## 2. Local Development Setup

Follow these steps precisely to get the application running locally for development.

### 2.1 Prerequisites
Ensure these tools are installed and accessible via your terminal:
* **Git**
* **Node.js** (v16+) and npm
* **Database Engine** (e.g., MongoDB Community Server running on the default port `27017`)

### 2.2 Repository Cloning
1.  Clone the repository and navigate into the project directory:
    ```bash
    git clone [https://github.com/AvijitDas229/finance-tracker.git](https://github.com/AvijitDas229/finance-tracker.git)
    cd finance-tracker
    ```
2.  Set your base development branch:
    ```bash
    git checkout develop
    ```

### 2.3 Backend Configuration
The backend typically runs on `http://localhost:5000`.

1.  **Install Dependencies:**
    ```bash
    cd backend
    npm install
    # OR for Python: pip install -r requirements.txt
    ```
2.  **Environment Setup:** Create a file named `.env` in the `backend/` directory and populate it with your local configuration details.
    ```env
    PORT=5000
    DB_CONNECTION_STRING=mongodb://localhost:27017/finance_tracker_dev
    JWT_SECRET=your_long_development_secret
    NODE_ENV=development
    ```
3.  **Run Server:**
    ```bash
    npm run dev  # Or the specific command for live reload
    ```

### 2.4 Frontend Configuration
The frontend typically runs on `http://localhost:3000`.

1.  **Install Dependencies:**
    ```bash
    cd ../frontend
    npm install
    ```
2.  **Environment Setup:** Create a file named `.env` in the `frontend/` directory to point to your local API.
    ```env
    REACT_APP_API_URL=http://localhost:5000/api
    ```
3.  **Run Client:**
    ```bash
    npm start
    ```

---

## 3. Database Schema Overview

The core functionality revolves around three key data models:

| Model | Purpose | Key Fields | Relationships |
| :--- | :--- | :--- | :--- |
| **User** | Stores authentication credentials and user profile details. | `email` (unique), `password` (hashed), `username`. | One-to-Many with Transactions. |
| **Transaction**| Represents a single financial record (Income/Expense). | `userId`, `amount`, `type` (`income`/`expense`), `category`, `date`. | Belongs to User. |
| **Category**| Pre-defined categories for budgeting and filtering. | `name`, `type` (optional, for custom categories). | Many-to-One with Transactions. |

---

## 4. API Endpoints

All endpoints are protected by authentication middleware unless explicitly marked as public (e.g., `/auth/*`). The base URL is `/api/v1`.

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Creates a new user account. | 201 |
| `POST` | `/auth/login` | Authenticates user and returns a JWT token. | 200 |
| `GET` | `/transactions` | Retrieves all transactions for the logged-in user. | 200 |
| `POST` | `/transactions` | Creates a new financial transaction. | 201 |
| `PUT` | `/transactions/:id` | Updates an existing transaction by ID. | 200 |
| `DELETE` | `/transactions/:id`| Removes a transaction record. | 204 |

---

## 5. Coding Standards and Testing

### 5.1 Code Style
* We enforce code style consistency using **ESLint** (Frontend/Node.js) and **PEP8** (Python).
* **Naming Conventions:**
    * Variables and Functions: `camelCase` (e.g., `processTransaction`).
    * React Components: `PascalCase` (e.g., `ExpenseChart`).
    * Database Fields: `snake_case` or `camelCase` based on model convention.
* **Comments:** Use meaningful inline comments for complex logic; avoid commenting simple, self-explanatory code.

### 5.2 Testing
All features and bug fixes must be accompanied by unit or integration tests.

| Test Suite | Location | Command |
| :--- | :--- | :--- |
| Unit Tests (Backend) | `backend/tests/` | `npm test` (or `pytest`) |
| Unit/Component Tests (Frontend)| `frontend/src/**/*.test.js` | `npm run test` (in frontend directory) |

---

## 6. Git Contribution Workflow

We follow a **Feature Branch Workflow** integrated with Pull Requests (PRs).

1.  **Start a New Task:** Always branch off of the `develop` branch.
    ```bash
    git checkout develop
    git pull origin develop
    git checkout -b feat/descriptive-feature-name
    ```
2.  **Commit Messages:** Follow the Conventional Commits specification: `type(scope): subject`.
    * `feat`: A new feature (e.g., `feat: Add daily budget setting`).
    * `fix`: A bug fix (e.g., `fix(auth): Resolve token expiration bug`).
    * `docs`: Documentation changes.
    * `style`: Formatting, missing semicolons (no code change).
3.  **Create a Pull Request:** Once complete, push your branch and open a PR targeting the **`develop`** branch. Ensure all tests pass before requesting review.
