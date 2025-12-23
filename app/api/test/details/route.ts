
import { NextResponse } from 'next/server';

// Helper to disable SSL check for the provided local IPs
// Note: In production, use valid certs or a proper custom Agent.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { brn, acc, ejLogId, system } = body;

        // ==========================================
        // OBBRN Workflow: Authenticate & Fetch EJ Log
        // ==========================================
        if (system && system.toUpperCase() === 'OBBRN') {
            console.log("Processing OBBRN Details Request...");

            if (!ejLogId) {
                return NextResponse.json({ error: "Missing EJ Log ID for OBBRN record" }, { status: 400 });
            }

            // Step 1: Generate Authorization Token
            const authUrl = 'https://192.168.3.59:8112/api-gateway/platojwtauth';
            console.log(`Step 1: Authenticating with ${authUrl}`);

            const authRes = await fetch(authUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // Fixed content-type
                    'appId': 'SRVCMNTXN',
                    'branchCode': '000',
                    'userId': 'TRAINEE2',
                    'entityId': 'DEFAULTENTITY',
                    'sourceCode': 'FCUBS'
                },
                body: JSON.stringify({
                    "username": "TRAINEE2",
                    "password": "T3JhY2xlQDMyMQ=="
                })
            });

            if (!authRes.ok) {
                const errorText = await authRes.text();
                console.error(`Auth Failed: ${authRes.status}`, errorText);
                return NextResponse.json({ error: `Authentication Failed: ${authRes.status}`, details: errorText }, { status: authRes.status });
            }

            // Parse Token
            // Expected: JSON with access_token or simply a token string
            const authData = await authRes.json();
            const token = authData.access_token || authData.token || authData.jwt || (typeof authData === 'string' ? authData : null);

            if (!token) {
                console.error("Token not found in auth response:", authData);
                return NextResponse.json({ error: "Failed to retrieve access token" }, { status: 500 });
            }

            // Step 2: Fetch Details using EJ Log ID (Fetched from frontend/OBBRN list)
            const detailsUrl = `https://192.168.3.59:8112/api-gateway/obremo-srv-cmn-transaction-services/obremo-srv-cmn-transaction-services/web/v1/logging/getEJLogById?EJLogId=${ejLogId}`;
            console.log(`Step 3: Fetching EJ Log Details from ${detailsUrl}`);

            const detailsRes = await fetch(detailsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'Connection': 'keep-alive',
                    'Content-Type': 'application/json',
                    'Host': '192.168.3.59:8112',
                    'Origin': 'https://192.168.3.59:8102',
                    'Referer': 'https://192.168.3.59:8102/',
                    'appId': 'SRVCMNTXN',
                    'branchCode': '000',
                    'branchDate': '2024-04-12', // Hardcoded as per requirement
                    'entityId': 'DEFAULTENTITY',
                    'multiEntityAdmin': 'N',
                    'userId': 'TRAINEE2'
                }
            });

            if (!detailsRes.ok) {
                const detailsError = await detailsRes.text();
                console.error(`EJ Log Fetch Failed: ${detailsRes.status}`, detailsError);
                return NextResponse.json({ error: `EJ Log Fetch Failed: ${detailsRes.status}`, details: detailsError }, { status: detailsRes.status });
            }

            const ejData = await detailsRes.json();
            return NextResponse.json({ success: true, data: ejData });
        }

        // ==========================================
        // FCUBS Workflow: Just Fetch Details
        // ==========================================
        if (!brn || !acc) {
            return NextResponse.json({ error: "Missing brn or acc for FCUBS details" }, { status: 400 });
        }

        const queryUrl = `http://192.168.3.245:8002/CustomerAccountService/CustomerAccount/QueryCustAcc/brn/${brn}/acc/${acc}`;
        console.log(`Fetching FCUBS details from: ${queryUrl}`);

        const queryRes = await fetch(queryUrl, {
            cache: 'no-store',
            headers: {
                'BRANCH': brn,
                'Entity': 'ENTITY_ID1',
                'Source': 'FCAT',
                'Userid': 'SYSTEM'
            }
        });

        if (!queryRes.ok) {
            const errorText = await queryRes.text();
            console.error(`FCUBS Fetch Failed: ${queryRes.status}`, errorText);
            return NextResponse.json({
                error: `Failed to fetch record from ${queryUrl}: ${queryRes.status} ${queryRes.statusText}`,
                details: errorText
            }, { status: queryRes.status });
        }

        const queryData = await queryRes.json();
        return NextResponse.json({ success: true, data: queryData });

    } catch (error: any) {
        console.error("Details fetch error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
