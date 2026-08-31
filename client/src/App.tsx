import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import PurchaseOrders from './pages/PurchaseOrders';
import SalesOrders from './pages/SalesOrders';
import Inventory from './pages/Inventory';
import Alerts from './pages/Alerts';
import AuditLog from './pages/AuditLog';
import Users from './pages/Users';
import Warehouses from './pages/Warehouses';
import Settings from './pages/Settings';
import Layout from './components/Layout';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="warehouses" element={<Warehouses />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="sales-orders" element={<SalesOrders />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="audit" element={<AuditLog />} />
        <Route path="users" element={<Users />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default App;
