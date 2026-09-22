import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Dynamic lazy imports for instant initial bundle loading
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const SalesOrders = lazy(() => import('./pages/SalesOrders'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Alerts = lazy(() => import('./pages/Alerts'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Users = lazy(() => import('./pages/Users'));
const Warehouses = lazy(() => import('./pages/Warehouses'));
const Settings = lazy(() => import('./pages/Settings'));

// Industrial Suspense Fallback Loader
function PageLoader() {
  return (
    <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-[#13161C] border border-amber-500/40 flex items-center justify-center font-mono font-black text-amber-400 text-sm shadow-xs animate-pulse">
          TL
        </div>
        <div className="absolute inset-0 rounded-xl border border-amber-500/20 animate-ping pointer-events-none" />
      </div>
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" />
        <span>INITIALIZING_WORKSPACE_MODULE...</span>
      </div>
    </div>
  );
}

// 404 Not Found Industrial Fallback
function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-[#12151B] border border-[#232730] flex items-center justify-center text-amber-400 font-mono font-extrabold text-2xl shadow-inner">
        404
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-xl font-extrabold text-zinc-100 tracking-tight">Endpoint Route Not Found</h2>
        <p className="text-xs text-zinc-400 font-mono leading-relaxed">
          The requested path does not exist in the warehouse operating system topology.
        </p>
      </div>
      <Link
        to="/"
        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs font-mono rounded-lg transition-colors btn-tactile shadow-xs"
      >
        RETURN_TO_COMMAND &rarr;
      </Link>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
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
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
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
