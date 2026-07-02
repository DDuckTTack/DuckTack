package com.example.backend1.company.unavailable.service;

import com.example.backend1.company.domain.Company;
import com.example.backend1.company.unavailable.domain.CompanyUnavailableTime;
import com.example.backend1.company.unavailable.dto.CompanyUnavailableTimeDtos;
import com.example.backend1.company.unavailable.repository.CompanyUnavailableTimeRepository;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.repo.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CompanyUnavailableTimeService {

    private final CompanyUnavailableTimeRepository unavailableTimeRepository;
    private final UserRepository userRepository;

    private Company getLoginCompany(String username) {
        User user = userRepository.findWithCompanyByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다."));

        if (user.getCompany() == null) {
            throw new IllegalArgumentException("업체를 찾을 수 없습니다.");
        }

        return user.getCompany();
    }

    @Transactional
    public void create(String username, CompanyUnavailableTimeDtos.CreateRequest request) {
        Company company = getLoginCompany(username);

        LocalDate date = request.date();

        if (date == null) {
            throw new IllegalArgumentException("날짜를 입력해야 합니다.");
        }

        if (request.time() == null || request.time().isBlank()) {
            throw new IllegalArgumentException("시간을 입력해야 합니다.");
        }

        LocalTime time = LocalTime.parse(request.time());

        if (unavailableTimeRepository.existsByCompanyAndDateAndTime(company, date, time)) {
            throw new IllegalArgumentException("이미 등록된 시간입니다.");
        }

        CompanyUnavailableTime block = new CompanyUnavailableTime();
        block.setCompany(company);
        block.setDate(date);
        block.setTime(time);

        unavailableTimeRepository.save(block);
    }

    @Transactional(readOnly = true)
    public List<CompanyUnavailableTimeDtos.Response> getMy(String username) {
        Company company = getLoginCompany(username);

        return unavailableTimeRepository.findByCompany(company)
                .stream()
                .map(t -> new CompanyUnavailableTimeDtos.Response(
                        t.getId(),
                        t.getDate(),
                        t.getTime().toString()
                ))
                .toList();
    }

    @Transactional
    public void delete(String username, Long id) {
        Company company = getLoginCompany(username);

        CompanyUnavailableTime time = unavailableTimeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("삭제할 시간을 찾을 수 없습니다."));

        if (!time.getCompany().getId().equals(company.getId())) {
            throw new IllegalArgumentException("삭제 권한이 없습니다.");
        }

        unavailableTimeRepository.delete(time);
    }
}