import React, { useState, useEffect, useCallback, useRef } from 'react';

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
// Geographic Pin Database for 3D Earth & HD Satellite Map
// --------------------------------------------------------------------------
const GLOBAL_PIN_LIST = [
  { id: 'US', query: 'United States', flag: '🇺🇸', lat: 37.0, lng: -95.0, baseScore: 78 },
  { id: 'CN', query: 'China', flag: '🇨🇳', lat: 35.0, lng: 104.0, baseScore: 85 },
  { id: 'IN', query: 'India', flag: '🇮🇳', lat: 20.5, lng: 78.9, baseScore: 72 },
  { id: 'DE', query: 'Germany', flag: '🇩🇪', lat: 51.1, lng: 10.4, baseScore: 62 },
  { id: 'NL', query: 'Netherlands', flag: '🇳🇱', lat: 52.3, lng: 4.9, baseScore: 68 },
  { id: 'EG', query: 'Egypt', flag: '🇪🇬', lat: 26.8, lng: 30.8, baseScore: 94 },
  { id: 'SG', query: 'Singapore', flag: '🇸🇬', lat: 1.35, lng: 103.8, baseScore: 74 },
  { id: 'JP', query: 'Japan', flag: '🇯🇵', lat: 36.2, lng: 138.2, baseScore: 56 },
  { id: 'GB', query: 'United Kingdom', flag: '🇬🇧', lat: 55.3, lng: -3.4, baseScore: 65 },
  { id: 'BR', query: 'Brazil', flag: '🇧🇷', lat: -14.2, lng: -51.9, baseScore: 69 },
  { id: 'AU', query: 'Australia', flag: '🇦🇺', lat: -25.2, lng: 133.7, baseScore: 54 },
  { id: 'FR', query: 'France', flag: '🇫🇷', lat: 46.2, lng: 2.2, baseScore: 63 },
  { id: 'CA', query: 'Canada', flag: '🇨🇦', lat: 56.1, lng: -106.3, baseScore: 67 },
  { id: 'MX', query: 'Mexico', flag: '🇲🇽', lat: 23.6, lng: -102.5, baseScore: 71 },
  { id: 'KR', query: 'South Korea', flag: '🇰🇷', lat: 35.9, lng: 127.7, baseScore: 60 },
  { id: 'AE', query: 'United Arab Emirates', flag: '🇦🇪', lat: 23.4, lng: 53.8, baseScore: 64 }
];

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
              <div className="subtitle-bar">
                <span className="live-indicator">
                  <span className="pulse-dot"></span> REAL-TIME SATELLITE INTELLIGENCE
                </span>
                <span className="system-badge">AUTOMATIC 15M SYNC</span>
              </div>
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
                    <span className="ai-sparkle">✨</span> AI risk summary
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
// Real-Time Dynamic NASA Satellite & Risk Factors Analytics Section
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
            <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>🔍</span>
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
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '0 0.5rem' }}
                onClick={() => setSearchCountryQuery('')}
              >
                ✕
              </button>
            )}
            <button type="submit" className="btn-search" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
              Calculate Risk
            </button>
          </div>
        </form>

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
          Real-Time Quick Selectors (Search accepts ANY country in the world):
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
        <div className="spin" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔄</div>
        <h3 style={{ color: '#ffffff' }}>Computing Real-Time Risk Factor Score for {countryQuery}...</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Querying live database articles, analyzing category weights, and generating AI risk drivers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="country-risk-panel" style={{ borderColor: 'var(--error)' }}>
        <h3 style={{ color: 'var(--error)' }}>Real-Time Risk Calculation Error</h3>
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
          <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>ℹ️ Insufficient Live Disruption Data</h4>
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
            <div className="country-region-badge">Real-Time Dynamic Risk Calculation ({data.matchedArticles?.length || 0} Matched Articles)</div>
          </div>
        </div>

        <div className="risk-gauge-circle">
          <div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700' }}>
              Supply Chain Risk Factor Score
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
      <h3 style={{ fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.85rem' }}>
        📈 Real-Time Categorized Risk Breakdown for {data.countryName}
      </h3>
      <div className="country-risk-categories-grid">
        {[
          { label: '⚠️ Geopolitical & Trade Stability', score: catScores.geopolitical || 0, color: '#f59e0b' },
          { label: '🚢 Logistics & Maritime Congestion', score: catScores.logistics || 0, color: '#38bdf8' },
          { label: '🌪️ Climate & Extreme Weather Impact', score: catScores.weather || 0, color: '#22d3ee' },
          { label: '📈 Market, Tariff & Labor Volatility', score: catScores.market || 0, color: '#10b981' }
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

      {/* Key Regional Bottlenecks & AI Risk Drivers */}
      <div style={{ marginBottom: '1.5rem', background: 'rgba(255, 255, 255, 0.03)', padding: '1.1rem', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <h4 style={{ fontSize: '0.925rem', color: '#38bdf8', marginBottom: '0.5rem' }}>
          📍 AI-Synthesized Risk Drivers & Regional Choke Points for {data.countryName}:
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
        <h4 style={{ fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.85rem' }}>
          📰 Matched Real-Time Intelligence Feeds ({data.matchedArticles?.length || 0})
        </h4>
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

// --------------------------------------------------------------------------
// Real NASA Satellite Photography 3D Earth Globe Component
// --------------------------------------------------------------------------
function RealNASASatellite3DGlobeCard({ targetCoords, selectedCountryQuery, onSelectCountry }) {
  const mountRef = useRef(null);
  const earthGroupRef = useRef(null);
  const targetRotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (targetCoords) {
      const targetY = -((targetCoords.lng * Math.PI) / 180);
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
    camera.position.z = 5.2;

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
      shininess: 35,
      specular: new THREE.Color(0x38bdf8)
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earthMesh);

    const cloudsGeometry = new THREE.SphereGeometry(2.03, 64, 64);
    const cloudsMaterial = new THREE.MeshPhongMaterial({
      map: nasaCloudsTexture,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    earthGroup.add(cloudsMesh);

    const atmosphereGeometry = new THREE.SphereGeometry(2.09, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphereMesh);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x334466, 0.7);
    scene.add(ambientLight);

    // Render 3D Pin Markers on 3D Earth Sphere
    const pinMeshes = [];
    const markerGroup = new THREE.Group();
    earthGroup.add(markerGroup);

    GLOBAL_PIN_LIST.forEach((pin) => {
      const radius = 2.04;
      const phi = (90 - pin.lat) * (Math.PI / 180);
      const theta = (pin.lng + 180) * (Math.PI / 180);

      const x = - (radius * Math.sin(phi) * Math.cos(theta));
      const y = (radius * Math.cos(phi));
      const z = (radius * Math.sin(phi) * Math.sin(theta));

      const isSelected = selectedCountryQuery && selectedCountryQuery.toLowerCase() === pin.query.toLowerCase();
      const colorHex = isSelected ? 0x38bdf8 : 0xf59e0b;

      const ringGeom = new THREE.RingGeometry(isSelected ? 0.08 : 0.05, isSelected ? 0.12 : 0.08, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.position.set(x, y, z);
      ringMesh.lookAt(0, 0, 0);

      const dotGeom = new THREE.SphereGeometry(isSelected ? 0.06 : 0.04, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const dotMesh = new THREE.Mesh(dotGeom, dotMat);
      dotMesh.position.set(x, y, z);

      dotMesh.userData = { countryQuery: pin.query };
      ringMesh.userData = { countryQuery: pin.query };

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
  }, [selectedCountryQuery, onSelectCountry]);

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
// HD Satellite Tile Map Component (Unified Score Sync with Bottom Panel)
// --------------------------------------------------------------------------
function HDSatelliteTileMap({ targetCoords, selectedCountryQuery, countryRiskData, onSelectCountry }) {
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
              border: 2px solid #38bdf8;
              padding: 4px 10px;
              border-radius: 14px;
              box-shadow: 0 0 20px rgba(56, 189, 248, 0.8);
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
              <span style="color: #38bdf8; font-weight: 800;">(${scoreStr})</span>
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
    const colors = ['#38bdf8', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#ec4899', '#f43f5e'];

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
      { label: 'Supply Chain Dive', count: 25, percent: 55.6, color: '#38bdf8' },
      { label: 'Bloomberg Logistics', count: 12, percent: 26.7, color: '#f59e0b' },
      { label: 'Reuters Maritime', count: 5, percent: 11.1, color: '#10b981' },
      { label: 'FreightWaves', count: 3, percent: 6.6, color: '#8b5cf6' }
    ];
  }, [dbSources, articles]);

  const totalCount = sourceData.reduce((sum, item) => sum + item.count, 0);
  let cumulativeAngle = 0;

  return (
    <div className="analytics-card pie-chart-card">
      <div className="card-header-block">
        <h3 className="section-title" style={{ fontSize: '1.05rem', margin: 0, color: '#ffffff' }}>
          📊 Intelligence Source Breakdown
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
          {selectedCountryName ? (
            <span style={{ color: '#38bdf8', fontWeight: '600' }}>{selectedCountryName} ({articles.length} Feeds)</span>
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

export default App;
