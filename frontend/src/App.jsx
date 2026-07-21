import React, { useState, useEffect, useCallback } from 'react';

function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

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
      setError('Could not connect to the news api server. Please make sure the backend is running on http://localhost:8080 and database variables are set.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

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

  return (
    <div className="container">
      <header>
        <div className="header-title-container">
          <div>
            <h1>Supply Chain Monitor</h1>
            <p className="subtitle">Real-time risk tracking and logistics news feeds</p>
          </div>
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
            {loading ? 'Fetching Feeds...' : 'Refresh Feed'}
          </button>
        </div>
      </header>

      {/* Stats Summary Banner */}
      {!error && (
        <section className="stats-banner" aria-label="Dashboard Stats">
          <div className="stat-item">
            <span className="stat-label">Feed Status</span>
            <span className="stat-value" style={{ color: 'var(--success)' }}>Active</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Articles</span>
            <span className="stat-value">{articles.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Last Checked</span>
            <span className="stat-value" style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
              {lastUpdated || 'Never'}
            </span>
          </div>
        </section>
      )}

      <main>
        {loading && articles.length === 0 ? (
          /* Skeleton Loading Cards */
          <div className="articles-grid">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="skeleton-card" />
            ))}
          </div>
        ) : error ? (
          /* Error State Card */
          <div className="error-container">
            <div className="error-title">Database/API Offline</div>
            <p className="error-msg">{error}</p>
            <button className="btn-retry" onClick={fetchArticles}>
              Try Again
            </button>
          </div>
        ) : articles.length === 0 ? (
          /* Empty Feeds State Card */
          <div className="empty-container">
            <div className="empty-icon">📦</div>
            <div className="empty-title">No Disruption Reports Yet</div>
            <p className="empty-desc">The news database is currently empty. Run article collectors to populate feed data.</p>
          </div>
        ) : (
          /* Articles Display Grid */
          <div className="articles-grid">
            {articles.map((article) => (
              <a 
                key={article.id} 
                href={article.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="article-card"
                id={`article-card-${article.id}`}
              >
                <div className="card-header">
                  <span className="source-badge">{article.source || 'Disruption News'}</span>
                  <span className="time-stamp">{formatDate(article.publishedAt)}</span>
                </div>
                <h2 className="article-title">{article.title}</h2>
                <div className="card-footer">
                  <span className="read-more">
                    Analyze Source
                    <svg className="arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
