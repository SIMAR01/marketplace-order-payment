import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { clearCredentials } from '../../store/slices/authSlice';
import { useLogoutMutation } from '../../api/authApi';
import { Menu, X, LogOut, User, ShoppingBag } from 'lucide-react';
import Button from '../common/Button';
import { useAppDispatch, useAppSelector } from '../../hooks/storeHooks';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [logout] = useLogoutMutation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    try {
      await logout().unwrap();
    } catch (error) {
      console.warn('Logout API call failed, forcing client logout', error);
    } finally {
      dispatch(clearCredentials());
      navigate('/');
    }
  };

  const activeClassName = 'text-indigo-400 font-semibold';
  const inactiveClassName = 'text-slate-300 hover:text-white transition-colors duration-200';
  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? activeClassName : inactiveClassName;

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <ShoppingBag size={20} className="text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent tracking-wide">
                Marketplace
              </span>
            </Link>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink to="/" end className={getLinkClass}>
              Home
            </NavLink>

            {isAuthenticated && (user?.role === 'PROVIDER' || user?.role === 'ADMIN') && (
              <>
                <NavLink to="/products" className={getLinkClass}>
                  My Products
                </NavLink>
                <NavLink to="/products/new" className={getLinkClass}>
                  + Add Product
                </NavLink>
              </>
            )}

            {isAuthenticated ? (
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 px-3 py-1 bg-slate-800/80 rounded-full border border-slate-700">
                  <User size={14} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-300">
                    {user?.name}
                  </span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-bold px-1.5 py-0.5 rounded-full">
                    {user?.role}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  leftIcon={<LogOut size={14} />}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-slate-300 hover:text-white transition-colors duration-200 text-sm font-medium">
                  Login
                </Link>
                <Link to="/register">
                  <Button size="sm">Register</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger menu trigger */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle main menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer with slide-down animation */}
      <div
        className={`md:hidden transition-all duration-300 ease-in-out border-b border-slate-850 bg-slate-950 ${isMobileMenuOpen ? 'max-h-screen opacity-100 py-4' : 'max-h-0 opacity-0 overflow-hidden'
          }`}
      >
        <div className="px-4 space-y-4">
          <NavLink
            to="/"
            end
            onClick={() => setIsMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Home
          </NavLink>

          {isAuthenticated && (user?.role === 'PROVIDER' || user?.role === 'ADMIN') && (
            <>
              <NavLink
                to="/products"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                My Products
              </NavLink>
              <NavLink
                to="/products/new"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                + Add Product
              </NavLink>
            </>
          )}

          {isAuthenticated ? (
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 px-3 py-2">
                <User size={16} className="text-indigo-400" />
                <div>
                  <div className="text-sm font-semibold text-white">{user?.name}</div>
                  <div className="text-xs text-slate-400">{user?.email} • {user?.role}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 px-3 py-2.5 rounded-md text-base font-medium text-red-400 hover:text-red-300 hover:bg-slate-800 transition-colors"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full"
              >
                <Button className="w-full" size="md">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
