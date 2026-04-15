import { useState, useEffect } from "react";
import { getPurchaseOrders, getSuppliers, getProducts, createPurchaseOrder, cancelPurchaseOrder } from "../services/api";
import { Plus, FileText, Search, Filter, Calendar, User, Package, X, ChevronRight, Trash2, Factory, AlertTriangle, Printer, Ban } from "lucide-react";

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    poNumber: "",
    supplierId: "",
    notes: "",
    products: [{ productId: "", description: "", quantity: 1, price: "" }]
  });
  const [viewingPo, setViewingPo] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const user = JSON.parse(localStorage.getItem('wh_user') || '{}');
  const isAdmin = user.role === 'ADMIN';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [poData, supData, productData] = await Promise.all([
        getPurchaseOrders(),
        getSuppliers(),
        getProducts({ limit: 1000 })
      ]);
      setPos(poData);
      setSuppliers(supData);
      setProducts(Array.isArray(productData) ? productData : (productData.products || []));
    } catch (err) {
      alert("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    setFormData({
      ...formData,
      products: [...formData.products, { productId: "", description: "", quantity: 1, price: "" }]
    });
  };

  const handleRemoveProduct = (index) => {
    const newProducts = formData.products.filter((_, i) => i !== index);
    setFormData({ ...formData, products: newProducts });
  };

  const handleProductChange = (index, field, value) => {
    const newProducts = [...formData.products];
    newProducts[index][field] = value;

    // Auto-fill description if productId changes and description is empty
    if (field === 'productId' && value) {
      const selectedProduct = products.find(i => i.id === parseInt(value));
      if (selectedProduct && (!newProducts[index].description || newProducts[index].description === "")) {
        newProducts[index].description = selectedProduct.name;
      }
    }

    setFormData({ ...formData, products: newProducts });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.poNumber || !formData.supplierId || formData.products.some(i => !i.productId)) {
      alert("Mohon lengkapi semua data wajib");
      return;
    }
    try {
      await createPurchaseOrder(formData);
      setShowModal(false);
      setFormData({ poNumber: "", supplierId: "", notes: "", products: [{ productId: "", description: "", quantity: 1, price: "" }] });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Gagal membuat PO");
    }
  };

  const handleCancelPo = async (id) => {
    try {
      setCancelLoading(true);
      await cancelPurchaseOrder(id);
      setViewingPo(null);
      setConfirmingCancel(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Gagal membatalkan PO");
    } finally {
      setCancelLoading(false);
    }
  };

  const statusBadge = (status) => {
    const styles = {
      PENDING: { bg: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", label: "Menunggu" },
      RECEIVED: { bg: "rgba(16, 185, 129, 0.1)", color: "#10b981", label: "Diterima" },
      CANCELLED: { bg: "rgba(239, 68, 68, 0.1)", color: "#ef4444", label: "Dibatalkan" }
    };
    const s = styles[status] || styles.PENDING;
    return (
      <span style={{ 
        backgroundColor: s.bg, 
        color: s.color, 
        padding: '4px 10px', 
        borderRadius: 20, 
        fontSize: 11, 
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.5
      }}>
        {s.label}
      </span>
    );
  };

  const filteredPos = pos.filter(po => 
    po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container fadeIn">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div className="header-info">
          <div className="header-icon-box">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="page-title">Purchase Orders (PO)</h1>
            <p className="page-subtitle">Input dan pantau pesanan produk masuk dari sistem Odoo.</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Buat PO Baru
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="search-bar">
          <Search size={20} />
          <input 
            type="text" 
            placeholder="Cari nomor PO atau nama supplier..." 
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
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="wms-table">
            <thead>
              <tr>
                <th>No. PO (Odoo)</th>
                <th>Supplier</th>
                <th>Tgl Dibuat</th>
                <th>Produk</th>
                <th>Status</th>
                <th>Admin</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredPos.map(po => (
                <tr key={po.id} className="row-hover">
                  <td className="font-bold">{po.poNumber}</td>
                  <td>{po.supplier.name}</td>
                  <td>
                    <div className="flex-center" style={{ gap: 6, opacity: 0.7 }}>
                      <Calendar size={14} />
                      {new Date(po.createdAt).toLocaleDateString('id-ID')}
                    </div>
                  </td>
                  <td>
                    <div className="flex-center" style={{ gap: 6 }}>
                      <Package size={14} />
                      {po.products.length} SKU
                    </div>
                  </td>
                  <td>{statusBadge(po.status)}</td>
                  <td>
                    <div className="flex-center" style={{ gap: 6, fontSize: 13 }}>
                      <User size={14} /> {po.user.name}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setViewingPo(po)}>
                      Detail <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPos.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 48, opacity: 0.5 }}>
                    Tidak ada Purchase Order ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay glass-effect">
          <div className="modal-premium modal-content fadeInDown" style={{ maxWidth: 850 }}>
            <div className="modal-premium-header">
              <div className="flex-col">
                <h2 className="modal-title">Form Purchase Order Baru</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Input detail pesanan produk sesuai dengan dokumen dari Odoo.
                </p>
              </div>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-premium-body">
                <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
                  <div className="wms-input-group">
                    <label><FileText size={14} /> Nomor PO (Input Manual)</label>
                    <div className="input-with-icon">
                      <FileText size={16} />
                      <input 
                        type="text" 
                        className="form-control"
                        value={formData.poNumber} 
                        onChange={(e) => setFormData({...formData, poNumber: e.target.value})} 
                        placeholder="Contoh: PO/2026/0042"
                        required
                      />
                    </div>
                  </div>
                  <div className="wms-input-group">
                    <label><User size={14} /> Pilih Supplier</label>
                    <div className="input-with-icon">
                      <Factory size={16} />
                      <select 
                        className="form-control"
                        value={formData.supplierId} 
                        onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                        required
                      >
                        <option value="">-- Pilih Supplier --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="wms-input-group">
                  <label><Filter size={14} /> Catatan Internal</label>
                  <textarea 
                    className="form-control"
                    value={formData.notes} 
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Contoh: Pengiriman via ekspedisi khusus..."
                    rows="2"
                    style={{ paddingLeft: 14 }}
                  />
                </div>

                <div className="po-items-premium-section" style={{ marginTop: 12 }}>
                  <div className="section-header" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Package size={18} style={{ color: 'var(--primary)' }} />
                      <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Daftar Produk</h3>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={handleAddProduct}>
                      <Plus size={16} /> Tambah Produk
                    </button>
                  </div>
                  
                  <div className="item-labels" style={{ display: 'grid', gridTemplateColumns: '1fr 100px 140px 40px', gap: 12, padding: '0 12px 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                    <div>NAMA PRODUK / SKU</div>
                    <div>KUANTITAS</div>
                    <div>HARGA (OPSIONAL)</div>
                    <div></div>
                  </div>

                  <div className="po-items-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {formData.products.map((item, index) => (
                      <div key={index} className="po-item-row-premium fadeIn" style={{ display: 'grid', gridTemplateColumns: '1.5fr 100px 140px 40px', gap: 12, alignItems: 'start', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <div className="flex-col" style={{ gap: 8 }}>
                          <input 
                            type="text" 
                            className="form-control"
                            placeholder="Ketik Nama Produk Manual (Odoo)..."
                            value={item.description}
                            onChange={(e) => handleProductChange(index, 'description', e.target.value)}
                            style={{ marginBottom: 4 }}
                          />
                          <div className="input-with-icon">
                            <Package size={14} />
                            <select 
                              className="form-control"
                              value={item.productId} 
                              onChange={(e) => handleProductChange(index, 'productId', e.target.value)}
                              required
                            >
                              <option value="">-- Cari/Link ke Produk Sistem --</option>
                              {products.map(i => <option key={i.id} value={i.id}>{i.sku} - {i.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <input 
                          type="number" 
                          className="form-control"
                          placeholder="0" 
                          value={item.quantity} 
                          onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                          min="1"
                          required
                        />
                        <div className="input-with-icon">
                          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, opacity: 0.5 }}>Rp</span>
                          <input 
                            type="number" 
                            className="form-control"
                            placeholder="Unit Price" 
                            value={item.price} 
                            onChange={(e) => handleProductChange(index, 'price', e.target.value)}
                            style={{ paddingLeft: 34 }}
                          />
                        </div>
                        <button type="button" className="btn-icon text-error" onClick={() => handleRemoveProduct(index)} style={{ border: 'none', background: 'transparent' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {formData.products.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 32, border: '1px dashed var(--border)', borderRadius: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                      Belum ada produk ditambahkan. Klik "Tambah Produk" untuk memulai.
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-premium-footer">
                <div style={{ flex: 1, color: 'var(--text-muted)', fontSize: 13 }}>
                   Total: <strong>{formData.products.reduce((acc, curr) => acc + (parseInt(curr.quantity) || 0), 0)}</strong> unit
                </div>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ minWidth: 160 }}>
                   Simpan Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETAIL PO */}
      {viewingPo && (
        <div className="modal-overlay glass-effect" onClick={(e) => e.target.className === 'modal-overlay glass-effect' && setViewingPo(null)}>
          <div className="modal-premium modal-content scaleIn" style={{ maxWidth: 900 }}>
            <div className="modal-premium-header">
              <div className="flex-col">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <h2 className="modal-title">Detail Purchase Order</h2>
                  {statusBadge(viewingPo.status)}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  Order #{viewingPo.poNumber} — Dibuat oleh {viewingPo.user.name} pada {new Date(viewingPo.createdAt).toLocaleString('id-ID')}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost btn-icon" onClick={() => window.print()} title="Cetak PO">
                  <Printer size={20} />
                </button>
                <button className="btn-icon" onClick={() => setViewingPo(null)}><X size={20} /></button>
              </div>
            </div>

            <div className="modal-premium-body" style={{ padding: '0 32px 32px 32px' }}>
              {/* Supplier Info Card */}
              <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border)', marginBottom: 24, padding: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div className="flex-col" style={{ gap: 6 }}>
                    <label style={{ fontSize: 11, textTransform: 'uppercase', opacity: 0.5, letterSpacing: 1 }}>Informasi Supplier</label>
                    <div className="font-bold" style={{ fontSize: 18, color: 'var(--primary-light)' }}>{viewingPo.supplier.name}</div>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>Kode: {viewingPo.supplier.code}</div>
                  </div>
                  <div className="flex-col" style={{ gap: 6, textAlign: 'right' }}>
                    <label style={{ fontSize: 11, textTransform: 'uppercase', opacity: 0.5, letterSpacing: 1 }}>Catatan Pesanan</label>
                    <div style={{ fontSize: 14, fontStyle: viewingPo.notes ? 'normal' : 'italic', opacity: 0.8 }}>
                      {viewingPo.notes || "Tidak ada catatan."}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={16} /> Daftar Produk Pesanan ({viewingPo.products.length})
              </h3>
              
              <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <table className="wms-table" style={{ background: 'transparent' }}>
                  <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <tr>
                      <th style={{ padding: '12px 20px' }}>Nama Produk / Deskripsi (Odoo)</th>
                      <th style={{ padding: '12px 20px' }}>SKU Sistem</th>
                      <th style={{ padding: '12px 20px', textAlign: 'center' }}>Qty</th>
                      {isAdmin && <th style={{ padding: '12px 20px', textAlign: 'right' }}>Harga Satuan</th>}
                      {isAdmin && <th style={{ padding: '12px 20px', textAlign: 'right' }}>Subtotal</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {viewingPo.products.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '16px 20px' }}>
                          <div className="font-bold" style={{ color: 'var(--text-white)' }}>{it.description || it.product.name}</div>
                          {it.description && <div style={{ fontSize: 12, opacity: 0.6 }}>Asli: {it.product.name}</div>}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>
                            {it.product.sku}
                          </code>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          <span style={{ fontSize: 16, fontWeight: 600 }}>{it.quantity}</span>
                        </td>
                        {isAdmin && (
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            {it.price ? `Rp ${it.price.toLocaleString('id-ID')}` : '-'}
                          </td>
                        )}
                        {isAdmin && (
                          <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: 'var(--primary-light)' }}>
                            {it.price ? `Rp ${(it.price * it.quantity).toLocaleString('id-ID')}` : '-'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  {isAdmin && (
                    <tfoot style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <tr>
                        <td colSpan="4" style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 700 }}>TOTAL ESTIMASI</td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 900, fontSize: 18, color: 'var(--primary-light)' }}>
                          Rp {viewingPo.products.reduce((acc, it) => acc + (it.price || 0) * it.quantity, 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <div className="modal-premium-footer" style={{ padding: '24px 32px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="flex-center" style={{ gap: 10 }}>
                {viewingPo.status === 'PENDING' ? (
                  confirmingCancel ? (
                    <div className="flex-center scaleIn" style={{ gap: 8, background: 'rgba(239, 68, 68, 0.1)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>Yakin batalkan?</span>
                      <button 
                        className="btn btn-sm" 
                        style={{ background: '#ef4444', color: 'white', border: 'none' }}
                        onClick={() => handleCancelPo(viewingPo.id)}
                        disabled={cancelLoading}
                      >
                        {cancelLoading ? "..." : "Ya, Batalkan"}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmingCancel(false)}>Tidak</button>
                    </div>
                  ) : (
                    <button 
                      className="btn btn-outline" 
                      style={{ borderColor: '#ef4444', color: '#ef4444' }}
                      onClick={() => setConfirmingCancel(true)}
                    >
                      <Ban size={18} /> Batalkan Pesanan
                    </button>
                  )
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} /> Pesanan ini sudah {viewingPo.status === 'RECEIVED' ? 'selesai' : 'dibatalkan'} dan tidak bisa diubah.
                  </div>
                )}
              </div>
              <button className="btn btn-secondary" style={{ minWidth: 120 }} onClick={() => { setViewingPo(null); setConfirmingCancel(false); }}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-lg { max-width: 800px; }
        .form-row { display: flex; gap: 16px; margin-bottom: 0; }
        .flex-1 { flex: 1; }
        .flex-3 { flex: 3; }
        .po-items-section {
          margin-top: 24px;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          background: rgba(255,255,255,0.02);
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .section-header h3 { font-size: 14px; font-weight: 600; color: var(--text-muted); }
        .po-items-list { display: grid; gap: 12px; }
        .po-item-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-light);
        }
        .po-item-row:last-child { border-bottom: none; }
        .wms-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .wms-table th {
          text-align: left;
          padding: 16px 24px;
          background: rgba(255,255,255,0.03);
          color: var(--text-muted);
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .wms-table td {
          padding: 16px 24px;
          border-bottom: 1px solid var(--border-light);
          color: var(--text-white);
        }
        .flex-center { display: flex; align-items: center; }
      `}</style>
    </div>
  );
}
