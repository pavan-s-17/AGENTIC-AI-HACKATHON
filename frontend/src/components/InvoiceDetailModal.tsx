import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldAlert, BadgeCheck, MailCheck, FileText, Split, Terminal, Mail, Code, ThumbsUp, Loader2 } from 'lucide-react';
import { FullInvoiceDetail } from '../types';
import { ThreeWayMatchTable } from './ThreeWayMatchTable';
import { AgentTraceView } from './AgentTraceView';
import { VendorEmailCard } from './VendorEmailCard';

interface InvoiceDetailModalProps {
  invoiceId: number;
  onClose: () => void;
  onStatusChanged: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoiceId,
  onClose,
  onStatusChanged,
}) => {
  const [detail, setDetail] = useState<FullInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'match' | 'trace' | 'email' | 'raw'>('match');
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/invoices/${invoiceId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Invoice not found');
        return res.json();
      })
      .then((data) => {
        setDetail(data);
        if (data.status === 'EXCEPTION_HOLD' && data.drafted_email) {
          // If there's an exception, default to showing the match or email
          setActiveTab('match');
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const handleApprove = async () => {
    if (!detail) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/invoices/${detail.id}/approve`, {
        method: 'POST',
      });
      if (res.ok) {
        setDetail((prev) => (prev ? { ...prev, status: 'APPROVED_FOR_PAYMENT' } : null));
        onStatusChanged();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setApproving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'QUEUED_FOR_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4" />
            Queued for Payment
          </span>
        );
      case 'EXCEPTION_HOLD':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-4 h-4" />
            Exception Hold
          </span>
        );
      case 'DUPLICATE_BLOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <ShieldAlert className="w-4 h-4" />
            Duplicate Blocked
          </span>
        );
      case 'APPROVED_FOR_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <BadgeCheck className="w-4 h-4" />
            Approved by AP Lead
          </span>
        );
      case 'VENDOR_QUERY_SENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <MailCheck className="w-4 h-4" />
            Vendor Query Dispatched
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-xs font-mono text-slate-400">Loading Three-Way Match records...</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 bg-slate-800/80 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-white font-mono">
                  Invoice #{detail.invoice_number}
                </h3>
                {getStatusBadge(detail.status)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Vendor: <span className="text-slate-200 font-semibold">{detail.vendor_name}</span> (GSTIN: {detail.gstin}) • PO: <span className="font-mono text-blue-300">{detail.po_number}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {detail.status !== 'APPROVED_FOR_PAYMENT' && (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-900/20 hover:scale-[1.02] disabled:opacity-50"
              >
                {approving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ThumbsUp className="w-4 h-4" />
                )}
                Approve for Payment
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 gap-2">
          <button
            onClick={() => setActiveTab('match')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'match'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Split className="w-4 h-4" />
            Three-Way Match
          </button>
          <button
            onClick={() => setActiveTab('trace')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'trace'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Agent Reasoning Trace
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
              {detail.agent_trace?.length || 0}
            </span>
          </button>
          {detail.drafted_email && (
            <button
              onClick={() => setActiveTab('email')}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'email'
                  ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="w-4 h-4" />
              Vendor Dispute Email
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
                {detail.exceptions?.length || 0} Issues
              </span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('raw')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'raw'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4" />
            Extracted JSON
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'match' && (
            <div className="space-y-6">
              <ThreeWayMatchTable
                matchDetails={detail.match_details}
                invoiceTotal={detail.total_amount}
              />

              {/* Master ERP Ground Truth Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Underlying PO Record ({detail.po_number})
                  </h4>
                  {detail.po_master ? (
                    <div className="space-y-1 text-xs font-mono text-slate-300">
                      <div>Date Issued: {detail.po_master.po_date}</div>
                      <div>Status: {detail.po_master.status}</div>
                      <div>Approved Amount: ₹{detail.po_master.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No PO record linked in mock ERP.</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Goods Receipt Dock Record (GRN)
                  </h4>
                  {detail.grn_master ? (
                    <div className="space-y-1 text-xs font-mono text-slate-300">
                      <div>GRN Number: {detail.grn_master.grn_number}</div>
                      <div>Dock Receipt Date: {detail.grn_master.received_date}</div>
                      <div>Items Received: {detail.grn_master.items?.map((it: any) => `${it.item_code} (${it.received_qty} units)`).join(', ')}</div>
                    </div>
                  ) : (
                    <p className="text-xs text-rose-400">No Goods Receipt Note found. Warehouse receipt unverified.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trace' && (
            <AgentTraceView trace={detail.agent_trace || []} />
          )}

          {activeTab === 'email' && (
            <VendorEmailCard
              invoiceId={detail.id}
              draftedEmail={detail.drafted_email || ''}
              exceptions={detail.exceptions || []}
              vendorName={detail.vendor_name}
              invoiceNumber={detail.invoice_number}
              onDispatched={() => {
                setDetail((prev) => (prev ? { ...prev, status: 'VENDOR_QUERY_SENT' } : null));
                onStatusChanged();
              }}
            />
          )}

          {activeTab === 'raw' && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
              <pre className="text-xs font-mono text-blue-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(detail.extracted, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
