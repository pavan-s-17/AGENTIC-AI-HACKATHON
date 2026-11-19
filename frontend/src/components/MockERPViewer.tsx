import React, { useState, useEffect } from 'react';
import { Database, Truck, ShoppingCart, Users, RefreshCw, FileSignature, ShieldCheck } from 'lucide-react';

export const MockERPViewer: React.FC = () => {
  const [data, setData] = useState<{ vendors: any[]; purchase_orders: any[]; goods_receipts: any[]; price_amendments?: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'pos' | 'grns' | 'vendors' | 'amendments'>('pos');

  const fetchERPData = () => {
    setLoading(true);
    fetch('/api/erp/summary')
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchERPData();
  }, []);

  return (
    <div className="rounded-2xl bg-slate-800/60 border border-slate-700/80 backdrop-blur-xl shadow-xl overflow-hidden p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Mock ERP Database Viewer (SQLite: <code className="text-xs text-purple-300">erp_mock.db</code>)
            </h3>
            <p className="text-xs text-slate-400">
              Ground-truth procurement, dock warehouse receipts, and authorized price amendments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchERPData}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh ERP Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-700/80 pb-2">
        <button
          onClick={() => setActiveSubTab('pos')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'pos'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Purchase Orders ({data?.purchase_orders.length || 0})
        </button>
        <button
          onClick={() => setActiveSubTab('grns')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'grns'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          Goods Receipts / GRNs ({data?.goods_receipts.length || 0})
        </button>
        <button
          onClick={() => setActiveSubTab('amendments')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'amendments'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSignature className="w-3.5 h-3.5 text-cyan-300" />
          Price Amendments ({data?.price_amendments?.length || 0})
        </button>
        <button
          onClick={() => setActiveSubTab('vendors')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'vendors'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Master Vendors ({data?.vendors.length || 0})
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs font-mono text-slate-400">Loading ERP records...</div>
      ) : (
        <div>
          {/* Purchase Orders */}
          {activeSubTab === 'pos' && (
            <div className="space-y-4">
              {data?.purchase_orders.map((po) => (
                <div key={po.po_number} className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-blue-400">{po.po_number}</span>
                      <span className="text-xs text-slate-400 font-mono">Vendor: {po.vendor_id}</span>
                      <span className="text-xs text-slate-400 font-mono">Date: {po.po_date}</span>
                    </div>
                    <div className="font-mono font-bold text-xs text-emerald-400">
                      Total: ₹{po.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-800">
                          <th className="py-1 px-2">Item Code</th>
                          <th className="py-1 px-2">Description</th>
                          <th className="py-1 px-2 text-right">Ordered Qty</th>
                          <th className="py-1 px-2 text-right">Agreed Unit Price (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-slate-300">
                        {po.line_items?.map((it: any, idx: number) => (
                          <tr key={idx}>
                            <td className="py-1.5 px-2 font-bold text-white">{it.item_code}</td>
                            <td className="py-1.5 px-2">{it.description}</td>
                            <td className="py-1.5 px-2 text-right">{it.ordered_qty}</td>
                            <td className="py-1.5 px-2 text-right">₹{it.unit_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* GRNs */}
          {activeSubTab === 'grns' && (
            <div className="space-y-4">
              {data?.goods_receipts.map((grn) => {
                const isShortDelivery = grn.grn_number === 'GRN-2024-003';
                return (
                  <div key={grn.grn_number} className={`rounded-xl border p-4 ${
                    isShortDelivery ? 'border-rose-500/40 bg-rose-950/10' : 'border-slate-700/60 bg-slate-900/50'
                  }`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm text-emerald-400">{grn.grn_number}</span>
                        <span className="text-xs text-slate-400 font-mono">Linked PO: {grn.po_number}</span>
                        <span className="text-xs text-slate-400 font-mono">Dock Received: {grn.received_date}</span>
                      </div>
                      {isShortDelivery && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          Short Delivery Recorded on Dock
                        </span>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-800">
                            <th className="py-1 px-2">Item Code</th>
                            <th className="py-1 px-2 text-right">Dock Received Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40 text-slate-300">
                          {grn.line_items?.map((it: any, idx: number) => (
                            <tr key={idx}>
                              <td className="py-1.5 px-2 font-bold text-white">{it.item_code}</td>
                              <td className="py-1.5 px-2 text-right font-bold text-emerald-400">{it.received_qty} units</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Price Amendments */}
          {activeSubTab === 'amendments' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-cyan-200">
                <strong>Autonomous Investigation Target:</strong> When the agent detects an invoice unit price exceeding standard tolerance limits, it autonomously calls <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300">check_price_amendments</code> to verify if executive pre-approval exists.
              </div>

              {(data?.price_amendments && data.price_amendments.length > 0) ? (
                data.price_amendments.map((pa) => (
                  <div key={pa.id} className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm text-cyan-400">PO: {pa.po_number}</span>
                        <span className="font-mono text-xs text-white font-semibold">Item: {pa.item_code}</span>
                        <span className="font-mono text-xs text-slate-400">Vendor: {pa.vendor_id}</span>
                      </div>
                      <div className="font-mono font-bold text-xs text-emerald-400">
                        Pre-Approved Price: ₹{pa.approved_unit_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="space-y-1 text-xs font-mono text-slate-300">
                      <div>Authorized By: <span className="text-white font-semibold">{pa.approved_by}</span></div>
                      <div>Reference Note: <span className="text-slate-400">{pa.reference_note}</span></div>
                      <div>Validity: <span className="text-amber-300">{pa.valid_until}</span></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">No price amendments registered.</div>
              )}
            </div>
          )}

          {/* Vendors */}
          {activeSubTab === 'vendors' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.vendors.map((v) => (
                <div key={v.vendor_id} className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono font-bold text-sm text-white">{v.name}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {v.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs font-mono text-slate-400">
                    <div>Vendor ID: <span className="text-slate-200">{v.vendor_id}</span></div>
                    <div>Master GSTIN: <span className="text-blue-300">{v.gstin}</span></div>
                    <div>AP Billing Email: <span className="text-slate-300">{v.email}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
