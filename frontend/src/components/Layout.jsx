import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  LayoutDashboard,
  Search,
  ArrowLeftRight,
  Users,
  LogOut,
  MapPin,
  ScanLine,
  X,
  Menu,
  Truck,
  FileText,
  PackagePlus,
  Factory,
  Package,
} from "lucide-react";

// ─── Global Scan FAB Component ─────────────────────────────────────────────
function GlobalScanFAB({ onOpen }) {
  return (
    <button
      onClick={onOpen}
      style={{
        position: "fixed",
        bottom: 32,
        right: 32,
        width: 64,
        height: 64,
        borderRadius: "50%",
        background: "var(--primary)",
        color: "white",
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 8px 32px rgba(99, 102, 241, 0.4)",
        cursor: "pointer",
        zIndex: 1000,
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
      className="fab-hover"
    >
      <ScanLine size={28} />
    </button>
  );
}

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const [floors, setFloors] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/locations/floors")
      .then((res) => setFloors(res.data))
      .catch((err) => console.error("Failed to fetch floors", err));
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const roleLabel = {
    ADMIN: "Administrator",
    PPIC: "PPIC",
    STAFF: "Staff Gudang",
  };

  return (
    <div className={`app-layout ${sidebarOpen ? "sidebar-mobile-open" : ""}`}>
      {/* ── Mobile Header ── */}
      <header className="mobile-header">
        <button className="btn-icon" onClick={() => setSidebarOpen(true)}>
          <Menu size={24} />
        </button>
        <div className="mobile-logo">📦 WMS</div>
        <button className="btn-icon" onClick={() => navigate("/scan")}>
          <ScanLine size={20} />
        </button>
      </header>

      {/* ── Sidebar Overlay ── */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">📦</div>
          <div className="sidebar-logo-text">
            <h2>Warehouse Management System</h2>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Menu Utama</div>

          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            onClick={() => setSidebarOpen(false)}
          >
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>

          {/* RENAME: Scan -> Cari */}
          <NavLink
            to="/search"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Search size={18} /> Cari Produk
          </NavLink>

          <div className="nav-section-title" style={{ marginTop: 12 }}>
            Pemetaan Gudang
          </div>
          {floors.map((floor) => (
            <NavLink
              key={floor.id}
              to={`/locations/${floor.id}`}
              className={({ isActive }) =>
                `nav-item${isActive ? " active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <MapPin size={18} />
              {floor.name}
            </NavLink>
          ))}

          <NavLink
            to="/locations/personal"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            onClick={() => setSidebarOpen(false)}
            style={{ marginTop: 4, background: 'rgba(99, 102, 241, 0.05)' }}
          >
            <Users size={18} />
            Aset Personel
          </NavLink>

          <div className="nav-section-title" style={{ marginTop: 12 }}>
            Logistik & Inventaris
          </div>

          <NavLink
            to="/inventory"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            onClick={() => setSidebarOpen(false)}
          >
            <ArrowLeftRight size={18} /> Daftar Stok
          </NavLink>

          <NavLink
            to="/products"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Package size={18} /> Master Produk
          </NavLink>

          <div className="nav-section-title" style={{ marginTop: 12 }}>
            Pengadaan (Inbound)
          </div>

          <NavLink
            to="/suppliers"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Factory size={18} /> Data Supplier
          </NavLink>

          <NavLink
            to="/purchase-orders"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            onClick={() => setSidebarOpen(false)}
          >
            <FileText size={18} /> Purchase Order
          </NavLink>

          <NavLink
            to="/receiving"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            onClick={() => setSidebarOpen(false)}
          >
            <PackagePlus size={18} /> Terima Produk
          </NavLink>

          {isAdmin && (
            <>
              <div className="nav-section-title" style={{ marginTop: 12 }}>
                Administrasi
              </div>
              <NavLink
                to="/users"
                className={({ isActive }) =>
                  `nav-item${isActive ? " active" : ""}`
                }
              >
                <Users size={18} /> Manajemen User
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div className="user-details">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{roleLabel[user?.role]}</div>
            </div>
            <button
              className="logout-btn"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
          {sidebarOpen && (
            <button
              className="btn btn-ghost w-full"
              style={{ marginTop: 12 }}
              onClick={() => setSidebarOpen(false)}
            >
              <X size={16} /> Tutup Menu
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* ── Floating Scan Button ── */}
      <GlobalScanFAB onOpen={() => navigate("/scan")} />

      <style>{`
        .fab-hover:hover {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 12px 40px rgba(99, 102, 241, 0.6);
          background: var(--primary-light) !important;
        }
        .app-layout {
           position: relative;
        }
        .mobile-header {
          display: none;
          height: 60px;
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border);
          padding: 0 16px;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 90;
        }
        .mobile-logo {
          font-weight: 800;
          color: var(--text-white);
          font-size: 16px;
          display: flex;
          align-items: center;
        }
        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 95;
          animation: fadeIn 0.2s ease;
        }
        
        @media (max-width: 768px) {
          .mobile-header {
            display: flex;
          }
          .main-content {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
}
