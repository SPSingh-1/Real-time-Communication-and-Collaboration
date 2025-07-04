import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import axios from 'axios';

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

  return (
    <div className="p-4 mt-7">
      <div className="card shadow-md w-[400px] m-auto rounded-md bg-gray-50 p-5 px-10">
        <h3 className="text-center text-[18px] text-black mb-2 font-bold">Create Your Account</h3>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <form onSubmit={handleSignup} className='w-full mt-2  flex flex-col gap-3'>
          <TextField
            type="text"
            label="Name"
            name="name"
            variant="outlined"
            className='w-full mb-4'
            required
            value={form.name}
            onChange={handleChange}
          />
          <TextField
            type="email"
            label="Email"
            name="email"
            variant="outlined"
            className='w-full mb-4'
            required
            value={form.email}
            onChange={handleChange}
          />
          <TextField
            type="text"
            label="Phone No."
            name="phoneno"
            variant="outlined"
            className='w-full mb-4'
            required
            value={form.phoneno}
            onChange={handleChange}
          />
          <TextField
            type="password"
            label="Password"
            name="password"
            variant="outlined"
            className='w-full mb-4'
            required
            value={form.password}
            onChange={handleChange}
          />

          <Button type="submit" className='!bg-blue-500 !text-black w-full'>
            Sign Up
          </Button>
        </form>

        <p className="text-center mt-4 text-sm">
          Already have an account?{' '}
          <Link className='text-blue-600 font-semibold' to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
