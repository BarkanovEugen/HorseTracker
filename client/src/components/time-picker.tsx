import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TimePicker({ value, onChange, placeholder = "Выберите время" }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [tempHour, setTempHour] = useState<string>("");
  const [tempMinute, setTempMinute] = useState<string>("");

  // Parse current value when popover opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && value) {
      const timeMatch = value.match(/T(\d{2}):(\d{2})/);
      if (timeMatch) {
        setTempHour(timeMatch[1]);
        setTempMinute(timeMatch[2]);
      }
    } else if (isOpen) {
      // Set default time if no value
      const now = new Date();
      setTempHour(now.getHours().toString().padStart(2, '0'));
      const minutes = now.getMinutes();
      setTempMinute(minutes >= 30 ? "30" : "00");
    }
    setOpen(isOpen);
  };

  const handleApply = () => {
    if (tempHour && tempMinute !== "") {
      // If we have an existing date part, keep it. Otherwise use today
      let dateString = "";
      if (value && value.includes('T')) {
        dateString = value.split('T')[0];
      } else {
        const today = new Date();
        dateString = today.toISOString().split('T')[0];
      }
      
      const newValue = `${dateString}T${tempHour.padStart(2, '0')}:${tempMinute.padStart(2, '0')}`;
      onChange(newValue);
    }
    setOpen(false);
  };

  // Format display value
  const displayValue = value ? 
    (() => {
      const date = new Date(value);
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
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
            data-testid="time-picker-input"
          />
          <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="text-sm font-medium">Выберите время</div>
          
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
              disabled={!tempHour || tempMinute === ""}
              className="flex-1"
              data-testid="apply-time-button"
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