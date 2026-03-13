package com.example.demo.repository;

import com.example.demo.domain.DailyReport;
import com.example.demo.domain.MonthlyReport;
import com.example.demo.domain.WeeklyReport;
import com.example.demo.dto.ReportFamilyResponse;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ReportMapper {

	DailyReport findDailyByFamilyId(@Param("familyId") int familyId);

	WeeklyReport findWeeklyByFamilyId(@Param("familyId") int familyId);

	MonthlyReport findMonthlyByFamilyId(@Param("familyId") int familyId);

	String findFamilyNameByFamilyId(@Param("familyId") int familyId);

	List<ReportFamilyResponse> findFamilies();
}
