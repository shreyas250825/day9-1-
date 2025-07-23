"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express = __importStar(require("express"));
require("reflect-metadata");
require("dotenv/config");
const bcrypt = __importStar(require("bcrypt"));
const jwt = __importStar(require("jsonwebtoken"));
const class_transformer_1 = require("class-transformer");
const data_source_1 = require("./data-source");
const User_1 = require("./entities/User");
const BookDTO_1 = require("./dtos/BookDTO");
const cors = __importStar(require("cors")); // Works with esModuleInterop: true
const app = express();
exports.app = app;
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
app.use(express.json());
app.use(cors());
// Middleware to verify JWT token
const verifyUserToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(400).json({ error: 'Invalid token.' });
    }
};
// Role-based middleware
const IsUser = (req, res, next) => {
    if (req.user.user_type_id !== 0) {
        return res.status(403).json({ error: 'Access denied. User role required.' });
    }
    next();
};
const IsAdmin = (req, res, next) => {
    if (req.user.user_type_id !== 1) {
        return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    next();
};
// 1. User Registration
app.post('/api/register', async (req, res) => {
    try {
        const { email, name, password, user_type_id } = req.body;
        // Check if user already exists
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const existingUser = await userRepository.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists.' });
        }
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        // Create new user
        const newUser = userRepository.create({
            email,
            name,
            password: hashedPassword,
            user_type_id: user_type_id || 0 // Default to user role
        });
        await userRepository.save(newUser);
        // Generate JWT token
        const token = jwt.sign({ id: newUser.id, email: newUser.email, user_type_id: newUser.user_type_id }, JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({ token });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Registration failed.' });
    }
});
// 2. User Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find user
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials.' });
        }
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials.' });
        }
        // Generate JWT token
        const token = jwt.sign({ id: user.id, email: user.email, user_type_id: user.user_type_id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login failed.' });
    }
});
// Protected routes for testing middleware
app.get('/api/user-route', verifyUserToken, IsUser, (req, res) => {
    res.json({ message: 'This is a user-only route', user: req.user });
});
app.get('/api/admin-route', verifyUserToken, IsAdmin, (req, res) => {
    res.json({ message: 'This is an admin-only route', user: req.user });
});
// DTO Implementation
// BookDTO is imported from './dtos/BookDTO'
// 2. Convert plain object to DTO
app.post('/books', (req, res) => {
    try {
        const bookData = req.body;
        const bookDTO = (0, class_transformer_1.plainToClass)(BookDTO_1.BookDTO, bookData);
        console.log('Converted DTO:', bookDTO);
        res.json({ message: 'Book received and converted to DTO', book: bookDTO });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process book data' });
    }
});
// 3. Prepare DTO for API response
app.get('/books/:id', (req, res) => {
    // Mock book data
    const mockBook = {
        title: 'Clean Code',
        author: 'Robert C. Martin',
        publishedYear: 2008,
        isbn: '978-0132350884',
        internalNotes: 'Great book for learning clean coding practices'
    };
    const bookDTO = (0, class_transformer_1.plainToClass)(BookDTO_1.BookDTO, mockBook);
    res.json(bookDTO);
});
// Error Handling Implementation
// Custom error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: err.message,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
});
// Synchronous error route
app.get('/sync-error', (req, res) => {
    throw new Error('This is a synchronous error');
});
// Asynchronous error route
app.get('/async-error', async (req, res, next) => {
    try {
        throw new Error('This is an asynchronous error');
    }
    catch (err) {
        next(err);
    }
});
// Manual error forwarding
app.get('/manual-error', (req, res, next) => {
    const error = new Error('Manually forwarded error');
    next(error);
});
// Start server
data_source_1.AppDataSource.initialize()
    .then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
})
    .catch(error => console.log("TypeORM connection error: ", error));
