"import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpen,
  FileText,
  Users,
  Building2,
  Landmark,
  Receipt,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  BarChart3,
  Scale,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/income', label: 'Income', icon: ArrowDownCircle },
  { path: '/expenses', label: 'Expenses', icon: ArrowUpCircle },
  { path: '/accounts', label: 'Chart of Accounts', icon: BookOpen },
  { path: '/journal', label: 'Journal Entries', icon: FileText },
  { path: '/parties', label: 'Customers & Vendors', icon: Users },
  { path: '/invoices', label: 'Invoices', icon: Receipt },
  { path: '/bank', label: 'Bank Reconciliation', icon: Landmark },
];

const reportItems = [
  { path: '/reports/trial-balance', label: 'Trial Balance', icon: Scale },
  { path: '/reports/balance-sheet', label: 'Balance Sheet', icon: BarChart3 },
  { path: '/reports/profit-loss', label: 'Profit & Loss', icon: TrendingUp },
  { path: '/reports/cash-flow', label: 'Cash Flow', icon: Wallet },
];

export const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(location.pathname.startsWith('/reports'));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;
  const isReportActive = () => location.pathname.startsWith('/reports');

  return (
    <div className=\"app-layout\">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className=\"fixed inset-0 bg-slate-900/50 z-40 lg:hidden\"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200`}>
        <div className=\"p-6\">
          <div className=\"flex items-center gap-3 mb-8\">
            <div className=\"w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center\">
              <Building2 className=\"w-6 h-6 text-white\" />
            </div>
            <div>
              <h1 className=\"text-lg font-semibold text-white\">Kraftinn</h1>
              <p className=\"text-xs text-slate-400\">Finance ERP</p>
            </div>
          </div>

          <nav className=\"space-y-1\">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
              >
                <item.icon className=\"w-5 h-5\" />
                {item.label}
              </Link>
            ))}

            {/* Reports Dropdown */}
            <div>
              <button
                onClick={() => setReportsOpen(!reportsOpen)}
                className={`sidebar-nav-item w-full justify-between ${isReportActive() ? 'active' : ''}`}
              >
                <span className=\"flex items-center gap-3\">
                  <BarChart3 className=\"w-5 h-5\" />
                  Reports
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${reportsOpen ? 'rotate-180' : ''}`} />
              </button>
              {reportsOpen && (
                <div className=\"ml-4 mt-1 space-y-1\">
                  {reportItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
                    >
                      <item.icon className=\"w-4 h-4\" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className=\"pt-4 border-t border-slate-700 mt-4\">
              <Link
                to=\"/settings\"
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-nav-item ${isActive('/settings') ? 'active' : ''}`}
              >
                <Settings className=\"w-5 h-5\" />
                Settings
              </Link>
              {isAdmin() && (
                <Link
                  to=\"/users\"
                  onClick={() => setSidebarOpen(false)}
                  className={`sidebar-nav-item ${isActive('/users') ? 'active' : ''}`}
                >
                  <Users className=\"w-5 h-5\" />
                  User Management
                </Link>
              )}
            </div>
          </nav>
        </div>

        {/* User section at bottom */}
        <div className=\"absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700\">
          <div className=\"flex items-center gap-3\">
            <div className=\"w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-sm font-medium\">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className=\"flex-1 min-w-0\">
              <p className=\"text-sm font-medium text-white truncate\">{user?.full_name}</p>
              <p className=\"text-xs text-slate-400 capitalize\">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className=\"p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors\"
              title=\"Logout\"
            >
              <LogOut className=\"w-4 h-4\" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className=\"main-content\">
        {/* Header */}
        <header className=\"app-header px-6 py-4 flex items-center justify-between glass-header\">
          <div className=\"flex items-center gap-4\">
            <button
              onClick={() => setSidebarOpen(true)}
              className=\"lg:hidden p-2 hover:bg-slate-100 rounded-lg\"
            >
              <Menu className=\"w-5 h-5\" />
            </button>
            <div>
              <p className=\"text-xs text-slate-500\">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant=\"ghost\" className=\"gap-2\">
                <div className=\"w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white text-sm font-medium\">
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className=\"hidden sm:inline\">{user?.full_name}</span>
                <ChevronDown className=\"w-4 h-4\" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align=\"end\">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className=\"w-4 h-4 mr-2\" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className=\"w-4 h-4 mr-2\" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className=\"p-6\">
          {children}
        </main>
      </div>
    </div>
  );
};
"