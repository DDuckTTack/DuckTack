package com.example.backend1;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * DB 없이 @Query(JPQL) 문법만 검증한다.
 * Spring Data는 리포지토리 빈을 만들 때 선언된 JPQL을 파싱하므로,
 * 컨텍스트가 뜨기만 하면 잘못된 쿼리는 여기서 걸린다.
 * (JDBC 메타데이터 접근을 끄고 dialect를 고정해 실제 커넥션 없이 부팅한다.)
 */
@DataJpaTest
@TestPropertySource(properties = {
        "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
        "spring.jpa.properties.hibernate.boot.allow_jdbc_metadata_access=false",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.sql.init.mode=never",
        "spring.datasource.url=jdbc:postgresql://localhost:1/none",
        "spring.datasource.driver-class-name=org.postgresql.Driver"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpqlQueryValidationTest {

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void repositoryQueriesParse() {
        // 컨텍스트 로딩만으로 모든 @Query JPQL 파싱이 검증된다.
    }
}
