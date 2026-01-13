export const config = {
    general: {
        // Default to '0' (Allow Self-Signed) to match original behavior for local dev
        nodeTlsRejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED || '0',
        pendingApiUrl: process.env.CUSTOMER_SERVICE_API_PENDING || '',
        combineApiUrl: process.env.CUSTOMER_SERVICE_API_COMBINED || '',
    },
    fcubs: {
        queryAccUrl: process.env.FCUBS_QUERY_ACC_URL || '',
        authorizeAccUrl: process.env.FCUBS_AUTHORIZE_ACC_URL || '',
        branch: '000',
        userid: 'SYSTEM',
        entity: 'ENTITY_ID1',
        source: 'FCAT',
    },
    obbrn: {
        authUrl: process.env.OBBRN_AUTH_URL || '',
        ejLogUrl: process.env.OBBRN_EJ_LOG_URL || '',
        approveUrl: process.env.OBBRN_APPROVE_URL || '',
        defaultUser: process.env.OBBRN_USERNAME || '',
        defaultPassword: process.env.OBBRN_PASSWORD || '',
        appIdView: 'SECSRV001',
        appIdApprove: 'SRVBRANCHCOMMON',
        entityId: 'DEFAULTENTITY',
        sourceCode: 'FCUBS',
        headers: {}
    },
};
