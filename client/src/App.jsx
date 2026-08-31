import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Queue from './pages/Queue';
import MyTickets from './pages/MyTickets';
import TicketDetail from './pages/TicketDetail';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Queue />} />
             <Route path="/mine" element={<MyTickets />} />   
              <Route path="/tickets/:id" element={<TicketDetail />} />
             <Route path="/dashboard" element={<Dashboard />} />
<Route path="/alerts" element={<Alerts />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}