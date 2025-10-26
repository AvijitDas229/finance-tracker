const express = require('express');
const Web3 = require('web3');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Fix Mongoose deprecation warning
mongoose.set('strictQuery', false);

// Initialize Web3
let web3;
try {
    web3 = new Web3('http://localhost:8545');
    console.log('✅ Connected to Ganache at http://localhost:8545');
} catch (error) {
    console.error('❌ Failed to connect to Ganache:', error.message);
    process.exit(1);
}

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/financeTracker', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Connected to MongoDB');
}).catch(err => {
    console.log('⚠️  MongoDB connection failed, using in-memory storage');
});

// Schema
const TransactionSchema = new mongoose.Schema({
    transactionId: Number,
    description: String,
    amount: Number,
    type: String,
    sender: String,
    timestamp: Date,
    blockchainHash: String,
    status: { type: String, default: 'completed' }
});

const Transaction = mongoose.model('Transaction', TransactionSchema);

// Contract setup
let contractAddress = null;
let financeTracker = null;
let useBlockchain = false;

// Load deployment info if available
try {
    const deploymentInfo = require('./deployment.json');
    contractAddress = deploymentInfo.address;
    if (deploymentInfo.abi && deploymentInfo.abi.length > 0) {
        financeTracker = new web3.eth.Contract(deploymentInfo.abi, contractAddress);
        useBlockchain = true;
        console.log('✅ Contract loaded from deployment.json');
    } else {
        console.log('⚠️  Using mock mode - no contract ABI available');
    }
} catch (error) {
    console.log('⚠️  No deployment file found, using mock mode');
}

// Mock transactions storage (fallback)
let mockTransactions = [];
let mockNextId = 1;

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/api/status', async (req, res) => {
    try {
        const accounts = await web3.eth.getAccounts();
        const blockNumber = await web3.eth.getBlockNumber();
        
        const dbStatus = mongoose.connection.readyState === 1;
        let dbCount = 0;
        
        if (dbStatus) {
            dbCount = await Transaction.countDocuments();
        }
        
        res.json({
            blockchain: {
                connected: true,
                accounts: accounts.length,
                currentBlock: blockNumber,
                contractAddress: contractAddress,
                usingBlockchain: useBlockchain
            },
            database: {
                connected: dbStatus,
                transactionCount: dbCount
            },
            mock: {
                active: !useBlockchain,
                transactionCount: mockTransactions.length
            },
            mode: useBlockchain ? 'BLOCKCHAIN' : 'MOCK'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/accounts', async (req, res) => {
    try {
        const accounts = await web3.eth.getAccounts();
        res.json({
            testAccount: accounts[0],
            totalAccounts: accounts.length,
            note: 'Use the first account for testing'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add transaction endpoint
app.post('/api/transactions', async (req, res) => {
    try {
        const { description, amount, type, senderAddress } = req.body;
        
        if (useBlockchain && financeTracker) {
            // Blockchain mode
            console.log('🔗 Adding transaction to blockchain...');
            // For now, we'll simulate blockchain transaction
            const transaction = new Transaction({
                transactionId: mockNextId++,
                description,
                amount,
                type,
                sender: senderAddress || 'blockchain_user',
                timestamp: new Date(),
                blockchainHash: '0x' + Math.random().toString(16).substr(2, 64),
                status: 'blockchain_pending'
            });
            
            if (mongoose.connection.readyState === 1) {
                await transaction.save();
            } else {
                mockTransactions.push(transaction);
            }
            
            res.json({ 
                success: true, 
                message: 'Transaction added (Blockchain Mode)',
                transaction: transaction,
                mode: 'blockchain'
            });
            
        } else {
            // Mock mode
            console.log('🎭 Adding transaction in mock mode...');
            const transaction = {
                id: mockNextId++,
                description,
                amount,
                type,
                sender: senderAddress || 'mock_user',
                timestamp: new Date(),
                blockchainHash: 'mock_' + Math.random().toString(16).substr(2, 16),
                status: 'completed'
            };
            
            // Try to save to MongoDB, fallback to memory
            if (mongoose.connection.readyState === 1) {
                const dbTransaction = new Transaction(transaction);
                await dbTransaction.save();
            } else {
                mockTransactions.push(transaction);
            }
            
            res.json({ 
                success: true, 
                message: 'Transaction added (Mock Mode)',
                transaction: transaction,
                mode: 'mock'
            });
        }
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get transactions
app.get('/api/transactions', async (req, res) => {
    try {
        let transactions = [];
        
        if (mongoose.connection.readyState === 1) {
            transactions = await Transaction.find().sort({ timestamp: -1 });
        } else {
            transactions = mockTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
        
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Switch between modes
app.post('/api/mode', (req, res) => {
    const { mode } = req.body;
    
    if (mode === 'blockchain' && contractAddress) {
        useBlockchain = true;
        res.json({ success: true, mode: 'blockchain', message: 'Switched to blockchain mode' });
    } else {
        useBlockchain = false;
        res.json({ success: true, mode: 'mock', message: 'Switched to mock mode' });
    }
});

const PORT = process.env.PORT || 3001; // Changed to 3001 to avoid conflict

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Check status at http://localhost:${PORT}/api/status`);
    console.log(`🔧 Mode: ${useBlockchain ? 'BLOCKCHAIN' : 'MOCK'}`);
});