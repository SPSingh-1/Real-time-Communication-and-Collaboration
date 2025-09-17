import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import LandingPage from "./pages/LandingPage";
import EventDetailPage from "./pages/EventDetailPage";
import About from "./pages/About";
import Legal from "./pages/Legal";

// Tools
import FigmaTool from "./components/Tools/FigmaTool";
import CalendarTool from "./components/Tools/CalendarTool";
import TaskManager from "./components/Tools/TaskManager";
import FileManager from "./components/Tools/FileManager";
import VideoCallTool from "./components/Tools/VideoConferenc";
import DailyReporting from "./components/Tools/DailyReporting";

// Helpers
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ProtectedRoute from "./components/ProtectedRoute";
import useAppContext from "./context/useAppContext";
import { useNavigate } from "react-router-dom";

function App() {
  const { isAuthenticated, loading, authChecked } = useAppContext();
  const navigate = useNavigate();

  // Show loading screen while checking authentication
  if (loading || !authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer 
        position="top-right" 
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />} 
        />
        <Route 
          path="/register" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} 
        />
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
        />
        <Route path="/company" element={<About />} />
        <Route path="/legal" element={<Legal />} />

        {/* Protected Routes - Dashboard and its nested routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={["single", "team", "global"]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Dashboard nested routes - all handled by DashboardPage */}
        <Route
          path="/dashboard/chat"
          element={
            <ProtectedRoute roles={["single", "team", "global"]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/dashboard/profile"
          element={
            <ProtectedRoute roles={["single", "team", "global"]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Dashboard tool routes */}
        <Route
          path="/dashboard/tools/figma"
          element={
            <ProtectedRoute roles={["single", "team", "global"]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/dashboard/tools/calendar"
          element={
            <ProtectedRoute roles={["single", "team", "global"]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/dashboard/tools/tasks"
          element={
            <ProtectedRoute roles={["single", "team", "global"]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/dashboard/tools/files"
          element={
            <ProtectedRoute roles={["single", "team", "global"]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Video Calls - Team and Global only */}
        <Route
          path="/dashboard/tools/video"
          element={
            <ProtectedRoute roles={["team", "global"]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/tools/reporting"
          element={
            <ProtectedRoute roles={["single", "team", "global"]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/chat"
          element={
            <ProtectedRoute roles={["single", "team", "global"]}>
              <ChatPage />
            </ProtectedRoute>
          }
        />

        {/* Events - All roles */}
        <Route
          path="/events/:id"
          element={
            <ProtectedRoute roles={["single", "team", "global"]}>
              <EventDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Legacy redirects for backward compatibility */}
        <Route path="/tools/figma" element={<Navigate to="/dashboard/tools/figma" replace />} />
        <Route path="/tools/calendar" element={<Navigate to="/dashboard/tools/calendar" replace />} />
        <Route path="/tools/tasks" element={<Navigate to="/dashboard/tools/tasks" replace />} />
        <Route path="/tools/files" element={<Navigate to="/dashboard/tools/files" replace />} />
        <Route path="/tools/video" element={<Navigate to="/dashboard/tools/video" replace />} />
        <Route path="/tools/reporting" element={<Navigate to="/dashboard/tools/reporting" replace />} />

        {/* Catch-all route */}
        <Route 
          path="*" 
          element={
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
              <div className="text-center">
                <div className="text-6xl mb-4">404</div>
                <div className="text-xl mb-4">Page Not Found</div>
                <div className="text-gray-400 mb-6">The page you're looking for doesn't exist.</div>
                <button
                  onClick={() => window.history.back()}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition mr-4"
                >
                  Go Back
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg transition"
                >
                  Dashboard
                </button>
              </div>
            </div>
          } 
        />
      </Routes>
    </>
  );
}

export default App;