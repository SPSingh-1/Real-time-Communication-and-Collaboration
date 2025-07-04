import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { FcGoogle } from "react-icons/fc";
import axios from 'axios';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:3001/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard'); // ✅ Redirect on successful login
    } catch (err) {
      alert("Login failed: " + err.response?.data?.error || "Unknown error");
    }
  };

  return (
    <div className="p-4 mt-7">
      <div className="card shadow-md w-[400px] m-auto rounded-md bg-gray-50 p-5 px-10">
        <h3 className="text-center text-[18px] text-black font-bold">Login to your account</h3>

        <form onSubmit={handleLogin} className='w-full mt-5'>
          <div className='form-group w-full mb-5'>
            <TextField
              type="email"
              id="email"
              label="Email Id"
              variant="outlined"
              className='w-full'
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className='form-group w-full mb-5 relative'>
            <TextField
              type="password"
              id="password"
              label="Password"
              variant="outlined"
              className='w-full'
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className='flex items-center w-full mt-3 mb-3'>
            <Button type="submit" className='!bg-blue-500 !text-black w-full'>Login</Button>
          </div>

          <p className='text-center'>Not Registered?
            <Link className='link text-[14px] font-[600] text-blue-600' to="/"> Sign Up</Link>
          </p>

          <p className='text-center font-[500] mb-[10px]'> Or continue with social account</p>

          <Button className='flex gap-3 w-full !bg-[#f1f1f1] !text-blue-600'>
            <FcGoogle className='text-[20px]' />Login with Google
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
