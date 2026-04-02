"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { CalendarIcon, Check, Search, X, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EventData {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  requiredSACount: number | null;
  officeId: string | null;
  office: { id: string; name: string; code: string | null } | null;
  _count: { assignments: number };
  confirmedCount: number;
}

interface SAOption {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  college: string | null;
  program: string | null;
}

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EventData | null;
  onSaved: () => void;
}

export function EventFormDialog({
  open,
  onOpenChange,
  event,
  onSaved,
}: EventFormDialogProps) {
  const isEdit = !!event;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [requiredSACount, setRequiredSACount] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [loading, setLoading] = useState(false);

  // SA assignment
  const [saSearch, setSaSearch] = useState("");
  const [saResults, setSaResults] = useState<SAOption[]>([]);
  const [selectedSAs, setSelectedSAs] = useState<SAOption[]>([]);
  const [saSearchOpen, setSaSearchOpen] = useState(false);
  const [saSearching, setSaSearching] = useState(false);
  const [offices, setOffices] = useState<{ id: string; name: string }[]>([]);

  // Reset form
  useEffect(() => {
    if (open) {
      if (event) {
        setName(event.name);
        setDescription(event.description || "");
        setLocation(event.location || "");
        setStartDate(new Date(event.startDate));
        setEndDate(event.endDate ? new Date(event.endDate) : undefined);
        setRequiredSACount(event.requiredSACount?.toString() || "");
        setOfficeId(event.officeId || "");
      } else {
        setName("");
        setDescription("");
        setLocation("");
        setStartDate(undefined);
        setEndDate(undefined);
        setRequiredSACount("");
        setOfficeId("");
      }
      setSelectedSAs([]);
      setSaSearch("");
    }
  }, [open, event]);

  // Fetch offices
  useEffect(() => {
    if (open) {
      fetch("/api/offices?limit=100")
        .then((res) => res.json())
        .then((data) => {
          if (data.offices) setOffices(data.offices);
        })
        .catch(() => {});
    }
  }, [open]);

  const searchSAs = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSaResults([]);
        return;
      }
      setSaSearching(true);
      try {
        const res = await fetch(
          `/api/student-assistants?search=${encodeURIComponent(query)}&status=ACTIVE&limit=10`
        );
        const data = await res.json();
        if (data.assistants) {
          setSaResults(data.assistants);
        }
      } catch {
        setSaResults([]);
      } finally {
        setSaSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => searchSAs(saSearch), 300);
    return () => clearTimeout(timer);
  }, [saSearch, searchSAs]);

  const handleAddSA = (sa: SAOption) => {
    if (!selectedSAs.find((s) => s.id === sa.id)) {
      setSelectedSAs([...selectedSAs, sa]);
    }
    setSaSearch("");
    setSaResults([]);
    setSaSearchOpen(false);
  };

  const handleRemoveSA = (saId: string) => {
    setSelectedSAs(selectedSAs.filter((s) => s.id !== saId));
  };

  const handleSubmit = async () => {
    if (!name || !startDate) {
      toast.error("Event name and start date are required");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name,
        description: description || null,
        location: location || null,
        startDate: startDate.toISOString(),
        endDate: endDate ? endDate.toISOString() : null,
        requiredSACount: requiredSACount ? parseInt(requiredSACount, 10) : null,
        officeId: officeId || null,
      };

      const url = isEdit ? `/api/events/${event!.id}` : "/api/events";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save event");
      }

      const data = await res.json();
      const savedEvent = data.event;

      // Assign SAs if any selected
      if (selectedSAs.length > 0 && savedEvent) {
        await fetch(`/api/events/${savedEvent.id}/assignments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userIds: selectedSAs.map((sa) => sa.id),
            role: "Student Assistant",
          }),
        });
      }

      toast.success(isEdit ? "Event updated successfully" : "Event created successfully");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">
            {isEdit ? "Edit Event" : "Create New Event"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update event details and assignments."
              : "Fill in the event details below."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-3">
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="event-name">Event Name *</Label>
              <Input
                id="event-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., UMak Foundation Day"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="event-desc">Description</Label>
              <Textarea
                id="event-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Event description..."
                rows={3}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="event-loc">Location</Label>
              <Input
                id="event-loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., UMak Auditorium"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate
                        ? format(startDate, "MMM d, yyyy")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate
                        ? format(endDate, "MMM d, yyyy")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) =>
                        startDate ? date < startDate : false
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Required SA Count + Office */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sa-count">Required SA Count</Label>
                <Input
                  id="sa-count"
                  type="number"
                  min={0}
                  value={requiredSACount}
                  onChange={(e) => setRequiredSACount(e.target.value)}
                  placeholder="e.g., 10"
                />
              </div>
              <div className="space-y-2">
                <Label>Office</Label>
                <Select value={officeId} onValueChange={setOfficeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select office" />
                  </SelectTrigger>
                  <SelectContent>
                    {offices.map((office) => (
                      <SelectItem key={office.id} value={office.id}>
                        {office.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assign SAs */}
            <div className="space-y-2">
              <Label>Assign Student Assistants</Label>
              {selectedSAs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedSAs.map((sa) => (
                    <Badge
                      key={sa.id}
                      variant="secondary"
                      className="text-xs pr-1"
                    >
                      {sa.firstName} {sa.lastName}
                      <button
                        onClick={() => handleRemoveSA(sa.id)}
                        className="ml-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={saSearch}
                  onChange={(e) => {
                    setSaSearch(e.target.value);
                    setSaSearchOpen(true);
                  }}
                  onFocus={() => setSaSearchOpen(true)}
                  placeholder="Search SAs by name or email..."
                  className="pl-9"
                />
              </div>
              {saSearchOpen && saResults.length > 0 && (
                <div className="border rounded-lg mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900">
                  {saResults
                    .filter(
                      (sa) => !selectedSAs.find((s) => s.id === sa.id)
                    )
                    .map((sa) => (
                      <button
                        key={sa.id}
                        onClick={() => handleAddSA(sa)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                      >
                        <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">
                            {sa.firstName} {sa.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {sa.college || sa.email}
                          </p>
                        </div>
                      </button>
                    ))}
                  {saSearching && (
                    <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                      Searching...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !name || !startDate}
            className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
          >
            <Check className="mr-2 h-4 w-4" />
            {isEdit ? "Update Event" : "Create Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
