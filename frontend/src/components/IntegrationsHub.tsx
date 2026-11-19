import React, { useState, useEffect } from 'react';
import {
  Server,
  Mail,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  ArrowRight,
  Database,
  Radio,
  FileCheck,
  ShieldCheck,
  Cpu,
  Clock,
  Sparkles,
  Inbox,
  Loader2,
} from 'lucide-react';
import { IntegrationStatus, WebhookLogItem, OutboxItem } from '../types';

export const IntegrationsHub: React.FC = () => {
  const [statusData, setStatusData] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Simulation state
  const [simVendorEmail, setSimVendorEmail] = useState('sales@tatasteel-industrial.in');
  const [simSubject, setSimSubject] = useState('Tax Invoice & Delivery Challan Submission for PO-2024-001');
  const [simFilename, setSimFilename] = useState('sample_1_clean_match.pdf');
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/integrations/status');
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
      }
    } catch (err) {
      console.error('Failed to fetch integration status:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  const handleSimulateInboundEmail = async () => {
    setSimulating(true);
    setSimulationResult(null);
    setSimulationError(null);

    try {
      const res = await fetch('/api/webhooks/inbound-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sample_filename: simFilename,
          sender_email: simVendorEmail,
          subject: simSubject,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Webhook call failed');
      }

      const data = await res.json();
      setSimulationResult(
        `Invoice #${data.invoice_number} successfully ingested via email webhook! Status: ${data.status} (ID: ${data.id})`
      );
      fetchStatus();
    } catch (err: any) {
      setSimulationError(err.message || 'Error triggering simulated inbound email webhook');
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-xs font-mono">Querying live enterprise adapter & gateway status...</p>
      </div>
    );
  }

  const erp = statusData?.erp_connector;
  const inbound = statusData?.inbound_gateway;
  const outbound = statusData?.outbound_dispatcher;

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 shadow-inner">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Enterprise Integration Hub
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LIVE CONNECTORS ACTIVE
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Decoupled ERP Adapters, Inbound Email/Webhook Ingestion & Outbound Vendor Outbox Dispatch
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-all hover:scale-[1.02] disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {/* Grid: 3 Pillars (ERP Adapter, Inbound Gateway, Outbound Dispatcher) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pillar 1: Pluggable ERP Adapter */}
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-5 backdrop-blur-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
                <Database className="w-4 h-4" />
                <span>ERP Data Adapter</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {erp?.mode || 'SQLITE'}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white mb-1">
              {erp?.adapter_name || 'Pluggable ERP Connector'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Decoupled Adapter/Strategy pattern providing 3-way match ground truth from ERP/DB.
            </p>

            <div className="space-y-2 text-xs font-mono bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="text-emerald-400 font-semibold">{erp?.status || 'CONNECTED'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target:</span>
                <span className="text-slate-200 truncate max-w-[150px]">{erp?.target_endpoint}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Avg Latency:</span>
                <span className="text-sky-300">{erp?.latency_ms} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last Synced:</span>
                <span className="text-slate-400">{new Date(erp?.last_sync || '').toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Connected Data Entities:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(erp?.supported_entities || [
                  'Vendors',
                  'Purchase Orders',
                  'Goods Receipts (Multi-GRN)',
                  'Price Amendments',
                  'Duplicate Register',
                ]).map((ent, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-slate-300"
                  >
                    {ent}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
            <span className="text-blue-400 font-semibold">Config:</span> Set <code className="text-slate-200">ERP_MODE=webhook</code> to hot-swap to SAP S/4HANA or NetSuite REST APIs.
          </div>
        </div>

        {/* Pillar 2: Inbound Email Gateway */}
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-5 backdrop-blur-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Inbox className="w-4 h-4" />
                <span>Inbound AP Intake</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                WEBHOOK ACTIVE
              </span>
            </div>

            <h3 className="text-sm font-bold text-white mb-1">
              AP Email Ingestion Gateway
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Ingests vendor invoice attachments from email or supplier portal webhooks into AP queue.
            </p>

            <div className="space-y-2 text-xs font-mono bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">AP Inbox:</span>
                <span className="text-slate-200">{inbound?.inbox_address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Webhook URL:</span>
                <span className="text-sky-300">{inbound?.webhook_endpoint}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Inbound Parser:</span>
                <span className="text-emerald-400">Multimodal Agent + EXIF Preprocessor</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Ingested:</span>
                <span className="text-white font-bold">{inbound?.total_ingested || 0} Invoices</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
            <span className="text-emerald-400 font-semibold">Integrates with:</span> SendGrid Inbound Parse, AWS SES, or Microsoft 365 Webhooks.
          </div>
        </div>

        {/* Pillar 3: Outbound Vendor Dispatcher */}
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-5 backdrop-blur-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400">
                <Send className="w-4 h-4" />
                <span>Outbound Dispatcher</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {outbound?.dispatch_mode || 'ENTERPRISE_OUTBOX'}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white mb-1">
              Vendor Query & Dispute Dispatch
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Dispatches discrepancy notices with full audit trails and message ID generation.
            </p>

            <div className="space-y-2 text-xs font-mono bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Dispatch Mode:</span>
                <span className="text-purple-300 font-semibold">{outbound?.dispatch_mode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SMTP Host:</span>
                <span className="text-slate-300">{outbound?.smtp_host}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Audit Logging:</span>
                <span className="text-emerald-400">Persistent (email_outbox)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Queries Sent:</span>
                <span className="text-white font-bold">{outbound?.total_dispatched || 0} Emails</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
            <span className="text-purple-400 font-semibold">Live Mode:</span> Set <code className="text-slate-200">SMTP_HOST</code> to route through production email relay.
          </div>
        </div>
      </div>

      {/* Interactive Webhook Simulator */}
      <div className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-5 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Interactive Inbound Webhook Test Console
            </h3>
            <p className="text-xs text-slate-400">
              Simulate an incoming email notification with PDF attachment received at <code className="text-blue-300">POST /api/webhooks/inbound-email</code>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Select Invoice Sample:</label>
            <select
              value={simFilename}
              onChange={(e) => setSimFilename(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="sample_1_clean_match.pdf">sample_1_clean_match.pdf (Clean 3-Way)</option>
              <option value="sample_2_tolerance_match.pdf">sample_2_tolerance_match.pdf (Within Tolerance)</option>
              <option value="sample_3_quantity_mismatch.pdf">sample_3_quantity_mismatch.pdf (Qty Shortage)</option>
              <option value="sample_4_price_error.pdf">sample_4_price_error.pdf (Price Discrepancy)</option>
              <option value="sample_5_duplicate.pdf">sample_5_duplicate.pdf (Duplicate Submission)</option>
              <option value="sample_6_messy_scan.jpg">sample_6_messy_scan.jpg (Split-GRN Tilted Scan)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Sender Email:</label>
            <input
              type="email"
              value={simVendorEmail}
              onChange={(e) => setSimVendorEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Subject Header:</label>
            <input
              type="text"
              value={simSubject}
              onChange={(e) => setSimSubject(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-[11px] text-slate-400">
            Endpoint accepts standard <code className="text-slate-300">multipart/form-data</code> with attached file or JSON simulation payloads.
          </p>
          <button
            onClick={handleSimulateInboundEmail}
            disabled={simulating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all hover:scale-[1.02] disabled:opacity-50 shadow-md shadow-blue-900/30"
          >
            {simulating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Trigger Inbound Webhook
          </button>
        </div>

        {simulationResult && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{simulationResult}</span>
          </div>
        )}

        {simulationError && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{simulationError}</span>
          </div>
        )}
      </div>

      {/* Two Tables: Inbound Gateway Logs & Outbound Dispatcher Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inbound Webhook Logs */}
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700/80 overflow-hidden shadow-lg flex flex-col">
          <div className="p-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Inbox className="w-4 h-4 text-emerald-400" />
              Inbound Webhook Activity Log ({inbound?.recent_logs?.length || 0})
            </h4>
            <span className="text-[10px] font-mono text-slate-400">Live Intake</span>
          </div>

          <div className="p-0 overflow-x-auto flex-1 max-h-72">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700/60 bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Sender</th>
                  <th className="py-2.5 px-3">Attachment</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {(!inbound?.recent_logs || inbound.recent_logs.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 text-xs font-sans">
                      No inbound webhooks received yet. Use the console above to simulate an ingestion!
                    </td>
                  </tr>
                ) : (
                  inbound.recent_logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-700/20">
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.received_at).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 truncate max-w-[140px]" title={log.sender_email || ''}>
                        {log.sender_email || 'API Client'}
                      </td>
                      <td className="py-2.5 px-3 text-blue-300 truncate max-w-[130px]" title={log.filename || ''}>
                        {log.filename || 'payload.pdf'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Outbound Vendor Outbox Log */}
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700/80 overflow-hidden shadow-lg flex flex-col">
          <div className="p-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-400" />
              Vendor Query Outbox History ({outbound?.recent_outbox?.length || 0})
            </h4>
            <span className="text-[10px] font-mono text-slate-400">Outbox Audit</span>
          </div>

          <div className="p-0 overflow-x-auto flex-1 max-h-72">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700/60 bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">Sent Time</th>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3 text-center">Dispatch Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {(!outbound?.recent_outbox || outbound.recent_outbox.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 text-xs font-sans">
                      No vendor queries dispatched yet. Open any exception invoice and click "Dispatch Query to Vendor".
                    </td>
                  </tr>
                ) : (
                  outbound.recent_outbox.map((msg) => (
                    <tr key={msg.id} className="hover:bg-slate-700/20">
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(msg.sent_at).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 text-white font-bold">
                        {msg.invoice_number || 'INV-EXC'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 truncate max-w-[140px]" title={msg.recipient_email}>
                        {msg.recipient_email}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {msg.dispatch_mode}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
