import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { FcGoogle } from "react-icons/fc";
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import axios from 'axios';
import './Reg.css';
import useAppContext from "../context/useAppContext";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, user, loading } = useAppContext();
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'single',
    teamId: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(''); // Clear error when user types
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = { 
        email: form.email, 
        password: form.password, 
        role: form.role 
      };

      if (form.role === 'team') {
        if (!form.teamId.trim()) {
          setError("Please enter your Team ID");
          setIsLoading(false);
          return;
        }
        payload.teamId = form.teamId.trim();
      }

      if (form.role === 'global') {
        payload.globalId = 'GLOBAL123';
      }

      const res = await axios.post('http://localhost:3001/api/auth/login', payload);

      if (!res.data.success) {
        throw new Error(res.data.error || 'Login failed');
      }

      console.log('Login response:', res.data); // Debug log

      setSuccess('Login successful! Redirecting...');
      
      // FIXED: Pass the complete user object with token
      const userWithToken = {
        ...res.data.user,
        token: res.data.token // Ensure token is included
      };
      
      console.log('Calling login with:', userWithToken); // Debug log
      
      await login(userWithToken);
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);

    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleDescription = () => {
    switch (form.role) {
      case 'single':
        return 'Personal account for individual use';
      case 'team':
        return 'Collaborate with your team members';
      case 'global':
        return 'Join the global community (ID: GLOBAL123)';
      default:
        return '';
    }
  };

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="login-bg flex items-center justify-center">
        <div className="text-white text-center">
          <CircularProgress sx={{ color: 'white', mb: 2 }} />
          <div>Checking authentication...</div>
        </div>
      </div>
    );
  }

  const cardVariants = {
    initial: { opacity: 0, scale: 0.9, y: 50 },
    animate: { opacity: 1, scale: 1, y: 0 },
    hover: { scale: 1.02, rotate: 0.5 },
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
        <h3 className="text-center text-blue-400 font-bold text-2xl mb-2">
          Welcome Back
        </h3>
        <p className="text-center text-gray-300 mb-6">Login to your account</p>

        {error && (
          <Alert severity="error" className="mb-4 !bg-red-900 !text-white">
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" className="mb-4 !bg-green-900 !text-white">
            {success}
          </Alert>
        )}

        <form onSubmit={handleLogin} className="w-full form-content text-white space-y-4">
          <TextField
            type="email"
            label="Email Address"
            name="email"
            required
            fullWidth
            value={form.email}
            onChange={handleChange}
            disabled={isLoading}
            variant="outlined"
            InputProps={{ 
              style: { color: "white" },
              className: "bg-gray-800/50 rounded-lg"
            }}
            InputLabelProps={{ style: { color: "white" } }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
              }
            }}
          />

          <TextField
            type="password"
            label="Password"
            name="password"
            required
            fullWidth
            value={form.password}
            onChange={handleChange}
            disabled={isLoading}
            variant="outlined"
            InputProps={{ 
              style: { color: "white" },
              className: "bg-gray-800/50 rounded-lg"
            }}
            InputLabelProps={{ style: { color: "white" } }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
              }
            }}
          />

          {/* ENHANCED ROLE SELECTION */}
          <div className="space-y-3">
            <label className="block text-white font-medium">Select Your Role:</label>
            <div className="grid grid-cols-1 gap-3">
              {[
                { value: 'single', label: 'Personal', icon: '👤', desc: 'Individual account' },
                { value: 'team', label: 'Team', icon: '👥', desc: 'Team collaboration' },
                { value: 'global', label: 'Global', icon: '🌍', desc: 'Global community' }
              ].map((role) => (
                <label
                  key={role.value}
                  className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    form.role === role.value
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={form.role === role.value}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="sr-only"
                  />
                  <span className="text-2xl mr-3">{role.icon}</span>
                  <div>
                    <div className="text-white font-medium">{role.label}</div>
                    <div className="text-gray-400 text-sm">{role.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="text-sm text-gray-400 bg-gray-800/30 p-3 rounded-lg">
              {getRoleDescription()}
            </div>
          </div>

          {/* TEAM ID INPUT */}
          {form.role === 'team' && (
            <TextField
              type="text"
              label="Team ID"
              name="teamId"
              required
              fullWidth
              value={form.teamId}
              onChange={handleChange}
              disabled={isLoading}
              placeholder="Enter your 5-character Team ID"
              variant="outlined"
              InputProps={{ 
                style: { color: 'white' },
                className: "bg-gray-800/50 rounded-lg"
              }}
              InputLabelProps={{ style: { color: 'white' } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: '#10b981' },
                }
              }}
            />
          )}

          {/* GLOBAL ID DISPLAY */}
          {form.role === 'global' && (
            <TextField
              type="text"
              label="Global ID"
              value="GLOBAL123"
              fullWidth
              disabled
              variant="outlined"
              InputProps={{ 
                readOnly: true, 
                style: { color: 'white' },
                className: "bg-purple-900/30 rounded-lg"
              }}
              InputLabelProps={{ style: { color: 'white' } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(147, 51, 234, 0.5)' },
                }
              }}
            />
          )}

          <Button 
            type="submit" 
            fullWidth
            disabled={isLoading}
            className="!bg-gradient-to-r !from-blue-600 !to-blue-700 !text-white !py-3 !mt-6 !rounded-lg !font-semibold !text-lg hover:!from-blue-700 hover:!to-blue-800 !transition-all !duration-200 !shadow-lg hover:!shadow-xl disabled:!opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <CircularProgress size={20} sx={{ color: 'white' }} />
                Signing In...
              </div>
            ) : (
              'Sign In'
            )}
          </Button>

          <p className="text-center mt-4 text-gray-300">
            Don't have an account?{' '}
            <Link 
              className="text-blue-400 hover:text-blue-300 transition font-medium" 
              to="/register"
            >
              Sign Up
            </Link>
          </p>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-600"></div>
            <span className="px-4 text-gray-400 text-sm">Or continue with</span>
            <div className="flex-1 border-t border-gray-600"></div>
          </div>

          <Button 
            type="button"
            fullWidth
            disabled={isLoading}
            className="!bg-white !text-gray-800 !py-3 !rounded-lg !font-semibold hover:!bg-gray-100 !transition-all !duration-200 !shadow-lg hover:!shadow-xl"
          >
            <FcGoogle className="text-xl mr-2" /> 
            Continue with Google
          </Button>
        </form>

        {/* ROLE INFO SECTION */}
        <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
          <h4 className="text-white font-semibold mb-3">Account Types:</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span>👤</span>
              <span className="text-gray-300"><strong>Personal:</strong> Private messaging for individual use</span>
            </div>
            <div className="flex items-center gap-2">
              <span>👥</span>
              <span className="text-gray-300"><strong>Team:</strong> Collaborate with team members using Team ID</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🌍</span>
              <span className="text-gray-300"><strong>Global:</strong> Join the worldwide community</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;