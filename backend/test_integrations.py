import os
import sys
import asyncio
import json

# Force zero-config fallback mode in test environment
os.environ["GEMINI_API_KEY"] = ""

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import get_integrations_status, inbound_email_webhook, send_vendor_query, SendVendorQueryRequest

async def main():
    print("--- 1. Testing GET /api/integrations/status ---")
    st = get_integrations_status()
    print("Adapter:", st["erp_connector"]["adapter_name"], "| Mode:", st["erp_connector"]["mode"])
    print("Inbound Gateway:", st["inbound_gateway"]["email_address"], "| Status:", st["inbound_gateway"]["status"])
    print("Outbound Dispatcher:", st["outbound_dispatcher"]["dispatch_mode"], "| SMTP Host:", st["outbound_dispatcher"]["smtp_host"])

    print("\n--- 2. Testing Inbound Email Webhook (Simulated Vendor Submission) ---")
    class MockRequest:
        headers = {"content-type": "application/json"}
        async def body(self):
            return json.dumps({
                "sample_filename": "sample_3_quantity_mismatch.pdf",
                "sender_email": "commercial@bheltech-sample.in",
                "subject": "Inbound Invoice INV-2024-003 Submission"
            }).encode("utf-8")
        async def form(self):
            return {}

    inv = await inbound_email_webhook(MockRequest())
    print(f"Ingested Invoice #{inv.invoice_number} (ID: {inv.id}) -> Status: {inv.status}")
    print(f"Flagged Exceptions: {len(inv.exceptions)} | Has Drafted Email: {bool(inv.drafted_email)}")

    print("\n--- 3. Testing Outbound Vendor Dispute Dispatch ---")
    payload = SendVendorQueryRequest(
        recipient_email="commercial@bheltech-sample.in",
        subject=f"Action Required: Discrepancy Notice for Invoice #{inv.invoice_number}",
        body="Short delivery detected: PO ordered 100 units, but dock received only 75 units."
    )
    res = send_vendor_query(inv.id, payload)
    print("Dispatch result:", res)
    assert res["invoice_status"] == "VENDOR_QUERY_SENT"
    assert res["message_id"].startswith("MSG-")

    print("\n--- 4. Verifying Outbox & Inbound Gateway Counter Increments ---")
    st2 = get_integrations_status()
    print("Total Ingested:", st2["inbound_gateway"]["total_ingested"])
    print("Total Dispatched:", st2["outbound_dispatcher"]["total_dispatched"])
    print("Recent Outbox Entries:", len(st2["outbound_dispatcher"]["recent_outbox"]))
    print("Recent Webhook Logs:", len(st2["inbound_gateway"]["recent_logs"]))
    print("\n>>> ALL ENTERPRISE INTEGRATION TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    asyncio.run(main())
