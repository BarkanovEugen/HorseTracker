import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Horse, Device } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import HorseCard from "@/components/horses/horse-card";
import HorseForm from "@/components/horses/horse-form";
import { useCanEdit } from "@/hooks/use-permissions";
import { Plus } from "lucide-react";

export default function Horses() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHorse, setEditingHorse] = useState<Horse | undefined>(undefined);
  const [viewingHorse, setViewingHorse] = useState<Horse | undefined>(undefined);
  const canEdit = useCanEdit();

  const { data: horses = [], isLoading: horsesLoading } = useQuery<Horse[]>({
    queryKey: ['/api/horses'],
  });

  const { data: devices = [], isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  const isLoading = horsesLoading || devicesLoading;

  // Combine horses with their devices
  const horsesWithDevices = horses.map(horse => {
    const device = devices.find(d => d.deviceId === horse.deviceId);
    return { horse, device };
  });

  const handleAddHorse = () => {
    setEditingHorse(undefined);
    setIsFormOpen(true);
  };

  const handleEditHorse = (horse: Horse) => {
    setEditingHorse(horse);
    setIsFormOpen(true);
  };

  const handleViewHorse = (horse: Horse) => {
    setViewingHorse(horse);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingHorse(undefined);
  };

  const handleCloseView = () => {
    setViewingHorse(undefined);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold" data-testid="horses-title">
            Управление Лошадьми
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Управление профилями лошадей и их устройствами GPS
          </p>
        </div>
        <Button 
          onClick={handleAddHorse}
          className="bg-primary hover:bg-primary/90"
          data-testid="add-horse-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить лошадь
        </Button>
      </div>

      {/* Horses Grid */}
      {horsesWithDevices.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🐎</div>
          <h3 className="text-xl font-semibold mb-2">Нет лошадей</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Добавьте первую лошадь для начала мониторинга
          </p>
          <Button onClick={handleAddHorse} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Добавить лошадь
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {horsesWithDevices.map(({ horse, device }) => (
            <HorseCard
              key={horse.id}
              horse={horse}
              device={device}
              onView={() => handleViewHorse(horse)}
              onEdit={() => handleEditHorse(horse)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Horse Form */}
      <HorseForm
        open={isFormOpen}
        horse={editingHorse}
        onClose={handleCloseForm}
        onSuccess={handleCloseForm}
      />

      {/* View Horse Details Dialog */}
      <Dialog open={!!viewingHorse} onOpenChange={(open) => !open && handleCloseView()}>
        <DialogOverlay />
        <DialogContent>
          {viewingHorse && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Детали лошади</h3>
                <Button variant="ghost" size="icon" onClick={handleCloseView}>
                  <span className="sr-only">Закрыть</span>
                  ×
                </Button>
              </div>
              
              {viewingHorse.imageUrl && (
                <img 
                  src={viewingHorse.imageUrl}
                  alt={viewingHorse.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}
              
              <div className="space-y-3">
                <div>
                  <strong>Имя:</strong> {viewingHorse.name}
                </div>
                <div>
                  <strong>Порода:</strong> {viewingHorse.breed}
                </div>
                <div>
                  <strong>Возраст:</strong> {viewingHorse.age} лет
                </div>
                <div>
                  <strong>ID устройства:</strong> {viewingHorse.deviceId}
                </div>
                <div>
                  <strong>Статус:</strong> {viewingHorse.status}
                </div>
                <div>
                  <strong>Дата добавления:</strong> {' '}
                  {new Date(viewingHorse.createdAt!).toLocaleDateString('ru-RU')}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
