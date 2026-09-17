package com.supplychain.monitor.repository;

import com.supplychain.monitor.model.NewsArticle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NewsArticleRepository extends JpaRepository<NewsArticle, Long> {
    boolean existsByUrl(String url);
    java.util.Optional<NewsArticle> findByUrl(String url);
    List<NewsArticle> findAllByOrderByPublishedAtDesc();

    @Query(value = "SELECT * FROM news_articles WHERE fetched_at >= :startTime AND fetched_at < :endTime ORDER BY published_at DESC", nativeQuery = true)
    List<NewsArticle> findArticlesIngestedBetween(@Param("startTime") java.time.Instant startTime, @Param("endTime") java.time.Instant endTime);

    @Query(value = "SELECT id, title, url, source, risk_category AS riskCategory, raw_content AS rawContent, published_at AS publishedAt, " +
                   "(embedding <=> CAST(:embedding AS vector)) AS cosineDistance, " +
                   "( " +
                   "  ((1.0 - (embedding <=> CAST(:embedding AS vector))) * 0.85) + " +
                   "  (EXP(-(EXTRACT(EPOCH FROM (CURRENT_DATE - published_at)) / 86400.0) / 7.0) * 0.15) " +
                   ") AS compositeScore " +
                   "FROM news_articles " +
                   "WHERE embedding IS NOT NULL " +
                   "AND published_at >= CURRENT_DATE - INTERVAL '14 days' " +
                   "AND (1.0 - (embedding <=> CAST(:embedding AS vector))) >= 0.25 " +
                   "ORDER BY compositeScore DESC " +
                   "LIMIT 30", nativeQuery = true)
    List<NewsArticleSearchResult> findSimilarArticles(@Param("embedding") String embedding);

    @Query(value = "SELECT source AS source, COUNT(*) AS count FROM news_articles GROUP BY source", nativeQuery = true)
    List<SourceCountProjection> findSourceCounts();

    @Query(value = "SELECT * FROM news_articles WHERE LOWER(title) LIKE LOWER(CONCAT('%', :kw, '%')) OR LOWER(COALESCE(entities, '')) LIKE LOWER(CONCAT('%', :kw, '%')) OR LOWER(COALESCE(raw_content, '')) LIKE LOWER(CONCAT('%', :kw, '%')) ORDER BY published_at DESC LIMIT 50", nativeQuery = true)
    List<NewsArticle> findByKeyword(@Param("kw") String keyword);

    @Query(value = "SELECT * FROM news_articles WHERE " +
                   "title ~* :pattern OR " +
                   "COALESCE(entities, '') ~* :pattern OR " +
                   "COALESCE(raw_content, '') ~* :pattern " +
                   "ORDER BY published_at DESC LIMIT 50", nativeQuery = true)
    List<NewsArticle> findByPattern(@Param("pattern") String regexPattern);

    interface NewsArticleSearchResult {
        Long getId();
        String getTitle();
        String getUrl();
        String getSource();
        String getRiskCategory();
        String getRawContent();
        java.time.Instant getPublishedAt();
        Double getCosineDistance();
        Double getCompositeScore();
    }

    interface SourceCountProjection {
        String getSource();
        Long getCount();
    }
}
