import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log("Approve Request Body:", body);
        const { brn, acc } = body;

        if (!brn || !acc) {
            return NextResponse.json({ error: "Missing brn or acc" }, { status: 400 });
        }

        // Step 1: Fetch Full Record Details
        // Updated URL to include CustomerAccountService based on the POST URL pattern
        const queryBaseUrl = process.env.CUSTOMER_ACCOUNT_QUERY_URL;
        if (!queryBaseUrl) {
            return NextResponse.json({ error: "Configuration Error: CUSTOMER_ACCOUNT_QUERY_URL missing" }, { status: 500 });
        }
        const queryUrl = `${queryBaseUrl}/brn/${brn}/acc/${acc}`;
        console.log(`Fetching from: ${queryUrl}`);

        const queryRes = await fetch(queryUrl, {
            cache: 'no-store',
            headers: {
                'BRANCH': brn, // Use the branch from the request, or '000' if that's what is expected
                'Entity': 'ENTITY_ID1',
                'Source': 'FCAT',
                'Userid': 'SYSTEM'
            }
        });

        if (!queryRes.ok) {
            const errorText = await queryRes.text();
            console.error(`Failed to fetch record: ${queryRes.status} ${queryRes.statusText}`, errorText);
            return NextResponse.json({
                error: `Failed to fetch record from ${queryUrl}: ${queryRes.status} ${queryRes.statusText}`,
                details: errorText
            }, { status: queryRes.status });
        }

        const queryData = await queryRes.json();

        // Step 2: Payload Transformation
        // Extract the content of the custaccount key directly.
        if (!queryData.custaccount) {
            console.error("Invalid response format: missing custaccount", queryData);
            return NextResponse.json({ error: "Invalid response format: missing custaccount" }, { status: 500 });
        }

        const payload = queryData.custaccount;

        // Step 3: Authorize Record (POST)
        const authUrl = process.env.CUSTOMER_ACCOUNT_AUTH_URL;
        if (!authUrl) {
            return NextResponse.json({ error: "Configuration Error: CUSTOMER_ACCOUNT_AUTH_URL missing" }, { status: 500 });
        }
        console.log(`Authorizing at: ${authUrl}`);

        const authRes = await fetch(authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'BRANCH': '000',
                'Entity': 'ENTITY_ID1',
                'Source': 'FCAT',
                'Userid': 'SYSTEM'
            },
            body: JSON.stringify(payload)
        });

        if (!authRes.ok) {
            const errorText = await authRes.text();
            console.error(`Authorization failed: ${authRes.status} ${authRes.statusText}`, errorText);
            return NextResponse.json({ error: `Authorization failed: ${authRes.status} ${authRes.statusText}`, details: errorText }, { status: authRes.status });
        }

        // The response might be JSON or text, handle safely
        let authData;
        const authResText = await authRes.text();
        try {
            authData = JSON.parse(authResText);
        } catch (e) {
            authData = { message: authResText };
        }

        return NextResponse.json({ success: true, data: authData });

    } catch (error: any) {
        console.error("Approval workflow error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
