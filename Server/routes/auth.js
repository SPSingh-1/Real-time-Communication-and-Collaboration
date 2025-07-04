import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import fetchUser from '../middleware/fetchUser.js';

const router = express.Router();
const JWT_SECRET = 'Shashi@2002';

// Route: POST /api/auth/createuser
router.post(
  '/createuser',
  [
    body('name', 'Enter a valid name').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('phoneno', 'Enter a valid phone number').isMobilePhone(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, email, phoneno, password } = req.body;
      let user = await User.findOne({ email });
      if (user) return res.status(400).json({ error: 'User already exists' });

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user = await User.create({ name, email, phoneno, password: hashedPassword });

      const token = jwt.sign({ user: { id: user.id } }, JWT_SECRET);
      res.json({ success: true, token });
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal server error');
    }
  }
);

// Route: POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').exists()
  ],
  async (req, res) => {
    const { email, password } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ user: { id: user.id } }, JWT_SECRET);
      res.json({ success: true, token });
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal server error');
    }
  }
);

// Route: POST /api/auth/getuser
router.post('/getuser', fetchUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
