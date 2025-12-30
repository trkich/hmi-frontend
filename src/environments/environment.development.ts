export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000',
  aiApiBaseUrl: 'http://localhost:7071',  
  entraId: {
    tenantId: '93307a6e-8ace-43b0-82cb-808486fdd761', // Tvoj Tenant ID
    clientId: 'fcc16c18-a4ec-47ac-8fe0-7744c442e2f7', // Tvoj Client ID
    scope: 'User.Read', // Microsoft Graph scope - change to custom scope once it's configured in Azure Portal
  },
};

