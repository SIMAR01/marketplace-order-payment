import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { clearCredentials } from '../../store/slices/authSlice';
import { useLogoutMutation } from '../../api/authApi';
import { useGetCartQuery } from '../../api/cartApi';
import { Menu, X, LogOut, User, ShoppingCart, ShoppingBag } from 'lucide-react';
import Button from '../common/Button';
import { useAppDispatch, useAppSelector } from '../../hooks/storeHooks';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [logout] = useLogoutMutation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Cart query (only runs if the user is a CUSTOMER)
  const isCustomer = isAuthenticated && user?.role === 'CUSTOMER';
  const { data: cart } = useGetCartQuery(undefined, {
    skip: !isCustomer,
  });

  const cartItemsCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    try {
      await logout().unwrap();
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      dispatch(clearCredentials());
      navigate('/login');
    }
  };

  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-semibold transition-colors duration-200 ${
      isActive ? 'text-indigo-400 font-extrabold' : 'text-slate-350 hover:text-white'
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/80 border-b border-slate-900 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
                <ShoppingBag size={18} className="text-white" />
              </div>
              <span className="text-lg font-black tracking-tight text-white group-hover:text-indigo-400 transition-colors duration-200">
                Marketplace
              </span>
            </Link>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink to="/" end className={getLinkClass}>
              Home
            </NavLink>
            <NavLink to="/products" end className={getLinkClass}>
              Shop
            </NavLink>

            {isAuthenticated && (user?.role === 'PROVIDER' || user?.role === 'ADMIN') && (
              <>
                <NavLink to="/inventory" className={getLinkClass}>
                  My Products
                </NavLink>
                <NavLink to="/inventory/new" className={getLinkClass}>
                  + Add Product
                </NavLink>
              </>
            )}

            {/* Shopping Cart desktop icon badge */}
            {isCustomer && (
              <Link
                to="/cart"
                className="relative text-slate-400 hover:text-indigo-400 transition-colors p-2 rounded-full hover:bg-slate-900/60"
                title="View Shopping Cart"
              >
                <ShoppingCart size={18} />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-slate-950 font-mono">
                    {cartItemsCount}
                  </span>
                )}
              </Link>
            )}

            {isAuthenticated ? (
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 px-3 py-1 bg-slate-900/60 rounded-full border border-slate-850">
                  <User size={12} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-300">
                    {user?.name}
                  </span>
                  <span className="text-[9px] bg-indigo-500/10 text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-500/10">
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
          <div className="md:hidden flex items-center gap-4">
            {/* Quick Cart badge for mobile (independent of menu) */}
            {isCustomer && (
              <Link
                to="/cart"
                className="relative text-slate-400 hover:text-indigo-400 p-2"
                title="View Shopping Cart"
              >
                <ShoppingCart size={20} />
                {cartItemsCount > 0 && (
                  <span className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-950 font-mono">
                    {cartItemsCount}
                  </span>
                )}
              </Link>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-900/60 focus:outline-none"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle main menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`md:hidden transition-all duration-300 ease-in-out border-b border-slate-900 bg-slate-950 ${
          isMobileMenuOpen ? 'max-h-screen opacity-100 py-4' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="px-4 space-y-4">
          <NavLink
            to="/"
            end
            onClick={() => setIsMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-900/60 transition-colors"
          >
            Home
          </NavLink>
          <NavLink
            to="/products"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-900/60 transition-colors"
          >
            Shop
          </NavLink>

          {isAuthenticated && (user?.role === 'PROVIDER' || user?.role === 'ADMIN') && (
            <>
              <NavLink
                to="/inventory"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-900/60 transition-colors"
              >
                My Products
              </NavLink>
              <NavLink
                to="/inventory/new"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-900/60 transition-colors"
              >
                + Add Product
              </NavLink>
            </>
          )}

          {isCustomer && (
            <NavLink
              to="/cart"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-900/60 transition-colors"
            >
              <span className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-indigo-400" />
                <span>My Cart</span>
              </span>
              {cartItemsCount > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono">
                  {cartItemsCount}
                </span>
              )}
            </NavLink>
          )}

          {isAuthenticated ? (
            <div className="pt-2 border-t border-slate-900 space-y-3">
              <div className="flex items-center space-x-2 px-3 py-2 bg-slate-900/20 rounded-lg">
                <User size={16} className="text-indigo-400 animate-pulse" />
                <div>
                  <div className="text-sm font-semibold text-white">{user?.name}</div>
                  <div className="text-xs text-slate-400">{user?.email} • {user?.role}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 px-3 py-2.5 rounded-md text-base font-medium text-red-400 hover:text-red-300 hover:bg-slate-900/60 transition-colors"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-900 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-900/60 transition-colors"
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
