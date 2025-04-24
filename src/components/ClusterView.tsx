
import { useAtom } from 'jotai';
import { Button } from './ui/button';
import { Plus, Database } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { useState } from 'react';
import { clustersAtom, createCluster } from '@/lib/store';
import { toast } from 'sonner';

export function ClusterView() {
  const [clusters, setClusters] = useAtom(clustersAtom);
  const [isOpen, setIsOpen] = useState(false);
  const [newClusterTitle, setNewClusterTitle] = useState('');

  const handleCreateCluster = () => {
    if (!newClusterTitle.trim()) {
      toast.error('Please enter a cluster name');
      return;
    }

    const { cluster } = createCluster(newClusterTitle);
    setClusters(prev => [...prev, cluster]);
    setNewClusterTitle('');
    setIsOpen(false);
    toast.success('Cluster created successfully');
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      {clusters.length <= 1 ? (
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-galaxy-dark-accent flex items-center justify-center mx-auto">
            <Database className="w-10 h-10 text-[#7c5bf1]" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No clusters yet</h3>
          <p className="text-sm text-muted-foreground">
            Create your first cluster to organize related notes
          </p>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#7c5bf1] hover:bg-[#6b4ad5]">
                <Plus className="w-4 h-4 mr-2" />
                New Cluster
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Cluster</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Enter cluster name"
                  value={newClusterTitle}
                  onChange={(e) => setNewClusterTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateCluster();
                  }}
                />
                <Button
                  className="w-full bg-[#7c5bf1] hover:bg-[#6b4ad5]"
                  onClick={handleCreateCluster}
                >
                  Create Cluster
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="w-full">
          {/* Cluster list will be implemented here */}
        </div>
      )}
    </div>
  );
}
