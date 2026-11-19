import sqlite3
import os
from typing import List, Dict, Any, Optional

DB_PATH = os.environ.get("ERP_DB_PATH", os.path.join(os.path.dirname(__file__), "erp_mock.db"))

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(force_reseed: bool = False):
    """Initializes the SQLite schema and seeds with mock ERP data."""
    conn = get_connection()
    cursor = conn.cursor()

    if force_reseed:
        cursor.execute("DROP TABLE IF EXISTS price_amendments")
        cursor.execute("DROP TABLE IF EXISTS invoices")
        cursor.execute("DROP TABLE IF EXISTS grn_line_items")
        cursor.execute("DROP TABLE IF EXISTS goods_receipts")
        cursor.execute("DROP TABLE IF EXISTS po_line_items")
        cursor.execute("DROP TABLE IF EXISTS purchase_orders")
        cursor.execute("DROP TABLE IF EXISTS vendors")

    # 1. Vendors table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vendors (
        vendor_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        gstin TEXT NOT NULL,
        email TEXT NOT NULL,
        status TEXT DEFAULT 'ACTIVE'
    )
    """)

    # 2. Purchase Orders table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS purchase_orders (
        po_number TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        po_date TEXT NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'ISSUED',
        FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id)
    )
    """)

    # 3. PO Line Items table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS po_line_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        po_number TEXT NOT NULL,
        item_code TEXT NOT NULL,
        description TEXT NOT NULL,
        ordered_qty INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        FOREIGN KEY (po_number) REFERENCES purchase_orders (po_number)
    )
    """)

    # 4. Goods Receipts (GRN) table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS goods_receipts (
        grn_number TEXT PRIMARY KEY,
        po_number TEXT NOT NULL,
        received_date TEXT NOT NULL,
        FOREIGN KEY (po_number) REFERENCES purchase_orders (po_number)
    )
    """)

    # 5. GRN Line Items table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS grn_line_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grn_number TEXT NOT NULL,
        item_code TEXT NOT NULL,
        received_qty INTEGER NOT NULL,
        FOREIGN KEY (grn_number) REFERENCES goods_receipts (grn_number)
    )
    """)

    # 6. Invoices table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL,
        vendor_id TEXT,
        vendor_name TEXT,
        gstin TEXT,
        po_number TEXT,
        invoice_date TEXT,
        subtotal REAL,
        tax_amount REAL,
        total_amount REAL,
        status TEXT NOT NULL,
        extracted_json TEXT,
        match_details_json TEXT,
        exceptions_json TEXT,
        drafted_email TEXT,
        agent_trace_json TEXT,
        file_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 7. Price Amendments table (for Autonomous Agent Price Dispute Investigation)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS price_amendments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id TEXT NOT NULL,
        po_number TEXT NOT NULL,
        item_code TEXT NOT NULL,
        approved_unit_price REAL NOT NULL,
        approved_by TEXT NOT NULL,
        reference_note TEXT,
        valid_until TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id),
        FOREIGN KEY (po_number) REFERENCES purchase_orders (po_number)
    )
    """)

    # 8. Outbound Vendor Email Outbox table (Closed-Loop Dispute Resolution)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS email_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER,
        invoice_number TEXT NOT NULL,
        recipient_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        dispatch_mode TEXT NOT NULL,
        message_id TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 9. Inbound Webhook / Email Gateway Ingestion Logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inbound_webhook_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        sender_email TEXT,
        subject TEXT,
        filename TEXT,
        invoice_id INTEGER,
        status TEXT NOT NULL,
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()

    # Seed data if empty or forced
    cursor.execute("SELECT COUNT(*) FROM vendors")
    vendor_count = cursor.fetchone()[0]

    if vendor_count == 0 or force_reseed:
        seed_mock_erp_data(cursor)
        conn.commit()

    conn.close()

def seed_mock_erp_data(cursor):
    """Seeds realistic Indian B2B ERP data."""
    # 4 Master Vendors with standard 15-char Indian GSTINs
    vendors = [
        ("VEND-001", "Tata Steel Industrial Ltd", "27AAACT2727Q1ZW", "billing@tatasteel-example.com", "ACTIVE"),
        ("VEND-002", "Infosys Hardware Solutions", "29AAACI4567M1ZV", "ap-accounts@infosys-hardware.com", "ACTIVE"),
        ("VEND-003", "Bharat Heavy Electricals Tech", "07AAACB1234D1ZP", "commercial@bheltech-sample.in", "ACTIVE"),
        ("VEND-004", "Reliance Logistics & Packaging", "24AAACR8888P1ZN", "invoicing@rel-pack.com", "ACTIVE"),
    ]
    cursor.executemany(
        "INSERT OR REPLACE INTO vendors (vendor_id, name, gstin, email, status) VALUES (?, ?, ?, ?, ?)",
        vendors
    )

    # 4 Purchase Orders
    purchase_orders = [
        # PO-2024-001: Tata Steel - 50 rods @ ₹2,400 = ₹120,000 + 18% GST (₹21,600) = ₹141,600
        ("PO-2024-001", "VEND-001", "2024-10-15", 141600.0, "ISSUED"),
        # PO-2024-002: Infosys Hardware - 10 workstations @ ₹65,000 = ₹650,000 + 18% GST (₹117,000) = ₹767,000
        ("PO-2024-002", "VEND-002", "2024-10-18", 767000.0, "ISSUED"),
        # PO-2024-003: BHEL - 100 contactors @ ₹1,500 = ₹150,000 + 18% GST (₹27,000) = ₹177,000
        ("PO-2024-003", "VEND-003", "2024-10-20", 177000.0, "ISSUED"),
        # PO-2024-004: Reliance Packaging - 200 boxes @ ₹450 = ₹90,000 + 18% GST (₹16,200) = ₹106,200
        ("PO-2024-004", "VEND-004", "2024-10-22", 106200.0, "ISSUED"),
        # PO-2024-005: Tata Steel - Multi-GRN Split Delivery (40 heavy beams @ ₹3,200 = ₹128,000 + 18% GST ₹23,040 = ₹151,040)
        ("PO-2024-005", "VEND-001", "2024-11-01", 151040.0, "ISSUED"),
    ]
    cursor.executemany(
        "INSERT OR REPLACE INTO purchase_orders (po_number, vendor_id, po_date, total_amount, status) VALUES (?, ?, ?, ?, ?)",
        purchase_orders
    )

    # Line Items for POs
    po_items = [
        ("PO-2024-001", "STL-ROD-12MM", "High-Tensile TMT Steel Rebars 12mm Grade 550D", 50, 2400.0),
        ("PO-2024-002", "HW-DESK-I7", "Dell OptiPlex Enterprise Workstation Core i7 32GB RAM", 10, 65000.0),
        ("PO-2024-003", "ELEC-CNT-32A", "Industrial 3-Pole AC Contactor 32A 230V Coil", 100, 1500.0),
        ("PO-2024-004", "PKG-BOX-HVY", "Heavy Duty Double-Wall Corrugated Pallet Boxes", 200, 450.0),
        ("PO-2024-005", "STL-BEAM-40", "Structural ISMB Heavy Steel Beams 400mm Grade E250", 40, 3200.0),
    ]
    cursor.executemany(
        "INSERT OR REPLACE INTO po_line_items (po_number, item_code, description, ordered_qty, unit_price) VALUES (?, ?, ?, ?, ?)",
        po_items
    )

    # 4 Goods Receipts (GRNs) + Split Deliveries for PO-2024-005
    # Notice GRN-2024-003 has a SHORT DELIVERY: ordered 100, but only 75 received!
    # Notice PO-2024-005 has SPLIT DELIVERIES across GRN-2024-005A (25) and GRN-2024-005B (15) = 40 total!
    goods_receipts = [
        ("GRN-2024-001", "PO-2024-001", "2024-10-22"),
        ("GRN-2024-002", "PO-2024-002", "2024-10-25"),
        ("GRN-2024-003", "PO-2024-003", "2024-10-26"),  # Short delivery recorded
        ("GRN-2024-004", "PO-2024-004", "2024-10-28"),
        ("GRN-2024-005A", "PO-2024-005", "2024-11-05"), # Split batch 1 (25 units)
        ("GRN-2024-005B", "PO-2024-005", "2024-11-08"), # Split batch 2 (15 units)
    ]
    cursor.executemany(
        "INSERT OR REPLACE INTO goods_receipts (grn_number, po_number, received_date) VALUES (?, ?, ?)",
        goods_receipts
    )

    # Line Items for GRNs
    grn_items = [
        ("GRN-2024-001", "STL-ROD-12MM", 50),   # Full receipt (50 of 50)
        ("GRN-2024-002", "HW-DESK-I7", 10),     # Full receipt (10 of 10)
        ("GRN-2024-003", "ELEC-CNT-32A", 75),   # Short receipt! (75 received, 25 damaged/short)
        ("GRN-2024-004", "PKG-BOX-HVY", 200),   # Full receipt (200 of 200)
        ("GRN-2024-005A", "STL-BEAM-40", 25),   # Split shipment 1
        ("GRN-2024-005B", "STL-BEAM-40", 15),   # Split shipment 2 (25 + 15 = 40 units total received!)
    ]
    cursor.executemany(
        "INSERT OR REPLACE INTO grn_line_items (grn_number, item_code, received_qty) VALUES (?, ?, ?)",
        grn_items
    )

    # Seed 1 realistic Price Amendment (pre-approval reference for demonstration)
    # Shows an authorized price amendment for Infosys Hardware Solutions
    amendments = [
        (
            "VEND-002",
            "PO-2024-002",
            "HW-DESK-I7",
            66000.0,
            "Chief Technology Officer - Priya Nair",
            "Pre-approved RAM upgrade from 16GB to 32GB per workstation (Ref: CR-2024-912)",
            "2024-12-31"
        )
    ]
    cursor.executemany(
        """INSERT OR REPLACE INTO price_amendments 
           (vendor_id, po_number, item_code, approved_unit_price, approved_by, reference_note, valid_until)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        amendments
    )

def get_goods_receipts_for_po(po_number: str) -> Dict[str, Any]:
    """Fetches all GRNs for a PO and aggregates received quantities across split/partial deliveries."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT grn_number, po_number, received_date FROM goods_receipts WHERE po_number = ?", 
        (po_number.strip(),)
    )
    grn_rows = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
        SELECT gli.item_code, SUM(gli.received_qty) as total_received_qty
        FROM grn_line_items gli
        JOIN goods_receipts gr ON gli.grn_number = gr.grn_number
        WHERE gr.po_number = ?
        GROUP BY gli.item_code
    """, (po_number.strip(),))
    totals = {r["item_code"]: r["total_received_qty"] for r in cursor.fetchall()}
    conn.close()

    return {
        "grns": grn_rows,
        "aggregated_qty": totals
    }

def reset_invoices_table():
    """Wipes invoices, outbox, and webhook logs for a clean demo reset."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM invoices")
    cursor.execute("DELETE FROM email_outbox")
    cursor.execute("DELETE FROM inbound_webhook_logs")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db(force_reseed=True)
    print("ERP Database initialized and seeded successfully at:", DB_PATH)
