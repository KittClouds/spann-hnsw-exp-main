
import { useAtom } from 'jotai';
import { FolderIcon, Home } from 'lucide-react';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { currentFolderPathAtom, foldersAtom, getBreadcrumbsFromPath } from '@/lib/store';

export function NoteBreadcrumb() {
  const [currentPath, setCurrentPath] = useAtom(currentFolderPathAtom);
  const [folders] = useAtom(foldersAtom);
  
  const breadcrumbs = getBreadcrumbsFromPath(currentPath, folders);
  
  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <BreadcrumbItem key={crumb.path}>
            {index === breadcrumbs.length - 1 ? (
              <BreadcrumbPage className="flex items-center gap-1">
                {index === 0 ? (
                  <Home className="h-3 w-3" />
                ) : (
                  <FolderIcon className="h-3 w-3" />
                )}
                {crumb.name}
              </BreadcrumbPage>
            ) : (
              <BreadcrumbLink 
                onClick={() => setCurrentPath(crumb.path)}
                className="flex items-center gap-1 cursor-pointer"
              >
                {index === 0 ? (
                  <Home className="h-3 w-3" />
                ) : (
                  <FolderIcon className="h-3 w-3" />
                )}
                {crumb.name}
              </BreadcrumbLink>
            )}
            
            {index < breadcrumbs.length - 1 && (
              <BreadcrumbSeparator />
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
