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

    @Query(value = "SELECT id, title, url, source, risk_category AS riskCategory, " +
                   "(embedding <=> CAST(:embedding AS vector)) AS cosineDistance " +
                   "FROM news_articles " +
                   "WHERE embedding IS NOT NULL " +
                   "ORDER BY embedding <=> CAST(:embedding AS vector) ASC " +
                   "LIMIT 5", nativeQuery = true)
    List<NewsArticleSearchResult> findSimilarArticles(@Param("embedding") String embedding);

    interface NewsArticleSearchResult {
        Long getId();
        String getTitle();
        String getUrl();
        String getSource();
        String getRiskCategory();
        Double getCosineDistance();
    }
}
