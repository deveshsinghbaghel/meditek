import { Link, useLocation, Outlet } from 'react-router-dom';
import { FileText, LayoutDashboard } from 'lucide-react';
import { useHealthStore } from '../../store';
import { useHealthData } from '../../hooks/useHealthData';

export function Layout() {
  const location = useLocation();
  const connectionState = useHealthStore((state) => state.connectionState);
  useHealthData();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__brand-name">MediTrack+</span>
        </div>

        <div className="sidebar__patient">
          <span className="sidebar__avatar">AM</span>
          <span className="sidebar__patient-name">Arjun Mehta</span>
        </div>

        <nav className="sidebar__nav">
          <Link
            to="/"
            className={`sidebar__nav-item${location.pathname === '/' ? ' sidebar__nav-item--active' : ''}`}
          >
            <LayoutDashboard size={16} />
            Home
          </Link>
          <Link
            to="/reports"
            className={`sidebar__nav-item${location.pathname.startsWith('/reports') ? ' sidebar__nav-item--active' : ''}`}
          >
            <FileText size={16} />
            Reports
          </Link>
        </nav>

        <div className="sidebar__footer">
          <span className="sidebar__live-dot" />
          <span className="sidebar__live-label">{connectionState === 'live' ? 'Live' : connectionState}</span>
        </div>
      </aside>

      <main className="app-main"><Outlet /></main>

      <nav className="mobile-tabbar" aria-label="Mobile navigation">
        <Link
          to="/"
          className={`mobile-tabbar__item${location.pathname === '/' ? ' mobile-tabbar__item--active' : ''}`}
        >
          <LayoutDashboard size={22} />
          <span>Home</span>
        </Link>
        <Link
          to="/reports"
          className={`mobile-tabbar__item${location.pathname.startsWith('/reports') ? ' mobile-tabbar__item--active' : ''}`}
        >
          <FileText size={22} />
          <span>Reports</span>
        </Link>
      </nav>
    </div>
  );
}
