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
          className="border-[2px] border-[#0a0a0a] bg-[#fbf7ed] px-2 py-1.5 transition hover:bg-[#e0f4ff] hover:-translate-y-0.5"
        >
          <p className="text-[10px] font-black text-[#0a0a0a] leading-tight">
            <span className="mr-1">{place.flag}</span>
            {place.name}
          </p>
          <p className="text-[8px] font-semibold text-[#a8a49a] mt-0.5 leading-tight">
            {place.country}
          </p>
        </div>
      ))}
    </div>
  );
};

export default RoscaMap;
