import React, { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { api, Inventory, Supplier, Equipment, Material } from '../services/api';
import { 
  Warehouse, 
  Truck, 
  Wrench, 
  AlertTriangle, 
  Plus, 
  AlertCircle,
  X
} from 'lucide-react';

export const Materials: React.FC = () => {
  const { activeProject } = useProject();
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'equipment' | 'suppliers'>('inventory');

  // Purchase request state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number>(0);
  const [orderQty, setOrderQty] = useState(100);
  const [minReq, setMinReq] = useState(200);

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editMin, setEditMin] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResourceDetails = async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const [invList, supList, equipList, matList] = await Promise.all([
        api.resources.listInventory(activeProject.id),
        api.resources.listSuppliers(),
        api.resources.listEquipment(activeProject.id),
        api.resources.listMaterials()
      ]);
      setInventories(invList);
      setSuppliers(supList);
      setEquipments(equipList);
      setMaterials(matList);
      if (matList.length > 0) {
        setSelectedMaterialId(matList[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch site resource allocations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResourceDetails();
  }, [activeProject]);

  const handleUpdateEquipmentStatus = async (equipId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'maintenance' ? 'available' : 'maintenance';
    try {
      await api.resources.updateEquipment(equipId, { status: nextStatus });
      setEquipments(prev => prev.map(eq => eq.id === equipId ? { ...eq, status: nextStatus } : eq));
    } catch (err: any) {
      alert("Failed to update machinery log: " + err.message);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !selectedMaterialId) return;

    try {
      await api.resources.addInventory({
        project_id: activeProject.id,
        material_id: selectedMaterialId,
        quantity_available: Number(orderQty),
        min_required: Number(minReq)
      });
      setShowOrderModal(false);
      fetchResourceDetails();
    } catch (err: any) {
      alert("Failed to submit order request: " + err.message);
    }
  };

  const handleSaveEdit = async (id: number) => {
    try {
      await api.resources.updateInventory(id, {
        quantity_available: Number(editQty),
        min_required: Number(editMin)
      });
      setEditingId(null);
      fetchResourceDetails();
    } catch (err: any) {
      alert("Failed to update inventory stack: " + err.message);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-slate-400">Please select an active project to view inventory logs.</p>
      </div>
    );
  }

  // Count items with shortage
  const shortageCount = inventories.filter(item => item.quantity_available < item.min_required).length;

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Navigation tabs */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200/50 dark:border-slate-800">
          <button
            onClick={() => setActiveSubTab('inventory')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all
              ${activeSubTab === 'inventory' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}
            `}
          >
            <Warehouse size={14} />
            <span>Materials Inventory</span>
          </button>
          <button
            onClick={() => setActiveSubTab('equipment')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all
              ${activeSubTab === 'equipment' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}
            `}
          >
            <Wrench size={14} />
            <span>Machinery & Equipment</span>
          </button>
          <button
            onClick={() => setActiveSubTab('suppliers')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all
              ${activeSubTab === 'suppliers' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}
            `}
          >
            <Truck size={14} />
            <span>Supplier Roster</span>
          </button>
        </div>

        {/* Action triggers */}
        {activeSubTab === 'inventory' && (
          <button
            onClick={() => setShowOrderModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2 px-4 text-xs transition-all shadow-md shadow-brand-500/20"
          >
            <Plus size={14} />
            <span>Purchase Request</span>
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-500">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* TAB 1: Inventory Table */}
          {activeSubTab === 'inventory' && (
            <div className="space-y-6">
              
              {/* Shortage notice banner */}
              {shortageCount > 0 && (
                <div className="flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-700 dark:text-amber-400 animate-pulse">
                  <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                  <div>
                    <h4 className="font-bold">Active Material Shortage Detected</h4>
                    <p className="mt-0.5 leading-relaxed font-medium">
                      There are currently {shortageCount} items stocked below safety limits on-site. AI diagnostics predicts schedule delay risks if purchase requests are not submitted immediately.
                    </p>
                  </div>
                </div>
              )}

              {/* Table Card */}
              <div className="glass-panel rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-900">
                      <th className="px-6 py-4">Material Name</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4 text-right">Available Qty</th>
                      <th className="px-6 py-4 text-right">Safety Threshold</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-xs">
                    {inventories.map((item) => {
                      const mat = item.material;
                      const isEditing = editingId === item.id;
                      const currentQty = isEditing ? editQty : item.quantity_available;
                      const currentMin = isEditing ? editMin : item.min_required;
                      const hasShortage = currentQty < currentMin;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/25">
                          <td className="px-6 py-4.5 font-bold text-slate-900 dark:text-white">
                            {mat?.name}
                          </td>
                          <td className="px-6 py-4.5 text-slate-500 dark:text-slate-400 font-semibold">
                            {mat?.category?.toUpperCase()}
                          </td>
                          {isEditing ? (
                            <td className="px-6 py-4.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <input
                                  type="number"
                                  value={editQty}
                                  onChange={(e) => setEditQty(Number(e.target.value))}
                                  className="w-20 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-right text-xs outline-none focus:border-brand-500 font-semibold"
                                />
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{mat?.unit}</span>
                              </div>
                            </td>
                          ) : (
                            <td className="px-6 py-4.5 text-right font-semibold text-slate-800 dark:text-slate-200">
                              {item.quantity_available.toLocaleString()} {mat?.unit}
                            </td>
                          )}
                          {isEditing ? (
                            <td className="px-6 py-4.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <input
                                  type="number"
                                  value={editMin}
                                  onChange={(e) => setEditMin(Number(e.target.value))}
                                  className="w-20 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-right text-xs outline-none focus:border-brand-500 font-semibold"
                                />
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{mat?.unit}</span>
                              </div>
                            </td>
                          ) : (
                            <td className="px-6 py-4.5 text-right font-semibold text-slate-400">
                              {item.min_required.toLocaleString()} {mat?.unit}
                            </td>
                          )}
                          <td className="px-6 py-4.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold
                              ${hasShortage 
                                ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' 
                                : 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'}
                            `}>
                              {hasShortage ? 'UNDERSTOCKED' : 'HEALTHY'}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 text-right font-bold">
                            {isEditing ? (
                              <div className="flex justify-end gap-2.5">
                                <button
                                  onClick={() => handleSaveEdit(item.id)}
                                  className="text-emerald-600 dark:text-emerald-400 hover:underline"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="text-slate-400 dark:text-slate-500 hover:text-slate-655 dark:hover:text-slate-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingId(item.id);
                                  setEditQty(item.quantity_available);
                                  setEditMin(item.min_required);
                                }}
                                className="text-brand-600 dark:text-brand-400 hover:underline"
                              >
                                Edit Stock
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {inventories.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-400 font-semibold">No materials registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Equipment Logs */}
          {activeSubTab === 'equipment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {equipments.map((eq) => {
                const underMaint = eq.status === 'maintenance';
                return (
                  <div key={eq.id} className="glass-panel p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-900 flex flex-col justify-between hover:shadow-md transition-all">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{eq.name}</h4>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full
                          ${eq.status === 'available' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' :
                            eq.status === 'in_use' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' :
                            'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'}
                        `}>
                          {eq.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mb-4">
                        Category: {eq.type} | Standby: ₹{eq.daily_rate}/day
                      </p>
                    </div>

                    <button
                      onClick={() => handleUpdateEquipmentStatus(eq.id, eq.status)}
                      className={`w-full py-2 px-3 rounded-xl text-[10px] font-bold transition-all border
                        ${underMaint 
                          ? 'bg-green-600 hover:bg-green-500 text-white border-green-600 shadow-sm shadow-green-500/10' 
                          : 'bg-transparent text-red-500 border-red-500/20 hover:bg-red-500/5'}
                      `}
                    >
                      {underMaint ? 'Return to Service' : 'Flag Maintenance'}
                    </button>
                  </div>
                );
              })}
              {equipments.length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-400 font-semibold">No equipment registered on site.</div>
              )}
            </div>
          )}

          {/* TAB 3: Suppliers */}
          {activeSubTab === 'suppliers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {suppliers.map((s) => (
                <div key={s.id} className="glass-panel p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-900 flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">{s.name}</h4>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Rep: {s.contact_name}</span>
                    <div className="mt-4 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      <div>Email: <span className="font-semibold text-slate-800 dark:text-slate-200">{s.email}</span></div>
                      <div>Phone: <span className="font-semibold text-slate-800 dark:text-slate-200">{s.phone}</span></div>
                    </div>
                  </div>
                </div>
              ))}
              {suppliers.length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-400 font-semibold">No suppliers listed.</div>
              )}
            </div>
          )}
        </>
      )}

      {/* ORDER MODAL */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-2xl relative">
            <button 
              onClick={() => setShowOrderModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={20} />
            </button>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Simulate Purchase Order</h3>
            
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Select Material
                </label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-xs outline-none cursor-pointer"
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.name} (₹{m.unit_price}/{m.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Order Quantity
                </label>
                <input
                  type="number"
                  value={orderQty}
                  onChange={(e) => setOrderQty(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-xs outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Minimum Safety Stock Limit
                </label>
                <input
                  type="number"
                  value={minReq}
                  onChange={(e) => setMinReq(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-xs outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-4 text-xs transition-all shadow-lg shadow-brand-500/20"
              >
                Submit Purchase Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
