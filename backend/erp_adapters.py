import os
import json
import sqlite3
import datetime
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import requests

from database import get_connection, get_goods_receipts_for_po

class BaseERPAdapter(ABC):
    """Abstract Base Class for Enterprise ERP Connectors (SAP S/4HANA, NetSuite, Tally Prime, SQLite)."""

    @abstractmethod
    def get_adapter_info(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    def lookup_vendor(self, vendor_name: str, gstin: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    def check_duplicate_invoices(
        self,
        vendor_id: Optional[str],
        invoice_number: str,
        total_amount: float,
        invoice_date: str
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    def fetch_po_and_grn_totals(self, po_number: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    def check_price_amendments(self, vendor_id: str, po_number: str, item_code: str) -> Dict[str, Any]:
        pass


class SQLiteMockERPAdapter(BaseERPAdapter):
    """Local SQLite ERP Connector backed by erp_mock.db."""

    def get_adapter_info(self) -> Dict[str, Any]:
        return {
            "adapter_type": "SQLiteMockERPAdapter",
            "name": "SQLite Mock ERP Connector (Local Ledger)",
            "mode": "sqlite",
            "status": "CONNECTED",
            "target_system": "SQLite (erp_mock.db)",
            "supported_entities": ["Vendors", "Purchase Orders", "Goods Receipts (Multi-GRN)", "Price Amendments"],
            "latency_ms": 1.2
        }

    def lookup_vendor(self, vendor_name: str, gstin: str) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        clean_gstin = (gstin or "").strip().upper()
        clean_name = (vendor_name or "").strip()

        vendor_row = None
        if clean_gstin:
            cursor.execute("SELECT vendor_id, name, gstin, email, status FROM vendors WHERE UPPER(gstin) = ?", (clean_gstin,))
            vendor_row = cursor.fetchone()

        if not vendor_row and clean_name:
            cursor.execute("SELECT vendor_id, name, gstin, email, status FROM vendors WHERE UPPER(name) LIKE ?", (f"%{clean_name[:6].upper()}%",))
            vendor_row = cursor.fetchone()

        conn.close()

        if not vendor_row:
            return {
                "found": False,
                "vendor_id": None,
                "name": None,
                "gstin": None,
                "email": None,
                "status": None,
                "gstin_matches": False,
                "message": f"Vendor '{vendor_name}' (GSTIN: {gstin}) was not found in the ERP vendor master."
            }

        v_dict = dict(vendor_row)
        gstin_matches = (v_dict["gstin"].strip().upper() == clean_gstin)

        return {
            "found": True,
            "vendor_id": v_dict["vendor_id"],
            "name": v_dict["name"],
            "gstin": v_dict["gstin"],
            "email": v_dict["email"],
            "status": v_dict["status"],
            "gstin_matches": gstin_matches,
            "message": (
                f"Vendor identified: '{v_dict['name']}' ({v_dict['vendor_id']}). "
                + ("GSTIN matches master record." if gstin_matches else f"Warning: Invoice GSTIN '{gstin}' differs from master GSTIN '{v_dict['gstin']}'.")
            )
        }

    def check_duplicate_invoices(
        self,
        vendor_id: Optional[str],
        invoice_number: str,
        total_amount: float,
        invoice_date: str
    ) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        clean_inv_num = (invoice_number or "").strip()

        # Check 1: Exact match on invoice_number
        cursor.execute(
            "SELECT id, invoice_number, vendor_name, vendor_id, total_amount, invoice_date, created_at FROM invoices WHERE UPPER(invoice_number) = ?",
            (clean_inv_num.upper(),)
        )
        exact_matches = cursor.fetchall()
        if exact_matches:
            match = dict(exact_matches[0])
            conn.close()
            return {
                "is_duplicate": True,
                "match_type": "EXACT",
                "existing_invoice": match,
                "message": f"Exact duplicate detected: Invoice #{invoice_number} was previously recorded on {match['created_at']} (ID #{match['id']})."
            }

        # Check 2: Soft duplicate match
        if vendor_id or total_amount:
            cursor.execute(
                "SELECT id, invoice_number, vendor_name, vendor_id, total_amount, invoice_date, created_at FROM invoices WHERE ABS(total_amount - ?) < 1.0",
                (total_amount,)
            )
            candidates = cursor.fetchall()
            for cand in candidates:
                c_dict = dict(cand)
                if (vendor_id and c_dict.get("vendor_id") == vendor_id) or (not vendor_id):
                    conn.close()
                    return {
                        "is_duplicate": True,
                        "match_type": "SOFT",
                        "existing_invoice": c_dict,
                        "message": f"Soft duplicate detected: Invoice #{c_dict['invoice_number']} for vendor '{c_dict['vendor_name']}' has an identical total of ₹{total_amount:,.2f}."
                    }

        conn.close()
        return {
            "is_duplicate": False,
            "match_type": None,
            "existing_invoice": None,
            "message": f"No duplicate ledger entries found for Invoice #{invoice_number}."
        }

    def fetch_po_and_grn_totals(self, po_number: str) -> Dict[str, Any]:
        clean_po = (po_number or "").strip()
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT po_number, vendor_id, po_date, total_amount, status FROM purchase_orders WHERE UPPER(po_number) = ?",
            (clean_po.upper(),)
        )
        po_row = cursor.fetchone()

        if not po_row:
            conn.close()
            return {
                "found": False,
                "po": None,
                "line_items": [],
                "grns": [],
                "aggregated_grn_qty": {},
                "message": f"Purchase Order '{po_number}' does not exist in the ERP system."
            }

        po_dict = dict(po_row)
        cursor.execute(
            "SELECT item_code, description, ordered_qty, unit_price FROM po_line_items WHERE po_number = ?",
            (po_dict["po_number"],)
        )
        line_items = [dict(r) for r in cursor.fetchall()]
        conn.close()

        grn_info = get_goods_receipts_for_po(po_dict["po_number"])

        return {
            "found": True,
            "po": po_dict,
            "line_items": line_items,
            "grns": grn_info["grns"],
            "aggregated_grn_qty": grn_info["aggregated_qty"],
            "message": f"Found PO '{po_number}' with {len(line_items)} line item(s) and {len(grn_info['grns'])} linked GRN receipt(s)."
        }

    def check_price_amendments(self, vendor_id: str, po_number: str, item_code: str) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        clean_po = (po_number or "").strip()
        clean_item = (item_code or "").strip()

        cursor.execute("""
            SELECT id, vendor_id, po_number, item_code, approved_unit_price, approved_by, reference_note, valid_until
            FROM price_amendments
            WHERE UPPER(po_number) = ? AND UPPER(item_code) = ?
        """, (clean_po.upper(), clean_item.upper()))

        row = cursor.fetchone()
        conn.close()

        if row:
            r_dict = dict(row)
            return {
                "has_amendment": True,
                "approved_unit_price": r_dict["approved_unit_price"],
                "approved_by": r_dict["approved_by"],
                "reference_note": r_dict["reference_note"],
                "valid_until": r_dict["valid_until"],
                "message": f"Pre-approved amendment found: Unit price ₹{r_dict['approved_unit_price']:,.2f} authorized by {r_dict['approved_by']} (Note: {r_dict['reference_note']})."
            }

        return {
            "has_amendment": False,
            "approved_unit_price": None,
            "approved_by": None,
            "reference_note": None,
            "valid_until": None,
            "message": f"No price amendments found for PO '{po_number}' and Item '{item_code}'."
        }


class WebhookRESTERPAdapter(BaseERPAdapter):
    """Enterprise REST/Webhook ERP Connector designed for SAP S/4HANA, NetSuite, or Tally Prime APIs.
    Falls back gracefully to SQLite local shadow cache if the remote endpoint is offline/unreachable."""

    def __init__(
        self,
        webhook_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: float = 2.0
    ):
        self.webhook_url = webhook_url or os.environ.get("ERP_WEBHOOK_URL", "https://api.sap-netsuite-erp.example/v1/ap-sync")
        self.api_key = api_key or os.environ.get("ERP_API_KEY", "sap_prod_live_sec_key_441")
        self.timeout = timeout
        self.fallback_adapter = SQLiteMockERPAdapter()

    def get_adapter_info(self) -> Dict[str, Any]:
        return {
            "adapter_type": "WebhookRESTERPAdapter",
            "name": "Enterprise REST / Webhook Adapter (SAP & NetSuite)",
            "mode": "webhook",
            "status": "ONLINE (STANDBY / FALLBACK SHADOW ACTIVE)",
            "target_system": self.webhook_url,
            "supported_entities": ["Vendors", "Purchase Orders", "Goods Receipts (Multi-GRN)", "Price Amendments"],
            "api_key_configured": bool(self.api_key),
            "latency_ms": 38.5
        }

    def _call_remote_or_fallback(self, action: str, payload: Dict[str, Any], fallback_func) -> Dict[str, Any]:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        try:
            resp = requests.post(
                f"{self.webhook_url.rstrip('/')}/{action}",
                json=payload,
                headers=headers,
                timeout=self.timeout
            )
            if resp.status_code == 200:
                return resp.json()
        except Exception:
            pass
        # Graceful fallback to local ERP cache
        res = fallback_func()
        if isinstance(res, dict) and "message" in res:
            res["message"] = f"[SAP/NetSuite REST Fallback] {res['message']}"
        return res

    def lookup_vendor(self, vendor_name: str, gstin: str) -> Dict[str, Any]:
        return self._call_remote_or_fallback(
            "lookup-vendor",
            {"vendor_name": vendor_name, "gstin": gstin},
            lambda: self.fallback_adapter.lookup_vendor(vendor_name, gstin)
        )

    def check_duplicate_invoices(
        self,
        vendor_id: Optional[str],
        invoice_number: str,
        total_amount: float,
        invoice_date: str
    ) -> Dict[str, Any]:
        return self._call_remote_or_fallback(
            "check-duplicate",
            {"vendor_id": vendor_id, "invoice_number": invoice_number, "total_amount": total_amount, "invoice_date": invoice_date},
            lambda: self.fallback_adapter.check_duplicate_invoices(vendor_id, invoice_number, total_amount, invoice_date)
        )

    def fetch_po_and_grn_totals(self, po_number: str) -> Dict[str, Any]:
        return self._call_remote_or_fallback(
            "fetch-po-grn",
            {"po_number": po_number},
            lambda: self.fallback_adapter.fetch_po_and_grn_totals(po_number)
        )

    def check_price_amendments(self, vendor_id: str, po_number: str, item_code: str) -> Dict[str, Any]:
        return self._call_remote_or_fallback(
            "check-price-amendment",
            {"vendor_id": vendor_id, "po_number": po_number, "item_code": item_code},
            lambda: self.fallback_adapter.check_price_amendments(vendor_id, po_number, item_code)
        )


def get_erp_adapter() -> BaseERPAdapter:
    """Factory function returning the active ERP connector based on environment configuration."""
    mode = os.environ.get("ERP_MODE", "sqlite").lower()
    if mode in ("webhook", "rest", "sap", "netsuite"):
        return WebhookRESTERPAdapter()
    return SQLiteMockERPAdapter()
