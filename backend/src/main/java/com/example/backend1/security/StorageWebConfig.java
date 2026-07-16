package com.example.backend1.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class StorageWebConfig implements WebMvcConfigurer {

    private final String storageRoot;

    public StorageWebConfig(@Value("${storage.local.root}") String storageRoot) {
        this.storageRoot = storageRoot;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Path.of(storageRoot).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/storage/**")
                .addResourceLocations(location);
    }
}
