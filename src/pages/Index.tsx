import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { TabNavigation } from '@/components/layout/TabNavigation';
import { ConvertSection } from '@/components/convert/ConvertSection';
import { LibrarySection } from '@/components/library/LibrarySection';
import { StudioSection } from '@/components/studio/StudioSection';
import { MediaProvider, useMedia } from '@/contexts/MediaContext';
import { StudioProvider } from '@/contexts/StudioContext';
import { Helmet } from 'react-helmet-async';

const DashboardContent = () => {
  const [activeTab, setActiveTab] = useState<'convert' | 'library' | 'studio'>('convert');
  const { audioFiles } = useMedia();

  return (
    <>
      <Helmet>
        <title>Smart Media Converter - Video to MP3</title>
        <meta
          name="description"
          content="Convert video files to high-quality MP3 audio. Edit, trim, and manage your media library with ease."
        />
      </Helmet>

      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          libraryCount={audioFiles.length}
        />

        <main className="flex-1">
          <div className="container py-8 px-4 md:px-6">
            {activeTab === 'convert' && <ConvertSection />}
            {activeTab === 'library' && (
              <LibrarySection onNavigateToConvert={() => setActiveTab('convert')} />
            )}
            {activeTab === 'studio' && <StudioSection />}
          </div>
        </main>

        <footer className="border-t border-border py-6">
          <div className="container px-4 md:px-6">
            <p className="text-center text-sm text-muted-foreground">
              Smart Media Converter — Convert, edit, and manage your audio files
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

const Index = () => {
  return (
    <MediaProvider>
      <StudioProvider>
        <DashboardContent />
      </StudioProvider>
    </MediaProvider>
  );
};

export default Index;
