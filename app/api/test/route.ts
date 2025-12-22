// app/api/test/route.ts
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const systemParam = searchParams.get('system');
    const moduleParam = searchParams.get('module');

    // Case: OBBRN + Cash Deposit (New Requirement)
    if (systemParam === 'OBBRN' && moduleParam === 'Cash Deposit') {
        // Use Env var or Fallback to the specific URL provided in instructions
        const obbrnUrl = process.env.CUSTOMER_SERVICE_API_OBBRN || "http://192.168.3.245:8002/customer-service/api/v1/log/ejb";

        if (!obbrnUrl) { // Should not happen with fallback
            return NextResponse.json(
                { error: "OBBRN API URL not configured" },
                { status: 500 }
            );
        }
        // const obbrnUrl = "http://localhost:3000/mock-obbrn"; // For local testing if needed

        try {
            console.log(`Fetching OBBRN data from: ${obbrnUrl}`);
            const res = await fetch(obbrnUrl, { cache: "no-store" });

            if (!res.ok) {
                throw new Error(`OBBRN Fetch failed: ${res.status} ${res.statusText}`);
            }

            const data = await res.json();

            // Map OBBRN data structure to Approval interface
            const formatted = data.map((item: any) => ({
                sourceSystem: "OBBRN",
                module: "Cash Deposit",
                txnId: item.TXN_REF_NO || item.ID || `TXN-${Math.random()}`,
                accountNumber: item.ACCOUNT_NUMBER || "N/A",
                customerName: item.USER_ID || "Unknown", // Schema has USER_ID but no CUST_NAME, using USER_ID or placeholder
                amount: item.TXN_AMOUNT || 0,
                branch: item.TXN_BRN_CODE || item.ACCOUNT_BRANCH || "000",
                status: item.TXN_STATUS || "Pending",
                ageMinutes: 0, // Could calculate from TXN_TIME_RECEIVED vs Now
                priority: "Normal",
                initiator: item.USER_ID || "System",
                timestamp: item.TXN_TIME_RECEIVED || new Date().toISOString(),
                brn: item.TXN_BRN_CODE || "000",
                acc: item.ACCOUNT_NUMBER || "N/A",
                ejLogId: item.ID // ID needed for detailed view
            }));

            return NextResponse.json(formatted);

        } catch (err: any) {
            console.error("OBBRN API Error:", err);
            return NextResponse.json(
                { error: "Failed to fetch OBBRN data", details: [err.message] },
                { status: 500 }
            );
        }
    }

    // Default Case: Existing Logic (e.g. for FCUBS or (All))
    // URL: http://192.168.3.245:8002/customer-service/api/v1/customers/pending
    const apiUrl = process.env.CUSTOMER_SERVICE_API_PENDING;

    if (!apiUrl) {
        return NextResponse.json({ error: "API URL not configured" }, { status: 500 });
    }

    const urls = [apiUrl];

    let data = null;
    const errors: string[] = [];

    for (const url of urls) {
        try {
            console.log(`Attempting to fetch from: ${url}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const res = await fetch(url, {
                cache: "no-store",
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (res.ok) {
                data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    // Debug logging removed
                }
                break; // Success, exit loop
            } else {
                const msg = `Failed to fetch from ${url}: ${res.status} ${res.statusText}`;
                console.warn(msg);
                errors.push(msg);
            }
        } catch (err: any) {
            const msg = `Error fetching from ${url}: ${err.message || err}`;
            console.warn(msg);
            errors.push(msg);
        }
    }

    if (!data) {
        console.warn("All fetch attempts failed. Using fallback MOCK data.");
        // Mock Data for Testing/Offline Mode
        data = [];
    }

    try {
        // Convert customer JSON -> approval-like structure (placeholders)
        const formatted = data.map((c: any) => ({
            sourceSystem: c.sourceSystem || "FCUBS",        // placeholder
            module: c.module || "CUSTOMER",                 // placeholder
            txnId: c.txnId || c.CUST_AC_NO || "N/A",        // use customer ID as txn
            accountNumber: c.CUST_AC_NO || "N/A",          // Map Customer No to Account No as requested
            customerName: c.AC_DESC || "Unknown",
            amount: 0,                                      // placeholder
            branch: c.BRANCH_CODE || "",
            status: c.AUTH_STAT || "U",
            ageMinutes: 5,                                  // placeholder
            priority: "Normal",                             // placeholder
            initiator: c.MAKER_ID || "SYSTEM",
            timestamp: c.MAKER_DT_STAMP || new Date().toISOString(),
            // Restore brn/acc with robust mapping to ensure approval workflow has correct data
            brn: c.BRANCH_CODE || c.LOCAL_BRANCH || c.BR || c.branch || c.ST_BRANCH || c.BRANCH || c.COD_BRANCH || c.BRN || "000",
            acc: c.CUST_AC_NO || c.CUSTOMER_NO || c.acc || "N/A"
        }));

        return NextResponse.json(formatted);
    } catch (err) {
        console.error("Data mapping error:", err);
        return NextResponse.json(
            { error: "Failed to map data structure" },
            { status: 500 }
        );
    }
}
