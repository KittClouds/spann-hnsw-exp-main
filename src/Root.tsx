
import React from 'react';
import { makePersistedAdapter } from '@livestore/adapter-web';
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker';
import { LiveStoreProvider } from '@livestore/react';
import App from './App';
import LiveStoreWorker from './livestore/livestore.worker?worker';
import { schema } from './livestore/schema';

console.log("Root component loading...");

const storeId = 'galaxy-notes-store';

console.log("Creating adapter...");
const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
});
console.log("Adapter created:", adapter);

// React 19 compatible batch function - since batching is automatic, we just execute the callback
const batchUpdates = (callback: () => void) => {
  console.log("batchUpdates called");
  callback();
};

export const Root: React.FC = () => {
  console.log("Root component rendering...");
  
  return (
    <LiveStoreProvider
      schema={schema}
      adapter={adapter}
      renderLoading={(stage) => {
        console.log("LiveStore loading stage:", stage);
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <div>Loading LiveStore ({stage.stage})...</div>
            </div>
          </div>
        );
      }}
      batchUpdates={batchUpdates}
      storeId={storeId}
    >
      <App />
    </LiveStoreProvider>
  );
};

console.log("Root component defined");
