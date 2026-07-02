package com.example.backend1.company.unavailable.service;

import com.example.backend1.company.domain.Company;
import com.example.backend1.company.unavailable.domain.CompanyUnavailableDate;
import com.example.backend1.company.unavailable.dto.CompanyUnavailableDateDtos;
import com.example.backend1.company.unavailable.repository.CompanyUnavailableDateRepository;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.repo.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CompanyUnavailableDateService {

    private final CompanyUnavailableDateRepository unavailableDateRepository;
    private final UserRepository userRepository;

    private Company getLoginCompany(String username) {
        User user = userRepository.findWithCompanyByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다."));

        if (user.getCompany() == null) {
            throw new IllegalArgumentException("업체를 찾을 수 없습니다.");
        }

        return user.getCompany();
    }

    @Transactional(readOnly = true)
    public List<CompanyUnavailableDateDtos.Response> getMyUnavailableDates(String username) {
        Company company = getLoginCompany(username);

        return unavailableDateRepository.findByCompanyOrderByUnavailableDateAsc(company)
                .stream()
                .map(date -> new CompanyUnavailableDateDtos.Response(
                        date.getId(),
                        date.getUnavailableDate()
                ))
                .toList();
    }

    @Transactional
    public CompanyUnavailableDateDtos.Response create(
            String username,
            CompanyUnavailableDateDtos.CreateRequest request
    ) {
        Company company = getLoginCompany(username);

        LocalDate unavailableDate = request.unavailableDate();

        if (unavailableDate == null) {
            throw new IllegalArgumentException("날짜를 입력해야 합니다.");
        }

        if (unavailableDateRepository.existsByCompanyAndUnavailableDate(company, unavailableDate)) {
            throw new IllegalArgumentException("이미 등록된 불가능 날짜입니다.");
        }

        CompanyUnavailableDate saved = new CompanyUnavailableDate();
        saved.setCompany(company);
        saved.setUnavailableDate(unavailableDate);

        CompanyUnavailableDate result = unavailableDateRepository.save(saved);

        return new CompanyUnavailableDateDtos.Response(
                result.getId(),
                result.getUnavailableDate()
        );
    }

    @Transactional
    public void delete(String username, Long id) {
        Company company = getLoginCompany(username);

        CompanyUnavailableDate date = unavailableDateRepository.findByIdAndCompany(id, company)
                .orElseThrow(() -> new IllegalArgumentException("삭제할 날짜를 찾을 수 없습니다."));

        unavailableDateRepository.delete(date);
    }
}