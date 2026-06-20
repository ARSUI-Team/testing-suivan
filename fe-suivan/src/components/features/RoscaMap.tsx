const roscaNames = [
  { name: "Arisan", country: "Indonesia", icon: "\u2694\uFE0F" },
  { name: "Chit Fund", country: "India", icon: "\uD83C\uDF6F" },
  { name: "Paluwagan", country: "Philippines", icon: "\uD83C\uDF08" },
  { name: "Hui", country: "China", icon: "\uD83C\uDF6A" },
  { name: "Tanomoshi", country: "Japan", icon: "\uD83C\uDF75" },
  { name: "Gye", country: "Korea", icon: "\uD83C\uDF3F" },
  { name: "Tontine", country: "France", icon: "\uD83E\uDD5C" },
  { name: "Cons\u00F3rcio", country: "Brazil", icon: "\u26BD" },
  { name: "Tanda", country: "Mexico", icon: "\uD83C\uDF35" },
  { name: "Equb", country: "Ethiopia", icon: "\u2600\uFE0F" },
  { name: "Esusu", country: "Nigeria", icon: "\uD83C\uDF34" },
  { name: "Stokvel", country: "South Africa", icon: "\uD83E\uDD8F" },
];

const positions = [
  { x: 78, y: 62 },
  { x: 68, y: 48 },
  { x: 83, y: 55 },
  { x: 74, y: 32 },
  { x: 84, y: 30 },
  { x: 80, y: 34 },
  { x: 48, y: 28 },
  { x: 32, y: 55 },
  { x: 18, y: 48 },
  { x: 56, y: 50 },
  { x: 48, y: 45 },
  { x: 54, y: 62 },
];

const RoscaMap = () => {
  return (
    <div className="map-container">
      <svg viewBox="0 0 100 50" className="map-background" style={{ opacity: 0.7 }}>
        <g transform="translate(0, 5)">
        {/* World map path */}
        <path
          d="M2,22 L4,18 L8,16 L12,18 L14,12 L18,10 L22,8 L26,6 L30,7 L34,5 L38,6 L40,4
          L44,5 L48,6 L52,4 L56,6 L58,8 L56,10 L52,12 L54,14 L56,12 L58,10 L60,8
          L64,6 L66,4 L68,5 L70,7 L72,6 L76,7 L78,9 L80,11 L82,10 L84,8 L86,10
          L88,12 L90,14 L92,18 L94,20 L96,22 L98,24
          L98,28 L96,30 L94,32 L92,30 L90,28 L88,30 L86,32 L84,34 L82,32 L80,34
          L78,36 L76,34 L74,36 L72,38 L70,36 L68,37 L66,35 L64,37 L62,35 L60,37
          L58,38 L56,40 L54,38 L52,40 L50,42 L48,40 L46,42 L44,44 L42,42 L40,44
          L38,46 L36,44 L34,46 L32,44 L30,42 L28,44 L26,42 L24,40 L22,42 L20,40
          L18,38 L16,40 L14,38 L12,36 L10,34 L8,32 L6,34 L4,30 L2,28 Z"
          fill="#0a0a0a"
          fillOpacity="0.05"
          stroke="#0a0a0a"
          strokeWidth="0.6"
          strokeOpacity="0.25"
        />
        {/* More detailed landmasses */}
        <path d="M18,10 L20,7 L24,6 L28,7 L30,5 L34,6 L36,4 L40,5 L44,4 L48,5 L50,3 L54,5 L58,6 L56,9 L54,8 L52,10 L50,12 L52,14 L54,13 L56,11 L58,12 L60,10 L62,8 L64,7 L66,6 L68,7 L70,8 L72,9 L74,10 L76,11 L78,10 L80,12 L82,13 L84,15 L86,16 L88,18 L90,19 L92,21 L94,23 L96,25 L98,26 L96,28 L94,30 L92,32 L90,31 L88,33 L86,35 L84,34 L82,36 L80,38 L78,37 L76,39 L74,38 L72,40 L70,39 L68,41" fill="none" stroke="#0a0a0a" strokeWidth="0.3" strokeOpacity="0.15" />
        {/* South America */}
        <path d="M22,28 L24,29 L26,30 L26,33 L27,35 L28,38 L29,40 L28,42 L26,43 L24,43 L22,42 L20,40 L19,38 L18,36 L18,34 L20,32 Z" fill="#0a0a0a" fillOpacity="0.06" stroke="#0a0a0a" strokeWidth="0.5" strokeOpacity="0.2" />
        {/* Africa */}
        <path d="M48,26 L50,25 L52,26 L54,28 L55,30 L56,32 L57,34 L56,36 L54,37 L52,38 L50,38 L48,37 L47,35 L46,33 L46,31 L47,29 Z" fill="#0a0a0a" fillOpacity="0.06" stroke="#0a0a0a" strokeWidth="0.5" strokeOpacity="0.2" />
        {/* Australia */}
        <path d="M76,36 L78,37 L80,38 L82,38 L83,40 L82,41 L80,42 L78,42 L76,41 L75,39 Z" fill="#0a0a0a" fillOpacity="0.06" stroke="#0a0a0a" strokeWidth="0.5" strokeOpacity="0.2" />
        {/* Southeast Asia */}
        <path d="M72,26 L74,28 L76,30 L78,29 L80,30 L80,32 L78,33 L76,34 L74,33 L73,31 L72,29 Z" fill="#0a0a0a" fillOpacity="0.05" stroke="#0a0a0a" strokeWidth="0.4" strokeOpacity="0.15" />
        </g>
      </svg>

      <div className="map-cities">
        {roscaNames.map((place, i) => (
          <div
            key={place.name}
            className="map-city"
            style={{
              "--x": positions[i].x,
              "--y": positions[i].y,
            } as React.CSSProperties}
          >
            <div className="map-city__label">
              <div className="map-city__sign anim anim-slidein" data-icon={place.icon}>
                {place.name}
                <span className="text-[7px] font-semibold ml-1 opacity-70">{place.country}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoscaMap;
