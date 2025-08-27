import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { FcGoogle } from "react-icons/fc";
import axios from 'axios';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';  
import './Reg.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:3001/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      alert("Login failed: " + (err.response?.data?.error || "Unknown error"));
    }
  };

  // ✅ same variants as signup page
  const cardVariants = {
    initial: { opacity: 0, scale: 0.9, y: 50 },
    animate: { opacity: 1, scale: 1, y: 0 },
    hover: { scale: 1.03, rotate: 1 },
  };

  return (
    <div className="login-bg">
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="card-container"
      >
        <h3
          className="text-center text-[18px] text-blue-500 font-bold mb-2"
          style={{
            textShadow: "2px 2px 4px rgba(0,0,0,0.3), 4px 4px 8px rgba(0,0,0,0.2)"
          }}
        >
          Login to your account
        </h3>

        <form onSubmit={handleLogin} className="w-full mt-5 form-content text-white">
          <TextField
            type="email"
            id="email"
            label="Email Id"
            variant="outlined"
            className="w-full"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{ style: { color: "white" } }}
            InputLabelProps={{ style: { color: "white" } }}
          />

          <TextField
            type="password"
            id="password"
            label="Password"
            variant="outlined"
            className="w-full"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{ style: { color: "white" } }}
            InputLabelProps={{ style: { color: "white" } }}
          />

          <Button type="submit" className="!bg-blue-500 !text-white w-full mt-4 glow-button">
            Login
          </Button>

          <p className="text-center mt-3">
            Not Registered?{' '}
            <Link className="login-anchor" to="/">
              Sign Up
            </Link>
          </p>

          <p className="text-center font-[500] mb-3 mt-2"> Or continue with social account</p>

          <Button className="flex gap-3 w-full !bg-[#f1f1f1] !text-blue-600">
            <FcGoogle className="text-[20px]" /> Login with Google
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage;
