"use client";
import { useEffect, useState } from "react";
import { clinic, type Availability } from "@/lib/booking-catalog";
import {
  bookingRequest,
  BookingLoading,
  messageFor,
  Notice,
} from "./BookingUI";

export function TimePicker({
  selected,
  onSelect,
  timezone,
  onTimezone,
  bookingId,
}: {
  selected: string;
  onSelect: (start: string) => void;
  timezone: string;
  onTimezone: (zone: string) => void;
  bookingId?: string;
}) {
  const [data, setData] = useState<Availability | null>(null);
  const [date, setDate] = useState("");
  const [week, setWeek] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (bookingId) params.set("booking", bookingId);
    bookingRequest<Availability>(
      `/api/availability?${params}`,
      undefined,
      "GET",
      controller.signal,
    )
      .then((result) => {
        setData(result);
        setLoading(false);
        setError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setError(messageFor(error));
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [date, bookingId, retry]);
  const zones = Array.from(
    new Set([
      timezone,
      clinic.timezone,
      "Asia/Kolkata",
      "Asia/Dubai",
      "Asia/Riyadh",
      "Europe/London",
      "America/New_York",
      "UTC",
    ]),
  );
  function chooseDate(value: string) {
    setLoading(true);
    setDate(value);
    onSelect("");
  }
  return (
    <div className="booking-time-picker">
      <div className="booking-timezone">
        <label htmlFor="booking-timezone">Show times in</label>
        <select
          id="booking-timezone"
          value={timezone}
          onChange={(e) => onTimezone(e.target.value)}
        >
          {zones.map((zone) => (
            <option value={zone} key={zone}>
              {zone.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <p className="booking-help">
        Calendar dates use Pacific time. Appointment times show your selected
        time zone.
      </p>
      {error && (
        <Notice error>
          {error}{" "}
          <button
            type="button"
            className="booking-text-button"
            onClick={() => {
              setLoading(true);
              setRetry(retry + 1);
            }}
          >
            Try again
          </button>
        </Notice>
      )}
      {data && (
        <>
          <div className="booking-date-heading">
            <strong>
              {new Intl.DateTimeFormat("en-US", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${data.dates[week * 7].date}T12:00Z`))}
            </strong>
            <div>
              <button
                type="button"
                className="booking-calendar-arrow"
                aria-label="Previous week"
                disabled={week === 0}
                onClick={() => setWeek(week - 1)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="m14 6-6 6 6 6" />
                </svg>
              </button>
              <button
                type="button"
                className="booking-calendar-arrow"
                aria-label="Next week"
                disabled={week === 3}
                onClick={() => setWeek(week + 1)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="m10 6 6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
          <div
            className="booking-dates"
            role="group"
            aria-label="Choose a date"
          >
            {data.dates.slice(week * 7, week * 7 + 7).map((day) => (
              <button
                type="button"
                key={day.date}
                disabled={!day.count}
                aria-pressed={data.date === day.date}
                aria-label={new Intl.DateTimeFormat("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  timeZone: "UTC",
                }).format(new Date(`${day.date}T12:00Z`))}
                onClick={() => chooseDate(day.date)}
              >
                <span>
                  {new Intl.DateTimeFormat("en-US", {
                    weekday: "short",
                    timeZone: "UTC",
                  }).format(new Date(`${day.date}T12:00Z`))}
                </span>
                <strong>{Number(day.date.slice(-2))}</strong>
                <i aria-hidden="true" />
              </button>
            ))}
          </div>
        </>
      )}
      {loading ? (
        <BookingLoading label="Checking appointment windows…" />
      ) : (
        data && (
          <div className="booking-slot-region">
            <h3>
              {new Intl.DateTimeFormat("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${data.date}T12:00Z`))}
            </h3>
            {data.slots.length ? (
              <div
                className="booking-slots"
                role="group"
                aria-label="Choose a time"
              >
                {data.slots.map((slot) => (
                  <button
                    type="button"
                    key={slot.start}
                    aria-pressed={selected === slot.start}
                    onClick={() => onSelect(slot.start)}
                  >
                    <span>
                      {new Intl.DateTimeFormat("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: timezone,
                      }).format(new Date(slot.start))}
                    </span>
                    {timezone !== clinic.timezone && (
                      <small>
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          timeZone: timezone,
                        }).format(new Date(slot.start))}
                      </small>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <Notice>
                No request windows remain for this day. Please choose another
                date.
              </Notice>
            )}
          </div>
        )
      )}
      <p className="booking-help booking-calendar-note">
        These are preferred appointment windows within the clinic’s published
        hours, {clinic.hours}. The clinic confirms your appointment time and
        session length. Class timetables and home visits are arranged
        individually.
      </p>
    </div>
  );
}
