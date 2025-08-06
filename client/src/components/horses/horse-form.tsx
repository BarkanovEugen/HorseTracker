import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insertHorseSchema, type InsertHorse, type Horse, type Device } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCanEdit } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface HorseFormProps {
  open: boolean;
  horse?: Horse;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function HorseForm({ open, horse, onClose, onSuccess }: HorseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = useCanEdit();
  const isEditing = !!horse;

  // Don't render form if user can't edit
  if (!canEdit) {
    return null;
  }

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InsertHorse>({
    resolver: zodResolver(insertHorseSchema),
    defaultValues: {
      name: "",
      breed: "",
      age: "",
      deviceId: "",
      imageUrl: "",
      markerColor: "#22c55e",
      status: "active",
    },
  });

  // Reset form when horse prop changes
  useEffect(() => {
    if (horse) {
      reset({
        name: horse.name,
        breed: horse.breed,
        age: horse.age,
        deviceId: horse.deviceId,
        imageUrl: horse.imageUrl || "",
        markerColor: horse.markerColor || "#22c55e",
        status: horse.status,
      });
    } else {
      reset({
        name: "",
        breed: "",
        age: "",
        deviceId: "",
        imageUrl: "",
        markerColor: "#22c55e",
        status: "active",
      });
    }
  }, [horse, reset]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertHorse) => {
      const response = await apiRequest('POST', '/api/horses', data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['/api/horses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      toast({
        title: "Лошадь добавлена",
        description: "Лошадь была успешно добавлена в систему",
      });
      onSuccess?.();
      onClose();
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить лошадь",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertHorse) => {
      const response = await apiRequest('PUT', `/api/horses/${horse!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      // Force invalidate all related queries to ensure UI updates immediately
      queryClient.invalidateQueries({ 
        queryKey: ['/api/horses'], 
        refetchType: 'all' 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/locations'], 
        refetchType: 'all' 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/devices'], 
        refetchType: 'all' 
      });
      toast({
        title: "Лошадь обновлена",
        description: "Информация о лошади была успешно обновлена",
      });
      onSuccess?.();
      onClose();
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить информацию о лошади",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertHorse) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md h-[80vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle data-testid="horse-form-title">
            {isEditing ? 'Редактировать лошадь' : 'Добавить лошадь'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 flex flex-col">
          <div>
            <Label htmlFor="name">Имя лошади</Label>
            <Input
              id="name"
              {...register("name")}
              className={errors.name ? "border-red-500" : ""}
              data-testid="horse-name-input"
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="breed">Порода</Label>
            <Input
              id="breed"
              {...register("breed")}
              className={errors.breed ? "border-red-500" : ""}
              data-testid="horse-breed-input"
            />
            {errors.breed && (
              <p className="text-sm text-red-500 mt-1">{errors.breed.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="age">Возраст</Label>
            <Input
              id="age"
              type="number"
              {...register("age")}
              className={errors.age ? "border-red-500" : ""}
              data-testid="horse-age-input"
            />
            {errors.age && (
              <p className="text-sm text-red-500 mt-1">{errors.age.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="deviceId">ID устройства GPS</Label>
            <Select
              value={watch("deviceId") || ""}
              onValueChange={(value) => setValue("deviceId", value)}
            >
              <SelectTrigger 
                className={errors.deviceId ? "border-red-500" : ""}
                data-testid="horse-device-select"
              >
                <SelectValue placeholder="Выберите устройство из списка" />
              </SelectTrigger>
              <SelectContent>
                {devices
                  .filter(device => !device.horseId || device.horseId === horse?.id)
                  .map((device) => (
                    <SelectItem key={device.id} value={device.deviceId}>
                      {device.deviceId} (свободно)
                    </SelectItem>
                  ))}
                {devices
                  .filter(device => device.horseId && device.horseId !== horse?.id)
                  .map((device) => (
                    <SelectItem key={device.id} value={device.deviceId} disabled>
                      {device.deviceId} (занято)
                    </SelectItem>
                  ))}
                {devices.length === 0 && (
                  <SelectItem value="no-devices" disabled>
                    Нет доступных устройств
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.deviceId && (
              <p className="text-sm text-red-500 mt-1">{errors.deviceId.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="markerColor">Цвет маркера на карте</Label>
            <div className="flex items-center space-x-3">
              <input
                id="markerColor"
                type="color"
                value={watch("markerColor") || "#22c55e"}
                onChange={(e) => setValue("markerColor", e.target.value)}
                className="w-12 h-10 rounded-md border border-gray-300 cursor-pointer"
                data-testid="horse-marker-color-input"
              />
              <div className="flex-1">
                <Input
                  value={watch("markerColor") || ""}
                  onChange={(e) => setValue("markerColor", e.target.value)}
                  placeholder="#22c55e"
                  className={errors.markerColor ? "border-red-500" : ""}
                  data-testid="horse-marker-color-text-input"
                />
              </div>
            </div>
            {errors.markerColor && (
              <p className="text-sm text-red-500 mt-1">{errors.markerColor.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="imageUrl">URL изображения (необязательно)</Label>
            <Input
              id="imageUrl"
              {...register("imageUrl")}
              type="url"
              placeholder="https://..."
              className={errors.imageUrl ? "border-red-500" : ""}
              data-testid="horse-image-input"
            />
            {errors.imageUrl && (
              <p className="text-sm text-red-500 mt-1">{errors.imageUrl.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="status">Статус</Label>
            <Select
              value={watch("status")}
              onValueChange={(value) => setValue("status", value as "active" | "warning" | "offline")}
            >
              <SelectTrigger data-testid="horse-status-select">
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Активен</SelectItem>
                <SelectItem value="warning">Предупреждение</SelectItem>
                <SelectItem value="offline">Офлайн</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex space-x-2 pt-6 mt-auto border-t border-gray-200 dark:border-gray-700">
            <Button
              type="submit"
              className="flex-1"
              disabled={isPending}
              data-testid="submit-horse-form"
            >
              {isPending ? "Сохранение..." : (isEditing ? "Обновить" : "Добавить")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              data-testid="cancel-horse-form"
            >
              Отмена
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
