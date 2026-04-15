import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createProduct, updateProduct, deleteProduct, exportProductsExcel } from '../services/api';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, Package, X, HardDrive, QrCode } from 'lucide-react';
import QRModal from '../components/QRModal';
import { useAuth } from '../context/AuthContext';

function QRButton({ type, id, name, size = 16 }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <button className="btn btn-primary btn-icon btn-sm" onClick={() => setShow(true)} title="Preview QR">
        <QrCode size={size} />
      </button>
      {show && <QRModal type={type} id={id} name={name} onClose={() => setShow(false)} />}
    </>
  );
}

function ProductModal({ product, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', sku: '', unit: '', categoryId: '', description: '', minStock: 0,
    ...product
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.sku) return toast.error('Nama dan SKU wajib diisi');
    setLoading(true);
    try {
      const payload = {
        ...form,
        minStock: parseInt(form.minStock) || 0,
        categoryId: form.categoryId ? parseInt(form.categoryId) : undefined
      };
      
      if (product?.id) {
        await updateProduct(product.id, payload);
        toast.success('Master Produk diperbarui');
      } else {
        await createProduct(payload);
        toast.success('Master Produk ditambahkan');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-premium scaleIn" style={{ maxWidth: 500 }}>
        <div className="modal-premium-header">
          <h2 className="modal-title">{product?.id ? 'Edit Master Produk' : 'Tambah Master Produk'}</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-premium-body flex-col gap-12" style={{ padding: '20px 24px' }}>
            <div className="form-group">
              <label className="form-label">Nama Produk</label>
              <input className="form-control" placeholder="Contoh: Sparepart Baut M8" value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus required />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Kode SKU</label>
                <input className="form-control font-mono" placeholder="SKU Unik" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Satuan</label>
                <input className="form-control" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} placeholder="pcs, kg, box" required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
               <div className="form-group">
                  <label className="form-label">Minimum Stok (Alert)</label>
                  <input type="number" className="form-control" value={form.minStock} onChange={e => setForm({...form, minStock: e.target.value})} min="0" />
               </div>
            </div>

            <div className="form-group">
               <label className="form-label">Deskripsi Tambahan</label>
               <textarea className="form-control" rows="3" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})}></textarea>
            </div>
          </div>
          
          <div className="modal-premium-footer flex-center" style={{ padding: '16px 24px', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Master Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("s") || "";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalProduct, setModalProduct] = useState(null);

  const setSearch = (s) => {
    setSearchParams(prev => {
      if (!s) prev.delete("s");
      else prev.set("s", s);
      return prev;
    }, { replace: true });
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      toast.error('Gagal memuat master produk');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Hapus Master Produk "${product.name}" (SKU: ${product.sku})?\nPERINGATAN: Produk tidak dapat dihapus jika masih ada stok aktif.`)) return;
    try {
      await deleteProduct(product.id);
      toast.success('Master Produk berhasil dihapus');
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menghapus produk');
    }
  };

  const filteredProducts = products.filter(it => 
    it.name.toLowerCase().includes(search.toLowerCase()) || 
    it.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container animate-fade" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <h1>Master Data Produk</h1>
          <p>Database utama seluruh produk dan entitas gudang</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={() => setModalProduct({})}>
            <Plus size={18} /> Tambah Master Produk
          </button>
        </div>
      </div>

      <div className="card glass flex" style={{ padding: 16, marginBottom: 24, alignItems: 'center' }}>
        <div className="search-box" style={{ flex: 1 }}>
          <Search size={18} />
          <input
            type="text"
            className="form-control"
            placeholder="Cari berdasarkan Nama atau Kode SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card glass" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ margin: 0, border: 'none' }}>
           <table style={{ borderCollapse: 'collapse', width: '100%' }}>
             <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
               <tr>
                 <th style={{ padding: '16px 24px' }}>Identifikasi Produk</th>
                 <th>Satuan</th>
                 <th>Batas Minimum Stok</th>
                 <th style={{ textAlign: 'right', paddingRight: 24 }}>Tindakan</th>
               </tr>
             </thead>
             <tbody>
               {loading ? (
                 Array(5).fill(0).map((_, i) => (
                   <tr key={i}><td colSpan={4} style={{ padding: 20 }}><div className="skeleton-line" /></td></tr>
                 ))
               ) : filteredProducts.length === 0 ? (
                 <tr>
                   <td colSpan={4} style={{ padding: 80, textAlign: 'center', opacity: 0.5 }}>
                      <HardDrive size={48} style={{ margin: '0 auto 16px' }} />
                      <p>Database master produk masih kosong.</p>
                   </td>
                 </tr>
               ) : filteredProducts.map(product => (
                 <tr key={product.id} className="hover-row" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 24px' }}>
                       <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-white)' }}>{product.name}</div>
                       <div className="flex" style={{ gap: 8, marginTop: 4 }}>
                         <span className="badge badge-gray font-mono">{product.sku}</span>
                         {product.category?.name && <span className="badge badge-primary" style={{ opacity: 0.8 }}>{product.category.name}</span>}
                       </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{product.unit}</td>
                    <td>
                       {product.minStock > 0 ? (
                         <span className="text-warning font-bold">{product.minStock} {product.unit}</span>
                       ) : (
                         <span className="text-muted italic">Tidak dibatasi</span>
                       )}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: 24 }}>
                       <div className="flex" style={{ gap: 8, justifyContent: 'flex-end' }}>
                          <QRButton type="product" id={product.id} name={product.sku} />
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModalProduct(product)} title="Edit Master"><Edit2 size={16} /></button>
                          {isAdmin && (
                            <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => handleDeleteProduct(product)} title="Hapus Master"><Trash2 size={16} /></button>
                          )}
                       </div>
                    </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      </div>

      {modalProduct && <ProductModal product={modalProduct.id ? modalProduct : null} onClose={() => setModalProduct(null)} onSaved={loadProducts} />}
      
      <style>{`
        .hover-row:hover { background: rgba(255,255,255,0.02); }
        .skeleton-line { height: 20px; background: var(--border); border-radius: 4px; animation: pulse 1.5s infinite; }
        .flex { display: flex; align-items: center; }
      `}</style>
    </div>
  );
}
