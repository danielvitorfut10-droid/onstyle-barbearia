import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { BookingModal } from "./booking-modal";

type BookingContextValue = { openBooking: () => void };

const BookingContext = createContext<BookingContextValue>({ openBooking: () => {} });

export function useBooking() {
  return useContext(BookingContext);
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openBooking = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openBooking }), [openBooking]);

  return (
    <BookingContext.Provider value={value}>
      {children}
      <BookingModal open={open} onOpenChange={setOpen} />
    </BookingContext.Provider>
  );
}
