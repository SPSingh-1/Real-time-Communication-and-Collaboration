import jwt from 'jsonwebtoken';
const JWT_SECRET = 'Shashi@2002';

const fetchUser = (req, res, next) => {
  const token = req.header('auth-token');
  if (!token)
    return res.status(401).json({ error: 'Access denied: No token provided' });

  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data.user;
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

export default fetchUser;