import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import RequireAuth from './components/auth/RequireAuth';
import RequireAdmin from './components/auth/RequireAdmin';
import AuthProvider from './context/AuthProvider';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import UserDashboard from './pages/user/UserDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import ClubList from './pages/clubs/ClubList';
import ClubDetail from './pages/clubs/ClubDetail';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route path="user" element={<UserDashboard />} />
              <Route path="clubs" element={<ClubList />} />
              <Route path="clubs/:clubId" element={<ClubDetail />} />
              <Route element={<RequireAdmin />}>
                <Route path="admin" element={<AdminDashboard />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
