# Communication Component - AI Workflow Diagram

## Overview
This component provides a node-based workflow diagram for visualizing AI communication flow, similar to the React Flow implementation in the `hmi-ai-agents` project.

## Installation

To enable the diagram visualization, you need to install the ngDiagram package:

```bash
npm install ng-diagram
```

After installation, you'll need to:

1. **Import ngDiagram in your app configuration** (`src/app/app.config.ts`):
```typescript
import { provideNgDiagram } from 'ng-diagram';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... other providers
    provideNgDiagram(),
  ],
};
```

2. **Update the communication component** to use ngDiagram components:
   - Replace the placeholder div in `communication.component.html` with actual ngDiagram components
   - Import ngDiagram components in `communication.component.ts`
   - Initialize the diagram model with nodes and edges

## API Endpoints

The component expects the following backend API:

- **POST** `/api/start` - Starts the AI workflow orchestration
  - Request body: `{ telemetry: string, unitId?: string }`
  - Response: `{ instanceId: string, statusQueryGetUri?: string }`

- **GET** `/api/status/{instanceId}` - Get workflow status (optional, for polling)

## SignalR Integration (TODO)

Currently, the component uses polling for status updates. To implement real-time updates using SignalR:

1. Install `@microsoft/signalr`:
```bash
npm install @microsoft/signalr
```

2. Implement SignalR connection similar to the React implementation in `hmi-ai-agents/frontend/src/App.tsx`

3. Connect to SignalR hub using `/api/negotiate?instanceId={instanceId}` endpoint

## Workflow Steps

The diagram visualizes 7 workflow steps:
1. SENSING - 01 Sensing
2. REASONING - 02 Reasoning
3. DECIDING - 03 Deciding
4. ACTING - 04 Acting
5. ENABLEMENT - 05 Tech enablement
6. REPORTING - 06 Reporting
7. OPTIMIZATION - 07 Continuous optimization

Each step can have states:
- PENDING - Not started
- RUNNING - Currently executing
- DONE - Successfully completed
- FAILED - Execution failed

## Configuration

Update `src/environments/environment.ts` to point to your backend:
```typescript
apiBaseUrl: 'http://localhost:7071', // Azure Functions backend
```

## Next Steps

1. Install ng-diagram package
2. Implement ngDiagram integration in the component
3. Add SignalR support for real-time updates
4. Style nodes based on workflow state (RUNNING, DONE, FAILED)



