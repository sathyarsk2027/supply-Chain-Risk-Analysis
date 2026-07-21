package com.supplychain.monitor.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Convert;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.pgvector.PGvector;
import java.time.Instant;

@Entity
@Table(name = "news_articles")
public class NewsArticle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(unique = true, nullable = false)
    private String url;

    private String source;

    private Instant publishedAt;

    @Column(columnDefinition = "TEXT")
    private String rawContent;

    private Instant fetchedAt;

    private String riskCategory;

    @Column(columnDefinition = "TEXT")
    private String entities;

    @Column(columnDefinition = "vector(384)")
    @Convert(converter = PGvectorConverter.class)
    @JdbcTypeCode(SqlTypes.OTHER)
    private PGvector embedding;


    public NewsArticle() {
    }

    public NewsArticle(String title, String url, String source, Instant publishedAt, String rawContent, Instant fetchedAt) {
        this.title = title;
        this.url = url;
        this.source = source;
        this.publishedAt = publishedAt;
        this.rawContent = rawContent;
        this.fetchedAt = fetchedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
    }

    public String getRawContent() {
        return rawContent;
    }

    public void setRawContent(String rawContent) {
        this.rawContent = rawContent;
    }

    public Instant getFetchedAt() {
        return fetchedAt;
    }

    public void setFetchedAt(Instant fetchedAt) {
        this.fetchedAt = fetchedAt;
    }

    public String getRiskCategory() {
        return riskCategory;
    }

    public void setRiskCategory(String riskCategory) {
        this.riskCategory = riskCategory;
    }

    public String getEntities() {
        return entities;
    }

    public void setEntities(String entities) {
        this.entities = entities;
    }

    public PGvector getEmbedding() {
        return embedding;
    }

    public void setEmbedding(PGvector embedding) {
        this.embedding = embedding;
    }
}
