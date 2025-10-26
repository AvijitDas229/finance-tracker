const express = require('express');
const Web3 = require('web3');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Serve static files from public folder
app.use(express.static('public'));

// Fix Web3 initialization
let web3;
try {
    web3 = new Web3('http://localhost:8545');
    console.log('✅ Connected to Ganache at http://localhost:8545');
} catch (error) {
    console.error('❌ Failed to connect to Ganache:', error.message);
    process.exit(1);
}

// MongoDB connection with better error handling
mongoose.connect('mongodb://localhost:27017/financeTracker', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Connected to MongoDB');
}).catch(err => {
    console.log('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Continuing without MongoDB...');
});

// MongoDB Schema
const TransactionSchema = new mongoose.Schema({
    transactionId: Number,
    description: String,
    amount: Number,
    type: String,
    sender: String,
    timestamp: Date,
    blockchainHash: String
});

const Transaction = mongoose.model('Transaction', TransactionSchema);

// Simple contract ABI (minimal version)
const contractABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "_description", "type": "string"},
            {"internalType": "uint256", "name": "_amount", "type": "uint256"},
            {"internalType": "string", "name": "_transactionType", "type": "string"}
        ],
        "name": "addTransaction",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getAllTransactions",
        "outputs": [
            {
                "components": [
                    {"internalType": "uint256", "name": "id", "type": "uint256"},
                    {"internalType": "string", "name": "description", "type": "string"},
                    {"internalType": "uint256", "name": "amount", "type": "uint256"},
                    {"internalType": "string", "name": "transactionType", "type": "string"},
                    {"internalType": "address", "name": "sender", "type": "address"},
                    {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
                ],
                "internalType": "struct FinanceTracker.Transaction[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "transactionCount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

// We'll set this after deployment
let contractAddress = null;
let financeTracker = null;

// Function to set contract after deployment
function setContract(address) {
    contractAddress = address;
    financeTracker = new web3.eth.Contract(contractABI, address);
    console.log('✅ Contract set at:', address);
}

// Basic routes for testing
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/api/status', async (req, res) => {
    try {
        const accounts = await web3.eth.getAccounts();
        const blockNumber = await web3.eth.getBlockNumber();
        
        res.json({
            blockchain: {
                connected: true,
                accounts: accounts.length,
                currentBlock: blockNumber,
                contractSet: contractAddress !== null
            },
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get test accounts from Ganache
app.get('/api/accounts', async (req, res) => {
    try {
        const accounts = await web3.eth.getAccounts();
        // For security, we don't expose private keys in real applications
        // But for testing, we'll return the first account
        res.json({
            testAccount: accounts[0],
            totalAccounts: accounts.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual contract setup endpoint
app.post('/api/set-contract', (req, res) => {
    const { address } = req.body;
    if (!address) {
        return res.status(400).json({ error: 'Contract address required' });
    }
    
    setContract(address);
    res.json({ success: true, address });
});

// Simple transaction endpoint (without blockchain for now)
app.post('/api/transactions', async (req, res) => {
    try {
        const { description, amount, type } = req.body;
        
        // Store in MongoDB only for now
        const transaction = new Transaction({
            transactionId: Date.now(),
            description,
            amount,
            type,
            sender: 'manual',
            timestamp: new Date(),
            blockchainHash: 'pending'
        });
        
        await transaction.save();
        
        res.json({ 
            success: true, 
            message: 'Transaction stored in database',
            transactionId: transaction.transactionId
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ timestamp: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Check status at http://localhost:${PORT}/api/status`);
});

// Make setContract available globally
module.exports = { setContract };