import { useState, useEffect } from "react";
import { getPurchaseOrders, getPurchaseOrder, receivePurchaseOrder } from "../services/api";
import { PackagePlus, Search, Box, ChevronRight, CheckCircle2, AlertCircle, Save, Package, MapPin } from "lucide-react";
import LocationPickerModal from "../components/LocationPickerModal";

export default function ReceivingPage() {
  const [pendingPos, setPendingPos] = useState([]);
  const [selectedPo, setSelectedPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receivingProducts, setReceivingProducts] = useState([]);
  const [success, setSuccess] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState(null);

  useEffect(() => {
    fetchPOs();
  }, []);

  const fetchPOs = async () => {
    try {
      const data = await getPurchaseOrders();
      setPendingPos(data.filter(po => po.status === 'PENDING'));
    } catch (err) {
      console.error("Failed to fetch POs");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPicker = (index) => {
    setActiveRowIndex(index);
    setShowLocationPicker(true);
  };

  const handleLocationSelect = (box, selection) => {
    const newProducts = [...receivingProducts];
    const path = `${selection.floor.name} > R${selection.rack.letter} > L${selection.level.number} > ${selection.pallet.code} > ${box.code}`;
    newProducts[activeRowIndex].boxId = box.id;
    newProducts[activeRowIndex].boxPath = path;
    newProducts[activeRowIndex].boxCode = box.code;
    setReceivingProducts(newProducts);
    setShowLocationPicker(false);
  };

  const handleSelectPo = async (po) => {
    try {
      setLoading(true);
      const fullPo = await getPurchaseOrder(po.id);
      setSelectedPo(fullPo);
      setReceivingProducts(fullPo.products.map(it => ({
        productId: it.productId,
        quantity: it.quantity,
        boxId: "",
        boxPath: "",
        boxCode: "",
        productName: it.product.name,
        sku: it.product.sku,
        description: it.description
      })));
    } catch (err) {
      alert("Gagal memuat detail PO");
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (index, field, value) => {
    const newProducts = [...receivingProducts];
    newProducts[index][field] = value;
    setReceivingProducts(newProducts);
  };

  const handleReceive = async () => {
    if (receivingProducts.some(it => !it.boxId)) {
      alert("Mohon pilih Lokasi Box untuk setiap produk.");
      return;
    }

    try {
      setLoading(true);
      await receivePurchaseOrder(selectedPo.id, { products: receivingProducts });
      setSuccess(true);
      setSelectedPo(null);
      fetchPOs();
    } catch (err) {
      alert(err.response?.data?.error || "Gagal memproses penerimaan");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="page-container fadeIn" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center' }}>
        <div className="success-icon-large scaleIn" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: 30, borderRadius: '50%', marginBottom: 24 }}>
          <CheckCircle2 size={80} />
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>Penerimaan Berhasil!</h1>
        <p style={{ fontSize: 18, opacity: 0.7, marginBottom: 40, maxWidth: 500 }}>
          Stok telah diperbarui dan transaksi masuk telah dicatat dengan aman di dalam sistem.
        </p>
        <button className="btn btn-primary btn-lg" style={{ padding: '16px 40px', fontSize: 16 }} onClick={() => setSuccess(false)}>
          Terima Purchase Order Lainnya
        </button>
      </div>
    );
  }

  return (
    <div className="page-container fadeIn">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div className="header-info">
          <div className="header-icon-box">
            <PackagePlus size={24} />
          </div>
          <div>
            <h1 className="page-title">Terima Produk (Inbound)</h1>
            <p className="page-subtitle">Konfirmasi kedatangan produk dan tentukan lokasi penyimpanan di rak.</p>
          </div>
        </div>
      </div>

      <div className="receiving-split">
        {/* LEFT: PO Selection */}
        <div className="po-selector-list">
          <h3 className="section-title">Pilih Purchase Order</h3>
          {loading && !selectedPo ? (
            <div className="spinner-margin" />
          ) : (
            <div className="po-cards-grid">
              {pendingPos.map(po => (
                <div 
                  key={po.id} 
                  className={`card po-selection-card ${selectedPo?.id === po.id ? 'active' : ''}`}
                  onClick={() => handleSelectPo(po)}
                >
                  <div className="po-number">{po.poNumber}</div>
                  <div className="po-supplier">{po.supplier.name}</div>
                  <div className="po-meta">
                    <span>{po.products.length} Produk</span>
                    <span>•</span>
                    <span>{new Date(po.createdAt).toLocaleDateString()}</span>
                  </div>
                  <ChevronRight className="arrow" />
                </div>
              ))}
              {pendingPos.length === 0 && <div className="empty-mini">Tidak ada PO yang menunggu.</div>}
            </div>
          )}
        </div>

        {/* RIGHT: Receiving Form */}
        <div className="receiving-form-area">
          {selectedPo ? (
            <div className="card fadeIn">
              <div className="card-header-wms">
                <div className="flex-col">
                  <h2>Detail Konfirmasi: {selectedPo.poNumber}</h2>
                  <p>Asal: {selectedPo.supplier.name}</p>
                </div>
                <div className="status-label">PENDING</div>
              </div>

              <div className="receiving-items-table">
                {receivingProducts.map((it, idx) => (
                  <div key={idx} className="receiving-row">
                    <div className="item-meta">
                      <div className="sku">{it.sku}</div>
                      <div className="name" style={{ fontWeight: 600 }}>{it.productName}</div>
                      {it.description && (
                        <div className="manual-desc" style={{ fontSize: 11, color: 'var(--primary)', fontStyle: 'italic', marginTop: 2 }}>
                          PO Desc: {it.description}
                        </div>
                      )}
                    </div>
                    
                    <div className="qty-input">
                      <label>Jml Diterima</label>
                      <input 
                        type="number" 
                        value={it.quantity} 
                        onChange={(e) => handleProductChange(idx, 'quantity', e.target.value)}
                        min="1"
                      />
                    </div>

                    <div className="box-input" style={{ flex: 1.5 }}>
                      <label>Lokasi Simpan (Pallet & Box)</label>
                      {it.boxId ? (
                        <div className="selected-path-box fadeIn" onClick={() => handleOpenPicker(idx)}>
                          <div className="path-text">{it.boxPath}</div>
                          <div className="box-code-badge"><MapPin size={12} /> {it.boxCode}</div>
                        </div>
                      ) : (
                        <button className="btn btn-outline btn-dashed w-full" onClick={() => handleOpenPicker(idx)} style={{ height: 44 }}>
                           Tentukan Lokasi
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="card-footer" style={{ marginTop: 24, padding: 0, border: 'none' }}>
                <div className="alert-info-box">
                  <AlertCircle size={18} />
                  <span>Pastikan jumlah fisik produk sesuai dengan yang Anda input di atas.</span>
                </div>
                <button 
                   className="btn btn-primary w-full" 
                  style={{ marginTop: 16, height: 50 }}
                  onClick={handleReceive}
                  disabled={loading}
                >
                  {loading ? <div className="spinner-mini" /> : <><Save size={20} /> Konfirmasi Penerimaan & Update Stok</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-receiving-placeholder">
              <Package size={48} />
              <p>Pilih Purchase Order di sebelah kiri untuk memulai proses penerimaan.</p>
            </div>
          )}
        </div>
      </div>

      {showLocationPicker && (
        <LocationPickerModal 
          isOpen={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onSelect={handleLocationSelect}
        />
      )}

      <style>{`
        .receiving-split {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 32px;
          min-height: 600px;
        }
        .section-title { font-size: 14px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 16px; letter-spacing: 1px; }
        .po-cards-grid { display: grid; gap: 12px; }
        .po-selection-card {
           padding: 20px;
           position: relative;
           cursor: pointer;
           border: 1px solid var(--border);
           transition: all 0.2s;
        }
        .po-selection-card:hover { border-color: var(--primary-light); background: rgba(99,102,241,0.05); }
        .po-selection-card.active { border-color: var(--primary); background: rgba(99,102,241,0.1); border-width: 2px; }
        .po-number { font-weight: 700; color: var(--text-white); margin-bottom: 4px; }
        .po-supplier { font-size: 13px; color: var(--text-muted); margin-bottom: 8px; }
        .po-meta { font-size: 12px; opacity: 0.6; display: flex; gap: 8px; }
        .po-selection-card .arrow { position: absolute; right: 20px; top: 50%; transform: translateY(-50%); opacity: 0; transition: all 0.2s; }
        .po-selection-card:hover .arrow { opacity: 1; right: 15px; }
        
        .card-header-wms { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
        .status-label { background: rgba(245, 158, 11, 0.1); color: #f59e0b; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 700; }
        
        .receiving-row {
          display: grid;
          grid-template-columns: 2fr 120px 1.5fr;
          gap: 20px;
          padding: 16px;
          background: rgba(255,255,255,0.02);
          border-radius: 8px;
          margin-bottom: 12px;
          align-items: flex-end;
          border: 1px solid var(--border-light);
        }
        .item-meta .sku { font-size: 11px; font-weight: 700; color: var(--primary-light); }
        .item-meta .name { font-size: 15px; color: var(--text-white); font-weight: 500; }
        .qty-input label, .box-input label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 6px; }
        
        .empty-receiving-placeholder {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          opacity: 0.3;
          border: 2px dashed var(--border);
          border-radius: 16px;
          text-align: center;
          padding: 40px;
        }
        .empty-mini { opacity: 0.5; font-size: 13px; padding: 20px; text-align: center; }
        .alert-info-box { display: flex; align-items: center; gap: 12px; background: rgba(59, 130, 246, 0.1); color: #60a5fa; padding: 12px; border-radius: 8px; font-size: 13px; }
        
        .selected-path-box {
          background: rgba(99, 102, 241, 0.05);
          border: 1px solid var(--primary);
          border-radius: 8px;
          padding: 8px 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .selected-path-box:hover { background: rgba(99, 102, 241, 0.1); }
        .path-text { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
        .box-code-badge { font-size: 13px; font-weight: 700; color: var(--primary-light); display: flex; align-items: center; gap: 6px; }
        .btn-dashed { border: 1px dashed var(--border); color: var(--text-muted); }
        .btn-dashed:hover { border-color: var(--primary); color: var(--primary-light); }

        @media (max-width: 1024px) {
          .receiving-split { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
