// jwt-test.js - Run this script to test JWT functionality
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

console.log('🔍 Testing JWT Configuration...');
console.log('===============================================');

// Check if JWT_SECRET is loaded
const JWT_SECRET = process.env.JWT_SECRET;
console.log('JWT_SECRET loaded:', JWT_SECRET ? 'YES ✅' : 'NO ❌');

if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET is not defined in .env file');
    console.error('Please add JWT_SECRET=your_secret_key to your .env file');
    process.exit(1);
}

console.log('JWT_SECRET value:', JWT_SECRET);

// Test JWT signing and verification
try {
    const testPayload = {
        id: '68b3044f9b0f2a970959b60a',
        name: 'Ram',
        email: 'ram@gmail.com',
        role: 'team',
        teamId: '68b1d5c3766a0b566c100616'
    };

    console.log('\n🔐 Testing JWT signing...');
    const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '24h' });
    console.log('Token generated successfully ✅');
    console.log('Token:', token.substring(0, 50) + '...');

    console.log('\n🔍 Testing JWT verification...');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token verified successfully ✅');
    console.log('Decoded payload:', decoded);

    console.log('\n✅ JWT Configuration is working correctly!');
    console.log('===============================================');

} catch (error) {
    console.error('❌ JWT Test failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
}