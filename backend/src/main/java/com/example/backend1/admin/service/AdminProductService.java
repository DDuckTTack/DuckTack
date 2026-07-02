package com.example.backend1.admin.service;

import com.example.backend1.admin.dto.AdminProductDtos;
import com.example.backend1.diagnosis.domain.IssueType;
import com.example.backend1.product.domain.Product;
import com.example.backend1.product.repo.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminProductService {

    private final ProductRepository productRepository;

    @Transactional
    public AdminProductDtos.Response create(AdminProductDtos.CreateRequest req) {
        Product product = new Product(
                req.name(),
                req.productId(),
                req.coupangUrl(),
                req.imageUrl(),
                req.category()
        );

        product.updateFrom(
                null,
                null,
                null,
                null,
                null,
                req.active() == null ? true : req.active()
        );

        return toResponse(productRepository.save(product));
    }

    @Transactional(readOnly = true)
    public Page<AdminProductDtos.ListItem> list(IssueType category, Pageable pageable) {
        Page<Product> page = category == null
                ? productRepository.findAll(pageable)
                : productRepository.findByCategory(category, pageable);

        return page.map(this::toListItem);
    }

    @Transactional
    public AdminProductDtos.Response update(Long id, AdminProductDtos.UpdateRequest req) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("상품을 찾을 수 없습니다. id=" + id));

        product.updateFrom(
                req.name(),
                req.productId(),
                req.coupangUrl(),
                req.imageUrl(),
                req.category(),
                req.active()
        );

        return toResponse(productRepository.save(product));
    }

    @Transactional
    public AdminProductDtos.Response updateActive(Long id, AdminProductDtos.ActiveRequest req) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("상품을 찾을 수 없습니다. id=" + id));

        product.updateFrom(
                null,
                null,
                null,
                null,
                null,
                req.active()
        );

        return toResponse(productRepository.save(product));
    }

    @Transactional
    public void delete(Long id) {
        if (!productRepository.existsById(id)) {
            throw new IllegalArgumentException("상품을 찾을 수 없습니다. id=" + id);
        }

        productRepository.deleteById(id);
    }

    private AdminProductDtos.ListItem toListItem(Product product) {
        return new AdminProductDtos.ListItem(
                product.getId(),
                product.getName(),
                product.getProductId(),
                product.getCoupangUrl(),
                product.getImageUrl(),
                product.getCategory(),
                product.isActive(),
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }

    private AdminProductDtos.Response toResponse(Product product) {
        return new AdminProductDtos.Response(
                product.getId(),
                product.getName(),
                product.getProductId(),
                product.getCoupangUrl(),
                product.getImageUrl(),
                product.getCategory(),
                product.isActive(),
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }
}