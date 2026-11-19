import os
import json
import random
import datetime
import smtplib
from email.mime.text import MIMEText
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from database import get_connection, init_db, reset_invoices_table
from erp_adapters import get_erp_adapter
from models import (
    ProcessInvoiceResponse,
    InvoiceListResponse,
    DashboardKPIs
)
from agent import run_agent_pipeline

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db(force_reseed=False)
    yield

app = FastAPI(
    title="InvoiceFlow AP Three-Way Match Agent API",
    description="Agentic Accounts Payable automation with Multimodal LLM Extraction and Three-Way Reconciliation",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "app": "InvoiceFlow — AP Three-Way Match Agent",
        "status": "online",
        "docs_url": "/docs"
    }

@app.post("/api/invoices/process", response_model=ProcessInvoiceResponse)
async def process_invoice(file: UploadFile = File(...)):
    """Uploads an invoice file (PDF/PNG/JPG), executes the agentic 3-way match pipeline, and records result."""
    try:
        content = await file.read()
        mime_type = file.content_type or "application/pdf"
        file_name = file.filename or "uploaded_invoice.pdf"

        result = run_agent_pipeline(
            file_bytes=content,
            file_name=file_name,
            mime_type=mime_type
        )
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process invoice: {str(e)}")

@app.get("/api/invoices")
def list_invoices():
    """Returns all processed invoices along with dashboard KPI aggregates."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, invoice_number, vendor_id, vendor_name, gstin, po_number,
               invoice_date, subtotal, tax_amount, total_amount, status,
               exceptions_json, file_name, created_at
        FROM invoices
        ORDER BY id DESC
    """)
    rows = cursor.fetchall()

    invoices = []
    total = len(rows)
    queued = 0
    exceptions_cnt = 0
    duplicates = 0
    approved = 0

    for r in rows:
        st = r["status"]
        if st == "QUEUED_FOR_PAYMENT":
            queued += 1
        elif st in ("EXCEPTION_HOLD", "VENDOR_QUERY_SENT"):
            exceptions_cnt += 1
        elif st == "DUPLICATE_BLOCKED":
            duplicates += 1
        elif st == "APPROVED_FOR_PAYMENT":
            approved += 1

        exc_list = json.loads(r["exceptions_json"] or "[]")

        invoices.append({
            "id": r["id"],
            "invoice_number": r["invoice_number"],
            "vendor_id": r["vendor_id"],
            "vendor_name": r["vendor_name"],
            "gstin": r["gstin"],
            "po_number": r["po_number"],
            "invoice_date": r["invoice_date"],
            "subtotal": r["subtotal"],
            "tax_amount": r["tax_amount"],
            "total_amount": r["total_amount"],
            "status": r["status"],
            "exception_count": len(exc_list),
            "exceptions": exc_list,
            "file_name": r["file_name"],
            "created_at": r["created_at"]
        })

    conn.close()

    return {
        "kpis": {
            "total_processed": total,
            "queued_for_payment": queued,
            "exceptions_on_hold": exceptions_cnt,
            "duplicates_blocked": duplicates,
            "approved_for_payment": approved
        },
        "invoices": invoices
    }

@app.get("/api/invoices/{invoice_id}")
def get_invoice_details(invoice_id: int):
    """Returns full details of an invoice, including agent reasoning trace, 
    3-way match breakdown, and underlying ERP PO and GRN data."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Invoice record not found")

    invoice_data = dict(row)
    invoice_data["extracted"] = json.loads(invoice_data.get("extracted_json") or "{}")
    invoice_data["match_details"] = json.loads(invoice_data.get("match_details_json") or "{}")
    invoice_data["exceptions"] = json.loads(invoice_data.get("exceptions_json") or "[]")
    invoice_data["agent_trace"] = json.loads(invoice_data.get("agent_trace_json") or "[]")

    po_number = invoice_data.get("po_number")
    po_data = None
    grn_data = None

    if po_number:
        # Fetch PO
        cursor.execute("SELECT * FROM purchase_orders WHERE po_number = ?", (po_number,))
        po_row = cursor.fetchone()
        if po_row:
            po_data = dict(po_row)
            cursor.execute("SELECT * FROM po_line_items WHERE po_number = ?", (po_number,))
            po_data["items"] = [dict(it) for it in cursor.fetchall()]

        # Fetch GRN
        cursor.execute("SELECT * FROM goods_receipts WHERE po_number = ?", (po_number,))
        grn_row = cursor.fetchone()
        if grn_row:
            grn_data = dict(grn_row)
            cursor.execute("SELECT * FROM grn_line_items WHERE grn_number = ?", (grn_data["grn_number"],))
            grn_data["items"] = [dict(it) for it in cursor.fetchall()]

    conn.close()

    invoice_data["po_master"] = po_data
    invoice_data["grn_master"] = grn_data

    return invoice_data

@app.post("/api/invoices/{invoice_id}/approve")
def approve_invoice(invoice_id: int):
    """Manually approves an invoice for payment (e.g. after human review of exceptions)."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, status FROM invoices WHERE id = ?", (invoice_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Invoice not found")

    cursor.execute("UPDATE invoices SET status = 'APPROVED_FOR_PAYMENT' WHERE id = ?", (invoice_id,))
    conn.commit()
    conn.close()

    return {"status": "success", "message": f"Invoice #{invoice_id} successfully approved for payment."}

@app.get("/api/erp/summary")
def get_erp_summary():
    """Returns all mock ERP data (Vendors, Purchase Orders, Goods Receipts) for audit viewing."""
    conn = get_connection()
    cursor = conn.cursor()

    # Vendors
    cursor.execute("SELECT * FROM vendors ORDER BY vendor_id ASC")
    vendors = [dict(r) for r in cursor.fetchall()]

    # POs with line items
    cursor.execute("SELECT * FROM purchase_orders ORDER BY po_number ASC")
    pos = []
    for po in cursor.fetchall():
        po_dict = dict(po)
        cursor.execute("SELECT * FROM po_line_items WHERE po_number = ?", (po_dict["po_number"],))
        po_dict["line_items"] = [dict(li) for li in cursor.fetchall()]
        pos.append(po_dict)

    # GRNs with line items
    cursor.execute("SELECT * FROM goods_receipts ORDER BY grn_number ASC")
    grns = []
    for grn in cursor.fetchall():
        grn_dict = dict(grn)
        cursor.execute("SELECT * FROM grn_line_items WHERE grn_number = ?", (grn_dict["grn_number"],))
        grn_dict["line_items"] = [dict(li) for li in cursor.fetchall()]
        grns.append(grn_dict)

    # Price Amendments
    cursor.execute("SELECT * FROM price_amendments ORDER BY id ASC")
    amendments = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "vendors": vendors,
        "purchase_orders": pos,
        "goods_receipts": grns,
        "price_amendments": amendments
    }

@app.post("/api/demo/reset")
def reset_demo():
    """Resets the invoices database to an empty state for a pristine demo session."""
    reset_invoices_table()
    return {"status": "success", "message": "Invoices queue reset successfully."}

@app.get("/api/sample_invoices")
def get_sample_invoices():
    """Returns information on the 5 pre-generated scenario sample invoices."""
    samples = [
        {
            "id": "sample_1",
            "file_name": "sample_1_clean_match.pdf",
            "title": "Clean 3-Way Match",
            "vendor": "Tata Steel Industrial Ltd",
            "po_number": "PO-2024-001",
            "expected_outcome": "QUEUED_FOR_PAYMENT",
            "badge_color": "emerald",
            "description": "PO, GRN, and Invoice quantities and prices match 100% perfectly. Clean automated pass."
        },
        {
            "id": "sample_2",
            "file_name": "sample_2_tolerance_match.pdf",
            "title": "Within-Tolerance Variance",
            "vendor": "Infosys Hardware Solutions",
            "po_number": "PO-2024-002",
            "expected_outcome": "QUEUED_FOR_PAYMENT",
            "badge_color": "blue",
            "description": "Invoice unit price has a +1.23% variance, safely within the allowed ±2% AP policy threshold."
        },
        {
            "id": "sample_3",
            "file_name": "sample_3_quantity_mismatch.pdf",
            "title": "Short Delivery Mismatch",
            "vendor": "Bharat Heavy Electricals Tech",
            "po_number": "PO-2024-003",
            "expected_outcome": "EXCEPTION_HOLD",
            "badge_color": "rose",
            "description": "Vendor billed for 100 units, but warehouse dock received only 75 units (short delivery recorded on GRN)."
        },
        {
            "id": "sample_4",
            "file_name": "sample_4_price_mismatch.pdf",
            "title": "Price Hike & Math Discrepancy",
            "vendor": "Reliance Logistics & Packaging",
            "po_number": "PO-2024-004",
            "expected_outcome": "EXCEPTION_HOLD",
            "badge_color": "amber",
            "description": "Unit price exceeds PO by +20% (violating tolerance) and includes an arithmetic calculation discrepancy."
        },
        {
            "id": "sample_5",
            "file_name": "sample_5_duplicate_invoice.pdf",
            "title": "Duplicate Invoice Detection",
            "vendor": "Tata Steel Industrial Ltd",
            "po_number": "PO-2024-001",
            "expected_outcome": "DUPLICATE_BLOCKED",
            "badge_color": "purple",
            "description": "Re-submission of an existing invoice (INV-2024-001). Agent blocks payment to prevent double disbursement."
        },
        {
            "id": "sample_6",
            "file_name": "sample_6_messy_scan.jpg",
            "title": "Messy Scan + Split GRN Delivery",
            "vendor": "Tata Steel Industrial Ltd",
            "po_number": "PO-2024-005",
            "expected_outcome": "QUEUED_FOR_PAYMENT",
            "badge_color": "cyan",
            "description": "Tilted warehouse mobile scan for PO-2024-005. Dock delivery was split into two receipts (GRN-2024-005A: 25 + GRN-2024-005B: 15 = 40 units)."
        }
    ]
    return samples

@app.post("/api/sample_invoices/process/{file_name}")
def process_sample_by_name(file_name: str):
    """Allows one-click processing of a pre-generated sample invoice file directly from the UI."""
    sample_dir = os.path.join(os.path.dirname(__file__), "sample_invoices")
    file_path = os.path.join(sample_dir, file_name)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Sample file '{file_name}' not found.")

    with open(file_path, "rb") as f:
        content = f.read()

    mime_type = "image/jpeg" if file_name.lower().endswith((".jpg", ".jpeg")) else "application/pdf"

    result = run_agent_pipeline(
        file_bytes=content,
        file_name=file_name,
        mime_type=mime_type
    )
    return result

@app.get("/api/sample_invoices/download/{file_name}")
def download_sample_invoice(file_name: str):
    """Returns the sample PDF or JPEG file for viewing or previewing in the browser."""
    sample_dir = os.path.join(os.path.dirname(__file__), "sample_invoices")
    file_path = os.path.join(sample_dir, file_name)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Sample invoice file not found")

    mime_type = "image/jpeg" if file_name.lower().endswith((".jpg", ".jpeg")) else "application/pdf"
    return FileResponse(file_path, media_type=mime_type, filename=file_name)

# =====================================================================
# ENTERPRISE INTEGRATIONS & WEBHOOKS
# =====================================================================
class SendVendorQueryRequest(BaseModel):
    recipient_email: str
    subject: str
    body: str

@app.get("/api/integrations/status")
def get_integrations_status():
    """Returns real-time status of ERP Connector, Inbound AP Gateway, and Outbound Dispatcher."""
    adapter = get_erp_adapter()
    erp_info = adapter.get_adapter_info()

    conn = get_connection()
    cursor = conn.cursor()

    # Inbound email webhook count and logs
    cursor.execute("SELECT COUNT(*) FROM inbound_webhook_logs")
    inbound_count = cursor.fetchone()[0]

    cursor.execute("SELECT * FROM inbound_webhook_logs ORDER BY id DESC LIMIT 10")
    recent_inbound = [dict(r) for r in cursor.fetchall()]

    # Outbox count and logs
    cursor.execute("SELECT COUNT(*) FROM email_outbox")
    outbox_count = cursor.fetchone()[0]

    cursor.execute("SELECT * FROM email_outbox ORDER BY id DESC LIMIT 10")
    recent_outbox = [dict(r) for r in cursor.fetchall()]

    conn.close()

    smtp_host = os.environ.get("SMTP_HOST")
    smtp_mode = "SMTP_LIVE" if smtp_host else "ENTERPRISE_OUTBOX_SIMULATED"

    return {
        "erp_connector": erp_info,
        "inbound_gateway": {
            "email_address": "ap-intake@invoiceflow.enterprise",
            "inbox_address": "ap-intake@invoiceflow.enterprise",
            "webhook_url": "/api/webhooks/inbound-email",
            "webhook_endpoint": "/api/webhooks/inbound-email",
            "status": "ACTIVE (LISTENING)",
            "total_ingested": inbound_count,
            "recent_logs": recent_inbound
        },
        "outbound_dispatcher": {
            "dispatch_mode": smtp_mode,
            "smtp_host": smtp_host or "mail.invoiceflow.corp",
            "smtp_port": int(os.environ.get("SMTP_PORT", 587)),
            "smtp_configured": bool(smtp_host),
            "total_dispatched": outbox_count,
            "recent_outbox": recent_outbox
        }
    }

@app.post("/api/webhooks/inbound-email")
async def inbound_email_webhook(request: Request):
    """Enterprise Inbound AP Email Webhook. Ingests raw multipart files or simulated incoming vendor emails."""
    content_type = request.headers.get("content-type", "")
    body_bytes = None
    filename = "inbound_invoice.pdf"
    mime_type = "application/pdf"
    s_email = "vendor-commercial@enterprise.in"
    s_subj = "Tax Invoice Submission for PO Reconciliation"

    raw_body = await request.body()
    # Check if request has JSON body (simulation trigger from UI or external webhook)
    if raw_body and ("application/json" in content_type or raw_body.strip().startswith(b"{")):
        try:
            json_body = json.loads(raw_body.decode("utf-8"))
            sample_fn = json_body.get("sample_filename", "sample_3_quantity_mismatch.pdf")
            s_email = json_body.get("sender_email", s_email)
            s_subj = json_body.get("subject", s_subj)
            sample_path = os.path.join(os.path.dirname(__file__), "sample_invoices", sample_fn)
            if os.path.exists(sample_path):
                filename = sample_fn
                with open(sample_path, "rb") as f:
                    body_bytes = f.read()
                mime_type = "image/jpeg" if filename.lower().endswith((".jpg", ".jpeg")) else "application/pdf"
        except Exception as e:
            print(f"Error parsing JSON webhook payload: {e}")
            print(f"JSON webhook read notice: {e}")
    else:
        # Multipart form data upload
        try:
            form = await request.form()
            s_email = form.get("sender_email") or s_email
            s_subj = form.get("subject") or s_subj
            form_file = form.get("file")
            if form_file and hasattr(form_file, "read"):
                filename = getattr(form_file, "filename", "inbound_invoice.pdf")
                mime_type = getattr(form_file, "content_type", "application/pdf")
                body_bytes = await form_file.read()
        except Exception as e:
            print(f"Form webhook read notice: {e}")

    if not body_bytes:
        # Default fallback sample if no file attached
        sample_path = os.path.join(os.path.dirname(__file__), "sample_invoices", "sample_3_quantity_mismatch.pdf")
        filename = "sample_3_quantity_mismatch.pdf"
        with open(sample_path, "rb") as f:
            body_bytes = f.read()

    # Log initial inbound event
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO inbound_webhook_logs (source, sender_email, subject, filename, invoice_id, status)
        VALUES (?, ?, ?, ?, ?, ?)
    """, ("EMAIL_GATEWAY", s_email, s_subj, filename, None, "RECEIVED"))
    conn.commit()
    log_id = cursor.lastrowid
    conn.close()

    # Execute Autonomous Agent Pipeline
    result = run_agent_pipeline(
        file_bytes=body_bytes,
        file_name=filename,
        mime_type=mime_type
    )

    # Update log entry with resulting invoice ID
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE inbound_webhook_logs
        SET invoice_id = ?, status = ?
        WHERE id = ?
    """, (result.id, f"PROCESSED ({result.status})", log_id))
    conn.commit()
    conn.close()

    return result

@app.post("/api/invoices/{invoice_id}/send-query")
def send_vendor_query(invoice_id: int, req: SendVendorQueryRequest):
    """Dispatches a dispute clarification email to the vendor and closes the AP hold loop."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,))
    inv = cursor.fetchone()
    if not inv:
        conn.close()
        raise HTTPException(status_code=404, detail="Invoice record not found")

    invoice_number = inv["invoice_number"]
    now_iso = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    msg_id = f"MSG-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(100, 999)}"

    # Determine dispatch mode
    smtp_host = os.environ.get("SMTP_HOST")
    dispatch_mode = "ENTERPRISE_OUTBOX_SIMULATED"

    if smtp_host:
        try:
            smtp_port = int(os.environ.get("SMTP_PORT", 587))
            smtp_user = os.environ.get("SMTP_USER", "")
            smtp_pass = os.environ.get("SMTP_PASSWORD", "")

            msg = MIMEText(req.body)
            msg["Subject"] = req.subject
            msg["From"] = os.environ.get("SMTP_FROM", "ap-helpdesk@acmemfg.in")
            msg["To"] = req.recipient_email
            msg["Message-ID"] = f"<{msg_id}@acmemfg.in>"

            with smtplib.SMTP(smtp_host, smtp_port, timeout=3.0) as server:
                if smtp_user and smtp_pass:
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            dispatch_mode = "SMTP_LIVE"
        except Exception as e:
            print(f"SMTP dispatch warning: {e}")
            dispatch_mode = f"ENTERPRISE_OUTBOX_SIMULATED (SMTP Fallback: {e})"

    # Insert into email_outbox
    cursor.execute("""
        INSERT INTO email_outbox (invoice_id, invoice_number, recipient_email, subject, body, dispatch_mode, message_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (invoice_id, invoice_number, req.recipient_email, req.subject, req.body, dispatch_mode, msg_id))

    # Append trace step and update status to VENDOR_QUERY_SENT
    trace_list = json.loads(inv["agent_trace_json"] or "[]")
    trace_list.append({
        "step": "VENDOR_QUERY_DISPATCHED",
        "title": "Vendor Dispute Query Dispatched",
        "status": "PASS",
        "detail": f"Dispatched dispute clarification to '{req.recipient_email}' (Message ID: {msg_id}) via {dispatch_mode}. AP payment hold maintained in ledger.",
        "timestamp": now_iso
    })

    cursor.execute("""
        UPDATE invoices
        SET status = 'VENDOR_QUERY_SENT',
            agent_trace_json = ?
        WHERE id = ?
    """, (json.dumps(trace_list), invoice_id))

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "message_id": msg_id,
        "dispatch_mode": dispatch_mode,
        "recipient_email": req.recipient_email,
        "sent_at": now_iso,
        "invoice_status": "VENDOR_QUERY_SENT"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
