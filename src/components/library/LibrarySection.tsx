import { useState } from 'react';
import { useMedia } from '@/contexts/MediaContext';
import { AudioCard } from './AudioCard';
import { RenameModal } from './modals/RenameModal';
import { CoverImageModal } from './modals/CoverImageModal';
import { VolumeModal } from './modals/VolumeModal';
import { TrimModal } from './modals/TrimModal';
import { DeleteConfirmModal } from './modals/DeleteConfirmModal';
import { AudioFile } from '@/types/media';
import { Music, Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LibrarySectionProps {
  onNavigateToConvert: () => void;
}

type ModalType = 'rename' | 'cover' | 'volume' | 'trim' | 'delete' | null;

export const LibrarySection = ({ onNavigateToConvert }: LibrarySectionProps) => {
  const { audioFiles, updateAudioFile, deleteAudioFile, downloadAudio, uploadCoverImage, isBackendConnected } = useMedia();
  const [selectedFile, setSelectedFile] = useState<AudioFile | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const openModal = (file: AudioFile, modal: ModalType) => {
    setSelectedFile(file);
    setActiveModal(modal);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedFile(null);
  };

  if (!isBackendConnected) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Backend Not Connected</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Make sure the backend server is running on port 3001
          </p>
        </div>
      </div>
    );
  }

  if (audioFiles.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Music className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-medium">No audio files yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Convert your first video to MP3 to start building your library
          </p>
        </div>
        <Button onClick={onNavigateToConvert} className="mt-2">
          <Upload className="mr-2 h-4 w-4" />
          Convert a Video
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Your Library</h2>
          <p className="text-muted-foreground">
            {audioFiles.length} audio file{audioFiles.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {audioFiles.map((file) => (
          <AudioCard
            key={file.id}
            audioFile={file}
            onRename={() => openModal(file, 'rename')}
            onChangeCover={() => openModal(file, 'cover')}
            onAdjustVolume={() => openModal(file, 'volume')}
            onTrim={() => openModal(file, 'trim')}
            onDownload={() => downloadAudio(file)}
            onDelete={() => openModal(file, 'delete')}
          />
        ))}
      </div>

      {/* Modals */}
      {selectedFile && (
        <>
          <RenameModal
            open={activeModal === 'rename'}
            onOpenChange={(open) => !open && closeModal()}
            currentName={selectedFile.name}
            onSave={(name) => updateAudioFile(selectedFile.id, { name })}
          />

          <CoverImageModal
            open={activeModal === 'cover'}
            onOpenChange={(open) => !open && closeModal()}
            currentImage={selectedFile.coverImage}
            audioFileId={selectedFile.id}
            audioFileName={selectedFile.name}
            onSave={(file) => uploadCoverImage(selectedFile.id, file)}
            onRemove={() => updateAudioFile(selectedFile.id, { coverImage: null })}
          />

          <VolumeModal
            open={activeModal === 'volume'}
            onOpenChange={(open) => !open && closeModal()}
            currentVolume={selectedFile.volume}
            currentNormalize={selectedFile.normalize}
            audioUrl={selectedFile.audioUrl}
            trimStart={selectedFile.trimStart}
            trimEnd={selectedFile.trimEnd}
            onSave={(volume, normalize) => updateAudioFile(selectedFile.id, { volume, normalize })}
          />

          <TrimModal
            open={activeModal === 'trim'}
            onOpenChange={(open) => !open && closeModal()}
            duration={selectedFile.duration}
            audioUrl={selectedFile.audioUrl}
            currentTrimStart={selectedFile.trimStart}
            currentTrimEnd={selectedFile.trimEnd}
            currentFadeIn={selectedFile.fadeIn}
            currentFadeOut={selectedFile.fadeOut}
            onSave={(trimStart, trimEnd, fadeIn, fadeOut) =>
              updateAudioFile(selectedFile.id, { trimStart, trimEnd, fadeIn, fadeOut })
            }
          />

          <DeleteConfirmModal
            open={activeModal === 'delete'}
            onOpenChange={(open) => !open && closeModal()}
            fileName={selectedFile.name}
            onConfirm={() => {
              deleteAudioFile(selectedFile.id);
              closeModal();
            }}
          />
        </>
      )}
    </div>
  );
};
