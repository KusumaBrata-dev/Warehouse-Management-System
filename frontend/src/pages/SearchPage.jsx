import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Search, MapPin, Package, Box as BoxIcon, Layers, ChevronRight, ArrowRight, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const setQuery = (q) => {
    setSearchParams(prev => {
      if (!q) {
        prev.delete("q");
      } else {
        prev.set("q", q);
      }
      return prev;
    }, { replace: true });
  };

  useEffect(() => {
    if (location.state?.initialQuery) {
      setQuery(location.state.initialQuery);
    }
  }, [location.state]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/locations/search?q=${query}`);
        setResults(data);
      } catch (err) {
        toast.error('Pencarian gagal');
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleResultClick = (result) => {
    if (result.type === 'user') {
      toast(`Staf: ${result.name} (${result.code})`, { icon: '👤' });
      return;
    }
    
    if (!result.location) return toast.error("Lokasi tidak ditemukan");

    const floorId = result.location.section.rack.floorId;
    const params = new URLSearchParams();
    params.set("rackId", result.location.section.rack.id);
    params.set("sectionId", result.location.section.id);
    params.set("levelId", result.location.id);
    
    if (result.type === 'pallet') {
      params.set("palletId", result.id.replace('pallet-', ''));
    } else if (result.type === 'box') {
      if (result.palletId) params.set("palletId", result.palletId);
      params.set("boxId", result.id.replace('box-', ''));
    }
    
    navigate(`/locations/${floorId}?${params.toString()}`);
  };

  // Grouping results
  const grouped = results.reduce((acc, res) => {
    const type = res.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(res);
    return acc;
  }, {});

  const typeLabels = {
    product: "Produk",
    box: "Box / Aset",
    pallet: "Pallet",
    user: "Personel (Staf)"
  };

  const typeIcons = {
    product: <Package size={20} />,
    box: <BoxIcon size={20} />,
    pallet: <Layers size={20} />,
    user: <Users size={20} />
  };

  return (
    <div className="page-container animate-fade">
      <div className="page-header" style={{ marginBottom: 40 }}>
        <div>
          <h1>Cari Produk & Lokasi</h1>
          <p>Temukan lokasi box atau produk dengan mengetik kode part atau nama</p>
        </div>
      </div>

      <div className="search-box" style={{ 
        maxWidth: 700, margin: '0 auto 40px', padding: '12px 24px', 
        height: 64, borderRadius: 20, background: 'var(--bg-surface)', 
        boxShadow: '0 12px 48px rgba(0,0,0,0.2)', border: '1px solid var(--border)' 
      }}>
        <Search size={28} color="var(--primary)" />
        <input
          type="text"
          className="form-control"
          placeholder="Ketik kode part, nama produk, nomor pallet, atau kode box..."
          style={{ fontSize: 20, color: 'var(--text-white)' }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {loading && <div className="spinner dark" />}
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {results.length === 0 && query && !loading && (
          <div style={{ textAlign: 'center', padding: 100, opacity: 0.5 }}>
             <Package size={48} style={{ margin: '0 auto 16px' }} />
             <p>Tidak ada hasil untuk "{query}"</p>
          </div>
        )}

        {Object.entries(grouped).map(([type, items]) => (
          <div key={type} className="animate-up" style={{ marginBottom: 32 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, color: 'var(--primary)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
                {typeIcons[type]}
                {typeLabels[type]} ({items.length})
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {items.map((res) => (
                  <div 
                    key={res.id} 
                    className="card hover-card" 
                    style={{ 
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 20, padding: 16, 
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderLeft: `4px solid ${res.type === 'product' ? 'var(--primary)' : res.type === 'box' ? 'var(--info)' : res.type === 'pallet' ? 'var(--warning)' : 'var(--success)'}`
                    }}
                    onClick={() => handleResultClick(res)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-white)' }}>{res.name}</span>
                        {res.type === 'user' && <span className="badge badge-success" style={{ fontSize: 10 }}>ONLINE</span>}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>ID/SKU: <span className="font-mono">{res.code}</span></div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: res.type === 'user' ? 'var(--text-muted)' : 'var(--success)', fontWeight: 600, fontSize: 12 }}>
                        {res.type === 'user' ? <Users size={12} /> : <MapPin size={12} />}
                        {res.path}
                      </div>
                    </div>

                    <div style={{ padding: '0 10px', color: 'var(--text-muted)' }}>
                      <ArrowRight size={18} />
                    </div>
                  </div>
                ))}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
