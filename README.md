# Finance Tracker (Blockchain-Enabled)

A lightweight blockchain-integrated Finance Tracking System that records financial transactions securely with Ethereum smart contracts and stores extended transaction data off-chain using Node.js and MongoDB.

This project demonstrates how blockchain can enhance transparency, auditability, and immutability in traditional financial tracking systems—all while keeping the system simple and beginner-friendly.

---

## 📌 Features

- **Add income & expense transactions**  
  Track financial activities with metadata stored efficiently.

- **Blockchain-backed transaction logging**  
  Uses a Solidity smart contract to maintain immutable on-chain references.

- **Off-chain storage with MongoDB**  
  Faster retrieval, flexible filtering, and rich transaction details.

- **Node.js + Express backend API**  
  Handles blockchain interactions, database operations, and business logic.

- **Simple Web UI**  
  Served using static assets from the `/public` folder.

- **Multiple deployment scripts**  
  Includes helper scripts (`deploy.js`, `deploy-fixed.js`) for contract deployment.

---

## 👥 Who Is This Project For?

This project is ideal for:

- **Students** learning blockchain + full-stack development  
- **Developers** exploring hybrid on-chain/off-chain design patterns  
- **Blockchain beginners** wanting hands-on experience with smart contracts  
- **Educators** using it to teach decentralized architecture concepts  
- **Anyone building finance tools** with security and transparency in mind  

---

## 🛠 Tech Stack Used

The repository includes the following technologies (based purely on actual repo structure):

- **Solidity** → smart contracts inside `/contracts`
- **Truffle Framework** → migrations inside `/migrations`
- **Ganache** → local blockchain for testing
- **Node.js + Express** → backend (`server-final.js`, `server-latest.js`, etc.)
- **MongoDB** → database for extended transaction data
- **Web3.js** → to interact with blockchain
- **HTML/CSS/JS** → frontend inside `/public`

---

## 📚 Documentation

All detailed documentation is available inside the `/docs` folder.

- 👉 **[Installation & Configuration Guide](docs/installation.md)**  
- 👉 **[Developer Guide](docs/development.md)**  
- 👉 **[Contributing Guidelines](/docs/CONTRIBUTING.md)**  

---

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/AvijitDas229/finance-tracker.git
cd finance-tracker

# 2. Install backend dependencies
npm install

# 3. Start Ganache (local blockchain)
npx ganache-cli -d

# 4. Deploy smart contracts
npx truffle migrate --reset --network development

# 5. Configure environment variables
cp .env.example .env
# Fill in required fields inside .env

# 6. Start MongoDB (local or Atlas)
# Ensure MONGO_URI is correct

# 7. Start the backend server
node server-final.js
