package com.example.backend1.user.repo;

import com.example.backend1.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByPhoneNumber(String phoneNumber);

    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);

    @Query("select u from User u left join fetch u.company where u.username = :username")
    Optional<User> findWithCompanyByUsername(@Param("username") String username);



    Optional<User> findByUsernameAndEmail(String username, String email);
}