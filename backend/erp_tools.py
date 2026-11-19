import os
from typing import Dict, Any, List, Optional
from erp_adapters import get_erp_adapter

def lookup_vendor(vendor_name: str, gstin: str) -> Dict[str, Any]:
    """Searches the ERP vendor master by exact GSTIN first, falling back to case-insensitive vendor name.
    
    Args:
        vendor_name: Name of the vendor extracted from the invoice.
        gstin: 15-character Indian GSTIN extracted from the invoice.
        
    Returns:
        dict: Vendor master details including registration status and GSTIN match result.
    """
    adapter = get_erp_adapter()
    return adapter.lookup_vendor(vendor_name=vendor_name, gstin=gstin)

def check_duplicate_invoices(
    vendor_id: Optional[str],
    invoice_number: str,
    total_amount: float,
    invoice_date: str
) -> Dict[str, Any]:
    """Checks the ERP ledger for exact duplicate invoice numbers or soft duplicates.
    
    Args:
        vendor_id: The ERP vendor ID (e.g. VEND-001).
        invoice_number: The invoice number on the document.
        total_amount: Total billing amount in INR.
        invoice_date: Invoice date string (YYYY-MM-DD).
        
    Returns:
        dict: Duplicate check result indicating exact or soft matches with past ledger entries.
    """
    adapter = get_erp_adapter()
    return adapter.check_duplicate_invoices(
        vendor_id=vendor_id,
        invoice_number=invoice_number,
        total_amount=total_amount,
        invoice_date=invoice_date
    )

def fetch_po_and_grn_totals(po_number: str) -> Dict[str, Any]:
    """Fetches Purchase Order terms and aggregates dock receiving quantities across all linked GRNs.
    
    Args:
        po_number: Purchase order reference (e.g. PO-2024-001).
        
    Returns:
        dict: PO header, PO line items, linked GRNs, and total received quantity per item code.
    """
    adapter = get_erp_adapter()
    return adapter.fetch_po_and_grn_totals(po_number=po_number)

def check_price_amendments(vendor_id: str, po_number: str, item_code: str) -> Dict[str, Any]:
    """Queries ERP records for pre-authorized price amendments or approved contract escalations.
    
    Args:
        vendor_id: ERP Vendor ID (e.g. VEND-002).
        po_number: Purchase Order reference (e.g. PO-2024-002).
        item_code: Product or SKU code (e.g. HW-DESK-I7).
        
    Returns:
        dict: Amendment approval status, authorized price, approver identity, and reference notes.
    """
    adapter = get_erp_adapter()
    return adapter.check_price_amendments(
        vendor_id=vendor_id,
        po_number=po_number,
        item_code=item_code
    )

def verify_invoice_math(
    line_items: List[Dict[str, Any]],
    subtotal: float,
    tax_amount: float,
    total_amount: float
) -> Dict[str, Any]:
    """Programmatically verifies row calculations, subtotal summation, and grand total.
    
    Args:
        line_items: List of line items with qty, unit_price, and line_total.
        subtotal: Invoice subtotal before tax.
        tax_amount: Stated total tax (GST).
        total_amount: Stated invoice grand total.
        
    Returns:
        dict: Arithmetic audit result with discrepancy amounts and specific line-item math errors.
    """
    line_errors = []
    calculated_subtotal = 0.0

    for idx, item in enumerate(line_items, 1):
        qty = float(item.get("qty", 0.0))
        unit_price = float(item.get("unit_price", 0.0))
        line_total = float(item.get("line_total", 0.0))
        expected_line = round(qty * unit_price, 2)

        if abs(expected_line - line_total) > 1.0:
            line_errors.append(
                f"Line #{idx} ({item.get('item_code', 'Unknown')}): {qty} * ₹{unit_price:,.2f} = ₹{expected_line:,.2f}, but stated as ₹{line_total:,.2f}"
            )
        calculated_subtotal += line_total

    calculated_subtotal = round(calculated_subtotal, 2)
    calculated_total = round(subtotal + tax_amount, 2)

    subtotal_diff = round(abs(calculated_subtotal - subtotal), 2)
    total_diff = round(abs(calculated_total - total_amount), 2)

    is_valid = (subtotal_diff <= 1.0) and (total_diff <= 1.0) and (len(line_errors) == 0)

    if is_valid:
        msg = f"Arithmetic verified: Line items sum to Subtotal ₹{subtotal:,.2f}, and Subtotal + Tax ₹{tax_amount:,.2f} equals Total ₹{total_amount:,.2f}."
    else:
        err_parts = []
        if line_errors:
            err_parts.extend(line_errors)
        if subtotal_diff > 1.0:
            err_parts.append(f"Subtotal discrepancy: Sum of items (₹{calculated_subtotal:,.2f}) != stated subtotal (₹{subtotal:,.2f})")
        if total_diff > 1.0:
            err_parts.append(f"Grand Total discrepancy: Subtotal + Tax (₹{calculated_total:,.2f}) != stated total (₹{total_amount:,.2f})")
        msg = "Arithmetic audit failed: " + "; ".join(err_parts)

    return {
        "is_valid": is_valid,
        "calculated_subtotal": calculated_subtotal,
        "calculated_total": calculated_total,
        "subtotal_discrepancy": subtotal_diff,
        "total_discrepancy": total_diff,
        "line_errors": line_errors,
        "message": msg
    }
