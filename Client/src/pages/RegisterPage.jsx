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

const RegisterPage = () => {
  const navigate = useNavigate();
// eslint-disable-next-line no-unused-vars
  const { login, user, loading } = useAppContext();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phoneno: '',
    password: '',
    confirmPassword: '',
    role: 'single',
    teamId: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');

    // Check password strength
    if (e.target.name === 'password') {
      const password = e.target.value;
      let strength = 0;
      if (password.length >= 8) strength += 25;
      if (/[A-Z]/.test(password)) strength += 25;
      if (/[0-9]/.test(password)) strength += 25;
      if (/[^A-Za-z0-9]/.test(password)) strength += 25;
      setPasswordStrength(strength);
    }
  };

  const validateForm = () => {
    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match");
      return false;
    }

    if (form.password.length < 5) {
      setError("Password must be at least 5 characters");
      return false;
    }

    if (form.role === 'team' && !/^[A-Za-z0-9_@]{5}$/.test(form.teamId)) {
      setError('Team ID must be exactly 5 characters: letters, numbers, _ or @');
      return false;
    }

    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(form.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!/^\+?[\d\s\-()]{10,}$/.test(form.phoneno)) {
      setError('Please enter a valid phone number');
      return false;
    }

    return true;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phoneno: form.phoneno.trim(),
        password: form.password,
        role: form.role
      };

      if (form.role === 'team') {
        payload.teamId = form.teamId.trim().toUpperCase();
      }

      if (form.role === 'global') {
        payload.globalId = 'GLOBAL123';
      }

      console.log('Signup payload:', payload);

      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/createuser`, payload);
      
      if (!res.data.success) {
        throw new Error(res.data.error || 'Signup failed');
      }

      console.log('Signup response:', res.data);

      setSuccess('Account created successfully! Redirecting to login...');
      
      // Store token temporarily and redirect to login
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      console.error('Signup error:', err);
      setError(err.response?.data?.error || err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleDescription = () => {
    switch (form.role) {
      case 'single':
        return 'Create a personal account for individual use';
      case 'team':
        return 'Join or create a team for collaboration';
      case 'global':
        return 'Join the global community (Fixed ID: GLOBAL123)';
      default:
        return '';
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 25) return 'bg-red-500';
    if (passwordStrength < 50) return 'bg-orange-500';
    if (passwordStrength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 25) return 'Weak';
    if (passwordStrength < 50) return 'Fair';
    if (passwordStrength < 75) return 'Good';
    return 'Strong';
  };

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="register-bg flex items-center justify-center">
        <div className="text-white text-center">
          <CircularProgress sx={{ color: 'white', mb: 2 }} />
          <div>Loading...</div>
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
    <div className="register-bg">
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="card-container max-w-md mx-auto"
      >
        <h3 className="text-center text-blue-400 font-bold text-2xl mb-2">
          Join Our Platform
        </h3>
        <p className="text-center text-gray-300 mb-6">Create your account to get started</p>

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

        <form onSubmit={handleSignup} className="w-full form-content text-white space-y-4">
          <TextField
            type="text"
            label="Full Name"
            name="name"
            required
            fullWidth
            value={form.name}
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
            type="tel"
            label="Phone Number"
            name="phoneno"
            required
            fullWidth
            value={form.phoneno}
            onChange={handleChange}
            disabled={isLoading}
            placeholder="+1234567890"
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

          <div className="space-y-2">
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
            
            {form.password && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Password strength:</span>
                  <span className={`font-medium ${
                    passwordStrength >= 75 ? 'text-green-400' :
                    passwordStrength >= 50 ? 'text-yellow-400' :
                    passwordStrength >= 25 ? 'text-orange-400' : 'text-red-400'
                  }`}>
                    {getPasswordStrengthText()}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                    style={{ width: `${passwordStrength}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-400">
                  Include uppercase, numbers, and special characters for better security
                </div>
              </div>
            )}
          </div>

          <TextField
            type="password"
            label="Confirm Password"
            name="confirmPassword"
            required
            fullWidth
            value={form.confirmPassword}
            onChange={handleChange}
            disabled={isLoading}
            variant="outlined"
            error={form.confirmPassword && form.password !== form.confirmPassword}
            helperText={
              form.confirmPassword && form.password !== form.confirmPassword 
                ? "Passwords don't match" 
                : ""
            }
            InputProps={{ 
              style: { color: "white" },
              className: "bg-gray-800/50 rounded-lg"
            }}
            InputLabelProps={{ style: { color: "white" } }}
            FormHelperTextProps={{ style: { color: "#ef4444" } }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                '&.Mui-error fieldset': { borderColor: '#ef4444' },
              }
            }}
          />

          {/* ENHANCED ROLE SELECTION */}
          <div className="space-y-3">
            <label className="block text-white font-medium">Choose Your Account Type:</label>
            <div className="grid grid-cols-1 gap-3">
              {[
                { 
                  value: 'single', 
                  label: 'Personal Account', 
                  icon: '👤', 
                  desc: 'Perfect for individual use and personal projects',
                  color: 'blue'
                },
                { 
                  value: 'team', 
                  label: 'Team Account', 
                  icon: '👥', 
                  desc: 'Collaborate with your team members',
                  color: 'green'
                },
                { 
                  value: 'global', 
                  label: 'Global Community', 
                  icon: '🌍', 
                  desc: 'Join the worldwide community',
                  color: 'purple'
                }
              ].map((role) => (
                <label
                  key={role.value}
                  className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    form.role === role.value
                      ? `border-${role.color}-500 bg-${role.color}-900/30 shadow-lg`
                      : 'border-gray-600 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-800/50'
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
                  <span className="text-3xl mr-4">{role.icon}</span>
                  <div className="flex-1">
                    <div className="text-white font-semibold text-lg">{role.label}</div>
                    <div className="text-gray-400 text-sm">{role.desc}</div>
                  </div>
                  {form.role === role.value && (
                    <div className={`w-4 h-4 rounded-full bg-${role.color}-500`}></div>
                  )}
                </label>
              ))}
            </div>
            
            <div className="text-sm text-gray-400 bg-gray-800/30 p-3 rounded-lg border border-gray-700">
              <div className="font-medium text-gray-300 mb-1">Selected: {getRoleDescription()}</div>
            </div>
          </div>

          {/* TEAM ID INPUT */}
          {form.role === 'team' && (
            <div className="space-y-2">
              <TextField
                type="text"
                label="Team ID"
                name="teamId"
                required
                fullWidth
                value={form.teamId}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="Enter 5-character Team ID"
                variant="outlined"
                inputProps={{ maxLength: 5, style: { textTransform: 'uppercase' } }}
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
              <div className="text-xs text-gray-400 bg-green-900/20 p-2 rounded border border-green-700/30">
                Team ID must be exactly 5 characters using letters, numbers, underscore (_), or at symbol (@)
              </div>
            </div>
          )}

          {/* GLOBAL ID DISPLAY */}
          {form.role === 'global' && (
            <div className="space-y-2">
              <TextField
                type="text"
                label="Global Community ID"
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
              <div className="text-xs text-gray-400 bg-purple-900/20 p-2 rounded border border-purple-700/30">
                This ID connects you to the global community of users worldwide
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            fullWidth
            disabled={isLoading || (form.password && form.password !== form.confirmPassword)}
            className="!bg-gradient-to-r !from-blue-600 !to-blue-700 !text-white !py-3 !mt-6 !rounded-lg !font-semibold !text-lg hover:!from-blue-700 hover:!to-blue-800 !transition-all !duration-200 !shadow-lg hover:!shadow-xl disabled:!opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <CircularProgress size={20} sx={{ color: 'white' }} />
                Creating Account...
              </div>
            ) : (
              'Create Account'
            )}
          </Button>

          <p className="text-center mt-4 text-gray-300">
            Already have an account?{' '}
            <Link 
              className="text-blue-400 hover:text-blue-300 transition font-medium" 
              to="/login"
            >
              Sign In
            </Link>
          </p>

        </form>

        {/* ROLE INFO SECTION */}
        <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
          <h4 className="text-white font-semibold mb-3">Account Types:</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span>👤</span>
              <span className="text-gray-300"><strong>Personal:</strong> Individual workspace and private messaging</span>
            </div>
            <div className="flex items-center gap-2">
              <span>👥</span>
              <span className="text-gray-300"><strong>Team:</strong> Collaborate with specific team members</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🌍</span>
              <span className="text-gray-300"><strong>Global:</strong> Connect with users worldwide</span>
            </div>
          </div>
        </div>

        {/* SECURITY NOTICE */}
        <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-700/30">
          <div className="text-xs text-blue-300">
            <strong>Security Notice:</strong> Your data is encrypted and secure. We never share your personal information.
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;