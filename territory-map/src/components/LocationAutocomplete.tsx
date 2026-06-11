import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, X, Loader2 } from "lucide-react";

export interface LocationResult {
  city: string;
  state: string;
  stateAbbr: string;
  displayName: string;
  latitude: number;
  longitude: number;
  zip?: string;
}

interface LocationAutocompleteProps {
  onSelect: (location: LocationResult) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  value?: string;
  size?: "default" | "lg";
  autoFocus?: boolean;
}

const US_STATES: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO",
  Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND",
  Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI",
  "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT",
  Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV",
  Wisconsin: "WI", Wyoming: "WY", "District of Columbia": "DC",
};

const STATE_ABBR_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(US_STATES).map(([name, abbr]) => [abbr, name])
);

function getStateAbbr(stateName: string): string {
  if (stateName.length === 2 && STATE_ABBR_TO_NAME[stateName.toUpperCase()]) {
    return stateName.toUpperCase();
  }
  return US_STATES[stateName] || stateName.slice(0, 2).toUpperCase();
}

function parseNominatimResult(item: any): LocationResult | null {
  const addr = item.address || {};
  const city = addr.city || addr.town || addr.village || addr.hamlet || addr.county || "";
  const state = addr.state || "";
  if (!city || !state || addr.country_code !== "us") return null;

  const stateAbbr = getStateAbbr(state);
  const zip = addr.postcode || undefined;
  const displayName = `${city}, ${stateAbbr}${zip ? ` ${zip}` : ""}`;

  return {
    city,
    state,
    stateAbbr,
    displayName,
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    zip,
  };
}

export function LocationAutocomplete({
  onSelect,
  placeholder = "Search city, state, or ZIP code...",
  className = "",
  inputClassName = "",
  value: externalValue,
  size = "default",
  autoFocus = false,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(externalValue || "");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [hasSelected, setHasSelected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchLocation = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const isZip = /^\d{5}$/.test(searchQuery.trim());
      const url = isZip
        ? `https://nominatim.openstreetmap.org/search?postalcode=${searchQuery.trim()}&countrycodes=us&format=json&addressdetails=1&limit=5`
        : `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery.trim())}&countrycodes=us&format=json&addressdetails=1&limit=8&featuretype=city`;

      const resp = await fetch(url, {
        headers: { "User-Agent": "FranchiseKI/1.0 (territory-map)" },
      });
      const data = await resp.json();

      const parsed: LocationResult[] = [];
      const seen = new Set<string>();

      for (const item of data) {
        const result = parseNominatimResult(item);
        if (result && !seen.has(result.displayName)) {
          seen.add(result.displayName);
          parsed.push(result);
        }
      }

      setResults(parsed);
      setIsOpen(parsed.length > 0);
      setHighlightIndex(-1);
    } catch {
      setResults([]);
      setIsOpen(false);
    }
    setIsLoading(false);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setHasSelected(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocation(val), 300);
  }

  function handleSelect(location: LocationResult) {
    setQuery(location.displayName);
    setIsOpen(false);
    setHasSelected(true);
    onSelect(location);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setHasSelected(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === "ArrowDown" && results.length > 0) {
        setIsOpen(true);
        setHighlightIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < results.length) {
          handleSelect(results[highlightIndex]);
        } else if (results.length > 0) {
          handleSelect(results[0]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  }

  const sizeClasses = size === "lg"
    ? "pl-12 pr-10 py-4 text-lg"
    : "pl-10 pr-8 py-3 text-sm";

  const iconSize = size === "lg" ? "w-5 h-5" : "w-4 h-4";

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <MapPin className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${iconSize} ${hasSelected ? "text-cyan-400" : "text-slate-500"}`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0 && !hasSelected) setIsOpen(true); }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full ${sizeClasses} rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${inputClassName}`}
        />
        {isLoading && (
          <Loader2 className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${iconSize} text-slate-500 animate-spin`} />
        )}
        {!isLoading && query && (
          <button
            onClick={handleClear}
            className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${iconSize} text-slate-500 hover:text-white transition-colors`}
          >
            <X className="w-full h-full" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-slate-900 border border-white/15 rounded-xl shadow-2xl overflow-hidden"
        >
          {results.map((result, index) => (
            <button
              key={`${result.city}-${result.stateAbbr}-${index}`}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setHighlightIndex(index)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                index === highlightIndex
                  ? "bg-cyan-500/15 text-white"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium truncate">{result.city}, {result.stateAbbr}</div>
                {result.zip && (
                  <div className="text-xs text-slate-500">{result.zip}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
