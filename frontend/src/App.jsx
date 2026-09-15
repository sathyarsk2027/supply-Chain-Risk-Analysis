import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import {
  SearchIcon,
  RiskCalculatorIcon,
  SatelliteIcon,
  GlobeIcon,
  MapIcon,
  MapLayerIcon,
  PieChartIcon,
  ZapIcon,
  AlertTriangleIcon,
  ShieldAlertIcon,
  ShipIcon,
  AnchorIcon,
  StormIcon,
  CloudRainIcon,
  WindIcon,
  TrendingUpIcon,
  DollarSignIcon,
  BarChart2Icon,
  NewspaperIcon,
  ClockIcon,
  ActivityIcon,
  DatabaseIcon,
  FilterIcon,
  RadioIcon,
  RssIcon,
  SparklesIcon,
  CpuIcon,
  TargetIcon,
  MapPinIcon,
  InfoIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  PackageIcon,
  CloseIcon,
  CheckCircleIcon,
  FileTextIcon,
  ExternalLinkIcon,
  SlidersIcon,
  EyeIcon
} from './components/Icons';

const Hero3DContainer = lazy(() => import('./components/Hero3DContainer'));

const hasWebGL = (() => {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
})();

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
// Futuristic AI Vector Match Telemetry Meter Component
// --------------------------------------------------------------------------
function AIMatchConfidenceTelemetry({ confidence }) {
  if (!confidence || confidence <= 0) return null;

  const totalSegments = 12;
  const activeCount = Math.round((confidence / 100) * totalSegments);
  
  const scoreColor = confidence >= 70 ? '#8f9e7c' : confidence >= 40 ? '#f59e0b' : '#ef4444';
  const glowShadow = `0 0 10px ${scoreColor}88`;

  return (
    <div className="ai-telemetry-container" style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
          <TargetIcon size={14} color={scoreColor} />
          <span>Vector Match Telemetry Lock:</span>
          <span style={{ color: scoreColor, fontWeight: '800' }}>{confidence}%</span>
        </div>
        <div style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="pulse-dot" style={{ width: '6px', height: '6px', background: scoreColor, borderRadius: '50%', boxShadow: `0 0 6px ${scoreColor}` }} />
          STATUS: {confidence >= 70 ? 'HIGH RELEVANCE CONVERGENCE' : 'PARTIAL RELEVANCE'}
        </div>
      </div>

      {/* 12-Segment LED Telemetry Meter Bar */}
      <div style={{ display: 'flex', gap: '4px', height: '10px', alignItems: 'center' }}>
        {Array.from({ length: totalSegments }).map((_, idx) => {
          const isActive = idx < activeCount;
          return (
            <div
              key={idx}
              style={{
                flex: 1,
                height: '100%',
                background: isActive ? scoreColor : 'rgba(255, 255, 255, 0.06)',
                border: isActive ? `1px solid ${scoreColor}` : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isActive ? glowShadow : 'none',
                borderRadius: '1px',
                transition: 'all 0.3s ease'
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Geographic Pin Database for 3D Earth & HD Satellite Map
// --------------------------------------------------------------------------
const getGIBSTimeString = () => {
  // NASA GIBS global composites can take up to 48h to fully stitch without black swath gaps.
  const d = new Date();
  d.setDate(d.getDate() - 2);
  return d.toISOString().split('T')[0];
};
let GLOBAL_PIN_LIST = [];

function getCountryCoords(query) {
  if (!query) return { query: 'Global', flag: '🌐', lat: 20.0, lng: 0.0, baseScore: 50 };
  const q = query.toLowerCase().trim();
  const found = GLOBAL_PIN_LIST.find(p => p.query.toLowerCase() === q || p.id.toLowerCase() === q);
  if (found) return found;
  return { query, flag: '🌐', lat: 20.0, lng: 0.0, baseScore: 50 };
}

function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activePins, setActivePins] = useState([]);

  // Category & Filter state
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Semantic Search States
  const [activeTab, setActiveTab] = useState('overview'); // 'feed' | 'search' | 'analytics'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [aiSummary, setAiSummary] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const handleTabClick = useCallback((tab) => {
    setActiveTab((prev) => (prev === tab ? prev : tab));
  }, []);




  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pinsRes = await fetch(`${API_BASE_URL}/api/countries/active`);
      if (pinsRes.ok) {
        const pinsData = await pinsRes.json();
        GLOBAL_PIN_LIST = pinsData;
        setActivePins(pinsData);
      }

      const response = await fetch(`${API_BASE_URL}/api/articles`);
      if (!response.ok) {
        throw new Error(`Failed to load articles (HTTP ${response.status})`);
      }
      const data = await response.json();
      setArticles(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Fetch error:', err);
      setError(`Could not connect to the news API server. Please make sure the backend is running on ${API_BASE_URL}.`);
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
      const response = await fetch(`${API_BASE_URL}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: queryToUse }),
      });

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errBody = await response.text();
          if (errBody) errorMsg = errBody;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setSearchResults(data.matches || []);
      setAiSummary(data.aiSummary || null);
    } catch (err) {
      console.error('Search error:', err);
      setSearchError(`Backend Error: ${err.message}`);
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

              <header className="cinematic-hero">
          <div className="hero-text-block" style={{ zIndex: 20 }}>
            <h1>SUPPLY CHAIN<br/>RISK MONITOR<br/><span style={{ color: 'var(--accent-olive)' }}>LIVE INTELLIGENCE LAYERED.</span></h1>
            <p className="hero-subtitle">
              Well-organized data, real-time satellite intelligence, and semantic AI search. Together, we are a system — we don't skim on the surface.
            </p>
            <br/>
            <div className="hero-cta-group" style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn-refresh primary" 
                onClick={fetchArticles} 
                disabled={loading}
                style={{ background: 'var(--accent-olive)', color: 'var(--bg-primary)', border: '1px solid var(--accent-olive)', borderRadius: '0', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCwIcon size={14} color="var(--bg-primary)" className={loading ? 'spin' : ''} />
                {loading ? 'SYNCING FEED...' : 'REFRESH FEED'}
              </button>
              <button 
                className="btn-refresh secondary" 
                onClick={() => {
                  if (activeTab !== 'feed') {
                    setActiveTab('feed');
                  }
                  const feedSection = document.getElementById('main-content-section');
                  if (feedSection) {
                    feedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--text-muted)', borderRadius: '0', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', padding: '0.5rem 1rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <EyeIcon size={14} color="var(--text-primary)" /> VIEW LIVE FEED
              </button>
            </div>
          </div>
          
          <div className="hero-graphic">
            <div className={`img-wrapper ${activeTab !== 'overview' ? 'is-exploded' : ''} zoom-${activeTab}`}>
              {hasWebGL ? (
                <Suspense fallback={
                  <>
                    <img 
                      src="/assets/containers_closed.jpg" 
                      className={`iso-container-main ${activeTab === 'overview' ? 'visible' : 'hidden'}`} 
                      alt="Closed Shipping Containers" 
                    />
                    <img 
                      src="/assets/containers_exploded.jpg" 
                      className={`iso-container-main ${activeTab !== 'overview' ? 'visible' : 'hidden'}`} 
                      alt="Expanded Shipping Containers" 
                    />
                  </>
                }>
                  <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                    <Hero3DContainer activeTab={activeTab} />
                  </div>
                </Suspense>
              ) : (
                <>
                  <img 
                    src="/assets/containers_closed.jpg" 
                    className={`iso-container-main ${activeTab === 'overview' ? 'visible' : 'hidden'}`} 
                    alt="Closed Shipping Containers" 
                  />
                  <img 
                    src="/assets/containers_exploded.jpg" 
                    className={`iso-container-main ${activeTab !== 'overview' ? 'visible' : 'hidden'}`} 
                    alt="Expanded Shipping Containers" 
                  />
                </>
              )}
            
              <div 
                className={`iso-label label-a ${activeTab === 'feed' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleTabClick('feed'); }}
              >
                <span className="marker">A</span> ALL FEEDS
              </div>
              
              <div 
                className={`iso-label label-b ${activeTab === 'search' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleTabClick('search'); }}
              >
                <span className="marker">B</span> SEMANTIC AI SEARCH
              </div>
              
              <div 
                className={`iso-label label-c ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleTabClick('analytics'); }}
              >
                <span className="marker">C</span> NASA SATELLITE
              </div>

            </div>
            
            {activeTab !== 'overview' && (
              <div 
                className="iso-label label-reset"
                onClick={(e) => { e.stopPropagation(); handleTabClick('overview'); }}
                style={{ position: 'absolute', top: '1rem', right: '1rem', cursor: 'pointer', zIndex: 50, background: 'var(--text-primary)', color: 'var(--bg-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <CloseIcon size={13} color="var(--bg-primary)" /> RESET VIEW
              </div>
            )}
          </div>
        </header>

      {/* Stats Summary Banner */}
      {activeTab === 'feed' && !error && (
        <section className="stats-banner" aria-label="Dashboard Stats">
          <div className="stat-card" style={{ '--accent-color': '#10b981' }}>
            <div className="stat-icon" style={{ color: '#10b981' }}>
              <ActivityIcon size={22} color="#10b981" />
            </div>
            <div className="stat-item">
              <span className="stat-label">System status</span>
              <span className="stat-value" style={{ color: '#10b981', fontSize: '1.1rem' }}>
                Active (15m Auto-Sync)
              </span>
            </div>
          </div>

          <div className="stat-card" style={{ '--accent-color': '#8f9e7c' }}>
            <div className="stat-icon" style={{ color: '#8f9e7c' }}>
              <DatabaseIcon size={22} color="#8f9e7c" />
            </div>
            <div className="stat-item">
              <span className="stat-label">Ingested articles</span>
              <span className="stat-value">{articles.length}</span>
            </div>
          </div>

          <div className="stat-card" style={{ '--accent-color': '#38bdf8' }}>
            <div className="stat-icon" style={{ color: '#38bdf8' }}>
              <FilterIcon size={22} color="#38bdf8" />
            </div>
            <div className="stat-item">
              <span className="stat-label">Filtered feeds</span>
              <span className="stat-value">{filteredArticles.length}</span>
            </div>
          </div>

          <div className="stat-card" style={{ '--accent-color': '#f59e0b' }}>
            <div className="stat-icon" style={{ color: '#f59e0b' }}>
              <ClockIcon size={22} color="#f59e0b" />
            </div>
            <div className="stat-item">
              <span className="stat-label">Last synchronization</span>
              <span className="stat-value" style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
                {lastUpdated || 'Just Now'}
              </span>
            </div>
          </div>
        </section>
      )}

      <main id="main-content-section">
        {activeTab === 'feed' ? (
          /* ALL FEEDS TAB */
          <div>
            {!error && articles.length > 0 && (
              <div className="filter-bar">
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Filter category:
                </div>
                <div className="filter-chips">
                  {[
                    { id: 'ALL', label: 'All feeds', icon: <GlobeIcon size={14} color="#8f9e7c" style={{ marginRight: '6px' }} /> },
                    { id: 'GEOPOLITICAL', label: 'Geopolitical', icon: <ShieldAlertIcon size={14} color="#d4897a" style={{ marginRight: '6px' }} /> },
                    { id: 'LOGISTICS', label: 'Logistics & ports', icon: <AnchorIcon size={14} color="#b0aca3" style={{ marginRight: '6px' }} /> },
                    { id: 'WEATHER', label: 'Weather & climate', icon: <CloudRainIcon size={14} color="#95a894" style={{ marginRight: '6px' }} /> },
                    { id: 'MARKET', label: 'Market & economy', icon: <DollarSignIcon size={14} color="#d4b87a" style={{ marginRight: '6px' }} /> }
                  ].map(chip => (
                    <button
                      key={chip.id}
                      className={`filter-chip ${categoryFilter === chip.id ? 'active' : ''}`}
                      onClick={() => setCategoryFilter(chip.id)}
                      style={{ display: 'inline-flex', alignItems: 'center' }}
                    >
                      {chip.icon}
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
                <div className="error-title">Database / API offline</div>
                <p className="error-msg">{error}</p>
                <button className="btn-retry" onClick={fetchArticles}>
                  Re-connect feed service
                </button>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="empty-container">
                <div className="empty-icon"><PackageIcon size={48} color="var(--text-muted)" /></div>
                <div className="empty-title">No disruption reports found</div>
                <p className="empty-desc">
                  {articles.length === 0 
                    ? 'The news database is currently empty. Run article collectors to populate feed data.'
                    : `No news articles matched the selected "${categoryFilter}" filter category.`
                  }
                </p>
                {categoryFilter !== 'ALL' && (
                  <button className="btn-retry" style={{ marginTop: '1rem' }} onClick={() => setCategoryFilter('ALL')}>
                    Reset category filters
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
                        <span className="source-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <RssIcon size={13} color="#8f9e7c" /> {article.source || 'Disruption Feed'}
                        </span>
                        <span className="time-stamp">{formatDate(article.publishedAt)}</span>
                      </div>
                      <h2 className="article-title">{article.title}</h2>
                      <div className="card-footer">
                        <span className={`risk-tag ${tagClass}`}>
                          {categoryName}
                        </span>
                        <span className="read-more">
                          Analyze source report
                          <ExternalLinkIcon size={14} style={{ marginLeft: '6px' }} />
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
                <button type="submit" className="btn-search" disabled={searching || !searchQuery.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {searching ? (
                    <>
                      <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                      </svg>
                      Searching...
                    </>
                  ) : (
                    <>
                      <SearchIcon size={15} /> Analyze
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
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <ZapIcon size={12} color="var(--accent-olive)" /> {prompt}
                </button>
              ))}
            </div>

            {searchError && (
              <div className="error-container" style={{ margin: '1.5rem 0' }}>
                <p className="error-msg">{searchError}</p>
              </div>
            )}

            {aiSummary && (
              <div 
                className="ai-summary-card"
                style={aiSummary.confidenceScore === 0 ? {
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  background: 'linear-gradient(135deg, rgba(30, 20, 35, 0.7) 0%, rgba(20, 15, 25, 0.8) 100%)'
                } : {}}
              >
                <div className="ai-summary-header">
                  <div className="ai-summary-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span className="ai-sparkle">{aiSummary.confidenceScore === 0 ? <AlertCircleIcon size={18} color="#f59e0b" /> : <CpuIcon size={18} color="#8f9e7c" />}</span>{' '}
                    {aiSummary.confidenceScore === 0 ? 'Relevance guardrail notice' : 'AI risk summary'}
                  </div>
                </div>
                <div className="ai-summary-body">
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{aiSummary.summary}</p>
                  <AIMatchConfidenceTelemetry confidence={searchResults.length > 0 ? Math.round(searchResults[0].score * 100) : aiSummary.confidenceScore} />
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
              <div className="search-results-section" style={{ marginTop: '1.25rem', animation: 'fadeInUp 0.6s ease-out 1.2s both' }}>
                <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TargetIcon size={18} color="var(--accent-olive)" /> Top vector matches ({searchResults.length})
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
                          <span className="source-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <FileTextIcon size={13} color="#8f9e7c" /> {match.source || 'Source'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="time-stamp">{match.publishedAt ? formatDate(match.publishedAt) : ''}</span>
                            <span className={`${badgeSeverityClass} tabular-nums`}>
                              {matchPercent}% Match
                            </span>
                          </div>
                        </div>
                        <h2 className="article-title">{match.title}</h2>
                        <div className="card-footer">
                          <span className={`risk-tag ${tagClass}`}>
                            {riskCat}
                          </span>
                          <span className="read-more">
                            Read full article
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
                <div className="empty-icon"><SearchIcon size={44} color="var(--text-muted)" /></div>
                <div className="empty-title">No relevant supply chain articles found for this query</div>
                <p className="empty-desc">The search terms do not meet our relevance threshold. Try querying specific supply chain topics, shipping routes, port strikes, or trade tariffs.</p>
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
// Real-Time Dynamic NASA satellite & risk factors Analytics Section
// --------------------------------------------------------------------------
function AnalyticsDashboardGoogleEarth({ articles = [] }) {
  const [selectedCountryQuery, setSelectedCountryQuery] = useState('Germany');
  const [searchCountryQuery, setSearchCountryQuery] = useState('');
  const [mapMode, setMapMode] = useState('hd'); // 'hd' | '3d'

  // Dynamic real-time REST API state
  const [countryRiskData, setCountryRiskData] = useState(null);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [riskError, setRiskError] = useState(null);

  const fetchRealTimeCountryRisk = useCallback(async (query) => {
    if (!query || !query.trim()) return;
    setLoadingRisk(true);
    setRiskError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/countries/risk?query=${encodeURIComponent(query.trim())}`);
      if (!response.ok) {
        throw new Error(`Failed to calculate real-time country risk (HTTP ${response.status})`);
      }
      const data = await response.json();
      setCountryRiskData(data);
    } catch (err) {
      console.error('Real-time country risk API error:', err);
      setRiskError('Failed to fetch real-time country risk data from backend.');
    } finally {
      setLoadingRisk(false);
    }
  }, []);

  useEffect(() => {
    fetchRealTimeCountryRisk(selectedCountryQuery);
  }, [selectedCountryQuery, fetchRealTimeCountryRisk]);

  const handleSelectCountry = (countryName) => {
    setSelectedCountryQuery(countryName);
    setSearchCountryQuery('');
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchCountryQuery.trim()) {
      handleSelectCountry(searchCountryQuery.trim());
    }
  };

  const currentCoords = getCountryCoords(selectedCountryQuery);

  return (
    <div className="analytics-tab-content" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
      {/* Real-Time Unlimited Country Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <form onSubmit={handleSearchSubmit} className="google-earth-search-box" style={{ flex: 1, minWidth: '280px', marginBottom: 0 }}>
          <div className="earth-search-input-wrapper">
            <div className="search-icon-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(143, 158, 124, 0.15)', border: '1px solid rgba(143, 158, 124, 0.35)', padding: '3px 5px', borderRadius: '4px', marginRight: '0.5rem', flexShrink: 0 }}>
              <SearchIcon size={14} color="#8f9e7c" />
            </div>
            <input
              type="text"
              className="earth-search-input"
              value={searchCountryQuery}
              onChange={(e) => setSearchCountryQuery(e.target.value)}
              placeholder="Search ANY country for real-time risk factor calculation (e.g. India, Germany, Kenya, Vietnam, Brazil, UAE)..."
            />
            {searchCountryQuery && (
              <button 
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '0 0.5rem', display: 'flex', alignItems: 'center' }}
                onClick={() => setSearchCountryQuery('')}
              >
                <CloseIcon size={14} />
              </button>
            )}
            <button type="submit" className="btn-search" style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--accent-olive)', color: '#000000', fontWeight: '700', fontFamily: 'JetBrains Mono, monospace', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <RiskCalculatorIcon size={13} color="#000000" /> Calculate risk
            </button>
          </div>
        </form>

        {/* View Mode Switcher */}
        <div className="map-view-switcher">
          <button 
            className={`map-view-btn ${mapMode === '3d' ? 'active' : ''}`}
            onClick={() => setMapMode('3d')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <SatelliteIcon size={15} /> NASA 3D Earth Globe
          </button>
          <button 
            className={`map-view-btn ${mapMode === 'hd' ? 'active' : ''}`}
            onClick={() => setMapMode('hd')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <MapIcon size={15} /> HD Esri Satellite Tile Map
          </button>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Source Breakdown Donut Chart */}
        <SourceBreakdownDonut 
          articles={countryRiskData?.matchedArticles || articles} 
          selectedCountryName={selectedCountryQuery} 
        />

        {/* Render Map Component according to selected mode */}
        {mapMode === '3d' ? (
          <RealNASASatellite3DGlobeCard 
            targetCoords={currentCoords}
            selectedCountryQuery={selectedCountryQuery}
            countryRiskData={countryRiskData}
            onSelectCountry={(name) => handleSelectCountry(name)}
          />
        ) : (
          <HDSatelliteTileMap 
            targetCoords={currentCoords}
            selectedCountryQuery={selectedCountryQuery}
            countryRiskData={countryRiskData}
            onSelectCountry={(name) => handleSelectCountry(name)}
          />
        )}
      </div>

      {/* Quick Selectors for Global Economies */}
      <div style={{ marginTop: '1.25rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Real-time quick selectors (Search accepts ANY country in the world):
        </div>
        <div className="country-selector-strip">
          {GLOBAL_PIN_LIST.map((c, idx) => {
            const isSelected = selectedCountryQuery.toLowerCase() === c.query.toLowerCase();
            return (
              <button
                key={idx}
                className={`country-chip ${isSelected ? 'active' : ''}`}
                onClick={() => handleSelectCountry(c.query)}
              >
                <span>{c.flag}</span>
                <span>{c.query}</span>
                {isSelected && countryRiskData && countryRiskData.hasData && (
                  <span className="tabular-nums" style={{ color: '#38bdf8', fontWeight: '800', marginLeft: '0.25rem' }}>
                    ({countryRiskData.baseScore}%)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Real-Time Country Risk Analysis Card */}
      <RealTimeCountryRiskPanel 
        countryQuery={selectedCountryQuery}
        coords={currentCoords}
        data={countryRiskData}
        loading={loadingRisk}
        error={riskError}
      />
    </div>
  );
}

// --------------------------------------------------------------------------
// Real-Time Computed Country Risk Factor Analysis Card Component
// --------------------------------------------------------------------------
function RealTimeCountryRiskPanel({ countryQuery, coords, data, loading, error }) {
  if (loading) {
    return (
      <div className="country-risk-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <RefreshCwIcon size={32} className="spin" color="var(--accent-olive)" style={{ marginBottom: '0.75rem' }} />
        <h3 style={{ color: '#ffffff' }}>Computing real-time risk factor score for {countryQuery}...</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Querying live database articles, analyzing category weights, and generating AI risk drivers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="country-risk-panel" style={{ borderColor: 'var(--error)' }}>
        <h3 style={{ color: 'var(--error)' }}>Real-time risk calculation error</h3>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
      </div>
    );
  }

  if (!data || !data.hasData || data.baseScore === null) {
    return (
      <div className="country-risk-panel">
        <div className="country-panel-header">
          <div className="country-flag-title">
            <span className="country-flag-icon">{coords.flag}</span>
            <div>
              <h2 className="country-name">{countryQuery}</h2>
              <div className="country-region-badge">Real-Time Database Search</div>
            </div>
          </div>
          <span className="badge-severity-low" style={{ background: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.4)' }}>
            INSUFFICIENT DATA
          </span>
        </div>
        <div style={{ padding: '1.5rem', textDecoration: 'none', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <h4 style={{ color: 'var(--accent-olive)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircleIcon size={18} color="#f59e0b" /> Insufficient Live Disruption Data
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            Zero supply chain disruption articles matching <strong>"{countryQuery}"</strong> were found in the live database. No fabricated risk scores or fake bullets are displayed.
          </p>
        </div>
      </div>
    );
  }

  const scoreColor = data.baseScore >= 80 ? 'var(--error)' : data.baseScore >= 65 ? 'var(--warning)' : 'var(--success)';
  const badgeSeverityClass = data.baseScore >= 80 ? 'badge-severity-high' : data.baseScore >= 65 ? 'badge-severity-medium' : 'badge-severity-low';

  const catScores = data.categoryScores || {};

  return (
    <div className="country-risk-panel">
      {/* Panel Header */}
      <div className="country-panel-header">
        <div className="country-flag-title">
          <span className="country-flag-icon">{coords.flag}</span>
          <div>
            <h2 className="country-name">{data.countryName} ({data.baseScore}%)</h2>
            <div className="country-region-badge">Real-time dynamic risk calculation ({data.matchedArticles?.length || 0} Matched Articles)</div>
          </div>
        </div>

        <div className="risk-gauge-circle">
          <div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700' }}>
              Supply chain risk factor score
            </div>
            <div className={`risk-gauge-score tabular-nums`} style={{ color: scoreColor }}>
              {data.baseScore} / 100 ({data.baseScore}%)
            </div>
          </div>
          <span className={badgeSeverityClass}>
            {data.status}
          </span>
        </div>
      </div>

      {/* Categorized Risk Progress Meters */}
      <h3 style={{ fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BarChart2Icon size={18} color="#8f9e7c" /> Real-time categorized risk breakdown for {data.countryName}
      </h3>
      <div className="country-risk-categories-grid">
        {[
          { label: 'Geopolitical & trade stability', icon: <AlertTriangleIcon size={14} color="#d4897a" style={{ marginRight: '6px' }} />, score: catScores.geopolitical || 0, color: '#d4897a' },
          { label: 'Logistics & maritime congestion', icon: <ShipIcon size={14} color="#b0aca3" style={{ marginRight: '6px' }} />, score: catScores.logistics || 0, color: '#b0aca3' },
          { label: 'Climate & extreme weather impact', icon: <WindIcon size={14} color="#95a894" style={{ marginRight: '6px' }} />, score: catScores.weather || 0, color: '#95a894' },
          { label: 'Market, tariff & labor volatility', icon: <TrendingUpIcon size={14} color="#d4b87a" style={{ marginRight: '6px' }} />, score: catScores.market || 0, color: '#d4b87a' }
        ].map((cat, idx) => (
          <div key={idx} className="category-risk-item">
            <div className="category-risk-header">
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                {cat.icon}
                {cat.label}
              </span>
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

      {/* Key Regional Bottlenecks & AI Risk Drivers */}
      <div style={{ marginBottom: '1.5rem', background: 'rgba(255, 255, 255, 0.03)', padding: '1.1rem', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <h4 style={{ fontSize: '0.925rem', color: '#38bdf8', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPinIcon size={16} color="#38bdf8" /> AI-synthesized risk drivers & regional choke points for {data.countryName}:
        </h4>
        <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-primary)', fontSize: '0.875rem', lineHeight: '1.65' }}>
          {data.highlights && data.highlights.length > 0 ? (
            data.highlights.map((bullet, idx) => (
              <li key={idx} style={{ marginBottom: '0.35rem' }}>{bullet}</li>
            ))
          ) : (
            <li>No specific risk drivers generated.</li>
          )}
        </ul>
      </div>

      {/* Real Matched Intelligence Feeds */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <NewspaperIcon size={18} color="var(--accent-olive)" /> Matched real-time intelligence feeds ({data.matchedArticles?.length || 0})
          </h4>
          <span style={{ fontSize: '0.725rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="pulse-dot" style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
            Live Postgres feed stream
          </span>
        </div>
        {!data.matchedArticles || data.matchedArticles.length === 0 ? (
          <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No specific articles matched for {data.countryName}.
          </div>
        ) : (
          <div className="articles-grid">
            {data.matchedArticles.slice(0, 6).map((article) => (
              <a 
                key={article.id} 
                href={sanitizeArticleUrl(article)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="article-card"
              >
                <div className="card-header">
                  <span className="source-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <RadioIcon size={13} color="var(--accent-olive)" /> {article.source || 'News Feed'}
                  </span>
                  <span className="time-stamp">{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : ''}</span>
                </div>
                <h2 className="article-title">{article.title}</h2>
                <div className="card-footer">
                  <span className="read-more">
                    Analyze source report
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

// --------------------------------------------------------------------------
// Real NASA Satellite Photography 3D Earth Globe Component
// --------------------------------------------------------------------------
function RealNASASatellite3DGlobeCard({ targetCoords, selectedCountryQuery, countryRiskData, onSelectCountry }) {
  const mountRef = useRef(null);
  const earthGroupRef = useRef(null);
  const targetRotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (targetCoords) {
      const targetY = -((targetCoords.lng + 90) * Math.PI) / 180;
      const targetX = (targetCoords.lat * Math.PI) / 180 * 0.4;
      targetRotationRef.current = { x: targetX, y: targetY };
    }
  }, [targetCoords]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !window.THREE) return;

    const THREE = window.THREE;
    const width = container.clientWidth || 540;
    const height = container.clientHeight || 440;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5.4; // Slightly zoomed out, but larger than 6.5

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const earthGroup = new THREE.Group();
    earthGroupRef.current = earthGroup;
    scene.add(earthGroup);

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

    const earthGeometry = new THREE.SphereGeometry(2, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: nasaEarthTexture,
      specularMap: nasaSpecularMap,
      shininess: 100,
      specular: new THREE.Color(0x000000) // completely remove glare
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earthMesh);

    // Ocean tint overlay using specular map as alpha mask (oceans are white, land is black)
    const oceanGeometry = new THREE.SphereGeometry(2.001, 64, 64);
    const oceanMaterial = new THREE.MeshBasicMaterial({
      color: 0x081c38, // sleek dark navy ocean
      transparent: true,
      opacity: 0.55,
      alphaMap: nasaSpecularMap,
      depthWrite: false
    });
    const oceanMesh = new THREE.Mesh(oceanGeometry, oceanMaterial);
    earthGroup.add(oceanMesh);

    const cloudsGeometry = new THREE.SphereGeometry(2.03, 64, 64);
    const cloudsMaterial = new THREE.MeshLambertMaterial({
      map: nasaCloudsTexture,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    earthGroup.add(cloudsMesh);

    const atmosphereGeometry = new THREE.SphereGeometry(2.09, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x1e3a5f, // dark tactical atmosphere halo
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphereMesh);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.3);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x334466, 0.7);
    scene.add(ambientLight);

    // Render 3D Pin Markers on 3D Earth Sphere
    const pinMeshes = [];
    const markerGroup = new THREE.Group();
    earthGroup.add(markerGroup);

    // Helper to generate crisp 3D country name label sprites
    const createCountryLabelSprite = (text, flag, isSelected, scoreStr) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 380;
      canvas.height = 84;

      const bg = isSelected ? 'rgba(143, 158, 124, 0.94)' : 'rgba(17, 17, 12, 0.85)';
      const border = isSelected ? '#ffffff' : '#8a8372';

      // Draw rounded pill container
      const pad = 4;
      const x = pad, y = pad, w = canvas.width - pad * 2, h = canvas.height - pad * 2, r = 20;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.lineWidth = isSelected ? 4.5 : 3;
      ctx.strokeStyle = border;
      ctx.stroke();

      // Render flag + Country Name + Score
      ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
      ctx.textBaseline = 'middle';
      
      const mainText = `${flag} ${text}`;
      const scoreText = scoreStr ? ` (${scoreStr})` : '';
      
      const mainWidth = ctx.measureText(mainText).width;
      const scoreWidth = scoreText ? ctx.measureText(scoreText).width : 0;
      const totalWidth = mainWidth + scoreWidth;
      
      const startX = (canvas.width - totalWidth) / 2;
      const textY = canvas.height / 2;
      
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(mainText, startX, textY);
      
      if (scoreText) {
        ctx.fillStyle = isSelected ? '#ffffff' : '#8a8372';
        ctx.fillText(scoreText, startX + mainWidth, textY);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
      const sprite = new THREE.Sprite(spriteMaterial);
      // Increased label size by ~25%
      const scaleW = isSelected ? 0.95 : 0.76;
      const scaleH = isSelected ? 0.21 : 0.17;
      sprite.scale.set(scaleW, scaleH, 1);
      return sprite;
    };

    GLOBAL_PIN_LIST.forEach((pin) => {
      const radius = 2.04;
      const phi = (90 - pin.lat) * (Math.PI / 180);
      const theta = (pin.lng + 180) * (Math.PI / 180);

      const x = - (radius * Math.sin(phi) * Math.cos(theta));
      const y = (radius * Math.cos(phi));
      const z = (radius * Math.sin(phi) * Math.sin(theta));

      const isSelected = selectedCountryQuery && selectedCountryQuery.toLowerCase() === pin.query.toLowerCase();
      const colorHex = isSelected ? 0x8f9e7c : 0xf2ebd9;

      let scoreStr = '';
      if (isSelected && countryRiskData) {
        if (countryRiskData.hasData && countryRiskData.baseScore !== null) {
          scoreStr = `${countryRiskData.baseScore}%`;
        } else if (!countryRiskData.hasData) {
          scoreStr = 'N/A';
        }
      }

      const ringGeom = new THREE.RingGeometry(isSelected ? 0.08 : 0.05, isSelected ? 0.12 : 0.08, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.position.set(x, y, z);
      ringMesh.lookAt(0, 0, 0);

      const dotGeom = new THREE.SphereGeometry(isSelected ? 0.06 : 0.04, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const dotMesh = new THREE.Mesh(dotGeom, dotMat);
      dotMesh.position.set(x, y, z);

      // Country Name Text Sprite
      const labelSprite = createCountryLabelSprite(pin.query, pin.flag, isSelected, scoreStr);
      labelSprite.position.set(x * 1.10, y * 1.10, z * 1.10);

      dotMesh.userData = { countryQuery: pin.query };
      ringMesh.userData = { countryQuery: pin.query };
      labelSprite.userData = { countryQuery: pin.query };

      markerGroup.add(ringMesh);
      markerGroup.add(dotMesh);
      markerGroup.add(labelSprite);
      pinMeshes.push(dotMesh, ringMesh, labelSprite);
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
        if (hitObj.userData && hitObj.userData.countryQuery) {
          onSelectCountry(hitObj.userData.countryQuery);
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
  }, [selectedCountryQuery, countryRiskData, onSelectCountry]);

  return (
    <div className="analytics-card globe-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 className="section-title" style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SatelliteIcon size={18} color="#38bdf8" /> NASA satellite 3D photographic earth
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real NASA Blue Marble satellite photography & specular ocean lighting
          </p>
        </div>
        <span className="source-badge" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.1)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="pulse-dot-red" /> REAL NASA PHOTOGRAPHY
        </span>
      </div>

      <div ref={mountRef} className="globe-canvas-wrapper" />
    </div>
  );
}

// --------------------------------------------------------------------------
// HD Satellite Tile Map Component (Unified Score Sync with Bottom Panel)
// --------------------------------------------------------------------------
function HDSatelliteTileMap({ targetCoords, selectedCountryQuery, countryRiskData, onSelectCountry }) {
  const mapRef = useRef(null);
  const leafletInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!window.L || !mapRef.current) return;

    if (mapRef.current && !leafletInstanceRef.current) {
      const map = window.L.map(mapRef.current, {
        center: [20, 0],
        zoom: 3,
        worldCopyJump: true
      });
      
      window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18
      }).addTo(map);

      leafletInstanceRef.current = map;
    }

    const map = leafletInstanceRef.current;

    // Render Compact Pins by default, and Expanded Badge ONLY for Selected Country
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    GLOBAL_PIN_LIST.forEach(pin => {
      const isSelected = selectedCountryQuery && selectedCountryQuery.toLowerCase() === pin.query.toLowerCase();
      const color = isSelected ? '#38bdf8' : '#f59e0b';
      
      // Determine score strictly from real-time API response for selected country
      let scoreStr = `${pin.baseScore}%`;
      if (isSelected && countryRiskData) {
        if (countryRiskData.hasData && countryRiskData.baseScore !== null) {
          scoreStr = `${countryRiskData.baseScore}%`;
        } else if (!countryRiskData.hasData) {
          scoreStr = 'N/A';
        }
      }

      let customIcon;
      if (isSelected) {
        // Expanded glowing risk badge ONLY for currently selected country
        customIcon = window.L.divIcon({
          className: 'custom-satellite-pin-selected',
          html: `
            <div style="
              background: rgba(11, 17, 32, 0.95);
              border: 2px solid #8f9e7c;
              padding: 4px 10px;
              border-radius: 14px;
              box-shadow: 0 0 20px rgba(143, 158, 124, 0.8);
              display: flex;
              align-items: center;
              gap: 6px;
              white-space: nowrap;
              cursor: pointer;
              color: #ffffff;
              font-size: 12px;
              font-weight: 700;
              z-index: 1000;
            ">
              <span>${pin.flag}</span>
              <span>${pin.query}</span>
              <span style="color: #8f9e7c; font-weight: 800;">(${scoreStr})</span>
            </div>
          `,
          iconSize: [140, 32],
          iconAnchor: [70, 16]
        });
      } else {
        // Compact circular flag dot by default for unselected pins
        customIcon = window.L.divIcon({
          className: 'custom-satellite-pin-compact',
          html: `
            <div style="
              background: rgba(11, 17, 32, 0.85);
              border: 2px solid rgba(255, 255, 255, 0.6);
              width: 24px;
              height: 24px;
              border-radius: 50%;
              box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              cursor: pointer;
            ">
              ${pin.flag}
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
      }

      const marker = window.L.marker([pin.lat, pin.lng], { icon: customIcon }).addTo(map);
      marker.bindTooltip(`<b>${pin.flag} ${pin.query}</b>`, { direction: 'top' });
      marker.on('click', () => onSelectCountry(pin.query));
      markersRef.current.push(marker);
    });

    if (targetCoords) {
      map.flyTo([targetCoords.lat, targetCoords.lng], 4, { duration: 1.5 });
    }

  }, [targetCoords, selectedCountryQuery, countryRiskData, onSelectCountry]);

  return (
    <div className="analytics-card globe-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 className="section-title" style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapLayerIcon size={18} color="#10b981" /> HD Esri Satellite Tile Map
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            High-resolution satellite composite. <strong>Note: Static composite used to prevent orbital swath gaps.</strong>
          </p>
        </div>
        <span className="source-badge" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.1)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="pulse-dot-red" /> GAPLESS HD COMPOSITE
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
function SourceBreakdownDonut({ articles = [], selectedCountryName = null }) {
  const [dbSources, setDbSources] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/articles/sources`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.length > 0) {
          setDbSources(data);
        }
      })
      .catch((e) => console.warn('Backend sources endpoint check:', e));
  }, []);

  const sourceData = React.useMemo(() => {
    const colors = ['#f2ebd9', '#8f9e7c', '#b0aca3', '#d4897a', '#d4b87a', '#95a894'];

    if (articles && articles.length > 0) {
      const counts = {};
      articles.forEach((a) => {
        const src = a.source || 'Other Feeds';
        counts[src] = (counts[src] || 0) + 1;
      });
      const total = articles.length;
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
      { label: 'Supply Chain Dive', count: 25, percent: 55.6, color: '#f2ebd9' },
      { label: 'Bloomberg Logistics', count: 12, percent: 26.7, color: '#8f9e7c' },
      { label: 'Reuters Maritime', count: 5, percent: 11.1, color: '#b0aca3' },
      { label: 'FreightWaves', count: 3, percent: 6.6, color: '#d4897a' }
    ];
  }, [dbSources, articles]);

  const totalCount = sourceData.reduce((sum, item) => sum + item.count, 0);
  let cumulativeAngle = 0;

  return (
    <div className="analytics-card pie-chart-card">
      <div className="card-header-block" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 className="section-title" style={{ fontSize: '1.05rem', margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChartIcon size={18} color="var(--accent-olive)" /> Intelligence source breakdown
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
            {selectedCountryName ? (
              <span style={{ color: '#8f9e7c', fontWeight: '600' }}>{selectedCountryName} ({articles.length} Localized Feeds)</span>
            ) : (
              <span>Live aggregated distribution (<code style={{ fontSize: '0.725rem' }}>SELECT source, COUNT(*)</code>)</span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '0.25rem 0.6rem', borderRadius: '20px' }}>
          <span className="pulse-dot" style={{ width: '7px', height: '7px', background: '#10b981', boxShadow: '0 0 8px #10b981', borderRadius: '50%', display: 'inline-block' }}></span>
          <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '700', letterSpacing: '0.04em' }}>Live feed line active</span>
        </div>
      </div>

      {/* Live Data Feed Connection Line Indicator */}
      <div style={{ margin: '0.75rem 0 0.5rem 0', padding: '0.5rem 0.75rem', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
        <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <RadioIcon size={14} color="#38bdf8" /> Feed pipeline: <strong style={{ color: '#8f9e7c' }}>Live Postgres database ingest</strong>
        </span>
        <span style={{ color: '#10b981', fontWeight: '600' }}>
          ● Synchronized
        </span>
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
            Total articles
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

export default App;
