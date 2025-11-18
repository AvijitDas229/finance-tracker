require('dotenv').config();
const express = require('express');
const { Web3 } = require('web3');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Fix Mongoose deprecation warning
mongoose.set('strictQuery', false);

// Initialize Web3 with latest syntax
let web3;
let blockchainStatus = 'disconnected';
try {
    web3 = new Web3('http://localhost:8545');
    console.log('✅ Web3 initialized with latest version');
    
    // Test connection
    web3.eth.getAccounts().then(accounts => {
        blockchainStatus = 'connected';
        console.log(`✅ Connected to Ganache - Found ${accounts.length} accounts`);
    }).catch(err => {
        blockchainStatus = 'mock';
        console.log('⚠️  Ganache not available, running in mock mode');
    });
} catch (error) {
    console.error('❌ Web3 initialization failed:', error.message);
    web3 = null;
    blockchainStatus = 'mock';
}

// MongoDB connection with modern syntax
let dbStatus = 'disconnected';

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finance-tracker');
        dbStatus = 'connected';
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        dbStatus = 'disconnected';
        console.log('❌ MongoDB connection failed:', err.message);
    }
};

// Call the async function
connectDB();

// ==================== DATABASE MODELS ====================

// User Schema
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user', 'viewer'], default: 'user' },
    walletAddress: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

// Transaction Schema with Categories
const TransactionSchema = new mongoose.Schema({
    transactionId: { type: Number, unique: true },
    description: String,
    amount: Number,
    type: { type: String, enum: ['income', 'expense'] },
    category: { 
        type: String, 
        enum: ['salary', 'rent', 'equipment', 'utilities', 'marketing', 'transfer', 'other'], 
        default: 'other' 
    },
    sender: String,
    receiver: String,
    timestamp: { type: Date, default: Date.now },
    blockchainHash: String,
    status: { type: String, default: 'completed' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const User = mongoose.model('User', UserSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);


// Available wallet addresses from Ganache
const AVAILABLE_WALLETS = [
    "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
    "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0", 
    "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b",
    "0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d",
    "0xd03ea8624C8C5987235048901fB614fDcA89b117",
    "0x95cED938F7991cd0dFcb48F0a06a40FA1aF46EBC",
    "0x3E5e9111Ae8eB78Fe1CC3bb8915d5D461F3Ef9A9",
    "0x28a8746e75304c0780E011BEd21C72cD78cd535E",
    "0xACa94ef8bD5ffEE41947b4585a84BdA5a3d3DA6E",
    "0x1dF62f291b2E969fB0849d99D9Ce41e2F137006e"
];

// Track assigned wallets - initialize with already used wallets
let assignedWallets = new Set();

// Initialize with already registered users
async function initializeAssignedWallets() {
    try {
        const users = await User.find({});
        users.forEach(user => {
            if (user.walletAddress) {
                assignedWallets.add(user.walletAddress);
            }
        });
        console.log(`✅ Initialized with ${assignedWallets.size} already assigned wallets`);
    } catch (error) {
        console.log('⚠️ Could not initialize assigned wallets');
    }
}

// Call this when server starts
initializeAssignedWallets();

// Helper to get available wallet
function getAvailableWallet() {
    for (let wallet of AVAILABLE_WALLETS) {
        if (!assignedWallets.has(wallet)) {
            assignedWallets.add(wallet);
            return wallet;
        }
    }
    throw new Error('No more wallets available');
}

// ==================== AUTHENTICATION MIDDLEWARE ====================

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false,
            error: 'Access token required' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false,
                error: 'Invalid or expired token' 
            });
        }
        req.user = user;
        next();
    });
};

// ==================== PUBLIC ROUTES ====================

// Health Check - No authentication required
app.get('/api/status', async (req, res) => {
    try {
        let blockchainInfo = { 
            connected: blockchainStatus === 'connected', 
            status: blockchainStatus,
            version: 'Web3 v4.x'
        };
        
        if (web3 && blockchainStatus === 'connected') {
            try {
                const accounts = await web3.eth.getAccounts();
                const blockNumber = await web3.eth.getBlockNumber();
                
                blockchainInfo = {
                    connected: true,
                    status: 'connected',
                    accounts: accounts.length,
                    currentBlock: Number(blockNumber),
                    network: 'Ganache Local',
                    version: 'Web3 v4.x',
                    testAccounts: accounts.slice(0, 3)
                };
            } catch (blockchainError) {
                blockchainInfo.error = blockchainError.message;
                blockchainInfo.status = 'error';
            }
        }

        const databaseConnected = mongoose.connection.readyState === 1;
        const userCount = databaseConnected ? await User.countDocuments() : 0;
        const transactionCount = databaseConnected ? await Transaction.countDocuments() : 0;

        res.json({
            success: true,
            system: {
                status: 'operational',
                serverTime: new Date().toISOString(),
                uptime: Math.floor(process.uptime()) + ' seconds',
                environment: process.env.NODE_ENV || 'development',
                mode: blockchainInfo.connected ? 'blockchain' : 'mock'
            },
            services: {
                blockchain: blockchainInfo,
                database: {
                    connected: databaseConnected,
                    status: databaseConnected ? 'connected' : 'disconnected',
                    users: userCount,
                    transactions: transactionCount
                },
                authentication: 'active',
                api: 'active'
            },
            endpoints: {
                public: ['/api/status', '/api/auth/register', '/api/auth/login'],
                protected: ['/api/transactions', '/api/dashboard', '/api/auth/me']
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// User Registration - Auto-assign wallet with initial balance
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username, email, and password are required'
            });
        }

        // Check database connection
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                error: 'Database not available. Please try again later.'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                error: 'User with this email or username already exists' 
            });
        }

        // Assign wallet automatically
        const walletAddress = getAvailableWallet();

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = new User({
            username,
            email,
            password: hashedPassword,
            walletAddress: walletAddress
        });

        await user.save();

        // ✅ CREATE INITIAL 100 ETH BALANCE TRANSACTION
        const initialTransaction = new Transaction({
            transactionId: Date.now(),
            description: "Initial Wallet Balance",
            amount: 100,
            type: "income",
            category: "other",
            sender: "system",
            receiver: walletAddress,
            blockchainHash: "0x" + Math.random().toString(16).substr(2, 64),
            createdBy: user._id
        });

        await initialTransaction.save();

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id, 
                username: user.username, 
                role: user.role,
                walletAddress: user.walletAddress
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully with 100 ETH initial balance!',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                walletAddress: user.walletAddress
            }
        });

    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Check database connection
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                error: 'Database not available. Please try again later.'
            });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid email or password' 
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid email or password' 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id, 
                username: user.username, 
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                walletAddress: user.walletAddress
            }
        });

    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// ==================== PROTECTED ROUTES ====================

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        // Check database connection
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                error: 'Database not available'
            });
        }

        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Add Transaction - CREATE TRANSACTIONS FOR BOTH SENDER AND RECEIVER
app.post('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const { description, amount, type, category, receiver } = req.body;

        // Validation
        if (!description || !amount || !type) {
            return res.status(400).json({
                success: false,
                error: 'Description, amount, and type are required'
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be positive'
            });
        }

        // Check database connection
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                error: 'Database not available'
            });
        }

        // Get sender's info
        const senderUser = await User.findById(req.user.userId);
        if (!senderUser) {
            return res.status(404).json({ 
                success: false,
                error: 'Sender user not found' 
            });
        }

        // Find receiver user by wallet address
        const receiverUser = await User.findOne({ walletAddress: receiver });
        if (!receiverUser) {
            return res.status(400).json({
                success: false,
                error: 'Receiver wallet address not found in our system'
            });
        }

        // Generate unique transaction IDs
        const lastTransaction = await Transaction.findOne().sort({ transactionId: -1 });
        const baseTransactionId = lastTransaction ? lastTransaction.transactionId + 1 : 1;

        // ✅ CREATE SENDER'S EXPENSE TRANSACTION
        const senderTransaction = new Transaction({
            transactionId: baseTransactionId,
            description: description,
            amount: parseFloat(amount),
            type: 'expense',
            category: category || 'transfer',
            sender: senderUser.walletAddress,
            receiver: receiverUser.walletAddress,
            blockchainHash: '0x' + Math.random().toString(16).substr(2, 64),
            createdBy: senderUser._id
        });

        // ✅ CREATE RECEIVER'S INCOME TRANSACTION
        const receiverTransaction = new Transaction({
            transactionId: baseTransactionId + 1,
            description: `Received from ${senderUser.username}`,
            amount: parseFloat(amount),
            type: 'income',
            category: 'transfer',
            sender: senderUser.walletAddress,
            receiver: receiverUser.walletAddress,
            blockchainHash: '0x' + Math.random().toString(16).substr(2, 64),
            createdBy: receiverUser._id
        });

        // Save both transactions
        await senderTransaction.save();
        await receiverTransaction.save();

        res.status(201).json({ 
            success: true, 
            message: 'Transaction completed successfully!',
            transaction: {
                id: senderTransaction._id,
                transactionId: senderTransaction.transactionId,
                description: senderTransaction.description,
                amount: senderTransaction.amount,
                type: senderTransaction.type,
                category: senderTransaction.category,
                sender: senderTransaction.sender,
                receiver: senderTransaction.receiver,
                timestamp: senderTransaction.timestamp
            }
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get User's Transactions
app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        // Check database connection
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                error: 'Database not available'
            });
        }

        const transactions = await Transaction.find({ 
            createdBy: req.user.userId 
        }).sort({ timestamp: -1 });
        
        res.json({
            success: true,
            count: transactions.length,
            transactions
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get Dashboard Summary
app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
    try {
        // Check database connection
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                error: 'Database not available'
            });
        }

        const transactions = await Transaction.find({ createdBy: req.user.userId });
        
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const balance = totalIncome - totalExpenses;

        // Category breakdown
        const categoryData = transactions.reduce((acc, transaction) => {
            const category = transaction.category;
            if (!acc[category]) acc[category] = { income: 0, expense: 0, total: 0 };
            acc[category][transaction.type] += transaction.amount;
            acc[category].total += transaction.amount;
            return acc;
        }, {});

        res.json({
            success: true,
            summary: {
                totalIncome,
                totalExpenses,
                balance,
                transactionCount: transactions.length
            },
            analytics: {
                byCategory: categoryData
            },
            recentTransactions: transactions.slice(0, 5).map(t => ({
                id: t._id,
                description: t.description,
                amount: t.amount,
                type: t.type,
                category: t.category,
                date: t.timestamp
            }))
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Dashboard functions with auto-refresh
let dashboardRefreshInterval;

async function loadDashboard() {
    if (!currentToken) return;

    try {
        // Get user profile
        const userResponse = await fetch('/api/auth/me', {
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });
        const userData = await userResponse.json();
        
        if (userData.success) {
            currentUser = userData.user;
            document.getElementById('walletAddress').textContent = currentUser.walletAddress;
            document.getElementById('receiveWalletAddress').textContent = currentUser.walletAddress;
        }

        // Get dashboard data
        const dashboardResponse = await fetch('/api/dashboard/summary', {
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });
        const dashboardData = await dashboardResponse.json();
        
        if (dashboardData.success) {
            document.getElementById('totalBalance').textContent = dashboardData.summary.balance + ' ETH';
            document.getElementById('totalIncome').textContent = dashboardData.summary.totalIncome + ' ETH';
            document.getElementById('totalExpenses').textContent = dashboardData.summary.totalExpenses + ' ETH';
            
            // Show last update time
            console.log('✅ Dashboard updated at:', new Date().toLocaleTimeString());
        }
    } catch (error) {
        console.error('Dashboard loading failed:', error);
    }
}

// Auto-refresh dashboard every 5 seconds
function startDashboardAutoRefresh() {
    // Clear any existing interval
    if (dashboardRefreshInterval) {
        clearInterval(dashboardRefreshInterval);
    }
    
    // Set new interval - refresh every 5 seconds
    dashboardRefreshInterval = setInterval(() => {
        if (currentToken) {
            loadDashboard();
        }
    }, 5000); // 5000ms = 5 seconds
    
    console.log('🔄 Dashboard auto-refresh started');
}

// Stop auto-refresh
function stopDashboardAutoRefresh() {
    if (dashboardRefreshInterval) {
        clearInterval(dashboardRefreshInterval);
        dashboardRefreshInterval = null;
        console.log('⏹️ Dashboard auto-refresh stopped');
    }
}

// Get all registered wallets (for demo purposes)
app.get('/api/wallets', authenticateToken, async (req, res) => {
    try {
        const users = await User.find({}).select('username walletAddress');
        const wallets = users.map(user => ({
            username: user.username,
            walletAddress: user.walletAddress
        }));
        
        res.json({
            success: true,
            wallets: wallets
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// ==================== ROOT ENDPOINT ====================

app.get('/', (req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    res.json({
        success: true,
        message: '🚀 Finance Tracker API is running!',
        version: '1.0.0',
        status: {
            database: dbConnected ? 'connected' : 'disconnected',
            blockchain: blockchainStatus,
            server: 'operational'
        },
        documentation: {
            status: 'GET /api/status',
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                profile: 'GET /api/auth/me'
            },
            transactions: {
                create: 'POST /api/transactions',
                list: 'GET /api/transactions'
            },
            dashboard: 'GET /api/dashboard/summary'
        },
        timestamp: new Date().toISOString()
    });
});

// ==================== ERROR HANDLING ====================

// 404 Handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`
    });
});

// Global Error Handler
app.use((error, req, res, next) => {
    console.error('Global Error Handler:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
    });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3001;

// Delay the startup message to show actual connection status
setTimeout(() => {
    console.log(`\n🎉 Finance Tracker Server Started Successfully!`);
    console.log(`=========================================`);
    console.log(`🚀 Server URL: http://localhost:${PORT}`);
    console.log(`📊 Status:    http://localhost:${PORT}/api/status`);
    console.log(`🔐 Register:  http://localhost:${PORT}/api/auth/register`);
    console.log(`🔍 Database:  ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`⛓️  Blockchain: ${blockchainStatus === 'connected' ? '✅ Web3 v4.x Ready' : '⚠️  Mock Mode'}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=========================================\n`);
}, 1000);

app.listen(PORT, () => {
    console.log(`Server process started on port ${PORT}...`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});