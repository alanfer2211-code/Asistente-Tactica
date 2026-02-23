<!-- Inline SVG: pega esto directamente en tu HTML donde quieras mostrar el logo -->
<svg class="tactica-logo"
     xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 100 100"
     width="160"
     height="160"
     role="img"
     aria-labelledby="tactica-title tactica-desc"
     preserveAspectRatio="xMidYMid meet">
  <title id="tactica-title">Táctica Ingeniería — logo</title>
  <desc id="tactica-desc">Símbolo cuadrado con icono central y marcas laterales, en degradado verde-azulado.</desc>

  <defs>
    <linearGradient id="tactica-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" style="stop-color: var(--tactica-grad-start, #2bf2b5)" />
      <stop offset="1" style="stop-color: var(--tactica-grad-end, #15c9b0)" />
    </linearGradient>

    <filter id="tactica-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="2.2" result="b"/>
      <feMerge>
        <feMergeNode in="b"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- marco cuadrado -->
  <rect x="18" y="18" width="64" height="64" rx="10"
        fill="none"
        stroke="url(#tactica-grad)"
        stroke-width="3.2"
        filter="url(#tactica-glow)"/>

  <!-- marcas laterales -->
  <g stroke="url(#tactica-grad)" stroke-width="3.2" stroke-linecap="round" filter="url(#tactica-glow)" opacity="0.95">
    <line x1="9"  y1="34" x2="18" y2="34"/>
    <line x1="9"  y1="50" x2="18" y2="50"/>
    <line x1="9"  y1="66" x2="18" y2="66"/>
    <line x1="82" y1="34" x2="91" y2="34"/>
    <line x1="82" y1="50" x2="91" y2="50"/>
    <line x1="82" y1="66" x2="91" y2="66"/>
  </g>

  <!-- círculo central con leve opacidad -->
  <circle cx="50" cy="50" r="16" fill="url(#tactica-grad)" opacity="0.22" filter="url(#tactica-glow)"/>

  <!-- cruz central -->
  <path d="M40 42h20M50 42v20" fill="none" stroke="url(#tactica-grad)" stroke-width="3.2" stroke-linecap="round" filter="url(#tactica-glow)"/>

  <!-- check/marca en primer plano (oscuro para contraste) -->
  <path d="M41.5 54.5l5 5 12-14" fill="none" stroke="var(--tactica-foreground, #06110d)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
</svg>