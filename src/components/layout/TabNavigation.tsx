import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Library } from 'lucide-react';

interface TabNavigationProps {
  activeTab: 'convert' | 'library';
  onTabChange: (tab: 'convert' | 'library') => void;
  libraryCount: number;
}

export const TabNavigation = ({
  activeTab,
  onTabChange,
  libraryCount,
}: TabNavigationProps) => {
  return (
    <div className="border-b border-border bg-card">
      <div className="container px-4 md:px-6">
        <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as 'convert' | 'library')}>
          <TabsList className="h-12 w-full justify-start gap-2 rounded-none border-none bg-transparent p-0">
            <TabsTrigger
              value="convert"
              className="relative h-12 rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Upload className="mr-2 h-4 w-4" />
              Convert
            </TabsTrigger>
            <TabsTrigger
              value="library"
              className="relative h-12 rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Library className="mr-2 h-4 w-4" />
              Library
              {libraryCount > 0 && (
                <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                  {libraryCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
};
