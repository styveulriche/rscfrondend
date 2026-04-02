import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Home from './pages/Home';
import About from './pages/About';
import SavoirPlus from './pages/SavoirPlus';
import Services from './pages/Services';
import Contact from './pages/Contact';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Register from './pages/Register';
import Validation from './pages/Validation';
import DashboardLayout from './dashboard/DashboardLayout';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import Statistics from './dashboard/Statistics';
import Finances from './dashboard/Finances';
import Donation from './dashboard/Donation';
import AyantsDroit from './dashboard/AyantsDroit';
import Parrainage from './dashboard/Parrainage';
import Addresses from './dashboard/Addresses';
import Messagerie from './dashboard/Messagerie';
import Notifications from './dashboard/Notifications';
import Parametres from './dashboard/Parametres';
import Suivi from './dashboard/Suivi';
import SignalerEvenement from './dashboard/SignalerEvenement';
import Profile from './dashboard/Profile';
import Administrateurs from './dashboard/Administrateurs';
import AdminUsers from './dashboard/AdminUsers';
import DeclarationsAdmin from './dashboard/DeclarationsAdmin';
import Cotisations from './dashboard/Cotisations';
import Actualites from './dashboard/Actualites';
import ActualitesPublic from './pages/ActualitesPublic';
import './App.css';

function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/"             element={<Home />} />
          <Route path="/a-propos"     element={<About />} />
          <Route path="/savoir-plus"  element={<SavoirPlus />} />
          <Route path="/nos-services" element={<Services />} />
          <Route path="/contact"      element={<Contact />} />
          <Route path="/login"        element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/inscription"  element={<Register />} />
          <Route path="/validation"   element={<Validation />} />
          <Route path="/actualites"   element={<ActualitesPublic />} />
          <Route path="/dashboard"    element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="statistiques" replace />} />
            <Route path="statistiques" element={<Statistics />} />
            <Route path="adresses" element={<Addresses />} />
            <Route path="profil" element={<Profile />} />
            <Route path="finances"     element={<Finances />} />
            <Route path="don"          element={<Donation />} />
            <Route path="ayant-droit"  element={<AyantsDroit />} />
            <Route path="parrainage"   element={<Parrainage />} />
            <Route path="messagerie"   element={<Messagerie />} />
            <Route path="notifications"element={<Notifications />} />
            <Route path="parametres"   element={<Parametres />} />
            <Route path="cotisations"  element={<Cotisations />} />
            <Route path="suivi"        element={<Suivi />} />
            <Route path="signaler"     element={<SignalerEvenement />} />
            <Route path="actualites"   element={<Actualites />} />
            <Route
              path="declarations"
              element={(
                <AdminRoute allowedRoles={['SUPER_ADMIN', 'ADMIN_VALIDATEUR']}>
                  <DeclarationsAdmin />
                </AdminRoute>
              )}
            />
            <Route
              path="gestion-utilisateurs"
              element={(
                <AdminRoute allowedRoles={['SUPER_ADMIN', 'ADMIN_SUPPORT', 'ADMIN_VALIDATEUR']}>
                  <AdminUsers />
                </AdminRoute>
              )}
            />
            <Route
              path="administrateurs"
              element={(
                <AdminRoute allowedRoles={[ 'SUPER_ADMIN' ]}>
                  <Administrateurs />
                </AdminRoute>
              )}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
