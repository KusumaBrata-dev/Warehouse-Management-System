import { useState, useEffect } from "react";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from "../services/api";
import { Plus, Pencil, Trash2, Factory, Search, Phone, MapPin, X, FileText } from "lucide-react";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [formData, setFormData] = useState({ name: "", code: "", address: "", phone: "" });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (err) {
      alert("Gagal memuat data supplier");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (supplier) => {
    setCurrentSupplier(supplier);
    setFormData({ name: supplier.name, code: supplier.code, address: supplier.address || "", phone: supplier.phone || "" });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus supplier ini? Semua PO terkait mungkin terpengaruh.")) return;
    try {
      await deleteSupplier(id);
      fetchSuppliers();
    } catch (err) {
      alert("Gagal menghapus supplier");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentSupplier) {
        await updateSupplier(currentSupplier.id, formData);
      } else {
        await createSupplier(formData);
      }
      setShowModal(false);
      setFormData({ name: "", code: "", address: "", phone: "" });
      setCurrentSupplier(null);
      fetchSuppliers();
    } catch (err) {
      alert(err.response?.data?.error || "Gagal menyimpan data");
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container fadeIn">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div className="header-info">
          <div className="header-icon-box">
            <Factory size={24} />
          </div>
          <div>
            <h1 className="page-title">Manajemen Supplier</h1>
            <p className="page-subtitle">Kelola database vendor dan mitra pengadaan pabrik.</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { setCurrentSupplier(null); setFormData({ name: "", code: "", address: "", phone: "" }); setShowModal(true); }}>
          <Plus size={18} /> Tambah Supplier
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="search-bar">
          <Search size={20} />
          <input 
            type="text" 
            placeholder="Cari berdasarkan nama atau kode supplier..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Memuat data...</p>
        </div>
      ) : (
        <div className="data-grid">
          {filteredSuppliers.map(s => (
            <div key={s.id} className="card supplier-card glass-hover">
              <div className="supplier-header">
                <div className="supplier-code">{s.code}</div>
                <div className="supplier-actions">
                  <button className="btn-icon" onClick={() => handleEdit(s)}><Pencil size={16} /></button>
                  <button className="btn-icon text-error-light" onClick={() => handleDelete(s.id)}><Trash2 size={16} /></button>
                </div>
              </div>
              <h3 className="supplier-name">{s.name}</h3>
              <div className="supplier-info-grid">
                {s.phone && (
                  <div className="info-item">
                    <Phone size={14} /> <span>{s.phone}</span>
                  </div>
                )}
                {s.address && (
                  <div className="info-item">
                    <MapPin size={14} /> <span>{s.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredSuppliers.length === 0 && (
            <div className="empty-state">
              <p>Tidak ada data supplier ditemukan.</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay glass-effect">
          <div className="modal-premium modal-content fadeInDown" style={{ maxWidth: 600 }}>
            <div className="modal-premium-header">
              <div className="flex-col">
                <h2 className="modal-title">{currentSupplier ? "Edit Supplier" : "Tambah Supplier Baru"}</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Pastikan data sesuai dengan Master Vendor di sistem Odoo.
                </p>
              </div>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-premium-body">
                <div className="wms-input-group">
                  <label><Factory size={14} /> Nama Perusahaan / Supplier</label>
                  <div className="input-with-icon">
                    <Search size={16} />
                    <input 
                      type="text" 
                      className="form-control"
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})} 
                      required 
                      placeholder="Contoh: PT. Sumber Makmur"
                    />
                  </div>
                </div>

                <div className="wms-input-group">
                  <label><FileText size={14} /> Kode Supplier (Sesuai Odoo)</label>
                  <div className="input-with-icon">
                    <X size={16} style={{ transform: 'rotate(45deg)', opacity: 0.5 }} />
                    <input 
                      type="text" 
                      className="form-control"
                      value={formData.code} 
                      onChange={(e) => setFormData({...formData, code: e.target.value})} 
                      required 
                      placeholder="Contoh: SUP-001"
                    />
                  </div>
                </div>

                <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="wms-input-group">
                    <label><Phone size={14} /> Nomor Telepon</label>
                    <div className="input-with-icon">
                      <Phone size={16} />
                      <input 
                        type="text" 
                        className="form-control"
                        value={formData.phone} 
                        onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                        placeholder="+62 812..."
                      />
                    </div>
                  </div>
                  <div className="wms-input-group">
                    <label><MapPin size={14} /> Alamat Singkat</label>
                    <div className="input-with-icon">
                      <MapPin size={16} />
                      <input 
                        type="text" 
                        className="form-control"
                        value={formData.address} 
                        onChange={(e) => setFormData({...formData, address: e.target.value})} 
                        placeholder="Kota / Daerah"
                      />
                    </div>
                  </div>
                </div>

                <div className="wms-input-group">
                  <label><MapPin size={14} /> Alamat Lengkap</label>
                  <textarea 
                    className="form-control"
                    value={formData.address} 
                    onChange={(e) => setFormData({...formData, address: e.target.value})} 
                    rows="3"
                    placeholder="Jl. Industri Raya No. 123..."
                    style={{ paddingLeft: 14 }}
                  />
                </div>
              </div>

              <div className="modal-premium-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">
                  {currentSupplier ? "Update Supplier" : "Daftarkan Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .data-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }
        .supplier-card {
          padding: 24px;
          border: 1px solid var(--border);
          transition: all 0.3s ease;
        }
        .supplier-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .supplier-code {
          background: rgba(99, 102, 241, 0.1);
          color: var(--primary-light);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .supplier-name {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-white);
          margin-bottom: 16px;
        }
        .supplier-info-grid {
          display: grid;
          gap: 8px;
        }
        .info-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          font-size: 13px;
        }
        .info-item span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .supplier-actions {
          display: flex;
          gap: 8px;
          opacity: 0.4;
          transition: opacity 0.2s;
        }
        .supplier-card:hover .supplier-actions {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
