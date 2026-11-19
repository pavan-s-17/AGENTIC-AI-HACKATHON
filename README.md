# InvoiceFlow — Accounts Payable Three-Way Match Agent
### *Autonomous Tool-Calling AP ReAct Agent for Enterprise ERPs*

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev)
[![Gemini 2.5 Flash](https://img.shields.io/badge/Model-Gemini%202.5%20Flash-orange.svg)](https://ai.google.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com)

**InvoiceFlow** is an autonomous Accounts Payable (AP) AI Agent designed for Indian B2B enterprises. Powered by a multi-turn **ReAct Tool-Calling loop**, the agent autonomously investigates invoices by invoking deterministic ERP tools—verifying master data, auditing arithmetic, querying purchase orders, aggregating split warehouse dock receipts (GRNs), and proactively checking executive price amendments before issuing payment decisions.

When discrepancies occur (such as dock short-deliveries, unauthorized price hikes, arithmetic errors, or duplicate billing), InvoiceFlow halts payment and **automatically drafts a courteous, highly specific vendor dispute email** quoting the exact line-item variances.

---

## 🤖 True Autonomous Tool-Calling Architecture

Rather than executing a hardcoded linear sequence, InvoiceFlow equips `gemini-2.5-flash` with 5 deterministic ERP tools:

```
[ Multimodal Invoice PDF/Image ]
               │
               ▼
   [ Gemini 2.5 Flash Agent ] ◄────────────────────────────────────────┐
               │                                                       │
               ├─► Tool: lookup_vendor(name, gstin) ───────────────────┤
               ├─► Tool: check_duplicate_invoices(...) ────────────────┤
               ├─► Tool: verify_invoice_math(lines, ...) ──────────────┤
               ├─► Tool: fetch_po_and_grn_totals(po_number) ───────────┤
               └─► Tool: check_price_amendments(po, sku) ──────────────┘
                                                                       │ (Observations)
                                                                       ▼
                                                    [ Final AP Decision & Trace ]
```

### The 5 Native ERP Tools (`backend/erp_tools.py`)
1. **`lookup_vendor(vendor_name, gstin)`**: Performs exact 15-character Indian GSTIN lookup against the vendor master, with fuzzy name fallback.
2. **`check_duplicate_invoices(vendor_id, invoice_number, total_amount, invoice_date)`**: Audits against the ERP ledger for exact and soft duplicate billing.
3. **`verify_invoice_math(line_items, subtotal, tax_amount, total_amount)`**: Programmatically audits line totals ($qty \times price$), subtotal, and tax ($subtotal + tax = total$), eliminating LLM mental math errors.
4. **`fetch_po_and_grn_totals(po_number)`**: Retrieves PO contract terms and **aggregates received quantities across multiple/split GRN shipments** linked to the same PO.
5. **`check_price_amendments(vendor_id, po_number, item_code)`**: Proactively investigates whether an uncontracted price variance was pre-authorized by an executive (e.g., CTO/VP amendment) before raising a false-alarm exception.

---

## Key Features

1. **Autonomous ReAct Agent Loop:** Multi-turn tool execution loop logging each tool invocation and observation into the UI audit trace.
2. **Zero-Config Fallback Mode:** Works immediately out-of-the-box even without a `GEMINI_API_KEY` by running the deterministic tool pipeline.
3. **Pluggable Enterprise ERP Adapter Pattern (`backend/erp_adapters.py`):** Strategy pattern supporting instant hot-swapping between `SQLiteMockERPAdapter` and `WebhookRESTERPAdapter` (for SAP S/4HANA, NetSuite, or Tally Prime APIs).
4. **Inbound AP Email & Webhook Gateway:** Automatic ingestion of vendor attachments via `POST /api/webhooks/inbound-email` with interactive test console and audit logging.
5. **Outbound Vendor Dispute Dispatcher:** Dispatches itemized clarification notices via `SMTP_LIVE` or `ENTERPRISE_OUTBOX_SIMULATED`, updates status to `VENDOR_QUERY_SENT`, and records audit history.
6. **Multi-Page & Noisy Document Preprocessor (`backend/doc_preprocessor.py`):** Auto-corrects EXIF orientation, applies dynamic contrast normalization, and sharpens blurry scans before multimodal ingestion.
7. **Split Delivery Aggregation:** Handles partial/staggered shipments by summing dock receipts across multiple GRNs for a single PO (e.g. `GRN-2024-005A` + `GRN-2024-005B`).
8. **1-Click Benchmark Scenarios:** 6 pre-generated Indian B2B sample invoices (PDFs and warehouse scan images) for instantaneous evaluation.

---

## 6 Benchmark Scenarios Included

| Scenario | Invoice # | Linked PO | Ground Truth ERP Condition | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **1. Clean Match** | `INV-2024-001` | `PO-2024-001` (Tata Steel) | 50 units ordered, 50 units received on dock (`GRN-2024-001`). Exact price match. | `QUEUED_FOR_PAYMENT` |
| **2. Within-Tolerance Match** | `INV-2024-002` | `PO-2024-002` (Infosys Hardware) | 10 units received. Invoice price ₹65,800 vs PO ₹65,000 (+1.23% variance, within $\pm 2\%$ limit). | `QUEUED_FOR_PAYMENT` |
| **3. Quantity Mismatch (Short Delivery)** | `INV-2024-003` | `PO-2024-003` (BHEL) | PO ordered 100 units. Dock receipt (`GRN-2024-003`) recorded **only 75 units** accepted. Invoice bills for 100 units! | `EXCEPTION_HOLD` (Dispute email drafted) |
| **4. Price Hike & Math Discrepancy** | `INV-2024-004` | `PO-2024-004` (Reliance Packaging) | PO price is ₹450, invoice charges ₹540 (+20% unapproved escalation) + ₹10,000 math discrepancy. Agent calls `check_price_amendments`, confirms no approval, and halts payment. | `EXCEPTION_HOLD` (Dispute email drafted) |
| **5. Duplicate Detection** | `INV-2024-001` | `PO-2024-001` (Tata Steel) | Re-submission of an existing invoice already in ledger. | `DUPLICATE_BLOCKED` |
| **6. Messy Scan + Split GRN** | `INV-2024-005` | `PO-2024-005` (Tata Steel) | Tilted/noisy warehouse scan image. 40 units received across **split receipts** (`GRN-2024-005A`: 25 + `GRN-2024-005B`: 15 = 40). Agent pre-processes image, aggregates split GRNs, and clears match! | `QUEUED_FOR_PAYMENT` |

---

## 🔄 GitHub Auto-Sync Setup

InvoiceFlow comes preconfigured with real-time GitHub synchronization to keep your local workspace and remote repository (`https://github.com/pavan-s-17/AGENTIC-AI-HACKATHON.git`) perfectly aligned:

### 1. Git `post-commit` Hook
Located at `.git/hooks/post-commit`, this hook automatically pushes every local commit (whether created via terminal or Antigravity agents) directly to `origin main`:
```sh
#!/bin/sh
git push origin main
```

### 2. Continuous Auto-Sync Watcher (`sync.ps1`)
The root `sync.ps1` script continuously polls every 20 seconds. It pulls any remote team updates first (`git pull --rebase origin main`), detects any newly added or modified local files, creates an automatic commit with an ISO timestamp, and pushes them to GitHub.

To run the continuous sync watcher in a background terminal tab:
```powershell
.\sync.ps1
```

---

## Project Structure

```
├── .gitignore                      # Git ignore for node_modules, .env, build, and temporary files
├── sync.ps1                        # 20-second continuous Git auto-sync watcher
├── backend/
│   ├── doc_preprocessor.py         # Image deskew/autocontrast & multi-page PDF inspector
│   ├── erp_adapters.py             # Pluggable Strategy pattern (SQLite & Webhook REST ERPs)
│   ├── erp_tools.py                # 5 Deterministic ERP tools for Gemini Function Calling
│   ├── database.py                 # SQLite schema, price_amendments, split GRNs, outbox & logs
│   ├── models.py                   # Pydantic models for extracted data & 3-way match
│   ├── agent.py                    # Autonomous ReAct agent loop + zero-config fallback
│   ├── main.py                     # FastAPI REST API with CORS, webhooks, and outbox routes
│   ├── requirements.txt            # Python dependencies
│   ├── test_integrations.py        # Integration test verification script
│   └── sample_invoices/
│       ├── generate_samples.py     # Script generating the 6 PDF/image benchmark cases
│       ├── sample_1_clean_match.pdf
│       ├── sample_2_tolerance_match.pdf
│       ├── sample_3_quantity_mismatch.pdf
│       ├── sample_4_price_mismatch.pdf
│       ├── sample_5_duplicate_invoice.pdf
│       └── sample_6_messy_scan.jpg # Realistic tilted, grain-simulated warehouse scan
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── KPICards.tsx            # Dashboard KPI metrics
│   │   │   ├── UploadZone.tsx          # Drag-and-drop ingestion with animated agent thoughts
│   │   │   ├── SampleInvoicesBar.tsx   # 6-Card quick benchmark tester (PDF & JPG icons)
│   │   │   ├── InvoiceTable.tsx        # AP queue table with filters & status badges
│   │   │   ├── ThreeWayMatchTable.tsx  # Multi-GRN split delivery badge & reconciliation
│   │   │   ├── AgentTraceView.tsx      # Autonomous tool-calling reasoning trace
│   │   │   ├── VendorEmailCard.tsx     # Plain-English exceptions & live query dispatch
│   │   │   ├── MockERPViewer.tsx       # Live viewer for SQLite ERP tables & amendments
│   │   │   └── IntegrationsHub.tsx     # ERP connectors, webhook simulator & outbox audit
│   │   ├── App.tsx                     # Main layout & 3-view switcher (Dashboard, ERP, Hub)
│   │   ├── types.ts                    # TypeScript interfaces
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
└── README.md
```

---

## Quickstart & Installation

### Prerequisites
- **Python:** 3.10 or higher
- **Node.js:** 18 or higher (with npm)
- **Git**

---

### Step 1: Start Backend (Terminal 1)
```powershell
cd "d:\Pavan\agentic ai hackathon\backend"
python -m pip install -r requirements.txt
python database.py
python sample_invoices\generate_samples.py

# Optional: set Gemini API Key (or leave blank to use the built-in fallback parser)
$env:GEMINI_API_KEY="your-gemini-api-key"

uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
Backend API will be live at `http://127.0.0.1:8000` (interactive Swagger docs at `http://127.0.0.1:8000/docs`).

---

### Step 2: Start Frontend (Terminal 2)
```powershell
cd "d:\Pavan\agentic ai hackathon\frontend"
npm install
npm run dev
```
Open your browser at **`http://localhost:3000`**.

---

## API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/invoices/process` | Accepts multipart file upload (PDF/PNG/JPG), executes ReAct tool-calling agent, saves result. |
| `GET` | `/api/invoices` | Returns all processed invoices with aggregated KPI counts. |
| `GET` | `/api/invoices/{id}` | Returns full details of an invoice, including line-item match and linked PO/GRN records. |
| `POST` | `/api/invoices/{id}/approve` | Updates invoice status to `APPROVED_FOR_PAYMENT`. |
| `POST` | `/api/invoices/{id}/send-query` | Dispatches discrepancy dispute email to vendor and updates status to `VENDOR_QUERY_SENT`. |
| `GET` | `/api/integrations/status` | Returns real-time health and statistics of ERP Connector, Inbound Gateway, and Outbox. |
| `POST` | `/api/webhooks/inbound-email` | Ingests vendor invoice submissions via simulated or live webhook multipart payloads. |
| `GET` | `/api/erp/summary` | Returns all mock ERP master data (Vendors, POs, GRNs, Amendments) for inspection. |
| `POST` | `/api/demo/reset` | Resets the invoice ledger, outbox, and webhook logs for a clean demo presentation. |
| `GET` | `/api/sample_invoices` | Returns list of benchmark scenario invoices. |
| `POST` | `/api/sample_invoices/process/{file_name}` | 1-Click execution of any pre-generated scenario. |
| `GET` | `/api/sample_invoices/download/{file_name}`| Download or preview the original generated PDF invoice. |

---

## License
MIT License. Built for the Agentic AI Hackathon.
