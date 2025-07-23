import express from 'express';
import 'reflect-metadata';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { plainToClass } from 'class-transformer';
import { AppDataSource } from './data-source';
import { User } from './entities/User';
import { BookDTO } from './dtos/BookDTO';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

app.use(express.json());
app.use(cors());

// Middleware to verify JWT token
const verifyUserToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(400).json({ error: 'Invalid token.' });
  }
};

// Role-based middleware
const IsUser = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.user_type_id !== 0) {
    return res.status(403).json({ error: 'Access denied. User role required.' });
  }
  next();
};

const IsAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.user_type_id !== 1) {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }
  next();
};

// 1. User Registration
app.post('/api/register', async (req: Request, res: Response) => {
  try {
    const { email, name, password, user_type_id } = req.body;
    
    const userRepository = AppDataSource.getRepository(User);
    const existingUser = await userRepository.findOne({ where: { email } });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = userRepository.create({
      email,
      name,
      password: hashedPassword,
      user_type_id: user_type_id || 0
    });

    await userRepository.save(newUser);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, user_type_id: newUser.user_type_id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// 2. User Login
app.post('/api/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { email } });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, user_type_id: user.user_type_id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// Protected routes
app.get('/api/user-route', verifyUserToken, IsUser, (req: Request, res: Response) => {
  res.json({ message: 'This is a user-only route', user: req.user });
});

app.get('/api/admin-route', verifyUserToken, IsAdmin, (req: Request, res: Response) => {
  res.json({ message: 'This is an admin-only route', user: req.user });
});

// DTO routes
app.post('/books', (req: Request, res: Response) => {
  try {
    const bookData = req.body;
    const bookDTO = plainToClass(BookDTO, bookData);
    console.log('Converted DTO:', bookDTO);
    res.json({ message: 'Book received and converted to DTO', book: bookDTO });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process book data' });
  }
});

app.get('/books/:id', (req: Request, res: Response) => {
  const mockBook = {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    publishedYear: 2008,
    isbn: '978-0132350884',
    internalNotes: 'Great book for learning clean coding practices'
  };

  const bookDTO = plainToClass(BookDTO, mockBook);
  res.json(bookDTO);
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});

app.get('/sync-error', (req: Request, res: Response) => {
  throw new Error('This is a synchronous error');
});

app.get('/async-error', async (req: Request, res: Response, next: NextFunction) => {
  try {
    throw new Error('This is an asynchronous error');
  } catch (err) {
    next(err);
  }
});

app.get('/manual-error', (req: Request, res: Response, next: NextFunction) => {
  const error = new Error('Manually forwarded error');
  next(error);
});

// Start server
AppDataSource.initialize()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(error => console.log("TypeORM connection error: ", error));

export { app };