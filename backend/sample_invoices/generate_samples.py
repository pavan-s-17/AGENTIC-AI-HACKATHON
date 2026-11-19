import os
import random
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps, ImageEnhance
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def create_messy_invoice_image(
    filename: str,
    vendor_name: str,
    vendor_gstin: str,
    vendor_email: str,
    invoice_number: str,
    invoice_date: str,
    po_number: str,
    item_code: str,
    description: str,
    qty: int,
    unit_price: float,
    line_total: float,
    subtotal: float,
    tax_amount: float,
    total_amount: float
):
    """Renders a realistic warehouse paper invoice with scan noise, camera tilt, and paper grain."""
    w, h = 1050, 1400
    img = Image.new("RGB", (w, h), color=(251, 249, 244))
    draw = ImageDraw.Draw(img)

    # Outer document border
    draw.rectangle([35, 35, w - 35, h - 35], outline=(190, 185, 175), width=2)

    # Header banner
    draw.rectangle([35, 35, w - 35, 110], fill=(235, 240, 248))
    draw.text((55, 52), f"TAX INVOICE  —  {vendor_name.upper()}", fill=(20, 35, 60))
    draw.text((55, 80), f"GSTIN: {vendor_gstin}  |  Email: {vendor_email}  |  State: Maharashtra (27)", fill=(70, 80, 95))

    # Invoice Meta block (Left & Right)
    draw.rectangle([55, 130, 520, 240], outline=(210, 205, 195), fill=(255, 255, 255))
    draw.text((70, 145), "ISSUED TO (BUYER):", fill=(40, 50, 70))
    draw.text((70, 170), "Acme Manufacturing Corp India Pvt Ltd", fill=(20, 20, 30))
    draw.text((70, 192), "Outer Ring Road, Bengaluru, Karnataka - 560103", fill=(70, 70, 80))
    draw.text((70, 214), "Buyer GSTIN: 29AAACA9999K1Z2", fill=(40, 70, 140))

    draw.rectangle([540, 130, w - 55, 240], outline=(210, 205, 195), fill=(255, 255, 255))
    draw.text((555, 145), "INVOICE PARTICULARS:", fill=(40, 50, 70))
    draw.text((555, 170), f"Invoice Number:  {invoice_number}", fill=(20, 20, 30))
    draw.text((555, 192), f"Invoice Date:    {invoice_date}", fill=(70, 70, 80))
    draw.text((555, 214), f"PO Reference #:  {po_number} (Consignment Delivery)", fill=(180, 50, 20))

    # Line Items Table Header
    table_top = 275
    draw.rectangle([55, table_top, w - 55, table_top + 36], fill=(35, 45, 65))
    draw.text((70, table_top + 10), "#", fill=(255, 255, 255))
    draw.text((110, table_top + 10), "Item / SKU Code", fill=(255, 255, 255))
    draw.text((310, table_top + 10), "Description", fill=(255, 255, 255))
    draw.text((660, table_top + 10), "Billed Qty", fill=(255, 255, 255))
    draw.text((770, table_top + 10), "Unit Price (INR)", fill=(255, 255, 255))
    draw.text((910, table_top + 10), "Total (INR)", fill=(255, 255, 255))

    # Item Row
    row_top = table_top + 36
    draw.rectangle([55, row_top, w - 55, row_top + 60], fill=(255, 255, 255), outline=(215, 210, 200))
    draw.text((70, row_top + 20), "1", fill=(30, 30, 40))
    draw.text((110, row_top + 20), item_code, fill=(20, 30, 60))
    draw.text((310, row_top + 20), description[:42], fill=(60, 60, 70))
    draw.text((680, row_top + 20), f"{qty}", fill=(20, 20, 30))
    draw.text((775, row_top + 20), f"Rs. {unit_price:,.2f}", fill=(30, 30, 40))
    draw.text((905, row_top + 20), f"Rs. {line_total:,.2f}", fill=(15, 25, 45))

    # Summary box
    summary_top = 400
    draw.rectangle([560, summary_top, w - 55, summary_top + 130], outline=(180, 175, 165), fill=(250, 252, 255))
    draw.text((580, summary_top + 15), f"Subtotal (INR):            Rs. {subtotal:,.2f}", fill=(50, 50, 60))
    draw.text((580, summary_top + 45), f"Integrated GST (18%):      Rs. {tax_amount:,.2f}", fill=(50, 50, 60))
    draw.line([570, summary_top + 75, w - 65, summary_top + 75], fill=(200, 200, 200), width=1)
    draw.text((580, summary_top + 90), f"Grand Total (INR):        Rs. {total_amount:,.2f}", fill=(20, 60, 140))

    # Split Delivery Dispatch Notes & Warehouse Stamp
    notes_top = 580
    draw.rectangle([55, notes_top, w - 55, notes_top + 100], fill=(248, 246, 240), outline=(210, 205, 195))
    draw.text((75, notes_top + 15), "DISPATCH & SHIPMENT SPLIT NOTE:", fill=(40, 50, 60))
    draw.text((75, notes_top + 40), f"- Dispatched under Contract {po_number} in 2 trailer loads per logistics schedule.", fill=(70, 75, 85))
    draw.text((75, notes_top + 65), f"- Dock Receiving bay recorded split arrivals under GRN-2024-005A (25) and GRN-2024-005B (15).", fill=(70, 75, 85))

    # Warehouse Stamp / Consignee Approval Stamp
    stamp_x, stamp_y = 120, 740
    draw.rectangle([stamp_x, stamp_y, stamp_x + 360, stamp_y + 80], outline=(40, 90, 180), width=3)
    draw.text((stamp_x + 20, stamp_y + 15), "ACME LOGISTICS INWARDING BAY", fill=(40, 90, 180))
    draw.text((stamp_x + 20, stamp_y + 45), "VERIFIED & ACCEPTED ON DOCK", fill=(40, 90, 180))

    # Subtle paper scan noise simulation
    pixels = img.load()
    for _ in range(12000):
        rx = random.randint(0, w - 1)
        ry = random.randint(0, h - 1)
        r, g, b = pixels[rx, ry]
        noise = random.randint(-18, 18)
        pixels[rx, ry] = (max(0, min(255, r + noise)), max(0, min(255, g + noise)), max(0, min(255, b + noise)))

    # Apply realistic warehouse camera tilt (~3.2 degrees)
    rotated = img.rotate(3.2, resample=Image.BICUBIC, expand=True, fillcolor=(242, 240, 235))

    # Slight contrast / brightness variance
    enhancer = ImageEnhance.Contrast(rotated)
    final_img = enhancer.enhance(0.96)

    final_img.save(filename, format="JPEG", quality=88, optimize=True)
    print(f"Generated realistic messy scan image: {filename}")

def create_invoice_pdf(
    filename: str,
    vendor_name: str,
    vendor_gstin: str,
    vendor_email: str,
    vendor_address: str,
    invoice_number: str,
    invoice_date: str,
    po_number: str,
    items: list,
    subtotal: float,
    tax_rate: float,
    tax_amount: float,
    total_amount: float,
    payment_terms: str = "Net 30 Days",
    notes: str = ""
):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1E293B'),
        fontName='Helvetica-Bold'
    )
    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#2563EB'),
        fontName='Helvetica-Bold'
    )
    meta_style = ParagraphStyle(
        'Meta',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.white,
        fontName='Helvetica-Bold'
    )
    cell_style = ParagraphStyle(
        'CellStyle',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#1E293B')
    )
    bold_cell = ParagraphStyle(
        'BoldCell',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0F172A'),
        fontName='Helvetica-Bold'
    )

    elements = []

    # Header section: Vendor info & TAX INVOICE title
    header_data = [
        [
            Paragraph(f"<b>{vendor_name}</b><br/>{vendor_address}<br/><b>GSTIN:</b> {vendor_gstin}<br/><b>Email:</b> {vendor_email}", meta_style),
            Paragraph(f"<font color='#2563EB'><b>TAX INVOICE</b></font><br/><b>Invoice #:</b> {invoice_number}<br/><b>Date:</b> {invoice_date}<br/><b>PO Ref #:</b> {po_number}", meta_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[3.5 * inch, 3.5 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))

    # Bill-To / Buyer Card
    buyer_data = [
        [
            Paragraph("<b>Billed To (Buyer):</b><br/>Acme Manufacturing Corp India Pvt Ltd<br/>SEZ Campus, Outer Ring Road, Bengaluru, Karnataka - 560103<br/><b>GSTIN:</b> 29AAACA9999K1Z2", meta_style),
            Paragraph(f"<b>Payment Terms:</b> {payment_terms}<br/><b>Place of Supply:</b> Karnataka (29)<br/><b>Reverse Charge:</b> No", meta_style)
        ]
    ]
    buyer_table = Table(buyer_data, colWidths=[4.5 * inch, 2.5 * inch])
    buyer_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(buyer_table)
    elements.append(Spacer(1, 15))

    # Line Items Table
    table_data = [
        [
            Paragraph("<b>#</b>", header_style),
            Paragraph("<b>Item Code</b>", header_style),
            Paragraph("<b>Description</b>", header_style),
            Paragraph("<b>Qty</b>", header_style),
            Paragraph("<b>Unit Price (₹)</b>", header_style),
            Paragraph("<b>Total (₹)</b>", header_style),
        ]
    ]

    for idx, item in enumerate(items, 1):
        table_data.append([
            Paragraph(str(idx), cell_style),
            Paragraph(item["item_code"], bold_cell),
            Paragraph(item["description"], cell_style),
            Paragraph(f"{item['qty']:,}", cell_style),
            Paragraph(f"₹{item['unit_price']:,.2f}", cell_style),
            Paragraph(f"₹{item['line_total']:,.2f}", bold_cell),
        ])

    items_table = Table(table_data, colWidths=[0.4 * inch, 1.4 * inch, 2.8 * inch, 0.6 * inch, 1.1 * inch, 1.1 * inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (3,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 15))

    # Summary Table (Subtotal, Tax, Total)
    summary_data = [
        ["Subtotal:", f"₹{subtotal:,.2f}"],
        [f"Integrated GST (IGST @ {int(tax_rate*100)}%):", f"₹{tax_amount:,.2f}"],
        ["Invoice Total (INR):", f"₹{total_amount:,.2f}"]
    ]
    summary_table = Table(summary_data, colWidths=[2.5 * inch, 1.5 * inch])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,-1), (-1,-1), 11),
        ('LINEABOVE', (0,-1), (-1,-1), 1.5, colors.HexColor('#1E293B')),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#EFF6FF')),
        ('TEXTCOLOR', (0,-1), (-1,-1), colors.HexColor('#1E3A8A')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))

    # Align summary table to the right
    wrapper_table = Table([["", summary_table]], colWidths=[3.0 * inch, 4.0 * inch])
    wrapper_table.setStyle(TableStyle([
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(wrapper_table)

    # Footer note
    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=10))
    footer_text = f"<b>Notes:</b> {notes or 'This is a computer-generated tax invoice. Remit payment to vendor HDFC Bank A/c No. 50200012345678, IFSC: HDFC0000123.'}<br/>Authorized Signatory: <i>Accounts & Finance Department</i>"
    elements.append(Paragraph(footer_text, meta_style))

    doc.build(elements)
    print(f"Generated invoice: {filename}")

def generate_all_samples():
    output_dir = os.path.dirname(__file__)

    # 1. Clean Match: PO-2024-001 (Tata Steel)
    create_invoice_pdf(
        filename=os.path.join(output_dir, "sample_1_clean_match.pdf"),
        vendor_name="Tata Steel Industrial Ltd",
        vendor_gstin="27AAACT2727Q1ZW",
        vendor_email="billing@tatasteel-example.com",
        vendor_address="Plot 45, MIDC Industrial Area, Pune, Maharashtra - 411018",
        invoice_number="INV-2024-001",
        invoice_date="2024-10-24",
        po_number="PO-2024-001",
        items=[
            {
                "item_code": "STL-ROD-12MM",
                "description": "High-Tensile TMT Steel Rebars 12mm Grade 550D",
                "qty": 50,
                "unit_price": 2400.0,
                "line_total": 120000.0
            }
        ],
        subtotal=120000.0,
        tax_rate=0.18,
        tax_amount=21600.0,
        total_amount=141600.0,
        notes="Clean match with PO-2024-001 and GRN-2024-001. All 50 units delivered."
    )

    # 2. Within-Tolerance Match: PO-2024-002 (Infosys Hardware)
    # Unit price is 65,800 vs PO 65,000 (+1.23% variance, within ±2% / ₹500 tolerance)
    create_invoice_pdf(
        filename=os.path.join(output_dir, "sample_2_tolerance_match.pdf"),
        vendor_name="Infosys Hardware Solutions",
        vendor_gstin="29AAACI4567M1ZV",
        vendor_email="ap-accounts@infosys-hardware.com",
        vendor_address="Electronics City Phase 1, Hosur Road, Bengaluru, Karnataka - 560100",
        invoice_number="INV-2024-002",
        invoice_date="2024-10-27",
        po_number="PO-2024-002",
        items=[
            {
                "item_code": "HW-DESK-I7",
                "description": "Dell OptiPlex Enterprise Workstation Core i7 32GB RAM",
                "qty": 10,
                "unit_price": 65800.0,
                "line_total": 658000.0
            }
        ],
        subtotal=658000.0,
        tax_rate=0.18,
        tax_amount=118440.0,
        total_amount=776440.0,
        notes="Includes minor component surcharge (+1.23% within standard commercial tolerance threshold)."
    )

    # 3. Quantity Mismatch (Short Delivery): PO-2024-003 (BHEL)
    # Ordered 100, GRN received only 75, but Invoice bills for full 100!
    create_invoice_pdf(
        filename=os.path.join(output_dir, "sample_3_quantity_mismatch.pdf"),
        vendor_name="Bharat Heavy Electricals Tech",
        vendor_gstin="07AAACB1234D1ZP",
        vendor_email="commercial@bheltech-sample.in",
        vendor_address="BHEL House, Siri Fort, New Delhi - 110049",
        invoice_number="INV-2024-003",
        invoice_date="2024-10-28",
        po_number="PO-2024-003",
        items=[
            {
                "item_code": "ELEC-CNT-32A",
                "description": "Industrial 3-Pole AC Contactor 32A 230V Coil",
                "qty": 100,
                "unit_price": 1500.0,
                "line_total": 150000.0
            }
        ],
        subtotal=150000.0,
        tax_rate=0.18,
        tax_amount=27000.0,
        total_amount=177000.0,
        notes="Billed for 100 units. Note: GRN-2024-003 receiving dock recorded only 75 units accepted."
    )

    # 4. Price & Arithmetic Discrepancy: PO-2024-004 (Reliance Packaging)
    # PO price is ₹450.00, Invoice charges ₹540.00 (+20% hike). Also math error: 200 * 540 = 108,000, but billed 118,000!
    create_invoice_pdf(
        filename=os.path.join(output_dir, "sample_4_price_mismatch.pdf"),
        vendor_name="Reliance Logistics & Packaging",
        vendor_gstin="24AAACR8888P1ZN",
        vendor_email="invoicing@rel-pack.com",
        vendor_address="GIDC Estate, Naroda, Ahmedabad, Gujarat - 382330",
        invoice_number="INV-2024-004",
        invoice_date="2024-10-30",
        po_number="PO-2024-004",
        items=[
            {
                "item_code": "PKG-BOX-HVY",
                "description": "Heavy Duty Double-Wall Corrugated Pallet Boxes",
                "qty": 200,
                "unit_price": 540.0,
                "line_total": 118000.0  # Calculation error in invoice
            }
        ],
        subtotal=118000.0,
        tax_rate=0.18,
        tax_amount=21240.0,
        total_amount=139240.0,
        notes="Unilateral raw material escalation (+20% over PO agreement) plus billing calculation variance."
    )

    # 5. Duplicate Invoice: Re-submission of INV-2024-001
    create_invoice_pdf(
        filename=os.path.join(output_dir, "sample_5_duplicate_invoice.pdf"),
        vendor_name="Tata Steel Industrial Ltd",
        vendor_gstin="27AAACT2727Q1ZW",
        vendor_email="billing@tatasteel-example.com",
        vendor_address="Plot 45, MIDC Industrial Area, Pune, Maharashtra - 411018",
        invoice_number="INV-2024-001",
        invoice_date="2024-10-24",
        po_number="PO-2024-001",
        items=[
            {
                "item_code": "STL-ROD-12MM",
                "description": "High-Tensile TMT Steel Rebars 12mm Grade 550D",
                "qty": 50,
                "unit_price": 2400.0,
                "line_total": 120000.0
            }
        ],
        subtotal=120000.0,
        tax_rate=0.18,
        tax_amount=21600.0,
        total_amount=141600.0,
        notes="Duplicate submission of invoice INV-2024-001 for PO-2024-001."
    )

    # 6. Messy Real-World Scan + Multi-GRN Split Delivery: PO-2024-005 (Tata Steel)
    # 40 beams @ ₹3,200 = ₹128,000 + 18% IGST = ₹151,040
    # Split delivery across GRN-2024-005A (25) + GRN-2024-005B (15) = 40 total
    create_messy_invoice_image(
        filename=os.path.join(output_dir, "sample_6_messy_scan.jpg"),
        vendor_name="Tata Steel Industrial Ltd",
        vendor_gstin="27AAACT2727Q1ZW",
        vendor_email="billing@tatasteel-example.com",
        invoice_number="INV-2024-005",
        invoice_date="2024-11-10",
        po_number="PO-2024-005",
        item_code="STL-BEAM-40",
        description="Structural ISMB Heavy Steel Beams 400mm Grade E250",
        qty=40,
        unit_price=3200.0,
        line_total=128000.0,
        subtotal=128000.0,
        tax_amount=23040.0,
        total_amount=151040.0
    )

if __name__ == "__main__":
    generate_all_samples()
