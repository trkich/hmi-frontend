export const environment = {
  production: true,
  apiBaseUrl: 'https://hmi-backend.azurewebsites.net',
  aiApiBaseUrl: 'https://tke-agentic-ai.azurewebsites.net',
  entraId: {
    tenantId: '93307a6e-8ace-43b0-82cb-808486fdd761', // Tvoj Tenant ID
    clientId: 'fcc16c18-a4ec-47ac-8fe0-7744c442e2f7', // Tvoj Client ID
    scope: 'User.Read', // Microsoft Graph scope for reading user profile
  },
};

