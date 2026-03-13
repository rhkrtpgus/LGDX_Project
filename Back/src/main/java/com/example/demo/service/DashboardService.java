package com.example.demo.service;

import com.example.demo.dto.DashboardOverviewResponse;
import com.example.demo.repository.DashboardMapper;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

	private final DashboardMapper dashboardMapper;

	public DashboardService(DashboardMapper dashboardMapper) {
		this.dashboardMapper = dashboardMapper;
	}

	public DashboardOverviewResponse getOverview() {
		return new DashboardOverviewResponse(
			dashboardMapper.countUsers(),
			dashboardMapper.countChildren(),
			dashboardMapper.countViewings(),
			dashboardMapper.countAlerts(),
			dashboardMapper.findRecentAlerts(5)
		);
	}
}
