package com.example.backend1.config;

import com.example.backend1.user.domain.RentType;
import com.example.backend1.user.domain.ResidenceType;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.domain.UserRole;
import com.example.backend1.user.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapRunner.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String BOOTSTRAP_USERNAME = "admin";
    private static final String BOOTSTRAP_PASSWORD = "admin1234";
    private static final String BOOTSTRAP_EMAIL = "admin@dduckttack.com";
    private static final String BOOTSTRAP_PHONE = "010-1234-5678";

    public AdminBootstrapRunner(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.existsByUsername(BOOTSTRAP_USERNAME)) {
            return;
        }

        User admin = new User(
                BOOTSTRAP_USERNAME,
                BOOTSTRAP_EMAIL,
                passwordEncoder.encode(BOOTSTRAP_PASSWORD),
                BOOTSTRAP_PHONE,
                ResidenceType.ETC,
                RentType.NONE,
                null,

                true,   // termsAgreed
                true,   // privacyAgreed
                false   // marketingAgreed
        );

        admin.setRole(UserRole.ADMIN);
        userRepository.save(admin);

        log.info("Bootstrap admin user created: {}", admin.getUsername());
    }
}