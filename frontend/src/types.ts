export interface ExtractedLineItem {
  item_code: string;
  description: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface ExtractedInvoice {
  vendor_name: string;
  gstin: string;
  invoice_number: string;
  invoice_date: string;
  po_number: string;
  line_items: ExtractedLineItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
}

export interface AgentTraceStep {
  step: string;
  title: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'INFO';
  detail: string;
  timestamp?: string;
}

export interface LineItemMatchResult {
  item_code: string;
  description: string;
  po_qty?: number | null;
  grn_qty?: number | null;
  inv_qty: number;
  po_price?: number | null;
  inv_price: number;
  price_variance_pct?: number | null;
  qty_status: string;
  price_status: string;
  remarks: string;
}

export interface MatchDetails {
  po_number: string;
  grn_number?: string | null;
  po_total?: number | null;
  inv_total: number;
  items: LineItemMatchResult[];
  overall_qty_match: boolean;
  overall_price_match: boolean;
}

export interface ExceptionItem {
  code: string;
  title: string;
  severity: 'CRITICAL' | 'WARNING';
  description: string;
}

export interface InvoiceListItem {
  id: number;
  invoice_number: string;
  vendor_id?: string;
  vendor_name: string;
  gstin: string;
  po_number: string;
  invoice_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'QUEUED_FOR_PAYMENT' | 'EXCEPTION_HOLD' | 'DUPLICATE_BLOCKED' | 'APPROVED_FOR_PAYMENT' | 'VENDOR_QUERY_SENT';
  exception_count: number;
  exceptions: ExceptionItem[];
  file_name?: string;
  created_at?: string;
}

export interface FullInvoiceDetail extends InvoiceListItem {
  extracted: ExtractedInvoice;
  match_details: MatchDetails;
  agent_trace: AgentTraceStep[];
  drafted_email?: string | null;
  po_master?: any;
  grn_master?: any;
}

export interface DashboardKPIs {
  total_processed: number;
  queued_for_payment: number;
  exceptions_on_hold: number;
  duplicates_blocked: number;
  approved_for_payment: number;
}

export interface SampleInvoiceMeta {
  id: string;
  file_name: string;
  title: string;
  vendor: string;
  po_number: string;
  expected_outcome: string;
  badge_color: string;
  description: string;
}

export interface OutboxItem {
  id: number;
  invoice_id?: number | null;
  invoice_number?: string | null;
  recipient_email: string;
  subject: string;
  body: string;
  dispatch_mode: string;
  message_id: string;
  sent_at: string;
}

export interface WebhookLogItem {
  id: number;
  source: string;
  sender_email?: string | null;
  subject?: string | null;
  filename?: string | null;
  invoice_id?: number | null;
  status: string;
  received_at: string;
}

export interface IntegrationStatus {
  erp_connector: {
    adapter_name: string;
    mode: string;
    status: string;
    target_endpoint: string;
    last_sync: string;
    latency_ms: number;
    supported_entities: string[];
  };
  inbound_gateway: {
    service: string;
    status: string;
    inbox_address: string;
    webhook_endpoint: string;
    total_ingested: number;
    recent_logs: WebhookLogItem[];
  };
  outbound_dispatcher: {
    service: string;
    status: string;
    dispatch_mode: string;
    smtp_host: string;
    total_dispatched: number;
    recent_outbox: OutboxItem[];
  };
}

