package com.example.demo.repository;

import com.example.demo.dto.RecentAlertResponse;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface DashboardMapper {

	int countUsers();

	int countChildren();

	int countViewings();

	int countAlerts();

	List<RecentAlertResponse> findRecentAlerts(@Param("limit") int limit);
}
