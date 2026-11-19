import React from 'react';
import { CheckCircle2, AlertTriangle, Info, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { MatchDetails, LineItemMatchResult } from '../types';

interface ThreeWayMatchTableProps {
  matchDetails: MatchDetails;
  invoiceTotal: number;
}

export const ThreeWayMatchTable: React.FC<ThreeWayMatchTableProps> = ({
  matchDetails,
  invoiceTotal,
}) => {
  const items = matchDetails.items || [];

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 overflow-hidden">
      <div className="p-4 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3 bg-slate-800/40">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Reconciliation Scope:
          </span>
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-blue-300">
            PO Ref: {matchDetails.po_number}
          </span>
          {matchDetails.grn_number && (
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-emerald-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {matchDetails.grn_number.includes(',') ? (
                <span>
                  Split Dock Receipts:{' '}
                  <span className="font-bold text-white">{matchDetails.grn_number}</span>{' '}
                  <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 ml-1">
                    Multi-GRN Aggregated
                  </span>
                </span>
              ) : (
                <span>
                  Dock GRN: <span className="font-bold text-white">{matchDetails.grn_number}</span>
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-slate-400">
            PO Total: <span className="font-bold text-white">₹{matchDetails.po_total ? matchDetails.po_total.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : 'N/A'}</span>
          </div>
          <div className="text-slate-400">
            Invoice Total: <span className="font-bold text-blue-400">₹{invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-2.5 px-3">Item / SKU</th>
              <th className="py-2.5 px-3">Description</th>
              <th className="py-2.5 px-3 text-center bg-slate-900/30">PO Qty</th>
              <th className="py-2.5 px-3 text-center bg-slate-900/50">GRN Rec.</th>
              <th className="py-2.5 px-3 text-center bg-blue-950/20 text-blue-300">Inv. Qty</th>
              <th className="py-2.5 px-3 text-right bg-slate-900/30">PO Price (₹)</th>
              <th className="py-2.5 px-3 text-right bg-blue-950/20 text-blue-300">Inv. Price (₹)</th>
              <th className="py-2.5 px-3 text-center">Variance</th>
              <th className="py-2.5 px-3">Audit Analysis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {items.map((item, idx) => {
              const isQtyMismatch = item.qty_status !== 'MATCH';
              const isPriceMismatch = item.price_status === 'MISMATCH';
              const isPriceTolerance = item.price_status === 'WITHIN_TOLERANCE';

              return (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    isQtyMismatch || isPriceMismatch
                      ? 'bg-rose-950/15'
                      : isPriceTolerance
                      ? 'bg-amber-950/15'
                      : 'hover:bg-slate-800/30'
                  }`}
                >
                  <td className="py-3 px-3 font-mono font-bold text-white">
                    {item.item_code}
                  </td>
                  <td className="py-3 px-3 text-slate-300 max-w-[200px] truncate" title={item.description}>
                    {item.description}
                  </td>

                  {/* PO Ordered Qty */}
                  <td className="py-3 px-3 text-center font-mono text-slate-300 bg-slate-900/20">
                    {item.po_qty !== null ? item.po_qty : '-'}
                  </td>

                  {/* GRN Received Qty */}
                  <td className={`py-3 px-3 text-center font-mono font-bold bg-slate-900/40 ${
                    isQtyMismatch ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {item.grn_qty !== null ? item.grn_qty : 'None'}
                  </td>

                  {/* Invoice Billed Qty */}
                  <td className={`py-3 px-3 text-center font-mono font-bold bg-blue-950/20 ${
                    isQtyMismatch ? 'text-rose-400' : 'text-slate-100'
                  }`}>
                    {item.inv_qty}
                  </td>

                  {/* PO Agreed Unit Price */}
                  <td className="py-3 px-3 text-right font-mono text-slate-300 bg-slate-900/20">
                    {item.po_price != null ? `₹${item.po_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                  </td>

                  {/* Invoice Billed Unit Price */}
                  <td className={`py-3 px-3 text-right font-mono font-bold bg-blue-950/20 ${
                    isPriceMismatch
                      ? 'text-rose-400'
                      : isPriceTolerance
                      ? 'text-amber-400'
                      : 'text-slate-100'
                  }`}>
                    ₹{item.inv_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>

                  {/* Variance Pct */}
                  <td className="py-3 px-3 text-center font-mono">
                    {item.price_variance_pct != null && item.price_variance_pct !== 0 ? (
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isPriceTolerance
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {item.price_variance_pct > 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {item.price_variance_pct > 0 ? `+${item.price_variance_pct}%` : `${item.price_variance_pct}%`}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">0.0%</span>
                    )}
                  </td>

                  {/* Remarks */}
                  <td className="py-3 px-3 text-[11px] leading-tight">
                    {isQtyMismatch || isPriceMismatch ? (
                      <div className="flex items-start gap-1 text-rose-300">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{item.remarks}</span>
                      </div>
                    ) : isPriceTolerance ? (
                      <div className="flex items-start gap-1 text-amber-300">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{item.remarks}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Verified match</span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
