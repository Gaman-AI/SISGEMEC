import * as React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const ACCENTS = [
  { value: "emerald", label: "Emerald" },
  { value: "violet", label: "Violet" },
  { value: "blue", label: "Blue" },
  { value: "amber", label: "Amber" },
];

export default function ThemeAccentPicker() {
  const [accent, setAccent] = React.useState<string>(
    document.documentElement.getAttribute("data-accent") || localStorage.getItem("accent") || "emerald"
  );

  React.useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
    localStorage.setItem("accent", accent);
  }, [accent]);

  return (
    <Select value={accent} onValueChange={setAccent}>
      <SelectTrigger className="w-[130px]">
        <SelectValue placeholder="Acento" />
      </SelectTrigger>
      <SelectContent>
        {ACCENTS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
