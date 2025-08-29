import { Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";

// 🆕 Import new tool components
import FigmaTool from "./components/Tools/FigmaTool";
import CalendarTool from "./components/Tools/CalendarTool";
import TaskManager from "./components/Tools/TaskManager";
import FileManager from "./components/Tools/FileManager";
import RegisterPage from "./pages/RegisterPage";
import { ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import EventDetailPage from "./pages/EventDetailPage";
import LandingPage from "./pages/LandingPage";
import About from "./pages/About";
import Legal from "./pages/Legal";

function App() {
  return (
    <>
    <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/chat" element={<ChatPage />} />

      {/* 🆕 Tool Routes */}
      <Route path="/tools/figma" element={<FigmaTool />} />
      <Route path="/tools/calendar" element={<CalendarTool />} />
      <Route path="/tools/tasks" element={<TaskManager />} />
      <Route path="/tools/files" element={<FileManager />} />
      
      {/* 🆕 Event Detail Page */}
      <Route path="/events/:id" element={<EventDetailPage />} />

      {/* Footer Landing page*/}
      <Route path="/company" element={<About />} />
      <Route path="/legal" element={<Legal />} />
    </Routes>
    </>
  );
}

export default App;
