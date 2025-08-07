import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Plus, Edit, Trash2, Clock, Users, DollarSign } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLessonSchema, type Lesson, type Horse } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useCanEdit } from "@/hooks/use-permissions";
import { format, startOfDay, endOfDay, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { z } from "zod";

const lessonTypes = [
  { value: "прогулка", label: "Прогулка" },
  { value: "иппотерапия", label: "Иппотерапия" },
  { value: "верховая езда новичок", label: "Верховая езда (новичок)" },
  { value: "верховая езда опытный", label: "Верховая езда (опытный)" }
];

const lessonStatuses = [
  { value: "scheduled", label: "Запланировано", color: "bg-blue-500" },
  { value: "completed", label: "Завершено", color: "bg-green-500" },
  { value: "cancelled", label: "Отменено", color: "bg-red-500" }
];

// Extended form schema with additional validation
const lessonFormSchema = insertLessonSchema.extend({
  lessonDate: z.string().min(1, "Выберите дату и время"),
  price: z.string().min(1, "Укажите цену"),
  duration: z.string().min(1, "Укажите продолжительность")
});

type LessonFormData = z.infer<typeof lessonFormSchema>;

interface LessonWithHorse extends Lesson {
  horse?: Horse;
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [viewMode, setViewMode] = useState<"day" | "month">("month");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = useCanEdit();

  const form = useForm<LessonFormData>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      clientName: "",
      clientPhone: "",
      lessonType: "",
      horseId: "",
      lessonDate: "",
      duration: "60",
      price: "",
      status: "scheduled",
      notes: ""
    }
  });

  const { data: lessons = [], isLoading: lessonsLoading } = useQuery<LessonWithHorse[]>({
    queryKey: ['/api/lessons'],
  });

  const { data: horses = [], isLoading: horsesLoading } = useQuery<Horse[]>({
    queryKey: ['/api/horses'],
  });

  const createLessonMutation = useMutation({
    mutationFn: async (data: LessonFormData) => {
      const lessonData = {
        ...data,
        lessonDate: data.lessonDate,
        price: data.price,
        duration: data.duration
      };
      
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lessonData)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create lesson');
      }
      return response.json();
    },
    onSuccess: (newLesson) => {
      queryClient.invalidateQueries({ queryKey: ['/api/lessons'] });
      queryClient.refetchQueries({ queryKey: ['/api/lessons'] });
      console.log('Created lesson:', newLesson);
      setShowDialog(false);
      setEditingLesson(null);
      form.reset();
      toast({
        title: "Занятие создано",
        description: "Новое занятие успешно добавлено в календарь",
      });
    }
  });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: LessonFormData }) => {
      const lessonData = {
        ...data,
        lessonDate: data.lessonDate,
        price: data.price,
        duration: data.duration
      };
      
      const response = await fetch(`/api/lessons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lessonData)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update lesson');
      }
      return response.json();
    },
    onSuccess: (updatedLesson) => {
      queryClient.invalidateQueries({ queryKey: ['/api/lessons'] });
      queryClient.refetchQueries({ queryKey: ['/api/lessons'] });
      console.log('Updated lesson:', updatedLesson);
      setShowDialog(false);
      setEditingLesson(null);
      form.reset();
      toast({
        title: "Занятие обновлено",
        description: "Данные занятия успешно сохранены",
      });
    }
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/lessons/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete lesson');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lessons'] });
      toast({
        title: "Занятие удалено",
        description: "Занятие успешно удалено из календаря",
      });
    }
  });

  const selectedDayLessons = lessons.filter(lesson => {
    const lessonDate = new Date(lesson.lessonDate);
    const isSame = isSameDay(lessonDate, selectedDate);
    console.log('Filtering lesson:', lesson.clientName, 'Date:', lessonDate, 'Selected:', selectedDate, 'Same day:', isSame);
    return isSame;
  }).sort((a, b) => new Date(a.lessonDate).getTime() - new Date(b.lessonDate).getTime());

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setViewMode("day");
    }
  };

  const handleCreateLesson = () => {
    form.reset({
      clientName: "",
      clientPhone: "",
      lessonType: "",
      horseId: "",
      lessonDate: format(selectedDate, "yyyy-MM-dd'T'HH:mm"),
      duration: "60",
      price: "",
      status: "scheduled",
      notes: ""
    });
    setEditingLesson(null);
    setShowDialog(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    form.reset({
      clientName: lesson.clientName,
      clientPhone: lesson.clientPhone || "",
      lessonType: lesson.lessonType,
      horseId: lesson.horseId,
      lessonDate: format(new Date(lesson.lessonDate), "yyyy-MM-dd'T'HH:mm"),
      duration: lesson.duration,
      price: lesson.price,
      status: lesson.status,
      notes: lesson.notes || ""
    });
    setEditingLesson(lesson);
    setShowDialog(true);
  };

  const onSubmit = (data: LessonFormData) => {
    if (editingLesson) {
      updateLessonMutation.mutate({ id: editingLesson.id, data });
    } else {
      createLessonMutation.mutate(data);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = lessonStatuses.find(s => s.value === status);
    return statusConfig ? (
      <Badge className={`${statusConfig.color} text-white`}>
        {statusConfig.label}
      </Badge>
    ) : null;
  };

  const getLessonTypeLabel = (type: string) => {
    return lessonTypes.find(t => t.value === type)?.label || type;
  };

  if (lessonsLoading || horsesLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-48"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-300 rounded"></div>
            <div className="h-96 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Календарь занятий</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1 rounded ${viewMode === "month" 
                ? "bg-white dark:bg-gray-600 shadow" 
                : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Месяц
            </button>
            <button
              onClick={() => setViewMode("day")}
              className={`px-3 py-1 rounded ${viewMode === "day" 
                ? "bg-white dark:bg-gray-600 shadow" 
                : "text-gray-600 dark:text-gray-400"
              }`}
            >
              День
            </button>
          </div>
          
          {canEdit && (
            <Button onClick={handleCreateLesson} data-testid="add-lesson-button">
              <Plus className="w-4 h-4 mr-2" />
              Добавить занятие
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>
              {format(selectedDate, "LLLL yyyy", { locale: ru })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              locale={ru}
              modifiers={{
                hasLesson: lessons.map(lesson => new Date(lesson.lessonDate))
              }}
              modifiersClassNames={{
                hasLesson: "bg-blue-100 text-blue-900 font-semibold"
              }}
              className="rounded-md border w-full"
            />
          </CardContent>
        </Card>

        {/* Lessons for selected day */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                Занятия на {format(selectedDate, "d MMMM", { locale: ru })}
              </span>
              <span className="text-sm font-normal text-gray-500">
                {selectedDayLessons.length} занятий
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedDayLessons.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>На этот день занятий не запланировано</p>
                  {canEdit && (
                    <Button 
                      variant="outline" 
                      onClick={handleCreateLesson}
                      className="mt-3"
                    >
                      Добавить занятие
                    </Button>
                  )}
                </div>
              ) : (
                selectedDayLessons.map((lesson) => {
                  const horse = horses.find(h => h.id === lesson.horseId);
                  return (
                    <div
                      key={lesson.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">
                              {format(new Date(lesson.lessonDate), "HH:mm")}
                            </span>
                            <span className="text-sm text-gray-600">
                              ({lesson.duration} мин)
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span>{lesson.clientName}</span>
                            {lesson.clientPhone && (
                              <span className="text-sm text-gray-600">
                                • {lesson.clientPhone}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {getLessonTypeLabel(lesson.lessonType)}
                            </span>
                            <span className="text-sm text-gray-600">
                              • {horse?.name || "Лошадь не найдена"}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-gray-500" />
                            <span>{lesson.price} ₽</span>
                            {getStatusBadge(lesson.status)}
                          </div>
                          
                          {lesson.notes && (
                            <p className="text-sm text-gray-600">{lesson.notes}</p>
                          )}
                        </div>
                        
                        {canEdit && (
                          <div className="flex gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditLesson(lesson)}
                              data-testid={`edit-lesson-${lesson.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteLessonMutation.mutate(lesson.id)}
                              className="text-red-600 hover:text-red-700"
                              data-testid={`delete-lesson-${lesson.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lesson Form Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingLesson ? "Редактировать занятие" : "Новое занятие"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Имя клиента *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="lesson-client-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="clientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Телефон</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="lesson-client-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lessonType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип занятия *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="lesson-type-select">
                            <SelectValue placeholder="Выберите тип занятия" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {lessonTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="horseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Лошадь *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="lesson-horse-select">
                            <SelectValue placeholder="Выберите лошадь" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {horses.map(horse => (
                            <SelectItem key={horse.id} value={horse.id}>
                              {horse.name} ({horse.breed})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="lessonDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дата и время *</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} data-testid="lesson-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Продолжительность (мин) *</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="lesson-duration" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Цена (₽) *</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="lesson-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="lesson-status-select">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {lessonStatuses.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Примечания</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="lesson-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={createLessonMutation.isPending || updateLessonMutation.isPending}
                  data-testid="save-lesson-button"
                >
                  {editingLesson ? "Сохранить" : "Создать"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}