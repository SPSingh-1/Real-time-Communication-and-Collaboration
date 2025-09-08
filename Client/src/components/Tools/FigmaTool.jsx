// FigmaTool.jsx - Using Personal Access Token instead of OAuth
import React, { useState, useEffect } from 'react';
import { Settings, FileText, Star, Search, Filter, AlertCircle, CheckCircle, ExternalLink, Key } from 'lucide-react';
import axios from 'axios';
import FigmaFiles from './FigmaFiles';

// API Base URL configuration
const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}`;

// Error notification component
const ErrorNotification = ({ error, onClose }) => {
  if (!error) return null;
  
  return (
    <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 max-w-md">
      <div className="flex items-start space-x-2">
        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
        <button onClick={onClose} className="text-red-500 hover:text-red-700">
          ×
        </button>
      </div>
    </div>
  );
};

// Success notification component
const SuccessNotification = ({ message, onClose }) => {
  if (!message) return null;
  
  return (
    <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 max-w-md">
      <div className="flex items-start space-x-2">
        <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Success!</p>
          <p className="text-sm">{message}</p>
        </div>
        <button onClick={onClose} className="text-green-500 hover:text-green-700">
          ×
        </button>
      </div>
    </div>
  );
};

// Personal Access Token Connection Component
const FigmaConnection = ({ onStatusChange }) => {
  const [figmaStatus, setFigmaStatus] = useState({
    connected: false,
    loading: true,
    figmaUser: null
  });
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [personalToken, setPersonalToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  useEffect(() => {
    checkFigmaStatus();
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkFigmaStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`${API_BASE_URL}/api/auth/figma/status`, {
        headers: { 'auth-token': token },
        timeout: 10000
      });
      
      setFigmaStatus({
        connected: response.data.connected,
        loading: false,
        figmaUser: response.data.figmaUser
      });
      
      if (onStatusChange) onStatusChange(response.data.connected);
    } catch (error) {
      console.error('Error checking Figma status:', error);
      setError(error.response?.data?.error || error.message || 'Failed to check Figma status');
      setFigmaStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const connectFigmaWithToken = async () => {
    if (!personalToken.trim()) {
      setError('Please enter your Figma personal access token');
      return;
    }

    setConnecting(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please login first.');
      }

      const response = await axios.post(`${API_BASE_URL}/api/auth/figma/connect-token`, {
        personalToken: personalToken.trim()
      }, {
        headers: { 'auth-token': token },
        timeout: 10000
      });
      
      if (response.data.success) {
        setFigmaStatus({
          connected: true,
          loading: false,
          figmaUser: response.data.figmaUser
        });
        setSuccess('Figma connected successfully!');
        setPersonalToken('');
        setShowTokenInput(false);
        if (onStatusChange) onStatusChange(true);
      }
    } catch (error) {
      console.error('Error connecting Figma:', error);
      setError(error.response?.data?.error || error.message || 'Failed to connect to Figma');
    } finally {
      setConnecting(false);
    }
  };

  const disconnectFigma = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/auth/figma/disconnect`, {}, {
        headers: { 'auth-token': token }
      });
      
      setFigmaStatus({
        connected: false,
        loading: false,
        figmaUser: null
      });
      
      setSuccess('Figma disconnected successfully');
      if (onStatusChange) onStatusChange(false);
    } catch (error) {
      console.error('Error disconnecting Figma:', error);
      setError(error.response?.data?.error || 'Failed to disconnect Figma');
    }
  };

  if (figmaStatus.loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Checking Figma connection...</span>
      </div>
    );
  }

  return (
    <>
      <ErrorNotification error={error} onClose={() => setError(null)} />
      <SuccessNotification message={success} onClose={() => setSuccess(null)} />
      
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Figma Integration</h3>
              <p className="text-sm text-gray-600">
                {figmaStatus.connected ? 'Connected via Personal Token' : 'Not connected'}
              </p>
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            figmaStatus.connected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {figmaStatus.connected ? 'Active' : 'Inactive'}
          </div>
        </div>

        {figmaStatus.connected ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                {figmaStatus.figmaUser?.img_url ? (
                  <img 
                    src={figmaStatus.figmaUser.img_url} 
                    alt="Figma avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs">
                    {figmaStatus.figmaUser?.handle?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {figmaStatus.figmaUser?.handle || figmaStatus.figmaUser?.email || 'Unknown User'}
                </p>
                <p className="text-xs text-gray-600">Personal Access Token Connected</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={checkFigmaStatus}
                className="flex-1 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                Refresh Status
              </button>
              <button
                onClick={disconnectFigma}
                className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">How to get your Personal Access Token:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Go to Figma Settings → Security</li>
                <li>Scroll to "Personal access tokens"</li>
                <li>Click "Generate new token"</li>
                <li>Copy and paste the token below</li>
              </ol>
              <a 
                href="https://www.figma.com/settings" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 mt-2 text-sm"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Open Figma Settings</span>
              </a>
            </div>

            {!showTokenInput ? (
              <button
                onClick={() => setShowTokenInput(true)}
                className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Key className="w-4 h-4" />
                <span>Connect with Personal Access Token</span>
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Figma Personal Access Token
                  </label>
                  <input
                    type="password"
                    value={personalToken}
                    onChange={(e) => setPersonalToken(e.target.value)}
                    placeholder="figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your token starts with "figd_" and will not be stored in plain text
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={connectFigmaWithToken}
                    disabled={connecting || !personalToken.trim()}
                    className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    {connecting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <span>Connect</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowTokenInput(false);
                      setPersonalToken('');
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">What you'll get:</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Access to your Figma files and projects</li>
                <li>• File commenting and feedback</li>
                <li>• Design export capabilities</li>
                <li>• Version history access</li>
                <li>• Secure token-based authentication</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Main Dashboard Integration Component
const FigmaTool = ({ user }) => {
  const [figmaConnected, setFigmaConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('connection');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    // Clear any OAuth-related URL parameters since we're not using OAuth anymore
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('figma_error') || urlParams.has('figma_success')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <>
      <ErrorNotification error={error} onClose={() => setError(null)} />
      <SuccessNotification message={success} onClose={() => setSuccess(null)} />
      
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Figma Integration</h1>
          
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('connection')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'connection'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Connection
              </button>
              <button
                onClick={() => setActiveTab('files')}
                disabled={!figmaConnected}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'files' && figmaConnected
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 disabled:text-gray-300 disabled:cursor-not-allowed'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Files
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'connection' && (
            <FigmaConnection 
              user={user} 
              onStatusChange={setFigmaConnected}
            />
          )}
          
          {activeTab === 'files' && figmaConnected && (
            <FigmaFiles />
          )}
          
          {!figmaConnected && activeTab === 'files' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Figma First</h3>
              <p className="text-gray-600 mb-4">
                You need to connect your Figma account using a personal access token to access your files.
              </p>
              <button
                onClick={() => setActiveTab('connection')}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Go to Connection Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FigmaTool;