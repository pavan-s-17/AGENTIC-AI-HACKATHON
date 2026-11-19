import React, { useState } from 'react';
import { Mail, Copy, Check, Send, AlertTriangle, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { ExceptionItem } from '../types';

interface VendorEmailCardProps {
  invoiceId?: number;
  draftedEmail: string;
  exceptions: ExceptionItem[];
  vendorName: string;
  invoiceNumber: string;
  onDispatched?: () => void;
}

export const VendorEmailCard: React.FC<VendorEmailCardProps> = ({
  invoiceId,
  draftedEmail,
  exceptions,
  vendorName,
  invoiceNumber,
  onDispatched,
}) => {
  const [copied, setCopied] = useState(false);
  const [emailText, setEmailText] = useState(draftedEmail);

  // Guess recipient email based on vendor name or default to commercial@...
  const defaultRecipient = `${vendorName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}@vendor-billing.in`;
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipient);
  const [subject, setSubject] = useState(`Action Required: Discrepancy Notice for Invoice #${invoiceNumber}`);

  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{
    message_id: string;
    dispatch_mode: string;
    sent_at: string;
  } | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDispatch = async () => {
    if (!invoiceId) {
      // Fallback simulation if no invoiceId provided
      setDispatchResult({
        message_id: `<SIM-${Date.now()}@invoiceflow.corp>`,
        dispatch_mode: 'ENTERPRISE_OUTBOX_SIMULATED',
        sent_at: new Date().toISOString(),
      });
      onDispatched?.();
      return;
    }

    setIsDispatching(true);
    setDispatchError(null);

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: recipientEmail,
          subject: subject,
          body: emailText,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to dispatch email');
      }

      const data = await res.json();
      setDispatchResult({
        message_id: data.message_id,
        dispatch_mode: data.dispatch_mode,
        sent_at: data.sent_at,
      });

      onDispatched?.();
    } catch (err: any) {
      setDispatchError(err.message || 'Error dispatching email');
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Plain-English exception reasons block */}
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
        <div className="flex items-center gap-2 mb-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Active AP Discrepancies Requiring Vendor Clarification ({exceptions.length})</span>
        </div>
        <ul className="space-y-2 mt-2">
          {exceptions.map((exc, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-rose-200">
              <span className="font-bold text-rose-400 mt-0.5">•</span>
              <div>
                <span className="font-semibold text-rose-100">{exc.title}:</span>{' '}
                <span>{exc.description}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Drafted Email Container */}
      <div className="rounded-xl border border-slate-700/80 bg-slate-900/80 overflow-hidden shadow-lg">
        <div className="p-3.5 bg-slate-800/80 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                AI-Drafted Vendor Dispute / Clarification Email
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h4>
              <p className="text-[11px] text-slate-400">
                Generated with specific PO, GRN receiving variances and polite reconciliation request
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-all hover:scale-[1.02]"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            <button
              onClick={handleDispatch}
              disabled={isDispatching}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all hover:scale-[1.02] disabled:opacity-50 shadow-md shadow-blue-900/20"
            >
              {isDispatching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{isDispatching ? 'Dispatching...' : 'Dispatch Query to Vendor'}</span>
            </button>
          </div>
        </div>

        {/* Live Dispatched Status Banner */}
        {dispatchResult && (
          <div className="p-3 bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Dispatched successfully to <strong className="text-white">{recipientEmail}</strong> via{' '}
                <span className="font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-200">
                  {dispatchResult.dispatch_mode}
                </span>
              </span>
            </div>
            <div className="text-[11px] font-mono text-emerald-300/80">
              Ref: {dispatchResult.message_id}
            </div>
          </div>
        )}

        {dispatchError && (
          <div className="p-3 bg-rose-500/20 border-b border-rose-500/40 text-rose-300 text-xs">
            {dispatchError}
          </div>
        )}

        {/* Recipient & Subject Header Inputs */}
        <div className="p-3 bg-slate-950/50 border-b border-slate-800 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-16 font-semibold text-slate-400 shrink-0">To:</span>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
              placeholder="vendor.contact@company.com"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-16 font-semibold text-slate-400 shrink-0">Subject:</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Email Body */}
        <div className="p-4">
          <textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            rows={12}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-blue-500 transition-colors resize-y"
          />
        </div>
      </div>
    </div>
  );
};
