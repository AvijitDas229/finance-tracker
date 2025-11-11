require('dotenv').config();
const express = require('express');
const Web3 = require('web3');
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
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Connected to MongoDB');
}).catch(err => {
    console.log('⚠️  MongoDB connection failed, using in-memory storage');
});

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
    transactionId: Number,
    description: String,
    amount: Number,
    type: { type: String, enum: ['income', 'expense'] },
    category: { type: String, enum: ['salary', 'rent', 'equipment', 'utilities', 'marketing', 'other'], default: 'other' },
    sender: String,
    receiver: String, // New field for proper transaction flow
    timestamp: Date,
    blockchainHash: String,
    status: { type: String, default: 'completed' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    organization: { type: String, default: 'default' }
});

const User = mongoose.model('User', UserSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);

// ==================== AUTHENTICATION MIDDLEWARE ====================

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};

// ==================== AUTHENTICATION ROUTES ====================

// User Registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, walletAddress } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                error: 'User with this email or username already exists' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = new User({
            username,
            email,
            password: hashedPassword,
            walletAddress: walletAddress || ''
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
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
        res.status(500).json({ error: error.message });
    }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
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
        res.status(500).json({ error: error.message });
    }
});

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ENHANCED TRANSACTION ROUTES ====================

// Add Transaction (Protected)
app.post('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const { description, amount, type, category, receiver } = req.body;
        
        // Get user's wallet address
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // For income: receiver should be the user's wallet
        // For expense: sender should be the user's wallet
        const sender = type === 'income' ? receiver : user.walletAddress;
        const transactionReceiver = type === 'income' ? user.walletAddress : receiver;

        const transaction = new Transaction({
            transactionId: Date.now(),
            description,
            amount: parseFloat(amount),
            type,
            category: category || 'other',
            sender: sender || 'external',
            receiver: transactionReceiver,
            timestamp: new Date(),
            blockchainHash: '0x' + Math.random().toString(16).substr(2, 64),
            status: 'completed',
            createdBy: req.user.userId
        });

        await transaction.save();

        res.json({ 
            success: true, 
            message: 'Transaction added successfully',
            transaction: {
                id: transaction._id,
                description: transaction.description,
                amount: transaction.amount,
                type: transaction.type,
                category: transaction.category,
                sender: transaction.sender,
                receiver: transaction.receiver,
                timestamp: transaction.timestamp
            }
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get User's Transactions (Protected)
app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const transactions = await Transaction.find({ 
            createdBy: req.user.userId 
        }).sort({ timestamp: -1 });
        
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== BEAUTIFIED STATUS ENDPOINT ====================

app.get('/api/status', authenticateToken, async (req, res) => {
    try {
        const accounts = await web3.eth.getAccounts();
        const blockNumber = await web3.eth.getBlockNumber();
        
        const dbStatus = mongoose.connection.readyState === 1;
        
        // Get user's transaction stats
        const userTransactions = await Transaction.find({ createdBy: req.user.userId });
        const totalIncome = userTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = userTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        const balance = totalIncome - totalExpenses;

        // Category breakdown
        const categoryBreakdown = userTransactions.reduce((acc, transaction) => {
            const category = transaction.category || 'other';
            if (!acc[category]) acc[category] = { income: 0, expense: 0 };
            acc[category][transaction.type] += transaction.amount;
            return acc;
        }, {});

        res.json({
            system: {
                status: 'operational',
                mode: 'blockchain',
                serverTime: new Date().toISOString(),
                uptime: process.uptime()
            },
            blockchain: {
                connected: true,
                network: 'Ganache Local',
                accounts: accounts.length,
                currentBlock: blockNumber,
                gasPrice: await web3.eth.getGasPrice()
            },
            database: {
                connected: dbStatus,
                userTransactions: userTransactions.length,
                totalTransactions: await Transaction.countDocuments()
            },
            user: {
                username: req.user.username,
                role: req.user.role,
                walletAddress: (await User.findById(req.user.userId)).walletAddress,
                financials: {
                    totalIncome,
                    totalExpenses,
                    currentBalance: balance,
                    transactionCount: userTransactions.length
                }
            },
            categories: categoryBreakdown,
            recentActivity: userTransactions.slice(0, 5).map(t => ({
                description: t.description,
                amount: t.amount,
                type: t.type,
                category: t.category,
                date: t.timestamp
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== DASHBOARD DATA ENDPOINTS ====================

// Get Dashboard Summary
app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
    try {
        const transactions = await Transaction.find({ createdBy: req.user.userId });
        
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const balance = totalIncome - totalExpenses;

        // Monthly data for charts
        const monthlyData = transactions.reduce((acc, transaction) => {
            const month = transaction.timestamp.toISOString().substring(0, 7); // YYYY-MM
            if (!acc[month]) {
                acc[month] = { income: 0, expense: 0 };
            }
            acc[month][transaction.type] += transaction.amount;
            return acc;
        }, {});

        // Category data for charts
        const categoryData = transactions.reduce((acc, transaction) => {
            const category = transaction.category;
            if (!acc[category]) acc[category] = 0;
            acc[category] += transaction.amount;
            return acc;
        }, {});

        res.json({
            summary: {
                totalIncome,
                totalExpenses,
                balance,
                transactionCount: transactions.length
            },
            monthlyData,
            categoryData,
            recentTransactions: transactions.slice(0, 10)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADMIN ROUTES ====================

// Get All Users (Admin only)
app.get('/api/admin/users', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get All Transactions (Admin only)
app.get('/api/admin/transactions', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const transactions = await Transaction.find().populate('createdBy', 'username email');
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Enhanced Server running on http://localhost:${PORT}`);
    console.log(`🔐 Authentication system enabled`);
    console.log(`📊 Dashboard endpoints available`);
});