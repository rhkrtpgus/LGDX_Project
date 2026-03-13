package com.example.demo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.example.demo.dto.RecentAlertResponse;
import com.example.demo.repository.DashboardMapper;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

	@Mock
	private DashboardMapper dashboardMapper;

	@InjectMocks
	private DashboardService dashboardService;

	@Test
	void getOverviewAggregatesDashboardMetrics() {
		RecentAlertResponse alert = new RecentAlertResponse();
		alert.setAlertId(101);
		alert.setAlertType("violence");
		alert.setRiskLevel("high");
		alert.setMessageText("Violence detected");
		alert.setVideoId("video-001");
		alert.setWatchTime(LocalDateTime.of(2026, 3, 12, 15, 0));

		when(dashboardMapper.countUsers()).thenReturn(3);
		when(dashboardMapper.countChildren()).thenReturn(2);
		when(dashboardMapper.countViewings()).thenReturn(14);
		when(dashboardMapper.countAlerts()).thenReturn(5);
		when(dashboardMapper.findRecentAlerts(5)).thenReturn(List.of(alert));

		var response = dashboardService.getOverview();

		assertThat(response.userCount()).isEqualTo(3);
		assertThat(response.childCount()).isEqualTo(2);
		assertThat(response.viewingCount()).isEqualTo(14);
		assertThat(response.alertCount()).isEqualTo(5);
		assertThat(response.recentAlerts()).hasSize(1);
		assertThat(response.recentAlerts().getFirst().getAlertType()).isEqualTo("violence");
	}
}
