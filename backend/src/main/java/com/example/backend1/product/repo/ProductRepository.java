package com.example.backend1.product.repo;

import com.example.backend1.diagnosis.domain.IssueType;
import com.example.backend1.product.domain.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    // =========================
    // 앱 노출용
    // =========================

    List<Product> findByCategoryAndActiveTrue(IssueType category);

    List<Product> findByActiveTrueOrderByCreatedAtDesc();

    List<Product> findByCategoryAndActiveTrueOrderByCreatedAtDesc(IssueType category);


    // =========================
    // 관리자 물품관리용
    // =========================

    Page<Product> findByCategory(IssueType category, Pageable pageable);

    List<Product> findAllByOrderByCreatedAtDesc();

    List<Product> findByCategoryOrderByCreatedAtDesc(IssueType category);
}