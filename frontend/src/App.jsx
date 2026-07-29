import React, { useState, useEffect, useCallback, useRef } from 'react';

// --------------------------------------------------------------------------
// Custom Interactive Glowing Cursor Follower Component
// --------------------------------------------------------------------------
function CustomCursorFollower() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [followerPos, setFollowerPos] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });

      const target = e.target;
      if (target) {
        const isInteractive = target.closest(
          'button, a, input, select, .country-chip, .article-card, .tab-btn, .filter-chip, .map-view-btn, .suggestion-chip'
        );
        setIsHovering(!!isInteractive);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    let animationFrameId;
    const follow = () => {
      setFollowerPos((prev) => ({
        x: prev.x + (position.x - prev.x) * 0.18,
        y: prev.y + (position.y - prev.y) * 0.18,
      }));
      animationFrameId = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(animationFrameId);
  }, [position]);

  return (
    <>
      <div 
        className="custom-cursor-dot" 
        style={{ left: `${position.x}px`, top: `${position.y}px` }} 
      />
      <div 
        className={`custom-cursor-follower ${isHovering ? 'hovering' : ''}`} 
        style={{ left: `${followerPos.x}px`, top: `${followerPos.y}px` }} 
      />
    </>
  );
}

// --------------------------------------------------------------------------
// URL Sanitizer Helper Function (Resolves Bloomberg ERR_CONNECTION_RESET)
// --------------------------------------------------------------------------
const sanitizeArticleUrl = (article) => {
  if (!article) return '#';
  const title = article.title || '';
  let url = (article.url || '').trim();

  if (!url || url.includes(' ') || url === '#' || url === 'http://' || url === 'https://') {
    return `https://news.google.com/search?q=${encodeURIComponent(title || 'supply chain disruption')}`;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  if (url.toLowerCase().includes('bloomberg.com')) {
    return `https://news.google.com/search?q=${encodeURIComponent(title || 'Bloomberg supply chain')}`;
  }

  return url;
};

// --------------------------------------------------------------------------
// Expanded Global Country Supply Chain Risk Database (20 Major Economies)
// --------------------------------------------------------------------------
const COUNTRY_RISK_DB = {
  US: {
    id: 'US',
    flag: '🇺🇸',
    name: 'United States',
    region: 'North America',
    lat: 37.0,
    lng: -95.0,
    keywords: ['la', 'los angeles', 'port', 'us', 'west coast', 'strike', 'tariff', 'california'],
    baseScore: 78,
    status: 'HIGH RISK (CRITICAL)',
    categoryScores: { geopolitical: 82, logistics: 86, weather: 48, market: 78 },
    chokePoints: ['Port of Los Angeles / Long Beach', 'US Gulf Coast Terminals', 'Midwest Rail Logistics'],
    highlights: [
      'West Coast Port labor wage disputes and berth delays',
      'Increased tariff scrutiny on imported electronic components',
      'Container dwell time elevated at major intermodal hubs'
    ]
  },
  CN: {
    id: 'CN',
    flag: '🇨🇳',
    name: 'China',
    region: 'Asia-Pacific',
    lat: 35.0,
    lng: 104.0,
    keywords: ['china', 'shanghai', 'semiconductor', 'asia', 'cargo', 'shenzhen', 'ningbo'],
    baseScore: 85,
    status: 'HIGH RISK (CRITICAL)',
    categoryScores: { geopolitical: 92, logistics: 85, weather: 55, market: 82 },
    chokePoints: ['Port of Shanghai', 'Ningbo-Zhoushan Port', 'Shenzhen Yantian Container Terminal'],
    highlights: [
      'Export clearance backlog on high-tech and semiconductor goods',
      'Strict maritime customs inspections creating vessel queues',
      'Air freight congestion at Pudong International Airport'
    ]
  },
  IN: {
    id: 'IN',
    flag: '🇮🇳',
    name: 'India',
    region: 'South Asia',
    lat: 20.5,
    lng: 78.9,
    keywords: ['india', 'mundra', 'nhava sheva', 'mumbai', 'asia', 'delhi'],
    baseScore: 72,
    status: 'ELEVATED RISK',
    categoryScores: { geopolitical: 64, logistics: 80, weather: 72, market: 68 },
    chokePoints: ['Nhava Sheva (JNPT) Mumbai', 'Mundra Port Logistics Hub', 'Chennai Terminal'],
    highlights: [
      'Container availability shortage for outward manufacturing exports',
      'Monsoon weather disruptions impacting coastal shipping schedules',
      'Customs inspection lead time spikes on raw material imports'
    ]
  },
  DE: {
    id: 'DE',
    flag: '🇩🇪',
    name: 'Germany',
    region: 'Europe',
    lat: 51.1,
    lng: 10.4,
    keywords: ['germany', 'hamburg', 'europe', 'automotive', 'rhine'],
    baseScore: 62,
    status: 'MODERATE RISK',
    categoryScores: { geopolitical: 65, logistics: 66, weather: 45, market: 60 },
    chokePoints: ['Port of Hamburg Container Hub', 'Bremerhaven Terminal', 'Rhine Waterways'],
    highlights: [
      'Automotive supply chain component supply bottlenecks',
      'Inland waterways flow variations impacting raw material transport',
      'Industrial energy cost volatility'
    ]
  },
  NL: {
    id: 'NL',
    flag: '🇳🇱',
    name: 'Netherlands',
    region: 'Europe',
    lat: 52.3,
    lng: 4.9,
    keywords: ['rotterdam', 'europe', 'netherlands', 'port', 'feeder', 'rhine'],
    baseScore: 68,
    status: 'ELEVATED RISK',
    categoryScores: { geopolitical: 64, logistics: 76, weather: 42, market: 70 },
    chokePoints: ['Port of Rotterdam Maasvlakte', 'Rhine Waterway Inland Feeder'],
    highlights: [
      'Feeder vessel queuing at container terminals',
      'Rhine river barge capacity constraints during seasonal fluctuations',
      'European rail freight bottleneck connections'
    ]
  },
  EG: {
    id: 'EG',
    flag: '🇪🇬',
    name: 'Egypt & Red Sea',
    region: 'Middle East / North Africa',
    lat: 26.8,
    lng: 30.8,
    keywords: ['suez', 'red sea', 'iran', 'gulf', 'tanker', 'maritime', 'rerouting', 'egypt'],
    baseScore: 94,
    status: 'SEVERE CRISIS (CRITICAL)',
    categoryScores: { geopolitical: 98, logistics: 94, weather: 30, market: 88 },
    chokePoints: ['Suez Canal Maritime Corridor', 'Bab-el-Mandeb Strait', 'Red Sea Transit Zone'],
    highlights: [
      'Geopolitical maritime attacks forcing carrier rerouting around Africa',
      'Transit times increased by 10 to 14 days for Asia-Europe trade lanes',
      'Bunker fuel consumption and insurance premiums surging dramatically'
    ]
  },
  SG: {
    id: 'SG',
    flag: '🇸🇬',
    name: 'Singapore',
    region: 'Asia-Pacific',
    lat: 1.35,
    lng: 103.8,
    keywords: ['singapore', 'asia', 'strait', 'bunker', 'transshipment'],
    baseScore: 74,
    status: 'ELEVATED RISK',
    categoryScores: { geopolitical: 58, logistics: 82, weather: 50, market: 76 },
    chokePoints: ['Singapore Strait Passage', 'Pasir Panjang Terminal Hub'],
    highlights: [
      'Major transshipment vessel congestion due to Red Sea rerouting schedules',
      'Bunker refueling lead times extended by 48-72 hours',
      'High container yard density at main container berths'
    ]
  },
  JP: {
    id: 'JP',
    flag: '🇯🇵',
    name: 'Japan',
    region: 'East Asia',
    lat: 36.2,
    lng: 138.2,
    keywords: ['japan', 'tokyo', 'yokohama', 'semiconductors', 'asia'],
    baseScore: 56,
    status: 'MODERATE RISK',
    categoryScores: { geopolitical: 58, logistics: 54, weather: 62, market: 52 },
    chokePoints: ['Tokyo Bay Container Terminal', 'Port of Yokohama'],
    highlights: [
      'Seasonal typhoon track surveillance along coastal routes',
      'High efficiency in electronics export flow with mild port delays',
      'Stable maritime vessel berth allocation'
    ]
  },
  GB: {
    id: 'GB',
    flag: '🇬🇧',
    name: 'United Kingdom',
    region: 'Europe',
    lat: 55.3,
    lng: -3.4,
    keywords: ['uk', 'britain', 'felixstowe', 'london', 'dover', 'europe'],
    baseScore: 65,
    status: 'MODERATE RISK',
    categoryScores: { geopolitical: 62, logistics: 70, weather: 55, market: 66 },
    chokePoints: ['Port of Felixstowe', 'Dover Maritime Crossing', 'London Gateway'],
    highlights: [
      'Felixstowe Port customs inspection lead time delays',
      'Cross-channel freight flow volume spikes',
      'Heavy goods vehicle driver shortage impacts'
    ]
  },
  BR: {
    id: 'BR',
    flag: '🇧🇷',
    name: 'Brazil',
    region: 'South America',
    lat: -14.2,
    lng: -51.9,
    keywords: ['brazil', 'santos', 'amazon', 'south america', 'grain'],
    baseScore: 69,
    status: 'ELEVATED RISK',
    categoryScores: { geopolitical: 60, logistics: 74, weather: 72, market: 65 },
    chokePoints: ['Port of Santos Grain Terminal', 'Paranaguá Bulk Corridor'],
    highlights: [
      'Santos Port agricultural grain export clearance backlogs',
      'Low Amazon river water levels impacting barge transit',
      'Highway freight labor disputes'
    ]
  },
  AU: {
    id: 'AU',
    flag: '🇦🇺',
    name: 'Australia',
    region: 'Oceania',
    lat: -25.2,
    lng: 133.7,
    keywords: ['australia', 'sydney', 'melbourne', 'freight', 'oceania'],
    baseScore: 54,
    status: 'LOW / MODERATE RISK',
    categoryScores: { geopolitical: 50, logistics: 56, weather: 60, market: 50 },
    chokePoints: ['Port Botany Sydney', 'Port of Melbourne Container Terminal'],
    highlights: [
      'Long-distance trans-ocean shipping transit lead times',
      'Seasonal cyclone warnings across Northern Coast maritime lanes',
      'Stable domestic freight transport routes'
    ]
  },
  FR: {
    id: 'FR',
    flag: '🇫🇷',
    name: 'France',
    region: 'Europe',
    lat: 46.2,
    lng: 2.2,
    keywords: ['france', 'le havre', 'marseille', 'europe', 'dockworkers'],
    baseScore: 63,
    status: 'MODERATE RISK',
    categoryScores: { geopolitical: 68, logistics: 65, weather: 40, market: 62 },
    chokePoints: ['Port of Le Havre', 'Marseille-Fos Terminal'],
    highlights: [
      'Periodic dockworker strike actions affecting cargo handling',
      'Rail freight network congestion connecting Central Europe',
      'High energy compliance costs'
    ]
  },
  CA: {
    id: 'CA',
    flag: '🇨🇦',
    name: 'Canada',
    region: 'North America',
    lat: 56.1,
    lng: -106.3,
    keywords: ['canada', 'vancouver', 'montreal', 'rail', 'strike'],
    baseScore: 67,
    status: 'ELEVATED RISK',
    categoryScores: { geopolitical: 58, logistics: 75, weather: 65, market: 64 },
    chokePoints: ['Port of Vancouver Terminal', 'CN/CPKC Transcontinental Rail'],
    highlights: [
      'Vancouver container terminal congestion and dwell times',
      'Rail labor contract negotiations affecting cross-border trade',
      'Winter weather impacts on northern transport corridors'
    ]
  },
  MX: {
    id: 'MX',
    flag: '🇲🇽',
    name: 'Mexico',
    region: 'North America',
    lat: 23.6,
    lng: -102.5,
    keywords: ['mexico', 'manzanillo', 'laredo', 'border', 'cross-border'],
    baseScore: 71,
    status: 'ELEVATED RISK',
    categoryScores: { geopolitical: 72, logistics: 76, weather: 50, market: 74 },
    chokePoints: ['Port of Manzanillo', 'Laredo Border Crossing Corridor'],
    highlights: [
      'Nearshoring manufacturing surge straining border customs infrastructure',
      'Manzanillo port container yard congestion',
      'Trucking freight capacity constraints'
    ]
  },
  KR: {
    id: 'KR',
    flag: '🇰🇷',
    name: 'South Korea',
    region: 'East Asia',
    lat: 35.9,
    lng: 127.7,
    keywords: ['korea', 'busan', 'semiconductor', 'asia', 'incheon'],
    baseScore: 60,
    status: 'MODERATE RISK',
    categoryScores: { geopolitical: 65, logistics: 58, weather: 50, market: 62 },
    chokePoints: ['Port of Busan Container Hub', 'Incheon Logistics Center'],
    highlights: [
      'High-tech semiconductor and battery export flow stability',
      'Busan transshipment port congestion from rerouted vessels',
      'Raw chemical import price fluctuations'
    ]
  },
  AE: {
    id: 'AE',
    flag: '🇦🇪',
    name: 'United Arab Emirates',
    region: 'Middle East',
    lat: 23.4,
    lng: 53.8,
    keywords: ['dubai', 'jebel ali', 'uae', 'gulf', 'air cargo'],
    baseScore: 64,
    status: 'MODERATE RISK',
    categoryScores: { geopolitical: 70, logistics: 60, weather: 35, market: 65 },
    chokePoints: ['Jebel Ali Port Dubai', 'Strait of Hormuz Approach'],
    highlights: [
      'Increased sea-air multimodal transshipment demand bypassing Red Sea',
      'Strait of Hormuz tanker surveillance',
      'High air cargo capacity utilization at Dubai World Central'
    ]
  }
};

function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Category & Filter state
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Semantic Search States
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'search' | 'analytics'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [aiSummary, setAiSummary] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8080/api/articles');
      if (!response.ok) {
        throw new Error(`Failed to load articles (HTTP ${response.status})`);
      }
      const data = await response.json();
      setArticles(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Could not connect to the news API server. Please make sure the backend is running on http://localhost:8080.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 15-Minute Automatic Article Refresh Trigger
  useEffect(() => {
    fetchArticles();

    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
    const intervalId = setInterval(() => {
      console.log('15-minute auto-refresh triggered for articles...');
      fetchArticles();
    }, FIFTEEN_MINUTES_MS);

    return () => clearInterval(intervalId);
  }, [fetchArticles]);

  const handleSearch = async (e, customQuery) => {
    if (e) e.preventDefault();
    const queryToUse = customQuery || searchQuery;
    if (!queryToUse.trim()) return;

    if (customQuery) setSearchQuery(customQuery);
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setAiSummary(null);

    try {
      const response = await fetch('http://localhost:8080/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: queryToUse }),
      });

      if (!response.ok) {
        throw new Error(`Search failed (HTTP ${response.status})`);
      }

      const data = await response.json();
      setSearchResults(data.matches || []);
      setAiSummary(data.aiSummary || null);
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('Failed to perform semantic search. Please check that the backend is running.');
    } finally {
      setSearching(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return dateStr;
    }
  };

  const filteredArticles = React.useMemo(() => {
    if (categoryFilter === 'ALL') return articles;
    return articles.filter(a => {
      const cat = (a.riskCategory || '').toUpperCase();
      const title = (a.title || '').toUpperCase();
      if (categoryFilter === 'GEOPOLITICAL') return cat.includes('GEO') || title.includes('WAR') || title.includes('TARIFF') || title.includes('STRIKE') || title.includes('SANCTION');
      if (categoryFilter === 'LOGISTICS') return cat.includes('LOGISTICS') || title.includes('PORT') || title.includes('SHIP') || title.includes('CONTAINER') || title.includes('DELAY');
      if (categoryFilter === 'WEATHER') return cat.includes('WEATHER') || title.includes('STORM') || title.includes('CANAL') || title.includes('DROUGHT') || title.includes('FLOOD');
      if (categoryFilter === 'MARKET') return cat.includes('MARKET') || title.includes('PRICE') || title.includes('COST') || title.includes('DEMAND') || title.includes('INFLATION');
      return true;
    });
  }, [articles, categoryFilter]);

  const quickSearchPrompts = [
    "Red Sea shipping rerouting",
    "US West Coast port strikes",
    "Semiconductor supply tariffs",
    "Panama Canal drought delays",
    "Bunker fuel cost spikes"
  ];

  return (
    <div className="container">
      {/* Interactive Glowing Cursor Follower */}
      <CustomCursorFollower />

      {/* Dynamic Animated Deep Space Nebula Mesh */}
      <div className="nebula-bg-wrapper">
        <div className="nebula-blob nebula-blob-1" />
        <div className="nebula-blob nebula-blob-2" />
        <div className="nebula-blob nebula-blob-3" />
      </div>

      <header>
        <div className="header-title-container">
          <div className="brand-wrapper">
            <div className="brand-icon-box">🛰️</div>
            <div>
              <h1>Supply Chain Risk Monitor</h1>
              <p className="subtitle">
                <span className="live-indicator">
                  <span className="pulse-dot"></span> REAL-TIME SATELLITE (15m Auto-Sync)
                </span>
                NASA Satellite Photography & Esri World Imagery Analytics
              </p>
            </div>
          </div>

          {activeTab === 'feed' && (
            <button 
              className="btn-refresh" 
              onClick={fetchArticles} 
              disabled={loading}
              aria-label="Refresh feeds"
              id="refresh-btn"
            >
              <svg 
                className={loading ? 'spin' : ''} 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              {loading ? 'Syncing Feeds...' : 'Refresh Feeds'}
            </button>
          )}
        </div>

        {/* Floating Tab Switcher */}
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            📋 All Feeds ({articles.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            🔍 Semantic AI Search
          </button>
          <button 
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            🌎 NASA Satellite & Risk Factors
          </button>
        </div>
      </header>

      {/* Stats Summary Banner */}
      {activeTab === 'feed' && !error && (
        <section className="stats-banner" aria-label="Dashboard Stats">
          <div className="stat-card" style={{ '--accent-color': 'var(--success)' }}>
            <div className="stat-icon" style={{ color: 'var(--success)' }}>🟢</div>
            <div className="stat-item">
              <span className="stat-label">System Status</span>
              <span className="stat-value" style={{ color: 'var(--success)', fontSize: '1.1rem' }}>
                Active (15m Auto-Sync)
              </span>
            </div>
          </div>

          <div className="stat-card" style={{ '--accent-color': 'var(--accent-cyan)' }}>
            <div className="stat-icon" style={{ color: 'var(--accent-cyan)' }}>📰</div>
            <div className="stat-item">
              <span className="stat-label">Ingested Articles</span>
              <span className="stat-value">{articles.length}</span>
            </div>
          </div>

          <div className="stat-card" style={{ '--accent-color': 'var(--accent-indigo)' }}>
            <div className="stat-icon" style={{ color: 'var(--accent-indigo)' }}>⚡</div>
            <div className="stat-item">
              <span className="stat-label">Filtered Feeds</span>
              <span className="stat-value">{filteredArticles.length}</span>
            </div>
          </div>

          <div className="stat-card" style={{ '--accent-color': 'var(--warning)' }}>
            <div className="stat-icon" style={{ color: 'var(--warning)' }}>🕒</div>
            <div className="stat-item">
              <span className="stat-label">Last Synchronization</span>
              <span className="stat-value" style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
                {lastUpdated || 'Just Now'}
              </span>
            </div>
          </div>
        </section>
      )}

      <main>
        {activeTab === 'feed' ? (
          /* ALL FEEDS TAB */
          <div>
            {!error && articles.length > 0 && (
              <div className="filter-bar">
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Filter Category:
                </div>
                <div className="filter-chips">
                  {[
                    { id: 'ALL', label: '🌐 All Feeds' },
                    { id: 'GEOPOLITICAL', label: '⚠️ Geopolitical' },
                    { id: 'LOGISTICS', label: '🚢 Logistics & Ports' },
                    { id: 'WEATHER', label: '🌪️ Weather & Climate' },
                    { id: 'MARKET', label: '📈 Market & Economy' }
                  ].map(chip => (
                    <button
                      key={chip.id}
                      className={`filter-chip ${categoryFilter === chip.id ? 'active' : ''}`}
                      onClick={() => setCategoryFilter(chip.id)}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && articles.length === 0 ? (
              <div className="articles-grid">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <div key={idx} className="skeleton-card" />
                ))}
              </div>
            ) : error ? (
              <div className="error-container">
                <div className="error-title">Database / API Offline</div>
                <p className="error-msg">{error}</p>
                <button className="btn-retry" onClick={fetchArticles}>
                  Re-connect Feed Service
                </button>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="empty-container">
                <div className="empty-icon">📦</div>
                <div className="empty-title">No Disruption Reports Found</div>
                <p className="empty-desc">
                  {articles.length === 0 
                    ? 'The news database is currently empty. Run article collectors to populate feed data.'
                    : `No news articles matched the selected "${categoryFilter}" filter category.`
                  }
                </p>
                {categoryFilter !== 'ALL' && (
                  <button className="btn-retry" style={{ marginTop: '1rem' }} onClick={() => setCategoryFilter('ALL')}>
                    Reset Category Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="articles-grid">
                {filteredArticles.map((article) => {
                  const categoryName = article.riskCategory || (
                    (article.title || '').toLowerCase().includes('port') ? 'LOGISTICS' :
                    (article.title || '').toLowerCase().includes('war') || (article.title || '').toLowerCase().includes('tariff') ? 'GEOPOLITICAL' :
                    'LOGISTICS'
                  );
                  const tagClass = `tag-${categoryName.toLowerCase()}`;

                  return (
                    <a 
                      key={article.id} 
                      href={sanitizeArticleUrl(article)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="article-card"
                      id={`article-card-${article.id}`}
                    >
                      <div className="card-header">
                        <span className="source-badge">
                          <span>📡</span> {article.source || 'Disruption Feed'}
                        </span>
                        <span className="time-stamp">{formatDate(article.publishedAt)}</span>
                      </div>
                      <h2 className="article-title">{article.title}</h2>
                      <div className="card-footer">
                        <span className={`risk-tag ${tagClass}`}>
                          {categoryName}
                        </span>
                        <span className="read-more">
                          Analyze Source Report
                          <svg className="arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'search' ? (
          /* SEMANTIC SEARCH TAB */
          <div className="search-tab-content" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
            <form onSubmit={(e) => handleSearch(e)} className="search-form">
              <div className="search-input-wrapper">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ask about shipping delays, warehouse shutdowns, port congestion, tariffs..."
                  className="search-input"
                  disabled={searching}
                />
                <button type="submit" className="btn-search" disabled={searching || !searchQuery.trim()}>
                  {searching ? (
                    <>
                      <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                      </svg>
                      Searching...
                    </>
                  ) : (
                    <>
                      <span>🔍</span> Analyze
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="search-suggestions">
              <span className="suggestion-label">Quick Prompts:</span>
              {quickSearchPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  className="suggestion-chip"
                  onClick={() => handleSearch(null, prompt)}
                  disabled={searching}
                >
                  ⚡ {prompt}
                </button>
              ))}
            </div>

            {searchError && (
              <div className="error-container" style={{ margin: '1.5rem 0' }}>
                <p className="error-msg">{searchError}</p>
              </div>
            )}

            {aiSummary && (
              <div className="ai-summary-card">
                <div className="ai-summary-header">
                  <div className="ai-summary-title">
                    <span className="ai-sparkle">✨</span> Groq AI Executive Risk Assessment
                  </div>
                  <div className="ai-confidence-badge">
                    Match Confidence:{' '}
                    <strong className={`tabular-nums ${
                      aiSummary.confidenceScore > 70 
                        ? 'text-severity-high' 
                        : aiSummary.confidenceScore >= 40 
                        ? 'text-severity-medium' 
                        : 'text-severity-low'
                    }`}>
                      {aiSummary.confidenceScore}%
                    </strong>
                  </div>
                </div>
                <div className="ai-summary-body">
                  <p>{aiSummary.summary}</p>
                  <div className="ai-progress-bg">
                    <div 
                      className={`ai-progress-bar ${
                        aiSummary.confidenceScore > 70 
                          ? 'bg-severity-high' 
                          : aiSummary.confidenceScore >= 40 
                          ? 'bg-severity-medium' 
                          : 'bg-severity-low'
                      }`} 
                      style={{ width: `${aiSummary.confidenceScore}%` }} 
                    />
                  </div>
                </div>
              </div>
            )}

            {searching ? (
              <div className="articles-grid" style={{ marginTop: '1.25rem' }}>
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="skeleton-card" />
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="search-results-section" style={{ marginTop: '1.25rem' }}>
                <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#ffffff' }}>
                  🎯 Top Vector Matches ({searchResults.length})
                </h3>
                <div className="articles-grid">
                  {searchResults.map((match, idx) => {
                    const matchPercent = Math.round((match.score || 0) * 100);
                    const badgeSeverityClass = 
                      matchPercent > 70 
                        ? 'badge-severity-high' 
                        : matchPercent >= 40 
                        ? 'badge-severity-medium' 
                        : 'badge-severity-low';

                    const riskCat = match.riskCategory || 'LOGISTICS';
                    const tagClass = `tag-${riskCat.toLowerCase()}`;

                    return (
                      <a 
                        key={idx} 
                        href={sanitizeArticleUrl(match)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="article-card search-match-card"
                      >
                        <div className="card-header">
                          <span className="source-badge">📡 {match.source || 'Source'}</span>
                          <span className={`${badgeSeverityClass} tabular-nums`}>
                            {matchPercent}% Match
                          </span>
                        </div>
                        <h2 className="article-title">{match.title}</h2>
                        <div className="card-footer">
                          <span className={`risk-tag ${tagClass}`}>
                            {riskCat}
                          </span>
                          <span className="read-more">
                            Read Full Article
                            <svg className="arrow-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : searchQuery && !searching && (
              <div className="empty-container" style={{ marginTop: '2rem' }}>
                <div className="empty-icon">🔍</div>
                <div className="empty-title">No Matching Intelligence Found</div>
                <p className="empty-desc">Try searching with alternative supply chain keywords or selecting a quick prompt above.</p>
              </div>
            )}
          </div>
        ) : (
          /* NASA SATELLITE & RISK FACTORS TAB */
          <AnalyticsDashboardGoogleEarth articles={articles} />
        )}
      </main>
    </div>
  );
}

// --------------------------------------------------------------------------
// NASA Satellite & Risk Factors Analytics Section
// --------------------------------------------------------------------------
function AnalyticsDashboardGoogleEarth({ articles = [] }) {
  const [selectedCountryId, setSelectedCountryId] = useState('US');
  const [searchCountryQuery, setSearchCountryQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mapMode, setMapMode] = useState('3d'); // '3d' | 'hd'

  const selectedCountry = COUNTRY_RISK_DB[selectedCountryId] || COUNTRY_RISK_DB['US'];

  const countrySearchResults = React.useMemo(() => {
    if (!searchCountryQuery.trim()) return [];
    const q = searchCountryQuery.toLowerCase();
    return Object.values(COUNTRY_RISK_DB).filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.region.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  }, [searchCountryQuery]);

  const handleSelectCountry = (countryId) => {
    setSelectedCountryId(countryId);
    setSearchCountryQuery('');
    setIsDropdownOpen(false);
  };

  const countryArticles = React.useMemo(() => {
    if (!selectedCountry) return articles;
    const kwList = selectedCountry.keywords;
    const matched = articles.filter(a => {
      const text = `${a.title || ''} ${a.source || ''} ${a.riskCategory || ''}`.toLowerCase();
      return kwList.some(kw => text.includes(kw));
    });
    return matched.length > 0 ? matched : articles;
  }, [articles, selectedCountry]);

  return (
    <div className="analytics-tab-content" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
      {/* Country Search Bar & Map Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div className="google-earth-search-box" style={{ flex: 1, minWidth: '280px', marginBottom: 0 }}>
          <div className="earth-search-input-wrapper">
            <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>🔍</span>
            <input
              type="text"
              className="earth-search-input"
              value={searchCountryQuery}
              onChange={(e) => {
                setSearchCountryQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Search country for risk factor analysis (e.g. India, United States, China, Germany, Brazil, Egypt)..."
            />
            {searchCountryQuery && (
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '0 0.5rem' }}
                onClick={() => setSearchCountryQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions */}
          {isDropdownOpen && countrySearchResults.length > 0 && (
            <div className="earth-search-dropdown">
              {countrySearchResults.map(c => (
                <div 
                  key={c.id} 
                  className="earth-dropdown-item"
                  onClick={() => handleSelectCountry(c.id)}
                >
                  <div>
                    <span style={{ marginRight: '0.5rem', fontSize: '1.1rem' }}>{c.flag}</span>
                    <strong style={{ color: '#ffffff' }}>{c.name}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.785rem', marginLeft: '0.5rem' }}>({c.region})</span>
                  </div>
                  <span className="tabular-nums" style={{ color: c.baseScore > 80 ? 'var(--error)' : c.baseScore > 65 ? 'var(--warning)' : 'var(--success)', fontWeight: '700' }}>
                    Risk Factor: {c.baseScore}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="map-view-switcher">
          <button 
            className={`map-view-btn ${mapMode === '3d' ? 'active' : ''}`}
            onClick={() => setMapMode('3d')}
          >
            🛰️ NASA 3D Earth Globe
          </button>
          <button 
            className={`map-view-btn ${mapMode === 'hd' ? 'active' : ''}`}
            onClick={() => setMapMode('hd')}
          >
            🗺️ HD Esri Satellite Tile Map
          </button>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Source Breakdown Donut Chart */}
        <SourceBreakdownDonut articles={articles} selectedCountry={selectedCountry} />

        {/* Render Map Component according to selected mode */}
        {mapMode === '3d' ? (
          <RealNASASatellite3DGlobeCard 
            articles={articles}
            selectedCountryId={selectedCountryId}
            onSelectCountry={(id) => handleSelectCountry(id)}
          />
        ) : (
          <HDSatelliteTileMap 
            selectedCountryId={selectedCountryId}
            onSelectCountry={(id) => handleSelectCountry(id)}
          />
        )}
      </div>

      {/* Country Quick Selector Strip */}
      <div style={{ marginTop: '1.25rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Select Country / Region to Analyze ({Object.keys(COUNTRY_RISK_DB).length} Active Global Profiles):
        </div>
        <div className="country-selector-strip">
          {Object.values(COUNTRY_RISK_DB).map((c) => {
            const isSelected = selectedCountryId === c.id;
            return (
              <button
                key={c.id}
                className={`country-chip ${isSelected ? 'active' : ''}`}
                onClick={() => handleSelectCountry(c.id)}
              >
                <span>{c.flag}</span>
                <span>{c.name}</span>
                <span className="tabular-nums" style={{ opacity: 0.85, fontSize: '0.75rem' }}>
                  ({c.baseScore}%)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detailed Country Risk Factor Analysis Panel */}
      {selectedCountry && (
        <CountryRiskAnalysisCard 
          country={selectedCountry} 
          matchedArticles={countryArticles}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Real NASA Satellite Photography 3D Earth Globe Component
// --------------------------------------------------------------------------
function RealNASASatellite3DGlobeCard({ selectedCountryId, onSelectCountry }) {
  const mountRef = useRef(null);
  const earthGroupRef = useRef(null);
  const targetRotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const country = COUNTRY_RISK_DB[selectedCountryId];
    if (country) {
      const targetY = -((country.lng * Math.PI) / 180);
      const targetX = (country.lat * Math.PI) / 180 * 0.4;
      targetRotationRef.current = { x: targetX, y: targetY };
    }
  }, [selectedCountryId]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !window.THREE) return;

    const THREE = window.THREE;
    const width = container.clientWidth || 540;
    const height = container.clientHeight || 440;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const earthGroup = new THREE.Group();
    earthGroupRef.current = earthGroup;
    scene.add(earthGroup);

    // 1. Load Authentic NASA Blue Marble Satellite Photography Textures
    const textureLoader = new THREE.TextureLoader();
    
    const nasaEarthTexture = textureLoader.load(
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_atmos_2048.jpg'
    );
    const nasaSpecularMap = textureLoader.load(
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_specular_2048.jpg'
    );
    const nasaCloudsTexture = textureLoader.load(
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_clouds_2048.png'
    );

    // Photorealistic Satellite Earth Sphere Mesh
    const earthGeometry = new THREE.SphereGeometry(2, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: nasaEarthTexture,
      specularMap: nasaSpecularMap,
      shininess: 35,
      specular: new THREE.Color(0x38bdf8)
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earthMesh);

    // Swirling Cloud Atmosphere Layer Mesh
    const cloudsGeometry = new THREE.SphereGeometry(2.03, 64, 64);
    const cloudsMaterial = new THREE.MeshPhongMaterial({
      map: nasaCloudsTexture,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    earthGroup.add(cloudsMesh);

    // Outer Atmospheric Blue Rim Glow Shader Mesh
    const atmosphereGeometry = new THREE.SphereGeometry(2.09, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphereMesh);

    // Directional Sunlight & Deep Space Lighting
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x334466, 0.7);
    scene.add(ambientLight);

    // 3D Country Location Pin Markers (Recalibrated Spherical Math Alignment)
    const pinMeshes = [];
    const markerGroup = new THREE.Group();
    earthGroup.add(markerGroup);

    Object.values(COUNTRY_RISK_DB).forEach((country) => {
      const radius = 2.04;
      const phi = (90 - country.lat) * (Math.PI / 180);
      const theta = (country.lng + 180) * (Math.PI / 180);

      const x = - (radius * Math.sin(phi) * Math.cos(theta));
      const y = (radius * Math.cos(phi));
      const z = (radius * Math.sin(phi) * Math.sin(theta));

      const colorHex = country.baseScore > 80 ? 0xef4444 : country.baseScore > 65 ? 0xf59e0b : 0x10b981;

      const ringGeom = new THREE.RingGeometry(0.06, 0.09, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.position.set(x, y, z);
      ringMesh.lookAt(0, 0, 0);

      const dotGeom = new THREE.SphereGeometry(0.04, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const dotMesh = new THREE.Mesh(dotGeom, dotMat);
      dotMesh.position.set(x, y, z);

      dotMesh.userData = { countryId: country.id };
      ringMesh.userData = { countryId: country.id };

      markerGroup.add(ringMesh);
      markerGroup.add(dotMesh);
      pinMeshes.push(dotMesh, ringMesh);
    });

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      earthGroup.rotation.y += deltaX * 0.005;
      earthGroup.rotation.x += deltaY * 0.005;
      targetRotationRef.current = { x: earthGroup.rotation.x, y: earthGroup.rotation.y };

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(pinMeshes);

      if (intersects.length > 0) {
        const hitObj = intersects[0].object;
        if (hitObj.userData && hitObj.userData.countryId) {
          onSelectCountry(hitObj.userData.countryId);
        }
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('click', onClick);

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isDragging && targetRotationRef.current) {
        earthGroup.rotation.y += (targetRotationRef.current.y - earthGroup.rotation.y) * 0.05;
        earthGroup.rotation.x += (targetRotationRef.current.x - earthGroup.rotation.x) * 0.05;
      }

      cloudsMesh.rotation.y += 0.0008;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('click', onClick);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [onSelectCountry]);

  return (
    <div className="analytics-card globe-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 className="section-title" style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff' }}>
            🛰️ NASA Satellite 3D Photographic Earth
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real NASA Blue Marble satellite photography & specular ocean lighting
          </p>
        </div>
        <span className="source-badge" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.1)' }}>
          ● Real NASA Photography
        </span>
      </div>

      <div ref={mountRef} className="globe-canvas-wrapper" />
    </div>
  );
}

// --------------------------------------------------------------------------
// HD Satellite Tile Map Component (Leaflet + Esri World Imagery Satellite Tiles)
// --------------------------------------------------------------------------
function HDSatelliteTileMap({ selectedCountryId, onSelectCountry }) {
  const mapRef = useRef(null);
  const leafletInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!window.L || !mapRef.current) return;

    if (!leafletInstanceRef.current) {
      const map = window.L.map(mapRef.current, {
        center: [20, 0],
        zoom: 2,
        zoomControl: true
      });

      window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18
      }).addTo(map);

      leafletInstanceRef.current = map;
    }

    const map = leafletInstanceRef.current;

    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    Object.values(COUNTRY_RISK_DB).forEach(country => {
      const isSelected = selectedCountryId === country.id;
      const color = country.baseScore > 80 ? '#ef4444' : country.baseScore > 65 ? '#f59e0b' : '#10b981';

      const customIcon = window.L.divIcon({
        className: 'custom-satellite-pin',
        html: `
          <div style="
            background: ${color};
            border: 2px solid ${isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)'};
            width: ${isSelected ? '24px' : '18px'};
            height: ${isSelected ? '24px' : '18px'};
            border-radius: 50%;
            box-shadow: 0 0 12px ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #fff;
            cursor: pointer;
          ">
            ${country.flag}
          </div>
        `,
        iconSize: [24, 24]
      });

      const marker = window.L.marker([country.lat, country.lng], { icon: customIcon }).addTo(map);
      marker.bindTooltip(`<b>${country.flag} ${country.name}</b><br/>Risk Score: ${country.baseScore}%`, { direction: 'top' });
      marker.on('click', () => onSelectCountry(country.id));
      markersRef.current.push(marker);
    });

    const targetCountry = COUNTRY_RISK_DB[selectedCountryId];
    if (targetCountry) {
      map.flyTo([targetCountry.lat, targetCountry.lng], 4, { duration: 1.5 });
    }

  }, [selectedCountryId, onSelectCountry]);

  return (
    <div className="analytics-card globe-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 className="section-title" style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff' }}>
            🗺️ HD Esri Satellite Tile Map (Google Earth Quality)
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            High-resolution satellite photography tiles, pan & zoom controls
          </p>
        </div>
        <span className="source-badge" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.1)' }}>
          ● Live HD Satellite Tiles
        </span>
      </div>

      <div className="hd-map-wrapper">
        <div id="hd-satellite-map" ref={mapRef} />
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Source Breakdown Donut Chart Component
// --------------------------------------------------------------------------
function SourceBreakdownDonut({ articles = [], selectedCountry = null }) {
  const [dbSources, setDbSources] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8080/api/articles/sources')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.length > 0) {
          setDbSources(data);
        }
      })
      .catch((e) => console.warn('Backend sources endpoint check:', e));
  }, []);

  const targetArticles = React.useMemo(() => {
    if (!selectedCountry || !articles || articles.length === 0) return articles;
    const kwList = selectedCountry.keywords;
    const matched = articles.filter(a => {
      const text = `${a.title || ''} ${a.source || ''} ${a.riskCategory || ''}`.toLowerCase();
      return kwList.some(kw => text.includes(kw));
    });
    return matched.length > 0 ? matched : articles;
  }, [articles, selectedCountry]);

  const sourceData = React.useMemo(() => {
    const colors = ['#38bdf8', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#ec4899', '#f43f5e'];

    if (targetArticles && targetArticles.length > 0) {
      const counts = {};
      targetArticles.forEach((a) => {
        const src = a.source || 'Other Feeds';
        counts[src] = (counts[src] || 0) + 1;
      });
      const total = targetArticles.length;
      const res = Object.entries(counts).map(([label, count], idx) => ({
        label,
        count,
        percent: total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0,
        color: colors[idx % colors.length]
      }));
      if (res.length > 0) return res;
    }

    if (dbSources && dbSources.length > 0) {
      const total = dbSources.reduce((acc, item) => acc + (item.count || 0), 0);
      return dbSources.map((item, idx) => ({
        label: item.source || 'Unknown Source',
        count: item.count || 0,
        percent: total > 0 ? parseFloat(((item.count / total) * 100).toFixed(1)) : 0,
        color: colors[idx % colors.length]
      }));
    }

    return [
      { label: 'Supply Chain Dive', count: 25, percent: 55.6, color: '#38bdf8' },
      { label: 'Bloomberg Logistics', count: 12, percent: 26.7, color: '#f59e0b' },
      { label: 'Reuters Maritime', count: 5, percent: 11.1, color: '#10b981' },
      { label: 'FreightWaves', count: 3, percent: 6.6, color: '#8b5cf6' }
    ];
  }, [dbSources, targetArticles]);

  const totalCount = sourceData.reduce((sum, item) => sum + item.count, 0);
  let cumulativeAngle = 0;

  return (
    <div className="analytics-card pie-chart-card">
      <div className="card-header-block">
        <h3 className="section-title" style={{ fontSize: '1.05rem', margin: 0, color: '#ffffff' }}>
          📊 Intelligence Source Breakdown
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
          {selectedCountry ? (
            <span style={{ color: '#38bdf8', fontWeight: '600' }}>{selectedCountry.flag} {selectedCountry.name} ({targetArticles.length} Feeds)</span>
          ) : (
            <span>Live Aggregated Distribution (<code style={{ fontSize: '0.725rem' }}>SELECT source, COUNT(*)</code>)</span>
          )}
        </p>
      </div>

      <div className="pie-chart-wrapper">
        <svg viewBox="0 0 200 200" className="pie-chart-svg">
          {sourceData.map((item, idx) => {
            const circumference = 2 * Math.PI * 70;
            const strokeLength = (item.percent / 100) * circumference;
            const strokeDasharray = `${strokeLength} ${circumference - strokeLength}`;
            const strokeDashoffset = -cumulativeAngle;
            cumulativeAngle += strokeLength;

            return (
              <circle
                key={idx}
                cx="100"
                cy="100"
                r="70"
                fill="transparent"
                stroke={item.color}
                strokeWidth="28"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 100 100)"
              />
            );
          })}
          <text x="100" y="94" fill="#ffffff" fontSize="22" fontWeight="800" textAnchor="middle">
            {totalCount}
          </text>
          <text x="100" y="115" fill="var(--text-muted)" fontSize="11" fontWeight="600" textAnchor="middle">
            Total Articles
          </text>
        </svg>

        <div className="pie-legend">
          {sourceData.map((item, idx) => (
            <div key={idx} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: item.color, color: item.color }}></span>
              <span className="legend-label" style={{ fontWeight: '600', color: '#ffffff' }}>
                {item.label}
              </span>
              <span className="tabular-nums" style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {item.percent}% ({item.count})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Detailed Country Risk Factor Analysis Card Component
// --------------------------------------------------------------------------
function CountryRiskAnalysisCard({ country, matchedArticles = [] }) {
  if (!country) return null;

  const scoreColor = country.baseScore > 80 ? 'var(--error)' : country.baseScore > 65 ? 'var(--warning)' : 'var(--success)';
  const badgeSeverityClass = country.baseScore > 80 ? 'badge-severity-high' : country.baseScore > 65 ? 'badge-severity-medium' : 'badge-severity-low';

  return (
    <div className="country-risk-panel">
      {/* Panel Header */}
      <div className="country-panel-header">
        <div className="country-flag-title">
          <span className="country-flag-icon">{country.flag}</span>
          <div>
            <h2 className="country-name">{country.name}</h2>
            <div className="country-region-badge">Region: {country.region}</div>
          </div>
        </div>

        <div className="risk-gauge-circle">
          <div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700' }}>
              Supply Chain Risk Factor Score
            </div>
            <div className={`risk-gauge-score tabular-nums`} style={{ color: scoreColor }}>
              {country.baseScore} / 100
            </div>
          </div>
          <span className={badgeSeverityClass}>
            {country.status}
          </span>
        </div>
      </div>

      {/* Categorized Risk Progress Meters */}
      <h3 style={{ fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.85rem' }}>
        📈 Categorized Risk Factor Breakdown
      </h3>
      <div className="country-risk-categories-grid">
        {[
          { label: '⚠️ Geopolitical & Trade Stability', score: country.categoryScores.geopolitical, color: '#f59e0b' },
          { label: '🚢 Logistics & Maritime Congestion', score: country.categoryScores.logistics, color: '#38bdf8' },
          { label: '🌪️ Climate & Extreme Weather Impact', score: country.categoryScores.weather, color: '#22d3ee' },
          { label: '📈 Market, Tariff & Labor Volatility', score: country.categoryScores.market, color: '#10b981' }
        ].map((cat, idx) => (
          <div key={idx} className="category-risk-item">
            <div className="category-risk-header">
              <span>{cat.label}</span>
              <span className="tabular-nums" style={{ color: cat.color, fontWeight: '700' }}>{cat.score}%</span>
            </div>
            <div className="category-bar-bg">
              <div 
                className="category-bar-fill" 
                style={{ width: `${cat.score}%`, backgroundColor: cat.color }} 
              />
            </div>
          </div>
        ))}
      </div>

      {/* Key Regional Bottlenecks & Risk Drivers */}
      <div style={{ marginBottom: '1.5rem', background: 'rgba(255, 255, 255, 0.03)', padding: '1.1rem', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <h4 style={{ fontSize: '0.925rem', color: '#38bdf8', marginBottom: '0.5rem' }}>
          📍 Key Regional Choke Points & Risk Drivers:
        </h4>
        <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-primary)', fontSize: '0.875rem', lineHeight: '1.65' }}>
          {country.highlights.map((item, idx) => (
            <li key={idx} style={{ marginBottom: '0.35rem' }}>{item}</li>
          ))}
        </ul>
      </div>

      {/* Matched Disruption News Feeds for Country */}
      <div>
        <h4 style={{ fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.85rem' }}>
          📰 Matched Real-Time Intelligence Feeds ({matchedArticles.length})
        </h4>
        {matchedArticles.length === 0 ? (
          <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No specific articles currently matched for {country.name}.
          </div>
        ) : (
          <div className="articles-grid">
            {matchedArticles.slice(0, 6).map((article) => (
              <a 
                key={article.id} 
                href={sanitizeArticleUrl(article)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="article-card"
              >
                <div className="card-header">
                  <span className="source-badge">📡 {article.source || 'News Feed'}</span>
                  <span className="time-stamp">{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : ''}</span>
                </div>
                <h2 className="article-title">{article.title}</h2>
                <div className="card-footer">
                  <span className="read-more">
                    Analyze Source Report
                    <svg className="arrow-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
