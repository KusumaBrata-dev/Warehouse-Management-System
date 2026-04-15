import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { X, Map, ChevronRight, ArrowRightLeft } from 'lucide-react';

export default function RelocatePalletModal({ pallet, onClose, onMoved }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('floor'); // 'floor', 'rack', 'section', 'level'
  
  const [selFloor, setSelFloor] = useState(null);
  const [selRack, setSelRack] = useState(null);
  const [selSection, setSelSection] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/locations')
      .then(r => setData(r.data))
      .catch(() => toast.error('Gagal mengambil data gudang'))
      .finally(() => setLoading(false));
  }, []);

  const handleMove = async (levelId) => {
    setSaving(true);
    try {
      const res = await api.patch(`/locations/pallets/${pallet.id}/move`, { rackLevelId: levelId });
      toast.success('Pallet berhasil dipindahkan');
      onMoved(res.data);
      onClose();
    } catch (err) {
      toast.error('Gagal memindahkan pallet');
    } finally {
      setSaving(false);
    }
  };

  const renderContent = () => {
    if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner dark" /></div>;

    if (step === 'floor') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {data.map(f => (
            <button key={f.id} className="btn btn-ghost" style={{ height: 80, flexDirection: 'column' }} onClick={() => { setSelFloor(f); setStep('rack'); }}>
               {f.name}
            </button>
          ))}
        </div>
      );
    }

    if (step === 'rack') {
       return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {selFloor.racks.map(r => (
            <button key={r.id} className="btn btn-ghost" style={{ height: 60, fontSize: 20, fontWeight: 800 }} onClick={() => { setSelRack(r); setStep('section'); }}>
               {r.letter}
            </button>
          ))}
        </div>
      );
    }

    if (step === 'section') {
       return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {selRack.sections.map(s => (
            <button key={s.id} className="btn btn-ghost" style={{ height: 60, fontSize: 18, fontWeight: 700 }} onClick={() => { setSelSection(s); setStep('level'); }}>
               {selRack.letter}{s.number}
            </button>
          ))}
        </div>
      );
    }

    if (step === 'level') {
       return (
        <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 12 }}>
          {selSection.levels.map(l => (
            <button key={l.id} className="btn btn-ghost" style={{ height: 60, justifyContent: 'space-between' }} 
              onClick={() => handleMove(l.id)} disabled={saving}>
               <span style={{ fontWeight: 800 }}>Level {l.number}</span>
               <ArrowRightLeft size={16} />
            </button>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal animate-up" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
           <div>
              <h3 className="modal-title">Relokasi Pallet</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Pindahkan pallet {pallet.code} ke posisi baru</p>
           </div>
           <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ marginBottom: 20, padding: 12, background: 'var(--bg-base)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
           <Map size={16} color="var(--primary)" />
           <span>{selFloor?.name || 'Pilih Lantai'}</span>
           {selRack && <><ChevronRight size={12} /> <span>Rak {selRack.letter}</span></>}
           {selSection && <><ChevronRight size={12} /> <span>Posisi {selRack.letter}{selSection.number}</span></>}
        </div>

        {renderContent()}

        {step !== 'floor' && (
           <button className="btn btn-ghost" style={{ marginTop: 20, width: '100%' }} onClick={() => {
              if (step === 'rack') setStep('floor');
              if (step === 'section') setStep('rack');
              if (step === 'level') setStep('section');
           }}>Kembali</button>
        )}
      </div>
    </div>
  );
}
