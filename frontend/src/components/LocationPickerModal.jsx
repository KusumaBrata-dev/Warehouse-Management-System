import React, { useState, useEffect } from 'react';
import { getFloors, getLocations, createPallet, createBox } from '../services/api';
import { X, ChevronRight, Package, Layout, Database, Layers, ArrowLeft, Plus, Box as BoxIcon, Check } from 'lucide-react';

export default function LocationPickerModal({ isOpen, onClose, onSelect, initialFloorId = null }) {
  const [step, setStep] = useState(1); // 1: Floor, 2: Rack, 3: Section, 4: Level, 5: Pallet, 6: Box
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null); // The whole hierarchy for the selected floor
  
  const [floors, setFloors] = useState([]);
  const [selection, setSelection] = useState({
    floor: null,
    rack: null,
    section: null,
    level: null,
    pallet: null,
    box: null
  });

  const [newCode, setNewCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFloors();
    } else {
      resetSelection();
    }
  }, [isOpen]);

  const fetchFloors = async () => {
    try {
      setLoading(true);
      const res = await getFloors();
      setFloors(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHierarchy = async (floorId) => {
    try {
      setLoading(true);
      const res = await getLocations(floorId);
      // Backend returns array of floors, we find the one we need
      const floorData = res.find(f => f.id === floorId);
      setData(floorData); 
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetSelection = () => {
    setStep(1);
    setSelection({ floor: null, rack: null, section: null, level: null, pallet: null, box: null });
    setData(null);
    setIsCreating(false);
    setNewCode("");
  };

  const handleFloorSelect = (floor) => {
    setSelection({ ...selection, floor });
    fetchHierarchy(floor.id);
    setStep(2);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setIsCreating(false);
      setNewCode("");
    }
  };

  const handleCreateNew = async () => {
    if (!newCode) return;
    try {
      setLoading(true);
      if (step === 5) { // Creating Pallet
        await createPallet({ code: newCode, rackLevelId: selection.level.id });
        await fetchHierarchy(selection.floor.id);
        setIsCreating(false);
        setNewCode("");
      } else if (step === 6) { // Creating Box
        await createBox({ code: newCode, palletId: selection.pallet.id });
        await fetchHierarchy(selection.floor.id);
        setIsCreating(false);
        setNewCode("");
      }
    } catch (err) {
      alert(err.response?.data?.error || "Gagal membuat data");
    } finally {
      setLoading(false);
    }
  };

  // Sync selection with data when re-fetching
  useEffect(() => {
    if (data && selection.rack) {
      const updatedRack = data.racks.find(r => r.id === selection.rack.id);
      if (updatedRack) {
        const updatedSection = selection.section ? updatedRack.sections.find(s => s.id === selection.section.id) : null;
        const updatedLevel = selection.level && updatedSection ? updatedSection.levels.find(l => l.id === selection.level.id) : null;
        const updatedPallet = selection.pallet && updatedLevel ? updatedLevel.pallets.find(p => p.id === selection.pallet.id) : null;
        
        setSelection({
          ...selection,
          rack: updatedRack,
          section: updatedSection,
          level: updatedLevel,
          pallet: updatedPallet
        });
      }
    }
  }, [data]);

  if (!isOpen) return null;

  const renderContent = () => {
    if (loading && !data && step > 1) return <div className="loading-container"><div className="spinner-mini"></div></div>;

    switch (step) {
      case 1: // Floor
        return (
          <div className="grid-list">
            {floors.map(f => (
              <button key={f.id} className="picker-item" onClick={() => handleFloorSelect(f)}>
                <Database size={20} className="text-primary" />
                <span>{f.name}</span>
                <ChevronRight size={16} className="ml-auto opacity-30" />
              </button>
            ))}
          </div>
        );
      case 2: // Rack
        return (
          <div className="grid-list">
            {(data?.racks || []).map(r => (
              <button key={r.id} className="picker-item" onClick={() => { setSelection({...selection, rack: r}); setStep(3); }}>
                <Layout size={20} className="text-primary" />
                <span>Rak {r.letter}</span>
                <ChevronRight size={16} className="ml-auto opacity-30" />
              </button>
            ))}
          </div>
        );
      case 3: // Section
        return (
          <div className="grid-list">
            {(selection.rack?.sections || []).map(s => (
              <button key={s.id} className="picker-item" onClick={() => { setSelection({...selection, section: s}); setStep(4); }}>
                <Layers size={20} className="text-primary" />
                <span>Baris {selection.rack.letter}{s.number}</span>
                <ChevronRight size={16} className="ml-auto opacity-30" />
              </button>
            ))}
          </div>
        );
      case 4: // Level (Bin)
        return (
          <div className="grid-list">
            {(selection.section?.levels || []).map(l => (
              <button key={l.id} className="picker-item" onClick={() => { setSelection({...selection, level: l}); setStep(5); }}>
                <Check size={20} className="text-primary" />
                <span>Level {l.number}</span>
                <ChevronRight size={16} className="ml-auto opacity-30" />
              </button>
            ))}
          </div>
        );
      case 5: // Pallet
        const pallets = selection.level?.pallets || [];
        return (
          <div className="flex-col" style={{ gap: 12 }}>
            <div className="grid-list">
              {pallets.map(p => (
                <button key={p.id} className="picker-item" onClick={() => { setSelection({...selection, pallet: p}); setStep(6); }}>
                  <Package size={20} className="text-primary" />
                  <div className="flex-col text-left">
                    <span className="font-bold">{p.code}</span>
                    {p.name && <span style={{fontSize: 11, opacity: 0.6}}>{p.name}</span>}
                  </div>
                  <ChevronRight size={16} className="ml-auto opacity-30" />
                </button>
              ))}
            </div>
            {!isCreating ? (
              <button className="btn btn-ghost btn-dashed w-full" onClick={() => setIsCreating(true)}>
                <Plus size={16} /> Tambah Pallet Baru
              </button>
            ) : (
              <div className="create-form fadeIn">
                <input 
                  autoFocus
                  className="form-control" 
                  placeholder="Kode Pallet..." 
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
                />
                <div className="flex gap-8 mt-12">
                  <button className="btn btn-primary btn-sm flex-1" onClick={handleCreateNew} disabled={!newCode || loading}>
                    {loading ? '...' : 'Simpan'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setIsCreating(false)}>Batal</button>
                </div>
              </div>
            )}
          </div>
        );
      case 6: // Box
        const boxes = selection.pallet?.boxes || [];
        return (
          <div className="flex-col" style={{ gap: 12 }}>
            <div className="grid-list">
              {boxes.map(b => (
                <button key={b.id} className="picker-item highlight" onClick={() => onSelect(b, selection)}>
                  <BoxIcon size={20} className="text-primary" />
                  <div className="flex-col text-left">
                    <span className="font-bold">{b.code}</span>
                    {b.name && <span style={{fontSize: 11, opacity: 0.6}}>{b.name}</span>}
                  </div>
                  <Check size={16} className="ml-auto text-primary" />
                </button>
              ))}
            </div>
            {!isCreating ? (
              <button className="btn btn-ghost btn-dashed w-full" onClick={() => setIsCreating(true)}>
                <Plus size={16} /> Tambah Box Baru
              </button>
            ) : (
              <div className="create-form fadeIn">
                <input 
                  autoFocus
                  className="form-control" 
                  placeholder="Kode Box..." 
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
                />
                <div className="flex gap-8 mt-12">
                  <button className="btn btn-primary btn-sm flex-1" onClick={handleCreateNew} disabled={!newCode || loading}>
                    {loading ? '...' : 'Simpan'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setIsCreating(false)}>Batal</button>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const getBreadcrumb = () => {
    const parts = [];
    if (selection.floor) parts.push(selection.floor.name);
    if (selection.rack) parts.push(`R${selection.rack.letter}`);
    if (selection.section) parts.push(`C${selection.section.number}`);
    if (selection.level) parts.push(`L${selection.level.number}`);
    if (selection.pallet) parts.push(selection.pallet.code);
    return parts.join(" > ");
  };

  const stepTitles = ["Pilih Lantai/Gudang", "Pilih Rak", "Pilih Seksi", "Pilih Level", "Pilih Pallet", "Pilih Box"];

  return (
    <div className="modal-overlay glass-effect" style={{zIndex: 2000}}>
      <div className="modal-premium modal-content scaleIn" style={{ maxWidth: 450 }}>
        <div className="modal-premium-header">
          <div className="flex-col">
            <h2 className="modal-title">{stepTitles[step-1]}</h2>
            {step > 1 && <p className="breadcrumb-text">{getBreadcrumb()}</p>}
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-premium-body" style={{ minHeight: 320, maxHeight: 500, overflowY: 'auto', padding: '16px 24px' }}>
          {renderContent()}
        </div>

        <div className="modal-premium-footer flex-center" style={{ justifyContent: 'space-between', padding: '16px 24px' }}>
          <div>
            {step > 1 && (
              <button className="btn btn-ghost btn-sm" onClick={handleBack}>
                <ArrowLeft size={16} /> Kembali
              </button>
            )}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.3, letterSpacing: 1 }}>STEP {step} / 6</div>
        </div>
      </div>

      <style>{`
        .grid-list { display: grid; gap: 8px; }
        .picker-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
        }
        .picker-item:hover {
          background: rgba(255,255,255,0.06);
          border-color: var(--primary);
          transform: translateX(4px);
        }
        .picker-item.highlight { border-color: var(--primary); background: rgba(99, 102, 241, 0.05); }
        .breadcrumb-text { font-size: 10px; color: var(--primary-light); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; font-weight: 700; opacity: 0.8; }
        .btn-dashed { border: 1px dashed var(--border); color: var(--text-muted); font-size: 13px; }
        .btn-dashed:hover { border-color: var(--primary); color: var(--primary-light); background: rgba(255,255,255,0.02); }
        .ml-auto { margin-left: auto; }
        .text-left { text-align: left; }
        .w-full { width: 100%; }
        .create-form { padding: 16px; background: rgba(255,255,255,0.02); border: 1px dashed var(--primary); border-radius: 12px; }
        .flex { display: flex; }
        .mt-12 { margin-top: 12px; }
        .gap-8 { gap: 8px; }
        .flex-1 { flex: 1; }
      `}</style>
    </div>
  );
}
