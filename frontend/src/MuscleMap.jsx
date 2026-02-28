export default function MuscleMap({ activation }) {
    const a = activation || {}
  
    const getColor = (value) => {
      if (!value || value === 0) return "#1a1a1a"
      if (value >= 70) return "#ff2200"
      if (value >= 40) return "#ff6b35"
      return "#ffaa70"
    }
  
    const getGlow = (value) => {
      if (!value || value === 0) return "none"
      if (value >= 70) return "drop-shadow(0 0 12px #ff220088)"
      if (value >= 40) return "drop-shadow(0 0 8px #ff6b3588)"
      return "drop-shadow(0 0 5px #ffaa7088)"
    }
  
    const BodyFront = () => (
      <svg viewBox="0 0 200 500" width="170" height="425" style={{overflow:"visible"}}>
        <defs>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e1e1e"/>
            <stop offset="50%" stopColor="#252525"/>
            <stop offset="100%" stopColor="#1e1e1e"/>
          </linearGradient>
        </defs>
  
        {/* HEAD */}
        <ellipse cx="100" cy="40" rx="30" ry="36" fill="#252525" stroke="#333" strokeWidth="1.5"/>
        {/* Ear left */}
        <ellipse cx="70" cy="42" rx="5" ry="8" fill="#222" stroke="#333" strokeWidth="1"/>
        {/* Ear right */}
        <ellipse cx="130" cy="42" rx="5" ry="8" fill="#222" stroke="#333" strokeWidth="1"/>
        {/* Neck */}
        <path d="M88,73 L88,90 Q100,95 112,90 L112,73" fill="#222" stroke="#333" strokeWidth="1"/>
  
        {/* SHOULDERS */}
        <path d="M88,88 Q70,85 55,92 Q44,98 42,112 Q44,122 52,125 Q62,120 68,108 Q76,96 88,94Z"
          fill={getColor(a.shoulders)} filter={getGlow(a.shoulders)} style={{transition:"all 1s ease"}}/>
        <path d="M112,88 Q130,85 145,92 Q156,98 158,112 Q156,122 148,125 Q138,120 132,108 Q124,96 112,94Z"
          fill={getColor(a.shoulders)} filter={getGlow(a.shoulders)} style={{transition:"all 1s ease"}}/>
  
        {/* CHEST left */}
        <path d="M88,92 Q72,96 65,108 Q62,118 66,130 Q72,138 82,138 Q92,135 98,125 Q100,115 100,108 Q96,95 88,92Z"
          fill={getColor(a.chest)} filter={getGlow(a.chest)} style={{transition:"all 1s ease"}}/>
        {/* CHEST right */}
        <path d="M112,92 Q128,96 135,108 Q138,118 134,130 Q128,138 118,138 Q108,135 102,125 Q100,115 100,108 Q104,95 112,92Z"
          fill={getColor(a.chest)} filter={getGlow(a.chest)} style={{transition:"all 1s ease"}}/>
        {/* chest divider line */}
        <line x1="100" y1="92" x2="100" y2="140" stroke="#0005" strokeWidth="1"/>
  
        {/* BICEPS left */}
        <path d="M42,114 Q36,122 34,138 Q34,150 38,158 Q44,163 50,160 Q56,155 56,144 Q58,130 54,118 Q50,110 42,114Z"
          fill={getColor(a.biceps)} filter={getGlow(a.biceps)} style={{transition:"all 1s ease"}}/>
        {/* BICEPS right */}
        <path d="M158,114 Q164,122 166,138 Q166,150 162,158 Q156,163 150,160 Q144,155 144,144 Q142,130 146,118 Q150,110 158,114Z"
          fill={getColor(a.biceps)} filter={getGlow(a.biceps)} style={{transition:"all 1s ease"}}/>
  
        {/* TRICEPS front (side) */}
        <path d="M40,116 Q33,128 33,145 Q34,155 38,160 Q36,148 36,138 Q36,124 42,114Z"
          fill={getColor(a.triceps)} style={{opacity:0.5, transition:"all 1s ease"}}/>
        <path d="M160,116 Q167,128 167,145 Q166,155 162,160 Q164,148 164,138 Q164,124 158,114Z"
          fill={getColor(a.triceps)} style={{opacity:0.5, transition:"all 1s ease"}}/>
  
        {/* FOREARMS left */}
        <path d="M38,162 Q32,172 32,188 Q33,202 38,210 Q44,214 50,212 Q56,208 57,196 Q58,180 54,165 Q48,158 38,162Z"
          fill="#1e1e1e" stroke="#2a2a2a" strokeWidth="1"/>
        {/* FOREARMS right */}
        <path d="M162,162 Q168,172 168,188 Q167,202 162,210 Q156,214 150,212 Q144,208 143,196 Q142,180 146,165 Q152,158 162,162Z"
          fill="#1e1e1e" stroke="#2a2a2a" strokeWidth="1"/>
  
        {/* HANDS */}
        <ellipse cx="44" cy="222" rx="10" ry="14" fill="#1e1e1e" stroke="#2a2a2a" strokeWidth="1"/>
        <ellipse cx="156" cy="222" rx="10" ry="14" fill="#1e1e1e" stroke="#2a2a2a" strokeWidth="1"/>
  
        {/* ABS / CORE */}
        <path d="M72,138 Q68,145 68,175 Q68,195 72,210 Q80,220 100,222 Q120,220 128,210 Q132,195 132,175 Q132,145 128,138 Q116,132 100,132 Q84,132 72,138Z"
          fill={getColor(a.core)} filter={getGlow(a.core)} style={{transition:"all 1s ease"}}/>
        {/* abs grid */}
        <line x1="100" y1="138" x2="100" y2="222" stroke="#0006" strokeWidth="1"/>
        <line x1="72" y1="158" x2="128" y2="158" stroke="#0006" strokeWidth="1"/>
        <line x1="70" y1="178" x2="130" y2="178" stroke="#0006" strokeWidth="1"/>
        <line x1="70" y1="198" x2="130" y2="198" stroke="#0006" strokeWidth="1"/>
  
        {/* HIP FLEXORS */}
        <path d="M72,210 Q68,220 70,232 Q78,242 100,244 Q122,242 130,232 Q132,220 128,210 Q116,220 100,222 Q84,220 72,210Z"
          fill={getColor(a.hip_flexors)} filter={getGlow(a.hip_flexors)} style={{transition:"all 1s ease"}}/>
  
        {/* QUADS left */}
        <path d="M70,244 Q62,255 60,275 Q58,298 62,318 Q66,332 74,338 Q84,342 92,336 Q100,328 100,310 Q100,285 96,262 Q92,244 70,244Z"
          fill={getColor(a.quadriceps)} filter={getGlow(a.quadriceps)} style={{transition:"all 1s ease"}}/>
        {/* QUADS right */}
        <path d="M130,244 Q138,255 140,275 Q142,298 138,318 Q134,332 126,338 Q116,342 108,336 Q100,328 100,310 Q100,285 104,262 Q108,244 130,244Z"
          fill={getColor(a.quadriceps)} filter={getGlow(a.quadriceps)} style={{transition:"all 1s ease"}}/>
  
        {/* KNEES */}
        <ellipse cx="80" cy="346" rx="16" ry="12" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1"/>
        <ellipse cx="120" cy="346" rx="16" ry="12" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1"/>
  
        {/* SHINS */}
        <path d="M66,356 Q62,370 63,392 Q65,410 72,418 Q78,422 84,420 Q90,416 92,406 Q94,388 92,368 Q90,354 80,350Z"
          fill="#1e1e1e" stroke="#2a2a2a" strokeWidth="1"/>
        <path d="M134,356 Q138,370 137,392 Q135,410 128,418 Q122,422 116,420 Q110,416 108,406 Q106,388 108,368 Q110,354 120,350Z"
          fill="#1e1e1e" stroke="#2a2a2a" strokeWidth="1"/>
  
        {/* FEET */}
        <ellipse cx="78" cy="428" rx="16" ry="8" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1"/>
        <ellipse cx="122" cy="428" rx="16" ry="8" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1"/>
      </svg>
    )
  
    const BodyBack = () => (
      <svg viewBox="0 0 200 500" width="170" height="425" style={{overflow:"visible"}}>
        {/* HEAD */}
        <ellipse cx="100" cy="40" rx="30" ry="36" fill="#252525" stroke="#333" strokeWidth="1.5"/>
        <ellipse cx="70" cy="42" rx="5" ry="8" fill="#222" stroke="#333" strokeWidth="1"/>
        <ellipse cx="130" cy="42" rx="5" ry="8" fill="#222" stroke="#333" strokeWidth="1"/>
        {/* Neck */}
        <path d="M88,73 L88,90 Q100,95 112,90 L112,73" fill="#222" stroke="#333" strokeWidth="1"/>
  
        {/* SHOULDERS back */}
        <path d="M88,88 Q70,85 55,92 Q44,98 42,112 Q44,122 52,125 Q62,120 68,108 Q76,96 88,94Z"
          fill={getColor(a.shoulders)} filter={getGlow(a.shoulders)} style={{transition:"all 1s ease"}}/>
        <path d="M112,88 Q130,85 145,92 Q156,98 158,112 Q156,122 148,125 Q138,120 132,108 Q124,96 112,94Z"
          fill={getColor(a.shoulders)} filter={getGlow(a.shoulders)} style={{transition:"all 1s ease"}}/>
  
        {/* UPPER BACK / TRAPS */}
        <path d="M88,92 Q72,95 66,108 Q62,122 66,136 Q72,145 82,148 Q92,148 100,146 Q108,148 118,148 Q128,145 134,136 Q138,122 134,108 Q128,95 112,92 Q104,89 100,90 Q96,89 88,92Z"
          fill={getColor(a.back_upper)} filter={getGlow(a.back_upper)} style={{transition:"all 1s ease"}}/>
        {/* back muscle line */}
        <line x1="100" y1="92" x2="100" y2="148" stroke="#0005" strokeWidth="1"/>
        <path d="M80,110 Q90,115 100,114 Q110,115 120,110" fill="none" stroke="#0004" strokeWidth="1"/>
  
        {/* TRICEPS back */}
        <path d="M42,114 Q36,122 34,138 Q34,150 38,158 Q44,163 50,160 Q56,155 56,144 Q58,130 54,118 Q50,110 42,114Z"
          fill={getColor(a.triceps)} filter={getGlow(a.triceps)} style={{transition:"all 1s ease"}}/>
        <path d="M158,114 Q164,122 166,138 Q166,150 162,158 Q156,163 150,160 Q144,155 144,144 Q142,130 146,118 Q150,110 158,114Z"
          fill={getColor(a.triceps)} filter={getGlow(a.triceps)} style={{transition:"all 1s ease"}}/>
  
        {/* FOREARMS */}
        <path d="M38,162 Q32,172 32,188 Q33,202 38,210 Q44,214 50,212 Q56,208 57,196 Q58,180 54,165 Q48,158 38,162Z"
          fill="#1e1e1e" stroke="#2a2a2a" strokeWidth="1"/>
        <path d="M162,162 Q168,172 168,188 Q167,202 162,210 Q156,214 150,212 Q144,208 143,196 Q142,180 146,165 Q152,158 162,162Z"
          fill="#1e1e1e" stroke="#2a2a2a" strokeWidth="1"/>
  
        {/* HANDS */}
        <ellipse cx="44" cy="222" rx="10" ry="14" fill="#1e1e1e" stroke="#2a2a2a" strokeWidth="1"/>
        <ellipse cx="156" cy="222" rx="10" ry="14" fill="#1e1e1e" stroke="#2a2a2a" strokeWidth="1"/>
  
        {/* LOWER BACK */}
        <path d="M72,148 Q68,158 68,180 Q68,200 72,215 Q80,225 100,227 Q120,225 128,215 Q132,200 132,180 Q132,158 128,148 Q116,144 100,144 Q84,144 72,148Z"
          fill={getColor(a.back_lower)} filter={getGlow(a.back_lower)} style={{transition:"all 1s ease"}}/>
        <line x1="100" y1="148" x2="100" y2="227" stroke="#0005" strokeWidth="1"/>
  
        {/* GLUTES */}
        <path d="M70,226 Q62,236 62,252 Q64,268 74,276 Q84,282 100,280 Q116,282 126,276 Q136,268 138,252 Q138,236 130,226 Q118,220 100,222 Q82,220 70,226Z"
          fill={getColor(a.glutes)} filter={getGlow(a.glutes)} style={{transition:"all 1s ease"}}/>
        <line x1="100" y1="222" x2="100" y2="280" stroke="#0005" strokeWidth="1"/>
  
        {/* HAMSTRINGS left */}
        <path d="M62,278 Q56,292 56,314 Q58,334 64,346 Q72,354 82,352 Q92,348 96,336 Q100,320 98,298 Q96,278 78,274Z"
          fill={getColor(a.hamstrings)} filter={getGlow(a.hamstrings)} style={{transition:"all 1s ease"}}/>
        {/* HAMSTRINGS right */}
        <path d="M138,278 Q144,292 144,314 Q142,334 136,346 Q128,354 118,352 Q108,348 104,336 Q100,320 102,298 Q104,278 122,274Z"
          fill={getColor(a.hamstrings)} filter={getGlow(a.hamstrings)} style={{transition:"all 1s ease"}}/>
  
        {/* KNEES back */}
        <ellipse cx="78" cy="356" rx="16" ry="11" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1"/>
        <ellipse cx="122" cy="356" rx="16" ry="11" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1"/>
  
        {/* CALVES left */}
        <path d="M64,366 Q60,380 61,402 Q63,418 70,426 Q76,430 82,428 Q88,424 90,414 Q92,396 90,376 Q88,362 78,358Z"
          fill={getColor(a.calves)} filter={getGlow(a.calves)} style={{transition:"all 1s ease"}}/>
        {/* CALVES right */}
        <path d="M136,366 Q140,380 139,402 Q137,418 130,426 Q124,430 118,428 Q112,424 110,414 Q108,396 110,376 Q112,362 122,358Z"
          fill={getColor(a.calves)} filter={getGlow(a.calves)} style={{transition:"all 1s ease"}}/>
  
        {/* FEET */}
        <ellipse cx="76" cy="434" rx="16" ry="8" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1"/>
        <ellipse cx="124" cy="434" rx="16" ry="8" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1"/>
      </svg>
    )
  
    return (
      <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:"20px", width:"100%"}}>
        <div style={{display:"flex", gap:"48px", justifyContent:"center", alignItems:"flex-start"}}>
          <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:"8px"}}>
            <span style={{fontSize:"0.7rem", color:"#666", letterSpacing:"3px", textTransform:"uppercase"}}>Front</span>
            <BodyFront/>
          </div>
          <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:"8px"}}>
            <span style={{fontSize:"0.7rem", color:"#666", letterSpacing:"3px", textTransform:"uppercase"}}>Back</span>
            <BodyBack/>
          </div>
        </div>
        <div style={{display:"flex", gap:"20px", flexWrap:"wrap", justifyContent:"center"}}>
          {[
            {color:"#ff2200", label:"High (70-100%)"},
            {color:"#ff6b35", label:"Medium (40-70%)"},
            {color:"#ffaa70", label:"Low (1-40%)"},
            {color:"#1a1a1a", label:"Not activated"},
          ].map(({color, label}) => (
            <div key={label} style={{display:"flex", alignItems:"center", gap:"6px"}}>
              <div style={{width:"10px", height:"10px", borderRadius:"50%", background:color, boxShadow: color !== "#1a1a1a" ? `0 0 6px ${color}` : "none"}}></div>
              <span style={{fontSize:"0.75rem", color:"#888"}}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }