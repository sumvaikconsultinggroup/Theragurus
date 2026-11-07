export const clinic = {
  name: "TheraGurus",
  provider: "Trapti Agarwal, OTR/L",
  timezone: "America/Los_Angeles",
  address: "24355 Lyons Ave, Suite 130, Santa Clarita, CA 91321",
  phone: "+1-661-625-6322",
  email: "theragurus@gmail.com",
  hours: "9 am–2 pm and 5 pm–8 pm Pacific",
};

export const visitModes = {
  phone: "Phone call",
  clinic: "Santa Clarita clinic",
  virtual: "Online session",
  home: "Concierge visit",
} as const;
export type VisitMode = keyof typeof visitModes;
export type BookingService = {
  id: string;
  name: string;
  category: "individual" | "workplace";
  description: string;
  modes: VisitMode[];
  image: string;
  price: number | null;
  source: string;
  options?: string[];
};

export const bookingServices: BookingService[] = [
  {
    id: "free-consultation",
    name: "Free phone consultation",
    category: "individual",
    description:
      "Talk through your questions and find the right place to begin.",
    modes: ["phone"],
    image: "/trapti.png",
    price: 0,
    source: "https://theragurus.com/",
  },
  {
    id: "holistic-pelvic-floor-therapy",
    name: "Pelvic floor therapy",
    category: "individual",
    description:
      "Personalized support for pelvic health, core strength, pregnancy, and postpartum recovery.",
    modes: ["clinic", "virtual"],
    image: "/movement-wellness.jpg",
    price: null,
    source: "https://theragurus.com/holistic-pelvic-floor-therapy/",
  },
  {
    id: "premium-concierge-services",
    name: "Premium concierge care",
    category: "individual",
    description:
      "Explore private, ongoing pelvic wellness care and tailored recovery programs.",
    modes: ["home", "clinic", "virtual"],
    image: "/mindful-wellness.jpg",
    price: null,
    source: "https://theragurus.com/premium-concierge-services/",
    options: [
      "Help me choose",
      "Concierge Pelvic Wellness Membership",
      "Postpartum Elite Recovery Program",
      "Pelvic Executive Program",
    ],
  },
  {
    id: "pelvic-yoga-classes",
    name: "Pelvic yoga classes",
    category: "individual",
    description:
      "Ask about founder-led group movement, pelvic-aware yoga, and breathwork.",
    modes: ["clinic", "virtual"],
    image: "/hero-wellness.jpg",
    price: null,
    source: "https://theragurus.com/pelvic-yoga-classes/",
  },
  {
    id: "virtual-consultations",
    name: "Online consultation",
    category: "individual",
    description:
      "Discuss care from home. The clinic confirms eligibility for your location.",
    modes: ["virtual"],
    image: "/journey-woodland.jpg",
    price: null,
    source: "https://theragurus.com/",
  },
  {
    id: "full-spectrum-corporate-wellness-solutions",
    name: "Corporate wellness",
    category: "workplace",
    description:
      "Plan a tailored workplace program covering movement, stress, and employee wellbeing.",
    modes: ["phone", "virtual"],
    image: "/workplace-wellness.jpg",
    price: null,
    source:
      "https://theragurus.com/full-spectrum-corporate-wellness-solutions/",
  },
  {
    id: "corporate-pelvic-health-extension",
    name: "Workplace pelvic health",
    category: "workplace",
    description:
      "Explore employee education, pelvic health workshops, and return-to-work support.",
    modes: ["phone", "virtual"],
    image: "/workplace-wellness.jpg",
    price: null,
    source: "https://theragurus.com/corporate-pelvic-health-extension/",
  },
];

export function serviceById(id: string) {
  return bookingServices.find((s) => s.id === id);
}
export function feeLabel(service: BookingService) {
  return service.price === 0 ? "Complimentary" : "Fee confirmed by the clinic";
}
export function googleCalendarLink(appointment: {
  serviceName: string;
  start: string;
  end: string;
  reference: string;
  mode: VisitMode;
}) {
  const stamp = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const location =
    appointment.mode === "clinic"
      ? clinic.address
      : appointment.mode === "virtual"
        ? "Online session"
        : appointment.mode === "phone"
          ? "Phone call"
          : "Location confirmed by the clinic";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `TheraGurus · ${appointment.serviceName}`,
    dates: `${stamp(appointment.start)}/${stamp(appointment.end)}`,
    details: `Reference ${appointment.reference}. Call ${clinic.phone}. The clinic confirms the final time.`,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
export function formatAppointment(iso: string, timezone = clinic.timezone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}
export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
};
export type Appointment = {
  id: string;
  reference: string;
  serviceId: string;
  serviceName: string;
  mode: VisitMode;
  start: string;
  end: string;
  timezone: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  region: string;
  organization: string;
  program: string;
  status: "requested" | "cancelled";
  reviewStatus?: "requested" | "confirmed" | "completed" | "no_show";
  paymentStatus: "not_required" | "due_at_visit" | "collected";
  amount: number | null;
  couponCode?: string;
  couponName?: string;
  discount?: number;
  intake?: { hope: string; timing: string; contact: string } | null;
  createdAt: string;
  updatedAt: string;
};
export type Availability = {
  dates: { date: string; count: number }[];
  slots: { start: string; end: string; label: string }[];
  date: string;
  timezone: string;
};

export function appointmentStatusLabel(appointment: Appointment) {
  if (appointment.status === "cancelled") return "Cancelled";
  return (
    {
      confirmed: "Confirmed",
      completed: "Completed",
      no_show: "Not attended",
      requested: "Awaiting confirmation",
    } as Record<string, string>
  )[appointment.reviewStatus || "requested"];
}
