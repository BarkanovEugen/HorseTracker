import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, Trash2, User, Phone, Mail, BookOpen, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertInstructorSchema, type Instructor, type InsertInstructor } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface InstructorStats {
  totalLessons: number;
  completedLessons: number;
  totalRevenue: number;
  averageRating?: number;
}

const SPECIALIZATIONS = [
  "прогулка",
  "иппотерапия", 
  "верховая езда новичок",
  "верховая езда опытный"
];

export default function InstructorsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);

  const form = useForm<InsertInstructor>({
    resolver: zodResolver(insertInstructorSchema),
    defaultValues: {
      name: "",
      phone: undefined,
      email: undefined,
      specialization: undefined,
      active: true,
    },
  });

  const { data: instructors = [], isLoading } = useQuery<Instructor[]>({
    queryKey: ["/api/instructors"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertInstructor) => apiRequest("POST", "/api/instructors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructors"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ description: "Инструктор успешно создан" });
    },
    onError: () => {
      toast({ description: "Ошибка создания инструктора", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertInstructor> }) =>
      apiRequest("PUT", `/api/instructors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructors"] });
      setIsDialogOpen(false);
      setEditingInstructor(null);
      form.reset();
      toast({ description: "Инструктор успешно обновлен" });
    },
    onError: () => {
      toast({ description: "Ошибка обновления инструктора", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/instructors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructors"] });
      toast({ description: "Инструктор успешно удален" });
    },
    onError: () => {
      toast({ description: "Ошибка удаления инструктора", variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertInstructor) => {
    if (editingInstructor) {
      updateMutation.mutate({ id: editingInstructor.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (instructor: Instructor) => {
    setEditingInstructor(instructor);
    form.reset({
      name: instructor.name,
      phone: instructor.phone || undefined,
      email: instructor.email || undefined,
      specialization: instructor.specialization || undefined,
      active: instructor.active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить этого инструктора?")) {
      deleteMutation.mutate(id);
    }
  };

  const openCreateDialog = () => {
    setEditingInstructor(null);
    form.reset({
      name: "",
      phone: undefined,
      email: undefined,
      specialization: undefined,
      active: true,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div className="p-6">Загрузка...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Инструкторы</h1>
          <p className="text-muted-foreground">Управление инструкторами и их статистикой</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} data-testid="button-create-instructor">
              <Plus className="h-4 w-4 mr-2" />
              Добавить инструктора
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingInstructor ? "Редактировать инструктора" : "Новый инструктор"}
              </DialogTitle>
              <DialogDescription>
                {editingInstructor ? "Обновите информацию об инструкторе" : "Добавьте нового инструктора в систему"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Имя</FormLabel>
                      <FormControl>
                        <Input placeholder="Введите имя инструктора" {...field} data-testid="input-instructor-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Телефон</FormLabel>
                        <FormControl>
                          <Input placeholder="+7 (xxx) xxx-xx-xx" {...field} value={field.value || ""} data-testid="input-instructor-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} value={field.value || ""} data-testid="input-instructor-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="specialization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Специализация</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-specialization">
                              <SelectValue placeholder="Выберите специализацию" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SPECIALIZATIONS.map((spec) => (
                              <SelectItem key={spec} value={spec}>
                                {spec}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </div>

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Активен</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Активные инструкторы доступны для назначения на занятия
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-instructor-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingInstructor ? "Обновить" : "Создать"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {instructors.map((instructor) => (
          <InstructorCard
            key={instructor.id}
            instructor={instructor}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {instructors.length === 0 && (
        <Card className="p-8 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Нет инструкторов</h3>
          <p className="text-muted-foreground mb-4">
            Начните с добавления первого инструктора в систему
          </p>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить инструктора
          </Button>
        </Card>
      )}
    </div>
  );
}

function InstructorCard({ 
  instructor, 
  onEdit, 
  onDelete 
}: { 
  instructor: Instructor; 
  onEdit: (instructor: Instructor) => void; 
  onDelete: (id: string) => void; 
}) {
  const { data: stats } = useQuery<InstructorStats>({
    queryKey: ["/api/instructors", instructor.id, "stats"],
  });

  return (
    <Card className="p-6 space-y-4" data-testid={`card-instructor-${instructor.id}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg" data-testid={`text-instructor-name-${instructor.id}`}>
            {instructor.name}
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant={instructor.active ? "default" : "secondary"}>
              {instructor.active ? "Активен" : "Неактивен"}
            </Badge>
            {instructor.specialization && (
              <Badge variant="outline">{instructor.specialization}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(instructor)} data-testid={`button-edit-${instructor.id}`}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(instructor.id)} data-testid={`button-delete-${instructor.id}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {instructor.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{instructor.phone}</span>
          </div>
        )}
        {instructor.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>{instructor.email}</span>
          </div>
        )}

      </div>

      {stats && (
        <div className="pt-4 border-t space-y-2">
          <h4 className="font-medium text-sm">Статистика</h4>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalLessons}</div>
              <div className="text-xs text-muted-foreground">Всего занятий</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.completedLessons}</div>
              <div className="text-xs text-muted-foreground">Проведено</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}