package com.example.backend1.product.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.diagnosis.domain.IssueType;
import com.example.backend1.product.domain.Product;
import com.example.backend1.product.repo.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductPublicController {

    private final ProductRepository productRepository;

    @GetMapping
    public ApiResponse<List<ProductResponse>> list(
            @RequestParam(required = false) IssueType category
    ) {
        List<Product> products = category == null
                ? productRepository.findByActiveTrueOrderByCreatedAtDesc()
                : productRepository.findByCategoryAndActiveTrueOrderByCreatedAtDesc(category);

        return ApiResponse.ok(
                products.stream()
                        .map(ProductResponse::from)
                        .toList()
        );
    }

    public record ProductResponse(
            Long id,
            String name,
            String productId,
            String coupangUrl,
            String imageUrl,
            IssueType category
    ) {
        public static ProductResponse from(Product product) {
            return new ProductResponse(
                    product.getId(),
                    product.getName(),
                    product.getProductId(),
                    product.getCoupangUrl(),
                    product.getImageUrl(),
                    product.getCategory()
            );
        }
    }
}