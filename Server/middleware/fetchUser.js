// middleware/fetchUser.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

const fetchUser = (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        // This case handles when the header 'auth-token' is completely missing or empty
        return res.status(401).send({ error: "Access denied: No token provided." });
    }
    try {
        const data = jwt.verify(token, JWT_SECRET);
        req.user = data.user;
        req.user.name = data.name;
        next();
    } catch (error) {
        // This block handles errors from jwt.verify (e.g., TokenExpiredError, JsonWebTokenError)
        console.error("JWT verification error:", error); // Log the actual error
        if (error.name === 'TokenExpiredError') {
            return res.status(401).send({ error: "Access denied: Token expired. Please log in again." });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({ error: "Access denied: Invalid token. Please log in again." });
        } else {
            return res.status(500).send({ error: "Internal server error during authentication." });
        }
    }
};

export default fetchUser;