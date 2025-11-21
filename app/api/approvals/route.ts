import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch") || "001";
    const moduleName = searchParams.get("module") || "PAY";

    // Simulate slight delay for realistic API behavior
    await new Promise(resolve => setTimeout(resolve, 300));

    const mockData = [
        {
            sourceSystem: "FCUBS",
            module: "CASA",
            txnId: "011-123456",
            accountNumber: "12345500001",
            customerName: "Sarah Hamh",
            amount: 150.00,
            branch: "Main Street",
            status: "Pending",
            ageMinutes: 80,
            priority: "High",
            initiator: "000-121001",
            timestamp: new Date(Date.now() - 80 * 60000).toISOString(),
        },
        {
            sourceSystem: "FCUBS",
            module: "CASA",
            txnId: "011-123457",
            accountNumber: "12345500002",
            customerName: "Bet Baharn",
            amount: 105.00,
            branch: "Main Street",
            status: "Pending",
            ageMinutes: 80,
            priority: "High",
            initiator: "000-121001",
            timestamp: new Date(Date.now() - 80 * 60000).toISOString(),
        },
        {
            sourceSystem: "OBBRN",
            module: "CASA",
            txnId: "011-123458",
            accountNumber: "12345500003",
            customerName: "Customer Name",
            amount: 77.00,
            branch: "Main Street",
            status: "Pending",
            ageMinutes: 40,
            priority: "High",
            initiator: "000-121001",
            timestamp: new Date(Date.now() - 40 * 60000).toISOString(),
        },
        {
            sourceSystem: "OBPM",
            module: "Loans",
            txnId: "011-123459",
            accountNumber: "12345500004",
            customerName: "John Smith",
            amount: 70.00,
            branch: "Main Street",
            status: "Pending",
            ageMinutes: 10,
            priority: "Normal",
            initiator: "000-121001",
            timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
        },
        {
            sourceSystem: "OBBRN",
            module: "Loans",
            txnId: "011-123460",
            accountNumber: "12345500005",
            customerName: "Customer Name",
            amount: 103.00,
            branch: "Main Street",
            status: "Pending",
            ageMinutes: 10,
            priority: "Normal",
            initiator: "000-121001",
            timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
        },
        {
            sourceSystem: "OBPM",
            module: "Loans",
            txnId: "011-123461",
            accountNumber: "12345500006",
            customerName: "John Smith",
            amount: 80.00,
            branch: "Main Street",
            status: "Pending",
            ageMinutes: 22,
            priority: "Normal",
            initiator: "000-121001",
            timestamp: new Date(Date.now() - 22 * 60000).toISOString(),
        }
    ];

    return NextResponse.json(mockData);
}
