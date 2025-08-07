import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Client } from "@shared/schema";

interface ClientAutocompleteProps {
  value?: string;
  onValueChange: (name: string, phone?: string) => void;
  placeholder?: string;
  onPhoneChange?: (phone: string) => void;
  className?: string;
}

export function ClientAutocomplete({ 
  value = "", 
  onValueChange, 
  placeholder = "Выберите клиента...",
  onPhoneChange,
  className
}: ClientAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [newClientName, setNewClientName] = React.useState("");
  const [newClientPhone, setNewClientPhone] = React.useState("");
  
  const queryClient = useQueryClient();

  // Search clients query
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['/api/clients/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) {
        return fetch('/api/clients').then(res => res.json());
      }
      return fetch(`/api/clients/search?q=${encodeURIComponent(searchQuery)}`).then(res => res.json());
    },
    enabled: open || !!searchQuery
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (clientData: { name: string; phone?: string }) => {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create client');
      }
      
      return response.json();
    },
    onSuccess: (newClient: Client) => {
      // Update cache
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients/search'] });
      
      // Select the new client
      onValueChange(newClient.name, newClient.phone || undefined);
      onPhoneChange?.(newClient.phone || "");
      
      // Reset form
      setNewClientName("");
      setNewClientPhone("");
      setShowCreateForm(false);
      setOpen(false);
    }
  });

  const handleClientSelect = (client: Client) => {
    onValueChange(client.name, client.phone || undefined);
    onPhoneChange?.(client.phone || "");
    setOpen(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Check if the search query matches any existing client
      const existingClient = filteredClients.find((client: Client) => 
        client.name.toLowerCase() === searchQuery.toLowerCase()
      );
      
      if (existingClient) {
        handleClientSelect(existingClient);
      } else {
        // Just set the name, client will be created when lesson is saved
        onValueChange(searchQuery.trim(), undefined);
        setOpen(false);
      }
    }
  };

  const handleCreateClient = () => {
    if (newClientName.trim()) {
      createClientMutation.mutate({
        name: newClientName.trim(),
        phone: newClientPhone.trim() || undefined
      });
    }
  };

  const filteredClients = clients.filter((client: Client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.phone && client.phone.includes(searchQuery))
  );

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("justify-between", className)}
            data-testid="client-autocomplete-trigger"
          >
            {value || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Поиск клиентов..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
              onKeyDown={handleInputKeyDown}
              data-testid="client-search-input"
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Клиент не найден
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Нажмите Enter - "{searchQuery}" будет создан при сохранении занятия
                  </p>
                </div>
              </CommandEmpty>
              
              {!showCreateForm ? (
                <>
                  <CommandGroup>
                    {isLoading ? (
                      <CommandItem disabled>Загрузка...</CommandItem>
                    ) : (
                      filteredClients.map((client: Client) => (
                        <CommandItem
                          key={client.id}
                          value={client.name}
                          onSelect={() => handleClientSelect(client)}
                          className="cursor-pointer"
                          data-testid={`client-option-${client.id}`}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === client.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{client.name}</span>
                            {client.phone && (
                              <span className="text-sm text-muted-foreground">
                                {client.phone}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))
                    )}
                  </CommandGroup>
                  

                </>
              ) : (
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-client-name">Имя клиента *</Label>
                    <Input
                      id="new-client-name"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Введите имя клиента"
                      data-testid="new-client-name-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="new-client-phone">Телефон</Label>
                    <Input
                      id="new-client-phone"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      placeholder="+7 (999) 123-45-67"
                      data-testid="new-client-phone-input"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreateClient}
                      disabled={!newClientName.trim() || createClientMutation.isPending}
                      size="sm"
                      data-testid="confirm-create-client"
                    >
                      {createClientMutation.isPending ? "Создание..." : "Создать"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewClientName("");
                        setNewClientPhone("");
                      }}
                      size="sm"
                      data-testid="cancel-create-client"
                    >
                      Отмена
                    </Button>
                  </div>
                  
                  {createClientMutation.isError && (
                    <p className="text-sm text-destructive">
                      Ошибка создания клиента
                    </p>
                  )}
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}