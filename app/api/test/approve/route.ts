import { NextResponse } from 'next/server';

// Helper to disable SSL check for the provided local IPs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log("Approve Request Body:", body);
        const { system } = body;

        // Strict Routing based on System
        if (system && system.toUpperCase() === 'OBBRN') {
            return await handleObbrnApproval(body);
        } else {
            // Default to FCUBS for specific system 'FCUBS' or any other legacy default
            return NextResponse.json({ error: "FCUBS Approval is disabled in /test" }, { status: 400 });
        }

    } catch (error: any) {
        console.error("Approval workflow error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

// ==========================================
// OBBRN Workflow Implementation
// ==========================================
async function handleObbrnApproval(body: any) {
    const { ejLogId, brn } = body;

    if (!ejLogId) {
        return NextResponse.json({ error: "Missing EJ Log ID for OBBRN approval" }, { status: 400 });
    }

    console.log(`Starting OBBRN Approval Flow for Branch: ${brn || '000'}...`);

    // Step 1: Authenticate for VIEW access (to fetch payload details)
    const authUrl = 'https://192.168.3.59:8112/api-gateway/platojwtauth';
    console.log("Step 1: Authenticating for Details Fetch...");

    const viewAuthRes = await fetch(authUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'appId': 'SRVCMNTXN', // AppID for View
            'branchCode': brn || '000',
            'userId': 'TRAINEE2',
            'entityId': 'DEFAULTENTITY',
            'sourceCode': 'FCUBS'
        },
        body: JSON.stringify({ "username": "TRAINEE2", "password": "T3JhY2xlQDMyMQ==" })
    });

    if (!viewAuthRes.ok) throw new Error(`View Auth Failed: ${viewAuthRes.status}`);
    const viewAuthData = await viewAuthRes.json();
    const viewToken = viewAuthData.access_token || viewAuthData.token || viewAuthData.jwt;
    console.log("View Token (SRVCMNTXN):", viewToken);

    // Step 2: Fetch EJ Log Details
    const detailsUrl = `https://192.168.3.59:8112/api-gateway/obremo-srv-cmn-transaction-services/obremo-srv-cmn-transaction-services/web/v1/logging/getEJLogById?EJLogId=${ejLogId}`;
    console.log(`Step 2: Fetching Details from ${detailsUrl}`);

    const detailsRes = await fetch(detailsUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${viewToken}`,
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/json',
            'appId': 'SRVCMNTXN',
            'branchCode': brn || '000',
            'branchDate': '2024-04-12',
            'entityId': 'DEFAULTENTITY',
            'multiEntityAdmin': 'N',
            'userId': 'TRAINEE2'
        }
    });

    if (!detailsRes.ok) throw new Error(`Details Fetch Failed: ${detailsRes.status}`);
    const ejData = await detailsRes.json();
    const logData = ejData.data || ejData;

    // Extract Fields for Approval Payload
    const payload = {
        functionCode: logData.functionCode || "",
        subScreenClass: logData.subScreenClass || "",
        ejId: ejLogId, // Use the ID we have
        txnRefNumber: logData.txnRefNo || logData.txnRefNumber || "",
        supervisorId: "TRAINEE2"
    };

    console.log("Constructed Approval Payload:", payload);

    // Step 3: Authenticate for APPROVAL access (Fresh Token)
    console.log("Step 3: Authenticating for Approval...");
    const approveAuthRes = await fetch(authUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'appId': 'SRVBRANCHCOMMON', // AppID for Approval
            'branchCode': brn || '000',
            'userId': 'TRAINEE2',
            'entityId': 'DEFAULTENTITY',
            'sourceCode': 'FCUBS'
        },
        body: JSON.stringify({ "username": "TRAINEE2", "password": "T3JhY2xlQDMyMQ==" })
    });

    if (!approveAuthRes.ok) throw new Error(`Approve Auth Failed: ${approveAuthRes.status}`);

    // Debug Auth Response
    const cookieHeader = approveAuthRes.headers.get('set-cookie');
    console.log("Approve Auth Response Headers - Set-Cookie:", cookieHeader || "None");

    const approveAuthData = await approveAuthRes.json();
    console.log("Approve Auth Response Keys:", Object.keys(approveAuthData));

    const approveToken = approveAuthData.access_token || approveAuthData.token || approveAuthData.jwt;

    console.log("Approve Token Generated:", approveToken ? "YES" : "NO");
    console.log("Approve Token (SRVBRANCHCOMMON):", approveToken);

    // Step 4: Call Approve API
    const approveUrl = 'https://192.168.3.59:8112/api-gateway/obremo-srv-bcn-branchcommon-services/obremo-srv-bcn-branchcommon-services/authorizerApprove';
    console.log(`Step 4: Sending Approval to ${approveUrl}`);

    console.log("TxnRefNo from details:", logData.txnRefNo || logData.txnRefNumber);

    // Debug Payload
    console.log("Debugging Payload and Headers for Step 4:");
    const headers: any = {
        'Authorization': `Bearer ${approveToken}`,
        'Content-Type': 'application/json',
        'appId': 'SRVBRANCHCOMMON',
        'branchCode': brn || '000',
        'userId': 'TRAINEE2',
        'entityId': 'DEFAULTENTITY'
    };

    // If a cookie was returned during auth, generic Plato gateways might require it
    if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
        console.log("Examples: Attached Cookie from Auth response to Approval request");
    }

    console.log("Full Headers (Unmasked):", JSON.stringify(headers, null, 2));

    const finalRes = await fetch(approveUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!finalRes.ok) {
        const errText = await finalRes.text();
        throw new Error(`Approval API Failed: ${finalRes.status} - ${errText}`);
    }

    const finalData = await finalRes.json();
    return NextResponse.json({ success: true, data: finalData });
}


