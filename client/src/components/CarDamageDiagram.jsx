import React from 'react'
import { IconX, IconRadar2 } from '@tabler/icons-react'

// ── Car silhouettes — constructed flat-vector illustrations (filled body
// panels, tinted glass, lit light clusters, alloy wheels), not outline-only
// wireframes — matching the paper Job Card's four-angle damage diagram
// (side / top / front / rear), rendered as a lit diagnostic readout rather
// than a white product shot. Marker coordinates are stored as percentages
// of each view's own viewBox so they stay correctly positioned at any size.
const VIEWS = [
  { key: 'side',  label: 'Side View',  short: 'SIDE',  viewBox: '0 0 300 130' },
  { key: 'top',   label: 'Top View',   short: 'TOP',   viewBox: '0 0 300 140' },
  { key: 'front', label: 'Front View', short: 'FRONT', viewBox: '0 0 160 120' },
  { key: 'rear',  label: 'Rear View',  short: 'REAR',  viewBox: '0 0 160 120' },
]

// Construction palette — everything derives from the app's own tokens
// (Navy #0B192C, Brand Blue #0F4C81, Blue Glow #3E92CC). Body fill
// interpolates between a lightened Brand Blue (highlight) and Navy
// (shadow); nothing outside that family is introduced.
const GLOW = '#3E92CC'
const BODY_HI = '#1c3f66'
const BODY_LO = '#0b1c30'
const TIRE = '#08111c'

// Reusable alloy wheel: dark tire, glow rim ring, 8-spoke hub — used by
// every view that shows wheels front-on/side-on (not the top-down bulges).
const Wheel = ({ cx, cy, r }) => {
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const rad = (i * 45 * Math.PI) / 180
    return { x2: cx + Math.cos(rad) * r * 0.55, y2: cy + Math.sin(rad) * r * 0.55 }
  })
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={TIRE} stroke={GLOW} strokeOpacity="0.85" strokeWidth="1.25" />
      <circle cx={cx} cy={cy} r={r * 0.58} fill="none" stroke={GLOW} strokeOpacity="0.7" strokeWidth="1" />
      {spokes.map((s, i) => (
        <line key={i} x1={cx} y1={cy} x2={s.x2} y2={s.y2} stroke={GLOW} strokeOpacity="0.65" strokeWidth="0.75" strokeLinecap="round" />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.13} fill={GLOW} />
    </g>
  )
}

// Shared glass gradient — a lighter diagonal streak reading as a reflection,
// instead of flat tinted opacity. Reused (by reference) across every window
// shape in every view.
const GlassDefs = ({ id }) => (
  <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stopColor={GLOW} stopOpacity="0.42" />
    <stop offset="55%" stopColor={GLOW} stopOpacity="0.22" />
    <stop offset="100%" stopColor={GLOW} stopOpacity="0.3" />
  </linearGradient>
)

const SideSilhouette = () => (
  <>
    <defs>
      <GlassDefs id="glassSheen-side" />
      <linearGradient id="bodyGrad-side" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={BODY_HI} />
        <stop offset="100%" stopColor={BODY_LO} />
      </linearGradient>
    </defs>
    <Wheel cx={92} cy={93} r={15} />
    <Wheel cx={222} cy={93} r={15} />
    {/* Body — long hood, windshield rake, cabin, rear quarter, short decklid,
        wheel arches. Hood-to-decklid ratio matches a real sedan (long nose,
        shorter tail), not a symmetric silhouette. */}
    <path
      d="M18,92 L18,78 C18,74 21,70 25,68 L70,55 L100,32 C108,26 118,22 129,22
         L200,22 C208,22 214,25 219,31 L235,50 L262,57 C272,60 279,66 279,74 L279,92
         L249,92 Q222,79 195,92 L119,92 Q92,79 65,92 Z"
      fill="url(#bodyGrad-side)" stroke={GLOW} strokeWidth="1.5" strokeLinejoin="round"
    />
    {/* Rocker panel / lower cladding band */}
    <path d="M25,86 Q150,90 273,86 L273,90 Q150,94 22,90 Z" fill={BODY_LO} fillOpacity="0.6" />
    {/* Main glass band (windshield + front + rear door windows) */}
    <path d="M75,35 L129,23 L192,23 L204,32 L194,51 L86,51 Z" fill="url(#glassSheen-side)" stroke={GLOW} strokeOpacity="0.8" strokeWidth="1" strokeLinejoin="round" />
    {/* Rear quarter-window, ahead of the C-pillar */}
    <path d="M199,31 L219,31 L235,50 L206,50 Z" fill="url(#glassSheen-side)" stroke={GLOW} strokeOpacity="0.8" strokeWidth="1" strokeLinejoin="round" />
    {/* Panel lines: front door seam, rear door seam, handles */}
    <g stroke={GLOW} strokeOpacity="0.65" strokeWidth="1" fill="none" strokeLinecap="round">
      <path d="M140,52 L138,92" />
      <path d="M187,52 L189,92" />
    </g>
    <rect x="112" y="61" width="13" height="3.5" rx="1.5" fill={GLOW} fillOpacity="0.8" />
    <rect x="160" y="61" width="13" height="3.5" rx="1.5" fill={GLOW} fillOpacity="0.8" />
    {/* Mirror */}
    <path d="M77,42 L69,38 L71,48 Z" fill="url(#bodyGrad-side)" stroke={GLOW} strokeOpacity="0.85" strokeWidth="1" strokeLinejoin="round" />
    {/* Light-wrap accents — the headlight/taillight cluster peeking onto the
        side panel at each corner, echoing the front/rear light colour */}
    <path d="M18,78 Q18,72 24,70 L24,80 Q20,80 18,78 Z" fill="#cfeaff" fillOpacity="0.75" />
    <path d="M279,74 Q279,68 274,66 L274,76 Q277,77 279,74 Z" fill={GLOW} fillOpacity="0.6" />
  </>
)

const TopSilhouette = () => (
  <>
    <defs>
      <GlassDefs id="glassSheen-top" />
      <radialGradient id="bodyGrad-top" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stopColor={BODY_HI} />
        <stop offset="100%" stopColor={BODY_LO} />
      </radialGradient>
    </defs>
    {/* Wheel bulges at front/rear axle lines, poking past the body sides */}
    <rect x="60" y="6" width="18" height="14" rx="4" fill={TIRE} stroke={GLOW} strokeOpacity="0.8" strokeWidth="1" />
    <rect x="60" y="100" width="18" height="14" rx="4" fill={TIRE} stroke={GLOW} strokeOpacity="0.8" strokeWidth="1" />
    <rect x="222" y="6" width="18" height="14" rx="4" fill={TIRE} stroke={GLOW} strokeOpacity="0.8" strokeWidth="1" />
    <rect x="222" y="100" width="18" height="14" rx="4" fill={TIRE} stroke={GLOW} strokeOpacity="0.8" strokeWidth="1" />
    {/* Body shell */}
    <path
      d="M48,18 Q30,19 28,40 L28,100 Q30,121 48,122 L252,122 Q270,121 272,100 L272,40 Q270,19 252,18 Z"
      fill="url(#bodyGrad-top)" stroke={GLOW} strokeWidth="1.5" strokeLinejoin="round"
    />
    {/* Windshield + rear window */}
    <path d="M95,42 L95,98 L118,109 L118,31 Z" fill="url(#glassSheen-top)" stroke={GLOW} strokeOpacity="0.8" strokeWidth="1" strokeLinejoin="round" />
    <path d="M205,42 L205,98 L182,109 L182,31 Z" fill="url(#glassSheen-top)" stroke={GLOW} strokeOpacity="0.8" strokeWidth="1" strokeLinejoin="round" />
    {/* Roof ridge + hood/trunk seams */}
    <line x1="150" y1="27" x2="150" y2="113" stroke={GLOW} strokeOpacity="0.6" strokeWidth="1" />
    <path d="M60,20 L60,120" stroke={GLOW} strokeOpacity="0.35" strokeWidth="1" />
    <path d="M240,20 L240,120" stroke={GLOW} strokeOpacity="0.35" strokeWidth="1" />
    {/* Mirrors */}
    <path d="M112,29 L102,19 L120,25 Z" fill={GLOW} fillOpacity="0.85" stroke={GLOW} strokeWidth="1" strokeLinejoin="round" />
    <path d="M112,111 L102,121 L120,115 Z" fill={GLOW} fillOpacity="0.85" stroke={GLOW} strokeWidth="1" strokeLinejoin="round" />
  </>
)

const FrontSilhouette = () => (
  <>
    <defs>
      <GlassDefs id="glassSheen-front" />
      <linearGradient id="bodyGrad-front" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={BODY_HI} />
        <stop offset="100%" stopColor={BODY_LO} />
      </linearGradient>
    </defs>
    <Wheel cx={32} cy={91} r={12} />
    <Wheel cx={128} cy={91} r={12} />
    {/* Body — domed roof, raked A-pillars, shouldering fenders, wheel arches */}
    <path
      d="M18,92 L20,92 Q32,78 44,92 L116,92 Q128,78 140,92 L142,92
         C146,78 144,58 134,48 L108,24 Q80,10 52,24 L26,48
         C16,58 14,78 18,92 Z"
      fill="url(#bodyGrad-front)" stroke={GLOW} strokeWidth="1.5" strokeLinejoin="round"
    />
    {/* Windshield */}
    <path d="M60,26 L100,26 L112,46 L48,46 Z" fill="url(#glassSheen-front)" stroke={GLOW} strokeOpacity="0.8" strokeWidth="1" strokeLinejoin="round" />
    {/* Hood character line */}
    <path d="M24,52 Q80,58 136,52" stroke={GLOW} strokeOpacity="0.65" strokeWidth="1" fill="none" strokeLinecap="round" />
    {/* Mirrors */}
    <path d="M24,44 L13,40 L16,51 Z" fill="url(#bodyGrad-front)" stroke={GLOW} strokeOpacity="0.85" strokeWidth="1" strokeLinejoin="round" />
    <path d="M136,44 L147,40 L144,51 Z" fill="url(#bodyGrad-front)" stroke={GLOW} strokeOpacity="0.85" strokeWidth="1" strokeLinejoin="round" />
    {/* Headlights — wraparound cluster: dim outer housing + bright inner lens + reflector line */}
    <path d="M17,60 L48,57 L51,76 L20,81 Z" fill={GLOW} fillOpacity="0.3" stroke={GLOW} strokeOpacity="0.8" strokeWidth="1" strokeLinejoin="round" />
    <path d="M22,63 L44,61 L46,73 L24,77 Z" fill="#cfeaff" fillOpacity="0.92" />
    <path d="M26,68 L41,67" stroke={GLOW} strokeOpacity="0.9" strokeWidth="1" />
    <path d="M143,60 L112,57 L109,76 L140,81 Z" fill={GLOW} fillOpacity="0.3" stroke={GLOW} strokeOpacity="0.8" strokeWidth="1" strokeLinejoin="round" />
    <path d="M138,63 L116,61 L114,73 L136,77 Z" fill="#cfeaff" fillOpacity="0.92" />
    <path d="M134,68 L119,67" stroke={GLOW} strokeOpacity="0.9" strokeWidth="1" />
    {/* Grille — hexagonal, not a plain rect */}
    <path d="M60,60 L100,60 L106,66 L104,82 L56,82 L54,66 Z" fill={TIRE} stroke={GLOW} strokeOpacity="0.75" strokeWidth="1" strokeLinejoin="round" />
    <line x1="59" y1="68" x2="101" y2="68" stroke={GLOW} strokeOpacity="0.55" strokeWidth="1" />
    <line x1="58" y1="74" x2="102" y2="74" stroke={GLOW} strokeOpacity="0.55" strokeWidth="1" />
    <line x1="57" y1="80" x2="103" y2="80" stroke={GLOW} strokeOpacity="0.55" strokeWidth="1" />
    {/* Badge */}
    <path d="M80,53 L84,59 L76,59 Z" fill={GLOW} />
    {/* Lower bumper intake + fog-light hints */}
    <rect x="64" y="86" width="32" height="7" rx="2.5" fill={TIRE} stroke={GLOW} strokeOpacity="0.6" strokeWidth="1" />
    <circle cx="30" cy="83" r="3" fill="none" stroke={GLOW} strokeOpacity="0.6" strokeWidth="1" />
    <circle cx="130" cy="83" r="3" fill="none" stroke={GLOW} strokeOpacity="0.6" strokeWidth="1" />
  </>
)

const RearSilhouette = () => (
  <>
    <defs>
      <GlassDefs id="glassSheen-rear" />
      <linearGradient id="bodyGrad-rear" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={BODY_HI} />
        <stop offset="100%" stopColor={BODY_LO} />
      </linearGradient>
    </defs>
    <Wheel cx={32} cy={91} r={12} />
    <Wheel cx={128} cy={91} r={12} />
    {/* Same body shell as front */}
    <path
      d="M18,92 L20,92 Q32,78 44,92 L116,92 Q128,78 140,92 L142,92
         C146,78 144,58 134,48 L108,24 Q80,10 52,24 L26,48
         C16,58 14,78 18,92 Z"
      fill="url(#bodyGrad-rear)" stroke={GLOW} strokeWidth="1.5" strokeLinejoin="round"
    />
    {/* Rear windshield */}
    <path d="M58,26 L102,26 L114,46 L46,46 Z" fill="url(#glassSheen-rear)" stroke={GLOW} strokeOpacity="0.8" strokeWidth="1" strokeLinejoin="round" />
    {/* Trunk lip + hatch seam */}
    <path d="M46,47 Q80,44 114,47" stroke={GLOW} strokeOpacity="0.55" strokeWidth="1" fill="none" strokeLinecap="round" />
    <path d="M24,55 Q80,60 136,55" stroke={GLOW} strokeOpacity="0.65" strokeWidth="1" fill="none" strokeLinecap="round" />
    <path d="M80,55 L80,86" stroke={GLOW} strokeOpacity="0.45" strokeWidth="1" fill="none" strokeLinecap="round" />
    {/* Mirrors (visible edge, matching front) */}
    <path d="M24,44 L13,40 L16,51 Z" fill="url(#bodyGrad-rear)" stroke={GLOW} strokeOpacity="0.85" strokeWidth="1" strokeLinejoin="round" />
    <path d="M136,44 L147,40 L144,51 Z" fill="url(#bodyGrad-rear)" stroke={GLOW} strokeOpacity="0.85" strokeWidth="1" strokeLinejoin="round" />
    {/* Taillights — wraparound cluster, dimmer than headlights, split lens */}
    <path d="M17,60 L48,57 L51,76 L20,81 Z" fill={GLOW} fillOpacity="0.22" stroke={GLOW} strokeOpacity="0.8" strokeWidth="1" strokeLinejoin="round" />
    <path d="M22,63 L44,61 L46,73 L24,77 Z" fill={GLOW} fillOpacity="0.6" />
    <path d="M35,61 L36,77" stroke={GLOW} strokeOpacity="0.85" strokeWidth="1" />
    <path d="M143,60 L112,57 L109,76 L140,81 Z" fill={GLOW} fillOpacity="0.22" stroke={GLOW} strokeOpacity="0.8" strokeWidth="1" strokeLinejoin="round" />
    <path d="M138,63 L116,61 L114,73 L136,77 Z" fill={GLOW} fillOpacity="0.6" />
    <path d="M125,61 L124,77" stroke={GLOW} strokeOpacity="0.85" strokeWidth="1" />
    {/* Badge */}
    <path d="M80,50 L84,56 L76,56 Z" fill={GLOW} />
    {/* Number plate recess */}
    <rect x="61" y="82" width="38" height="11" rx="2" fill={TIRE} stroke={GLOW} strokeOpacity="0.6" strokeWidth="1" />
  </>
)

const SILHOUETTES = { side: SideSilhouette, top: TopSilhouette, front: FrontSilhouette, rear: RearSilhouette }

// Faint blueprint graph-paper texture behind each view.
const GRID_BG = {
  backgroundImage:
    'linear-gradient(rgba(62,146,204,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(62,146,204,0.09) 1px, transparent 1px)',
  backgroundSize: '14px 14px',
}

/**
 * Click-to-mark car damage diagram — 4 views (side/top/front/rear), matching
 * the paper Job Card's damage-marking section. Click anywhere on a view to
 * drop a numbered pin; click a pin to remove it. `readOnly` renders the
 * pins without click handlers (Job Card detail view, post-intake).
 *
 * Styled as a dark "scan panel" — the four views read as one diagnostic
 * instrument rather than four form fields, with each car constructed as a
 * filled flat-vector illustration (body panels, tinted glass, lit clusters,
 * alloy wheels) rather than an outline-only wireframe. A marker's pulse-ring
 * plays once on mount, which doubles as both placement feedback (live
 * editing) and a load-in reveal (detail view reading back saved markers).
 */
export const CarDamageDiagram = ({ value = [], onChange, readOnly = false }) => {
  const markersFor = (viewKey) => value.filter((m) => m.view === viewKey)
  const totalPoints = value.length

  const handleSvgClick = (viewKey) => (e) => {
    if (readOnly) return
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10
    onChange([...value, { view: viewKey, xPct, yPct, note: '' }])
  }

  const removeMarker = (viewKey, idx) => (e) => {
    e.stopPropagation()
    if (readOnly) return
    let seen = -1
    const next = value.filter((m) => {
      if (m.view !== viewKey) return true
      seen += 1
      return seen !== idx
    })
    onChange(next)
  }

  const updateNote = (viewKey, idx, note) => {
    let seen = -1
    const next = value.map((m) => {
      if (m.view !== viewKey) return m
      seen += 1
      return seen === idx ? { ...m, note } : m
    })
    onChange(next)
  }

  return (
    <div
      className="rounded-xl p-3 sm:p-4"
      style={{ background: 'linear-gradient(180deg, #0B192C 0%, #0E2038 100%)' }}
    >
      {/* Panel header — instrument readout, not a form label */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-200/80" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}>
          <IconRadar2 size={13} className="text-[#3E92CC]" />
          Damage Scan
        </div>
        <div
          id="damage-points-readout"
          className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${totalPoints > 0 ? 'text-red-400' : 'text-blue-200/40'}`}
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${totalPoints > 0 ? 'bg-red-400 shadow-[0_0_6px_1px_rgba(239,68,68,0.8)]' : 'bg-blue-200/30'}`} />
          {totalPoints} {totalPoints === 1 ? 'Point' : 'Points'} Marked
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {VIEWS.map(({ key, label, short, viewBox }) => {
          const Silhouette = SILHOUETTES[key]
          const markers = markersFor(key)
          return (
            <div key={key} className="relative rounded-lg border border-[#0F4C81]/40 bg-white/[0.03] p-2 overflow-hidden">
              {/* Reticle corner brackets — scanner viewfinder motif */}
              <div className="pointer-events-none absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t border-l border-[#3E92CC]/50" />
              <div className="pointer-events-none absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b border-r border-[#3E92CC]/50" />

              <div
                className="text-[9px] font-bold uppercase tracking-widest text-blue-200/50 mb-1.5"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
              >
                {short}
              </div>

              <div className="flex justify-center rounded-md" style={GRID_BG}>
                <div className="relative inline-block">
                  <svg
                    id={`damage-svg-${key}`}
                    viewBox={viewBox}
                    aria-label={label}
                    className={`h-[130px] w-auto ${readOnly ? '' : 'cursor-crosshair transition-opacity duration-200 hover:opacity-90'}`}
                    onClick={handleSvgClick(key)}
                  >
                    <Silhouette />
                  </svg>
                  {markers.map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      id={`damage-marker-${key}-${idx}`}
                      onClick={readOnly ? undefined : removeMarker(key, idx)}
                      title={m.note || 'Damage point — click to remove'}
                      className={`group absolute -ml-2.5 -mt-2.5 w-5 h-5 flex items-center justify-center ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                      style={{ left: `${m.xPct}%`, top: `${m.yPct}%` }}
                    >
                      {/* Pulse ring — plays once on mount (placement or load-in), respects reduced-motion */}
                      <span className="motion-safe:animate-[ping_0.9s_cubic-bezier(0,0,0.2,1)_1] absolute inline-flex h-full w-full rounded-full bg-red-400/70" />
                      <span className="relative inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold ring-[3px] ring-[#0B192C] shadow-[0_0_10px_3px_rgba(239,68,68,0.75)] group-hover:bg-red-400 transition-colors">
                        {idx + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {markers.length > 0 && !readOnly && (
                <div className="mt-2 space-y-1">
                  {markers.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0 shadow-[0_0_4px_1px_rgba(239,68,68,0.5)]">{idx + 1}</span>
                      <input
                        id={`damage-note-${key}-${idx}`}
                        type="text"
                        placeholder="Note (e.g. scratch, dent)"
                        value={m.note}
                        onChange={(e) => updateNote(key, idx, e.target.value)}
                        className="flex-1 h-6 px-2 text-[11px] bg-white/[0.06] text-blue-100 placeholder-blue-200/30 border border-[#0F4C81]/40 rounded focus:outline-none focus:border-[#3E92CC] focus:ring-1 focus:ring-[#3E92CC]/40"
                      />
                      <button type="button" onClick={removeMarker(key, idx)} className="text-blue-200/30 hover:text-red-400 transition-colors">
                        <IconX size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {markers.length > 0 && readOnly && (
                <div className="mt-2 space-y-1">
                  {markers.map((m, idx) => (
                    <div key={idx} className="text-[11px] text-blue-100/80 flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0 shadow-[0_0_4px_1px_rgba(239,68,68,0.5)]">{idx + 1}</span>
                      {m.note || <span className="text-blue-200/40 italic">No note</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!readOnly && (
        <div className="text-[10.5px] text-blue-200/50 mt-3 px-0.5">
          Tap a view to mark a damage point. Tap a marker to remove it.
        </div>
      )}
    </div>
  )
}

export default CarDamageDiagram
