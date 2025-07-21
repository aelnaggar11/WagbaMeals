import { DeliverySlot } from '@shared/schema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DeliverySlotSelectorProps {
  value: DeliverySlot;
  onChange: (slot: DeliverySlot) => void;
  className?: string;
}

export default function DeliverySlotSelector({ value, onChange, className = "" }: DeliverySlotSelectorProps) {
  console.log('DeliverySlotSelector render:', { value });

  return (
    <div className={`${className}`}>
      <Select 
        value={value} 
        onValueChange={(selectedValue) => {
          console.log(`${selectedValue} option selected`);
          onChange(selectedValue as DeliverySlot);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select delivery time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="morning">Morning (09:00 - 12:00)</SelectItem>
          <SelectItem value="evening">Evening (18:00 - 21:00)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}