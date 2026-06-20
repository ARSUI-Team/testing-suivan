const roscaNames = [
  { name: "Arisan", country: "Indonesia", flag: "🇮🇩" },
  { name: "Chit Fund", country: "India", flag: "🇮🇳" },
  { name: "Paluwagan", country: "Philippines", flag: "🇵🇭" },
  { name: "Hui", country: "China", flag: "🇨🇳" },
  { name: "Tanomoshi", country: "Japan", flag: "🇯🇵" },
  { name: "Gye", country: "Korea", flag: "🇰🇷" },
  { name: "Tontine", country: "France", flag: "🇫🇷" },
  { name: "Consórcio", country: "Brazil", flag: "🇧🇷" },
  { name: "Tanda", country: "Mexico", flag: "🇲🇽" },
  { name: "Equb", country: "Ethiopia", flag: "🇪🇹" },
  { name: "Esusu", country: "Nigeria", flag: "🇳🇬" },
  { name: "Stokvel", country: "South Africa", flag: "🇿🇦" },
];

const RoscaMap = () => {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {roscaNames.map((place) => (
        <div
          key={place.name}
          className="border-[2px] border-[#0a0a0a] bg-[#fdfdfa] px-2.5 py-2 transition hover:bg-[#38bdf8] hover:-translate-y-0.5 shadow-[2px_2px_0_#0a0a0a]"
        >
          <p className="flex items-center gap-1.5 text-[11px] font-black text-[#0a0a0a] leading-tight">
            <span className="text-sm">{place.flag}</span>
            {place.name}
          </p>
          <p className="text-[9px] font-bold text-[#555555] mt-0.5 leading-tight uppercase tracking-[0.08em]">
            {place.country}
          </p>
        </div>
      ))}
    </div>
  );
};

export default RoscaMap;
