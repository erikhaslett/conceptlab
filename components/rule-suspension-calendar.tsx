"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

type AspSuspension = { name: string; when: string; meters: string }

// Display rules:
// - Fixed-date: "Month Day"
// - Weekday-rule: "Rule text"
// - Date-varies: "Date varies — typically falls in <Month/Range>"
const ALT_STREET_PARKING_SUSPENSIONS: AspSuspension[] = [
  { name: "New Year's Day", when: "January 1", meters: "Parking meters NOT in effect." },
  { name: "Three Kings' Day", when: "January 6", meters: "Parking meters in effect." },
  { name: "Martin Luther King Jr", when: "3rd Monday in January", meters: "Parking meters in effect." },
  { name: "Lincoln's Birthday", when: "February 12", meters: "Parking meters in effect." },
  { name: "Washington's Birthday (Presidents Day)", when: "3rd Monday in February", meters: "Parking meters in effect." },

  { name: "Lunar New Year's Eve", when: "Date varies — typically falls in February", meters: "Parking meters in effect." },
  { name: "Lunar New Year", when: "Date varies — typically falls in February", meters: "Parking meters in effect." },
  { name: "Losar (Tibetan New Year)", when: "Date varies — typically falls in February", meters: "Parking meters in effect." },
  { name: "Ash Wednesday", when: "Date varies — typically falls in February–March", meters: "Parking meters in effect." },

  { name: "Purim", when: "Date varies — typically falls in February–March", meters: "Parking meters in effect." },

  { name: "Idul-Fitr (Eid Al-Fitr)", when: "Date varies — typically falls in March–April", meters: "Parking meters in effect." },

  { name: "Passover", when: "Date varies — typically falls in March–April", meters: "Parking meters in effect." },
  { name: "Holy Thursday", when: "Date varies — typically falls in March–April", meters: "Parking meters in effect." },
  { name: "Good Friday", when: "Date varies — typically falls in March–April", meters: "Parking meters in effect." },
  { name: "the seventh and eighth days of Passover", when: "Date varies — typically falls in April", meters: "Parking meters in effect." },
  { name: "Orthodox Holy Thursday", when: "Date varies — typically falls in March–April", meters: "Parking meters in effect." },
  { name: "Orthodox Good Friday", when: "Date varies — typically falls in March–April", meters: "Parking meters in effect." },

  { name: "Solemnity of the Ascension", when: "Date varies — typically falls in May–June", meters: "Parking meters in effect." },
  { name: "Shavuoth", when: "Date varies — typically falls in May–June", meters: "Parking meters in effect." },

  { name: "Memorial Day", when: "Last Monday in May", meters: "Parking meters NOT in effect." },

  { name: "Idul-Adha (Eid Al-Adha)", when: "Date varies — typically falls in May–June", meters: "Parking meters in effect." },

  { name: "Juneteenth", when: "June 19", meters: "Parking meters in effect." },
  { name: "Independence Day", when: "July 4", meters: "Parking meters NOT in effect." },

  { name: "Tisha B'Av", when: "Date varies — typically falls in July–August", meters: "Parking meters in effect." },
  { name: "Feast of the Assumption", when: "August 15", meters: "Parking meters in effect." },

  { name: "Labor Day", when: "1st Monday in September", meters: "Parking meters NOT in effect." },

  { name: "Rosh Hashanah", when: "Date varies — typically falls in September–October", meters: "Parking meters in effect." },
  { name: "Yom Kippur", when: "Date varies — typically falls in September–October", meters: "Parking meters in effect." },
  { name: "Succoth", when: "Date varies — typically falls in September–October", meters: "Parking meters in effect." },
  { name: "Shemini Atzereth", when: "Date varies — typically falls in September–October", meters: "Parking meters in effect." },
  { name: "Simchas Torah", when: "Date varies — typically falls in September–October", meters: "Parking meters in effect." },

  { name: "Columbus Day", when: "2nd Monday in October", meters: "Parking meters in effect." },

  { name: "All Saints' Day", when: "November 1", meters: "Parking meters in effect." },
  { name: "Election Day", when: "Tuesday after the first Monday in November", meters: "Parking meters in effect." },

  { name: "Diwali", when: "Date varies — typically falls in October–November", meters: "Parking meters in effect." },

  { name: "Veterans Day", when: "November 11", meters: "Parking meters in effect." },
  { name: "Thanksgiving Day", when: "4th Thursday in November", meters: "Parking meters NOT in effect." },

  { name: "Immaculate Conception", when: "December 8", meters: "Parking meters in effect." },
  { name: "Christmas Day", when: "December 25", meters: "Parking meters NOT in effect." },
]

export default function RuleSuspensionCalendar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="h-10 px-4 text-sm font-semibold leading-none border border-black bg-white hover:bg-neutral-100"
        style={{ color: "#000000" }}
      >
        Rule Suspension Calendar
      </Button>

      {open && (
        <div className="fixed inset-0 z-[2000]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-xl border border-black shadow-lg bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-black">
                <div className="text-base font-semibold" style={{ color: "#000000" }}>
                  Alt Street Parking suspension dates
                </div>
                <Button
                  variant="ghost"
                  className="h-8 px-2 hover:bg-neutral-100"
                  onClick={() => setOpen(false)}
                  style={{ color: "#000000" }}
                >
                  Close
                </Button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
                <div className="text-sm mb-3" style={{ color: "#4b5563" }}>
                  Alt Street Parking is suspended on these dates.
                </div>

                <div className="space-y-3">
                  {ALT_STREET_PARKING_SUSPENSIONS.map((x, i) => (
                    <div key={`${x.name}-${i}`} className="rounded-lg border border-black/60 p-3">
                      <div className="text-sm font-semibold" style={{ color: "#000000" }}>
                        {x.name}
                      </div>
                      <div className="text-sm mt-1" style={{ color: "#111827" }}>
                        {x.when}
                      </div>
                      {x.meters ? (
                        <div className="text-xs mt-1" style={{ color: "#6b7280" }}>
                          {x.meters}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
