import React, { useState } from 'react';
import { FileText, ArrowRight, AlertTriangle, CheckCircle2, ShieldAlert, BadgeCheck, MailCheck, Search, Filter } from 'lucide-react';
import { InvoiceListItem } from '../types';

interface InvoiceTableProps {
  invoices: InvoiceListItem[];
  onSelectInvoice: (invoiceId: number) => void;
  selectedId: number | null;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  onSelectInvoice,
  selectedId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.gstin.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'QUEUED_FOR_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Queued for Payment
          </span>
        );
      case 'EXCEPTION_HOLD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            Exception Hold
          </span>
        );
      case 'DUPLICATE_BLOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            Duplicate Blocked
          </span>
        );
      case 'APPROVED_FOR_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <BadgeCheck className="w-3.5 h-3.5" />
            Approved by AP
          </span>
        );
      case 'VENDOR_QUERY_SENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <MailCheck className="w-3.5 h-3.5" />
            Vendor Query Sent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl bg-slate-800/60 border border-slate-700/80 backdrop-blur-xl shadow-xl overflow-hidden">
      {/* Table header toolbar */}
      <div className="p-5 border-b border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            Accounts Payable Queue
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-700 text-slate-300">
              {filteredInvoices.length} Invoices
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any row to open the complete Three-Way Match breakdown, Agent Trace & Email draft
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vendor, invoice, PO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Status filter dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="QUEUED_FOR_PAYMENT">Queued for Payment</option>
              <option value="EXCEPTION_HOLD">Exception Hold</option>
              <option value="VENDOR_QUERY_SENT">Vendor Query Sent</option>
              <option value="DUPLICATE_BLOCKED">Duplicate Blocked</option>
              <option value="APPROVED_FOR_PAYMENT">Approved by AP</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-700/60 bg-slate-900/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4">Invoice #</th>
              <th className="py-3 px-4">Vendor & GSTIN</th>
              <th className="py-3 px-4">PO Ref</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4 text-right">Total Amount (₹)</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Discrepancies</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40 text-xs">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="w-8 h-8 text-slate-600" />
                    <p className="font-medium text-slate-300">No invoices in the queue yet</p>
                    <p className="text-xs text-slate-500">
                      Upload an invoice above or run one of the 1-Click Benchmark Scenarios to start
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const isSelected = selectedId === inv.id;
                return (
                  <tr
                    key={inv.id}
                    onClick={() => onSelectInvoice(inv.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-600/15 border-l-4 border-l-blue-500'
                        : 'hover:bg-slate-700/30'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{inv.vendor_name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{inv.gstin}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-blue-300">
                      {inv.po_number}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      {inv.invoice_date}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      ₹{inv.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {inv.exception_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          <AlertTriangle className="w-3 h-3" />
                          {inv.exception_count} flagged
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-400">
                          Clean (0)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectInvoice(inv.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-700/80 hover:bg-blue-600 text-slate-200 hover:text-white transition-all text-xs font-medium"
                      >
                        Inspect
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
