# Notification System Implementation Guide

## Overview
This document outlines the final implementation of the notification system for the JMR Unified Dashboard. The system provides real-time alerts for new approval requests, functioning effectively both when the user is active and when the browser is minimized.

## Core Features

### 1. Robust Alerting (Two Modes)
*   **Active Dashboard**:
    *   **Visual**: The Bell Icon shakes and displays a red badge count.
    *   **Audio**: A "Ding-Dong" chime plays (requires user interaction unlock).
*   **Background / Minimized**:
    *   **System Toast**: A native Windows notification appears via the Browser's Service Worker.
    *   **Persistent**: The notification is configured to stay on screen (`requireInteraction: true`) until the user dismisses it.
    *   **Urgent**: It triggers a sound/vibrate event every time (`renotify: true`), ensuring new items are not missed.

### 2. Instant Polling
*   The dashboard polls the backend API every **3 seconds** (previously 10s).
*   This ensures near-instant notification delivery when new transaction data hits the database.

### 3. Implementation Details

#### **Service Worker (`public/sw.js`)**
*   Handles the background `push` events.
*   Manages the `notificationclick` event to focus the dashboard tab when the user clicks the alert.

#### **Frontend Logic (`app/test/page.tsx`)**
*   **Detection**: Compares incoming Transaction IDs against a tracked set of "Seen IDs".
*   **Trigger**:
    *   If `New ID` found -> Trigger Alert.
    *   If `Count` increases (without specific ID) -> Trigger Fallback Alert.
*   **Configuration**:
    ```javascript
    reg.showNotification("Time for new update", {
        body: "New approval requests pending",
        icon: "/jmr-logo.png",
        tag: "jmr-approval",    // Groups notifications
        renotify: true,         // Alerts again for new data
        requireInteraction: true // Sticky (won't auto-close)
    });
    ```

#### **Backend (`app/api/test/route.ts`)**
*   **Status**: Production Ready.
*   **Mock Data**: Detection logic supports dynamic IDs, but all simulation/mock data generation has been removed. The system expects real data from the backend integration.

## Usage & Limitations

### **1. Enable Alerts**
*   On first load, the user must click the **"Enable Alerts"** button (top right header) to grant browser permissions. This is a one-time requirement.

### **2. Minimized vs. Closed**
*   **Minimized**: ✅ **WORKS**. If the browser window is minimized to the taskbar or hidden behind other apps (Excel/Outlook), the Service Worker will still fire the Toast Notification.
*   **Closed**: ❌ **DOES NOT WORK**. If the browser tab or the entire browser application is Quit/Closed, the polling script stops running. The tab **must be open** (even if hidden) for notifications to function.

## Critical Setup
*   Ensure **`public/jmr-logo.png`** exists for the notification icon to render correctly.
*   Ensure Windows **Focus Assist / Do Not Disturb** is OFF to see the toasts immediately.

---
*Last Updated: Dec 2025*
