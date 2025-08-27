import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import axios from 'axios';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import './Reg.css'; 

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phoneno: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('http://localhost:3001/api/auth/createuser', form);
      if (res.data.success) {
        localStorage.setItem('token', res.data.authToken);
        navigate('/login');
      } else {
        setError('Signup failed. Check your input.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    }
  };

  const cardVariants = {
    initial: { opacity: 0, scale: 0.9, y: 50 },
    animate: { opacity: 1, scale: 1, y: 0 },
    hover: { scale: 1.03, rotate: 1 },
  };

  return (
    <div className="register-bg">
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="card-container"
      >
        <h3
          className="text-center text-[18px] text-blue-500 mb-2 font-bold"
          style={{
            textShadow: "2px 2px 4px rgba(0,0,0,0.3), 4px 4px 8px rgba(0,0,0,0.2)"
          }}
        >
          Create Your Account
        </h3>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <form onSubmit={handleSignup} className="w-full mt-2 form-content text-white">
          <TextField
            type="text"
            label="Name"
            name="name"
            variant="outlined"
            className="text-white"
            required
            value={form.name}
            onChange={handleChange}
            InputProps={{
            style: { color: "white" }, 
          }}
          InputLabelProps={{
            style: { color: "white" }, 
          }}
          />
          <TextField
            type="email"
            label="Email"
            name="email"
            variant="outlined"
            required
            value={form.email}
            onChange={handleChange}
             InputProps={{
            style: { color: "white" }, 
          }}
          InputLabelProps={{
            style: { color: "white" }, 
          }}
          />
          <TextField
            type="text"
            label="Phone No."
            name="phoneno"
            variant="outlined"
            required
            value={form.phoneno}
            onChange={handleChange}
             InputProps={{
            style: { color: "white" }, 
          }}
          InputLabelProps={{
            style: { color: "white" }, 
          }}
          />
          <TextField
            type="password"
            label="Password"
            name="password"
            variant="outlined"
            required
            value={form.password}
            onChange={handleChange}
             InputProps={{
            style: { color: "white" }, 
          }}
          InputLabelProps={{
            style: { color: "white" }, 
          }}
          />

          <Button type="submit" className="!bg-blue-500 !text-white w-full glow-button">
            Sign Up
          </Button>
        </form>

        <p className="login-link">
          Already have an account?{' '}
          <Link className="login-anchor" to="/login">
            Login
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
