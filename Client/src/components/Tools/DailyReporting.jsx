import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Eye, 
  Users, 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Calendar, 
  Star,
  MessageCircle,
  Upload,
  X,
  ChevronDown,
  BarChart3,
  AlertTriangle,
  Shield,
  UserCheck
} from 'lucide-react';


const DailyReporting = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [reports, setReports] = useState([]);
  const [assignedReports, setAssignedReports] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [assignedComplaints, setAssignedComplaints] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ category: '', status: '', priority: '' });
  
  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'daily',
    priority: 'medium',
    mood: '😊',
    rating: 3,
    feedback: '',
    assignedTo: '',
    assignmentType: 'task',
    dueDate: ''
  });

  // Complaint form states
  const [complaintData, setComplaintData] = useState({
    title: '',
    description: '',
    complaintType: 'other',
    severity: 'medium',
    location: '',
    witnessDetails: '',
    expectedResolution: '',
    incidentDate: '',
    isConfidential: true,
    isAnonymous: false,
    assignedTo: '',
    department: 'admin',
    dueDate: ''
  });

  const [attachments, setAttachments] = useState([]);
  const [complaintAttachments, setComplaintAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const complaintFileInputRef = useRef(null);

  const tabs = [
    { name: 'Daily Reporting', icon: FileText },
    { name: 'Create Complaint', icon: AlertTriangle },
    { name: 'Seen & Feedback', icon: Eye },
    { name: 'Assigned Reports', icon: UserCheck },
    { name: 'Assigned Complaints', icon: Shield }
  ];

  const categories = ['daily', 'weekly', 'monthly', 'project', 'issue', 'feedback'];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const statuses = ['pending', 'in-progress', 'completed', 'cancelled'];
  const complaintTypes = ['technical', 'service', 'harassment', 'discrimination', 'policy', 'other'];
  const severities = ['low', 'medium', 'high', 'critical'];
  const departments = ['hr', 'it', 'admin', 'management', 'legal'];
  const moods = ['😊', '😐', '😟'];

  // API functions with proper base URL
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'auth-token': localStorage.getItem('token')
  });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...filters,
        search: searchTerm
      });
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/reports/all?${params}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setReports(data.reports);
      } else {
        console.error('Failed to fetch reports:', data.error);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
    setLoading(false);
  };

  const fetchComplaints = async () => {
    try {
      const params = new URLSearchParams({
        complaintType: filters.category,
        status: filters.status,
        severity: filters.priority,
        search: searchTerm
      });
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/complaints/all?${params}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setComplaints(data.complaints);
      } else {
        console.error('Failed to fetch complaints:', data.error);
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
    }
  };

  const fetchAssignedReports = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/reports/assigned`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAssignedReports(data.reports);
      } else {
        console.error('Failed to fetch assigned reports:', data.error);
      }
    } catch (error) {
      console.error('Error fetching assigned reports:', error);
    }
  };

  const fetchAssignedComplaints = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/complaints/assigned`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAssignedComplaints(data.complaints);
      } else {
        console.error('Failed to fetch assigned complaints:', data.error);
      }
    } catch (error) {
      console.error('Error fetching assigned complaints:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('Fetching assignable users...');
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/reports/assignable-users`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('Assignable users response:', data);
      
      if (data.success) {
        setUsers(data.users);
      } else {
        console.error('Failed to fetch users:', data.error);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const fetchStats = async () => {
  try {
    console.log('Fetching stats from:', `${import.meta.env.VITE_BACKEND_URL}/api/reports/stats`); // Add this
    console.log('Auth token:', localStorage.getItem('token')); // Add this
    
    const [reportResponse, complaintResponse] = await Promise.all([
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/reports/stats`, {
        headers: getAuthHeaders()
      }),
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/complaints/stats`, {
        headers: getAuthHeaders()
      })
    ]);
    
    console.log('Response status - Reports:', reportResponse.status, 'Complaints:', complaintResponse.status); // Add this
    
    const reportData = await reportResponse.json();
    const complaintData = await complaintResponse.json();
    
    console.log('Raw API responses:'); // Add this
    console.log('Reports:', reportData);
    console.log('Complaints:', complaintData);
    
    // Rest of your existing code...
    
    setStats({
      reports: reportData.success ? reportData.stats : { total: 0, pending: 0, inProgress: 0, completed: 0, avgRating: 0 },
      complaints: complaintData.success ? complaintData.stats : { total: 0, pending: 0, investigating: 0, resolved: 0, critical: 0 },
      assignedReports: reportData.assignedToMe || 0,
      assignedComplaints: complaintData.assignedToMe || 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    // Fallback stats
    setStats({
      reports: { total: reports.length, pending: 0, completed: 0 },
      complaints: { total: complaints.length, pending: 0, resolved: 0 },
      assignedReports: assignedReports.length || 0,
      assignedComplaints: assignedComplaints.length || 0
    });
  }
};

  const submitReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formDataObj = new FormData();
      Object.keys(formData).forEach(key => {
        formDataObj.append(key, formData[key]);
      });
      
      attachments.forEach(file => {
        formDataObj.append('attachments', file);
      });

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/reports/create`, {
        method: 'POST',
        headers: {
          'auth-token': localStorage.getItem('token')
        },
        body: formDataObj
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        alert('Report submitted successfully!');
        setFormData({
          title: '',
          description: '',
          category: 'daily',
          priority: 'medium',
          mood: '😊',
          rating: 3,
          feedback: '',
          assignedTo: '',
          assignmentType: 'task',
          dueDate: ''
        });
        setAttachments([]);
        fetchReports();
        fetchStats();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Error submitting report: ' + error.message);
    }
    setLoading(false);
  };

  const submitComplaint = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formDataObj = new FormData();
      Object.keys(complaintData).forEach(key => {
        formDataObj.append(key, complaintData[key]);
      });
      
      complaintAttachments.forEach(file => {
        formDataObj.append('attachments', file);
      });

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/complaints/create`, {
        method: 'POST',
        headers: {
          'auth-token': localStorage.getItem('token')
        },
        body: formDataObj
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        alert('Complaint submitted successfully!');
        setComplaintData({
          title: '',
          description: '',
          complaintType: 'other',
          severity: 'medium',
          location: '',
          witnessDetails: '',
          expectedResolution: '',
          incidentDate: '',
          isConfidential: true,
          isAnonymous: false,
          assignedTo: '',
          department: 'admin',
          dueDate: ''
        });
        setComplaintAttachments([]);
        fetchComplaints();
        fetchStats();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error submitting complaint:', error);
      alert('Error submitting complaint: ' + error.message);
    }
    setLoading(false);
  };

  const updateReportStatus = async (reportId, status, feedback = '') => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, feedback })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        fetchReports();
        fetchAssignedReports();
        fetchStats();
        alert('Status updated successfully!');
      } else {
        alert('Error updating status: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status: ' + error.message);
    }
  };

  const updateComplaintStatus = async (complaintId, status, resolution = '') => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/complaints/${complaintId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, resolution })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        fetchComplaints();
        fetchAssignedComplaints();
        fetchStats();
        alert('Complaint status updated successfully!');
      } else {
        alert('Error updating complaint status: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating complaint status:', error);
      alert('Error updating complaint status: ' + error.message);
    }
  };

  const assignComplaint = async (complaintId, assignedTo, dueDate = '') => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/complaints/${complaintId}/assign`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ assignedTo, dueDate })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        fetchComplaints();
        fetchStats();
        alert('Complaint assigned successfully!');
      } else {
        alert('Error assigning complaint: ' + data.error);
      }
    } catch (error) {
      console.error('Error assigning complaint:', error);
      alert('Error assigning complaint: ' + error.message);
    }
  };

  const addComment = async (id, content, type = 'report') => {
    try {
      const endpoint = type === 'complaint' ? 'complaints' : 'reports';
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/${endpoint}/${id}/comment`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        if (type === 'complaint') {
          fetchComplaints();
          fetchAssignedComplaints();
        } else {
          fetchReports();
          fetchAssignedReports();
        }
      } else {
        alert('Error adding comment: ' + data.error);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error adding comment: ' + error.message);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchComplaints();
    fetchAssignedReports();
    fetchAssignedComplaints();
    fetchUsers();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchReports();
    fetchComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filters]);

  const handleFileChange = (e, type = 'report') => {
    const files = Array.from(e.target.files);
    if (type === 'complaint') {
      setComplaintAttachments(prev => [...prev, ...files]);
    } else {
      setAttachments(prev => [...prev, ...files]);
    }
  };

  const removeAttachment = (index, type = 'report') => {
    if (type === 'complaint') {
      setComplaintAttachments(prev => prev.filter((_, i) => i !== index));
    } else {
      setAttachments(prev => prev.filter((_, i) => i !== index));
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      urgent: 'bg-red-100 text-red-800 border-red-200',
      critical: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800 border-gray-200',
      'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
      investigating: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      resolved: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      escalated: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[status] || colors.pending;
  };

  const ReportCard = ({ report, showAssignButton = false, showStatusUpdate = false, type = 'report' }) => {
    const [showCommentForm, setShowCommentForm] = useState(false);
    const [comment, setComment] = useState('');

    const isComplaint = type === 'complaint';

    return (
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 hover:transform hover:scale-[1.02] transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={report.userPhoto || '/api/placeholder/40/40'}
                alt={report.userName}
                className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
              />
              {!isComplaint && report.mood && (
                <div className="absolute -bottom-1 -right-1 text-lg">
                  {report.mood}
                </div>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-white">{report.userName}</h4>
              <p className="text-white/70 text-sm">{report.formattedDate || new Date(report.createdAt).toLocaleDateString()}</p>
              {isComplaint && (
                <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full mt-1 inline-block">
                  {report.complaintType || report.category}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(report.severity || report.priority)}`}>
              {report.severity || report.priority}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
              {report.status}
            </span>
            {isComplaint && report.department && (
              <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-xs">
                {report.department}
              </span>
            )}
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-2">{report.title}</h3>
          <p className="text-white/80 text-sm leading-relaxed">{report.description}</p>
          
          {report.feedback && (
            <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
              <p className="text-white/90 text-sm italic">"{report.feedback}"</p>
            </div>
          )}

          {/* Complaint specific fields */}
          {isComplaint && (
            <div className="mt-3 space-y-2">
              {report.location && (
                <p className="text-white/70 text-sm">
                  <strong>Location:</strong> {report.location}
                </p>
              )}
              {report.witnessDetails && (
                <p className="text-white/70 text-sm">
                  <strong>Witnesses:</strong> {report.witnessDetails}
                </p>
              )}
              {report.expectedResolution && (
                <p className="text-white/70 text-sm">
                  <strong>Expected Resolution:</strong> {report.expectedResolution}
                </p>
              )}
              {report.resolution && (
                <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-green-300 text-sm">
                    <strong>Resolution:</strong> {report.resolution}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {report.attachments && report.attachments.length > 0 && (
          <div className="mb-4">
            <h5 className="text-white/90 text-sm font-medium mb-2">Attachments:</h5>
            <div className="space-y-1">
              {report.attachments.map((attachment, index) => (
                <a
                  key={index}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-300 hover:text-blue-200 text-sm"
                >
                  <Upload size={14} />
                  <span>{attachment.filename}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-white/70 mb-4">
          <div className="flex items-center space-x-4">
            {!isComplaint && report.rating && (
              <span className="flex items-center space-x-1">
                <Star size={14} />
                <span>{report.rating}/5</span>
              </span>
            )}
            <span className="flex items-center space-x-1">
              <MessageCircle size={14} />
              <span>{report.comments?.length || 0}</span>
            </span>
            {report.assignedTo && (
              <span className="flex items-center space-x-1">
                <User size={14} />
                <span>Assigned to {report.assignedTo.name || report.assignedTo}</span>
              </span>
            )}
            {report.dueDate && (
              <span className="flex items-center space-x-1">
                <Calendar size={14} />
                <span className={report.daysUntilDue < 0 ? 'text-red-400' : 'text-white/70'}>
                  Due: {new Date(report.dueDate).toLocaleDateString()}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {showStatusUpdate && (
            <>
              <button
                onClick={() => isComplaint ? 
                  updateComplaintStatus(report._id, 'investigating') : 
                  updateReportStatus(report._id, 'in-progress')
                }
                className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
              >
                {isComplaint ? 'Investigating' : 'In Progress'}
              </button>
              <button
                onClick={() => isComplaint ? 
                  updateComplaintStatus(report._id, 'resolved') : 
                  updateReportStatus(report._id, 'completed')
                }
                className="px-3 py-1 bg-green-500/20 text-green-300 rounded-lg text-sm hover:bg-green-500/30 transition-colors"
              >
                {isComplaint ? 'Resolved' : 'Complete'}
              </button>
            </>
          )}
          
          {showAssignButton && (
            <div className="relative">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    const dueDate = prompt('Due date (YYYY-MM-DD):');
                    if (isComplaint) {
                      assignComplaint(report._id, e.target.value, dueDate);
                    } else {
                      // assignReport function would go here
                    }
                    e.target.value = '';
                  }
                }}
                className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm border border-purple-400/30 min-w-[140px]"
              >
                <option value="">Assign to...</option>
                {users && users.length > 0 ? (
                  users.map(user => (
                    <option key={user._id} value={user._id} className="bg-gray-800 text-white">
                      {user.name} ({user.role})
                    </option>
                  ))
                ) : (
                  <option value="" disabled className="bg-gray-800 text-gray-500">
                    No assignable users
                  </option>
                )}
              </select>
            </div>
          )}
          
          <button
            onClick={() => setShowCommentForm(!showCommentForm)}
            className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-sm hover:bg-indigo-500/30 transition-colors"
          >
            Comment
          </button>
        </div>

        {/* Comments */}
        {report.comments && report.comments.length > 0 && (
          <div className="space-y-2 mb-4">
            {report.comments.slice(-2).map((comment, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center space-x-2 mb-1">
                  <img
                    src={comment.userPhoto || '/api/placeholder/20/20'}
                    alt={comment.userName}
                    className="w-5 h-5 rounded-full"
                  />
                  <span className="text-white/90 text-sm font-medium">{comment.userName}</span>
                  <span className="text-white/60 text-xs">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-white/80 text-sm">{comment.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Comment Form */}
        {showCommentForm && (
          <div className="mt-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50"
              />
              <button
                onClick={() => {
                  if (comment.trim()) {
                    addComment(report._id, comment, type);
                    setComment('');
                    setShowCommentForm(false);
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-spin-slow"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text">
            Daily Reporting & Complaints System
          </h1>
          <p className="text-white/70">Manage your daily reports, complaints, feedback, and assignments</p>
        </div>

        {/* Enhanced Stats Dashboard - Add debug logging */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {/* Debug: Add fallback and logging */}
              {stats.reports?.total || 0}
            </div>
            <div className="text-white/70 text-sm">Total Reports</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-red-400 mb-1">
              {stats.complaints?.total || 0}
            </div>
            <div className="text-white/70 text-sm">Total Complaints</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {(stats.reports?.pending || 0) + (stats.complaints?.pending || 0)}
            </div>
            <div className="text-white/70 text-sm">Pending Items</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {((stats.assignedReports || 0) + (stats.assignedComplaints || 0)) || 'Loading...'}
            </div>
            <div className="text-white/70 text-sm">Assigned to Me</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-2 flex flex-wrap justify-center gap-2">
            {tabs.map((tab, index) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                    activeTab === index
                      ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <IconComponent size={16} />
                  <span className="font-medium text-sm">{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto">
          {/* Tab 1: Daily Reporting */}
          {activeTab === 0 && (
            <div className="space-y-8">
              {/* Create Report Form */}
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                  <Plus size={24} />
                  <span>Create New Report</span>
                </h2>
                
                <form onSubmit={submitReport} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white/90 text-sm font-medium mb-2">Title *</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50"
                        placeholder="Enter report title"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white/90 text-sm font-medium mb-2">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400/50"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat} className="bg-gray-800 text-white">
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-white/90 text-sm font-medium mb-2">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({...formData, priority: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400/50"
                      >
                        {priorities.map(priority => (
                          <option key={priority} value={priority} className="bg-gray-800 text-white">
                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-white/90 text-sm font-medium mb-2">Mood</label>
                      <div className="flex space-x-3">
                        {moods.map(mood => (
                          <button
                            key={mood}
                            type="button"
                            onClick={() => setFormData({...formData, mood})}
                            className={`text-3xl p-2 rounded-lg border-2 transition-all ${
                              formData.mood === mood 
                                ? 'border-blue-400 bg-blue-400/20' 
                                : 'border-white/20 hover:border-white/40'
                            }`}
                          >
                            {mood}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/90 text-sm font-medium mb-2">Rating</label>
                      <div className="flex space-x-2">
                        {[1, 2, 3, 4, 5].map(rating => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => setFormData({...formData, rating})}
                            className={`p-2 transition-all ${
                              formData.rating >= rating 
                                ? 'text-yellow-400' 
                                : 'text-white/30 hover:text-yellow-300'
                            }`}
                          >
                            <Star size={24} fill={formData.rating >= rating ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/90 text-sm font-medium mb-2">Assign To</label>
                      <select
                        value={formData.assignedTo}
                        onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400/50"
                      >
                        <option value="" className="bg-gray-800 text-white">Select user (optional)</option>
                        {users.map(user => (
                          <option key={user._id} value={user._id} className="bg-gray-800 text-white">
                            {user.name} ({user.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/90 text-sm font-medium mb-2">Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={4}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50"
                      placeholder="Describe your report in detail..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white/90 text-sm font-medium mb-2">Feedback/Notes</label>
                    <textarea
                      value={formData.feedback}
                      onChange={(e) => setFormData({...formData, feedback: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50"
                      placeholder="Any additional feedback or notes..."
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-white/90 text-sm font-medium mb-2">Attachments</label>
                    <div className="space-y-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={(e) => handleFileChange(e, 'report')}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center space-x-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                      >
                        <Upload size={18} />
                        <span>Choose Files</span>
                      </button>
                      
                      {attachments.length > 0 && (
                        <div className="space-y-2">
                          {attachments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg">
                              <span className="text-white/90 text-sm">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => removeAttachment(index, 'report')}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tab 2: Create Complaint */}
          {activeTab === 1 && (
            <div className="space-y-8">
              {/* Create Complaint Form */}
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                  <AlertTriangle size={24} />
                  <span>Submit New Complaint</span>
                </h2>
                
                <form onSubmit={submitComplaint} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white/90 text-sm font-medium mb-2">Title *</label>
                      <input
                        type="text"
                        value={complaintData.title}
                        onChange={(e) => setComplaintData({...complaintData, title: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50"
                        placeholder="Enter complaint title"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white/90 text-sm font-medium mb-2">Complaint Type</label>
                      <select
                        value={complaintData.complaintType}
                        onChange={(e) => setComplaintData({...complaintData, complaintType: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400/50"
                      >
                        {complaintTypes.map(type => (
                          <option key={type} value={type} className="bg-gray-800 text-white">
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-white/90 text-sm font-medium mb-2">Severity</label>
                      <select
                        value={complaintData.severity}
                        onChange={(e) => setComplaintData({...complaintData, severity: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400/50"
                      >
                        {severities.map(severity => (
                          <option key={severity} value={severity} className="bg-gray-800 text-white">
                            {severity.charAt(0).toUpperCase() + severity.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-white/90 text-sm font-medium mb-2">Department</label>
                      <select
                        value={complaintData.department}
                        onChange={(e) => setComplaintData({...complaintData, department: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400/50"
                      >
                        {departments.map(dept => (
                          <option key={dept} value={dept} className="bg-gray-800 text-white">
                            {dept.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-white/90 text-sm font-medium mb-2">Location</label>
                      <input
                        type="text"
                        value={complaintData.location}
                        onChange={(e) => setComplaintData({...complaintData, location: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50"
                        placeholder="Where did this occur?"
                      />
                    </div>

                    <div>
                      <label className="block text-white/90 text-sm font-medium mb-2">Incident Date</label>
                      <input
                        type="date"
                        value={complaintData.incidentDate}
                        onChange={(e) => setComplaintData({...complaintData, incidentDate: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400/50"
                      />
                    </div>

                    <div>
                      <label className="block text-white/90 text-sm font-medium mb-2">Assign To</label>
                      <select
                        value={complaintData.assignedTo}
                        onChange={(e) => setComplaintData({...complaintData, assignedTo: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400/50"
                      >
                        <option value="" className="bg-gray-800 text-white">Select user (optional)</option>
                        {users.map(user => (
                          <option key={user._id} value={user._id} className="bg-gray-800 text-white">
                            {user.name} ({user.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-white/90 text-sm font-medium mb-2">Due Date</label>
                      <input
                        type="date"
                        value={complaintData.dueDate}
                        onChange={(e) => setComplaintData({...complaintData, dueDate: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/90 text-sm font-medium mb-2">Description *</label>
                    <textarea
                      value={complaintData.description}
                      onChange={(e) => setComplaintData({...complaintData, description: e.target.value})}
                      rows={4}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50"
                      placeholder="Describe the complaint in detail..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white/90 text-sm font-medium mb-2">Witness Details</label>
                    <textarea
                      value={complaintData.witnessDetails}
                      onChange={(e) => setComplaintData({...complaintData, witnessDetails: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50"
                      placeholder="Any witnesses or additional people involved..."
                    />
                  </div>

                  <div>
                    <label className="block text-white/90 text-sm font-medium mb-2">Expected Resolution</label>
                    <textarea
                      value={complaintData.expectedResolution}
                      onChange={(e) => setComplaintData({...complaintData, expectedResolution: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50"
                      placeholder="What outcome are you looking for?"
                    />
                  </div>

                  {/* Privacy Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="isConfidential"
                        checked={complaintData.isConfidential}
                        onChange={(e) => setComplaintData({...complaintData, isConfidential: e.target.checked})}
                        className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="isConfidential" className="text-white/90 text-sm">
                        Keep this complaint confidential
                      </label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="isAnonymous"
                        checked={complaintData.isAnonymous}
                        onChange={(e) => setComplaintData({...complaintData, isAnonymous: e.target.checked})}
                        className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="isAnonymous" className="text-white/90 text-sm">
                        Submit anonymously
                      </label>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-white/90 text-sm font-medium mb-2">Evidence/Attachments</label>
                    <div className="space-y-3">
                      <input
                        ref={complaintFileInputRef}
                        type="file"
                        multiple
                        onChange={(e) => handleFileChange(e, 'complaint')}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => complaintFileInputRef.current?.click()}
                        className="flex items-center space-x-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                      >
                        <Upload size={18} />
                        <span>Choose Files</span>
                      </button>
                      
                      {complaintAttachments.length > 0 && (
                        <div className="space-y-2">
                          {complaintAttachments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg">
                              <span className="text-white/90 text-sm">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => removeAttachment(index, 'complaint')}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-semibold hover:from-red-600 hover:to-orange-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Submitting...' : 'Submit Complaint'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tab 3: Seen & Feedback */}
          {activeTab === 2 && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={20} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search reports and complaints..."
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50"
                    />
                  </div>
                  
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                    className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400/50"
                  >
                    <option value="" className="bg-gray-800 text-white">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat} className="bg-gray-800 text-white">
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400/50"
                  >
                    <option value="" className="bg-gray-800 text-white">All Status</option>
                    {statuses.map(status => (
                      <option key={status} value={status} className="bg-gray-800 text-white">
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Combined Reports and Complaints Grid */}
              <div className="space-y-8">
                {/* Reports Section */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                    <FileText size={24} />
                    <span>Reports</span>
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {loading ? (
                      <div className="col-span-full text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                        <p className="text-white/70 mt-4">Loading reports...</p>
                      </div>
                    ) : reports.length > 0 ? (
                      reports.map(report => (
                        <ReportCard key={report._id} report={report} type="report" />
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12">
                        <FileText size={64} className="mx-auto text-white/30 mb-4" />
                        <p className="text-white/70 text-lg">No reports found</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Complaints Section */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                    <AlertTriangle size={24} />
                    <span>Complaints</span>
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {complaints.length > 0 ? (
                      complaints.map(complaint => (
                        <ReportCard key={complaint._id} report={complaint} type="complaint" showAssignButton={true} />
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12">
                        <AlertTriangle size={64} className="mx-auto text-white/30 mb-4" />
                        <p className="text-white/70 text-lg">No complaints found</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Assigned Reports */}
          {activeTab === 3 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <UserCheck size={24} />
                <span>Reports Assigned to Me</span>
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {assignedReports.map(report => (
                  <ReportCard key={report._id} report={report} showStatusUpdate={true} type="report" />
                ))}
                {assignedReports.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <UserCheck size={64} className="mx-auto text-white/30 mb-4" />
                    <p className="text-white/70 text-lg">No reports assigned to you</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 5: Assigned Complaints */}
          {activeTab === 4 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <Shield size={24} />
                <span>Complaints Assigned to Me</span>
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {assignedComplaints.map(complaint => (
                  <ReportCard key={complaint._id} report={complaint} showStatusUpdate={true} type="complaint" />
                ))}
                {assignedComplaints.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Shield size={64} className="mx-auto text-white/30 mb-4" />
                    <p className="text-white/70 text-lg">No complaints assigned to you</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animate-spin-slow {
          animation: spin 20s linear infinite;
        }
        
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default DailyReporting;