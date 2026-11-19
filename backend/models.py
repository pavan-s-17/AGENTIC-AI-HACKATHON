from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict

class ExtractedLineItem(BaseModel):
    item_code: str = Field(..., description="Item or SKU code")
    description: str = Field(..., description="Product or service description")
    qty: float = Field(..., description="Quantity billed on invoice")
    unit_price: float = Field(..., description="Unit price per item in INR")
    line_total: float = Field(..., description="Total line amount (qty * unit_price)")

class ExtractedInvoice(BaseModel):
    vendor_name: str = Field(..., description="Vendor company name")
    gstin: str = Field(..., description="15-character GSTIN number of vendor")
    invoice_number: str = Field(..., description="Invoice reference number")
    invoice_date: str = Field(..., description="Invoice date in YYYY-MM-DD or readable format")
    po_number: str = Field(..., description="Purchase order reference number")
    line_items: List[ExtractedLineItem] = Field(default_factory=list, description="List of line items")
    subtotal: float = Field(..., description="Subtotal amount before tax")
    tax_amount: float = Field(..., description="Total tax (GST / CGST+SGST/IGST)")
    total_amount: float = Field(..., description="Grand total amount in INR")

class AgentTraceStep(BaseModel):
    step: str
    title: str
    status: str  # PASS, FAIL, WARNING, INFO
    detail: str
    timestamp: Optional[str] = None

class LineItemMatchResult(BaseModel):
    item_code: str
    description: str
    po_qty: Optional[float] = None
    grn_qty: Optional[float] = None
    inv_qty: float
    po_price: Optional[float] = None
    inv_price: float
    price_variance_pct: Optional[float] = None
    qty_status: str  # MATCH, MISMATCH_SHORT_DELIVERY, NOT_IN_PO
    price_status: str  # MATCH, WITHIN_TOLERANCE, MISMATCH
    remarks: str

class MatchDetails(BaseModel):
    po_number: str
    grn_number: Optional[str] = None
    po_total: Optional[float] = None
    inv_total: float
    items: List[LineItemMatchResult] = Field(default_factory=list)
    overall_qty_match: bool = True
    overall_price_match: bool = True

class ExceptionItem(BaseModel):
    code: str
    title: str
    severity: str  # CRITICAL, WARNING
    description: str

class ProcessInvoiceResponse(BaseModel):
    id: Optional[int] = None
    invoice_number: str
    vendor_name: str
    gstin: str
    po_number: str
    invoice_date: str
    subtotal: float
    tax_amount: float
    total_amount: float
    status: str  # QUEUED_FOR_PAYMENT, EXCEPTION_HOLD, DUPLICATE_BLOCKED, APPROVED_FOR_PAYMENT
    extracted: ExtractedInvoice
    match_details: MatchDetails
    exceptions: List[ExceptionItem]
    drafted_email: Optional[str] = None
    agent_trace: List[AgentTraceStep]
    file_name: Optional[str] = None
    created_at: Optional[str] = None

class DashboardKPIs(BaseModel):
    total_processed: int
    queued_for_payment: int
    exceptions_on_hold: int
    duplicates_blocked: int
    approved_for_payment: int

class InvoiceListResponse(BaseModel):
    kpis: DashboardKPIs
    invoices: List[Dict[str, Any]]
