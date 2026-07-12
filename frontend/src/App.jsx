import { Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Characters from './pages/Characters';
import CharacterBuilder from './pages/CharacterBuilder';
import CharacterSheet from './pages/CharacterSheet';
import Campaigns from './pages/Campaigns';
import CampaignRoom from './pages/CampaignRoom';
import Monsters from './pages/Monsters';
import PowerLibrary from './pages/PowerLibrary';
import Feedback from './pages/Feedback';
import Admin from './pages/Admin';
import { useAuth } from './store/authStore';

export default function App() {
  const { user, initAuth } = useAuth();

  useEffect(() => {
    const theme = user?.theme || localStorage.getItem('lugubre-theme') || 'lugubre';
    document.documentElement.dataset.theme = theme;
  }, [user?.theme]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/characters" element={<ProtectedRoute><Characters /></ProtectedRoute>} />
        <Route path="/characters/new" element={<ProtectedRoute><CharacterBuilder /></ProtectedRoute>} />
        <Route path="/characters/:id" element={<ProtectedRoute><CharacterSheet /></ProtectedRoute>} />
        <Route path="/characters/:id/edit" element={<ProtectedRoute><CharacterBuilder /></ProtectedRoute>} />
        <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
        <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignRoom /></ProtectedRoute>} />
        <Route path="/monsters" element={<ProtectedRoute><Monsters /></ProtectedRoute>} />
        <Route path="/powers" element={<ProtectedRoute><PowerLibrary /></ProtectedRoute>} />
        <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
      </Routes>
    </Layout>
  );
}
