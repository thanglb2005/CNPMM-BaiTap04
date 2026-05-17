import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from './store/slices/authSlice';
import { useEffect } from 'react';
import { loadUser } from './store/slices/authSlice';
import { useDispatch } from 'react-redux';

import LoginPage        from './pages/Auth/LoginPage';
import RegisterPage     from './pages/Auth/RegisterPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import DashboardPage    from './pages/Dashboard/DashboardPage';

import HomePage from './pages/Home/HomePage';
import ProductsPage from './pages/Product/ProductsPage';
import ProductDetailPage from './pages/Product/ProductDetailPage';
import NewsPage from './pages/News/NewsPage';
import NewsDetailPage from './pages/News/NewsDetailPage';

function Guard({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function RootRedirect() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  return <Navigate to={isAuthenticated ? "/home" : "/login"} replace />;
}

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route
          path="/dashboard"
          element={
            <Guard>
              <DashboardPage />
            </Guard>
          }
        />

        <Route
          path="/home"
          element={
            <Guard>
              <HomePage />
            </Guard>
          }
        />
        
        <Route
          path="/products"
          element={
            <Guard>
              <ProductsPage />
            </Guard>
          }
        />
        
        <Route
          path="/product/:slug"
          element={
            <Guard>
              <ProductDetailPage />
            </Guard>
          }
        />

        <Route
          path="/news"
          element={
            <Guard>
              <NewsPage />
            </Guard>
          }
        />

        <Route
          path="/news/:slug"
          element={
            <Guard>
              <NewsDetailPage />
            </Guard>
          }
        />

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </div>
  );
}
