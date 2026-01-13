# 🎓 The Unified Supervisor Cockpit: A Deep Dive

Welcome, class! 🍎 Today, we're going to explore the inner workings of the **Unified Supervisor Cockpit**. Think of this application as a "Mission Control" center where bank supervisors can approve transactions from various banking systems (like **OBBRN** and **FCUBS**) all in one place.

## 🏗️ The Big Picture: Architecture

We recently refactored the application to use a **Modular Adapter Architecture**.
Imagine we are building a universal remote control.
*   **The Remote (Frontend)**: It has buttons like "Approve" and "View". It doesn't care *how* the TV turns on, it just sends a signal.
*   **The Adapters (Backend Logic)**: These are the hidden circuits that know exactly how to talk to a Sony TV (OBBRN) vs. a Samsung TV (FCUBS).

### Key Components

1.  **Frontend (`app/test/page.tsx`)**: The dashboard UI. It fetches data, shows tables, and handles user clicks.
2.  **API Routes (`app/api/test/...`)**: The middlemen. They receive requests from the frontend and pass them to the right "Adapter".
3.  **System Resolver (`lib/systems/resolver.ts`)**: The traffic cop. It looks at the request (e.g., "System: OBBRN") and picks the right tool for the job.
4.  **Adapters (`lib/systems/...`)**: The experts. `obbrn.ts` knows how to handle OBBRN; `fcubs.ts` knows FCUBS.

---

## 🔄 Workflow 1: Loading the Dashboard

When a supervisor opens the page, here is what happens:

1.  **The Ask**: The Frontend calls `GET /api/test`.
2.  **The Fetch**: The Backend uses our `httpClient` to call the `CUSTOMER_SERVICE_API_PENDING`.
3.  **The Transformation**: The raw data from the bank's API comes in all shapes and sizes. We **map** it into a standard format (`Approval` interface) so the Frontend always knows what to expect (e.g., `txnId`, `amount`, `status`).
4.  **The Display**: The Frontend takes this clean list and renders the table rows.

---

## 🔍 Workflow 2: Viewing Details

What happens when you click the "View" (Eye) icon?

1.  **Frontend**: Sends a request to `POST /api/test/details`. It sends the `system` name and an ID (like `ejLogId` for OBBRN or `acc/brn` for FCUBS).
2.  **Resolver**: "Oh, this is an **OBBRN** request. `ObbrnAdapter`, you take this!"
3.  **ObbrnAdapter**:
    *   **Step 1 (Auth)**: It logs in to `SECSRV001` to get a "View Token".
    *   **Step 2 (Fetch)**: It uses that token to ask for the "EJ Log" (Electronic Journal details).
4.  **Frontend**: Receives the data and shows it in the **Details Modal**. We even compare fields to highlight changes in blue!

---

## ✅ Workflow 3: "Approve Now"

This is the big moment. The supervisor clicks **"Approve Now"**.

1.  **Frontend**:
    *   Sets `isApproving = true` (Spinning wheel appears ⏳).
    *   Calls `POST /api/test/approve` with the transaction info.
2.  **Resolver**: Directs the traffic to the correct adapter.
3.  **ObbrnAdapter (The Complex One)**:
    *   **Step 1 (Fetch)**: It grabs the details *again* to ensure we have the latest data.
    *   **Step 2 (Build Payload)**: It constructs a strict "Approval Packet" containing `functionCode`, `txnRefNumber`, etc.
    *   **Step 3 (Auth)**: It logs in *again*, but this time as `SRVBRANCHCOMMON` (the "Approver" role).
    *   **Step 4 (Execute)**: It sends the approval packet to the `OBBRN_APPROVE_URL`.
4.  **FcubsAdapter (The Simple One)**:
    *   It simply bundles the account details and posts them to `FCUBS_AUTHORIZE_ACC_URL`.
5.  **Conclusion**: The API replies "Success", the spinner stops, the modal closes, and the list refreshes! 

---

## 📂 Project Structure Guide

*   **`app/test/page.tsx`**: The main brain of the Frontend. Contains the Dashboard UI, Search/Filter logic, and Modal logic.
*   **`lib/config.ts`**: The vault. Holds all our URLs and secrets (loaded from `.env.local`).
*   **`lib/http-client.ts`**: Our custom browser. It wraps `fetch` to handle errors and SSL settings consistently.
*   **`lib/systems/`**:
    *   `adapter-interface.ts`: The rulebook (Every adapter *must* have `fetchDetails` and `executeAction`).
    *   `resolver.ts`: The factory that picks the right file.
    *   `obbrn.ts` & `fcubs.ts`: The actual logic for each system.

And that is how the Unified Supervisor Cockpit works! Any questions? 🙋‍♂️

---

## ➕ How to Extend: Adding a New Module

So, you want to add a **Cash Withdrawal** flow to OBBRN or a **Loan Approval** to FCUBS? Here is your cheat sheet!

### Scenario A: Adding a new Action to OBBRN or FCUBS
*Example: Adding "Cash Withdrawal" to OBBRN*

1.  **Update Config (`lib/config.ts`)**:
    *   If this new module has a specific API URL, add it here.
    ```typescript
    obbrn: {
        // ... existing config
        cashWithdrawalUrl: process.env.OBBRN_CASH_URL || '',
    }
    ```

2.  **Update the Adapter (`lib/systems/obbrn.ts`)**:
    *   Go to the `executeAction` method.
    *   Add a new case:
    ```typescript
    case 'CASH_WITHDRAWAL':
         return this.handleCashWithdrawal(payload);
    ```
    *   Implement the private method `handleCashWithdrawal` at the bottom of the class.

3.  **Frontend Button (`app/test/page.tsx`)**:
    *   Add a button that calls the generic API with your new action:
    ```typescript
    fetch('/api/test/approve', {
        body: JSON.stringify({
            system: 'OBBRN',
            action: 'CASH_WITHDRAWAL', // <--- This matches your switch case
            // ... other data
        })
    })
    ```

### Scenario B: Adding a Brand New System (e.g., "MANTRA")

1.  **Create the Adapter**:
    *   Copy `lib/systems/fcubs.ts` -> `lib/systems/mantra.ts`.
    *   Rename the class to `MantraAdapter`.
2.  **Register it**:
    *   Open `lib/systems/resolver.ts`.
    *   Add it to the list:
    ```typescript
    const adapters = {
        fcubs: new FcubsAdapter(),
        obbrn: new ObbrnAdapter(),
        mantra: new MantraAdapter(), // <--- New System
    };
    ```
3.  **Done!** Any request with `system: "MANTRA"` will now automatically go to your new file. Zero changes needed in the API routes! 🚀

---

## 🚀 Going to Production: Deployment Checklist

Ready to move this to a real server? Follow these steps to ensure a smooth liftoff.

### 1. Environment Secrets (`.env.production`)
Create a `.env.production` file on your server. **DO NOT** commit this to Git.
It should contain:
```bash
# API Endpoints (Real Server IPs)
CUSTOMER_SERVICE_API_PENDING="https://prod-api.bank.com/pending-items"
FCUBS_QUERY_ACC_URL="https://fcubs-prod.bank.com/query"
# ... other URLs

# SSL Security (IMPORTANT)
# Set to '1' (Strict) for Production with valid Certs.
# Only use '0' if you are using internal self-signed certs.
NODE_TLS_REJECT_UNAUTHORIZED="1"
```

### 2. Code Cleanup: Hardcoded Values
⚠️ **Critical Check**: Detailed adapters often have hardcoded headers for testing.
*   **Check `lib/systems/obbrn.ts`:** Look for `Host`, `Origin`, and `Referer` headers.
    *   *Current State*: Hardcoded to `192.168.3.59`.
    *   *Action*: Move these to `lib/config.ts` and read them from `process.env`.

### 3. Build & Run
On your server (Linux/Windows):
```bash
# 1. Install Dependencies
npm ci

# 2. Build the Application (Optimizes code)
npm run build

# 3. Start the Production Server
npm start
```

### 4. Process Management (PM2)
To keep the app running forever (even after crashes/restarts), use **PM2**:
```bash
# Install PM2
npm install -g pm2

# Start the app
pm2 start npm --name "approvals-cockpit" -- start
```
