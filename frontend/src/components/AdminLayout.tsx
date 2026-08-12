import { Outlet } from 'react-router-dom';
import { AdminNav } from './AdminNav';

export function AdminLayout() {
  return (
    <div className="admin-shell">
      <AdminNav />
      <main className="admin-main">
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
