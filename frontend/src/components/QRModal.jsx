import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function QRModal({ type, id, name, onClose }) {
  const [loading, setLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState(null);
  
  useEffect(() => {
    let currentUrl = null;
    const fetchQR = async () => {
      try {
        const endpoint = type === 'item' ? `/items/${id}/qr` : '/locations/qr';
        const params = type === 'item' ? {} : { type, id };
        
        const response = await api.get(endpoint, { 
          params, 
          responseType: 'blob' 
        });
        
        currentUrl = window.URL.createObjectURL(new Blob([response.data]));
        setBlobUrl(currentUrl);
      } catch (err) {
        toast.error('Gagal memuat QR Code. Pastikan Anda masih terhubung.');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchQR();

    return () => {
      if (currentUrl) window.URL.revokeObjectURL(currentUrl);
    };
  }, [type, id, onClose]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', `QR-${type}-${name}.png`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal animate-up" onClick={e => e.stopPropagation()} style={{ maxWidth: 350, textAlign: 'center' }}>
        <div className="modal-header">
           <h3 className="modal-title">Pratinjau QR Code</h3>
           <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: '24px 0' }}>
           <div className="card" style={{ 
             background: 'white', 
             padding: 16, 
             display: 'inline-block', 
             borderRadius: 16,
             boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
             minWidth: 220,
             minHeight: 220
           }}>
              {loading ? (
                <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <div className="spinner dark" />
                </div>
              ) : (
                <img 
                  src={blobUrl} 
                  alt="QR Code" 
                  style={{ width: 220, height: 220 }} 
                />
              )}
           </div>
           <div style={{ marginTop: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-white)' }}>{name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                 Kategori: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{type.toUpperCase()}</span>
              </div>
           </div>
        </div>
        <div className="modal-footer" style={{ border: 'none', padding: 0 }}>
           <button className="btn btn-primary w-full" onClick={handleDownload} disabled={loading} style={{ gap: 10, height: 48 }}>
              <Download size={18} /> Simpan Gambar QR
           </button>
        </div>
      </div>
    </div>
  );
}
