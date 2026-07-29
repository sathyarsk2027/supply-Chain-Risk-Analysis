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

    @Query(value = "SELECT id, title, url, source, risk_category AS riskCategory, raw_content AS rawContent, " +
                   "(embedding <=> CAST(:embedding AS vector)) AS cosineDistance " +
                   "FROM news_articles " +
                   "WHERE embedding IS NOT NULL " +
                   "ORDER BY embedding <=> CAST(:embedding AS vector) ASC " +
                   "LIMIT 15", nativeQuery = true)
    List<NewsArticleSearchResult> findSimilarArticles(@Param("embedding") String embedding);

    @Query(value = "SELECT source AS source, COUNT(*) AS count FROM news_articles GROUP BY source", nativeQuery = true)
    List<SourceCountProjection> findSourceCounts();

    interface NewsArticleSearchResult {
        Long getId();
        String getTitle();
        String getUrl();
        String getSource();
        String getRiskCategory();
        String getRawContent();
        Double getCosineDistance();
    }

    interface SourceCountProjection {
        String getSource();
        Long getCount();
    }
}
