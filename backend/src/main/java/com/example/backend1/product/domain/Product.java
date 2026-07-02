package com.example.backend1.product.domain;

import com.example.backend1.diagnosis.domain.IssueType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.OffsetDateTime;

@Entity
@Table(name = "products", indexes = {
        @Index(name = "idx_products_category", columnList = "category")
})
@Getter
@NoArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "product_id", length = 50)
    private String productId; // 쿠팡 상품 고유 번호

    @Column(name = "coupang_url", length = 1000)
    private String coupangUrl; // 파트너스 링크

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private IssueType category; // CRACK, LEAK 등 문제 유형

    private boolean active = true;

    @Column(nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public Product(String name, String productId, String coupangUrl, String imageUrl, IssueType category) {
        this.name = name;
        this.productId = productId;
        this.coupangUrl = coupangUrl;
        this.imageUrl = imageUrl;
        this.category = category;
    }

    public void update(String name, String productId, String coupangUrl, String imageUrl, IssueType category, Boolean active) {
        if (name != null) this.name = name;
        if (productId != null) this.productId = productId;
        if (coupangUrl != null) this.coupangUrl = coupangUrl;
        if (imageUrl != null) this.imageUrl = imageUrl;
        if (category != null) this.category = category;
        if (active != null) this.active = active;
        this.updatedAt = OffsetDateTime.now();
    }
    public void updateFrom(String name, String productId, String coupangUrl, String imageUrl, IssueType category, Boolean active) {
        if (name != null) this.name = name;
        if (productId != null) this.productId = productId;
        if (coupangUrl != null) this.coupangUrl = coupangUrl;
        if (imageUrl != null) this.imageUrl = imageUrl;
        if (category != null) this.category = category;
        if (active != null) this.active = active;
        this.updatedAt = OffsetDateTime.now();
    }
}