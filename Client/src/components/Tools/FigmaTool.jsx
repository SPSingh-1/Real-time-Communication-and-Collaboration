// FigmaTool.jsx - Using Personal Access Token instead of OAuth
import React, { useState, useEffect } from 'react';
import { Settings, FileText, AlertCircle, CheckCircle, ExternalLink, Key } from 'lucide-react';
import axios from 'axios';
import FigmaFiles from './FigmaFiles';

// API Base URL configuration
const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}`;

// Error notification component
const ErrorNotification = ({ error, onClose }) => {
  if (!error) return null;
  
  return (
    <div className="fixed top-4 right-4 bg-red-950/90 border border-red-800 text-red-300 px-4 py-3 rounded-lg z-50 max-w-md shadow-xl backdrop-blur-md">
      <div className="flex items-start space-x-2">
        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-400" />
        <div className="flex-1">
          <p className="font-medium text-red-200">Error</p>
          <p className="text-sm">{error}</p>
        </div>
        <button onClick={onClose} className="text-red-400 hover:text-red-200">
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
    <div className="fixed top-4 right-4 bg-emerald-950/90 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-lg z-50 max-w-md shadow-xl backdrop-blur-md">
      <div className="flex items-start space-x-2">
        <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-emerald-400" />
        <div className="flex-1">
          <p className="font-medium text-emerald-200">Success</p>
          <p className="text-sm">{message}</p>
        </div>
        <button onClick={onClose} className="text-emerald-400 hover:text-emerald-200">
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
      <div className="flex items-center justify-center p-8">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-slate-400 text-sm">Checking Figma connection...</span>
      </div>
    );
  }

  return (
    <>
      <ErrorNotification error={error} onClose={() => setError(null)} />
      <SuccessNotification message={success} onClose={() => setSuccess(null)} />
      
      <div className="bg-slate-900 rounded-xl p-5 sm:p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-center">
              <span className="text-blue-400 font-bold text-lg">F</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Figma Workspace Integration</h3>
              <p className="text-xs text-slate-400">
                {figmaStatus.connected ? 'Connected via Personal Token' : 'Not connected'}
              </p>
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            figmaStatus.connected 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            {figmaStatus.connected ? 'Active' : 'Inactive'}
          </div>
        </div>

        {figmaStatus.connected ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 flex-shrink-0">
                {figmaStatus.figmaUser?.img_url ? (
                  <img 
                    src={figmaStatus.figmaUser.img_url} 
                    alt="Figma avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-300 font-bold">
                    {figmaStatus.figmaUser?.handle?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {figmaStatus.figmaUser?.handle || figmaStatus.figmaUser?.email || 'Unknown User'}
                </p>
                <p className="text-xs text-emerald-400">Personal Access Token Active</p>
              </div>
            </div>
            
            <div className="flex space-x-3 pt-2">
              <button
                onClick={checkFigmaStatus}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-lg text-xs font-medium transition-colors"
              >
                Refresh Status
              </button>
              <button
                onClick={disconnectFigma}
                className="bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 px-4 py-2.5 rounded-lg text-xs font-medium transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <h4 className="font-semibold text-white text-xs sm:text-sm mb-2">How to get your Personal Access Token:</h4>
              <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                <li>Go to Figma Settings → Security</li>
                <li>Scroll to "Personal access tokens"</li>
                <li>Click "Generate new token"</li>
                <li>Copy and paste the token below</li>
              </ol>
              <a 
                href="https://www.figma.com/settings" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 mt-2 text-xs font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Figma Settings</span>
              </a>
            </div>

            {!showTokenInput ? (
              <button
                onClick={() => setShowTokenInput(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center space-x-2 shadow-sm"
              >
                <Key className="w-4 h-4" />
                <span>Connect with Personal Access Token</span>
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Figma Personal Access Token
                  </label>
                  <input
                    type="password"
                    value={personalToken}
                    onChange={(e) => setPersonalToken(e.target.value)}
                    placeholder="figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Your token starts with "figd_" and will be securely encrypted
                  </p>
                </div>
                
                <div className="flex space-x-2 pt-1">
                  <button
                    onClick={connectFigmaWithToken}
                    disabled={connecting || !personalToken.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    {connecting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <span>Connect Token</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowTokenInput(false);
                      setPersonalToken('');
                    }}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <h4 className="font-semibold text-slate-300 text-xs mb-2">Included Capabilities:</h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Access to your Figma workspace files and projects</li>
                <li>• File commenting and team design feedback</li>
                <li>• Instant vector and asset preview</li>
                <li>• Secure direct token-based authentication</li>
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
  const [activeTab, setActiveTab] = useState('files'); // default to 'files' for instant interactive canvas
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('figma_error') || urlParams.has('figma_success')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <>
      <ErrorNotification error={error} onClose={() => setError(null)} />
      <SuccessNotification message={success} onClose={() => setSuccess(null)} />
      
      <div className="min-h-full bg-slate-950 text-slate-100 p-3 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800/80 p-4 sm:p-6 mb-6 shadow-xl backdrop-blur-md">
          {/* Tab Navigation */}
          <div className="border-b border-slate-800 mb-6 flex items-center justify-between flex-wrap gap-4">
            <nav className="-mb-px flex space-x-4 sm:space-x-8">
              <button
                onClick={() => setActiveTab('files')}
                className={`py-3 px-1 border-b-2 font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors ${
                  activeTab === 'files'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Interactive Boards & Canvas</span>
              </button>

              <button
                onClick={() => setActiveTab('connection')}
                className={`py-3 px-1 border-b-2 font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors ${
                  activeTab === 'connection'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Token Connection (Optional)</span>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'files' && (
            <FigmaFiles />
          )}

          {activeTab === 'connection' && (
            <FigmaConnection 
              user={user} 
              onStatusChange={setFigmaConnected}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default FigmaTool;