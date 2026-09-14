import React from 'react';

// Common icon prop wrapper with high-tech SVG attributes
const IconWrapper = ({ children, size = 18, color = 'currentColor', className = '', style = {} }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="1.8" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`custom-svg-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    {children}
  </svg>
);

// 1. Tactical Optics Search Icon (Crisp Precision Reticle + Lens + Handle)
export const SearchIcon = (props) => (
  <IconWrapper {...props}>
    {/* Clean precision lens ring */}
    <circle cx="10.5" cy="10.5" r="7" strokeWidth="1.8" />
    {/* Inner focal target dot */}
    <circle cx="10.5" cy="10.5" r="2" fill={props.color || 'currentColor'} stroke="none" />
    {/* Precision corner frame reticles */}
    <path d="M3 7V3h4" strokeWidth="1.4" />
    <path d="M18 14v4h-4" strokeWidth="1.4" />
    {/* Tactical handle */}
    <line x1="15.5" y1="15.5" x2="21.5" y2="21.5" strokeWidth="2.4" strokeLinecap="round" />
  </IconWrapper>
);

// 2. Tactical Risk Radar Dial Icon (for "Calculate Risk" button)
export const RiskCalculatorIcon = (props) => (
  <IconWrapper {...props}>
    {/* Outer radar scope ring */}
    <circle cx="12" cy="12" r="8.5" strokeWidth="1.8" />
    {/* Active radar scan arc */}
    <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" strokeWidth="2.2" strokeLinecap="round" />
    {/* Crosshairs */}
    <line x1="12" y1="2" x2="12" y2="6" strokeWidth="1.5" />
    <line x1="12" y1="18" x2="12" y2="22" strokeWidth="1.5" />
    <line x1="2" y1="12" x2="6" y2="12" strokeWidth="1.5" />
    <line x1="18" y1="12" x2="22" y2="12" strokeWidth="1.5" />
    {/* Target center node */}
    <circle cx="12" cy="12" r="2" fill={props.color || 'currentColor'} stroke="none" />
  </IconWrapper>
);

// 3. High-Tech Satellite Array Icon (Orbital Dish + Solar Grid)
export const SatelliteIcon = (props) => (
  <IconWrapper {...props}>
    {/* Central core capsule */}
    <rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(45 12 12)" strokeWidth="2" />
    {/* Left Solar Panel Wing */}
    <path d="M3 6l4 4-2 2-4-4z" strokeWidth="1.5" />
    <line x1="4.5" y1="7.5" x2="6" y2="9" strokeWidth="1" />
    {/* Right Solar Panel Wing */}
    <path d="M17 14l4 4-2 2-4-4z" strokeWidth="1.5" />
    <line x1="18" y1="15" x2="19.5" y2="16.5" strokeWidth="1" />
    {/* Satellite Dish Transmission Arc Waves */}
    <path d="M16 4a5 5 0 0 1 4 4" strokeWidth="1.8" />
    <path d="M18 2a8 8 0 0 1 4 4" strokeWidth="1.2" strokeDasharray="2 2" />
    {/* Signal beam line */}
    <line x1="12" y1="12" x2="18" y2="6" strokeWidth="1" />
  </IconWrapper>
);

// 4. Geolocation Sphere Icon (Latitude / Longitude Grid)
export const GlobeIcon = (props) => (
  <IconWrapper {...props}>
    <circle cx="12" cy="12" r="9.5" strokeWidth="1.6" />
    <line x1="2.5" y1="12" x2="21.5" y2="12" strokeWidth="1.4" />
    <path d="M12 2.5a14 14 0 0 1 4 9.5 14 14 0 0 1-4 9.5 14 14 0 0 1-4-9.5 14 14 0 0 1 4-9.5z" strokeWidth="1.4" />
    <path d="M4.5 7.5h15" strokeWidth="1" strokeDasharray="1.5 1.5" />
    <path d="M4.5 16.5h15" strokeWidth="1" strokeDasharray="1.5 1.5" />
  </IconWrapper>
);

// 5. Folded Topographic Map Icon
export const MapIcon = (props) => (
  <IconWrapper {...props}>
    <polygon points="2 6 8 3 16 7 22 4 22 18 16 21 8 17 2 20 2 6" strokeWidth="1.6" />
    <line x1="8" y1="3" x2="8" y2="17" strokeWidth="1.5" />
    <line x1="16" y1="7" x2="16" y2="21" strokeWidth="1.5" />
    {/* Contour line detailing */}
    <path d="M4 11c2-1 3 1 4 0" strokeWidth="1" />
    <path d="M10 13c2-1 3 1 4 0" strokeWidth="1" />
  </IconWrapper>
);

// 6. Stacked Layer Map Icon
export const MapLayerIcon = (props) => (
  <IconWrapper {...props}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" strokeWidth="1.6" />
    <polyline points="2 12 12 17 22 12" strokeWidth="1.6" />
    <polyline points="2 17 12 22 22 17" strokeWidth="1.6" />
    <circle cx="12" cy="7" r="1.5" fill={props.color || 'currentColor'} />
  </IconWrapper>
);

// 7. Analytics Donut & Pie Chart Icon
export const PieChartIcon = (props) => (
  <IconWrapper {...props}>
    <path d="M21.2 15.3A10 10 0 1 1 8.7 2.8" strokeWidth="1.8" />
    <path d="M22 11A10 10 0 0 0 13 2v9z" strokeWidth="1.8" />
    <circle cx="13" cy="11" r="1.5" />
  </IconWrapper>
);

// 8. Lightning & Live Energy Bolt Icon
export const ZapIcon = (props) => (
  <IconWrapper {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeWidth="1.8" />
  </IconWrapper>
);

// 9. Geopolitical Warning Triangle Icon
export const AlertTriangleIcon = (props) => (
  <IconWrapper {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeWidth="1.8" />
    <line x1="12" y1="9" x2="12" y2="13" strokeWidth="2" />
    <circle cx="12" cy="17" r="1" fill={props.color || 'currentColor'} />
  </IconWrapper>
);

// 10. AI Security Defense Shield Icon
export const ShieldAlertIcon = (props) => (
  <IconWrapper {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="1.8" />
    <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" />
    <circle cx="12" cy="15.5" r="1" fill={props.color || 'currentColor'} />
  </IconWrapper>
);

// 11. Maritime Cargo Ship Icon
export const ShipIcon = (props) => (
  <IconWrapper {...props}>
    <path d="M2 20c1.5.8 3.5.8 5 0 1.5-.8 3.5-.8 5 0 1.5.8 3.5.8 5 0 1.5-.8 3.5-.8 5 0" strokeWidth="1.5" />
    <path d="M19.4 17A11.6 11.6 0 0 0 21 12l-9-4-9 4c0 2.5.8 4.7 2.4 6.3" strokeWidth="1.8" />
    <rect x="7" y="5" width="4" height="3" strokeWidth="1.2" />
    <rect x="13" y="5" width="4" height="3" strokeWidth="1.2" />
    <line x1="12" y1="8" x2="12" y2="3" strokeWidth="1.5" />
  </IconWrapper>
);

// 12. Naval Anchor Icon (Ports & Logistics)
export const AnchorIcon = (props) => (
  <IconWrapper {...props}>
    <circle cx="12" cy="5" r="2.5" strokeWidth="1.8" />
    <line x1="12" y1="7.5" x2="12" y2="21" strokeWidth="2" />
    <path d="M5 12H2a10 10 0 0 0 20 0h-3" strokeWidth="1.8" />
    <line x1="9" y1="11" x2="15" y2="11" strokeWidth="1.8" />
  </IconWrapper>
);

// 13. Cyclone Storm Icon
export const StormIcon = (props) => (
  <IconWrapper {...props}>
    <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" strokeWidth="1.8" />
    <path d="M9.6 4.6A2 2 0 1 1 11 8H2" strokeWidth="1.6" />
    <path d="M12.6 19.4A2 2 0 1 0 14 16H2" strokeWidth="1.6" />
  </IconWrapper>
);

// 14. Cloud Rain Weather Icon
export const CloudRainIcon = (props) => (
  <IconWrapper {...props}>
    <path d="M4 14.89A6 6 0 0 1 15.65 9.4a5 5 0 1 1 5.35 6.6" strokeWidth="1.8" />
    <line x1="16" y1="14" x2="14" y2="18" strokeWidth="1.8" />
    <line x1="8" y1="14" x2="6" y2="18" strokeWidth="1.8" />
    <line x1="12" y1="16" x2="10" y2="20" strokeWidth="1.8" />
  </IconWrapper>
);

// 15. Weather Wind Vector Icon
export const WindIcon = (props) => (
  <IconWrapper {...props}>
    <path d="M12.8 19.6A2 2 0 1 0 14 16H2" strokeWidth="1.8" />
    <path d="M17.5 8a2.5 2.5 0 1 1 2 4H2" strokeWidth="1.8" />
    <path d="M9.8 4.4A2 2 0 1 1 11 8H2" strokeWidth="1.8" />
  </IconWrapper>
);

// 16. Market Economy Trend Graph Icon
export const TrendingUpIcon = (props) => (
  <IconWrapper {...props}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" strokeWidth="2" />
    <polyline points="17 6 23 6 23 12" strokeWidth="2" />
    <line x1="1" y1="21" x2="23" y2="21" strokeWidth="1" strokeDasharray="2 2" />
  </IconWrapper>
);

// 17. Economy Dollar Sign Icon
export const DollarSignIcon = (props) => (
  <IconWrapper {...props}>
    <line x1="12" y1="2" x2="12" y2="22" strokeWidth="1.8" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeWidth="1.8" />
  </IconWrapper>
);

// 18. Bar Chart Breakdown Icon
export const BarChart2Icon = (props) => (
  <IconWrapper {...props}>
    <line x1="18" y1="20" x2="18" y2="10" strokeWidth="2" />
    <line x1="12" y1="20" x2="12" y2="4" strokeWidth="2" />
    <line x1="6" y1="20" x2="6" y2="14" strokeWidth="2" />
    <line x1="2" y1="20" x2="22" y2="20" strokeWidth="1" />
  </IconWrapper>
);

// 19. Ingested Articles Newspaper Icon
export const NewspaperIcon = (props) => (
  <IconWrapper {...props}>
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" strokeWidth="1.6" />
    <path d="M18 14h-8" strokeWidth="1.5" />
    <path d="M15 18h-5" strokeWidth="1.5" />
    <rect x="10" y="6" width="8" height="4" rx="0.5" strokeWidth="1.5" />
  </IconWrapper>
);

// 20. Chronometer Clock Icon
export const ClockIcon = (props) => (
  <IconWrapper {...props}>
    <circle cx="12" cy="12" r="9.5" strokeWidth="1.6" />
    <polyline points="12 6 12 12 16 14" strokeWidth="2" />
    <circle cx="12" cy="12" r="1" fill={props.color || 'currentColor'} />
  </IconWrapper>
);

// 21. System Telemetry Pulse Heartbeat Icon
export const ActivityIcon = (props) => (
  <IconWrapper {...props}>
    <polyline points="22 12 18 12 14 22 10 2 6 12 2 12" strokeWidth="2" />
    <circle cx="14" cy="22" r="1.5" fill={props.color || 'currentColor'} />
  </IconWrapper>
);

// 22. Database Storage Stack Icon
export const DatabaseIcon = (props) => (
  <IconWrapper {...props}>
    <ellipse cx="12" cy="5" rx="9" ry="3" strokeWidth="1.6" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" strokeWidth="1.6" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" strokeWidth="1.6" />
    <circle cx="6" cy="12" r="1" fill={props.color || 'currentColor'} />
    <circle cx="6" cy="19" r="1" fill={props.color || 'currentColor'} />
  </IconWrapper>
);

// 23. Filter Funnel Icon
export const FilterIcon = (props) => (
  <IconWrapper {...props}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" strokeWidth="1.6" />
  </IconWrapper>
);

// 24. Radio Signal Antenna Icon
export const RadioIcon = (props) => (
  <IconWrapper {...props}>
    <path d="M4.9 19.1C1.9 16.1 1.9 11.3 4.9 8.3" strokeWidth="1.5" />
    <path d="M7.8 16.2c-1.6-1.6-1.6-4.2 0-5.8" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="2.5" fill={props.color || 'currentColor'} strokeWidth="1" />
    <path d="M16.2 7.8c1.6 1.6 1.6 4.2 0 5.8" strokeWidth="1.5" />
    <path d="M19.1 4.9c3 3 3 7.8 0 10.8" strokeWidth="1.5" />
  </IconWrapper>
);

// 25. RSS Feed Broadcast Icon
export const RssIcon = (props) => (
  <IconWrapper {...props}>
    <path d="M4 11a9 9 0 0 1 9 9" strokeWidth="2" />
    <path d="M4 4a16 16 0 0 1 16 16" strokeWidth="1.8" />
    <circle cx="5" cy="19" r="1.5" fill={props.color || 'currentColor'} />
  </IconWrapper>
);

// 26. AI Sparkles Icon
export const SparklesIcon = (props) => (
  <IconWrapper {...props}>
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" strokeWidth="1.8" />
    <path d="M5 3v4" strokeWidth="1.5" />
    <path d="M19 17v4" strokeWidth="1.5" />
  </IconWrapper>
);

// 27. AI CPU Microchip Icon
export const CpuIcon = (props) => (
  <IconWrapper {...props}>
    <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="1.8" />
    <rect x="9" y="9" width="6" height="6" strokeWidth="1.5" />
    <line x1="9" y1="1" x2="9" y2="4" strokeWidth="1.5" />
    <line x1="15" y1="1" x2="15" y2="4" strokeWidth="1.5" />
    <line x1="9" y1="20" x2="9" y2="23" strokeWidth="1.5" />
    <line x1="15" y1="20" x2="15" y2="23" strokeWidth="1.5" />
    <line x1="20" y1="9" x2="23" y2="9" strokeWidth="1.5" />
    <line x1="20" y1="15" x2="23" y2="15" strokeWidth="1.5" />
    <line x1="1" y1="9" x2="4" y2="9" strokeWidth="1.5" />
    <line x1="1" y1="15" x2="4" y2="15" strokeWidth="1.5" />
  </IconWrapper>
);

// 28. Precision Target Vector Icon
export const TargetIcon = (props) => (
  <IconWrapper {...props}>
    <circle cx="12" cy="12" r="9.5" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="5.5" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="1.5" fill={props.color || 'currentColor'} />
    <line x1="12" y1="1" x2="12" y2="4" strokeWidth="1.5" />
    <line x1="12" y1="20" x2="12" y2="23" strokeWidth="1.5" />
    <line x1="1" y1="12" x2="4" y2="12" strokeWidth="1.5" />
    <line x1="20" y1="12" x2="23" y2="12" strokeWidth="1.5" />
  </IconWrapper>
);

// 29. Location Pin Marker Icon
export const MapPinIcon = (props) => (
  <IconWrapper {...props}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" strokeWidth="1.8" />
    <circle cx="12" cy="10" r="3" strokeWidth="1.5" fill={props.color || 'currentColor'} fillOpacity="0.2" />
  </IconWrapper>
);

// 30. Information Circle Icon
export const InfoIcon = (props) => (
  <IconWrapper {...props}>
    <circle cx="12" cy="12" r="9.5" strokeWidth="1.6" />
    <line x1="12" y1="16" x2="12" y2="11" strokeWidth="2" />
    <circle cx="12" cy="7.5" r="1" fill={props.color || 'currentColor'} />
  </IconWrapper>
);

// 31. Alert Warning Circle Icon
export const AlertCircleIcon = (props) => (
  <IconWrapper {...props}>
    <circle cx="12" cy="12" r="9.5" strokeWidth="1.8" />
    <line x1="12" y1="8" x2="12" y2="13" strokeWidth="2" />
    <circle cx="12" cy="16.5" r="1" fill={props.color || 'currentColor'} />
  </IconWrapper>
);

// 32. Animated Spinner / Sync Icon
export const RefreshCwIcon = (props) => (
  <IconWrapper {...props}>
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" strokeWidth="1.8" />
    <path d="M3 3v5h5" strokeWidth="1.8" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" strokeWidth="1.8" />
    <path d="M16 16h5v5" strokeWidth="1.8" />
  </IconWrapper>
);

// 33. Cargo Package Box Icon
export const PackageIcon = (props) => (
  <IconWrapper {...props}>
    <path d="m7.5 4.27 9 5.15" strokeWidth="1.5" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" strokeWidth="1.8" />
    <path d="m3.3 7 8.7 5 8.7-5" strokeWidth="1.5" />
    <path d="M12 22V12" strokeWidth="1.5" />
  </IconWrapper>
);

// 34. Close X Icon
export const CloseIcon = (props) => (
  <IconWrapper {...props}>
    <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" />
    <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" />
  </IconWrapper>
);

// 35. Check Circle Status Icon
export const CheckCircleIcon = (props) => (
  <IconWrapper {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeWidth="1.8" />
    <polyline points="22 4 12 14.01 9 11.01" strokeWidth="2" />
  </IconWrapper>
);

// 36. Document Text Icon
export const FileTextIcon = (props) => (
  <IconWrapper {...props}>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" strokeWidth="1.6" />
    <polyline points="14 2 14 8 20 8" strokeWidth="1.6" />
    <line x1="16" y1="13" x2="8" y2="13" strokeWidth="1.5" />
    <line x1="16" y1="17" x2="8" y2="17" strokeWidth="1.5" />
  </IconWrapper>
);

// 37. External Link Icon
export const ExternalLinkIcon = (props) => (
  <IconWrapper {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeWidth="1.6" />
    <polyline points="15 3 21 3 21 9" strokeWidth="2" />
    <line x1="10" y1="14" x2="21" y2="3" strokeWidth="2" />
  </IconWrapper>
);

// 38. Sliders Adjust Controls Icon
export const SlidersIcon = (props) => (
  <IconWrapper {...props}>
    <line x1="4" y1="21" x2="4" y2="14" strokeWidth="1.8" />
    <line x1="4" y1="10" x2="4" y2="3" strokeWidth="1.8" />
    <line x1="12" y1="21" x2="12" y2="12" strokeWidth="1.8" />
    <line x1="12" y1="8" x2="12" y2="3" strokeWidth="1.8" />
    <line x1="20" y1="21" x2="20" y2="16" strokeWidth="1.8" />
    <line x1="20" y1="12" x2="20" y2="3" strokeWidth="1.8" />
    <line x1="1" y1="14" x2="7" y2="14" strokeWidth="2" />
    <line x1="9" y1="8" x2="15" y2="8" strokeWidth="2" />
    <line x1="17" y1="16" x2="23" y2="16" strokeWidth="2" />
  </IconWrapper>
);

// 39. Eye View Icon
export const EyeIcon = (props) => (
  <IconWrapper {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="3" strokeWidth="1.8" fill="none" />
  </IconWrapper>
);
