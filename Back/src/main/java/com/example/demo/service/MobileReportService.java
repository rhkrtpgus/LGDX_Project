package com.example.demo.service;

import com.example.demo.domain.DailyReport;
import com.example.demo.domain.MonthlyReport;
import com.example.demo.domain.WeeklyReport;
import com.example.demo.dto.MobileReportResponse;
import com.example.demo.dto.ReportFamilyResponse;
import com.example.demo.dto.ReportPeriodResponse;
import com.example.demo.repository.ReportMapper;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class MobileReportService {

	private final ReportMapper reportMapper;

	public MobileReportService(ReportMapper reportMapper) {
		this.reportMapper = reportMapper;
	}

	public MobileReportResponse getMobileReport(int familyId) {
		String familyName = reportMapper.findFamilyNameByFamilyId(familyId);
		if (familyName == null) {
			throw new IllegalArgumentException("해당 family_id에 대한 리포트를 찾지 못했습니다.");
		}

		DailyReport daily = reportMapper.findDailyByFamilyId(familyId);
		WeeklyReport weekly = reportMapper.findWeeklyByFamilyId(familyId);
		MonthlyReport monthly = reportMapper.findMonthlyByFamilyId(familyId);

		return new MobileReportResponse(
			familyId,
			familyName,
			toPeriodResponse("일간", daily == null ? null : daily.compareTime(), daily == null ? null : daily.countAlertType()),
			toPeriodResponse("주간", weekly == null ? null : weekly.compareTime(), weekly == null ? null : weekly.countAlertType()),
			toPeriodResponse("월간", monthly == null ? null : monthly.compareTime(), monthly == null ? null : monthly.countAlertType()),
			LocalDateTime.now()
		);
	}

	public List<ReportFamilyResponse> getFamilies() {
		return reportMapper.findFamilies();
	}

	private ReportPeriodResponse toPeriodResponse(
		String period,
		Integer compareTime,
		Integer countAlertType
	) {
		return new ReportPeriodResponse(period, compareTime, countAlertType);
	}
}
