
import { createRoot } from 'react-dom/client';
import { makePersistedAdapter } from '@livestore/adapter-web';
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker';
import { LiveStoreProvider } from '@livestore/react';
import { unstable_batchedUpdates as batchUpdates } from 'react-dom';
import App from './App.tsx';
import './index.css';
import LiveStoreWorker from './livestore/livestore.worker?worker';
import { schema } from './livestore/schema';
import { migrateLegacyData } from './livestore/migration';

// Create the LiveStore adapter
const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
});

// Generate a store ID (you might want to make this configurable)
const storeId = 'galaxy-notes-store';

const AppWithLiveStore = () => (
  <LiveStoreProvider
    schema={schema}
    adapter={adapter}
    storeId={storeId}
    batchUpdates={batchUpdates}
    renderLoading={(stage) => (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0d] text-white">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Loading Galaxy Notes...</div>
          <div className="text-sm text-gray-400">Stage: {stage.stage}</div>
        </div>
      </div>
    )}
  >
    <App />
  </LiveStoreProvider>
);

createRoot(document.getElementById("root")!).render(<AppWithLiveStore />);
