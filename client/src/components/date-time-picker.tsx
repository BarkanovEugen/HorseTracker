import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DateTimePicker({ value, onChange, placeholder = "Выберите дату и время" }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [tempDate, setTempDate] = useState<string>("");
  const [tempHour, setTempHour] = useState<string>("");
  const [tempMinute, setTempMinute] = useState<string>("");

  // Parse current value when popover opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      if (value) {
        const [datePart, timePart] = value.split('T');
        setTempDate(datePart);
        if (timePart) {
          const [hour, minute] = timePart.split(':');
          setTempHour(hour);
          setTempMinute(minute);
        }
      } else {
        // Set default values
        const now = new Date();
        setTempDate(format(now, 'yyyy-MM-dd'));
        setTempHour(now.getHours().toString().padStart(2, '0'));
        const minutes = now.getMinutes();
        setTempMinute(minutes >= 30 ? "30" : "00");
      }
    }
    setOpen(isOpen);
  };

  const handleApply = () => {
    if (tempDate && tempHour && tempMinute !== "") {
      const newValue = `${tempDate}T${tempHour.padStart(2, '0')}:${tempMinute.padStart(2, '0')}`;
      onChange(newValue);
    }
    setOpen(false);
  };

  // Format display value
  const displayValue = value ? 
    (() => {
      const date = new Date(value);
      return format(date, 'd MMMM yyyy, HH:mm', { locale: ru });
    })() : "";

  // Generate hour options
  const hours = Array.from({ length: 24 }, (_, i) => 
    i.toString().padStart(2, '0')
  );

  // Minute options (only 00 and 30)
  const minutes = ["00", "30"];

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={displayValue}
            placeholder={placeholder}
            readOnly
            className="cursor-pointer pr-10"
            data-testid="datetime-picker-input"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <Calendar className="h-4 w-4 text-gray-400" />
            <Clock className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="text-sm font-medium">Выберите дату и время</div>
          
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400">Дата</label>
            <Input
              type="date"
              value={tempDate}
              onChange={(e) => setTempDate(e.target.value)}
              data-testid="date-input"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Часы</label>
              <Select value={tempHour} onValueChange={setTempHour}>
                <SelectTrigger data-testid="hour-select">
                  <SelectValue placeholder="ЧЧ" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {hours.map(hour => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Минуты</label>
              <Select value={tempMinute} onValueChange={setTempMinute}>
                <SelectTrigger data-testid="minute-select">
                  <SelectValue placeholder="ММ" />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map(minute => (
                    <SelectItem key={minute} value={minute}>
                      {minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={handleApply}
              disabled={!tempDate || !tempHour || tempMinute === ""}
              className="flex-1"
              data-testid="apply-datetime-button"
            >
              Применить
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Отмена
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}